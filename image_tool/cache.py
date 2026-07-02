import os
import json
import threading

# Point to the same scratch directory cache as scrape_images.py
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_PATH = os.path.join(ROOT_DIR, 'scratch', 'image_cache.json')

cache_lock = threading.Lock()

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

def get_cached_image(barcode):
    """Gets cached image URL for a barcode if available"""
    cache = load_cache()
    # Check if barcode exists in cache
    if barcode in cache:
        return cache[barcode]
    return None

def check_cache(barcode):
    """
    Checks if barcode exists in cache.
    Returns tuple: (exists_in_cache, cached_url)
    """
    cache = load_cache()
    if barcode in cache:
        return True, cache[barcode]
    return False, None

def set_cached_image(barcode, image_url):
    """Sets cached image URL for a barcode"""
    cache = load_cache()
    cache[barcode] = image_url
    save_cache(cache)

