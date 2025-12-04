// bot/src/session-handler.ts
// Utilities for session persistence / remote session retrieval.
// Used by the bot and can be reused by server if needed.

import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const SERVER = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
const SESSION_DIR = process.env.SESSION_DIR || "./bot_sessions";
const SESSION_FILE = process.env.SESSION_FILE || "auth_info.json";
const UPLOAD_SECRET = process.env.SESSION_UPLOAD_SECRET || "";

export const localAuthPath = path.join(SESSION_DIR, SESSION_FILE);

export async function loadRemoteSession(): Promise<any | null> {
  if (!SERVER) return null;
  try {
    const url = `${SERVER}/api/bot/session`;
    const headers = UPLOAD_SECRET ? { "x-session-secret": UPLOAD_SECRET } : undefined;
    const r = await axios.get(url, { headers, timeout: 10000 });
    if (r.data?.ok && r.data?.session) {
      return r.data.session;
    }
  } catch (e: any) {
    console.warn("loadRemoteSession error:", e?.message || e);
  }
  return null;
}

export async function saveLocalSession(auth: any) {
  try {
    if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });
    fs.writeFileSync(localAuthPath, JSON.stringify(auth, null, 2));
  } catch (e) {
    console.warn("saveLocalSession error:", (e as any).message || e);
  }
}

export async function uploadSessionToServer(auth: any) {
  if (!SERVER) return false;
  try {
    const url = `${SERVER}/api/bot/session`;
    await axios.post(url, { session: auth }, {
      headers: UPLOAD_SECRET ? { "x-session-secret": UPLOAD_SECRET } : undefined,
      timeout: 10000
    });
    return true;
  } catch (e) {
    console.warn("uploadSessionToServer error:", (e as any).message || e);
    return false;
  }
}
