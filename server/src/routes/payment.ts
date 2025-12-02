
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { pool } from "../services/db";
import { analyzePaymentCandidate } from "../services/paymentService";

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, "..", "..", "uploads") });

// upload screenshot candidate
router.post("/upload", upload.single("screenshot"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ ok: false, error: "No file" });
    // move file to public uploads (simple)
    const publicDir = path.join(__dirname, "..", "..", "server_uploads");
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
    const dest = path.join(publicDir, file.filename + path.extname(file.originalname));
    fs.renameSync(file.path, dest);
    const url = `/server_uploads/${path.basename(dest)}`;

    // Run OCR (server-side)
    const analysis = await analyzePaymentCandidate(url, dest);

    // save candidate
    const { client_id } = req.body;
    const q = `INSERT INTO payment_candidates (client_id, screenshot_url, ocr_text, confidence, status) VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    const r = await pool.query(q, [client_id || null, url, analysis.text, analysis.confidence || 0, 'pending']);
    res.json({ ok: true, candidate: r.rows[0], analysis });
  } catch (e) {
    console.error("Upload error:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// list candidates
router.get("/candidates", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM payment_candidates ORDER BY created_at DESC LIMIT 200");
    res.json({ ok: true, candidates: r.rows });
  } catch (e) {
    console.error("Candidates list error:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// confirm payment (admin)
router.post("/:id/confirm", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const q = "UPDATE payment_candidates SET status='confirmed' WHERE id=$1 RETURNING *";
    const r = await pool.query(q, [id]);
    // optional: update client status to advance_paid
    await pool.query("UPDATE clients SET status='advance_paid' WHERE id=(SELECT client_id FROM payment_candidates WHERE id=$1)", [id]);
    res.json({ ok: true, candidate: r.rows[0] });
  } catch (e) {
    console.error("Confirm error:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

export default router;
