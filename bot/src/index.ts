// bot/src/index.ts
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@adiwajshing/baileys";
import P from "pino";
import axios from "axios";
import dotenv from "dotenv";
import { handleIncomingMessage } from "./flowService"; // adjust path if needed

dotenv.config();
const log = P();
const SESSION_DIR = process.env.SESSION_DIR || "./bot_sessions";
const SERVER_URL = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
const HEALTH_PING_INTERVAL_MS = Number(process.env.HEALTH_PING_INTERVAL_MS || 4 * 60 * 1000);

let lastConnectionState: string | undefined;
let lastConnectedAt = 0;

async function startBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    const sock = makeWASocket({
      printQRInTerminal: false,
      auth: state,
      logger: log
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async (m) => {
      const messages = m.messages;
      for (const msg of messages) {
        if (!msg.message) continue;
        const from = msg.key.remoteJid!;
        const text = (msg.message?.conversation) || (msg.message?.extendedTextMessage?.text) || "";
        try { await handleIncomingMessage(sock, from, text); } catch (e) { console.error("handleIncomingMessage error:", e); }
      }
    });

    sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      console.log("connection.update:", connection);

      if (qr && SERVER_URL) {
        try {
          await axios.post(`${SERVER_URL}/api/session/qr`, { qr });
          console.log("Posted QR to server for admin UI");
        } catch (e) {
          console.warn("Could not post QR to server:", e?.message || e);
        }
      }

      if (connection === "open") {
        lastConnectedAt = Date.now();
        if (SERVER_URL) {
          try { await axios.post(`${SERVER_URL}/api/session/qr/clear`); } catch {}
        }
        console.log("WA connected");
      } else if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode;
        console.log("Connection closed, reason:", code);
        if (code !== DisconnectReason.loggedOut) {
          console.log("Attempting reconnect...");
          setTimeout(() => startBot().catch(err => { console.error("reconnect failed:", err); process.exit(1); }), 3000);
        } else {
          console.log("Logged out - remove session and re-scan.");
        }
      }
    });

    // keepalive ping server
    setInterval(async () => {
      try {
        if (SERVER_URL) await fetch(`${SERVER_URL}/health`, { method: "GET", keepalive: true }).catch(()=>{});
        console.log("Pinged server health.");
      } catch (e) { console.warn("Health ping failed", e); }
    }, HEALTH_PING_INTERVAL_MS);

    // watchdog
    setInterval(() => {
      const now = Date.now();
      if (lastConnectionState && lastConnectionState !== "open" && (now - lastConnectedAt) > (1000 * 60 * 10)) {
        console.error("Watchdog: bot not connected for >10m. Exiting to trigger restart.");
        process.exit(1);
      }
    }, 60 * 1000);

    process.on("uncaughtException", (err) => { console.error("Uncaught exception:", err); setTimeout(()=>process.exit(1),1000); });
    process.on("unhandledRejection", (reason) => { console.error("Unhandled Rejection:", reason); setTimeout(()=>process.exit(1),1000); });

  } catch (e) {
    console.error("Bot start error:", e);
    process.exit(1);
  }
}

startBot();
