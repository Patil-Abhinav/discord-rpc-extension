const statusEl = document.getElementById('statusMessage');
const gatewayStatusEl = document.getElementById('gatewayStatus');
const timerOffsetDisplay = document.getElementById('timerOffsetDisplay');
const customHoursInput = document.getElementById('customHoursInput');

let currentHourOffset = 0;

function setStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className = type;
}

function updateBadge(connected) {
  if (connected) {
    gatewayStatusEl.textContent = 'Active on Discord';
    gatewayStatusEl.classList.add('connected');
  } else {
    gatewayStatusEl.textContent = 'Offline';
    gatewayStatusEl.classList.remove('connected');
  }
}

function updateOffsetUI(hours) {
  currentHourOffset = hours;
  if (hours > 0) {
    timerOffsetDisplay.textContent = `+${hours}h`;
    timerOffsetDisplay.style.color = '#57f287';
  } else if (hours < 0) {
    timerOffsetDisplay.textContent = `${hours}h`;
    timerOffsetDisplay.style.color = '#ed4245';
  } else {
    timerOffsetDisplay.textContent = '0h';
    timerOffsetDisplay.style.color = '#949ba4';
  }
}

function applyHourDelta(delta) {
  const newOffset = currentHourOffset + delta;
  updateOffsetUI(newOffset);
  chrome.storage.local.set({ timerHourOffset: newOffset });

  chrome.runtime.sendMessage({
    action: 'ADJUST_TIMER',
    hourOffset: newOffset
  });
}

// Restore saved form values and current connection state
chrome.storage.local.get([
  'token', 'details', 'state', 'largeImage', 'smallImage',
  'btn1Text', 'btn1Url', 'btn2Text', 'btn2Url',
  'keepTimer', 'preventIdle', 'timerHourOffset', 'isConnected', 'statusMsg'
], (data) => {
  if (data.token) document.getElementById('userToken').value = data.token;
  if (data.details) document.getElementById('details').value = data.details;
  if (data.state) document.getElementById('state').value = data.state;
  if (data.largeImage) document.getElementById('largeImage').value = data.largeImage;
  if (data.smallImage) document.getElementById('smallImage').value = data.smallImage;
  if (data.btn1Text) document.getElementById('btn1Text').value = data.btn1Text;
  if (data.btn1Url) document.getElementById('btn1Url').value = data.btn1Url;
  if (data.btn2Text) document.getElementById('btn2Text').value = data.btn2Text;
  if (data.btn2Url) document.getElementById('btn2Url').value = data.btn2Url;

  if (typeof data.keepTimer === 'boolean') {
    document.getElementById('keepTimer').checked = data.keepTimer;
  }
  if (typeof data.preventIdle === 'boolean') {
    document.getElementById('preventIdle').checked = data.preventIdle;
  }
  if (typeof data.timerHourOffset === 'number') {
    updateOffsetUI(data.timerHourOffset);
  }

  updateBadge(data.isConnected);
  if (data.statusMsg) {
    setStatus(data.statusMsg, data.isConnected ? 'success' : '');
  }
});

// Quick preset buttons (+1, +10, +20, -1, -10, -20)
document.querySelectorAll('.timer-btn[data-hours]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const delta = parseInt(btn.getAttribute('data-hours'), 10);
    applyHourDelta(delta);
  });
});

// Reset offset back to 0
document.getElementById('resetOffsetBtn').addEventListener('click', () => {
  updateOffsetUI(0);
  chrome.storage.local.set({ timerHourOffset: 0 });
  chrome.runtime.sendMessage({
    action: 'ADJUST_TIMER',
    hourOffset: 0
  });
});

// Custom Add Hours Button
document.getElementById('customAddBtn').addEventListener('click', () => {
  const val = parseFloat(customHoursInput.value);
  if (!isNaN(val) && val > 0) {
    applyHourDelta(val);
  }
});

// Custom Subtract Hours Button
document.getElementById('customSubBtn').addEventListener('click', () => {
  const val = parseFloat(customHoursInput.value);
  if (!isNaN(val) && val > 0) {
    applyHourDelta(-val);
  }
});

// Listen for storage changes from background worker
chrome.storage.onChanged.addListener((changes) => {
  if (changes.isConnected) {
    updateBadge(changes.isConnected.newValue);
  }
  if (changes.statusMsg) {
    setStatus(changes.statusMsg.newValue, changes.isConnected?.newValue ? 'success' : '');
  }
});

document.getElementById('connectBtn').addEventListener('click', () => {
  const token = document.getElementById('userToken').value.trim();
  const details = document.getElementById('details').value.trim();
  const state = document.getElementById('state').value.trim();
  const largeImage = document.getElementById('largeImage').value.trim() || 'lunatichost';
  const smallImage = document.getElementById('smallImage').value.trim() || 'promptblox';
  const btn1Text = document.getElementById('btn1Text').value.trim();
  const btn1Url = document.getElementById('btn1Url').value.trim();
  const btn2Text = document.getElementById('btn2Text').value.trim();
  const btn2Url = document.getElementById('btn2Url').value.trim();
  const keepTimer = document.getElementById('keepTimer').checked;
  const preventIdle = document.getElementById('preventIdle').checked;

  if (!token) {
    setStatus('Please paste your Discord User Token above!', 'error');
    return;
  }

  chrome.storage.local.set({
    token, details, state, largeImage, smallImage,
    btn1Text, btn1Url, btn2Text, btn2Url, keepTimer, preventIdle,
    timerHourOffset: currentHourOffset
  });

  setStatus('Connecting in background...', '');

  chrome.runtime.sendMessage({
    action: 'CONNECT',
    token, details, state, largeImage, smallImage,
    btn1Text, btn1Url, btn2Text, btn2Url, keepTimer, preventIdle,
    timerHourOffset: currentHourOffset
  }, () => {
    updateBadge(true);
    setStatus('Active in background! Auto-resumes and prevents idle.', 'success');
  });
});

document.getElementById('clearBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'DISCONNECT' }, () => {
    updateBadge(false);
    setStatus('Disconnected. Status cleared.', '');
  });
});
