import requests
import base64
from . import config

def upload_to_imgbb(image_bytes, filename="product_image.jpg"):
    """
    Uploads raw image bytes to ImgBB.
    Returns the direct image URL if successful, otherwise None.
    """
    if not config.IMGBB_API_KEY:
        print("❌ ImgBB API key not configured!")
        return None
        
    url = "https://api.imgbb.com/1/upload"
    try:
        # Base64 encode the image bytes
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        payload = {
            "key": config.IMGBB_API_KEY,
            "image": base64_image,
            "name": filename
        }
        
        response = requests.post(url, data=payload, timeout=20)
        if response.status_code == 200:
            res_data = response.json()
            # Return direct link to image
            return res_data.get("data", {}).get("url")
        else:
            print(f"❌ ImgBB upload failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"⚠️ Exception uploading to ImgBB: {e}")
    return None

def download_and_upload_to_imgbb(source_url, barcode):
    """
    Downloads an image from a source URL and uploads it to ImgBB.
    Helps avoid hotlinking issues.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    try:
        response = requests.get(source_url, headers=headers, timeout=15)
        if response.status_code == 200:
            img_bytes = response.content
            # Upload to ImgBB
            imgbb_url = upload_to_imgbb(img_bytes, filename=f"ozo_{barcode}.jpg")
            return imgbb_url
        else:
            print(f"❌ Failed to download source image from {source_url}: Status {response.status_code}")
    except Exception as e:
        print(f"⚠️ Exception downloading source image from {source_url}: {e}")
    return None
