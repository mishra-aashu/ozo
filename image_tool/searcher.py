import re
import json
import urllib.request
import urllib.parse
from . import cache

def clean_words(name):
    """Extract lowercase keywords of length >= 3 for comparison"""
    if not name:
        return []
    words = re.split(r'\W+', name.lower())
    return [w for w in words if len(w) >= 3]

def verify_name_overlap(name1, name2):
    """
    Checks if there's any significant keyword overlap between two product names.
    Helps ensure that we don't map the wrong product's image.
    """
    words1 = set(clean_words(name1))
    words2 = set(clean_words(name2))
    
    if not words1 or not words2:
        return True # Fallback to True if name is empty to avoid blocking
        
    # Check if they share at least one keyword (or two if they are longer lists)
    intersection = words1.intersection(words2)
    
    # If one of the names is very short (e.g. "Ghee"), we require it to be in the other name
    if len(words1) == 1:
        return list(words1)[0] in words2
    if len(words2) == 1:
        return list(words2)[0] in words1
        
    return len(intersection) >= 1

def query_open_food_facts(barcode, product_name):
    """
    Layer 2: Search Open Food Facts API by Barcode.
    Verifies that the retrieved product name matches.
    """
    url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
    headers = {
        'User-Agent': 'OzoMartImageTool/1.0 (mishra.aashu@gmail.com) Python-urllib'
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data.get("status") == 1:
                product = data.get("product", {})
                off_name = product.get("product_name") or product.get("product_name_en") or ""
                
                # Check for name overlap to make sure it's the correct product
                if off_name and verify_name_overlap(product_name, off_name):
                    # Prefer high resolution front image url
                    img_url = (
                        product.get("image_front_url") or 
                        product.get("image_url") or 
                        product.get("image_front_small_url")
                    )
                    if img_url:
                        return {
                            "imageUrl": img_url,
                            "source": "Open Food Facts",
                            "found_name": off_name
                        }
    except Exception as e:
        pass
    return None

def verify_nainji_sku(product_url, target_barcode, product_name):
    """Fetches Nainji WooCommerce page and checks if SKU matches target_barcode"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    try:
        req = urllib.request.Request(product_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
            # Extract SKU
            sku_match = re.findall(r'<span class="sku">([^<]+)</span>', html)
            if sku_match:
                prod_sku = str(sku_match[0]).strip()
                if prod_sku == target_barcode:
                    # Match found, let's grab the title for logs
                    title_match = re.findall(r'<h1 class="product_title[^"]*">([^<]+)</h1>', html)
                    found_name = title_match[0].strip() if title_match else ""
                    
                    # Extract main product image
                    img_matches = re.findall(r'class="wp-post-image"[^>]*src="([^"]+)"', html)
                    if img_matches:
                        return {
                            "imageUrl": img_matches[0].split('?')[0].replace('&#038;', '&'),
                            "found_name": found_name
                        }
                    
                    gallery = re.findall(r'data-large_image="([^"]+)"', html)
                    if gallery:
                        return {
                            "imageUrl": gallery[0].split('?')[0].replace('&#038;', '&'),
                            "found_name": found_name
                        }
    except Exception:
        pass
    return None

def search_nainji(query_str, target_barcode, product_name):
    """Layer 3: Search Nainji.in using barcode/name and verify SKU matches target_barcode"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    search_q = urllib.parse.quote_plus(query_str)
    url = f"https://nainji.in/?s={search_q}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
            hrefs = re.findall(r'href="([^"]+)"', html)
            product_links = list(set([h for h in hrefs if '/product/' in h]))
            
            # Check top candidate products
            for link in product_links[:3]:
                res = verify_nainji_sku(link, target_barcode, product_name)
                if res:
                    res["source"] = "Nainji.in"
                    return res
    except Exception:
        pass
    return None

def verify_fetchnbuy_sku(handle, target_barcode, product_name):
    """Fetches FetchNBuy Shopify JSON and checks if variant barcode/SKU matches target_barcode"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    js_url = f"https://fetchnbuy.in/products/{handle}.js"
    try:
        req = urllib.request.Request(js_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            prod_data = json.loads(response.read().decode('utf-8'))
            title = prod_data.get("title", "")
            
            for v in prod_data.get("variants", []):
                v_barcode = str(v.get("barcode", "")).strip()
                v_sku = str(v.get("sku", "")).strip()
                
                if v_barcode == target_barcode or v_sku == target_barcode:
                    images = prod_data.get("images", [])
                    if images:
                        img_url = images[0]
                        if img_url.startswith("//"):
                            img_url = "https:" + img_url
                        return {
                            "imageUrl": img_url.split('?')[0],
                            "found_name": title
                        }
    except Exception:
        pass
    return None

def search_fetchnbuy(query_str, target_barcode, product_name):
    """Layer 4: Search FetchNBuy.in using barcode/name and verify SKU matches target_barcode"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    search_q = urllib.parse.quote_plus(query_str)
    url = f"https://fetchnbuy.in/search?q={search_q}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
            handles = re.findall(r'/products/([a-zA-Z0-9\-]+)', html)
            handles = list(set(handles))
            
            # Check top candidate products
            for handle in handles[:3]:
                res = verify_fetchnbuy_sku(handle, target_barcode, product_name)
                if res:
                    res["source"] = "FetchNBuy.in"
                    return res
    except Exception:
        pass
    return None

def search_duckduckgo_images(product_name):
    """
    Layer 5: DuckDuckGo Image Search.
    Extracts VQD token and queries DDG images API.
    Returns list of candidate images [{url, thumbnail, title, source}]
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    # We search with "product" keyword appended to ensure clean product shots
    search_query = f"{product_name} product"
    main_url = f"https://duckduckgo.com/?q={urllib.parse.quote_plus(search_query)}"
    
    try:
        req = urllib.request.Request(main_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
            
        vqd_match = re.search(r"vqd=['\"]?([^'\"]+?)['\"]?&", html) or re.search(r"vqd\s*[:=]\s*['\"]?([^'\"]+?)['\"]?", html)
        if not vqd_match:
            return []
            
        vqd = vqd_match.group(1)
        api_url = f"https://duckduckgo.com/i.js?o=json&q={urllib.parse.quote_plus(search_query)}&vqd={vqd}&f=,,,"
        
        req_api = urllib.request.Request(api_url, headers=headers)
        with urllib.request.urlopen(req_api, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            
        results = []
        for item in data.get("results", [])[:10]:
            img_url = item.get("image")
            thumb = item.get("thumbnail")
            title = item.get("title")
            domain = item.get("source")
            
            # Simple check: make sure the domain isn't known for bad placeholder icons
            if img_url:
                results.append({
                    "imageUrl": img_url,
                    "thumbnail": thumb or img_url,
                    "title": title or product_name,
                    "source": domain or "DuckDuckGo"
                })
        return results
    except Exception as e:
        print(f"⚠️ DuckDuckGo image search failed: {e}")
    return []

def query_openserp(query_str):
    """
    Queries self-hosted OpenSERP server if available.
    Tries mega endpoint first, falls back to bing/google endpoints.
    """
    from . import config
    if not config.OPENSERP_URL:
        return []
        
    encoded_query = urllib.parse.quote_plus(query_str)
    
    # Try mega first, fallback to bing/google
    endpoints = [
        f"{config.OPENSERP_URL}/mega/image?text={encoded_query}&engines=google,bing,duck&limit=10",
        f"{config.OPENSERP_URL}/bing/image?text={encoded_query}&limit=10",
        f"{config.OPENSERP_URL}/google/image?text={encoded_query}&limit=10",
    ]
    
    for url in endpoints:
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=3) as response:
                data = json.loads(response.read().decode('utf-8'))
                results = []
                for item in data.get("results", []):
                    img_data = item.get("image", {})
                    img_url = img_data.get("url") or item.get("image")
                    thumb = img_data.get("thumbnail") or item.get("thumbnail")
                    title = item.get("title")
                    engine = item.get("engine", "openserp")
                    source_info = item.get("source", {})
                    source_domain = source_info.get("domain", engine) if isinstance(source_info, dict) else str(source_info)
                    
                    if img_url:
                        results.append({
                            "imageUrl": img_url,
                            "thumbnail": thumb or img_url,
                            "title": title or query_str,
                            "source": f"OpenSERP ({source_domain})"
                        })
                if results:
                    return results
        except Exception:
            continue
    return []

def resolve_product_image(product_name, barcode):
    """
    Main resolution engine orchestrating all 6 layers:
    1. Local cache lookup (always first)
    2. OpenSERP Image Search (If active, premium Chromium multi-engine web search)
    3. DuckDuckGo Image Search (Web search scraper fallback)
    4. Open Food Facts (Barcode database fallback)
    5. Nainji.in (SKU verified barcode search fallback)
    6. FetchNBuy.in (SKU verified barcode search fallback)
    """
    barcode = str(barcode).strip() if barcode else ""
    
    # --- Layer 1: Cache Check ---
    if barcode:
        exists, cached = cache.check_cache(barcode)
        if exists:
            if cached:
                return {
                    "imageUrl": cached,
                    "source": "Local Cache",
                    "found_name": product_name,
                    "cached": True
                }
            else:
                return {
                    "imageUrl": None,
                    "source": "Local Cache (Not Found)",
                    "found_name": product_name,
                    "cached": True
                }

    # --- Layer 2: OpenSERP Search Engine (Main Web Search) ---
    openserp_query = f"{product_name} product pack"
    openserp_candidates = query_openserp(openserp_query)
    if openserp_candidates:
        # Check name overlap
        for cand in openserp_candidates:
            if verify_name_overlap(product_name, cand["title"]):
                return {
                    "imageUrl": cand["imageUrl"],
                    "source": cand["source"],
                    "found_name": cand["title"]
                }
        # Fallback to the top candidate if no overlap matches strictly but we have results
        return {
            "imageUrl": openserp_candidates[0]["imageUrl"],
            "source": openserp_candidates[0]["source"],
            "found_name": openserp_candidates[0]["title"]
        }

    # --- Layer 3: DuckDuckGo Images (Main Scraper Fallback) ---
    # Since this is a search-engine fallback, we return multiple candidate images
    # so the local dashboard can choose the best one, or automatically pick the top one.
    candidates = search_duckduckgo_images(product_name)
    if candidates:
        # Check if any candidate has a name overlap
        for cand in candidates:
            if verify_name_overlap(product_name, cand["title"]):
                return {
                    "imageUrl": cand["imageUrl"],
                    "source": f"Web Search ({cand['source']})",
                    "found_name": cand["title"]
                }
        # Fallback to the top candidate if no overlap matches strictly but we have results
        return {
            "imageUrl": candidates[0]["imageUrl"],
            "source": f"Web Search ({candidates[0]['source']})",
            "found_name": candidates[0]["title"]
        }

    # --- Layer 4: Open Food Facts (Barcode database fallback) ---
    if barcode and barcode != "...":
        off_res = query_open_food_facts(barcode, product_name)
        if off_res:
            return off_res
            
    # --- Layer 5: Nainji.in (SKU barcode fallback) ---
    if barcode and barcode != "...":
        # Search by barcode directly first
        nainji_res = search_nainji(barcode, barcode, product_name)
        if nainji_res:
            return nainji_res
        # Search by product name, but verify barcode
        nainji_res = search_nainji(product_name, barcode, product_name)
        if nainji_res:
            return nainji_res

    # --- Layer 6: FetchNBuy.in (SKU barcode fallback) ---
    if barcode and barcode != "...":
        # Search by barcode directly first
        fnb_res = search_fetchnbuy(barcode, barcode, product_name)
        if fnb_res:
            return fnb_res
        # Search by product name, but verify barcode
        fnb_res = search_fetchnbuy(product_name, barcode, product_name)
        if fnb_res:
            return fnb_res

    return None
