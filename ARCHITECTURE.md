# Show Control Dashboard - Technical Architecture

## System Overview

A LAN-accessible show control system with bidirectional WebSocket communication between a computer (host) and mobile devices, outputting MIDI and OSC messages for live performance control.

## Technology Stack

- **Backend:** Node.js + Express + Socket.IO
- **MIDI:** `easymidi` library
- **OSC:** `osc.js` library
- **Frontend:** Vanilla HTML/CSS/JavaScript (no framework dependencies)
- **Communication:** WebSocket (Socket.IO for reliability)

## Data Structures

### Slider Configuration Object
```javascript
{
  id: 1,                          // Slider index (1-10)
  label: "Stage Wash",            // Custom name
  color: "#FF5733",               // Hex color code
  value: 0.5,                     // Current value (0.0-1.0)
  visibleOnMobile: true,          // Show on mobile devices
  protocol: "midi",               // "midi" | "osc" (switch, not both)

  // MIDI Configuration
  midiChannel: 1,                 // 1-16
  midiCC: 1,                      // 0-127

  // OSC Configuration
  oscAddress: "/slider/1",        // OSC address pattern
  oscTargetIP: "127.0.0.1",       // Target IP
  oscTargetPort: 53000,           // Target port (default 53000 for QLab compatibility)
  oscReceivePort: 53001           // Port for receiving OSC (for learn mode)
}
```

### WebSocket Message Types

#### Client → Server
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
  config: { /* partial config object */ }
}

// Heartbeat
{
  type: "ping"
}
```

#### Server → Client
```javascript
// Full state sync (on connect)
{
  type: "fullState",
  sliders: [ /* array of 10 slider configs */ ],
  connectedClients: 3
}

// Single slider update
{
  type: "sliderUpdate",
  id: 1,
  value: 0.75
}

// Configuration update broadcast
{
  type: "configUpdate",
  id: 1,
  config: { /* partial config */ }
}

// Connection status
{
  type: "connectionStatus",
  connected: true,
  connectedClients: 3
}

// Heartbeat response
{
  type: "pong"
}
```

## Message Flow

### Slider Movement Flow
```
Mobile Device                Server                     Computer Dashboard
     |                         |                              |
     |---sliderChange(id,val)->|                              |
     |                         |--MIDI CC Message------------>| (To MIDI software)
     |                         |--OSC Message---------------->| (To OSC software)
     |                         |--sliderUpdate(id,val)------->|
     |<--sliderUpdate(id,val)--|                              |
     |                         |                              |
```

### Configuration Change Flow
```
Computer Dashboard           Server                     Mobile Device(s)
     |                         |                              |
     |---configUpdate(id,cfg)->|                              |
     |                         |--configUpdate(id,cfg)------->|
     |                         |                              |
     |                         |  (Mobile re-renders if       |
     |                         |   visibility changed)        |
```

### Connection Flow
```
Mobile Device                Server                     Computer Dashboard
     |                         |                              |
     |---WebSocket Connect---->|                              |
     |<--fullState-------------|                              |
     |                         |--connectionStatus(count)---->|
     |                         |                              |
     | (Heartbeat every 5s)    |                              |
     |---ping----------------->|                              |
     |<--pong------------------|                              |
     |                         |                              |
     | (If no pong for 10s)    |                              |
     |---Auto-reconnect------->|                              |
```

## MIDI Implementation

### Output Format
- **Range Conversion:** Value (0.0-1.0) → MIDI (0-127)
  ```javascript
  midiValue = Math.round(normalizedValue * 127)
  ```
- **Message Type:** Control Change (0xB0 + channel)
- **Virtual Port:** Create virtual MIDI output port named "ShowControl"
- **Physical Port:** Allow selection of physical MIDI devices if available

### MIDI Port Management
```javascript
// Create virtual MIDI output
const output = new easymidi.Output('ShowControl', true);

// Send CC message
output.send('cc', {
  controller: midiCC,
  value: midiValue,
  channel: midiChannel - 1  // easymidi uses 0-15
});
```

## OSC Implementation

### Output Format
- **Value Type:** Float32 (0.0-1.0)
- **Transport:** UDP
- **Address Pattern:** User-configurable (e.g., `/slider/1`, `/lighting/wash`)
- **Message Structure:**
  ```javascript
  {
    address: "/slider/1",
    args: [
      { type: "f", value: 0.75 }  // Float32
    ]
  }
  ```

### OSC Port Management
```javascript
const osc = require('osc');

// Create UDP port
const oscPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 57121,
  metadata: true
});

