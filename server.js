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

// Initialize OSC UDP Port
const oscPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 57121,
  metadata: true
});

oscPort.on("ready", () => {
  console.log("OSC Port ready on", oscPort.options.localPort);
});

oscPort.on("error", (error) => {
  console.error("OSC Error:", error);
});

oscPort.open();

// Initialize slider state with useful default OSC addresses
function initializeSliders() {
  const defaults = [
    { label: 'Track 1 Vol', oscAddress: '/track/1/volume', color: '#3b82f6' },
    { label: 'Track 2 Vol', oscAddress: '/track/2/volume', color: '#22c55e' },
    { label: 'Track 3 Vol', oscAddress: '/track/3/volume', color: '#eab308' },
    { label: 'Master Vol', oscAddress: '/master/volume', color: '#ef4444' },
    { label: 'Track 1 Pan', oscAddress: '/track/1/pan', color: '#8b5cf6' },
    { label: 'Track 2 Pan', oscAddress: '/track/2/pan', color: '#06b6d4' },
    { label: 'Track 3 Pan', oscAddress: '/track/3/pan', color: '#f97316' },
    { label: 'Slider 8', oscAddress: '/slider/8', color: '#ec4899' },
    { label: 'Slider 9', oscAddress: '/slider/9', color: '#14b8a6' },
    { label: 'Slider 10', oscAddress: '/slider/10', color: '#6366f1' }
  ];

  const sliders = [];
  for (let i = 0; i < 10; i++) {
    sliders.push({
      id: i + 1,
      label: defaults[i].label,
      color: defaults[i].color,
      value: 0.0,
      visibleOnMobile: true,
      oscAddress: defaults[i].oscAddress,
      oscTargetIP: '127.0.0.1',
      oscTargetPort: 8000
    });
  }
  return sliders;
}

// Server state
const state = {
  sliders: initializeSliders(),
  clients: new Map(),
  messageLog: []
};

// Add message to log (max 50 entries)
function logMessage(message) {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = { timestamp, message };
  state.messageLog.unshift(logEntry);
  if (state.messageLog.length > 50) {
    state.messageLog.pop();
  }
  return logEntry;
}

// Send OSC message
function sendOSC(slider) {
  try {
    oscPort.send({
      address: slider.oscAddress,
      args: [{ type: "f", value: slider.value }]
    }, slider.oscTargetIP, slider.oscTargetPort);

    const logEntry = logMessage(`OSC → ${slider.oscAddress}: ${slider.value.toFixed(3)}`);

    // Broadcast log entry to all clients
    io.emit('logUpdate', logEntry);

    console.log(`[OSC] ${slider.oscAddress} → ${slider.value.toFixed(3)} (${slider.oscTargetIP}:${slider.oscTargetPort})`);
  } catch (error) {
    console.error('OSC Send Error:', error);
  }
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Add client to state
  state.clients.set(socket.id, {
    connectedAt: Date.now(),
    userAgent: socket.handshake.headers['user-agent']
  });

  // Send full state to new client
  socket.emit('fullState', {
    sliders: state.sliders,
    connectedClients: state.clients.size,
    messageLog: state.messageLog.slice(0, 20) // Send last 20 messages
  });

  // Broadcast updated client count to all
  io.emit('connectionStatus', {
    connected: true,
    connectedClients: state.clients.size
  });

  // Handle slider value changes
  socket.on('sliderChange', (data) => {
    const { id, value } = data;

    if (id < 1 || id > 10) {
      console.error('Invalid slider ID:', id);
      return;
    }

    // Clamp value to 0.0-1.0
    const clampedValue = Math.max(0, Math.min(1, value));

    // Update state
    const slider = state.sliders[id - 1];
    slider.value = clampedValue;

    // Send OSC message
    sendOSC(slider);

    // Broadcast update to all clients
    io.emit('sliderUpdate', {
      id,
      value: clampedValue
    });
  });

  // Handle configuration updates
  socket.on('configUpdate', (data) => {
    const { id, config } = data;

    if (id < 1 || id > 10) {
      console.error('Invalid slider ID:', id);
      return;
    }

    const slider = state.sliders[id - 1];

    // Update configuration
    if (config.label !== undefined) slider.label = config.label;
    if (config.color !== undefined) slider.color = config.color;
    if (config.visibleOnMobile !== undefined) slider.visibleOnMobile = config.visibleOnMobile;
    if (config.oscAddress !== undefined) slider.oscAddress = config.oscAddress;
    if (config.oscTargetIP !== undefined) slider.oscTargetIP = config.oscTargetIP;
    if (config.oscTargetPort !== undefined) slider.oscTargetPort = config.oscTargetPort;

    console.log(`Config updated for slider ${id}:`, config);

    // Broadcast config update to all clients
    io.emit('configUpdate', {
      id,
      config: slider
    });
  });

  // Handle ping (heartbeat)
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    state.clients.delete(socket.id);

    // Broadcast updated client count
    io.emit('connectionStatus', {
      connected: true,
      connectedClients: state.clients.size
    });
  });
});

// Get local IP address for LAN access
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (let ifaceName of Object.keys(interfaces)) {
    const iface = interfaces[ifaceName];
    for (let alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return 'localhost';
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();

  console.log('\n========================================');
  console.log('   OSC Control Dashboard');
  console.log('========================================');
  console.log(`Computer:  http://localhost:${PORT}`);
  console.log(`Mobile:    http://${localIP}:${PORT}/mobile.html`);
  console.log('========================================');
  console.log(`Connected clients: 0`);
  console.log(`OSC Port: ${oscPort.options.localPort}`);
  console.log('========================================\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  oscPort.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
