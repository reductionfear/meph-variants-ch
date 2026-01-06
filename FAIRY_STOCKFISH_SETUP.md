# Fairy Stockfish WebSocket Engine Setup Guide

This guide explains how to use the external Fairy Stockfish engine with WebSocket-based move execution for Lichess variants.

## Overview

The implementation consists of four main components:

1. **fairy-stockfish-server.py** - Python WebSocket server that wraps fairy-stockfish.exe
2. **background-script.js** - Extension service worker that connects to the WebSocket server
3. **content-script.js** - Detects variants, parses moves, and executes them
4. **hook.js** - Intercepts Lichess WebSocket to send moves directly

## Architecture

```
Fairy Stockfish Engine
        ↓
Python WebSocket Server (localhost:8080)
        ↓
background-script.js (WebSocket client)
        ↓
content-script.js (variant detection & move parsing)
        ↓
hook.js (WebSocket interception)
        ↓
Lichess Game UI
```

## Prerequisites

1. **Python 3.7+** with `websockets` library:
   ```bash
   pip install websockets
   ```

2. **Fairy Stockfish executable** - Download from:
   https://github.com/fairy-stockfish/Fairy-Stockfish/releases

## Setup Instructions

### Step 1: Download Fairy Stockfish

1. Go to https://github.com/fairy-stockfish/Fairy-Stockfish/releases
2. Download the appropriate version for your OS (e.g., `fairy-stockfish-windows-x64.exe`)
3. Save it to a convenient location (e.g., `C:\engines\fairy-stockfish.exe`)

### Step 2: Start the WebSocket Server

Open a terminal/command prompt and run:

```bash
# If fairy-stockfish.exe is in the current directory:
python fairy-stockfish-server.py

# Or specify the full path:
python fairy-stockfish-server.py "C:\engines\fairy-stockfish.exe"
```

You should see:
```
============================================================
  Fairy Stockfish WebSocket Server for Lichess Variants
============================================================
[Server] Starting Fairy Stockfish: fairy-stockfish.exe
[Server] Engine process started!
[Server] WebSocket server starting on ws://localhost:8080
[Server] ✅ Ready! Connect your extension to ws://localhost:8080
[Server] Supported variants: chess, crazyhouse, atomic, kingofthehill, 3check, antichess, horde, racingkings
```

### Step 3: Load the Extension

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the extension directory

### Step 4: Open a Lichess Variant Game

Go to any Lichess variant game, for example:
- Crazyhouse: https://lichess.org/variant/crazyhouse
- Atomic: https://lichess.org/variant/atomic
- King of the Hill: https://lichess.org/variant/kingOfTheHill

### Step 5: Verify Connection

Open the browser console (F12) and look for these messages:

```
[Hook] Injecting WebSocket Proxy with Variant Support...
[Hook] WebSocket captured!
[Hook] Ready for moves and drops!
[ExtEngine] Subscribing to background WebSocket...
[ExtEngine] Connected to external engine
[Init] Detected variant: crazyhouse
[ExtEngine] Configuring for variant: crazyhouse
```

## How It Works

### 1. Variant Detection

The content script automatically detects the variant using multiple methods:
- `.variant-link` element href parsing
- URL pattern matching (`/crazyhouse`, `/atomic`, etc.)
- CSS class detection on `.round__app`

### 2. Engine Configuration

Once detected, the extension sends UCI commands to Fairy Stockfish:
```
setoption name UCI_Variant value crazyhouse
setoption name Threads value 1
setoption name Hash value 128
setoption name MultiPV value 4
isready
```

### 3. Move Parsing

The `parseInfoLine()` function parses engine output:
- Regular moves: `e2e4`, `e7e8q` (with promotion)
- Drop moves: `P@e4`, `N@f3` (Crazyhouse)

### 4. Move Execution

The `executeMove()` function sends moves via the hook:

**For regular moves:**
```javascript
window.postMessage({
  type: 'LH_S_OUT',
  payload: { 
    t: "move", 
    d: { u: "e2e4", a: currentAck, b: 0, l: 10000 } 
  }
}, '*');
```

**For drop moves:**
```javascript
window.postMessage({
  type: 'LH_S_OUT',
  payload: { 
    t: "drop", 
    d: { role: "pawn", pos: "e4", a: currentAck } 
  }
}, '*');
```

