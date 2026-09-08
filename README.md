# Discord Rich Presence Chrome Extension (Browser-Only)

A powerful, lightweight Google Chrome extension (Manifest V3) that sets custom Discord Rich Presence (RPC) activities with custom details, state, live elapsed timers, clickable profile buttons, custom images, device platform emulation, and streaming indicators directly from your browser—**no Discord desktop app or local server required**.

---

## 🌟 Key Features

- **100% Browser-Based (No Discord Desktop App Needed):** Connects directly to Discord's official Gateway WebSocket (`wss://gateway.discord.gg/?v=9&encoding=json`).
- **📱 Multi-Platform Device Emulation:**
  - **Mobile / Phone:** Displays the active **green phone icon 📱** on your avatar in server member lists and friend lists.
  - **Laptop / PC:** Standard Desktop client presence.
  - **VR Headset (Meta Quest 3):** Emulates an active VR session.
  - **Xbox / PlayStation Consoles:** Emulates console sessions.
- **🔴 Live Streaming Mode (Purple Badge):**
  - Switch between **Playing**, **Streaming**, **Listening**, **Watching**, or **Competing**.
  - Attaches your custom Twitch/YouTube stream link with a clickable **"Watch Stream"** button on your profile.
- **🔗 Interactive Profile Buttons:**
  - Supports up to 2 customizable buttons linking directly to your websites or stores.
- **🖼️ Built-in Image Uploader (No Developer Portal Required):**
  - Pick and upload image files (`.png`, `.jpg`, `.webp`) directly inside the popup.
  - Paste any direct image URL.
  - Or use pre-registered Discord Developer Application asset keys (`lunatichost`, `promptblox`).
- **⏱️ Custom Hours Adjuster (+ / - Controls):**
  - Preset quick buttons: `+1h`, `+10h`, `+20h` and `-1h`, `-10h`, `-20h`.
  - Custom input field to add or remove any arbitrary number of hours (e.g., `+50h`, `-100h`).
  - Real-time instant sync with Discord's live presence.
- **🔄 Persistent Timer Across Restarts:**
  - Preserves your elapsed start timestamp so rebooting your PC or reopening Chrome continues counting without resetting to `0:00`.
- **🛡️ Dual-Layer Anti-Idle Defense:**
  - Prevents Discord from switching your profile to "Idle" (orange moon 🌙) after inactivity or screen lock.
  - Automatically maintains your active green "Online" state.
- **💬 Community Button:**
  - Direct one-click launcher to join your community Discord server.

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
3. Enable the **Developer mode** toggle in the top-right corner.
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
   *(If prompted with a Discord safety warning, type `allow pasting` first, press Enter, and paste again).*
5. Copy the token printed between the quotes.

---

## ⚙️ How to Use

1. Click the puzzle icon in Chrome and open **Discord RPC**.
2. Fill out your presence options:
   - **Discord User Token:** Paste your user token.
   - **Device Icon / Status:** Choose `📱 Mobile / Phone`, `💻 Laptop / PC`, `🥽 VR Headset`, or consoles.
   - **Activity Mode:** Select `Playing`, `🔴 Live Streaming`, `Listening`, etc.
   - **Details & State:** Enter your presence lines.
   - **Images:** Upload your images via **📁 Choose File** or paste direct image links.
   - **Buttons:** Enter button labels and URLs.
   - **Adjust Elapsed Time:** Use presets or custom inputs to modify your timer.
   - **Checkboxes:** Ensure `Keep original timer` and `Prevent Idle` are checked.
3. Click **Connect Status**.
4. You can safely close the extension popup. Your Rich Presence will continue running in the background!

---

## 📁 Repository Structure

```text
discord-rpc-extension/
├── extension/
│   ├── background.js     # Persistent Gateway WebSocket service worker, device emulator & anti-idle handler
│   ├── manifest.json     # Chrome Manifest V3 extension configuration
│   ├── popup.html        # Extension UI layout with device pickers, custom hours & uploaders
│   └── popup.js          # Client controllers, file uploader, real-time timer sync & event handlers
├── bridge/               # Optional local Node.js IPC bridge (for desktop client users)
│   ├── package.json
│   └── server.js
├── .gitignore
├── LICENSE               # Proprietary license
└── README.md
```

---

## 🔒 Security & Privacy

- All credentials and configuration settings are stored locally in your browser's private `chrome.storage.local`.
- No user tokens or private data are ever transmitted to external servers.
- WebSocket payloads travel directly between your browser and Discord's official Gateway server (`gateway.discord.gg`).

---

## 📄 License & Intellectual Property

**Copyright (c) 2026 Abhinav Patil ([@Patil-Abhinav](https://github.com/Patil-Abhinav)). All Rights Reserved.**

This project is **proprietary software** licensed and owned exclusively by **Abhinav Patil**. 
- It is **NOT** open source or free to use, copy, redistribute, or modify without explicit prior written authorization from the owner.
- Refer to [`LICENSE`](./LICENSE) for full legal terms and conditions.
