import os
import threading
import time
import sys
import json
from flask import Flask, jsonify, request, Response, send_from_directory, make_response, render_template
from . import supabase_client
from . import searcher
from . import uploader
from . import cache

# Determine paths
if getattr(sys, 'frozen', False):
    template_dir = os.path.join(sys._MEIPASS, 'image_tool', 'templates')
else:
    template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')

# Initialize Flask
app = Flask(__name__, template_folder=template_dir)

# Locked configuration (for single-mart login/handshake)
locked_config = {
    "mart_id": None,
    "mart_name": None,
    "authenticated": False,
    "access_token": None
}

@app.before_request
def handle_options_preflight():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
        return response

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    return response

# Global job state
job_state = {
    "status": "idle",  # idle, running, paused, stopped, completed
    "mart_id": None,
    "mart_name": "",
    "total": 0,
    "completed": 0,
    "found": 0,
    "not_found": 0,
    "current_product": "",
    "logs": [],
    "should_stop": False,
    "should_pause": False
}

state_lock = threading.Lock()
progress_events = []

def add_log(message, type="info", thumbnail=None, found_name=None):
    with state_lock:
        log_entry = {
            "timestamp": time.strftime("%H:%M:%S"),
            "message": message,
            "type": type,
            "thumbnail": thumbnail,
            "found_name": found_name
        }
        job_state["logs"].append(log_entry)
        if len(job_state["logs"]) > 100:
            job_state["logs"].pop(0)
    
    # Trigger SSE update
    notify_listeners()

def notify_listeners():
    for event in list(progress_events):
        try:
            event.set()
        except Exception:
            pass

def progress_worker(mart_id, products):
    global job_state
    
    with state_lock:
        job_state["status"] = "running"
        job_state["mart_id"] = mart_id
        job_state["total"] = len(products)
        job_state["completed"] = 0
        job_state["found"] = 0
        job_state["not_found"] = 0
        job_state["should_stop"] = False
        job_state["should_pause"] = False
        job_state["logs"] = []
    
    add_log(f"🚀 Started image search pipeline for {len(products)} products...", "info")
    
    new_uploads_count = 0
    for idx, prod in enumerate(products):
        # Handle Stop
        if job_state["should_stop"]:
            add_log("⏹️ Pipeline stopped by user.", "warning")
            break
            
        # Handle Pause
        while job_state["should_pause"] and not job_state["should_stop"]:
            time.sleep(0.5)
            
        if job_state["should_stop"]:
            add_log("⏹️ Pipeline stopped by user.", "warning")
            break
            
        prod_id = prod["id"]
        inventory_id = prod.get("inventory_id")
        name = prod["name"]
        barcode = prod.get("barcode", "")
        
        with state_lock:
            job_state["current_product"] = f"{name} ({barcode})"
            
        add_log(f"🔍 Searching: {name} (Barcode: {barcode or 'N/A'})...", "search")
        
        try:
            # 1. Resolve image
            res = searcher.resolve_product_image(name, barcode)
            
            if res and res.get("imageUrl"):
                source_url = res["imageUrl"]
                src_name = res.get("found_name") or name
                source_type = res.get("source", "Web Search")
                
                # For cache hits, we don't need to re-upload to ImgBB
                if res.get("cached"):
                    # Directly update Supabase just in case it was missing in the db
                    if inventory_id:
                        supabase_client.update_inventory_custom_image(inventory_id, source_url)
                    else:
                        supabase_client.update_product_image(prod_id, source_url)
                    with state_lock:
                        job_state["found"] += 1
                        job_state["completed"] += 1
                    add_log(f"✅ Found in cache: '{name}' → {source_url}", "success", thumbnail=source_url, found_name=src_name)
                else:
                    if new_uploads_count > 0 and new_uploads_count % 5 == 0:
                        add_log("⏳ Pacing uploads: Pausing for 8 seconds to prevent ImgBB rate limits...", "info")
                        time.sleep(8)
                    add_log(f"⬇️ Downloading & Uploading to permanent CDN: '{src_name}'...", "info")
                    imgbb_url = uploader.download_and_upload_to_imgbb(source_url, barcode or prod_id)
                    new_uploads_count += 1
                    
                    if imgbb_url:
                        # Update Supabase
                        if inventory_id:
                            db_success = supabase_client.update_inventory_custom_image(inventory_id, imgbb_url)
                        elif locked_config["authenticated"] and locked_config["mart_id"]:
                            db_success = supabase_client.update_inventory_custom_image_by_mart_and_product(locked_config["mart_id"], prod_id, imgbb_url)
                        else:
                            db_success = supabase_client.update_product_image(prod_id, imgbb_url)
                        if db_success:
                            # Save to local cache
                            if searcher.is_valid_barcode(barcode):
                                cache.set_cached_image(barcode, imgbb_url)
                                
                            with state_lock:
                                job_state["found"] += 1
                                job_state["completed"] += 1
                            add_log(f"✅ Resolved & Saved: '{name}' (via {source_type})", "success", thumbnail=imgbb_url, found_name=src_name)
                        else:
                            with state_lock:
                                job_state["completed"] += 1
                            add_log(f"❌ Failed to update Supabase for '{name}'", "error")
                    else:
                        with state_lock:
                            job_state["completed"] += 1
                        add_log(f"❌ CDN Upload failed for '{name}'", "error")
            else:
                is_cached = res and res.get("cached")
                if is_cached:
                    # Negative cache hit: already checked before and not found
                    with state_lock:
                        job_state["not_found"] += 1
                        job_state["completed"] += 1
                    add_log(f"ℹ️ Already checked before (Not Found): '{name}'", "info")
                else:
                    # Fresh search failed
                    if searcher.is_valid_barcode(barcode):
                        cache.set_cached_image(barcode, None)
                        
                    with state_lock:
                        job_state["not_found"] += 1
                        job_state["completed"] += 1
                    add_log(f"❌ No image found for '{name}'", "error")
                
        except Exception as e:
            with state_lock:
                job_state["completed"] += 1
            add_log(f"⚠️ Error resolving '{name}': {e}", "error")
            
        # Small delay between products to play nice with search engines
        time.sleep(1.5)
        
    with state_lock:
        job_state["status"] = "completed"
        job_state["current_product"] = ""
    add_log("🏁 Image search pipeline completed successfully!", "info")

