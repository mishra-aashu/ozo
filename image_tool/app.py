import os
import threading
import time
import sys
import hashlib
from flask import Flask, jsonify, request, Response, send_from_directory
from . import supabase_client
from . import searcher
from . import uploader
from . import cache

import requests
from Crypto.Cipher import AES

CRYPTO_SECRET = "OzoSecretEncryptionKey2026!"

def decrypt_text(hex_str, secret):
    try:
        encrypted_data = bytes.fromhex(hex_str)
        iv = encrypted_data[:12]
        ciphertext_and_tag = encrypted_data[12:]
        ciphertext = ciphertext_and_tag[:-16]
        tag = ciphertext_and_tag[-16:]
        key = hashlib.sha256(secret.encode('utf-8')).digest()
        cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
        decrypted = cipher.decrypt_and_verify(ciphertext, tag)
        return decrypted.decode('utf-8')
    except Exception as e:
        print(f"❌ Decryption helper failed: {e}")
        raise e

def encrypt_text(text, secret):
    try:
        key = hashlib.sha256(secret.encode('utf-8')).digest()
        iv = os.urandom(12)
        cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
        ciphertext, tag = cipher.encrypt_and_digest(text.encode('utf-8'))
        combined = iv + ciphertext + tag
        return combined.hex()
    except Exception as e:
        print(f"❌ Encryption helper failed: {e}")
        raise e

# Determine paths
if getattr(sys, 'frozen', False):
    dist_folder = os.path.join(sys._MEIPASS, 'dist')
    standalone_template_dir = os.path.join(sys._MEIPASS, 'image_tool', 'templates')
else:
    dist_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'dist')
    standalone_template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')

# Initialize Flask
app = Flask(__name__, static_folder=None, template_folder=None)

# Locked configuration (for single-mart login/handshake)
locked_config = {
    "mart_id": None,
    "mart_name": None,
    "authenticated": False
}

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
                    supabase_client.update_product_image(prod_id, source_url)
                    with state_lock:
                        job_state["found"] += 1
                        job_state["completed"] += 1
                    add_log(f"✅ Found in cache: '{name}' → {source_url}", "success", thumbnail=source_url, found_name=src_name)
                else:
                    add_log(f"⬇️ Downloading & Uploading to permanent CDN: '{src_name}'...", "info")
                    imgbb_url = uploader.download_and_upload_to_imgbb(source_url, barcode or prod_id)
                    
                    if imgbb_url:
                        # Update Supabase
                        db_success = supabase_client.update_product_image(prod_id, imgbb_url)
                        if db_success:
                            # Save to local cache
                            if barcode:
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
                    if barcode:
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

@app.route('/image-tool-dashboard')
def serve_standalone_dashboard():
    return send_from_directory(standalone_template_dir, 'index.html')

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
    
    if not mart_id:
        return jsonify({"error": "mart_id is required"}), 400
        
    if locked_config["authenticated"] and str(mart_id) != str(locked_config["mart_id"]):
        return jsonify({"error": "Unauthorized. This tool is locked to another store."}), 403
        
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
    
    if not mart_id or not mart_name:
        return jsonify({"error": "mart_id and mart_name are required"}), 400
        
    global locked_config
    locked_config["mart_id"] = str(mart_id)
    locked_config["mart_name"] = str(mart_name)
    locked_config["authenticated"] = True
    
    return jsonify({
        "success": True,
        "locked_config": locked_config
    })

@app.route('/api/logout', methods=['POST', 'OPTIONS'])
def api_logout():
    if request.method == 'OPTIONS':
        return '', 200
        
    global locked_config
    locked_config["mart_id"] = None
    locked_config["mart_name"] = None
    locked_config["authenticated"] = False
    
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
    image_url = data.get("image_url")
    barcode = data.get("barcode", "")
    
    if not product_id or not image_url:
        return jsonify({"error": "product_id and image_url are required"}), 400
        
    add_log(f"⬇️ Downloading & Uploading manual selection to CDN...", "info")
    imgbb_url = uploader.download_and_upload_to_imgbb(image_url, barcode or product_id)
    
    if imgbb_url:
        success = supabase_client.update_product_image(product_id, imgbb_url)
        if success:
            if barcode:
                cache.set_cached_image(barcode, imgbb_url)
            return jsonify({"success": True, "image_url": imgbb_url})
            
    return jsonify({"error": "Failed to upload or update image"}), 500

@app.route('/api/upload-file', methods=['POST'])
def api_upload_file():
    product_id = request.form.get("product_id")
    barcode = request.form.get("barcode", "")
    file = request.files.get("image")
    
    if not product_id or not file:
        return jsonify({"error": "product_id and image file are required"}), 400
        
    try:
        img_bytes = file.read()
        imgbb_url = uploader.upload_to_imgbb(img_bytes, filename=f"manual_{barcode or product_id}.jpg")
        
        if imgbb_url:
            success = supabase_client.update_product_image(product_id, imgbb_url)
            if success:
                if barcode:
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

