// server/scripts/preinstall.js
const fs = require("fs");
const path = require("path");

try {
  const cwd = process.cwd();
  console.log("[preinstall] cwd:", cwd);

  // ensure config dir exists where config module expects it
  const cfgDir = path.join(cwd, "config");
  if (!fs.existsSync(cfgDir)) {
    fs.mkdirSync(cfgDir, { recursive: true });
    console.log("[preinstall] created config dir:", cfgDir);
  } else {
    console.log("[preinstall] config dir exists:", cfgDir);
  }

  // ensure default.json exists with dummy content
  const def = path.join(cfgDir, "default.json");
  if (!fs.existsSync(def)) {
    fs.writeFileSync(def, JSON.stringify({ dummy: true }, null, 2), "utf8");
    console.log("[preinstall] wrote default.json");
  } else {
    console.log("[preinstall] default.json already exists");
  }

  // ensure custom env mapping exists
  const custom = path.join(cfgDir, "custom-environment-variables.json");
  if (!fs.existsSync(custom)) {
    fs.writeFileSync(custom, JSON.stringify({ dummy: "DUMMY_ENV" }, null, 2), "utf8");
    console.log("[preinstall] wrote custom-environment-variables.json");
  } else {
    console.log("[preinstall] custom-environment-variables.json already exists");
  }

  // show listing
  const list = fs.readdirSync(cfgDir);
  console.log("[preinstall] config files:", list);

  console.log("[preinstall] done - proceeding to npm install");
} catch (err) {
  console.error("[preinstall] error:", err && err.message ? err.message : err);
  // do not throw - we want install to continue
}
