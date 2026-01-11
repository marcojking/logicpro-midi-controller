// Connect to WebSocket server
const socket = io();

// State
let sliders = [];
let isDragging = false;
let currentDragSlider = null;

// DOM Elements
const slidersContainer = document.getElementById('slidersContainer');
const logContent = document.getElementById('logContent');
const statusDot = document.getElementById('statusDot');
const connectionText = document.getElementById('connectionText');
const clientsCount = document.getElementById('clientsCount');
const mobileUrl = document.getElementById('mobileUrl');

// Initialize
function init() {
  updateMobileURL();
  setupSocketListeners();
}

// Update mobile URL display
function updateMobileURL() {
  const host = window.location.hostname;
  const port = window.location.port;
  const url = `http://${host}:${port}/mobile.html`;
  mobileUrl.textContent = url;
}

// Setup WebSocket listeners
function setupSocketListeners() {
  // Connection status
  socket.on('connect', () => {
    console.log('Connected to server');
    updateConnectionStatus(true);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateConnectionStatus(false);
  });

  // Full state received
  socket.on('fullState', (data) => {
    console.log('Received full state:', data);
    sliders = data.sliders;
    renderSliders();
    updateClientCount(data.connectedClients);

    // Display initial log messages
    if (data.messageLog && data.messageLog.length > 0) {
      logContent.innerHTML = '';
      data.messageLog.reverse().forEach(entry => {
        addLogEntry(entry.timestamp, entry.message);
      });
    }
  });

  // Slider update from other clients
  socket.on('sliderUpdate', (data) => {
    const slider = sliders.find(s => s.id === data.id);
    if (slider) {
      slider.value = data.value;
      updateSliderVisuals(slider);
      flashSlider(slider.id);
      blinkActivity(slider.id);
    }
  });

  // Config update from other clients
  socket.on('configUpdate', (data) => {
    const slider = sliders.find(s => s.id === data.id);
    if (slider) {
      Object.assign(slider, data.config);
      renderSliders();
    }
  });

  // Connection status update
  socket.on('connectionStatus', (data) => {
    updateClientCount(data.connectedClients);
  });

  // Log update
  socket.on('logUpdate', (entry) => {
    addLogEntry(entry.timestamp, entry.message);
  });
}

// Update connection status
function updateConnectionStatus(connected) {
  if (connected) {
    statusDot.classList.add('connected');
    connectionText.textContent = 'Connected';
  } else {
    statusDot.classList.remove('connected');
    connectionText.textContent = 'Reconnecting...';
  }
}

// Update client count
function updateClientCount(count) {
  clientsCount.textContent = count;
}

// Render all sliders
function renderSliders() {
  slidersContainer.innerHTML = '';

  sliders.forEach(slider => {
    const row = createSliderRow(slider);
    slidersContainer.appendChild(row);
  });
}

// Create slider row element
function createSliderRow(slider) {
  const row = document.createElement('div');
  row.className = 'slider-row';
  row.style.borderLeftColor = slider.color;
  row.dataset.sliderId = slider.id;

  row.innerHTML = `
    <div class="slider-header">
      <span class="slider-number">${slider.id}.</span>
      <input type="text" class="slider-label-input" value="${slider.label}"
             data-slider-id="${slider.id}" data-field="label">
      <input type="color" class="color-picker" value="${slider.color}"
             data-slider-id="${slider.id}" data-field="color">
      <span class="slider-value">${slider.value.toFixed(2)}</span>
      <div class="activity-indicator" data-slider-id="${slider.id}"></div>
      <label class="mobile-toggle">
        <input type="checkbox" ${slider.visibleOnMobile ? 'checked' : ''}
               data-slider-id="${slider.id}" data-field="visibleOnMobile">
        Mobile
      </label>
    </div>

    <div class="slider-controls">
      <div class="slider-track" data-slider-id="${slider.id}">
        <div class="slider-fill" style="width: ${slider.value * 100}%; background: ${slider.color};"></div>
        <div class="slider-thumb" style="left: ${slider.value * 100}%"></div>
      </div>
    </div>

    <div class="slider-config">
      <div class="config-group">
        <label>OSC Address</label>
        <input type="text" class="config-input" value="${slider.oscAddress}"
               data-slider-id="${slider.id}" data-field="oscAddress">
      </div>
      <div class="config-row">
        <div class="config-group">
          <label>Target IP</label>
          <input type="text" class="config-input" value="${slider.oscTargetIP}"
                 data-slider-id="${slider.id}" data-field="oscTargetIP">
        </div>
        <div class="config-group">
          <label>Port</label>
          <input type="number" class="config-input" value="${slider.oscTargetPort}"
                 data-slider-id="${slider.id}" data-field="oscTargetPort">
        </div>
      </div>
    </div>
  `;

  // Add event listeners
  attachSliderEventListeners(row, slider);

  return row;
}

