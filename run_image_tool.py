import os
import sys
import threading
import webbrowser

# Add current folder to sys.path so 'image_tool' packages can be imported correctly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from image_tool.app import app

def open_browser():
    print("🌍 Opening dashboard http://localhost:5000 in your browser...")
    webbrowser.open("http://localhost:5000")

if __name__ == "__main__":
    # Autostart browser in a separate thread
    threading.Timer(1.2, open_browser).start()
    
    print("🚀 Starting OzoMart Localhost Image Tool on http://localhost:5000")
    # Run server without reload, enabling multithreading so long-running SSE streams don't block auth or api status checks
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
