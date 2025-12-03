// bot/src/index.ts
import makeWASocket from "@adiwajshing/baileys";
import P from "pino";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import { handleIncomingMessage } from "./flowService";
import { runLocalOcr } from "./ocrLocal";

dotenv.config();
const log = P();
const SESSION_DIR = process.env.SESSION_DIR || "./bot_sessions";
const APP_BASE_URL = process.env.APP_BASE_URL || "";
const ALLOW_REMOTE_SESSION = process.env.ALLOW_REMOTE_SESSION === "true";
const SESSION_SECRET = process.env.SESSION_UPLOAD_SECRET || ""; // optional

async function writeSessionFilesFromRemote(filesObj: Record<string, any>) {
  await fs.promises.mkdir(SESSION_DIR, { recursive: true });
  for (const [fname, content] of Object.entries(filesObj)) {
    const p = path.join(SESSION_DIR, fname);
    await fs.promises.writeFile(p, JSON.stringify(content, null, 2), "utf8");
  }
}

async function fetchAndRestoreRemoteSession() {
  if (!ALLOW_REMOTE_SESSION || !APP_BASE_URL) return false;
  try {
    const url = `${APP_BASE_URL.replace(/\/$/, "")}/api/session`;
    const headers: any = {};
    if (SESSION_SECRET) headers["x-session-key"] = SESSION_SECRET;
    const r = await axios.get(url, { timeout: 10_000, headers });
    if (r.data?.ok && r.data.files && Object.keys(r.data.files).length) {
      await writeSessionFilesFromRemote(r.data.files);
      console.log("Remote session restored into", SESSION_DIR);
      return true;
    }
  } catch (e: any) {
    console.warn("Could not fetch remote session:", e?.message || e);
  }
  return false;
}

async function startBot() {
  // 1) Try to fetch session from server and write files (if allowed)
  await fetchAndRestoreRemoteSession();

  // 2) Now call useMultiFileAuthState (Baileys reads SESSION_DIR if present)
  const { useMultiFileAuthState } = await import("@adiwajshing/baileys");
  const { state, saveCreds } = await (useMultiFileAuthState as any)(SESSION_DIR);

  const sock = makeWASocket({
    auth: state,
    logger: log as any,
  } as any);

  // When creds update, save to disk AND POST to server for persistence
  sock.ev.on("creds.update", async () => {
    try {
      await saveCreds();
      if (ALLOW_REMOTE_SESSION && APP_BASE_URL) {
        const files: Record<string, any> = {};
        const entries = await fs.promises.readdir(SESSION_DIR).catch(() => []);
        for (const f of entries) {
          const content = await fs.promises.readFile(path.join(SESSION_DIR, f), "utf8");
          try { files[f] = JSON.parse(content); } catch { files[f] = content; }
        }
        const headers: any = {};
        if (SESSION_SECRET) headers["x-session-key"] = SESSION_SECRET;
        await axios.post(`${APP_BASE_URL.replace(/\/$/, "")}/api/session`, { files }, { timeout: 10_000, headers });
        console.log("Remote session POSTed to server");
      }
    } catch (e) {
      console.warn("Error saving/posting creds:", e);
    }
  });

  // messages handler
  sock.ev.on("messages.upsert", async (m: any) => {
    const messages = m.messages;
    for (const msg of messages) {
      if (!msg.message) continue;
      const from = msg.key.remoteJid!;
      const text = (msg.message?.conversation) || (msg.message?.extendedTextMessage?.text) || "";
      await handleIncomingMessage(sock as any, from, text);
    }
  });

  sock.ev.on("connection.update", async (update: any) => {
    const { connection, lastDisconnect } = update;
    if (connection === "open") {
      console.log("WA connected");
    } else if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log("Connection closed, reason:", code);
      const { DisconnectReason } = await import("@adiwajshing/baileys");
      if (code !== DisconnectReason?.loggedOut) {
        console.log("Attempting reconnect...");
        setTimeout(()=> startBot().catch(console.error), 3000);
      } else {
        console.log("Logged out - remove session and re-scan.");
      }
    }
  });
}

startBot().catch((e) => {
  console.error("Bot start error:", e);
  process.exit(1);
});