// Send OSC message
oscPort.send({
  address: slider.oscAddress,
  args: [{ type: "f", value: normalizedValue }]
}, slider.oscTargetIP, slider.oscTargetPort);
```

## WebSocket Server Architecture

### Server State
```javascript
const serverState = {
  sliders: [],              // Array of 10 slider configurations
  clients: new Map(),       // Map of socket.id → client info
  lastActivity: new Map()   // Map of slider.id → timestamp
};
```

### Connection Handling
- Track all connected clients
- Broadcast client count to all connections
- Send full state on new connection
- Clean up on disconnect

### Broadcast Strategy
- **Value changes:** Broadcast to ALL clients (including sender for confirmation)
- **Config changes:** Broadcast to ALL clients
- **Connection status:** Broadcast to ALL clients

## UI Components

### Computer Dashboard

#### Layout
```
+----------------------------------------------------------+
| Show Control Dashboard        IP: 192.168.1.100:3000     |
| Connected Devices: 2                            [Status] |
+----------------------------------------------------------+
| Slider 1                                                  |
| [Label Input] [Color] [▓▓▓▓▓▓▓░░░] 0.75 [◉] [☑ Mobile]  |
| Protocol: [MIDI◉OSC] MIDI: Ch[1▾] CC[1  ] OSC: [/slider/1    ] |
| Target: [127.0.0.1    ]:[53000]                          |
+----------------------------------------------------------+
| Slider 2                                                  |
| ...                                                       |
+----------------------------------------------------------+
|                     MESSAGE LOG                           |
| [INFO] Slider 1 → MIDI Ch1 CC1: 96                       |
| [INFO] Slider 1 → OSC /slider/1: 0.75                    |
+----------------------------------------------------------+
```

#### Visual Feedback
- **Flash on change:** 200ms highlight animation
- **Activity LED:** Green dot that blinks for 100ms on message send
- **Value display:** Shows both normalized (0.0-1.0) and protocol-specific values
- **Message log:** Scrolling log with last 50 messages, auto-scroll to bottom

### Mobile Interface

#### Portrait Layout
```
+----------------------+
| ● Show Control       |
| IP: 192.168.1.100    |
+----------------------+
| Stage Wash      0.75 |
| [▓▓▓▓▓▓▓▓░░░░░░]    |
+----------------------+
| Video Opacity   0.50 |
| [▓▓▓▓▓▓░░░░░░░░]    |
+----------------------+
| ...                  |
+----------------------+
```

#### Landscape Layout
```
+------------------------------------------------+
| ● Show Control  IP: 192.168.1.100             |
+------------------------------------------------+
| Stage   Video   Audio   ...                    |
| Wash    Opa.    Rev.                           |
| 0.75    0.50    0.30                           |
| [▓▓]    [▓▓]    [▓]                           |
| [▓▓]    [▓▓]    [▓]                           |
| [░░]    [░░]    [░]                           |
+------------------------------------------------+
```

#### Touch Optimization
- Minimum touch target: 44x44px
- Slider track height: 60px minimum
- Haptic feedback on value change (if supported)
- Prevent scroll while dragging slider

## Network Configuration

### Server Setup
```javascript
const PORT = 3000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Get local IP address
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://${getLocalIP()}:${PORT}`);
});
```

### Client Connection
```javascript
// Computer dashboard
const socket = io('http://localhost:3000');

// Mobile device
const socket = io('http://192.168.1.100:3000');
```

### Auto-Reconnect Logic
```javascript
// Client-side
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 999;  // Effectively infinite
const RECONNECT_DELAY = 1000;        // 1 second

socket.on('disconnect', () => {
  showDisconnectedStatus();
  attemptReconnect();
});

function attemptReconnect() {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    setTimeout(() => {
      reconnectAttempts++;
      socket.connect();
    }, RECONNECT_DELAY);
  }
}

socket.on('connect', () => {
  reconnectAttempts = 0;
  showConnectedStatus();
});
```

## Error Handling

### MIDI Errors
- Virtual port creation failure → Log warning, continue with OSC only
- Port write failure → Log error, continue operation
- No MIDI system available → Graceful degradation

### OSC Errors
- Invalid IP address → Show validation error inline
- Port binding failure → Try alternative ports (9000, 8000, 57120)
- Send failure → Log error, continue operation

### WebSocket Errors
- Connection timeout → Auto-reconnect
- Message parse error → Log and ignore malformed messages
- State sync error → Request full state refresh

## Performance Considerations

### Throttling
- Slider updates throttled to max 60fps (16.67ms)
- Message log updates batched every 100ms
- WebSocket broadcasts use Socket.IO rooms for efficiency

### Memory Management
- Message log limited to 50 entries (FIFO)
- Disconnect cleanup removes client state
- No persistent storage (fresh start each session)

### Network Efficiency
- Only send changed values
- Use binary protocol for slider values (optional optimization)
- Compress large state transfers (optional)

## Security Considerations

### Network Safety
- Listen on LAN only (0.0.0.0 binding for LAN access)
- No authentication (trusted network assumption)
- No external internet exposure
- Rate limiting: 100 messages/second per client

### Input Validation
- Slider values clamped to 0.0-1.0
- MIDI channel: 1-16, CC: 0-127
- OSC address: must start with '/'
- IP address: valid IPv4 format
- Port: 1-65535

## Testing Strategy

### Manual Testing
1. **Single device:** Computer controls, verify MIDI/OSC output
2. **Mobile sync:** Phone controls, verify computer updates
3. **Multi-device:** Two phones + computer, verify all sync
4. **Disconnect/reconnect:** Pull network cable, verify auto-reconnect
5. **Protocol switching:** Toggle MIDI/OSC/Both, verify correct output
6. **Visibility:** Toggle mobile visibility, verify mobile UI updates

### MIDI Testing Tools
- **macOS:** MIDI Monitor, Audio MIDI Setup
- **Windows:** MIDI-OX, LoopMIDI (virtual ports)
- **Linux:** aseqdump, qjackctl

### OSC Testing Tools
- **All platforms:** OSC Monitor, Protokol, TouchOSC Bridge
- **Command line:** oscdump

## Future Enhancements (Not Implemented)
- Preset/snapshot system
- Fade transitions
- MIDI/OSC input (bidirectional)
- Lock/unlock controls
- Save/load configurations
- Multi-page support (10+ sliders)
- Custom slider ranges
- Automation recording

## File Structure
```
481-Final/
├── server.js              # Main server with WebSocket, MIDI, OSC
├── package.json           # Dependencies
├── public/
│   ├── index.html         # Computer dashboard
│   ├── mobile.html        # Mobile interface
│   ├── css/
│   │   ├── dashboard.css  # Computer styles
│   │   └── mobile.css     # Mobile styles
│   └── js/
│       ├── dashboard.js   # Computer logic
│       └── mobile.js      # Mobile logic
├── ARCHITECTURE.md        # This file
└── README.md              # Setup and usage instructions
```
