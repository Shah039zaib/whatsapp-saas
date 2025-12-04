// bot/src/flowService.ts (Baileys v6 safe version)

export async function handleIncomingMessage(sock: any, upsert: any) {
  try {
    const msgs = upsert?.messages || upsert?.messagesUpsert?.messages || [];
    const messages = Array.isArray(msgs) ? msgs : [msgs];

    for (const msg of messages) {
      const m = msg.message;
      if (!m) continue;

      const from = msg.key.remoteJid;

      // text messages
      if (m.conversation) {
        await sock.sendMessage(from, { text: "Received: " + m.conversation });
      }

      // extended text
      if (m.extendedTextMessage) {
        await sock.sendMessage(from, {
          text: "Received: " + m.extendedTextMessage.text,
        });
      }
    }
  } catch (err) {
    console.error("FlowService error:", err);
  }
}

export default { handleIncomingMessage };
