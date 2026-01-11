# Network MIDI Setup (PC to Mac)

Use this setup when you can't install Chrome on the Mac (e.g., school computers).

## Architecture
```
Phone → WebRTC → Your PC (Chrome) → OSC over WiFi → Mac (Python) → MIDI → Logic Pro
```

## Setup Instructions

### On the Mac (one-time setup)

1. **Install MIDI libraries:**
   ```bash
   pip3 install python-osc mido python-rtmidi
   ```

2. **Enable IAC Driver:**
   - Open Audio MIDI Setup
   - Window → Show MIDI Studio
   - Double-click IAC Driver → Check "Device is online"

3. **Find your Mac's IP address:**
   - System Preferences → Network → Your WiFi → Note the IP (e.g., 192.168.1.50)

### On your PC

1. **Install dependencies (one-time):**
   ```bash
   npm install
   ```

2. **Start the server with Mac's IP:**
   ```bash
   node server.js --osc-ip 192.168.1.50
   ```
   Replace `192.168.1.50` with your Mac's IP address.

3. **Open Chrome:** http://localhost:3000

### On the Mac (each session)

1. **Run the OSC receiver:**
   ```bash
   cd /path/to/project
   python3 osc_to_midi.py
   ```

2. **Open Logic Pro** and use MIDI Learn to map controls

### On your Phone

1. Open the mobile URL shown in the PC terminal
2. Enter the room code from the PC's browser
3. Control Logic Pro remotely!

## Troubleshooting

### "No MIDI outputs available" on Mac
- Make sure IAC Driver is enabled
- Restart Audio MIDI Setup

### OSC not receiving
- Check the Mac's IP is correct
- Make sure firewall allows port 9000
- Verify both devices are on the same network

### Connection refused
- Check if `python3 osc_to_midi.py` is running on the Mac
- Try `python3 osc_to_midi.py --port 9000` explicitly
