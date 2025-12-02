
import express from "express";
import { getLatestSessionFromDb, saveSessionToDb } from "../services/sessionStore";

const router = express.Router();

// GET latest session (for bot to fetch when starting on Render)
router.get("/", async (req, res) => {
  if (process.env.ALLOW_REMOTE_SESSION !== "true") {
    return res.status(403).json({ ok: false, error: "Remote session disabled" });
  }
  const s = await getLatestSessionFromDb();
  if (!s) return res.json({ ok: true, session: null });
  res.json({ ok: true, session: s });
});

// POST save session (bot can call to persist)
router.post("/", async (req, res) => {
  if (process.env.ALLOW_REMOTE_SESSION !== "true") {
    return res.status(403).json({ ok: false, error: "Remote session disabled" });
  }
  const sessionObj = req.body.session;
  if (!sessionObj) return res.status(400).json({ ok: false, error: "No session provided" });
  await saveSessionToDb(sessionObj);
  res.json({ ok: true });
});

export default router;
