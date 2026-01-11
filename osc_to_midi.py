#!/usr/bin/env python3
"""
OSC to MIDI Bridge for Logic Pro
Receives OSC messages from the network and sends MIDI to IAC Driver

Usage:
  1. pip3 install python-osc mido python-rtmidi
  2. python3 osc_to_midi.py
  3. Open Logic Pro and enable IAC Driver in MIDI settings
"""

import argparse
import sys

try:
    from pythonosc import dispatcher, osc_server
    import mido
except ImportError as e:
    print("Missing dependencies. Install with:")
    print("  pip3 install python-osc mido python-rtmidi")
    sys.exit(1)

# Default settings
DEFAULT_PORT = 9000
DEFAULT_MIDI_CHANNEL = 0  # 0-indexed, so channel 1

# Global MIDI output
midi_out = None

def find_iac_driver():
    """Find IAC Driver in available MIDI outputs"""
    outputs = mido.get_output_names()
    print(f"Available MIDI outputs: {outputs}")
    
    for name in outputs:
        if 'IAC' in name.upper():
            return name
    
    # Return first output if no IAC found
    if outputs:
        print(f"Warning: IAC Driver not found, using: {outputs[0]}")
        return outputs[0]
    
    return None

def handle_cc(address, *args):
    """Handle /midi/cc messages: /midi/cc <channel> <cc> <value>"""
    global midi_out
    if len(args) >= 3 and midi_out:
        channel = int(args[0]) - 1  # Convert to 0-indexed
        cc = int(args[1])
        value = int(args[2])
        msg = mido.Message('control_change', channel=channel, control=cc, value=value)
        midi_out.send(msg)
        print(f"CC: ch={channel+1} cc={cc} val={value}")

def handle_transport(address, *args):
    """Handle transport commands: /transport/<action> <value>"""
    global midi_out
    if not args or not midi_out:
        return
    
    # Extract action from address (e.g., /transport/record -> record)
    action = address.split('/')[-1]
    value = int(args[0])
    
    # Transport CC mappings (same as web app)
    transport_cc = {
        'record': 116,
        'play': 117,
        'stop': 118,
        'rewind': 119,
        'undo': 120,
        'loop': 121,
        'click': 122,
        'marker': 123,
        'prevMarker': 124,
        'nextMarker': 125,
        'save': 126
    }
    
    if action in transport_cc:
        cc = transport_cc[action]
        msg = mido.Message('control_change', channel=0, control=cc, value=value)
        midi_out.send(msg)
        print(f"Transport: {action} = {value}")

def handle_slider(address, *args):
    """Handle slider messages: /slider/<id> <value>"""
    global midi_out
    if not args or not midi_out:
        return
    
    try:
        slider_id = int(address.split('/')[-1])
        value = int(float(args[0]) * 127)  # Convert 0-1 to 0-127
        
        msg = mido.Message('control_change', channel=0, control=slider_id, value=value)
        midi_out.send(msg)
        print(f"Slider {slider_id}: {value}")
    except (ValueError, IndexError) as e:
        print(f"Error parsing slider: {e}")

def main():
    global midi_out
    
    parser = argparse.ArgumentParser(description='OSC to MIDI Bridge for Logic Pro')
    parser.add_argument('--port', type=int, default=DEFAULT_PORT, 
                        help=f'OSC port to listen on (default: {DEFAULT_PORT})')
    parser.add_argument('--midi-output', type=str, default=None,
                        help='MIDI output name (default: auto-detect IAC Driver)')
    args = parser.parse_args()
    
    # Find and open MIDI output
    midi_name = args.midi_output or find_iac_driver()
    if not midi_name:
        print("Error: No MIDI outputs available!")
        print("Make sure IAC Driver is enabled in Audio MIDI Setup")
        sys.exit(1)
    
    try:
        midi_out = mido.open_output(midi_name)
        print(f"✓ MIDI output: {midi_name}")
    except Exception as e:
        print(f"Error opening MIDI output: {e}")
        sys.exit(1)
    
    # Set up OSC dispatcher
    disp = dispatcher.Dispatcher()
    disp.map("/midi/cc", handle_cc)
    disp.map("/transport/*", handle_transport)
    disp.map("/slider/*", handle_slider)
    
    # Default handler for debugging
    def default_handler(address, *args):
        print(f"Unhandled OSC: {address} {args}")
    disp.set_default_handler(default_handler)
    
    # Start OSC server
    server = osc_server.ThreadingOSCUDPServer(("0.0.0.0", args.port), disp)
    print(f"✓ OSC server listening on port {args.port}")
    print(f"\nReady! Waiting for OSC messages...")
    print(f"Press Ctrl+C to stop\n")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping...")
        midi_out.close()

if __name__ == "__main__":
    main()
