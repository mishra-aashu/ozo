import re
import json
import urllib.request
import urllib.parse
from . import cache

STOP_WORDS = {
    'pack', '100g', '200g', '500g', '1kg', 'gram', 'grams', 'mrp', 'super', 
    'premium', 'bottle', 'box', 'packet', 'pcs', 'piece', 'pieces', 'free', 
    'offer', 'with', 'and', 'for', 'value', 'save', 'size', 'fresh', 'best',
    'rs', 'off', 'buy', 'get', 'new', 'old', 'pure', 'natural', 'quality'
}

def clean_words(name):
    """Extract lowercase keywords of length >= 3 for comparison, filtering stop words"""
    if not name:
        return []
    # Replace non-word characters with spaces
    cleaned = re.sub(r'[^\w\s]', ' ', name.lower())
    words = cleaned.split()
    return [w for w in words if len(w) >= 3 and w not in STOP_WORDS]

def is_valid_barcode(barcode):
    """Validate barcode to prevent queries on placeholders (e.g., '0', '123456', '...')"""
    if not barcode:
        return False
    barcode_str = str(barcode).strip().lower()
    if barcode_str in ('', '...', '0', '1', '123', '1234', '12345', '123456', 'null', 'none', 'n/a', 'nan'):
        return False
    if not barcode_str.isdigit() or len(barcode_str) < 6:
        return False
    return True

def verify_name_overlap(name1, name2):
    """
    Checks if there's significant Jaccard similarity keyword overlap between two product names.
    Helps ensure that we don't map the wrong product's image.
    """
    words1 = set(clean_words(name1))
    words2 = set(clean_words(name2))
    
    if not words1 or not words2:
        return False
        
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    
    if not union:
        return False
        
    jaccard_similarity = len(intersection) / len(union)
    
    # Refine short query rules to prevent false-positives
    if len(words1) == 1:
        return len(intersection) >= 1
    elif len(words1) == 2:
        return len(intersection) >= 2
        
    # Standard threshold: 0.25 similarity
    return jaccard_similarity >= 0.25 or len(intersection) >= 2


