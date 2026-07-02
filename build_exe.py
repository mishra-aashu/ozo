import os
import sys
import subprocess

def build():
    # Make sure we are in the root directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Self-healing: Check if we are running inside a virtual environment
    is_venv = sys.prefix != sys.base_prefix
    
    if not is_venv:
        venv_dir = ".venv-image-tool"
        venv_python = os.path.join(venv_dir, "bin", "python") if not sys.platform.startswith('win') else os.path.join(venv_dir, "Scripts", "python.exe")
        
        if not os.path.exists(venv_python):
            print(f"📦 Virtual environment not found. Creating one in {venv_dir}...")
            try:
                subprocess.check_call([sys.executable, "-m", "venv", venv_dir])
            except Exception as e:
                print(f"❌ Failed to create virtual environment: {e}")
                print("Please install python3-venv (e.g. 'sudo apt install python3-venv') and try again.")
                sys.exit(1)
                
        print(f"🔄 Re-running build script inside virtual environment: {venv_python}")
        # Re-execute this script using the virtual environment python interpreter
        os.execv(venv_python, [venv_python] + sys.argv)
        sys.exit(0)

    # Now we are guaranteed to be in a virtual environment
    try:
        import PyInstaller
    except ImportError:
        print("Installing PyInstaller inside virtual environment...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])

    # Determine paths and separator based on OS
    sep = ';' if sys.platform.startswith('win') else ':'
    pyinstaller_bin = os.path.join(sys.prefix, "Scripts", "pyinstaller.exe") if sys.platform.startswith('win') else os.path.join(sys.prefix, "bin", "pyinstaller")
    
    # Build command
    cmd = [
        pyinstaller_bin,
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
