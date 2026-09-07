# Discord Rich Presence Chrome Extension (Browser-Only)

A lightweight Google Chrome extension (Manifest V3) that sets custom Discord Rich Presence (RPC) activities with custom details, state, timestamps, images, and clickable buttons directly from your browser—**no Discord desktop app or local server required**.

---

## 🌟 Key Features

- **100% Browser-Based (No Discord Desktop App Needed):** Connects directly to Discord's Gateway via secure WebSocket (`wss://gateway.discord.gg`).
- **Interactive Buttons:** Supports up to 2 clickable buttons with custom labels and URLs on your profile.
- **Image Support (Direct Uploads & Presets):**
  - Pick and upload any image file (`.png`, `.jpg`, `.webp`) directly inside the popup.
  - Or paste any direct image URL.
  - Or use pre-registered Discord Developer application asset keys.
- **Custom Elapsed Time Controls:**
  - `+1h`, `+10h`, `+20h` and `-1h`, `-10h`, `-20h` instant preset buttons.
  - Custom hours input with `+ Add Hours` and `- Remove Hours`.
  - Live real-time sync with Discord.
- **Persistent Timer Across Reboots:**
  - Keeps counting your status time even when Chrome is closed or the PC is restarted.
- **Dual-Layer Anti-Idle:**
  - Prevents Discord from automatically switching you to "Idle" (orange moon 🌙) after inactivity or screen lock.
  - Keeps you permanently marked as green "Online".
- **Background Service Worker:**
  - Runs in the background; closing the extension popup will **never** stop your presence.

---

## 🚀 Installation

1. Clone or download this repository:
   ```bash
   git clone https://github.com/Patil-Abhinav/discord-rpc-extension.git
   ```
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions/
   ```
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** (top-left) and select the `extension` folder inside this repository.

---

## 🔑 How to Get Your Discord User Token

1. Open Discord in your browser at [discord.com/app](https://discord.com/app).
2. Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>I</kbd> (or <kbd>F12</kbd>) to open Chrome Developer Tools.
3. Click the **Console** tab.
4. Paste the following command and press <kbd>Enter</kbd>:
   ```javascript
   (webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m).find(m=>m?.exports?.default?.getToken!==void 0).exports.default.getToken()
   ```
   *(If prompted by Discord, type `allow pasting` first, press Enter, and paste again).*
5. Copy the token printed between the quotes.

---

## ⚙️ How to Use

1. Click the extension puzzle icon in Chrome and pin **Discord RPC**.
2. Open the popup:
   - **Discord User Token:** Paste your user token.
   - **Details & State:** Enter your custom presence text lines.
   - **Images:** Upload your images via **Choose File** or paste direct URLs.
   - **Buttons:** Enter custom button labels and destination URLs.
   - **Elapsed Time:** Adjust the live timer using presets or the custom hours input.
   - **Checkboxes:** Ensure `Keep original timer` and `Prevent Idle` are checked.
3. Click **Connect Status**.
4. You can now safely close the extension popup. Your Rich Presence is live on Discord!

---

## 📁 Repository Structure

```text
discord-rpc-extension/
├── extension/
│   ├── background.js     # Persistent Gateway WebSocket service worker & anti-idle handler
│   ├── manifest.json     # Chrome Manifest V3 configuration
│   ├── popup.html        # Extension UI layout
│   └── popup.js          # UI controllers, file uploader & timer math
├── bridge/               # Optional local Node.js IPC bridge (for desktop Discord users)
│   ├── package.json
│   └── server.js
├── .gitignore
└── README.md
```

---

## 🔒 Security & Privacy

- Your user token is stored locally inside your browser's `chrome.storage.local`.
- No credentials or personal data are ever transmitted to third-party servers.
- All presence payloads are transmitted directly between your browser and Discord's official Gateway endpoint.

---

## 📄 License & Intellectual Property

**Copyright (c) 2026 Abhinav Patil ([@Patil-Abhinav](https://github.com/Patil-Abhinav)). All Rights Reserved.**

This project is **proprietary software** licensed and owned exclusively by **Abhinav Patil**. 
- It is **NOT** open source or free to use, copy, redistribute, or modify without explicit prior written authorization from the owner.
- Refer to [`LICENSE`](./LICENSE) for full legal terms and conditions.
