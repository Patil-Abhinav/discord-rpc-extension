const WebSocket = require('ws');
const DiscordRPC = require('discord-rpc');

// ==========================================
// CONFIGURATION
// Replace this with your Discord Application Client ID
// ==========================================
const CLIENT_ID = '1532126670150963251';

// Set up Discord RPC
DiscordRPC.register(CLIENT_ID);
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

let isRpcReady = false;
let startTimestamp = new Date();

rpc.on('ready', () => {
    isRpcReady = true;
    console.log(`[Discord RPC] Connected and ready for application: ${CLIENT_ID}`);
});

rpc.on('disconnected', () => {
    isRpcReady = false;
    console.warn('[Discord RPC] Disconnected from Discord.');
});

// Start WebSocket server on localhost port 8123
const wss = new WebSocket.Server({ port: 8123 }, () => {
    console.log('[WebSocket] Bridge server listening on ws://127.0.0.1:8123');
});

wss.on('connection', (ws) => {
    console.log('[WebSocket] Chrome Extension connected.');

    // Send current status to extension on connection
    ws.send(JSON.stringify({
        type: 'STATUS_UPDATE',
        connected: isRpcReady,
        message: isRpcReady ? 'Discord RPC connected' : 'Discord RPC waiting for Discord client...'
    }));

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            if (data.action === 'SET_ACTIVITY') {
                if (!isRpcReady) {
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: 'Discord RPC is not ready. Make sure Discord desktop is open!'
                    }));
                    return;
                }

                const activity = {
                    details: data.details || 'LunaticHost',
                    state: data.state || 'Promptblox',
                    startTimestamp: startTimestamp,
                    largeImageKey: data.largeImageKey || 'both_logos',
                    largeImageText: 'LunaticHost & Promptblox',
                    buttons: data.buttons || [
                        { label: 'LunaticHost', url: 'https://lunatichost.com' },
                        { label: 'Promptblox', url: 'https://promptblox.ai' }
                    ],
                    instance: false
                };

                if (data.smallImageKey) {
                    activity.smallImageKey = data.smallImageKey;
                    activity.smallImageText = data.smallImageText || '';
                }

                await rpc.setActivity(activity);
                console.log('[Discord RPC] Activity updated successfully:', activity);

                ws.send(JSON.stringify({
                    type: 'SUCCESS',
                    message: 'Discord Rich Presence updated!'
                }));
            } else if (data.action === 'CLEAR_ACTIVITY') {
                if (isRpcReady) {
                    await rpc.clearActivity();
                    console.log('[Discord RPC] Activity cleared.');
                }
                ws.send(JSON.stringify({
                    type: 'SUCCESS',
                    message: 'Activity cleared.'
                }));
            }
        } catch (err) {
            console.error('[Error] Failed to process message:', err.message);
            ws.send(JSON.stringify({
                type: 'ERROR',
                message: err.message
            }));
        }
    });

    ws.on('close', () => {
        console.log('[WebSocket] Chrome Extension disconnected.');
    });
});

// Log in to Discord RPC with auto-retry
async function connectDiscord() {
    if (isRpcReady) return;
    try {
        await rpc.login({ clientId: CLIENT_ID });
    } catch (err) {
        console.log('[Discord RPC] Waiting for Discord desktop app to be open...');
        setTimeout(connectDiscord, 5000);
    }
}
connectDiscord();
