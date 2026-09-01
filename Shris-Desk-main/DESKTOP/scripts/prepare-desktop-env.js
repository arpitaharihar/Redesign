/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const sourceEnvPath = path.join(projectRoot, ".env.local");
const desktopEnvPath = path.join(projectRoot, "smartdesk-desktop.env");

const REQUIRED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const output = {};
  const contents = fs.readFileSync(filePath, "utf8");

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (key) {
      output[key] = value;
    }
  }

  return output;
}

const existingDesktopEnv = parseEnvFile(desktopEnvPath);
const sourceEnv = parseEnvFile(sourceEnvPath);

const mergedEnv = {
  ...sourceEnv,
  ...existingDesktopEnv,
};

for (const key of REQUIRED_KEYS) {
  if (!mergedEnv[key]) {
    throw new Error(
      `Missing ${key}. Add it to .env.local or smartdesk-desktop.env before building the desktop app.`,
    );
  }
}

mergedEnv.NEXT_PUBLIC_APP_URL = mergedEnv.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3989";
mergedEnv.PORT = mergedEnv.PORT || "3989";

const outputLines = [
  "# Generated for packaged SmartDesk desktop runtime.",
  `NEXT_PUBLIC_SUPABASE_URL=${mergedEnv.NEXT_PUBLIC_SUPABASE_URL}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${mergedEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`,
  "NEXT_PUBLIC_APP_URL=http://127.0.0.1:3989",
  `SUPABASE_SERVICE_ROLE_KEY=${mergedEnv.SUPABASE_SERVICE_ROLE_KEY}`,
  "PORT=3989",
];

fs.writeFileSync(desktopEnvPath, `${outputLines.join("\n")}\n`, "utf8");

console.log("Prepared smartdesk-desktop.env for packaged desktop runtime.");
