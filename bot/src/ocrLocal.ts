// bot/src/ocrLocal.ts
// Utility to run tesseract.js on base64 image data (from Baileys imageMessage).
// This is defensive and returns empty text on failure.

import Tesseract from "tesseract.js";
import fs from "fs";
import path from "path";

export async function runLocalOcr(imageMessage: any) {
  try {
    // imageMessage may contain mimetype + buffer as `imageMessage` with `mimetype` and `image` fields
    // Baileys often returns buffer as `imageMessage?.mimetype` + `imageMessage?.data` (Buffer)
    const data = imageMessage?.image || imageMessage?.content || imageMessage?.jpegThumbnail || null;
    if (!data) return { text: "", confidence: 0 };
    // ensure tmp file
    const tmp = path.join("/tmp", `ocr_${Date.now()}.jpg`);
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "base64");
    fs.writeFileSync(tmp, buffer);
    const worker = await Tesseract.createWorker();
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const { data: res } = await worker.recognize(tmp);
    await worker.terminate();
    try { fs.unlinkSync(tmp); } catch(e){}
    return { text: res.text, confidence: res.confidence || 0 };
  } catch (e) {
    console.warn("ocrLocal error", e);
    return { text: "", confidence: 0 };
  }
}

export default { runLocalOcr };
