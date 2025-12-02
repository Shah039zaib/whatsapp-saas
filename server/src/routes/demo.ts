
import express from "express";
import { pool } from "../services/db";

const router = express.Router();

// Add demo link (admin)
router.post("/links", async (req, res) => {
  try {
    const { category, url } = req.body;
    const q = "INSERT INTO demo_links (category, url) VALUES ($1,$2) RETURNING *";
    const r = await pool.query(q, [category, url]);
    res.json({ ok: true, link: r.rows[0] });
  } catch (e) {
    console.error("Add demo error:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Search demo links (used by AI fallback)
router.get("/search", async (req, res) => {
  try {
    const category = req.query.category as string;
    if (!category) return res.status(400).json({ ok: false, error: "no category" });
    const q = "SELECT url FROM demo_links WHERE lower(category)=lower($1) AND safe=true LIMIT 20";
    const r = await pool.query(q, [category]);
    res.json({ ok: true, links: r.rows.map((x:any)=>x.url) });
  } catch (e) {
    console.error("Search error:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

export default router;
