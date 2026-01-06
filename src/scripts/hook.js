// hook.js - WebSocket Bridge with Drop Support for Lichess Variants
// This script is injected into the main page world to intercept WebSocket
console.log('[Hook] Injecting WebSocket Proxy with Variant Support...');

const NativeWebSocket = window.WebSocket;
const capturedSockets = new Set();

const webSocketProxy = new Proxy(NativeWebSocket, {
  construct: function(target, args) {
    const ws = new target(...args);
    capturedSockets.add(ws);
    
    console.log('[Hook] WebSocket captured!');

    // Listen for INCOMING messages from Lichess
    ws.addEventListener('message', (event) => {
      try {
        const dataStr = event.data;
        
        // Forward to content-script.js
        window.postMessage({ type: 'LH_S_IN', payload: dataStr }, '*');
        
        // Log moves and drops
        const msg = JSON.parse(dataStr);
        if (msg.t === 'move') {
          console.log('[Hook] ← MOVE received:', msg.d?.uci);
        } else if (msg.t === 'drop') {
          console.log('[Hook] ← DROP received:', msg.d?.role, '@', msg.d?.uci);
        }
        
      } catch (e) {}
    });

    ws.addEventListener('close', () => {
      capturedSockets.delete(ws);
      console.log('[Hook] WebSocket closed');
    });

    return ws;
  }
});

window.WebSocket = webSocketProxy;

// Listen for OUTGOING commands from content-script.js
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.type === 'LH_S_OUT') {
    const payload = event.data.payload;
    const msgString = JSON.stringify(payload);
    
    capturedSockets.forEach(ws => {
      if (ws.readyState === 1) { // OPEN
        if (payload.t === 'drop') {
          console.log('[Hook] → Sending DROP:', payload.d.role, '@', payload.d.pos);
        } else if (payload.t === 'move') {
          console.log('[Hook] → Sending MOVE:', payload.d.u);
        }
        ws.send(msgString);
      }
    });
  }
});

console.log('[Hook] Ready for moves and drops!');
