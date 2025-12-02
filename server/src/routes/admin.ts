
import express from "express";
import { pool } from "../services/db";

const router = express.Router();

// simple admin stats
router.get("/stats", async (req, res) => {
  try {
    const r1 = await pool.query("SELECT COUNT(*) FROM clients");
    const r2 = await pool.query("SELECT COUNT(*) FROM payment_candidates WHERE status='pending'");
    res.json({ ok: true, stats: { leads: Number(r1.rows[0].count || 0), pendingPayments: Number(r2.rows[0].count || 0) } });
  } catch (e) {
    console.error("Stats error:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// clear demo links
router.post("/demo/clear", async (req, res) => {
  try {
    await pool.query("TRUNCATE demo_links RESTART IDENTITY CASCADE");
    res.json({ ok:true });
  } catch (e) {
    console.error("Clear demo links error:", e);
    res.status(500).json({ ok:false, error: String(e) });
  }
});

export default router;
