import express from "express";
import cookieParser from "cookie-parser";

const router = express.Router();
router.use(cookieParser());

const ADMIN_SECRET = process.env.ADMIN_SECRET || "changeme123";

// login
router.post("/auth/login", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ ok: false, error: "password required" });
  if (password === ADMIN_SECRET) {
    // set simple cookie (httpOnly false for dev)
    res.cookie("swa_admin", "1", { httpOnly: false, sameSite: "lax" });
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: "invalid" });
});

router.get("/me", (req, res) => {
  const ok = Boolean(req.cookies?.swa_admin === "1");
  res.json({ ok, user: ok ? { name: "admin" } : null });
});

router.get("/stats", (_req, res) => {
  res.json({ ok: true, leads: 0, sales: 0 });
});

export default router;
