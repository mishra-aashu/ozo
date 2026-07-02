import requests
import json
from . import config

def get_headers():
    return {
        "apikey": config.DB_KEY,
        "Authorization": f"Bearer {config.DB_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

def list_marts():
    """Fetch all marts from Supabase"""
    url = f"{config.SUPABASE_URL}/rest/v1/marts?select=id,name,slug&order=name"
    try:
        response = requests.get(url, headers=get_headers(), timeout=10)
        if response.status_code == 200:
            return response.json()
        print(f"❌ Error listing marts: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"⚠️ Exception listing marts: {e}")
    return []

def get_mart_missing_image_products(mart_id):
    """
    Fetch products for a mart that are missing images.
    Returns list of products: {id, name, barcode, image_url}
    """
    # Query mart_inventory and join with products
    url = f"{config.SUPABASE_URL}/rest/v1/mart_inventory?mart_id=eq.{mart_id}&select=products(id,name,barcode,image_url)"
    try:
        response = requests.get(url, headers=get_headers(), timeout=15)
        if response.status_code != 200:
            print(f"❌ Error fetching inventory: {response.status_code} - {response.text}")
            return []
            
        raw_items = response.json()
        products = []
        seen_ids = set()
        
        for item in raw_items:
            prod = item.get("products")
            if not prod:
                continue
            
            prod_id = prod.get("id")
            if not prod_id or prod_id in seen_ids:
                continue
                
            seen_ids.add(prod_id)
            img_url = prod.get("image_url", "")
            
            # Check if missing image (NULL, empty, placeholder, or raw raw.githubusercontent.com path if it doesn't exist, etc.)
            # We filter for empty, NULL, or containing 'placeholder'
            is_missing = not img_url or "placeholder" in img_url.lower() or img_url.strip() == ""
            
            if is_missing:
                products.append({
                    "id": prod_id,
                    "name": prod.get("name", "Unknown Product"),
                    "barcode": prod.get("barcode", ""),
                    "image_url": img_url
                })
        
        return products
    except Exception as e:
        print(f"⚠️ Exception fetching inventory: {e}")
    return []

def update_product_image(product_id, new_image_url):
    """Update product image_url in Supabase"""
    url = f"{config.SUPABASE_URL}/rest/v1/products?id=eq.{product_id}"
    headers = get_headers()
    # Remove representation preference to make it minimal and fast
    headers["Prefer"] = "return=minimal"
    
    try:
        response = requests.patch(url, headers=headers, json={"image_url": new_image_url}, timeout=10)
        if response.status_code in [200, 201, 204]:
            return True
        print(f"❌ Failed to update product image: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"⚠️ Exception updating product image: {e}")
    return False
