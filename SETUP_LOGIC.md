# Logic Pro 11 Setup Guide

This guide will help you set up the MIDI Controller to work with Logic Pro 11.

## Prerequisites

- macOS with Logic Pro 11 (or 10.7+)
- Chrome browser (for WebMIDI support)
- Phone on the same WiFi network

## Step 1: Enable IAC Driver

The IAC (Inter-Application Communication) Driver is built into macOS and allows apps to send MIDI to each other.

1. Open **Applications → Utilities → Audio MIDI Setup**
2. Go to **Window → Show MIDI Studio** (or press ⌘2)
3. Find and double-click **IAC Driver**
4. Check the box **"Device is online"**
5. Click **Apply**

> 💡 **Tip:** If you don't see IAC Driver, it may be hidden. Try looking for a red "X" icon or enable "Show MIDI Studio" from the Window menu.

## Step 2: Configure Logic Pro

Logic Pro needs to know to listen for MIDI from the IAC Driver.

1. Open **Logic Pro**
2. Go to **Logic Pro → Settings → MIDI** (or **Preferences → MIDI** in older versions)
3. Click the **Inputs** tab
4. Make sure **IAC Driver** is checked ✓

## Step 3: Start the Controller

### Option A: Double-click start.command (Recommended)

1. In Finder, navigate to the MIDI Controller folder
2. Double-click **start.command**
3. A Terminal window will open showing the server URLs
4. If prompted, allow the app to run

### Option B: Use Terminal

```bash
cd /path/to/midi-controller
cd public
python3 -m http.server 8000
```

## Step 4: Open the Controller

1. Open **Chrome** (Safari may have limited WebMIDI support)
2. Go to **http://localhost:8000**
3. When prompted, allow MIDI access
4. Select **"IAC Driver Bus 1"** from the MIDI Output dropdown

## Step 5: Connect from Your Phone

1. On your phone, open Chrome or Safari
2. Enter the URL shown in the Terminal (e.g., `http://192.168.1.50:8000/mobile.html`)
3. Enter the 4-letter code displayed on the Mac
4. Tap **Connect**

## Step 6: Set Up MIDI Learn in Logic

Now you can map the sliders to any control in Logic Pro:

1. **Right-click** any knob, fader, or button in Logic Pro
2. Select **"Learn New Assignment..."** from the context menu
3. Move a slider in the MIDI Controller
4. The control is now mapped!

### Common Things to Control

- **Track Volume Faders** (in the mixer)
- **Track Pan Knobs**
- **Send Levels**
- **Plugin Parameters** (open a plugin, right-click any knob)
- **Master Volume**
- **Smart Controls**

## Troubleshooting

### "No MIDI outputs available"

- Make sure you're using **Chrome** (not Safari)
- Refresh the page and try again
- Check that IAC Driver is enabled in Audio MIDI Setup

### Phone can't connect

- Ensure both devices are on the **same WiFi network**
- Try typing the IP address manually
- Check if a firewall is blocking port 8000

### Sliders not controlling Logic

1. Check that you selected **IAC Driver** in the controller
2. Make sure you completed MIDI Learn in Logic
3. Look at the MIDI Activity indicator in Logic (top right of the transport)

### Connection drops frequently

- The phone screen must stay on while controlling
- Try moving closer to the WiFi router
- Disable battery saver mode on your phone

## MIDI CC Reference

### Transport Controls (MIDI Learn Required)

The transport buttons send CC messages that you'll map in Logic using **MIDI Learn**:

| Button | MIDI CC | Logic Function to Map |
|--------|---------|----------------------|
| Record | CC 116 | Record |
| Play | CC 117 | Play |
| Stop | CC 118 | Stop |
| Return to Start | CC 119 | Go to Beginning |
| Undo | CC 120 | Undo |
| Loop | CC 121 | Cycle |
| Click | CC 122 | Metronome |
| Drop Marker | CC 123 | Create Marker |
| Previous Marker | CC 124 | Go to Previous Marker |
| Next Marker | CC 125 | Go to Next Marker |
| Save | CC 126 | Save Project |

### Quick Transport Setup (60 seconds!)

1. Open **Logic Pro → Key Commands → Edit** (Option + K)
2. Search for each command (e.g., "Record")
3. Click **Learn New Assignment**
4. Press the corresponding button in the MIDI Controller
5. Repeat for Play, Stop, Return to Beginning, and Undo

That's it! The 5 essential transport controls are mapped.

### Fader Controls

| Slider | MIDI CC |
|--------|---------|
| Track 1 | CC 1 |
| Track 2 | CC 2 |
| Track 3 | CC 3 |
| Track 4 | CC 4 |
| Track 5 | CC 5 |
| Track 6 | CC 6 |
| Track 7 | CC 7 |
| Track 8 | CC 8 |
| Master | CC 9 |
| Aux | CC 10 |

You can customize these by double-clicking a slider in the Mac controller.

## Recording Session Tips

For **solo recording sessions** in the recording room:

1. **Keep phone screen on** - Enable "Always On Display" or adjust auto-lock
2. **Use huge buttons** - Turn phone to landscape for larger transport controls
3. **Test before recording** - Make a test recording to verify all controls work
4. **Save frequently** - Use the Save button between takes

---

**Questions?** Check the main README.md for more information.