# API proxy to intercept and forward Supabase DB calls locally
@app.route('/api/proxy/<path:subpath>', methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
def local_supabase_proxy(subpath):
    if request.method == 'OPTIONS':
        resp = Response("", status=204)
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        resp.headers['Access-Control-Expose-Headers'] = 'x-encrypted'
        return resp

    SUPABASE_URL = "https://ungxccwdondssatixzlz.supabase.co"
    target_url = f"{SUPABASE_URL}/{subpath}"
    if request.query_string:
        target_url += f"?{request.query_string.decode('utf-8')}"

    # Prepare headers to forward
    headers_to_forward = [
        'authorization',
        'apikey',
        'content-type',
        'prefer',
        'x-client-info',
        'accept',
        'x-original-content-type'
    ]
    
    forward_headers = {}
    for h in headers_to_forward:
        val = request.headers.get(h)
        if val is not None:
            forward_headers[h] = val

    # Read body
    req_body = request.get_data()
    is_encrypted = request.headers.get('x-encrypted') == 'true'
    
    if req_body and is_encrypted:
        try:
            # Decrypt body
            decrypted_str = decrypt_text(req_body.decode('utf-8'), CRYPTO_SECRET)
            req_body = decrypted_str.encode('utf-8')
            
            # Restore original content-type
            orig_ct = request.headers.get('x-original-content-type')
            if orig_ct:
                forward_headers['content-type'] = orig_ct
            else:
                forward_headers['content-type'] = 'application/json'
            
            if 'x-original-content-type' in forward_headers:
                del forward_headers['x-original-content-type']
        except Exception as e:
            print(f"❌ Proxy decryption error: {e}")
            return jsonify({"error": "Request decryption failed"}), 400

    # Execute request
    try:
        res = requests.request(
            method=request.method,
            url=target_url,
            headers=forward_headers,
            data=req_body,
            timeout=30,
            allow_redirects=False
        )
    except Exception as e:
        print(f"❌ Proxy connection error: {e}")
        return jsonify({"error": str(e)}), 502

    # Prepare response headers
    resp_headers = {}
    for k, v in res.headers.items():
        k_lower = k.lower()
        if k_lower not in ['content-encoding', 'content-length', 'transfer-encoding', 'connection']:
            resp_headers[k] = v

    # Add CORS
    resp_headers['Access-Control-Allow-Origin'] = '*'
    resp_headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
    resp_headers['Access-Control-Allow-Headers'] = '*'
    resp_headers['Access-Control-Expose-Headers'] = 'x-encrypted'

    # Read and encrypt response if it is JSON
    content_type = res.headers.get('content-type', '')
    res_data = res.content
    
    if 'application/json' in content_type and res_data:
        try:
            encrypted_hex = encrypt_text(res_data.decode('utf-8'), CRYPTO_SECRET)
            res_data = encrypted_hex.encode('utf-8')
            resp_headers['content-type'] = 'text/plain'
            resp_headers['x-encrypted'] = 'true'
        except Exception as e:
            print(f"⚠️ Proxy response encryption error: {e}")

    # Build Flask response
    response = Response(res_data, status=res.status_code)
    for k, v in resp_headers.items():
        response.headers[k] = v
        
    return response

# API endpoint for searching images (DuckDuckGo fallback)
@app.route('/api/search-image')
def local_search_image():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({"error": 'Query parameter "q" is required'}), 400
        
    try:
        candidates = searcher.search_duckduckgo_images(query)
        formatted_results = []
        for cand in candidates:
            formatted_results.append({
                "url": cand["imageUrl"],
                "thumbnail": cand["thumbnail"],
                "title": cand["title"],
                "source": cand["source"]
            })
        return jsonify({"results": formatted_results})
    except Exception as e:
        print(f"❌ Local search-image failed: {e}")
        return jsonify({"error": str(e)}), 500

# Catch-all route to serve the SPA React application from dist folder
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    if path.startswith('api/'):
        return jsonify({"error": "Not Found"}), 404
        
    file_path = os.path.join(dist_folder, path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(dist_folder, path)
        
    if os.path.exists(os.path.join(dist_folder, 'index.html')):
        return send_from_directory(dist_folder, 'index.html')
        
    return "OzoMart Portal frontend not built yet. Please run 'npm run build' to compile it.", 404

if __name__ == '__main__':
    import webbrowser
    if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        print("🌍 Opening dashboard http://localhost:5000 in your browser...")
        threading.Timer(1.2, lambda: webbrowser.open("http://localhost:5000")).start()
    
    print("🚀 Starting OzoMart Localhost Image Tool on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
