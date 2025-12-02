// bot/src/session-handler.ts
import axios from "axios";
const SERVER = process.env.APP_BASE_URL || "http://localhost:3000";
const SESSION_NAME = process.env.SESSION_NAME || "default";

export async function loadRemoteSession(): Promise<any | null> {
  try {
    const url = `${SERVER.replace(/\/$/, "")}/api/session`;
    const r = await axios.get(url, { timeout: 10000 });
    if (r.data && r.data.ok && r.data.session) {
      return r.data.session;
    }
  } catch (e) {
    console.warn("loadRemoteSession error:", e.message || e);
  }
  return null;
}

export async function saveRemoteSession(sessionObj: any) {
  try {
    const url = `${SERVER.replace(/\/$/, "")}/api/session`;
    await axios.post(url, { session: sessionObj }, { timeout: 10000 });
    return true;
  } catch (e) {
    console.error("saveRemoteSession error:", e.message || e);
    return false;
  }
}
