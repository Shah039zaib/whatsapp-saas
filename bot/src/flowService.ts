// bot/src/flowService.ts
// Simple, safe flow handler. Keep it minimal to avoid TS build issues.
// Accepts socket as any so we don't tie to specific Baileys types.

import axios from "axios";

export async function handleIncomingMessage(sock: any, from: string, text: string) {
  try {
    const lower = (text || "").toString().trim().toLowerCase();
    console.log("incoming from:", from, "text:", lower?.slice(0, 120));

    // simple command -> create lead via server
    if (/order|create store|store|shopify/i.test(lower)) {
      // acknowledge to user
      try {
        await sock.sendMessage(from, { text: "Shukriya! Aapka request receive hogaya. Hum jald rabta karenge." });
      } catch (e) {
        console.warn("sendMessage error:", e);
      }
      // post lead to server
      try {
        await axios.post(`${process.env.APP_BASE_URL}/api/leads`, {
          phone: from,
          message: text
        }, { timeout: 10000 });
      } catch (e) {
        console.warn("posting lead failed:", e?.message || e);
      }
      return;
    }

    // default reply
    try {
      await sock.sendMessage(from, { text: "Mega Agency: Reply receive hogaya. Type 'order' to create a Shopify store." });
    } catch (e) {
      console.warn("default reply error:", e);
    }
  } catch (e) {
    console.error("handleIncomingMessage error:", e);
  }
}