# Routes

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/marts')
def api_marts():
    if locked_config["authenticated"]:
        return jsonify([{
            "id": locked_config["mart_id"],
            "name": locked_config["mart_name"],
            "slug": "locked"
        }])
    marts = supabase_client.list_marts()
    return jsonify(marts)

@app.route('/api/inventory/<mart_id>')
def api_inventory(mart_id):
    if locked_config["authenticated"] and str(mart_id) != str(locked_config["mart_id"]):
        return jsonify({"error": "Unauthorized. This tool is locked to another store."}), 403
    products = supabase_client.get_mart_missing_image_products(mart_id)
    return jsonify({
        "products_missing_count": len(products),
        "products": products
    })

@app.route('/api/start', methods=['POST'])
def api_start():
    global job_state
    
    data = request.json or {}
    mart_id = data.get("mart_id")
    mart_name = data.get("mart_name", "")
    access_token = data.get("access_token")
    
    if not mart_id:
        return jsonify({"error": "mart_id is required"}), 400
        
    if locked_config["authenticated"] and str(mart_id) != str(locked_config["mart_id"]):
        return jsonify({"error": "Unauthorized. This tool is locked to another store."}), 403
        
    if access_token:
        locked_config["access_token"] = str(access_token)
        
    with state_lock:
        if job_state["status"] == "running":
            return jsonify({"error": "Pipeline is already running"}), 400
            
    # Fetch missing products
    products = supabase_client.get_mart_missing_image_products(mart_id)
    
    if not products:
        return jsonify({"message": "All products already have images!"})
        
    # Start thread
    with state_lock:
        job_state["mart_name"] = mart_name
        
    thread = threading.Thread(target=progress_worker, args=(mart_id, products), daemon=True)
    thread.start()
    
    return jsonify({"message": "Pipeline started"})

@app.route('/api/pause', methods=['POST'])
def api_pause():
    with state_lock:
        job_state["should_pause"] = True
        job_state["status"] = "paused"
    add_log("⏸️ Pipeline paused by user.", "warning")
    return jsonify({"message": "Pipeline paused"})

@app.route('/api/resume', methods=['POST'])
def api_resume():
    with state_lock:
        job_state["should_pause"] = False
        job_state["status"] = "running"
    add_log("▶️ Resuming pipeline...", "info")
    return jsonify({"message": "Pipeline resumed"})

@app.route('/api/stop', methods=['POST'])
def api_stop():
    with state_lock:
        job_state["should_stop"] = True
        job_state["status"] = "stopped"
    return jsonify({"message": "Pipeline stopping..."})

@app.route('/api/status')
def api_status():
    with state_lock:
        return jsonify({
            **job_state,
            "locked_config": locked_config
        })

@app.route('/api/config', methods=['POST', 'OPTIONS'])
def api_config():
    if request.method == 'OPTIONS':
        return '', 200
        
    data = request.json or {}
    mart_id = data.get("mart_id")
    mart_name = data.get("mart_name")
    access_token = data.get("access_token")
    
    if not mart_id or not mart_name:
        return jsonify({"error": "mart_id and mart_name are required"}), 400
        
    global locked_config
    locked_config["mart_id"] = str(mart_id)
    locked_config["mart_name"] = str(mart_name)
    locked_config["authenticated"] = True
    if access_token:
        locked_config["access_token"] = str(access_token)
    
    return jsonify({
        "success": True,
        "locked_config": {
            "mart_id": locked_config["mart_id"],
            "mart_name": locked_config["mart_name"],
            "authenticated": locked_config["authenticated"]
        }
    })

@app.route('/api/logout', methods=['POST', 'OPTIONS'])
def api_logout():
    if request.method == 'OPTIONS':
        return '', 200
        
    global locked_config
    locked_config["mart_id"] = None
    locked_config["mart_name"] = None
    locked_config["authenticated"] = False
    locked_config["access_token"] = None
    
    return jsonify({
        "success": True
    })

