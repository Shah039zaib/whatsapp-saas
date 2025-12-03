import { Router } from "express";
import jwt from "jsonwebtoken";
const router = Router();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || "change_me";
const JWT_SECRET = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || "please_change_secret";
const COOKIE_NAME = "admin_token";

router.post("/auth/login", (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) return res.status(401).json({ ok: false, error: "Invalid password" });
  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie(COOKIE_NAME, token, { httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 7*24*60*60*1000 });
  return res.json({ ok: true });
});

router.post("/auth/logout", (_req, res) => { res.clearCookie(COOKIE_NAME, { path: "/", sameSite: "none", secure: true }); return res.json({ ok: true }); });

router.get("/me", (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(200).json({ ok: false });
  try { const decoded = jwt.verify(token, JWT_SECRET); return res.status(200).json({ ok: true, user: decoded }); }
  catch (e) { return res.status(200).json({ ok: false }); }
});

router.get("/stats", (_req, res) => res.json({ ok: true, stats: { leads: 0 } }));

export default router;