### 5. WebSocket Interception

The `hook.js` script intercepts the Lichess WebSocket and:
- Captures incoming messages (moves, drops, ack updates)
- Sends outgoing moves from the extension
- Updates `currentAck` to ensure moves are accepted

## Supported Variants

| Variant | UCI Name | Features |
|---------|----------|----------|
| Standard Chess | `chess` | Default rules |
| Chess960 | `fischerandom` | Random starting position |
| Crazyhouse | `crazyhouse` | Drop captured pieces |
| Atomic | `atomic` | Pieces explode on capture |
| King of the Hill | `kingofthehill` | Control center squares |
| Three-Check | `3check` | Check opponent 3 times |
| Antichess | `antichess` | Lose all pieces to win |
| Horde | `horde` | 36 vs 16 pieces |
| Racing Kings | `racingkings` | Race to 8th rank |

## Crazyhouse-Specific Features

### Pocket Tracking

The extension tracks pocket pieces from the DOM:
```javascript
updatePocketsFromDOM() {
  // Parse top and bottom pockets
  // Determine orientation
  // Extract piece counts
}
```

### Pocket FEN Generation

Generates Crazyhouse FEN with pocket notation:
```
rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR[Pp] b KQkq - 0 1
                                              ^^^^
                                           Pockets
```

### Drop Move Execution

Parses drops like `P@e5` and sends to Lichess:
```javascript
{
  t: "drop",
  d: {
    role: "pawn",
    pos: "e5",
    a: 4  // Current ack number
  }
}
```

## Troubleshooting

### Server Won't Start

**Error:** `websockets library not found`
- **Solution:** Install with `pip install websockets`

**Error:** `Fairy Stockfish not found`
- **Solution:** Check the path to fairy-stockfish.exe
- Verify the file exists and is executable

### Extension Can't Connect

**Error:** Connection failed in console
- **Solution:** Ensure the server is running on `localhost:8080`
- Check host_permissions in manifest.json includes `http://localhost:8080/*`

### Moves Not Executing

**Error:** Moves not appearing on board
- **Solution:** Check that `hook.js` is injected (look for `[Hook]` messages)
- Verify `currentAck` is being updated from Lichess messages
- Ensure you're playing as the correct color

### Variant Not Detected

**Error:** Variant detected as `chess` instead of `crazyhouse`
- **Solution:** Hard refresh the page (Ctrl+Shift+R)
- Check that you're on a variant game page
- Look for `.variant-link` element in the DOM

## Console Debugging

Enable verbose logging to see the complete flow:

```javascript
// In content-script.js
console.log('[Init] Detected variant:', detectedVariant);
console.log('[Engine] Position FEN:', variantFen);
console.log('[Engine] Best move:', firstMove);
console.log('[Exec] Sending MOVE/DROP:', uci);
console.log('[Ack] Updated to:', currentAck);
```

## Performance Tips

1. **Engine Strength:** Adjust thinking time in the server
2. **Multi-PV:** Increase for more move suggestions
3. **Hash Size:** Increase for better position caching
4. **Threads:** Use 1 thread for responsiveness

## Security Notes

- WebSocket server only listens on `localhost` (127.0.0.1)
- No external connections accepted
- Extension uses `host_permissions` for localhost only
- All moves validated before execution

## Advanced Configuration

### Custom Server URL

To use a different port or host:

```javascript
// In content-script.js or via extension options
const externalEngineUrl = "ws://localhost:9090";
```

### Engine Options

Customize in `configureEngineForVariant()`:

```javascript
sendToEngine('setoption name Threads value 2');
sendToEngine('setoption name Hash value 256');
sendToEngine('setoption name MultiPV value 5');
```

## References

- Fairy Stockfish: https://github.com/fairy-stockfish/Fairy-Stockfish
- Lichess API: https://lichess.org/api
- UCI Protocol: http://wbec-ridderkerk.nl/html/UCIProtocol.html
- WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

## Support

For issues or questions:
1. Check the console for error messages
2. Verify all components are running
3. Review the troubleshooting section
4. Open an issue on GitHub with logs

---

*Last updated: January 6, 2026*
