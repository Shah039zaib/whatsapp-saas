// server/src/routes/session.ts
import express from "express";
import { pool } from "../services/db";
const router = express.Router();

const SESSION_API_KEY = process.env.SESSION_API_KEY || "";

router.post("/", async (req, res) => {
  try {
    const headerKey = (req.headers["x-session-key"] || "").toString();
    if (SESSION_API_KEY && headerKey !== SESSION_API_KEY) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }
    const { name = "default", sessionJson } = req.body;
    if (!sessionJson) return res.status(400).json({ ok: false, error: "sessionJson required" });
    await pool.query(`CREATE TABLE IF NOT EXISTS bot_sessions (name text PRIMARY KEY, session_json text, updated_at timestamptz DEFAULT now())`);
    const r = await pool.query(
      `INSERT INTO bot_sessions (name, session_json, updated_at) VALUES ($1,$2,now())
       ON CONFLICT (name) DO UPDATE SET session_json = EXCLUDED.session_json, updated_at=now()
       RETURNING *;`,
      [name, sessionJson]
    );
    res.json({ ok: true, row: r.rows[0] });
  } catch (e: any) {
    console.error("Save session error:", e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

router.get("/:name", async (req, res) => {
  try {
    const name = req.params.name || "default";
    const r = await pool.query("SELECT session_json FROM bot_sessions WHERE name=$1 LIMIT 1", [name]);
    if (r.rowCount === 0) return res.json({ ok: true, sessionJson: null });
    res.json({ ok: true, sessionJson: r.rows[0].session_json });
  } catch (e: any) {
    console.error("Get session error:", e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

export default router;
