#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Clear screen
[ -t 1 ] && clear || true

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

# 5. Check and Start OpenSERP Docker Container
if command -v docker &> /dev/null; then
    echo -e "${BLUE}🐳 Checking OpenSERP docker container status...${NC}"
    if docker ps -a --format '{{.Names}}' | grep -Eq "^openserp$"; then
        if docker ps --format '{{.Names}}' | grep -Eq "^openserp$"; then
            echo -e "${GREEN}✅ OpenSERP Docker container is already running.${NC}"
        else
            echo -e "${BLUE}🔄 OpenSERP Docker container is stopped. Starting it...${NC}"
            docker start openserp >/dev/null || echo -e "${RED}⚠️ Failed to start existing OpenSERP container.${NC}"
            echo -e "${GREEN}✅ OpenSERP Docker container started.${NC}"
        fi
    else
        echo -e "${BLUE}📦 OpenSERP Docker container not found. Initializing...${NC}"
        echo -e "${BLUE}📥 Pulling image and creating container (this might take a few moments)...${NC}"
        docker run -d --name openserp --restart unless-stopped --shm-size=2gb -p 7000:7000 karust/openserp:0.8.8 serve -a 0.0.0.0 -p 7000 >/dev/null || echo -e "${RED}⚠️ Failed to run OpenSERP container.${NC}"
        echo -e "${GREEN}✅ OpenSERP Docker container initialized and running.${NC}"
    fi
else
    echo -e "${ORANGE}⚠️ Docker is not installed or running. OpenSERP queries will fall back to Nainji/FetchNBuy/OFF.${NC}"
fi

# 6. Start Server
echo -e "${GREEN}🚀 Launching local background service...${NC}"
echo -e "${ORANGE}Press Ctrl+C to stop the server.${NC}"
echo ""

# Run Flask app with python path configured
export PYTHONPATH="$SCRIPT_DIR"
python3 -m image_tool.app
