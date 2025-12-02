
import axios from "axios";
import type { WASocket } from "@adiwajshing/baileys";

const SERVER_BASE = process.env.APP_BASE_URL || "http://localhost:3000";

function normalizePhone(remoteJid: string) {
  return remoteJid.replace("@s.whatsapp.net", "");
}

export async function handleIncomingMessage(sock: WASocket, from: string, text: string) {
  try {
    const phone = normalizePhone(from);
    const payload = { phone, text };
    await axios.post(`${SERVER_BASE}/api/leads`, {
      phone,
      payload: { stepRawText: text }
    }).catch(() => {});
    let reply = "Shukriya! Apka message mil gaya. Agar aap store create karwana chahte hain to business name bhejein.";
    // simple language detection placeholder
    await sock.sendMessage(from, { text: reply });
  } catch (e) {
    console.error("Flow error:", e);
  }
}
