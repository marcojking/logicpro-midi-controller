# OSC Control Dashboard

A LAN-accessible web-based OSC control surface for Reaper and other show control software. Control your DAW from your phone!

## Features

- **10 Customizable Sliders** with labels, colors, and OSC addresses
- **Mobile Interface** - Control from any phone/tablet on the same network
- **Real-time Sync** - All devices stay synchronized via WebSocket
- **OSC Output** - Sends normalized values (0.0-1.0) to Reaper or other OSC-compatible software
- **Visual Feedback** - Activity indicators, value displays, message logging
- **Responsive Design** - Adapts to portrait and landscape orientations

## Quick Start

### 1. Install Dependencies

```bash
cd "C:\Users\marco\desktop\481-Fianl"
npm install
```

### 2. Configure Reaper

1. Open Reaper
2. Go to **Preferences** → **Control/OSC/web**
3. Click **Add**
4. Select **OSC (Open Sound Control)**
5. Set mode to **Configure device IP:port for OSC**
6. Note the **listen port** (default is 8000)
7. Click **OK**

### 3. Start the Server

```bash
npm start
```

You'll see output like:
```
========================================
   OSC Control Dashboard
========================================
Computer:  http://localhost:3000
Mobile:    http://192.168.1.100:3000/mobile.html
========================================
Connected clients: 0
OSC Port: 57121
========================================
```

### 4. Open Computer Dashboard

Open your web browser and go to:
```
http://localhost:3000
```

### 5. Configure Sliders

For each slider:
1. Enter a **label** (e.g., "Track 1 Volume")
2. Pick a **color** for visual identification
3. Set the **OSC Address** (e.g., `/track/1/volume`)
4. Set **Target IP** to `127.0.0.1` (if Reaper is on same computer)
5. Set **Port** to `8000` (or whatever Reaper is listening on)
6. Check **Mobile** to show this slider on mobile devices
7. Move the slider to test!

### 6. Connect from Mobile

On your phone/tablet (connected to same WiFi):
1. Open the browser
2. Go to the **Mobile URL** shown in the computer dashboard
   - Example: `http://192.168.1.100:3000/mobile.html`
3. You'll see only the sliders marked as "Mobile"
4. Slide away! Changes appear in real-time on Reaper

## Common Reaper OSC Addresses

### Track Control
- `/track/1/volume` - Track 1 volume (0.0-1.0)
- `/track/2/volume` - Track 2 volume
- `/track/1/pan` - Track 1 pan
- `/track/1/mute` - Track 1 mute (0 or 1)
- `/track/1/solo` - Track 1 solo (0 or 1)

### Master
- `/master/volume` - Master fader (0.0-1.0)
- `/master/pan` - Master pan

### Sends
- `/track/1/send/1/volume` - Track 1, Send 1 volume
- `/track/1/send/2/volume` - Track 1, Send 2 volume

### FX Parameters
- `/track/1/fx/1/fxparam/1/value` - Track 1, FX 1, Parameter 1
- `/fxparam/1/value` - Selected track, parameter 1

See Reaper's OSC documentation for the complete list:
`C:\Program Files\REAPER (x64)\Plugins\reaper_default.ReaperOSC`

## Usage Examples

### Example 1: Control 3 Track Volumes

**Slider 1:**
- Label: `Vocals`
- Color: Red (`#ef4444`)
- OSC Address: `/track/1/volume`
- Target: `127.0.0.1:8000`
- Mobile: ✅

**Slider 2:**
- Label: `Guitar`
- Color: Blue (`#3b82f6`)
- OSC Address: `/track/2/volume`
- Target: `127.0.0.1:8000`
- Mobile: ✅

**Slider 3:**
- Label: `Drums`
- Color: Green (`#22c55e`)
- OSC Address: `/track/3/volume`
- Target: `127.0.0.1:8000`
- Mobile: ✅

### Example 2: Control Reverb Send

