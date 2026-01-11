# OSC Control Dashboard for Reaper - Simplified Architecture

## Project Goal

Create a LAN-accessible web dashboard that allows mobile devices to control Reaper (DAW) via OSC messages. Users can slide sliders on their phone to control track volumes, FX parameters, sends, etc. in Reaper.

## Core Requirements (Simplified)

1. **Computer Dashboard** - 10 sliders with configuration
2. **Mobile Interface** - Shows only selected sliders
3. **OSC Output** - Sends normalized values (0.0-1.0) to Reaper
4. **Real-time Sync** - Mobile and computer stay in sync via WebSocket
5. **One-way control** - App → Reaper (no feedback from Reaper)

## Technology Stack

- **Backend:** Node.js + Express + Socket.IO
- **OSC:** `osc.js` library (UDP transport)
- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Communication:** WebSocket (Socket.IO)

## Data Structure

### Slider Configuration
```javascript
{
  id: 1,                          // Slider index (1-10)
  label: "Track 1 Volume",        // Custom name
  color: "#FF5733",               // Hex color for visual identification
  value: 0.75,                    // Current value (0.0-1.0)
  visibleOnMobile: true,          // Show on mobile?

  // OSC Configuration
  oscAddress: "/track/1/volume",  // Reaper OSC address
  oscTargetIP: "127.0.0.1",       // Reaper's IP (usually localhost)
  oscTargetPort: 8000             // Reaper's OSC listen port (check Reaper prefs)
}
```

### Common Reaper OSC Addresses

Based on Reaper's default OSC configuration:

**Track Control:**
- `/track/1/volume` - Track 1 volume (0.0-1.0)
- `/track/2/volume` - Track 2 volume
- `/track/1/pan` - Track 1 pan
- `/track/1/mute` - Track 1 mute (0 or 1)
- `/track/1/solo` - Track 1 solo (0 or 1)

**Master:**
- `/master/volume` - Master fader (0.0-1.0)
- `/master/pan` - Master pan

**Sends:**
- `/track/1/send/1/volume` - Track 1, Send 1 volume
- `/track/1/send/2/volume` - Track 1, Send 2 volume

**FX Parameters:**
- `/track/1/fx/1/fxparam/1/value` - Track 1, FX 1, Parameter 1
- `/fxparam/1/value` - Selected track, parameter 1

## Message Flow

### Slider Movement (Mobile → Reaper)
```
Mobile Phone                Server                      Reaper
     |                         |                           |
     |---sliderChange(id,val)->|                           |
     |                         |--OSC: /track/1/volume---->| (Sets track volume)
     |                         |    args: [0.75]           |
     |                         |                           |
     |                         |--sliderUpdate------------>|
     |<--sliderUpdate----------|                           | (Computer dashboard
     |                         |                           |  updates visually)
```

### Configuration Change (Computer → Mobile)
```
Computer                    Server                      Mobile
     |                         |                           |
     |---configUpdate--------->|                           |
     |                         |--configUpdate------------>|
     |                         |                           | (Mobile re-renders
     |                         |                           |  if visibility changed)
```

## WebSocket Messages

### Client → Server
```javascript
// Slider value change
{
  type: "sliderChange",
  id: 1,
  value: 0.75
}

// Configuration update
{
  type: "configUpdate",
  id: 1,
  config: {
    label: "Track 1 Vol",
    oscAddress: "/track/1/volume"
    // ... other fields
  }
}

// Heartbeat
{
  type: "ping"
}
```

### Server → Clients
```javascript
// Full state sync (on connect)
{
  type: "fullState",
  sliders: [ /* array of 10 slider configs */ ],
  connectedClients: 2
}

// Slider update
{
  type: "sliderUpdate",
  id: 1,
  value: 0.75
}

// Config update broadcast
{
  type: "configUpdate",
  id: 1,
  config: { /* updated config */ }
}

// Connection status
{
  type: "connectionStatus",
  connected: true,
  connectedClients: 2
}
```

## OSC Implementation