def get_open_food_facts_name(barcode):
    """
    Queries Open Food Facts for the product name/metadata only.
    No images are fetched from Open Food Facts as they are often low-quality or incorrect.
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
                if off_name:
                    return off_name.strip()
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

import requests

def search_bigbasket_images(product_name):
    """
    Layer 3: BigBasket Image Search.
    Queries BigBasket listing service API for product images.
    Returns list of candidate images [{imageUrl, thumbnail, title, source}]
    """
    headers = {
        'accept': '*/*',
        'accept-language': 'en-GB,en;q=0.9,hi-IN;q=0.8,hi;q=0.7,en-US;q=0.6',
        'common-client-static-version': '101',
        'content-type': 'application/json',
        'dnt': '1',
        'osmos-enabled': 'true',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'user-agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
        'x-caller': 'bigbasket-pwa',
        'x-channel': 'BB-PWA',
        'x-entry-context': 'bbnow',
        'x-entry-context-id': '10',
        'x-requested-with': 'XMLHttpRequest',
        'cookie': '_bb_cid=1; _bb_sa_ids=19224; _bb_cda_sa_info=djIuY2RhX3NhLjEwLjE5MjI0; is_integrated_sa=1; _bb_aid="MjkxMzA4NDUzMA=="; _bb_nhid=7427; _bb_hid=7427; _bb_dsid=7427; _bb_dsevid=7427; is_global=1; bb2_enabled=true; ufi=1; _bb_vid=MTMwMDkyNDE2MjYxOTM5MjQ5NA==; bigbasket.com=b623f16c-2c81-4d29-94a2-29f8cdbd834f; isintegratedsa=true; PWA=1'
    }
    encoded_q = urllib.parse.quote_plus(product_name)
    url = f"https://www.bigbasket.com/listing-svc/v2/products?type=ps&slug={encoded_q}&page=1&bucket_id=36"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode('utf-8'))
            tabs = data.get("tabs", [])
            if not tabs:
                return []
            products = tabs[0].get("product_info", {}).get("products", [])
            results = []
            for prod in products:
                images = prod.get("images", [])
                img_url = None
                if images:
                    img_info = images[0]
                    img_url = img_info.get("xxl") or img_info.get("xl") or img_info.get("l") or img_info.get("m") or img_info.get("s")
                if img_url:
                    brand_name = prod.get("brand", {}).get("name", "") if isinstance(prod.get("brand"), dict) else ""
                    brand_prefix = f"[{brand_name}] " if brand_name else ""
                    pack_size = prod.get("w", "")
                    size_suffix = f" ({pack_size})" if pack_size else ""
                    results.append({
                        "imageUrl": img_url,
                        "thumbnail": img_url,
                        "title": f"{brand_prefix}{prod.get('desc', '')}{size_suffix}",
                        "source": "BigBasket"
                    })
            return results
    except Exception as e:
        print(f"⚠️ BigBasket API search failed: {e}")
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
    Main resolution engine orchestrating all layers:
    1. Local cache lookup (always first)
    2. OpenSERP Image Search (If active, premium Chromium multi-engine web search)
    3. DuckDuckGo Image Search (Web search scraper fallback)
    4. Nainji.in (SKU verified barcode search fallback)
    5. FetchNBuy.in (SKU verified barcode search fallback)

    Note: Open Food Facts is used only to resolve/enrich the product name
    if it is missing or generic, but NOT for fetching images because user-uploaded
    images on Open Food Facts are often low-quality, blurry, or incorrect.
    """
    barcode = str(barcode).strip() if barcode else ""
    valid_barcode = is_valid_barcode(barcode)
    
    # If the product name is missing, generic, or too short, fetch the real product name
    # from Open Food Facts so we can perform a highly accurate web search.
    is_generic = (not product_name or 
                  product_name.lower().strip() in ('', 'none', 'null', 'product') or 
                  len(product_name.strip()) < 3)
    if is_generic and valid_barcode:
        off_name = get_open_food_facts_name(barcode)
        if off_name:
            product_name = off_name
            print(f"ℹ️ Retrieved product name from Open Food Facts: {product_name}")

    # --- Layer 1: Cache Check ---
    if valid_barcode:
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

    # --- Layer 2: BigBasket Image Search (Premium FMCG Engine) ---
    bb_candidates = search_bigbasket_images(product_name)
    if bb_candidates:
        # Check name overlap
        for cand in bb_candidates:
            if verify_name_overlap(product_name, cand["title"]):
                return {
                    "imageUrl": cand["imageUrl"],
                    "source": cand["source"],
                    "found_name": cand["title"]
                }
        # Fallback to top candidate if there is at least some reasonable similarity
        return {
            "imageUrl": bb_candidates[0]["imageUrl"],
            "source": bb_candidates[0]["source"],
            "found_name": bb_candidates[0]["title"]
        }

    # --- Layer 3: OpenSERP Search Engine (Web Search Fallback) ---
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

    # --- Layer 4: Nainji.in (SKU barcode fallback) ---
    if valid_barcode:
        # Search by barcode directly first
        nainji_res = search_nainji(barcode, barcode, product_name)
        if nainji_res:
            return nainji_res
        # Search by product name, but verify barcode
        nainji_res = search_nainji(product_name, barcode, product_name)
        if nainji_res:
            return nainji_res

    # --- Layer 5: FetchNBuy.in (SKU barcode fallback) ---
    if valid_barcode:
        # Search by barcode directly first
        fnb_res = search_fetchnbuy(barcode, barcode, product_name)
        if fnb_res:
            return fnb_res
        # Search by product name, but verify barcode
        fnb_res = search_fetchnbuy(product_name, barcode, product_name)
        if fnb_res:
            return fnb_res

    return None



