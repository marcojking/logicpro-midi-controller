#!/bin/bash
# MIDI Controller for Logic Pro - Start Script
# Double-click this file to start the web server

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Get local IP address
get_ip() {
    # Try to get the main network interface IP
    IP=$(ipconfig getifaddr en0 2>/dev/null)
    if [ -z "$IP" ]; then
        IP=$(ipconfig getifaddr en1 2>/dev/null)
    fi
    if [ -z "$IP" ]; then
        IP="localhost"
    fi
    echo "$IP"
}

LOCAL_IP=$(get_ip)
PORT=8000

# Clear screen and show banner
clear
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║       🎛️  MIDI Controller for Logic Pro  🎛️             ║"
echo "║                                                          ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║                                                          ║"
echo "║  📍 Open this URL on the Mac:                            ║"
echo "║     http://localhost:$PORT                               ║"
echo "║                                                          ║"
echo "║  📱 Open this URL on your phone:                         ║"
printf "║     http://%-16s:$PORT/mobile.html          ║\n" "$LOCAL_IP"
echo "║                                                          ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║                                                          ║"
echo "║  Press Ctrl+C to stop the server                         ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "Starting server with Python 3..."
    echo ""
    cd public
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    echo "Starting server with Python..."
    echo ""
    cd public
    python -m SimpleHTTPServer $PORT
else
    echo "❌ Error: Python is not installed."
    echo "   Please install Python or run:"
    echo "   cd public && npx serve"
    read -p "Press Enter to exit..."
    exit 1
fi
