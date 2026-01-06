# Testing Lichess Variant Support

This document provides step-by-step instructions to test each supported variant.

## Prerequisites

1. Chrome/Firefox with extension loaded in developer mode
2. Active Lichess.org account
3. Open browser console (F12) to see debug logs

## Test 1: Standard Chess (Baseline)

**Goal**: Verify no regression in standard chess functionality

**Steps**:
1. Visit https://lichess.org/
2. Start a standard game (Play → Create a game → Standard)
3. Open extension popup
4. Verify "Standard Chess" shown in game detection
5. Make a move, verify analysis appears
6. Test auto-move (if configured)

**Expected**:
- ✅ Game detected
- ✅ Position analyzed correctly
- ✅ Best move suggested
- ✅ Auto-move works

## Test 2: Chess960 (Fischer Random)

**Goal**: Verify Chess960 position detection and analysis

**Steps**:
1. Visit https://lichess.org/
2. Create Chess960 game (Play → Create a game → Chess960)
3. Open extension popup
4. Verify "Chess960" shown in game detection
5. Note starting position (non-standard)
6. Make moves, verify analysis

**Expected**:
- ✅ Variant detected as "fischerandom"
- ✅ Starting position cached
- ✅ `UCI_Chess960` option set
- ✅ Analysis respects castling rules

**Console logs to check**:
```
[Init] Detected variant: fischerandom
[ExtEngine] Configuring for variant: fischerandom
setoption name UCI_Chess960 value true
```

## Test 3: Crazyhouse (Most Complex)

**Goal**: Verify drop move support and pocket tracking

**Steps**:
1. Visit https://lichess.org/
2. Create Crazyhouse game (Play → Create a game → Crazyhouse)
3. Open extension popup
4. Verify "Crazyhouse" shown in game detection
5. Play until pieces are captured
6. Observe pockets populated with captured pieces
7. Check console for pocket tracking:
   ```
   [Drop] Executing drop: P@e4 (role: pawn, pos: e4)
   ```
8. If auto-move suggests drop (e.g., "P@e4"):
   - Verify pocket piece is clicked
   - Verify target square is clicked
   - Verify piece placed correctly

**Expected**:
- ✅ Variant detected as "crazyhouse"
- ✅ Pockets parsed from DOM
- ✅ Pocket FEN generated: `[QRBNPqrbnp]`
- ✅ Drop moves in PV: `P@e4`, `N@f3`
- ✅ Drop execution via clicks
- ✅ Fairy Stockfish loaded

**Console logs to check**:
```
[Init] Detected variant: crazyhouse
[Drop] Executing drop: P@e4 (role: pawn, pos: e4)
[Pocket] White: {pawn: 2, knight: 1, ...}
```

## Test 4: Atomic

**Goal**: Verify Atomic variant detection and engine

**Steps**:
1. Create Atomic game on Lichess
2. Open extension popup
3. Verify "Atomic" shown
4. Make captures, observe explosions
5. Check analysis respects Atomic rules

**Expected**:
- ✅ Variant detected as "atomic"
- ✅ Fairy Stockfish loaded
- ✅ atomic NNUE model loaded
- ✅ Analysis accounts for explosions

## Test 5: King of the Hill

**Goal**: Verify KOTH variant

**Steps**:
1. Create King of the Hill game
2. Open popup, verify "King of the Hill"
3. Move king toward center
4. Verify analysis prioritizes center squares

**Expected**:
- ✅ Variant detected as "kingofthehill"
- ✅ Fairy Stockfish with KOTH NNUE
- ✅ Analysis values center control

## Test 6: Three-Check

**Goal**: Verify Three-Check variant

**Steps**:
1. Create Three-Check game
2. Verify "Three-Check" shown
3. Give checks, observe counter
4. Verify analysis suggests checking moves

**Expected**:
- ✅ Variant detected as "3check"
- ✅ Check counter tracked
- ✅ Analysis prioritizes checks

## Test 7: Antichess

**Goal**: Verify Antichess (losing chess)

**Steps**:
1. Create Antichess game
2. Verify "Antichess" shown
3. Observe forced captures
4. Verify analysis suggests losing pieces

**Expected**:
- ✅ Variant detected as "antichess"
- ✅ Analysis inverts evaluation
- ✅ Suggests piece losses

## Test 8: Horde

**Goal**: Verify Horde starting position

**Steps**:
1. Create Horde game
2. Verify "Horde" shown
3. Note White's 36 pieces
4. Verify correct analysis

**Expected**:
- ✅ Variant detected as "horde"
- ✅ Starting position recognized
- ✅ Horde NNUE loaded

## Test 9: Racing Kings

**Goal**: Verify Racing Kings

**Steps**:
1. Create Racing Kings game
2. Verify "Racing Kings" shown
3. Note unique starting position
4. Verify no-check rule enforced

**Expected**:
- ✅ Variant detected as "racingkings"
- ✅ Starting position correct
- ✅ Analysis respects no-check

## Test 10: External WebSocket Engine (Optional)

**Goal**: Test external Fairy Stockfish connection

**Prerequisites**: Fairy Stockfish WebSocket server running

**Steps**:
1. Start WebSocket server:
   ```bash
   # Example command (adjust for your setup)
   fairy-stockfish-server --port 8080
   ```
2. Load extension
3. Visit any Lichess variant game
4. Check background script console:
   ```
   [BG] ✅ WebSocket connected to Fairy Stockfish
   [BG] Sending: setoption name UCI_Variant value crazyhouse
   ```
5. Verify engine responses received

**Expected**:
- ✅ WebSocket connects to localhost:8080
- ✅ UCI commands sent
- ✅ Engine responses received
- ✅ Auto-reconnects on disconnect

## Debugging

### Enable Verbose Logging

Check these console messages:

**Content Script** (Page console):
```javascript
[Init] Detected variant: crazyhouse
[Drop] Executing drop: P@e4
[ExtEngine] Configuring for variant: crazyhouse
```

**Background Script** (Extension service worker console):
```javascript
[BG] ✅ WebSocket connected
[BG] Sending: setoption name UCI_Variant value crazyhouse
[BG] Engine: info depth 12 score cp 45 pv P@e4
```

**Popup** (Popup console):
```javascript
Variant changed to: crazyhouse
Loaded NNUE for crazyhouse: crazyhouse-8ebf84784ad2.nnue
```

### Common Issues

**Variant not detected**:
- Check page URL contains variant name
- Look for `.variant-link` element
- Reload page

**Drop moves fail**:
- Verify pockets visible
- Check `.pocket-top` and `.pocket-bottom` elements exist
- Ensure pieces in pocket (capture something first)

**Engine not loaded**:
- Check popup console for errors
- Verify Fairy Stockfish files present
- Check NNUE model exists

**WebSocket not connecting**:
- Verify server running: `netstat -an | grep 8080`
- Check CORS settings
- Review background script console

## Automated Testing

Currently no automated tests. Future work:
- Unit tests for variant detection
- Integration tests for each variant
- Mock Lichess DOM for testing
- WebSocket mock for engine tests

## Reporting Issues

When reporting variant issues, include:
1. Variant name
2. Browser console logs
3. Extension popup state
4. Game URL
5. Steps to reproduce
