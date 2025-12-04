// admin/src/services/bot.ts
import api from "./api";

export async function fetchQr() {
  // server should return { ok: true, qr: "<qr string>" } when a QR exists
  const res = await api.get("/api/bot/qr");
  return res.data;
}

export async function fetchBotStatus() {
  const res = await api.get("/api/bot/status");
  return res.data;
}
