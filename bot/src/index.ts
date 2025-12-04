// bot/src/index.ts
// Baileys v5, TypeScript-safe, Render-friendly.
// Responsibilities:
// - useSingleFileAuthState for single-file auth
// - upload QR and session to your server endpoints
// - reconnect / loggedOut handling
// - messages.upsert -> delegated to flowService

import makeWASocket from "@adiwajshing/baileys";
import { useSingleFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from "@adiwajshing/baileys";
import P from "pino";
import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { handleIncomingMessage } from "./flowService";

dotenv.config();
const log = P({ level: "info" });

const SESSION_DIR = process.env.SESSION_DIR || "./bot_sessions";
const SESSION_FILE = process.env.SESSION_FILE || "auth_info.json";
const APP_BASE_URL = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
const SESSION_UPLOAD_SECRET = process.env.SESSION_UPLOAD_SECRET || "";
const ALLOW_REMOTE_SESSION = (process.env.ALLOW_REMOTE_SESSION || "false") === "true";

if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });
const authPath = path.join(SESSION_DIR, SESSION_FILE);

// Upload QR to server for admin UI
async function uploadQr(qr: string) {
  if (!APP_BASE_URL || !ALLOW_REMOTE_SESSION) return;
  try {
    await axios.post(`${APP_BASE_URL}/api/bot/qr`, { qr }, {
      headers: SESSION_UPLOAD_SECRET ? { "x-session-secret": SESSION_UPLOAD_SECRET } : undefined,
      timeout: 10000
    });
    log.info("Uploaded QR to server");
  } catch (e: any) {
    log.warn("uploadQr failed:", e?.message || e);
  }
}

// Upload session (single file) to server so admin can persist or show session status
async function uploadSession() {
  if (!APP_BASE_URL || !ALLOW_REMOTE_SESSION) return;
  try {
    if (!fs.existsSync(authPath)) return;
    const sessionContent = fs.readFileSync(authPath, "utf-8");
    await axios.post(`${APP_BASE_URL}/api/bot/session`, { session: sessionContent }, {
      headers: SESSION_UPLOAD_SECRET ? { "x-session-secret": SESSION_UPLOAD_SECRET } : undefined,
      timeout: 15000
    });
    log.info("Uploaded session to server");
  } catch (e: any) {
    log.warn("uploadSession failed:", e?.message || e);
  }
}

async function startBot() {
  // use single-file auth state (v5)
  const { state, saveState } = useSingleFileAuthState(authPath);

  // try to fetch latest WA version (safe)
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 2140, 12] }));

  const sock = makeWASocket({
    auth: state,
    version,
    logger: log,
    printQRInTerminal: false,
  });

  // persist creds
  sock.ev.on("creds.update", saveState);

  // connection updates: qr, open, close
  sock.ev.on("connection.update", async (update: any) => {
    try {
      const qr = update.qr;
      const connection = update.connection;
      const lastDisconnect = update.lastDisconnect;

      if (qr) {
        log.info("Got QR — saving and uploading");
        try { fs.writeFileSync(path.join(SESSION_DIR, "last_qr.txt"), qr); } catch {}
        await uploadQr(qr);
      }

      if (connection === "open") {
        log.info("Bot connected (open)");
        await uploadSession();
      }

      if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output || 0;
        log.warn("Connection closed", { code });
        if (code !== DisconnectReason.loggedOut) {
          log.info("Attempting reconnect...");
          setTimeout(() => startBot().catch(err => log.error("reconnect failed", err)), 3000);
        } else {
          log.info("Logged out — removing auth file so user can re-scan.");
          try { fs.unlinkSync(authPath); } catch(e){}
          setTimeout(() => startBot().catch(err => log.error("restart after logout failed", err)), 3000);
        }
      }
    } catch (e) {
      log.error("connection.update handler error", e);
    }
  });

  // messages handler
  sock.ev.on("messages.upsert", async (m: any) => {
    try {
      await handleIncomingMessage(sock, m);
    } catch (e) {
      log.warn("messages.upsert handler error", e);
    }
  });

  // graceful exit
  process.on("SIGINT", async () => {
    log.info("SIGINT received — exiting");
    try { await sock.logout(); } catch(e){}
    process.exit(0);
  });
}

startBot().catch((e) => {
  log.error("Bot start error:", e);
  process.exit(1);
});
