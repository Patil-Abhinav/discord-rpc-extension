let gatewayWs = null;
let heartbeatTimer = null;
let currentActivity = null;
let userToken = null;
let isConnected = false;
let preventIdleMode = true;
let baseStartTime = null;
let hourOffset = 0;

const APP_ID = "1532126670150963251";
const KNOWN_ASSETS = {
  'lunatichost': '1544811725315113001',
  'promptblox': '1544811727294570526'
};

// Periodic keepalive alarm: reconnects if dropped & enforces active "online" status
chrome.alarms.create('rpc_keepalive', { periodInMinutes: 0.25 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'rpc_keepalive') {
    if (isConnected) {
      if (!gatewayWs || gatewayWs.readyState !== WebSocket.OPEN) {
        console.log('[Background] Reconnecting WebSocket...');
        connectGateway();
      } else if (preventIdleMode) {
        sendPresenceUpdate();
      }
    }
  }
});

if (chrome.idle) {
  chrome.idle.setDetectionInterval(60);
  chrome.idle.onStateChanged.addListener((newState) => {
    if (isConnected && preventIdleMode && gatewayWs && gatewayWs.readyState === WebSocket.OPEN) {
      sendPresenceUpdate();
    }
  });
}

function calculateEffectiveStartTime() {
  if (!baseStartTime) baseStartTime = Date.now();
  // Subtract hour offset so the elapsed timer on Discord shows +X hours ahead
  return baseStartTime - (hourOffset * 3600000);
}

function sendPresenceUpdate() {
  if (!gatewayWs || gatewayWs.readyState !== WebSocket.OPEN || !currentActivity) return;
  const updatePayload = {
    op: 3,
    d: {
      since: null,
      activities: [currentActivity],
      status: "online",
      afk: false
    }
  };
  try {
    gatewayWs.send(JSON.stringify(updatePayload));
  } catch (e) {
    console.error('[Background] Failed to send presence update:', e);
  }
}

function connectGateway() {
  if (!userToken || !currentActivity) return;

  if (gatewayWs) {
    clearInterval(heartbeatTimer);
    try { gatewayWs.close(); } catch(e) {}
  }

  gatewayWs = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');

  gatewayWs.onopen = () => {
    console.log('[Background] Connected to Discord Gateway');
  };

  gatewayWs.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);

      if (msg.op === 10) {
        const interval = msg.d.heartbeat_interval;
        clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(() => {
          if (gatewayWs && gatewayWs.readyState === WebSocket.OPEN) {
            gatewayWs.send(JSON.stringify({ op: 1, d: null }));
            if (preventIdleMode) {
              sendPresenceUpdate();
            }
          }
        }, interval);

        const identifyPayload = {
          op: 2,
          d: {
            token: userToken,
            capabilities: 8189,
            properties: {
              os: "Windows",
              browser: "Chrome",
              device: ""
            },
            presence: {
              status: "online",
              since: null,
              afk: false,
              activities: [currentActivity]
            }
          }
        };
        gatewayWs.send(JSON.stringify(identifyPayload));
      }

      if (msg.op === 0 && (msg.t === 'READY' || msg.t === 'SESSIONS_REPLACE')) {
        isConnected = true;
        chrome.storage.local.set({ isConnected: true, statusMsg: 'Active on Discord' });
      }

      if (msg.op === 9) {
        isConnected = false;
        chrome.storage.local.set({ isConnected: false, statusMsg: 'Authentication failed. Check token.' });
      }
    } catch (err) {
      console.error('[Background] Error processing gateway message:', err);
    }
  };

  gatewayWs.onerror = (err) => {
    console.error('[Background] Gateway error:', err);
    isConnected = false;
    chrome.storage.local.set({ isConnected: false, statusMsg: 'Connection error. Retrying...' });
  };

  gatewayWs.onclose = () => {
    clearInterval(heartbeatTimer);
    if (isConnected) {
      setTimeout(() => {
        if (isConnected) connectGateway();
      }, 3000);
    }
  };
}

