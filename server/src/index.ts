import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import fs from "fs";
import { initDb } from "./services/db";

import leadsRouter from "./routes/leads";
import paymentRouter from "./routes/payment";
import adminRouter from "./routes/admin";
import demoRouter from "./routes/demo";

// NEW — session API
import sessionApi from "./routes/sessionApi";

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cors({
  origin: process.env.APP_BASE_URL || "*",
  credentials: true
}));

// ensure uploads dir
const uploadsPath = path.join(__dirname, "..", "server_uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use("/server_uploads", express.static(uploadsPath));

// health
app.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// API ROUTES
app.use("/api/leads", leadsRouter);

// NEW session API (secure)
app.use("/api/session", sessionApi);

app.use("/api/payment", paymentRouter);
app.use("/api/admin", adminRouter);
app.use("/api/demo", demoRouter);

// root
app.get("/", (_req, res) => {
  res.json({ ok: true, message: "Server running." });
});

const PORT = Number(process.env.PORT || 10000);

async function start() {
  try {
    console.log("Initializing database...");
    await initDb();
    console.log("Database initialized.");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (e: any) {
    console.error("Startup Error:", e);
    process.exit(1);
  }
}

start();
