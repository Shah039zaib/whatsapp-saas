import express from "express";
import QRCode from "qrcode";

const router = express.Router();

// POST session - store session object (for ALLOW_REMOTE_SESSION flow)
router.post("/", async (req, res) => {
  const session = req.body?.session;
  if (!session) return res.status(400).json({ ok: false, error: "No session provided" });
  // For MVP: save to file (server_sessions.json) - you can replace with DB later
  try {
    const p = "./server_sessions.json";
    let data: any = [];
    if (fs.existsSync(p)) {
      data = JSON.parse(fs.readFileSync(p, "utf8"));
    }
    data.push({ at: Date.now(), session });
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /qr?text=... -> returns QR dataURL
router.get("/qr", async (req, res) => {
  const text = String(req.query.text || "");
  if (!text) return res.status(400).json({ ok: false, error: "text required" });
  try {
    const dataUrl = await QRCode.toDataURL(text);
    res.json({ ok: true, dataUrl });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

export default router;
