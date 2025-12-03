import express from "express";
const router = express.Router();
let lastBotStatus: any = {};
router.post("/bot-status", (req, res) => { lastBotStatus = req.body || {}; return res.json({ ok: true }); });
router.get("/bot-status", (_req, res) => res.json({ ok: true, status: lastBotStatus }));
export default router;
