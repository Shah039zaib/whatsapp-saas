// server/src/services/paymentService.ts
import { pool } from "./db";
import { runOcrOnImage } from "../utils/ocr";

/**
 * analyzePaymentCandidate
 * - runs OCR on local image path
 * - tries to extract amount (simple heuristic) and phone numbers
 * - returns normalized object
 */
export async function analyzePaymentCandidate(fileUrl: string, localPath: string) {
  try {
    const ocr = await runOcrOnImage(localPath);
    const rawText = (ocr.text || "").toString();
    const text = rawText.toLowerCase();

    // amount: search for currency-like numbers (naive)
    // look for patterns like 1,000 or 1000 or 1.000 or 1000.00
    const amountRegexes = [
      /(?:rs|rs\.|rs:|\u20B9)?\s*([0-9]{1,3}(?:[,\.][0-9]{3})*(?:\.[0-9]{1,2})?)/i,
      /(?:amount|total|paid|tk|taka)\s*[:\-]?\s*([0-9]{3,7}(?:\.[0-9]{1,2})?)/i,
      /\b([0-9]{4,7})\b/
    ];

    let amount: string | null = null;
    for (const rx of amountRegexes) {
      const m = text.match(rx);
      if (m && m[1]) {
        amount = m[1].replace(/[,\s]/g, "");
        break;
      }
    }

    // phone: common patterns (05xxxxxxxx or +92xxxxxxxxx or 03xxxxxxxxx)
    const phoneRx = /(\+?\d{10,14})/g;
    const phones = [];
    let p;
    while ((p = phoneRx.exec(text)) !== null) {
      const ph = p[1].replace(/\D/g, "");
      if (ph.length >= 10 && ph.length <= 14) phones.push(ph);
    }

    const phone = phones.length ? phones[0] : null;

    return {
      text: rawText,
      confidence: (ocr.confidence || 0),
      amount,
      phone
    };
  } catch (e: any) {
    console.error("analyzePaymentCandidate error:", e);
    return { text: "", confidence: 0, amount: null, phone: null };
  }
}
