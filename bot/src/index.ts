// bot/src/index.ts
// Full, robust bot entry - Baileys v5 compatible.
// Responsibilities:
// - create Baileys socket with single-file auth
// - on connection.update: handle qr, connection, upload session/qr to server
// - graceful reconnection & session save
// - pass incoming messages to flowService

import makeWASocket, {
  DisconnectReason,
  useSingleFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from "@adiwajshing/baileys";
import P from "pino";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import { handleIncomingMessage } from "./flowService";

dotenv.config();
const log = P();

// Config from env
const SESSION_DIR = process.env.SESSION_DIR || "./bot_sessions";
const SESSION_FILE = process.env.SESSION_FILE || "auth_info.json";
const APP_BASE_URL = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
const ALLOW_REMOTE_SESSION = (process.env.ALLOW_REMOTE_SESSION || "false") === "true";
const SESSION_UPLOAD_SECRET = process.env.SESSION_UPLOAD_SECRET || "";

if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });
const authFilePath = path.join(SESSION_DIR, SESSION_FILE);

// helper: upload QR to server so admin can read it
async function uploadQr(qr: string) {
  if (!APP_BASE_URL || !ALLOW_REMOTE_SESSION) return;
  try {
    const url = `${APP_BASE_URL}/api/bot/qr`;
    await axios.post(url, { qr }, {
      headers: SESSION_UPLOAD_SECRET ? { "x-session-secret": SESSION_UPLOAD_SECRET } : undefined,
      timeout: 10000
    });
    log.info({ url }, "Uploaded QR to server");
  } catch (e: any) {
    log.warn({ err: e?.message || e }, "Failed to upload QR");
  }
}

// helper: upload full session/auth (so server/admin can persist)
async function uploadAuth(auth: any) {
  if (!APP_BASE_URL || !ALLOW_REMOTE_SESSION) return;
  try {
    const url = `${APP_BASE_URL}/api/bot/session`;
    await axios.post(url, { session: auth }, {
      headers: SESSION_UPLOAD_SECRET ? { "x-session-secret": SESSION_UPLOAD_SECRET } : undefined,
      timeout: 10000
    });
    log.info("Uploaded auth/session to server");
  } catch (e: any) {
    log.warn({ err: e?.message || e }, "Failed to upload auth/session");
  }
}

async function startBot() {
  // useSingleFileAuthState stores auth state to disk
  const { state, saveState } = useSingleFileAuthState(authFilePath);

  // get latest version of WA web
  const { version, isLatest } = await fetchLatestBaileysVersion();
  log.info({ version, isLatest }, "Using WA Web Version");

  const sock = makeWASocket({
    logger: log,
    printQRInTerminal: false,
    auth: state,
    version,
    browser: Browsers.macOS("Safari"),
  });

  // save state on changes
  sock.ev.on("creds.update", saveState);

  // listen for connection updates (qr, connection)
  sock.ev.on("connection.update", async (update) => {
    try {
      const { connection, lastDisconnect, qr } = update as any;

      if (qr) {
        log.info("Got QR, uploading to server (if configured).");
        await uploadQr(qr);
        // also save locally for debugging
        try { fs.writeFileSync(path.join(SESSION_DIR, "last_qr.txt"), qr); } catch(e){}
      }

      if (connection === "open") {
        log.info("Connection open - session established.");
        // upload auth/state for remote persistence
        try {
          // read auth file and upload
          if (fs.existsSync(authFilePath)) {
            const auth = JSON.parse(fs.readFileSync(authFilePath, "utf-8"));
            await uploadAuth(auth);
          }
        } catch (e) {
          log.warn({ err: (e as any).message || e }, "Uploading auth failed");
        }
      }

      if (connection === "close") {
        const code = (lastDisconnect && (lastDisconnect.error || lastDisconnect))?.output?.statusCode ||
                     (lastDisconnect && lastDisconnect.error && lastDisconnect.error?.statusCode) ||
                     undefined;
        log.warn({ lastDisconnect, code }, "Connection closed");
        // Attempt reconnect unless logged out
        if (lastDisconnect && (lastDisconnect.error || lastDisconnect).output) {
          const reason = (lastDisconnect.error || lastDisconnect).output?.statusCode;
          if (reason !== DisconnectReason.loggedOut) {
            log.info("Reconnecting after disconnect...");
            setTimeout(() => startBot().catch(e => log.error(e)), 3000);
          } else {
            log.info("Logged out - removing session file so user can re-scan.");
            try { fs.unlinkSync(authFilePath); } catch(e){}
          }
        } else {
          // generic reconnect
          setTimeout(() => startBot().catch(e => log.error(e)), 3000);
        }
      }
    } catch (e) {
      log.error({ err: (e as any).message || e }, "Error in connection.update handler");
    }
  });

  // message handling
  sock.ev.on("messages.upsert", async (m) => {
    try {
      await handleIncomingMessage(sock, m);
    } catch (e) {
      log.warn({ err: (e as any).message || e }, "handleIncomingMessage error");
    }
  });

  // graceful shutdown
  process.on("SIGINT", async () => {
    log.info("SIGINT - closing socket");
    try { await sock.logout(); } catch(e){}
    process.exit(0);
  });
}

startBot().catch((e) => {
  log.error({ err: (e as any).message || e }, "Bot start error");
  process.exit(1);
});