**Slider 4:**
- Label: `Reverb Send`
- Color: Purple (`#a855f7`)
- OSC Address: `/track/1/send/1/volume`
- Target: `127.0.0.1:8000`
- Mobile: ✅

## Troubleshooting

### Reaper not responding to OSC messages

1. **Check Reaper OSC is enabled:**
   - Preferences → Control/OSC/web → Device should be listed and enabled

2. **Verify the port number:**
   - In Reaper preferences, note the "listen port"
   - In the dashboard, set "Port" to match (default: 8000)

3. **Check the message log:**
   - The dashboard shows all OSC messages being sent
   - Verify the address and value look correct

4. **Test with a simple address:**
   - Try `/master/volume` first to test basic connectivity

### Mobile device can't connect

1. **Same network:**
   - Ensure phone and computer are on the same WiFi network

2. **Firewall:**
   - Windows Firewall may block incoming connections
   - Allow Node.js through the firewall when prompted

3. **IP Address:**
   - Double-check the IP address displayed on the computer dashboard
   - Try typing it manually: `http://192.168.1.XXX:3000/mobile.html`

### Sliders not syncing between devices

1. **Check connection status:**
   - Green dot = connected
   - Red dot = disconnected (will auto-reconnect)

2. **Check browser console:**
   - Press F12 to open developer tools
   - Look for WebSocket connection errors

## Project Structure

```
481-Final/
├── package.json              # Dependencies
├── server.js                 # Node.js server (WebSocket + OSC)
├── public/
│   ├── index.html            # Computer dashboard
│   ├── mobile.html           # Mobile interface
│   ├── css/
│   │   ├── dashboard.css     # Computer styles
│   │   └── mobile.css        # Mobile styles
│   └── js/
│       ├── dashboard.js      # Computer logic
│       └── mobile.js         # Mobile logic
├── ARCHITECTURE.md           # Technical documentation
├── ARCHITECTURE_SIMPLE.md    # Simplified architecture
└── README.md                 # This file
```

## Technical Details

- **Backend:** Node.js, Express, Socket.IO, osc.js
- **Frontend:** Vanilla HTML/CSS/JavaScript (no frameworks)
- **Communication:** WebSocket for real-time bidirectional sync
- **OSC Transport:** UDP
- **Value Range:** 0.0-1.0 (normalized float)

## Advanced Configuration

### Changing the Server Port

Edit `server.js` or set environment variable:
```bash
PORT=3001 npm start
```

### OSC Receive Port

By default, the server sends OSC from port 57121. To change this, edit `server.js`:
```javascript
const oscPort = new osc.UDPPort({
  localPort: 57121,  // Change this
  ...
});
```

### Controlling Other Software

This dashboard works with any OSC-compatible software:

- **QLab:** Set port to 53000, use addresses like `/cue/1/start`
- **Lighting (via QLC+):** Configure OSC input, use custom addresses
- **VJ Software (Resolume, VDMX):** Check their OSC documentation

## Tips & Best Practices

1. **Label clearly** - Use descriptive names like "Lead Vocal" not "Slider 1"
2. **Color code** - Group related controls by color (all vocals = red, etc.)
3. **Test first** - Configure one slider, test it works, then configure the rest
4. **Mobile visibility** - Don't show everything on mobile, only what's needed
5. **Save your settings** - Take a screenshot of your configuration for future reference

## Known Limitations

- No persistence - slider configurations reset when server restarts
- No MIDI support (OSC only)
- No bidirectional feedback from Reaper (one-way control only)
- Maximum 10 sliders

## Future Enhancements

- Save/load configurations
- MIDI support
- Preset snapshots
- Bi-directional OSC (receive feedback from Reaper)
- Unlimited sliders with pagination

## License

MIT

## Support

For issues, questions, or contributions, please refer to the ARCHITECTURE.md file for detailed technical documentation.

---

**Built for show control, live performance, and DAW automation.**

Enjoy controlling your mix from anywhere in the room!
