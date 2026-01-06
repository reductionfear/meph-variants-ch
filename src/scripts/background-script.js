// Background service worker - Enhanced for Fairy Stockfish variants via WebSocket

let ws = null;
// WebSocket URL for external Fairy Stockfish engine
// This can be changed via ws-set-url message or configured in extension options
// For security, only localhost connections are typically allowed
let wsUrl = 'ws://localhost:8080/ws';
let isConnected = false;
let reconnectTimer = null;
let subscribedTabs = new Set();
let currentVariant = 'chess';

function connectWebSocket() {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    console.log('[BG] Already connected or connecting');
    return;
  }

  console.log('[BG] Connecting to', wsUrl);

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[BG] ✅ WebSocket connected to Fairy Stockfish');
      isConnected = true;
      broadcastToTabs({ type: 'ws-status', connected: true });
      
      // Initialize engine
      ws.send('uci');
    };

    ws.onmessage = (event) => {
      const data = event.data;
      
      // Log important messages (skip noisy depth updates)
      if (!data.startsWith('info depth') || data.includes('pv')) {
        console.log('[BG] Engine:', data.substring(0, 100));
      }
      
      broadcastToTabs({ type: 'ws-message', data: data });
    };

    ws.onerror = (err) => {
      console.error('[BG] ❌ WebSocket error');
      isConnected = false;
      broadcastToTabs({ type: 'ws-status', connected: false });
    };

    ws.onclose = () => {
      console.log('[BG] WebSocket disconnected');
      isConnected = false;
      ws = null;
      broadcastToTabs({ type: 'ws-status', connected: false });
      
      // Auto-reconnect if there are still subscribers
      if (subscribedTabs.size > 0) {
        console.log('[BG] Reconnecting in 3s...');
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectWebSocket, 3000);
      }
    };
  } catch (err) {
    console.error('[BG] Failed to connect:', err);
    isConnected = false;
  }
}

function broadcastToTabs(message) {
  const failedTabs = [];
  subscribedTabs.forEach(tabId => {
    chrome.tabs.sendMessage(tabId, message).catch((error) => {
      console.warn(`[BG] Failed to send message to tab ${tabId}:`, error.message);
      failedTabs.push(tabId);
    });
  });
  // Remove failed tabs after iteration completes
  failedTabs.forEach(tabId => subscribedTabs.delete(tabId));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  // Legacy message support
  if ((message.from === 'content') && (message.subject === 'showPageAction')) {
    if (tabId) chrome.pageAction.show(tabId);
    sendResponse({ success: true });
    return true;
  }

  switch (message.type) {
    case 'ws-subscribe':
      if (tabId) {
        subscribedTabs.add(tabId);
        console.log('[BG] Tab subscribed:', tabId);
      }
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        connectWebSocket();
      }
      sendResponse({ connected: isConnected });
      break;

    case 'ws-unsubscribe':
      if (tabId) subscribedTabs.delete(tabId);
      if (subscribedTabs.size === 0 && ws) {
        ws.close();
        ws = null;
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      }
      sendResponse({ success: true });
      break;

    case 'ws-send':
      if (ws && ws.readyState === WebSocket.OPEN) {
        const cmd = message.data;
        
        // Log variant-related commands
        if (cmd.includes('UCI_Variant') || cmd.includes('position') || cmd.includes('uci')) {
          console.log('[BG] Sending:', cmd.substring(0, 80));
        }
        
        ws.send(cmd);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'WebSocket not connected' });
      }
      break;

    case 'ws-set-url':
      wsUrl = message.url;
      console.log('[BG] URL updated to:', wsUrl);
      if (ws) ws.close();
      setTimeout(connectWebSocket, 500);
      sendResponse({ success: true });
      break;

    case 'ws-set-variant':
      currentVariant = message.variant;
      console.log('[BG] Variant set to:', currentVariant);
      sendResponse({ success: true });
      break;

    case 'ws-connect':
      connectWebSocket();
      sendResponse({ connecting: true });
      break;

    case 'ws-disconnect':
      if (ws) {
        ws.close();
        ws = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      sendResponse({ success: true });
      break;

    case 'ws-status':
      sendResponse({ connected: isConnected, url: wsUrl, variant: currentVariant });
      break;
  }

  return true; // Keep message channel open for async response
});

chrome.tabs.onRemoved.addListener((tabId) => {
  subscribedTabs.delete(tabId);
  if (subscribedTabs.size === 0 && ws) {
    console.log('[BG] No more subscribers, closing WebSocket');
    ws.close();
    ws = null;
  }
});


