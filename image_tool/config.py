import os
import re

# Resolve the path to Ozo's root directory .env file
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(ROOT_DIR, '.env')

# Default fallback values
SUPABASE_URL = ""
SUPABASE_KEY = ""
IMGBB_API_KEY = ""
FREEIMAGE_API_KEY = ""
OPENSERP_URL = ""


# Parse .env file manually to avoid external dependencies like python-dotenv
if os.path.exists(ENV_PATH):
    with open(ENV_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, val = line.split('=', 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                
                # Check for direct URL first, then proxy/local fallbacks
                if key == 'VITE_SUPABASE_DIRECT_URL':
                    SUPABASE_URL = val
                elif key == 'VITE_SUPABASE_URL' and not SUPABASE_URL:
                    SUPABASE_URL = val
                elif key == 'VITE_SUPABASE_ANON_KEY':
                    SUPABASE_KEY = val
                elif key == 'VITE_IMGBB_API_KEY':
                    IMGBB_API_KEY = val
                elif key == 'VITE_FREEIMAGE_API_KEY':
                    FREEIMAGE_API_KEY = val
                elif key == 'OPENSERP_URL':
                    OPENSERP_URL = val

# Adjust local proxy URL to point to production Supabase if needed
if SUPABASE_URL == "/api/proxy" or not SUPABASE_URL:
    SUPABASE_URL = "https://ungxccwdondssatixzlz.supabase.co"

# Set default OpenSERP URL if not provided
OPENSERP_URL = os.environ.get("OPENSERP_URL", OPENSERP_URL or "http://localhost:7000")

# Use Anon Key by default for database queries; access_token overrides this in headers.
DB_KEY = SUPABASE_KEY

print(f"🔧 Loaded Config from Ozo root .env:")
print(f"   Supabase URL: {SUPABASE_URL}")
print(f"   ImgBB Key: {'Loaded' if IMGBB_API_KEY else 'Missing'}")
print(f"   Freeimage Key: {'Loaded' if FREEIMAGE_API_KEY else 'Missing'}")
print(f"   OpenSERP URL: {OPENSERP_URL}")


