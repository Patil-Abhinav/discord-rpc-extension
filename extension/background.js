let gatewayWs = null;
let heartbeatTimer = null;
let currentActivity = null;
let currentPlatform = "desktop";
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
    if (isConnected && preventIdleMode) {
      sendPresenceUpdate();
    }
  });
}

function calculateEffectiveStartTime() {
  if (!baseStartTime) baseStartTime = Date.now();
  return Math.floor(baseStartTime - (hourOffset * 3600 * 1000));
}

function sendPresenceUpdate() {
  if (!gatewayWs || gatewayWs.readyState !== WebSocket.OPEN || !currentActivity) return;
  const updatePayload = {
    op: 3,
    d: {
      since: 0,
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

// Discord official client properties for platform emulation
function getDeviceProperties(platform) {
  switch (platform) {
    case 'phone':
      return {
        os: "Android",
        browser: "Discord Android",
        device: "mobile"
      };
    case 'vr':
      return {
        os: "Android",
        browser: "Discord Android",
        device: "Oculus Quest"
      };
    case 'xbox':
      return {
        os: "Xbox",
        browser: "Discord Xbox",
        device: "console"
      };
    case 'playstation':
      return {
        os: "PlayStation",
        browser: "Discord PlayStation",
        device: "console"
      };
    case 'desktop':
    default:
      return {
        os: "Windows",
        browser: "Chrome",
        device: ""
      };
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
    console.log('[Background] Connected to Discord Gateway as', currentPlatform);
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

        // Identify (Opcode 2)
        const identifyPayload = {
          op: 2,
          d: {
            token: userToken,
            capabilities: 8189,
            properties: getDeviceProperties(currentPlatform),
            presence: {
              status: "online",
              since: 0,
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
        sendPresenceUpdate();
      }

      if (msg.op === 9) {
        console.warn('[Background] Opcode 9 invalid session. Reconnecting...');
        setTimeout(() => {
          if (isConnected) connectGateway();
        }, 1500);
      }
    } catch (err) {
      console.error('[Background] Error processing gateway message:', err);
    }
  };

  gatewayWs.onerror = (err) => {
    console.error('[Background] Gateway error:', err);
  };

  gatewayWs.onclose = (event) => {
    console.log('[Background] Gateway closed with code:', event.code);
    clearInterval(heartbeatTimer);
    if (isConnected) {
      setTimeout(() => {
        if (isConnected) connectGateway();
      }, 2000);
    } else {
      chrome.storage.local.set({ isConnected: false, statusMsg: 'Offline' });
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
  // Clean user image inputs
  let rawLarge = (data.largeImage || '').trim();
  let rawSmall = (data.smallImage || '').trim();

  let resolvedLarge = KNOWN_ASSETS[rawLarge.toLowerCase()] || rawLarge || '1544811725315113001';
  let resolvedSmall = KNOWN_ASSETS[rawSmall.toLowerCase()] || rawSmall || '1544811727294570526';

  // Fallback for both_logos or empty
  if (!resolvedLarge || resolvedLarge.toLowerCase() === 'both_logos' || resolvedLarge.toLowerCase() === 'both logos') {
    resolvedLarge = '1544811725315113001';
  }
  if (!resolvedSmall || resolvedSmall.toLowerCase() === 'promptblox') {
    resolvedSmall = '1544811727294570526';
  }

  const actType = typeof data.activityType === 'number' ? data.activityType : 0;

  const activity = {
    name: "LunaticHost",
    type: actType,
    application_id: APP_ID,
    details: data.details || "LunaticHost",
    state: data.state || "Promptblox",
    timestamps: {
      start: effectiveStartTime
    },
    assets: {
      large_image: resolvedLarge,
      large_text: data.details || "LunaticHost",
      small_image: resolvedSmall,
      small_text: data.state || "Promptblox"
    }
  };

  // Only attach buttons in non-streaming modes (Type 0, 2, 3) because Streaming activities (Type 1) require Discord's native stream URL button
  if (actType === 1) {
    activity.name = data.details || "LunaticHost";
    activity.type = 1;
    let streamUrl = (data.streamUrl || '').trim();
    if (!streamUrl.startsWith('http://') && !streamUrl.startsWith('https://')) {
      streamUrl = "https://twitch.tv/discord";
    }
    activity.url = streamUrl;
    delete activity.buttons;
    delete activity.metadata;
  } else {
    activity.buttons = [
      data.btn1Text || "LunaticHost",
      data.btn2Text || "Promptblox.ai"
    ];
    activity.metadata = {
      button_urls: [
        data.btn1Url || "https://lunatichost.com",
        data.btn2Url || "https://promptblox.ai"
      ]
    };
  }

  return activity;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CONNECT') {
    userToken = request.token;
    preventIdleMode = request.preventIdle !== false;
    currentPlatform = request.devicePlatform || "desktop";
    hourOffset = typeof request.timerHourOffset === 'number' ? request.timerHourOffset : 0;
    isConnected = true;

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
  'keepTimer', 'preventIdle', 'timerHourOffset',
  'devicePlatform', 'activityType', 'streamUrl',
  'persistent_start_time', 'isConnected'
], (data) => {
  if (data.isConnected && data.token) {
    userToken = data.token;
    preventIdleMode = data.preventIdle !== false;
    currentPlatform = data.devicePlatform || "desktop";
    hourOffset = typeof data.timerHourOffset === 'number' ? data.timerHourOffset : 0;
    isConnected = true;

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