function disconnectGateway() {
  isConnected = false;
  clearInterval(heartbeatTimer);
  if (gatewayWs) {
    try { gatewayWs.close(); } catch(e) {}
    gatewayWs = null;
  }
  chrome.storage.local.set({
    isConnected: false,
    statusMsg: 'Disconnected. Status cleared.',
    persistent_start_time: null
  });
}

function buildActivity(data, effectiveStartTime) {
  const resolvedLarge = KNOWN_ASSETS[(data.largeImage || 'lunatichost').toLowerCase()] || data.largeImage || '1544811725315113001';
  const resolvedSmall = KNOWN_ASSETS[(data.smallImage || 'promptblox').toLowerCase()] || data.smallImage || '1544811727294570526';

  const activity = {
    name: "LunaticHost",
    type: 0,
    application_id: APP_ID,
    details: data.details || "LunaticHost",
    state: data.state || "Promptblox",
    timestamps: {
      start: effectiveStartTime
    },
    assets: {
      large_image: resolvedLarge,
      large_text: data.details || "LunaticHost"
    },
    buttons: [
      data.btn1Text || "LunaticHost",
      data.btn2Text || "Promptblox.ai"
    ],
    metadata: {
      button_urls: [
        data.btn1Url || "https://lunatichost.com",
        data.btn2Url || "https://promptblox.ai"
      ]
    }
  };

  if (data.smallImage) {
    activity.assets.small_image = resolvedSmall;
    activity.assets.small_text = data.state || "Promptblox";
  }

  return activity;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CONNECT') {
    userToken = request.token;
    preventIdleMode = request.preventIdle !== false;
    hourOffset = typeof request.timerHourOffset === 'number' ? request.timerHourOffset : 0;

    chrome.storage.local.get(['persistent_start_time'], (storage) => {
      let storedStart = Date.now();

      if (request.keepTimer && storage.persistent_start_time) {
        storedStart = storage.persistent_start_time;
      } else {
        chrome.storage.local.set({ persistent_start_time: storedStart });
      }

      baseStartTime = storedStart;
      const effectiveStart = calculateEffectiveStartTime();

      currentActivity = buildActivity(request, effectiveStart);
      connectGateway();
      sendResponse({ status: 'connecting' });
    });
    return true;
  } else if (request.action === 'ADJUST_TIMER') {
    hourOffset = request.hourOffset || 0;
    if (currentActivity) {
      const effectiveStart = calculateEffectiveStartTime();
      currentActivity.timestamps = { start: effectiveStart };
      if (isConnected && gatewayWs && gatewayWs.readyState === WebSocket.OPEN) {
        sendPresenceUpdate();
      }
    }
    sendResponse({ status: 'adjusted' });
    return true;
  } else if (request.action === 'DISCONNECT') {
    disconnectGateway();
    sendResponse({ status: 'disconnected' });
    return true;
  } else if (request.action === 'GET_STATUS') {
    sendResponse({ isConnected });
    return true;
  }
});

// Auto-restore presence on Chrome browser startup
chrome.storage.local.get([
  'token', 'details', 'state', 'largeImage', 'smallImage',
  'btn1Text', 'btn1Url', 'btn2Text', 'btn2Url',
  'keepTimer', 'preventIdle', 'timerHourOffset', 'persistent_start_time', 'isConnected'
], (data) => {
  if (data.isConnected && data.token) {
    userToken = data.token;
    preventIdleMode = data.preventIdle !== false;
    hourOffset = typeof data.timerHourOffset === 'number' ? data.timerHourOffset : 0;

    let storedStart = Date.now();
    if (data.keepTimer !== false && data.persistent_start_time) {
      storedStart = data.persistent_start_time;
    } else {
      chrome.storage.local.set({ persistent_start_time: storedStart });
    }

    baseStartTime = storedStart;
    const effectiveStart = calculateEffectiveStartTime();

    currentActivity = buildActivity(data, effectiveStart);
    connectGateway();
  }
});
