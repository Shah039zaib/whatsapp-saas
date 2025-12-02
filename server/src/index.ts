
import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import { initDb } from "./services/db";
import leadsRouter from "./routes/leads";
import sessionRouter from "./routes/session";
import paymentRouter from "./routes/payment";
import adminRouter from "./routes/admin";
import demoRouter from "./routes/demo";

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use("/server_uploads", express.static("server_uploads"));

app.use("/api/leads", leadsRouter);
app.use("/api/session", sessionRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/admin", adminRouter);
app.use("/api/demo", demoRouter);

const PORT = Number(process.env.PORT || 3000);

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((e) => {
  console.error("Server start error:", e);
  process.exit(1);
});
