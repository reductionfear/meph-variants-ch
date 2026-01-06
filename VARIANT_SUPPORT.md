# Lichess Variant Support

This extension now supports all major Lichess variants with automatic detection and configuration.

## Supported Variants

### Standard Chess
- Default mode
- No special configuration needed
- Works on both Lichess and Chess.com

### Chess960 (Fischer Random)
- Automatically detected from page
- Configures `UCI_Chess960` option
- Starting position cached from DOM

### Crazyhouse
- **Drop move support**: Pieces from pocket can be dropped on board
- **Pocket tracking**: Automatically parses pocket pieces from DOM
- **FEN format**: Includes pocket notation `[QRBNPqrbnp]`
- **Move execution**: Clicks pocket piece then target square

### Other Variants
All variants automatically switch to Fairy Stockfish with appropriate NNUE model:
- **Atomic**: Captures explode adjacent pieces
- **King of the Hill**: King must reach center squares
- **Three-Check**: First to give 3 checks wins
- **Antichess**: Must capture, king can be captured
- **Horde**: White starts with 36 pieces
- **Racing Kings**: Kings race to 8th rank

## Variant Detection

The extension detects variants using multiple methods:

1. **Variant-link element**: `<a class="variant-link" href="/variant/crazyhouse">`
2. **URL patterns**: `/crazyhouse`, `/atomic`, etc.
3. **DOM classes**: `.variant-crazyhouse`, `.variant-atomic`, etc.
4. **Game metadata**: Game info sections

## Engine Configuration

### Embedded Fairy Stockfish (Popup)
- Automatically loaded when non-standard variant detected
- Variant-specific NNUE models loaded per variant
- `UCI_Variant` option set automatically

### External WebSocket Engine (Optional)
The extension also supports connecting to an external Fairy Stockfish engine via WebSocket:

1. **Connection**: `ws://localhost:8080/ws` (configurable)
2. **Auto-configuration**: Sends `UCI_Variant` and variant-specific options
3. **Reconnection**: Automatically reconnects if connection drops

To use external engine:
```bash
# Start your Fairy Stockfish WebSocket server on port 8080
fairy-stockfish-server --port 8080
```

## Drop Move Format

Crazyhouse drop moves use the format: `PIECE@SQUARE`

Examples:
- `P@e4` - Drop pawn on e4
- `N@f3` - Drop knight on f3
- `Q@d5` - Drop queen on d5

## Testing Variants

### On Lichess

1. **Standard Chess**: Visit any standard game
2. **Chess960**: Create or join Chess960 game
3. **Crazyhouse**: 
   - Create Crazyhouse game
   - Capture pieces to populate pocket
   - Test drop moves with auto-move
4. **Other variants**: Create game with specific variant

### Expected Behavior

For all variants:
- ✅ Variant name displayed in popup
- ✅ Appropriate engine loaded (Fairy Stockfish for non-standard)
- ✅ Position correctly analyzed
- ✅ Best moves suggested
- ✅ Auto-move executes correctly

For Crazyhouse specifically:
- ✅ Pockets parsed from DOM
- ✅ Drop moves recognized in PV
- ✅ Drop moves executed via UI clicks
- ✅ Pocket FEN included in position

## Architecture

### Content Script
- Detects variant from page
- Scrapes position including pockets (Crazyhouse)
- Executes moves including drops
- Connects to background WebSocket (optional)

### Background Script
- Manages WebSocket connection to external engine
- Forwards commands and responses
- Handles reconnection
- Manages per-tab subscriptions

### Popup
- Receives variant from content script
- Switches to Fairy Stockfish automatically
- Loads variant-specific NNUE model
- Analyzes position with correct variant rules
- Displays variant name

## Troubleshooting

### Variant not detected
- Reload the page
- Check console for detection logs
- Verify page is a Lichess game page

### Drop moves not working
- Ensure pockets are visible on page
- Check pocket elements exist in DOM
- Verify pieces available in pocket

### Wrong engine analysis
- Check variant detection in console
- Verify Fairy Stockfish loaded in popup
- Check NNUE model loaded for variant

### External engine not connecting
- Verify WebSocket server running on port 8080
- Check browser console for connection errors
- Ensure server supports Fairy Stockfish UCI protocol

## Implementation Details

### Files Modified
- `src/scripts/content-script.js`: Variant detection, pocket tracking, drop execution
- `src/scripts/background-script.js`: WebSocket engine support
- `src/popup/popup.js`: Already had variant support with Fairy Stockfish

### Key Functions

**Content Script:**
- `detectVariantFromPage()`: Detects variant from DOM
- `updatePocketsFromDOM()`: Parses Crazyhouse pockets
- `getPocketFenPart()`: Generates pocket FEN notation
- `executeDropMove()`: Executes drop via UI clicks
- `configureEngineForVariant()`: Configures external engine

**Background Script:**
- `connectWebSocket()`: Connects to external engine
- `broadcastToTabs()`: Forwards engine messages to tabs

**Popup:**
- `handleVariantChange()`: Switches engine for variant
- `reloadVariantNnue()`: Loads variant NNUE model

## Future Enhancements

Possible improvements:
- [ ] Visual variant indicator badge in content script
- [ ] Pocket piece highlighting in Crazyhouse
- [ ] Variant-specific evaluation display
- [ ] Support for other sites (Chess.com variants)
- [ ] Three-check counter display
- [ ] King of the Hill center square highlighting
