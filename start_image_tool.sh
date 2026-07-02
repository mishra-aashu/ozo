#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Clear screen
clear

# Define colors
GREEN='\033[0;32m'
ORANGE='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${ORANGE}=====================================================${NC}"
echo -e "${GREEN}       OzoMart Localhost Image Resolution Tool       ${NC}"
echo -e "${ORANGE}=====================================================${NC}"
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# 1. Check Python installation
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ python3 could not be found. Please install Python 3.8+ first.${NC}"
    exit 1
fi

# 2. Setup virtual environment
VENV_DIR=".venv-image-tool"
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${BLUE}📦 Creating Python virtual environment in $VENV_DIR...${NC}"
    python3 -m venv "$VENV_DIR"
fi

# 3. Activate venv
echo -e "${BLUE}🔌 Activating virtual environment...${NC}"
source "$VENV_DIR/bin/activate"

# 4. Install requirements
echo -e "${BLUE}⬇️ Installing/updating dependencies from requirements.txt...${NC}"
pip install -q --upgrade pip
pip install -q -r image_tool/requirements.txt

# 5. Start Server
echo -e "${GREEN}🚀 Launching local Flask dashboard on http://localhost:5000...${NC}"
echo -e "${ORANGE}Press Ctrl+C to stop the server.${NC}"
echo ""

# Attempt to open browser in background (cross-platform)
if command -v xdg-open &> /dev/null; then
    (sleep 1.5 && xdg-open "http://localhost:5000" &) 2>/dev/null || true
elif command -v open &> /dev/null; then
    (sleep 1.5 && open "http://localhost:5000" &) 2>/dev/null || true
fi

# Run Flask app with python path configured
export PYTHONPATH="$SCRIPT_DIR"
python3 -m image_tool.app
