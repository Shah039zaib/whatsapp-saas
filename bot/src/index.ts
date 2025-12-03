import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@adiwajshing/baileys";
import P from "pino";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { handleIncomingMessage } from "./flowService";
import { runLocalOcr } from "./ocrLocal";

dotenv.config();
const log = P();
const SESSION_DIR = process.env.SESSION_DIR || "./bot_sessions";

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

  const sock = makeWASocket({
    auth: state,
    logger: log as any,
    // do not include printQRInTerminal (deprecated)
  } as any);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async (m: any) => {
    const messages = m.messages;
    for (const msg of messages) {
      if (!msg.message) continue;
      const from = msg.key.remoteJid!;
      const text = (msg.message?.conversation) || (msg.message?.extendedTextMessage?.text) || "";
      await handleIncomingMessage(sock, from, text);
    }
  });

  sock.ev.on("connection.update", async (update: any) => {
    const { connection, lastDisconnect } = update;
    if (connection === "open") {
      console.log("WA connected");
      if (process.env.ALLOW_REMOTE_SESSION === "true" && process.env.APP_BASE_URL) {
        try {
          const authState = state;
          await axios.post(`${process.env.APP_BASE_URL}/api/session`, { session: authState });
          console.log("Session posted to server for persistence.");
        } catch (e) {
          console.warn("Could not post session to server:", e);
        }
      }
    } else if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log("Connection closed, reason:", code);
      if (code !== DisconnectReason.loggedOut) {
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
