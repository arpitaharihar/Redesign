/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

const { spawn } = require("child_process");

const electronBinaryPath = require("electron");

const child = spawn(electronBinaryPath, ["."], {
  env: {
    ...process.env,
    SMARTDESK_DESKTOP_USE_BUNDLED_SERVER: "1",
  },
  stdio: "inherit",
  windowsHide: false,
});

child.once("exit", (code) => {
  process.exit(code || 0);
});
