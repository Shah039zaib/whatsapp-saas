import { AnyWASocket } from "@adiwajshing/baileys";
export async function handleIncomingMessage(sock: AnyWASocket, from: string, text: string) {
  console.log("[flow] message from", from, "text:", text);
  try {
    await (sock as any).sendMessage(from, { text: "Thanks! Hum aapka message receive kar liya hai. Hum jald reply karain ge." });
  } catch (e) { console.warn("reply error", e); }
}
export default { handleIncomingMessage };
