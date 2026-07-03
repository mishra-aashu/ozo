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

def upload_to_freeimage(image_bytes, filename="product_image.jpg"):
    """
    Uploads raw image bytes to Freeimage.host.
    Returns the direct image URL if successful, otherwise None.
    """
    if not config.FREEIMAGE_API_KEY:
        print("❌ Freeimage API key not configured!")
        return None
        
    url = "https://freeimage.host/api/1/upload"
    try:
        # Base64 encode the image bytes
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        payload = {
            "key": config.FREEIMAGE_API_KEY,
            "action": "upload",
            "source": base64_image,
            "format": "json"
        }
        
        response = requests.post(url, data=payload, timeout=20)
        if response.status_code == 200:
            res_data = response.json()
            # Return direct link to image
            return res_data.get("image", {}).get("url")
        else:
            print(f"❌ Freeimage upload failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"⚠️ Exception uploading to Freeimage: {e}")
    return None

def is_valid_image_bytes(img_bytes):
    """Verify image magic bytes for JPEG, PNG, GIF, WebP"""
    if len(img_bytes) < 100:
        return False
    # JPEG magic bytes: FF D8
    if img_bytes.startswith(b'\xff\xd8'):
        return True
    # PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    if img_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
        return True
    # GIF magic bytes: GIF87a or GIF89a
    if img_bytes.startswith(b'GIF87a') or img_bytes.startswith(b'GIF89a'):
        return True
    # WebP: RIFFxxxxWEBP
    if img_bytes.startswith(b'RIFF') and b'WEBP' in img_bytes[8:16]:
        return True
    return False

def download_and_upload_to_imgbb(source_url, barcode):
    """
    Downloads an image from a source URL and uploads it to ImgBB (Primary)
    with fallback to Freeimage.host (Secondary).
    Helps avoid hotlinking issues.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    try:
        # Avoid downloading huge files by streaming/checking headers first
        response = requests.get(source_url, headers=headers, timeout=15, stream=True)
        if response.status_code == 200:
            content_type = response.headers.get('Content-Type', '').lower()
            if not content_type.startswith('image/'):
                print(f"❌ Aborted: content-type '{content_type}' is not an image for URL: {source_url}")
                return None
                
            img_bytes = response.content
            if not is_valid_image_bytes(img_bytes):
                print(f"❌ Aborted: Image validation (magic bytes check) failed for URL: {source_url}")
                return None
                
            # Upload to ImgBB (Primary)
            final_url = upload_to_imgbb(img_bytes, filename=f"ozo_{barcode}.jpg")
            
            # Fallback to Freeimage.host (Secondary) if ImgBB fails
            if not final_url:
                print("🔄 ImgBB upload failed/throttled. Trying fallback to Freeimage.host...")
                final_url = upload_to_freeimage(img_bytes, filename=f"ozo_{barcode}.jpg")
                
            return final_url
        else:
            print(f"❌ Failed to download source image from {source_url}: Status {response.status_code}")
    except Exception as e:
        print(f"⚠️ Exception downloading source image from {source_url}: {e}")
    return None

