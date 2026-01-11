// Connect to WebSocket server
const socket = io();

// State
let sliders = [];
let touchSlider = null;

// DOM Elements
const slidersContainer = document.getElementById('slidersContainer');
const statusDot = document.getElementById('statusDot');
const connectionText = document.getElementById('connectionText');
const serverInfo = document.getElementById('serverInfo');

// Initialize
function init() {
  updateServerInfo();
  setupSocketListeners();
  setupTouchListeners();
}

// Update server info display
function updateServerInfo() {
  const host = window.location.hostname;
  const port = window.location.port;
  serverInfo.textContent = `${host}:${port}`;
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
  });

  // Slider update from other clients
  socket.on('sliderUpdate', (data) => {
    const slider = sliders.find(s => s.id === data.id);
    if (slider) {
      slider.value = data.value;
      updateSliderVisuals(slider);
      flashSlider(slider.id);
    }
  });

  // Config update - may change visibility or color
  socket.on('configUpdate', (data) => {
    const slider = sliders.find(s => s.id === data.id);
    if (slider) {
      const wasVisible = slider.visibleOnMobile;
      Object.assign(slider, data.config);

      // If visibility changed, re-render all sliders
      if (wasVisible !== slider.visibleOnMobile) {
        renderSliders();
      } else {
        // For color or other changes, just update visuals
        updateSliderVisuals(slider);
      }
    }
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

// Render visible sliders
function renderSliders() {
  // Filter for visible sliders
  const visibleSliders = sliders.filter(s => s.visibleOnMobile);

  if (visibleSliders.length === 0) {
    slidersContainer.innerHTML = `
      <div class="empty-state">
        <h2>No Controls Available</h2>
        <p>Enable "Mobile" checkbox on the computer dashboard to show controls here.</p>
      </div>
    `;
    return;
  }

  slidersContainer.innerHTML = '';

  visibleSliders.forEach(slider => {
    const elem = createSliderElement(slider);
    slidersContainer.appendChild(elem);
  });
}

// Create slider element
function createSliderElement(slider) {
  const elem = document.createElement('div');
  elem.className = 'mobile-slider';
  elem.style.borderLeftColor = slider.color;
  elem.dataset.sliderId = slider.id;

  elem.innerHTML = `
    <div class="slider-info">
      <div class="slider-label">${slider.label}</div>
    </div>
    <div class="slider-track-mobile" data-slider-id="${slider.id}">
      <div class="slider-fill-mobile" style="background: ${slider.color};"></div>
      <div class="slider-thumb-mobile"></div>
    </div>
  `;

  updateSliderVisuals(slider, elem);

  return elem;
}

// Setup touch event listeners
function setupTouchListeners() {
  // Use event delegation for touch events
  slidersContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
  slidersContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
  slidersContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
  slidersContainer.addEventListener('touchcancel', handleTouchEnd, { passive: false });

  // Also support mouse for testing on desktop
  slidersContainer.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

// Touch event handlers
function handleTouchStart(e) {
  const track = e.target.closest('.slider-track-mobile');
  if (!track) return;

  e.preventDefault();

  const sliderId = parseInt(track.dataset.sliderId);
  const slider = sliders.find(s => s.id === sliderId);
  if (!slider) return;

  touchSlider = slider;

  const touch = e.touches[0];
  updateSliderFromTouch(touch, track, slider);
}

function handleTouchMove(e) {
  if (!touchSlider) return;

  e.preventDefault();

  const track = document.querySelector(`.slider-track-mobile[data-slider-id="${touchSlider.id}"]`);
  if (!track) return;

  const touch = e.touches[0];
  updateSliderFromTouch(touch, track, touchSlider);
}

function handleTouchEnd(e) {
  touchSlider = null;
}

// Mouse event handlers (for desktop testing)
function handleMouseDown(e) {
  const track = e.target.closest('.slider-track-mobile');
  if (!track) return;

  e.preventDefault();

  const sliderId = parseInt(track.dataset.sliderId);
  const slider = sliders.find(s => s.id === sliderId);
  if (!slider) return;

  touchSlider = slider;
  updateSliderFromMouse(e, track, slider);
}

function handleMouseMove(e) {
  if (!touchSlider) return;

  const track = document.querySelector(`.slider-track-mobile[data-slider-id="${touchSlider.id}"]`);
  if (!track) return;

  updateSliderFromMouse(e, track, touchSlider);
}

function handleMouseUp(e) {
  touchSlider = null;
}

// Update slider from touch position
function updateSliderFromTouch(touch, track, slider) {
  const rect = track.getBoundingClientRect();
  const isLandscape = window.innerWidth > window.innerHeight;

  let percentage;

  if (isLandscape) {
    // Vertical slider in landscape mode
    const y = touch.clientY - rect.top;
    percentage = 1 - Math.max(0, Math.min(1, y / rect.height)); // Inverted for bottom-to-top
  } else {
    // Horizontal slider in portrait mode
    const x = touch.clientX - rect.left;
    percentage = Math.max(0, Math.min(1, x / rect.width));
  }

  updateSliderValue(slider, percentage);
}

// Update slider from mouse position
function updateSliderFromMouse(e, track, slider) {
  const rect = track.getBoundingClientRect();
  const isLandscape = window.innerWidth > window.innerHeight;

  let percentage;

  if (isLandscape) {
    // Vertical slider in landscape mode
    const y = e.clientY - rect.top;
    percentage = 1 - Math.max(0, Math.min(1, y / rect.height)); // Inverted for bottom-to-top
  } else {
    // Horizontal slider in portrait mode
    const x = e.clientX - rect.left;
    percentage = Math.max(0, Math.min(1, x / rect.width));
  }

  updateSliderValue(slider, percentage);
}

// Update slider value and send to server
function updateSliderValue(slider, value) {
  slider.value = value;
  updateSliderVisuals(slider);

  // Send to server
  socket.emit('sliderChange', {
    id: slider.id,
    value: value
  });

  // Haptic feedback if supported
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
}

// Update slider visual elements
function updateSliderVisuals(slider, elem) {
  if (!elem) {
    elem = document.querySelector(`.mobile-slider[data-slider-id="${slider.id}"]`);
  }
  if (!elem) return;

  const fill = elem.querySelector('.slider-fill-mobile');
  const thumb = elem.querySelector('.slider-thumb-mobile');

  const isLandscape = window.innerWidth > window.innerHeight;

  // Update fill color to match slider color
  if (fill) {
    fill.style.background = slider.color;
  }

  // Update border color
  elem.style.borderLeftColor = slider.color;

  if (isLandscape) {
    // Vertical slider - height and bottom position
    if (fill) {
      fill.style.height = `${slider.value * 100}%`;
      fill.style.width = '100%';
    }
    if (thumb) {
      thumb.style.bottom = `${slider.value * 100}%`;
      thumb.style.left = '50%';
      thumb.style.top = 'auto';
    }
  } else {
    // Horizontal slider - width and left position
    if (fill) {
      fill.style.width = `${slider.value * 100}%`;
      fill.style.height = '100%';
    }
    if (thumb) {
      thumb.style.left = `${slider.value * 100}%`;
      thumb.style.bottom = 'auto';
      thumb.style.top = '50%';
    }
  }
}

// Flash slider on change
function flashSlider(sliderId) {
  const elem = document.querySelector(`.mobile-slider[data-slider-id="${sliderId}"]`);
  if (elem) {
    elem.classList.add('flash');
    setTimeout(() => elem.classList.remove('flash'), 200);
  }
}

// Re-render on orientation change
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    renderSliders();
  }, 100);
});

// Also handle resize for desktop
window.addEventListener('resize', () => {
  sliders.forEach(slider => {
    if (slider.visibleOnMobile) {
      updateSliderVisuals(slider);
    }
  });
});

// Initialize on load
init();
