// server/src/routes/sessionApi.ts
import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();
const SESS_DIR = path.join(__dirname, "..", "..", "sessions"); // server/sessions

const REQUIRE_SECRET = !!process.env.SESSION_UPLOAD_SECRET;
const SECRET_KEY = process.env.SESSION_UPLOAD_SECRET || "";

if (!fs.existsSync(SESS_DIR)) fs.mkdirSync(SESS_DIR, { recursive: true });

function checkSecret(req: express.Request) {
  if (!REQUIRE_SECRET) return true;
  const got = req.header("x-session-key") || "";
  return got === SECRET_KEY;
}

router.post("/", express.json({ limit: "6mb" }), async (req, res) => {
  try {
    if (!checkSecret(req)) return res.status(403).json({ ok: false, error: "missing-secret" });

    const payload = req.body;
    if (payload?.files && typeof payload.files === "object") {
      for (const [fname, content] of Object.entries(payload.files)) {
        const outPath = path.join(SESS_DIR, fname);
        await fs.promises.writeFile(outPath, JSON.stringify(content, null, 2), "utf8");
      }
      return res.json({ ok: true, saved: Object.keys(payload.files) });
    } else {
      const outPath = path.join(SESS_DIR, "authState.json");
      await fs.promises.writeFile(outPath, JSON.stringify(payload, null, 2), "utf8");
      return res.json({ ok: true, saved: ["authState.json"] });
    }
  } catch (e) {
    console.error("save session error", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

router.get("/", async (req, res) => {
  try {
    if (!checkSecret(req)) return res.status(403).json({ ok: false, error: "missing-secret" });

    const files: Record<string, any> = {};
    const entries = await fs.promises.readdir(SESS_DIR).catch(() => []);
    for (const f of entries) {
      const content = await fs.promises.readFile(path.join(SESS_DIR, f), "utf8");
      try { files[f] = JSON.parse(content); } catch { files[f] = content; }
    }
    return res.json({ ok: true, files });
  } catch (e) {
    console.error("read session error", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

export default router;
