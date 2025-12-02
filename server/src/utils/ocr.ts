// server/src/utils/ocr.ts
import Tesseract from "tesseract.js";
import path from "path";

let globalWorker: any = null;
let initPromise: Promise<void> | null = null;

async function ensureWorker() {
  if (globalWorker) return;
  if (!initPromise) {
    initPromise = (async () => {
      globalWorker = await Tesseract.createWorker();
      try {
        await globalWorker.load();
        await globalWorker.loadLanguage("eng");
        await globalWorker.initialize("eng");
      } catch (e) {
        console.warn("Tesseract init warning:", e);
      }
    })();
  }
  return initPromise;
}

/**
 * runOcrOnImage - returns { text, confidence }
 */
export async function runOcrOnImage(filePath: string) {
  try {
    await ensureWorker();
    if (!globalWorker) {
      // fallback: do a quick attempt with createWorker (will be slower)
      const worker = await Tesseract.createWorker();
      await worker.load();
      await worker.loadLanguage("eng");
      await worker.initialize("eng");
      const { data } = await worker.recognize(filePath);
      await worker.terminate();
      return { text: data.text || "", confidence: data.confidence || 0 };
    }
    const { data } = await globalWorker.recognize(filePath);
    return { text: data.text || "", confidence: data.confidence || 0 };
  } catch (e) {
    console.error("OCR error:", e);
    return { text: "", confidence: 0 };
  }
}
