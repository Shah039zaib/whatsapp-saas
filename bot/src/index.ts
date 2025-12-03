// bot/src/index.ts  (replace whole file)
import makeWASocket, { DisconnectReason, useMultiFileAuthState, Browsers } from "@adiwajshing/baileys";
import P from "pino";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const log = P();
const SESSION_DIR = process.env.SESSION_DIR || "./bot_sessions";
const SERVER_URL = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
const HEALTH_PING_INTERVAL_MS = Number(process.env.HEALTH_PING_INTERVAL_MS || 4 * 60 * 1000);

let reconnectAttempts = 0;

async function startBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    const sock = makeWASocket({
      printQRInTerminal: false,
      auth: state,
      logger: log,
      // explicit browser + version to avoid weird mismatch
      browser: Browsers.baileys("Chrome", "Desktop", "4.0.0"),
      version: [2, 2243, 7], // use the version seen in logs; adjust if WA updates
      connectTimeoutMs: 30000,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async (m) => {
      for (const msg of m.messages) {
        if (!msg.message) continue;
        const from = msg.key.remoteJid!;
        const text = (msg.message?.conversation) || (msg.message?.extendedTextMessage?.text) || "";
        // call your flow handler
        try { await (require("./flowService").handleIncomingMessage(sock, from, text)); } catch (e) { console.error("handleIncomingMessage error:", e); }
      }
    });

    sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      console.log("connection.update:", connection, "qr?", !!qr);

      // POST QR so admin can show it
      if (qr && SERVER_URL) {
        try {
          await axios.post(`${SERVER_URL}/api/session/qr`, { qr }, { timeout: 5000 });
          console.log("Posted QR to server for admin UI");
        } catch (e) {
          console.warn("Could not post QR to server:", e?.message || e);
        }
      }

      if (connection === "open") {
        reconnectAttempts = 0;
        console.log("WA connected");
        if (SERVER_URL) {
          try { await axios.post(`${SERVER_URL}/api/session/qr/clear`).catch(()=>{}); } catch {}
        }
      } else if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode;
        console.log("Connection closed, reason:", code);
        // If server returned 405 repeatedly, add delay and rotate user-agent/version
        if (code === 405) {
          reconnectAttempts++;
          console.warn("405 from server. Backing off a bit, attempt:", reconnectAttempts);
          // rotate version slightly every few attempts to look "normal"
          if (reconnectAttempts % 3 === 0) {
            // adjust version to random minor offset
            const vMinor = 2243 + (reconnectAttempts % 5);
            (sock as any).version = [2, vMinor, 7];
            console.log("Rotated WA version to:", (sock as any).version);
          }
          // backoff
          const wait = Math.min(30000, 2000 * reconnectAttempts);
          await new Promise(r => setTimeout(r, wait));
        }
        if (code !== DisconnectReason.loggedOut) {
          console.log("Attempting reconnect...");
          setTimeout(() => startBot().catch(err => { console.error("reconnect failed:", err); process.exit(1); }), 3000);
        } else {
          console.log("Logged out - remove session and re-scan.");
        }
      }
    });

    // periodic ping to server to keep route warm (helps some platforms)
    setInterval(async () => {
      try { if (SERVER_URL) await axios.get(`${SERVER_URL}/health`, { timeout: 4000 }).catch(()=>{}); } catch { }
    }, HEALTH_PING_INTERVAL_MS);

    process.on("uncaughtException", err => { console.error("Uncaught exception:", err); setTimeout(()=>process.exit(1),1000); });
    process.on("unhandledRejection", reason => { console.error("Unhandled Rejection:", reason); setTimeout(()=>process.exit(1),1000); });

    return sock;
  } catch (e) {
    console.error("Bot start error:", e);
    process.exit(1);
  }
}

startBot().catch(e => { console.error("startBot failed:", e); process.exit(1); });
