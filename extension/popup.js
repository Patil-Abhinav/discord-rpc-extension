const statusEl = document.getElementById('statusMessage');
const gatewayStatusEl = document.getElementById('gatewayStatus');
const timerOffsetDisplay = document.getElementById('timerOffsetDisplay');
const customHoursInput = document.getElementById('customHoursInput');

const largeImageInput = document.getElementById('largeImage');
const smallImageInput = document.getElementById('smallImage');
const largeFileInput = document.getElementById('largeFileInput');
const smallFileInput = document.getElementById('smallFileInput');
const largePreview = document.getElementById('largePreview');
const smallPreview = document.getElementById('smallPreview');
const largeImageName = document.getElementById('largeImageName');
const smallImageName = document.getElementById('smallImageName');

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

// Upload helper: uploads an image file directly to Catbox/Litterbox or Imgur free hosting
async function uploadImageFile(file) {
  const formData = new FormData();
  formData.append('reqtype', 'fileupload');
  formData.append('time', '72h'); // 72h temporary hosting
  formData.append('fileToUpload', file);

  try {
    const res = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      const url = await res.text();
      if (url.startsWith('http')) return url.trim();
    }
  } catch (e) {
    console.warn('Litterbox upload failed, attempting fallback...', e);
  }

  // Fallback to free image uploader
  const fbData = new FormData();
  fbData.append('image', file);
  const fbRes = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: { 'Authorization': 'Client-ID 1c9b63ce607f2a1' },
    body: fbData
  });
  const json = await fbRes.json();
  if (json.data && json.data.link) return json.data.link;
  throw new Error('Image upload failed. Please use an image URL instead.');
}

// Handle file pickers
largeFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  largePreview.src = URL.createObjectURL(file);
  largePreview.style.display = 'block';
  largeImageName.textContent = 'Uploading: ' + file.name + '...';

  try {
    const uploadedUrl = await uploadImageFile(file);
    largeImageInput.value = uploadedUrl;
    largeImageName.textContent = file.name;
    setStatus('Large image uploaded and ready!', 'success');
  } catch (err) {
    largeImageName.textContent = 'Upload failed';
    setStatus(err.message, 'error');
  }
});

smallFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  smallPreview.src = URL.createObjectURL(file);
  smallPreview.style.display = 'block';
  smallImageName.textContent = 'Uploading: ' + file.name + '...';

  try {
    const uploadedUrl = await uploadImageFile(file);
    smallImageInput.value = uploadedUrl;
    smallImageName.textContent = file.name;
    setStatus('Small image uploaded and ready!', 'success');
  } catch (err) {
    smallImageName.textContent = 'Upload failed';
    setStatus(err.message, 'error');
  }
});

// Restore saved form values
chrome.storage.local.get([
  'token', 'details', 'state', 'largeImage', 'smallImage',
  'btn1Text', 'btn1Url', 'btn2Text', 'btn2Url',
  'keepTimer', 'preventIdle', 'timerHourOffset', 'isConnected', 'statusMsg'
], (data) => {
  if (data.token) document.getElementById('userToken').value = data.token;
  if (data.details) document.getElementById('details').value = data.details;
  if (data.state) document.getElementById('state').value = data.state;
  if (data.largeImage) {
    largeImageInput.value = data.largeImage;
    if (data.largeImage.startsWith('http')) {
      largePreview.src = data.largeImage;
      largePreview.style.display = 'block';
      largeImageName.textContent = 'Custom URL';
    }
  }
  if (data.smallImage) {
    smallImageInput.value = data.smallImage;
    if (data.smallImage.startsWith('http')) {
      smallPreview.src = data.smallImage;
      smallPreview.style.display = 'block';
      smallImageName.textContent = 'Custom URL';
    }
  }
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

// Presets
document.querySelectorAll('.timer-btn[data-hours]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const delta = parseInt(btn.getAttribute('data-hours'), 10);
    applyHourDelta(delta);
  });
});

document.getElementById('resetOffsetBtn').addEventListener('click', () => {
  updateOffsetUI(0);
  chrome.storage.local.set({ timerHourOffset: 0 });
  chrome.runtime.sendMessage({
    action: 'ADJUST_TIMER',
    hourOffset: 0
  });
});

document.getElementById('customAddBtn').addEventListener('click', () => {
  const val = parseFloat(customHoursInput.value);
  if (!isNaN(val) && val > 0) applyHourDelta(val);
});

document.getElementById('customSubBtn').addEventListener('click', () => {
  const val = parseFloat(customHoursInput.value);
  if (!isNaN(val) && val > 0) applyHourDelta(-val);
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.isConnected) updateBadge(changes.isConnected.newValue);
  if (changes.statusMsg) setStatus(changes.statusMsg.newValue, changes.isConnected?.newValue ? 'success' : '');
});

document.getElementById('connectBtn').addEventListener('click', () => {
  const token = document.getElementById('userToken').value.trim();
  const details = document.getElementById('details').value.trim();
  const state = document.getElementById('state').value.trim();
  const largeImage = largeImageInput.value.trim() || 'lunatichost';
  const smallImage = smallImageInput.value.trim() || 'promptblox';
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

document.getElementById('discordInviteBtn').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://discord.gg/shPR5ZNZhY' });
});
