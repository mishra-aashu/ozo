import requests
import json
from . import config

def get_headers():
    # If the user has authenticated via the local tool handshake/start, use their access token!
    try:
        from .app import locked_config
        token = locked_config.get("access_token")
    except ImportError:
        token = None

    if token:
        return {
            "apikey": config.SUPABASE_KEY,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
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
    url = f"{config.SUPABASE_URL}/rest/v1/mart_inventory?mart_id=eq.{mart_id}&select=id,custom_image_url,products(id,name,barcode,image_url)"
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
            cust_img = item.get("custom_image_url") or ""
            img_url = cust_img or prod.get("image_url", "")
            
            # Check if missing image (NULL, empty, placeholder, or raw raw.githubusercontent.com path if it doesn't exist, etc.)
            is_missing = not img_url or "placeholder" in img_url.lower() or img_url.strip() == ""
            
            if is_missing:
                products.append({
                    "id": prod_id,
                    "inventory_id": item.get("id"),
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

def update_inventory_custom_image(inventory_id, new_image_url):
    """Update custom_image_url in mart_inventory table for a specific mart inventory record"""
    url = f"{config.SUPABASE_URL}/rest/v1/mart_inventory?id=eq.{inventory_id}"
    headers = get_headers()
    headers["Prefer"] = "return=minimal"
    
    try:
        response = requests.patch(url, headers=headers, json={"custom_image_url": new_image_url}, timeout=10)
        if response.status_code in [200, 201, 204]:
            return True
        print(f"❌ Failed to update mart inventory custom image: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"⚠️ Exception updating mart inventory custom image: {e}")
    return False

def update_inventory_custom_image_by_mart_and_product(mart_id, product_id, new_image_url):
    """Update custom_image_url for a specific mart and product combination"""
    url_get = f"{config.SUPABASE_URL}/rest/v1/mart_inventory?mart_id=eq.{mart_id}&product_id=eq.{product_id}&select=id"
    try:
        res = requests.get(url_get, headers=get_headers(), timeout=10)
        if res.status_code == 200:
            records = res.json()
            if records:
                inventory_id = records[0]["id"]
                return update_inventory_custom_image(inventory_id, new_image_url)
    except Exception as e:
        print(f"⚠️ Exception fetching inventory record: {e}")
    return False
