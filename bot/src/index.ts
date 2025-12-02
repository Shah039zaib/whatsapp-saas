import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@adiwajshing/baileys";

import P from "pino";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { handleIncomingMessage } from "./flowService";

dotenv.config();

(async () => {
  const { state, saveCreds } = await useMultiFileAuthState("./bot_sessions");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: true,
    auth: state,
    logger: P({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message) continue;

      const from = msg.key.remoteJid!;
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        "";

      await handleIncomingMessage(sock, from, text);
    }
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log("Bot Connected Successfully.");

      if (process.env.ALLOW_REMOTE_SESSION === "true") {
        try {
          await axios.post(`${process.env.APP_BASE_URL}/api/session`, {
            session: state
          });
        } catch (err) {
          console.log("Session sync failed:", err);
        }
      }
    }

    if (connection === "close") {
      const code =
        (lastDisconnect?.error as any)?.output?.statusCode || 0;

      if (code !== DisconnectReason.loggedOut) {
        console.log("Reconnecting...");
        return process.exit(1); // Render auto restart
      }

      console.log("Logged out. QR code needed again.");
    }
  });
})();