### Sending OSC Messages
```javascript
const osc = require('osc');

// Create UDP port
const oscPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 57121,  // Our send port
  metadata: true
});

oscPort.open();

// When slider changes, send OSC
function sendOSC(slider) {
  oscPort.send({
    address: slider.oscAddress,        // e.g., "/track/1/volume"
    args: [
      { type: "f", value: slider.value }  // Float32: 0.0-1.0
    ]
  }, slider.oscTargetIP, slider.oscTargetPort);

  console.log(`OSC → ${slider.oscAddress}: ${slider.value}`);
}
```

### Reaper OSC Setup
1. Open Reaper Preferences → Control/OSC/web
2. Add new control surface: "OSC (Open Sound Control)"
3. Set mode to "Configure device" or use default
4. Note the **listen port** (default 8000) - this is where our app sends
5. Pattern file: Use default.ReaperOSC

## Computer Dashboard UI

```
+----------------------------------------------------------+
| OSC Control Dashboard         IP: 192.168.1.100:3000     |
| Connected Devices: 2            Reaper: 127.0.0.1:8000  |
+----------------------------------------------------------+
| 1. [Track 1 Volume  ] [🔴] [▓▓▓▓▓▓▓░░░] 0.75 ● [☑ Mobile]  |
|    OSC Address: [/track/1/volume      ]                  |
|    Target: [127.0.0.1  ]:[8000]                         |
+----------------------------------------------------------+
| 2. [Track 2 Volume  ] [🟢] [▓▓▓▓░░░░░░] 0.50 ● [☑ Mobile]  |
|    OSC Address: [/track/2/volume      ]                  |
|    Target: [127.0.0.1  ]:[8000]                         |
+----------------------------------------------------------+
| 3. [Master Fader    ] [🔵] [▓▓▓▓▓▓▓▓░░] 0.85 ● [☐ Mobile]  |
|    OSC Address: [/master/volume       ]                  |
|    Target: [127.0.0.1  ]:[8000]                         |
+----------------------------------------------------------+
|                     MESSAGE LOG                           |
| [12:34:56] OSC → /track/1/volume: 0.75                   |
| [12:34:57] OSC → /track/2/volume: 0.50                   |
+----------------------------------------------------------+
```

Legend:
- `[🔴]` = Color picker
- `[▓▓▓▓▓▓▓░░░]` = Slider
- `0.75` = Value display
- `●` = Activity LED (blinks on send)
- `[☑ Mobile]` = Visibility checkbox

## Mobile Interface

### Portrait Mode
```
+----------------------+
| ● OSC Control        |
| 192.168.1.100:3000   |
+----------------------+
| Track 1 Volume  0.75 |
| [▓▓▓▓▓▓▓▓░░░░░░]    |
+----------------------+
| Track 2 Volume  0.50 |
| [▓▓▓▓▓▓░░░░░░░░]    |
+----------------------+
```

### Landscape Mode
```
+------------------------------------------------+
| ● OSC Control  192.168.1.100:3000             |
+------------------------------------------------+
| Trk 1    Trk 2    Send                         |
| Vol      Vol      1                            |
| 0.75     0.50     0.30                         |
| [▓▓]     [▓▓]     [▓]                          |
| [▓▓]     [▓▓]     [▓]                          |
| [░░]     [░░]     [░]                          |
+------------------------------------------------+
```

## Visual Feedback

1. **Value Display** - Real-time number next to each slider
2. **Flash on Change** - Slider briefly highlights (200ms) when moved
3. **Activity LED** - Green dot blinks (100ms) when OSC sent
4. **Message Log** - Scrolling log showing last 50 OSC messages with timestamps

## Connection Handling

### Auto-Reconnect
```javascript
// Client-side
const socket = io('http://192.168.1.100:3000', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity
});

socket.on('connect', () => {
  showConnectionStatus(true);
});

socket.on('disconnect', () => {
  showConnectionStatus(false);
  // Socket.IO will auto-reconnect
});
```

### Connection Status Indicator
- **Connected:** Green dot, shows # of devices
- **Disconnected:** Red dot, "Reconnecting..." message

## Server Implementation

