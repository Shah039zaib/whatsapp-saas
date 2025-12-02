// bot/src/index.ts
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  proto,
  WASocket
} from "@adiwajshing/baileys";
import P from "pino";
import path from "path";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import { handleIncomingMessage } from "./flowService";
import { runLocalOcr } from "./ocrLocal";

dotenv.config();
const log = P();

// ENV and defaults
const SESSION_DIR = process.env.SESSION_DIR || "./bot_sessions";
const SERVER = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const ALLOW_REMOTE_SESSION = process.env.ALLOW_REMOTE_SESSION === "true";
const SESSION_NAME = process.env.SESSION_NAME || "default";
const OCR_MODE = (process.env.OCR_MODE || "bot").toLowerCase(); // "bot" or "server"
const MAX_MESSAGES_PER_MIN = Number(process.env.MAX_MSG_PER_MIN) || 30; // simple throttle

// ensure session dir exists
if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

// simple in-memory rate limiter per sender
const rateWindowMs = 60_000;
const counters: Record<string, { count: number; resetAt: number }> = {};

// helper: increment & check
function allowSend(from: string) {
  const now = Date.now();
  const key = from;
  if (!counters[key] || counters[key].resetAt <= now) {
    counters[key] = { count: 0, resetAt: now + rateWindowMs };
  }
  counters[key].count += 1;
  return counters[key].count <= MAX_MESSAGES_PER_MIN;
}

// POST session to server (save)
async function postSessionToServer(stateObj: any) {
  if (!ALLOW_REMOTE_SESSION) return;
  try {
    // stringify session
    const body = { name: SESSION_NAME, sessionJson: JSON.stringify(stateObj) };
    await axios.post(`${SERVER}/api/session`, body, { timeout: 10000 });
    log.info("Session posted to server");
  } catch (e: any) {
    log.warn("Failed to post session to server:", e.message || e);
  }
}

// upload image buffer to server endpoint (multipart/form-data)
// server expects field name "screenshot" and optionally client_id
async function uploadImageBufferToServer(buffer: Buffer, originalName: string, clientId?: string) {
  try {
    const form = new FormData();
    form.append("screenshot", buffer, { filename: originalName });
    if (clientId) form.append("client_id", clientId);
    const headers = form.getHeaders();
    const res = await axios.post(`${SERVER}/api/payment/upload`, form, {
      headers,
      maxContentLength: 50 * 1024 * 1024, // 50MB
      timeout: 60_000
    });
    return res.data;
  } catch (e: any) {
    log.error("uploadImageBufferToServer error:", e.message || e);
    throw e;
  }
}

// download media message helper
async function downloadMedia(sock: WASocket, message: proto.IMessage) {
  try {
    // Baileys helper
    // @ts-ignore - downloadMediaMessage typing may vary by version
    const stream = await sock.downloadMediaMessage({ message } as any, "buffer");
    return stream as Buffer;
  } catch (e: any) {
    log.error("downloadMedia error:", e.message || e);
    return null;
  }
}

