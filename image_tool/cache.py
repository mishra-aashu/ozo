import os
import json
import threading
import time

# Point to the same scratch directory cache as scrape_images.py
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_PATH = os.path.join(ROOT_DIR, 'scratch', 'image_cache.json')

cache_lock = threading.Lock()

SUCCESS_TTL = 7 * 24 * 60 * 60  # 7 days
FAILURE_TTL = 1 * 60 * 60       # 1 hour

def load_cache():
    """Loads cache safely from disk"""
    with cache_lock:
        if os.path.exists(CACHE_PATH):
            try:
                with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️ Error reading cache file: {e}")
        return {}

def save_cache(cache_data):
    """Saves cache safely to disk"""
    with cache_lock:
        try:
            os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
            with open(CACHE_PATH, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, indent=4, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"⚠️ Error writing cache file: {e}")
        return False

def check_cache(barcode):
    """
    Checks if barcode exists in cache and is not expired.
    Returns tuple: (exists_in_cache, cached_url)
    """
    cache = load_cache()
    if barcode not in cache:
        return False, None
        
    entry = cache[barcode]
    
    # Handle legacy flat string cache entries
    if not isinstance(entry, dict):
        return True, entry
        
    # Check TTL
    timestamp = entry.get("timestamp", 0)
    url = entry.get("url")
    elapsed = time.time() - timestamp
    ttl = SUCCESS_TTL if url else FAILURE_TTL
    
    if elapsed > ttl:
        return False, None  # Expired
        
    return True, url

def get_cached_image(barcode):
    """Gets cached image URL for a barcode if available and not expired"""
    exists, url = check_cache(barcode)
    if exists:
        return url
    return None

def set_cached_image(barcode, image_url):
    """Sets cached image URL for a barcode with a timestamp"""
    cache = load_cache()
    cache[barcode] = {
        "url": image_url,
        "timestamp": time.time()
    }
    save_cache(cache)


