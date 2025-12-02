// server/src/routes/admin.ts
import express from "express";
import { requireJwt } from "../middleware/verifyJwt";
import { pool } from "../services/db";

const router = express.Router();

// example protected endpoint: get all leads
router.get("/leads", requireJwt, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM leads ORDER BY created_at DESC LIMIT 200");
    res.json({ ok: true, leads: r.rows });
  } catch (e: any) {
    console.error("admin leads error:", e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// example to confirm payment
router.post("/confirm-payment", requireJwt, async (req, res) => {
  try {
    const { id } = req.body;
    await pool.query("UPDATE payment_candidates SET status='confirmed' WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (e: any) {
    console.error("confirm payment error:", e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

export default router;