// exponential backoff helper
function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function startBot() {
  // prepare auth state
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

  // try to post initial state to server if allowed (best-effort)
  if (ALLOW_REMOTE_SESSION) {
    try {
      await postSessionToServer(state);
    } catch (e) {
      // ignore
    }
  }

  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
    logger: log,
    // optional: specify browser info
    browser: ["MegaAgencyBot", "Chrome", "1.0"]
  });

  // save creds locally when updated (multi-file) and also push to server
  sock.ev.on("creds.update", async () => {
    try {
      await saveCreds();
      // read local state files and combine into an object if needed
      // for simplicity we post the state object that Baileys keeps in 'state'
      if (ALLOW_REMOTE_SESSION) {
        try {
          await postSessionToServer(state);
        } catch (e) {}
      }
      log.info("Creds updated & saved.");
    } catch (e) {
      log.error("Error saving creds:", e);
    }
  });

  // message handler
  sock.ev.on("messages.upsert", async (m: any) => {
    try {
      const messages = m.messages || [];
      for (const msg of messages) {
        if (!msg.message) continue;
        if (msg.key?.fromMe) continue;

        const from = msg.key.remoteJid as string;
        // handle media images
        if (msg.message.imageMessage || msg.message.documentMessage || msg.message.videoMessage) {
          // download media to buffer
          const buffer = await downloadMedia(sock, msg.message);
          if (buffer) {
            // prefer local OCR if available and OCR_MODE=bot
            let analysis: any = null;
            if (OCR_MODE === "bot") {
              try {
                analysis = await runLocalOcr(buffer);
                log.info("Local OCR result", { textSnippet: (analysis?.text || "").slice(0, 80) });
              } catch (e) {
                log.warn("Local OCR failed:", e);
              }
            }

            // upload image to server endpoint
            try {
              const serverRes = await uploadImageBufferToServer(buffer, `wa-${Date.now()}.jpg`, from);
              log.info("Uploaded image to server", serverRes);
            } catch (e) {
              log.warn("Upload to server failed, saving locally as fallback");
              // fallback: save locally
              const fallbackPath = path.join(SESSION_DIR, `fallback-${Date.now()}.jpg`);
              fs.writeFileSync(fallbackPath, buffer);
            }
          }
        }

        // text extraction
        let text = "";
        const mt = Object.keys(msg.message)[0];
        if (mt === "conversation") text = msg.message.conversation;
        else if (mt === "extendedTextMessage") text = msg.message.extendedTextMessage?.text || "";
        else if (mt === "imageMessage" && msg.message.imageMessage?.caption) text = msg.message.imageMessage.caption;
        else text = "";

        // rate-limit check
        if (!allowSend(from)) {
          log.warn("Rate limit reached for", from);
          // optionally send small throttle message
          try {
            await sock.sendMessage(from, { text: "Apka bahut sa messages aa rahe hain. Thodi dair rukain please." });
          } catch {}
          continue;
        }

        // flowService : handle incoming textual messages (existing function)
        try {
          await handleIncomingMessage(sock, from, text);
        } catch (e) {
          log.error("handleIncomingMessage error:", e);
        }
      }
    } catch (e) {
      log.error("messages.upsert general error:", e);
    }
  });

  // connection updates
  sock.ev.on("connection.update", async (update: any) => {
    const { connection, lastDisconnect } = update;
    log.info("connection.update:", connection);
    if (connection === "open") {
      log.info("WA connected");
      // on open push session to server
      if (ALLOW_REMOTE_SESSION) {
        try {
          await postSessionToServer(state);
        } catch (e) {
          log.warn("postSession on open failed", e);
        }
      }
    } else if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;
      log.warn("Connection closed, reason code:", code);
      // if logged out we should clear local auth and stop
      if (code === DisconnectReason.loggedOut) {
        log.error("Logged out from WhatsApp - remove session files and exit so admin can re-scan QR.");
        // delete session files
        try {
          // remove files in SESSION_DIR
          fs.readdirSync(SESSION_DIR).forEach((f) => fs.unlinkSync(path.join(SESSION_DIR, f)));
        } catch {}
        process.exit(0);
      } else {
        // reconnect with exponential backoff
        let attempt = 0;
        while (attempt < 5) {
          const waitMs = Math.min(30_000, 1000 * Math.pow(2, attempt));
          log.info(`Reconnect attempt ${attempt + 1} in ${waitMs}ms`);
          await wait(waitMs);
          try {
            await startBot(); // re-start a new socket
            return;
          } catch (err) {
            log.warn("Reconnect attempt failed:", err);
            attempt++;
          }
        }
        log.error("Max reconnect attempts reached - exiting.");
        process.exit(1);
      }
    }
  });

  // error handling
  sock.ev.on("creds.update", () => {
    log.info("creds.update event emitted");
  });

  return sock;
}

// start main
startBot().catch((e) => {
  log.error("startBot fatal error:", e);
  process.exit(1);
});
