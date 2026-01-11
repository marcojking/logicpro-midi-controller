#!/bin/bash
# Run the Logic Pro Transport Controller
# Double-click this file to start!

# Get the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run the Python script
python3 "$DIR/osc_transport.py"

# Keep terminal open on error
read -p "Press Enter to close..."
