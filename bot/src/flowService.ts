// bot/src/flowService.ts
// Minimal, safe incoming message handler.
// Exports handleIncomingMessage(sock, messages)
// Keep it simple: replies to text, recognizes images (hands off to OCR), ignores system messages.

import { proto, WASocket } from "@adiwajshing/baileys";
import { runLocalOcr } from "./ocrLocal";

export async function handleIncomingMessage(sock: WASocket, upsert: any) {
  try {
    const messages = upsert?.messages || (upsert?.messagesUpsert && upsert.messagesUpsert.messages) || upsert;
    if (!messages) return;
    for (const msg of Array.isArray(messages) ? messages : [messages]) {
      if (!msg.message) continue;
      const key = msg.key;
      const from = key.remoteJid;
      const isGroup = from?.endsWith("@g.us");
      // ignore statuses, protocol messages
      const m = msg.message;
      if (m?.conversation || m?.extendedTextMessage) {
        const text = m.conversation || m.extendedTextMessage?.text || "";
        if (text.trim().toLowerCase() === "ping") {
          await sock.sendMessage(from, { text: "pong" }, { quoted: msg });
        } else {
          // simple echo for now
          await sock.sendMessage(from, { text: "Received: " + text }, { quoted: msg });
        }
      } else if (m?.imageMessage) {
        // run OCR and reply
        const tmp = await runLocalOcr(m.imageMessage);
        await sock.sendMessage(from, { text: "OCR result: " + (tmp?.text || "(no text)") }, { quoted: msg });
      }
    }
  } catch (e) {
    console.warn("flowService error", e);
  }
}

export default { handleIncomingMessage };