@app.route('/api/manual-search', methods=['POST'])
def api_manual_search():
    data = request.json or {}
    query = data.get("q")
    if not query:
        return jsonify({"error": "Query q is required"}), 400
        
    results = searcher.search_duckduckgo_images(query)
    return jsonify({"results": results})

@app.route('/api/manual-select', methods=['POST'])
def api_manual_select():
    data = request.json or {}
    product_id = data.get("product_id")
    inventory_id = data.get("inventory_id")
    image_url = data.get("image_url")
    barcode = data.get("barcode", "")
    
    if not product_id or not image_url:
        return jsonify({"error": "product_id and image_url are required"}), 400
        
    add_log(f"⬇️ Downloading & Uploading manual selection to CDN...", "info")
    imgbb_url = uploader.download_and_upload_to_imgbb(image_url, barcode or product_id)
    
    if imgbb_url:
        if inventory_id:
            success = supabase_client.update_inventory_custom_image(inventory_id, imgbb_url)
        elif locked_config["authenticated"] and locked_config["mart_id"]:
            success = supabase_client.update_inventory_custom_image_by_mart_and_product(locked_config["mart_id"], product_id, imgbb_url)
        else:
            success = supabase_client.update_product_image(product_id, imgbb_url)
            
        if success:
            if searcher.is_valid_barcode(barcode):
                cache.set_cached_image(barcode, imgbb_url)
            return jsonify({"success": True, "image_url": imgbb_url})
            
    return jsonify({"error": "Failed to upload or update image"}), 500

@app.route('/api/upload-file', methods=['POST'])
def api_upload_file():
    product_id = request.form.get("product_id")
    inventory_id = request.form.get("inventory_id")
    barcode = request.form.get("barcode", "")
    file = request.files.get("image")
    
    if not product_id or not file:
        return jsonify({"error": "product_id and image file are required"}), 400
        
    try:
        img_bytes = file.read()
        imgbb_url = uploader.upload_to_imgbb(img_bytes, filename=f"manual_{barcode or product_id}.jpg")
        
        if imgbb_url:
            if inventory_id:
                success = supabase_client.update_inventory_custom_image(inventory_id, imgbb_url)
            elif locked_config["authenticated"] and locked_config["mart_id"]:
                success = supabase_client.update_inventory_custom_image_by_mart_and_product(locked_config["mart_id"], product_id, imgbb_url)
            else:
                success = supabase_client.update_product_image(product_id, imgbb_url)
                
            if success:
                if searcher.is_valid_barcode(barcode):
                    cache.set_cached_image(barcode, imgbb_url)
                return jsonify({"success": True, "image_url": imgbb_url})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        
    return jsonify({"error": "Failed to upload file"}), 500

# SSE Progress Stream
@app.route('/api/progress-stream')
def progress_stream():
    def event_stream():
        event = threading.Event()
        progress_events.append(event)
        try:
            # Send initial state
            with state_lock:
                yield f"data: {json.dumps(job_state)}\n\n"
                
            while True:
                # Wait for next event notify or timeout (keep-alive)
                event.wait(timeout=10)
                event.clear()
                with state_lock:
                    yield f"data: {json.dumps(job_state)}\n\n"
        except Exception:
            pass
        finally:
            if event in progress_events:
                progress_events.remove(event)
                
    return Response(event_stream(), content_type='text/event-stream')

if __name__ == '__main__':
    from dotenv import load_dotenv
    import socket
    load_dotenv()
    url = os.getenv("OZOMART_PORTAL_URL", "https://ozomart.store/mart")
    
    import webbrowser
    import subprocess
    import shutil
    
    def find_available_port(start_port=5000, max_attempts=20):
        for port in range(start_port, start_port + max_attempts):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                try:
                    s.bind(('0.0.0.0', port))
                    return port
                except OSError:
                    continue
        return start_port

    selected_port = find_available_port(5000)
    
    def open_browser():
        sep = "&" if "?" in url else "?"
        portal_url = f"{url}{sep}local_port={selected_port}"
        print(f"🌍 Opening OzoMart Portal ({portal_url}) in standalone app mode...")
        chrome_path = None
        if sys.platform.startswith('win'):
            paths = [
                os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
                os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
                os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe")
            ]
            for p in paths:
                if os.path.exists(p):
                    chrome_path = p
                    break
        elif sys.platform == 'darwin':
            p = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
            if os.path.exists(p):
                chrome_path = p
        else:
            chrome_path = shutil.which("google-chrome") or shutil.which("chrome") or shutil.which("chromium-browser") or shutil.which("chromium")

        if chrome_path:
            try:
                subprocess.Popen([chrome_path, f"--app={portal_url}"])
                return
            except Exception:
                pass
        webbrowser.open(portal_url)

    if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        threading.Timer(1.2, open_browser).start()
    
    print(f"🚀 Starting OzoMart Local Background Service on http://localhost:{selected_port}")
    app.run(host='0.0.0.0', port=selected_port, debug=True, use_reloader=False, threaded=True)
