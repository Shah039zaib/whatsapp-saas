// server/scripts/check-config.js
// Safe helper: if a 'config' module (or similar) exists, try to call config.load()
// This avoids "Exit prior to config file resolving" errors during build.

try {
  // try loading 'config' package if present
  const conf = require("config");
  if (conf && typeof conf.load === "function") {
    conf.load();
    console.log("[check-config] config.load() called");
  } else {
    console.log("[check-config] no config.load() function found (ok)");
  }
} catch (err) {
  // it's fine if 'config' module is not present; just log and continue
  if (err && err.code === "MODULE_NOT_FOUND") {
    console.log("[check-config] no 'config' module installed (ok)");
  } else {
    console.log("[check-config] error while checking config module:", err && err.message ? err.message : err);
  }
}