// Attach event listeners to slider elements
function attachSliderEventListeners(row, slider) {
  // Slider track interaction
  const track = row.querySelector('.slider-track');

  track.addEventListener('mousedown', (e) => {
    isDragging = true;
    currentDragSlider = slider;
    updateSliderFromMouse(e, track, slider);
  });

  // Configuration inputs
  const inputs = row.querySelectorAll('input[data-slider-id]');
  inputs.forEach(input => {
    if (input.type === 'checkbox') {
      input.addEventListener('change', (e) => {
        handleConfigChange(parseInt(e.target.dataset.sliderId), e.target.dataset.field, e.target.checked);
      });
    } else if (input.type === 'color') {
      // Color picker: use 'input' for live updates while picking
      input.addEventListener('input', (e) => {
        handleConfigChange(parseInt(e.target.dataset.sliderId), e.target.dataset.field, e.target.value);
      });
    } else {
      input.addEventListener('change', (e) => {
        let value = e.target.value;
        if (e.target.type === 'number') {
          value = parseInt(value);
        }
        handleConfigChange(parseInt(e.target.dataset.sliderId), e.target.dataset.field, value);
      });
    }
  });
}

// Global mouse event listeners for dragging
document.addEventListener('mousemove', (e) => {
  if (isDragging && currentDragSlider) {
    const track = document.querySelector(`.slider-track[data-slider-id="${currentDragSlider.id}"]`);
    if (track) {
      updateSliderFromMouse(e, track, currentDragSlider);
    }
  }
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  currentDragSlider = null;
});

// Update slider value from mouse position
function updateSliderFromMouse(e, track, slider) {
  const rect = track.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const percentage = Math.max(0, Math.min(1, x / rect.width));

  slider.value = percentage;
  updateSliderVisuals(slider);

  // Send to server
  socket.emit('sliderChange', {
    id: slider.id,
    value: percentage
  });
}

// Update slider visual elements
function updateSliderVisuals(slider) {
  const row = document.querySelector(`.slider-row[data-slider-id="${slider.id}"]`);
  if (!row) return;

  const fill = row.querySelector('.slider-fill');
  const thumb = row.querySelector('.slider-thumb');
  const valueDisplay = row.querySelector('.slider-value');

  if (fill) fill.style.width = `${slider.value * 100}%`;
  if (thumb) thumb.style.left = `${slider.value * 100}%`;
  if (valueDisplay) valueDisplay.textContent = slider.value.toFixed(2);
}

// Handle configuration change
function handleConfigChange(sliderId, field, value) {
  const slider = sliders.find(s => s.id === sliderId);
  if (!slider) return;

  slider[field] = value;

  // Update visual if color changed
  if (field === 'color') {
    const row = document.querySelector(`.slider-row[data-slider-id="${sliderId}"]`);
    if (row) {
      row.style.borderLeftColor = value;
      // Update slider fill color
      const fill = row.querySelector('.slider-fill');
      if (fill) {
        fill.style.background = value;
      }
    }
  }

  // Send config update to server
  socket.emit('configUpdate', {
    id: sliderId,
    config: { [field]: value }
  });
}

// Flash slider on change
function flashSlider(sliderId) {
  const row = document.querySelector(`.slider-row[data-slider-id="${sliderId}"]`);
  if (row) {
    row.classList.add('flash');
    setTimeout(() => row.classList.remove('flash'), 200);
  }
}

// Blink activity indicator
function blinkActivity(sliderId) {
  const indicator = document.querySelector(`.activity-indicator[data-slider-id="${sliderId}"]`);
  if (indicator) {
    indicator.classList.add('active');
    setTimeout(() => indicator.classList.remove('active'), 100);
  }
}

// Add entry to log
function addLogEntry(timestamp, message) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <span class="timestamp">[${timestamp}]</span>
    <span class="message">${message}</span>
  `;

  // Remove "Waiting for messages..." if it exists
  const waiting = logContent.querySelector('.log-entry');
  if (waiting && waiting.textContent === 'Waiting for messages...') {
    logContent.innerHTML = '';
  }

  // Add to top
  logContent.insertBefore(entry, logContent.firstChild);

  // Keep only last 50 entries
  while (logContent.children.length > 50) {
    logContent.removeChild(logContent.lastChild);
  }
}

// Initialize on load
init();
