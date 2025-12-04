// bot/src/index.ts
// FULL BAILEYS v6 WORKING VERSION
// - Uses multi-file auth
// - Uploads QR & session to server
// - Stable reconnect logic
// - No TypeScript errors on Render

import {
  makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "@adiwajshing/baileys";

import P from "pino";
import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

import { handleIncomingMessage } from "./flowService";

dotenv.config();

const log = P({ level: "info" });

// ENV
const SESSION_DIR = process.env.SESSION_DIR || "./bot_sessions";
const APP_BASE_URL = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
const SESSION_UPLOAD_SECRET = process.env.SESSION_UPLOAD_SECRET || "";
const ALLOW_REMOTE_SESSION = process.env.ALLOW_REMOTE_SESSION === "true";

// ensure session dir exists
if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

// helper: upload QR to server
async function uploadQr(qr: string) {
  if (!APP_BASE_URL || !ALLOW_REMOTE_SESSION) return;
  try {
    await axios.post(
      `${APP_BASE_URL}/api/bot/qr`,
      { qr },
      {
        headers: SESSION_UPLOAD_SECRET
          ? { "x-session-secret": SESSION_UPLOAD_SECRET }
          : undefined,
      }
    );
    log.info("QR uploaded to server successfully.");
  } catch (err: any) {
    log.error("QR upload failed:", err?.message);
  }
}

// helper: upload session files
async function uploadSession(authStateDir: string) {
  if (!APP_BASE_URL || !ALLOW_REMOTE_SESSION) return;
  try {
    const files = fs.readdirSync(authStateDir);
    const sessionData: Record<string, any> = {};

    for (const file of files) {
      const p = path.join(authStateDir, file);
      sessionData[file] = fs.readFileSync(p, "utf-8");
    }

    await axios.post(
      `${APP_BASE_URL}/api/bot/session`,
      { session: sessionData },
      {
        headers: SESSION_UPLOAD_SECRET
          ? { "x-session-secret": SESSION_UPLOAD_SECRET }
          : undefined,
      }
    );

    log.info("Session uploaded to server.");
  } catch (err: any) {
    log.error("Session upload failed:", err?.message);
  }
}

async function startBot() {
  const { state, saveCreds, saveState, creds, keys } =
    await useMultiFileAuthState(SESSION_DIR);

  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: { creds, keys },
    logger: log,
    printQRInTerminal: false, // we upload QR instead
  });

  // save credentials
  sock.ev.on("creds.update", saveCreds);

  // save state file updates
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      log.info("QR generated");
      fs.writeFileSync(path.join(SESSION_DIR, "last_qr.txt"), qr);
      await uploadQr(qr);
    }

    if (connection === "open") {
      log.info("Bot connected.");
      await uploadSession(SESSION_DIR);
    }

    if (connection === "close") {
      const reason =
        lastDisconnect?.error?.output?.statusCode ||
        lastDisconnect?.error?.output ||
        0;

      if (reason !== DisconnectReason.loggedOut) {
        log.warn("Reconnecting...");
        setTimeout(startBot, 2000);
      } else {
        log.error("Logged out → remove session and re-scan");
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        setTimeout(startBot, 2000);
      }
    }
  });

  // incoming messages
  sock.ev.on("messages.upsert", async (m) => {
    try {
      await handleIncomingMessage(sock, m);
    } catch (err) {
      log.error("message handler error:", err);
    }
  });
}

startBot().catch((err) => {
  console.error("Bot start failed:", err);
  process.exit(1);
});
