
import Tesseract from "tesseract.js";

// local OCR helper - faster on local machine when tesseract binary or worker supported
export async function runLocalOcr(filePath: string) {
  try {
    const worker = await Tesseract.createWorker();
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const { data } = await worker.recognize(filePath);
    await worker.terminate();
    return { text: data.text, confidence: data.confidence };
  } catch (e) {
    console.error("Local OCR error:", e);
    return { text: "", confidence: 0 };
  }
}