### Basic Server Structure
```javascript
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const osc = require('osc');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files
app.use(express.static('public'));

// OSC Port
const oscPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 57121,
  metadata: true
});
oscPort.open();

// Server state
const state = {
  sliders: initializeSliders(),  // Array of 10 slider configs
  clients: new Map()
};

// WebSocket handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  state.clients.set(socket.id, { connectedAt: Date.now() });

  // Send full state
  socket.emit('fullState', {
    sliders: state.sliders,
    connectedClients: state.clients.size
  });

  // Broadcast client count
  io.emit('connectionStatus', {
    connectedClients: state.clients.size
  });

  // Handle slider changes
  socket.on('sliderChange', (data) => {
    const slider = state.sliders[data.id - 1];
    slider.value = data.value;

    // Send OSC to Reaper
    oscPort.send({
      address: slider.oscAddress,
      args: [{ type: "f", value: slider.value }]
    }, slider.oscTargetIP, slider.oscTargetPort);

    // Broadcast to all clients
    io.emit('sliderUpdate', {
      id: data.id,
      value: data.value
    });
  });

  // Handle config updates
  socket.on('configUpdate', (data) => {
    const slider = state.sliders[data.id - 1];
    Object.assign(slider, data.config);

    // Broadcast to all clients
    io.emit('configUpdate', {
      id: data.id,
      config: data.config
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    state.clients.delete(socket.id);
    io.emit('connectionStatus', {
      connectedClients: state.clients.size
    });
  });
});

// Get local IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (let iface of Object.values(interfaces)) {
    for (let alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return 'localhost';
}

// Start server
const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`\n====================================`);
  console.log(`OSC Control Dashboard Running`);
  console.log(`====================================`);
  console.log(`Computer: http://localhost:${PORT}`);
  console.log(`Mobile:   http://${ip}:${PORT}/mobile.html`);
  console.log(`====================================\n`);
});
```

## Reaper Configuration Checklist

1. ✅ Open Reaper Preferences → Control/OSC/web
2. ✅ Add device: "OSC (Open Sound Control)"
3. ✅ Note the listen port (default: 8000)
4. ✅ In our app, set OSC Target Port to 8000
5. ✅ In our app, set OSC Target IP to 127.0.0.1 (same computer)
6. ✅ Move a slider in app
7. ✅ Watch track fader move in Reaper!

## Testing Plan

### Phase 1: Basic OSC
1. Start Reaper, enable OSC control
2. Start our app
3. Configure slider 1: `/track/1/volume`
4. Move slider, verify Reaper track 1 volume changes

### Phase 2: Mobile Connection
1. Get computer's IP address from dashboard
2. Open mobile browser: `http://192.168.1.100:3000/mobile.html`
3. Verify slider appears on mobile
4. Move mobile slider, verify Reaper responds

### Phase 3: Multi-Device
1. Connect second mobile device
2. Verify both devices stay in sync
3. Move slider on device A, verify device B updates

### Phase 4: Visual Feedback
1. Verify value displays update in real-time
2. Verify sliders flash when changed
3. Verify activity LED blinks
4. Verify message log shows OSC messages

## File Structure
```
481-Final/
├── package.json           # Dependencies
├── server.js              # Node.js server with WebSocket + OSC
├── public/
│   ├── index.html         # Computer dashboard
│   ├── mobile.html        # Mobile interface
│   ├── css/
│   │   ├── dashboard.css
│   │   └── mobile.css
│   └── js/
│       ├── dashboard.js   # Computer logic
│       └── mobile.js      # Mobile logic
├── ARCHITECTURE_SIMPLE.md # This file
└── README.md              # Setup instructions
```

## Next Steps

1. ✅ Set up project structure
2. ✅ Install dependencies (express, socket.io, osc)
3. ✅ Build server with WebSocket + OSC
4. ✅ Create computer dashboard HTML/CSS/JS
5. ✅ Create mobile interface HTML/CSS/JS
6. ✅ Test with Reaper
7. ✅ Document setup process

## Success Criteria

- ✅ Can move phone slider, Reaper fader responds in real-time
- ✅ Multiple devices can connect simultaneously
- ✅ Connection auto-recovers if WiFi drops
- ✅ Visual feedback is clear and responsive
- ✅ Configuration is intuitive and inline
- ✅ Works on any device with a web browser
