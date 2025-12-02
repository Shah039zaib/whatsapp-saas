
import express from "express";
import { pool } from "../services/db";

const router = express.Router();

// Create lead (called by bot)
router.post("/", async (req, res) => {
  try {
    const { phone, name, business_name, theme_choice, payload } = req.body;
    const q = `INSERT INTO clients (phone, name, business_name, theme_choice, payload, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
    const vals = [phone, name || null, business_name || null, theme_choice || null, payload || {}, "new"];
    const r = await pool.query(q, vals);
    res.json({ ok: true, lead: r.rows[0] });
  } catch (e) {
    console.error("Lead create error:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// List leads (admin)
router.get("/", async (req, res) => {
  try {
    const q = "SELECT id, phone, name, business_name, theme_choice, status, created_at FROM clients ORDER BY created_at DESC LIMIT 200";
    const r = await pool.query(q);
    res.json({ ok: true, leads: r.rows });
  } catch (e) {
    console.error("Lead list error:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Get lead detail
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const r = await pool.query("SELECT * FROM clients WHERE id=$1", [id]);
    if (r.rowCount===0) return res.status(404).json({ ok:false, error:"not found" });
    res.json({ ok:true, lead: r.rows[0] });
  } catch (e) {
    console.error("Lead detail error:", e);
    res.status(500).json({ ok:false, error: String(e) });
  }
});

// Update status
router.put("/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const q = "UPDATE clients SET status=$1 WHERE id=$2 RETURNING *";
    const r = await pool.query(q, [status, id]);
    res.json({ ok: true, lead: r.rows[0] });
  } catch (e) {
    console.error("Update status error:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Clear all leads (admin)
router.post("/clear/all", async (req, res) => {
  try {
    await pool.query("TRUNCATE clients RESTART IDENTITY CASCADE");
    res.json({ ok:true });
  } catch (e) {
    console.error("Clear leads error:", e);
    res.status(500).json({ ok:false, error: String(e) });
  }
});

export default router;
