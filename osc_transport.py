#!/usr/bin/env python3
"""
OSC to Logic Pro Transport Controller (Zero-Install Version)
Receives OSC messages and controls Logic Pro via keyboard shortcuts.

NO INSTALLATION REQUIRED - uses only built-in Python libraries.

Usage:
  1. Copy this folder to your SSD
  2. Double-click run_transport.command
  3. Or: python3 osc_transport.py

Transport Controls:
  Record    = R key
  Play      = Space
  Stop      = . (period)
  Rewind    = , (comma) 
  Undo      = Cmd+Z
  Loop      = C key
  Click     = K key
  Save      = Cmd+S
"""

import socket
import struct
import subprocess
import sys

# Configuration
OSC_PORT = 9000
LOGIC_APP = "Logic Pro"

# OSC address to AppleScript keystroke mapping
TRANSPORT_MAP = {
    'record': ('r', False),           # R key
    'play': ('space', False),         # Space bar
    'stop': ('.', False),             # Period
    'rewind': (',', False),           # Comma (rewind)
    'undo': ('z', True),              # Cmd+Z
    'loop': ('c', False),             # C key (cycle)
    'click': ('k', False),            # K key (metronome)
    'marker': ("'", False),           # Quote (create marker)
    'prevMarker': (',', True),        # Cmd+, (previous marker)
    'nextMarker': ('.', True),        # Cmd+. (next marker)
    'save': ('s', True),              # Cmd+S
}

def send_keystroke(key, with_command=False):
    """Send a keystroke to Logic Pro using AppleScript"""
    if with_command:
        script = f'''
        tell application "{LOGIC_APP}"
            activate
        end tell
        tell application "System Events"
            keystroke "{key}" using command down
        end tell
        '''
    else:
        if key == 'space':
            script = f'''
            tell application "{LOGIC_APP}"
                activate
            end tell
            tell application "System Events"
                key code 49
            end tell
            '''
        else:
            script = f'''
            tell application "{LOGIC_APP}"
                activate
            end tell
            tell application "System Events"
                keystroke "{key}"
            end tell
            '''
    
    try:
        subprocess.run(['osascript', '-e', script], capture_output=True, timeout=2)
        return True
    except Exception as e:
        print(f"Error sending keystroke: {e}")
        return False

def parse_osc_string(data, offset):
    """Parse a null-terminated OSC string"""
    end = data.find(b'\x00', offset)
    if end == -1:
        return None, offset
    s = data[offset:end].decode('utf-8')
    # OSC strings are padded to 4-byte boundaries
    padding = 4 - ((end - offset + 1) % 4)
    if padding == 4:
        padding = 0
    return s, end + 1 + padding

def parse_osc_message(data):
    """Parse an OSC message, return (address, args)"""
    try:
        # Parse address
        address, offset = parse_osc_string(data, 0)
        if not address or not address.startswith('/'):
            return None, None
        
        # Parse type tag
        if offset >= len(data):
            return address, []
        
        type_tag, offset = parse_osc_string(data, offset)
        if not type_tag or not type_tag.startswith(','):
            return address, []
        
        # Parse arguments
        args = []
        for t in type_tag[1:]:  # Skip the comma
            if t == 'i':
                if offset + 4 <= len(data):
                    val = struct.unpack('>i', data[offset:offset+4])[0]
                    args.append(val)
                    offset += 4
            elif t == 'f':
                if offset + 4 <= len(data):
                    val = struct.unpack('>f', data[offset:offset+4])[0]
                    args.append(val)
                    offset += 4
        
        return address, args
    except Exception as e:
        print(f"Parse error: {e}")
        return None, None

def handle_transport(action, value):
    """Handle a transport control command"""
    if action not in TRANSPORT_MAP:
        print(f"Unknown action: {action}")
        return
    
    key, with_cmd = TRANSPORT_MAP[action]
    
    # Only trigger on "press" (value > 0)
    if value > 0:
        print(f"🎹 {action.upper()}")
        send_keystroke(key, with_cmd)

def main():
    print("\n" + "=" * 50)
    print("  Logic Pro Transport Controller")
    print("  (Zero-Install AppleScript Version)")
    print("=" * 50)
    print(f"Listening for OSC on port {OSC_PORT}")
    print("=" * 50)
    print("\nSupported commands:")
    print("  /transport/record, /transport/play, /transport/stop")
    print("  /transport/rewind, /transport/undo, /transport/loop")
    print("  /transport/click, /transport/save, /transport/marker")
    print("\nPress Ctrl+C to stop\n")
    
    # Create UDP socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    try:
        sock.bind(('0.0.0.0', OSC_PORT))
    except OSError as e:
        print(f"Error: Could not bind to port {OSC_PORT}")
        print(f"  {e}")
        print("Try closing other applications using this port.")
        sys.exit(1)
    
    print(f"✓ Listening on port {OSC_PORT}...")
    
    try:
        while True:
            data, addr = sock.recvfrom(1024)
            address, args = parse_osc_message(data)
            
            if address:
                # Handle /transport/<action> messages
                if address.startswith('/transport/'):
                    action = address.split('/')[-1]
                    value = args[0] if args else 127
                    handle_transport(action, value)
                else:
                    print(f"Received: {address} {args}")
    
    except KeyboardInterrupt:
        print("\n\nShutting down...")
    finally:
        sock.close()

if __name__ == "__main__":
    main()
