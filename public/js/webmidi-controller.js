/**
 * WebMIDI Controller for Logic Pro
 * Sends MIDI CC messages to Logic Pro via IAC Driver
 */

class WebMIDIController {
  constructor() {
    this.midiAccess = null;
    this.selectedOutput = null;
    this.outputs = [];
    this.isSupported = !!navigator.requestMIDIAccess;
    this.onStateChange = null;
    this.onError = null;
  }

  /**
   * Initialize WebMIDI access
   * @returns {Promise<boolean>} true if successful
   */
  async init() {
    if (!this.isSupported) {
      const error = 'WebMIDI is not supported in this browser. Please use Chrome.';
      this.handleError(error);
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.refreshOutputs();
      
      // Listen for device changes
      this.midiAccess.onstatechange = () => {
        this.refreshOutputs();
        if (this.onStateChange) {
          this.onStateChange(this.outputs);
        }
      };

      console.log('[WebMIDI] Initialized successfully');
      console.log('[WebMIDI] Available outputs:', this.outputs.map(o => o.name));
      return true;
    } catch (err) {
      this.handleError(`MIDI access denied: ${err.message}`);
      return false;
    }
  }

  /**
   * Refresh the list of available MIDI outputs
   */
  refreshOutputs() {
    this.outputs = [];
    if (this.midiAccess) {
      for (const output of this.midiAccess.outputs.values()) {
        this.outputs.push({
          id: output.id,
          name: output.name,
          manufacturer: output.manufacturer,
          port: output
        });
      }
    }
  }

  /**
   * Select a MIDI output by ID
   * @param {string} outputId 
   * @returns {boolean} true if successful
   */
  selectOutput(outputId) {
    const output = this.outputs.find(o => o.id === outputId);
    if (output) {
      this.selectedOutput = output.port;
      console.log('[WebMIDI] Selected output:', output.name);
      return true;
    }
    return false;
  }

  /**
   * Send a MIDI Control Change message
   * @param {number} channel - MIDI channel (1-16)
   * @param {number} cc - CC number (0-127)
   * @param {number} value - Value (0-127)
   */
  sendCC(channel, cc, value) {
    if (!this.selectedOutput) {
      console.warn('[WebMIDI] No output selected');
      return false;
    }

    // MIDI CC message: [status, cc, value]
    // Status byte: 0xB0 + (channel - 1) for Control Change
    const statusByte = 0xB0 + Math.max(0, Math.min(15, channel - 1));
    const ccByte = Math.max(0, Math.min(127, Math.floor(cc)));
    const valueByte = Math.max(0, Math.min(127, Math.floor(value)));

    try {
      this.selectedOutput.send([statusByte, ccByte, valueByte]);
      return true;
    } catch (err) {
      this.handleError(`Failed to send MIDI: ${err.message}`);
      return false;
    }
  }

  /**
   * Send a normalized value (0.0-1.0) as MIDI CC
   * @param {number} channel - MIDI channel (1-16)
   * @param {number} cc - CC number (0-127)
   * @param {number} normalizedValue - Value (0.0-1.0)
   */
  sendNormalizedCC(channel, cc, normalizedValue) {
    const midiValue = Math.round(normalizedValue * 127);
    return this.sendCC(channel, cc, midiValue);
  }

  /**
   * Handle errors
   * @param {string} message 
   */
  handleError(message) {
    console.error('[WebMIDI]', message);
    if (this.onError) {
      this.onError(message);
    }
  }

  /**
   * Get the currently selected output name
   * @returns {string|null}
   */
  getSelectedOutputName() {
    if (!this.selectedOutput) return null;
    const output = this.outputs.find(o => o.port === this.selectedOutput);
    return output ? output.name : null;
  }
}

// Slider configuration and state management
class SliderManager {
  constructor(midiController) {
    this.midi = midiController;
    this.sliders = [];
    this.onChange = null;
  }

  /**
   * Initialize sliders with default configuration
   * @param {number} count - Number of sliders
   */
  initSliders(count = 10) {
    const defaultColors = [
      '#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6',
      '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1'
    ];

    const defaultLabels = [
      'Track 1', 'Track 2', 'Track 3', 'Track 4', 'Track 5',
      'Track 6', 'Track 7', 'Track 8', 'Master', 'Aux'
    ];

    this.sliders = [];
    for (let i = 0; i < count; i++) {
      this.sliders.push({
        id: i + 1,
        label: defaultLabels[i] || `Slider ${i + 1}`,
        color: defaultColors[i] || '#6366f1',
        value: 0,
        midiChannel: 1,
        midiCC: i + 1, // CC 1-10 by default
        visible: i < 8 // Show first 8 by default
      });
    }
  }

  /**
   * Update a slider value and send MIDI
   * @param {number} id - Slider ID (1-based)
   * @param {number} value - Normalized value (0.0-1.0)
   */
  setValue(id, value) {
    const slider = this.sliders.find(s => s.id === id);
    if (!slider) return;

    slider.value = Math.max(0, Math.min(1, value));
    
    // Send MIDI
    this.midi.sendNormalizedCC(slider.midiChannel, slider.midiCC, slider.value);

    // Callback
    if (this.onChange) {
      this.onChange(slider);
    }
  }

  /**
   * Update slider configuration
   * @param {number} id - Slider ID
   * @param {object} config - Configuration updates
   */
  updateConfig(id, config) {
    const slider = this.sliders.find(s => s.id === id);
    if (!slider) return;

    Object.assign(slider, config);
  }

  /**
   * Get visible sliders
   * @returns {Array}
   */
  getVisibleSliders() {
    return this.sliders.filter(s => s.visible);
  }

  /**
   * Export configuration as JSON
   * @returns {string}
   */
  exportConfig() {
    return JSON.stringify(this.sliders, null, 2);
  }

  /**
   * Import configuration from JSON
   * @param {string} json 
   */
  importConfig(json) {
    try {
      const config = JSON.parse(json);
      if (Array.isArray(config)) {
        this.sliders = config;
        return true;
      }
    } catch (e) {
      console.error('Failed to import config:', e);
    }
    return false;
  }

  /**
   * Save configuration to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem('midiSliderConfig', this.exportConfig());
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  /**
   * Load configuration from localStorage
   * @returns {boolean}
   */
  loadFromStorage() {
    try {
      const saved = localStorage.getItem('midiSliderConfig');
      if (saved) {
        return this.importConfig(saved);
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }
    return false;
  }
}

// Export for use in other scripts
window.WebMIDIController = WebMIDIController;
window.SliderManager = SliderManager;
