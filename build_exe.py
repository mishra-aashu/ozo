import os
import sys
import subprocess

def build():
    # Make sure we are in the root directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Install pyinstaller if not present
    try:
        import PyInstaller
    except ImportError:
        print("Installing PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])

    # Determine paths and separator based on OS
    sep = ';' if sys.platform.startswith('win') else ':'
    
    # Build command
    cmd = [
        "pyinstaller",
        "--onefile",
        f"--add-data=image_tool/templates{sep}image_tool/templates",
        "--name=OzoMartImageTool",
        "run_image_tool.py"
    ]
    
    print(f"Running build command: {' '.join(cmd)}")
    subprocess.check_call(cmd)
    
    print("\n🎉 Build complete!")
    if sys.platform.startswith('win'):
        print("You can find 'OzoMartImageTool.exe' in the 'dist' folder.")
    else:
        print("You can find 'OzoMartImageTool' binary in the 'dist' folder.")

if __name__ == "__main__":
    build()
