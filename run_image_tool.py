import os
import sys
import threading
import webbrowser

# Add current folder to sys.path so 'image_tool' packages can be imported correctly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

# Load environment variables (.env file if present)
load_dotenv()

from image_tool.app import app

def open_browser():
    url = os.getenv("OZOMART_PORTAL_URL", "https://ozomart.store/mart")
    print(f"🌍 Opening OzoMart Portal ({url}) in standalone app mode...")
    import subprocess
    import shutil
    
    chrome_path = None
    if sys.platform.startswith('win'):
        paths = [
            os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe")
        ]
        for p in paths:
            if os.path.exists(p):
                chrome_path = p
                break
    elif sys.platform == 'darwin':
        p = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        if os.path.exists(p):
            chrome_path = p
    else:
        # Linux
        chrome_path = shutil.which("google-chrome") or shutil.which("chrome") or shutil.which("chromium-browser") or shutil.which("chromium")

    if chrome_path:
        try:
            subprocess.Popen([chrome_path, f"--app={url}"])
            return
        except Exception as e:
            print(f"⚠️ Failed to launch Chrome app mode: {e}")
            
    # Fallback to default browser tab
    webbrowser.open(url)

if __name__ == "__main__":
    # Autostart browser in a separate thread
    threading.Timer(1.2, open_browser).start()
    
    print("🚀 Starting OzoMart Local Background Service on http://localhost:5000")
    # Run server without reload, enabling multithreading so long-running SSE streams don't block auth or api status checks
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
