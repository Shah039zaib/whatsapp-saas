// server/src/index.ts  (DEBUG - replace temporarily)
import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { initDb } from "./services/db";
import adminRouter from "./routes/admin";
// ... import other routers as needed

dotenv.config();

const app = express();
app.set("trust proxy", 1);
app.use(cookieParser());
app.use(bodyParser.json({ limit: "2mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// ===== DEBUG CORS & logging (temporary) =====
// Allow everything for debug so we can confirm network
app.use(cors({
  origin: true,          // echo origin (safer than "*") while debugging
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","Accept","X-Requested-With"]
}));

// log every request to see what's coming
app.use((req, res, next) => {
  console.log(`[REQ] ${new Date().toISOString()} ${req.method} ${req.originalUrl} origin=${req.headers.origin || "none"}`);
  next();
});

// respond to preflight fast
app.options("*", (req, res) => {
  res.sendStatus(204);
});
// =============================================

const uploadsPath = path.join(__dirname, "..", "server_uploads");
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
app.use("/server_uploads", express.static(uploadsPath));

// mount routers
app.use("/api/admin", adminRouter);
// mount other routers: leads, session, payment, demo, etc.

app.get("/", (_req, res) => res.json({ ok: true, message: "Server running." }));

const PORT = Number(process.env.PORT || 3000);
async function start() {
  try {
    await initDb();
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  } catch (e: any) {
    console.error("Startup Error:", e);
    process.exit(1);
  }
}
start();
