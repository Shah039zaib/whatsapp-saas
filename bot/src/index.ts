// Baileys v4 compatible bot
// WORKING ON RENDER + QR + SESSION
import makeWASocket, {
    DisconnectReason,
    fetchLatestBaileysVersion,
    useSingleFileAuthState
} from "@adiwajshing/baileys";
import P from "pino";
import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { handleIncomingMessage } from "./flowService";

dotenv.config();
const log = P({ level: "info" });

const SESSION_DIR = process.env.SESSION_DIR || "./bot_sessions";
const SESSION_FILE = "auth_info.json";

if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

const authPath = path.join(SESSION_DIR, SESSION_FILE);
const { state, saveState } = useSingleFileAuthState(authPath);

const APP_BASE_URL = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
const ALLOW_REMOTE_SESSION = process.env.ALLOW_REMOTE_SESSION === "true";
const SESSION_UPLOAD_SECRET = process.env.SESSION_UPLOAD_SECRET || "";

// Upload QR
async function uploadQr(qr) {
  if (!ALLOW_REMOTE_SESSION) return;
  try {
    await axios.post(`${APP_BASE_URL}/api/bot/qr`, { qr }, {
      headers: SESSION_UPLOAD_SECRET ? { "x-session-secret": SESSION_UPLOAD_SECRET } : {}
    });
  } catch (e) {
    console.log("QR upload failed:", e.message);
  }
}

// Upload session
async function uploadSession() {
  try {
    if (!fs.existsSync(authPath)) return;
    const data = fs.readFileSync(authPath, "utf8");
    await axios.post(`${APP_BASE_URL}/api/bot/session`, { session: data }, {
      headers: SESSION_UPLOAD_SECRET ? { "x-session-secret": SESSION_UPLOAD_SECRET } : {}
    });
  } catch (e) {
    console.log("Session upload failed:", e.message);
  }
}

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    logger: log,
    printQRInTerminal: false,
    auth: state,
    version,
  });

  sock.ev.on("creds.update", saveState);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      fs.writeFileSync(path.join(SESSION_DIR, "qr.txt"), qr);
      await uploadQr(qr);
    }

    if (connection === "open") {
      console.log("Bot connected!");
      await uploadSession();
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log("Reconnecting...");
        setTimeout(startBot, 2000);
      } else {
        console.log("Logged out. Clearing session.");
        fs.unlinkSync(authPath);
        setTimeout(startBot, 2000);
      }
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    try {
      await handleIncomingMessage(sock, m);
    } catch (e) {
      console.log("Message error:", e.message);
    }
  });
}

startBot().catch((e) => {
  console.error("Bot start error:", e.message);
  console.error("STACK:", e.stack);
  process.exit(1);
});
