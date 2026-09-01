/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("fs");
const http = require("http");
const https = require("https");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const DEFAULT_DEV_URL = process.env.ELECTRON_START_URL || "http://127.0.0.1:3000";
const DEFAULT_HOSTNAME = "127.0.0.1";
const DEFAULT_PROD_PORT = 3989;
const shouldUseBundledServer =
  app.isPackaged || process.env.SMARTDESK_DESKTOP_USE_BUNDLED_SERVER === "1";

let mainWindow = null;
let nextServerProcess = null;
let desktopServerUrl = null;
let isQuitting = false;

function safeOrigin(value) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function shouldKeepNavigationInApp(targetUrl, startUrl) {
  const target = new URL(targetUrl);
  const appOrigin = new URL(startUrl).origin;

  if (target.origin === appOrigin) {
    return true;
  }

  const supabaseOrigin = safeOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (!supabaseOrigin || target.origin !== supabaseOrigin) {
    return false;
  }

  const isSupabaseAuthFlow =
    target.pathname.startsWith("/auth/v1/verify") ||
    target.pathname.startsWith("/auth/v1/authorize");

  if (!isSupabaseAuthFlow) {
    return false;
  }

  const redirectTarget =
    target.searchParams.get("redirect_to") ??
    target.searchParams.get("redirectTo") ??
    target.searchParams.get("redirect_uri");

  if (!redirectTarget) {
    return false;
  }

  return safeOrigin(redirectTarget) === appOrigin;
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const fileContents = fs.readFileSync(filePath, "utf8");
  const envEntries = {};

  for (const rawLine of fileContents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key) {
      envEntries[key] = value;
    }
  }

  return envEntries;
}

function loadDesktopEnv() {
  const candidateFiles = app.isPackaged
    ? [
        path.join(path.dirname(process.execPath), "smartdesk-desktop.env"),
        path.join(process.resourcesPath, "smartdesk-desktop.env"),
        path.join(app.getAppPath(), "smartdesk-desktop.env"),
      ]
    : [
        path.join(app.getAppPath(), ".env.local"),
        path.join(app.getAppPath(), "smartdesk-desktop.env"),
      ];

  for (const filePath of candidateFiles) {
    const envEntries = parseEnvFile(filePath);

    for (const [key, value] of Object.entries(envEntries)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

function ensureDesktopServerEnv() {
  const requiredKeys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  const missingKeys = requiredKeys.filter((key) => !process.env[key]);

  if (!missingKeys.length) {
    return;
  }

  throw new Error(
    `SmartDesk desktop runtime is missing ${missingKeys.join(", ")}. Rebuild the installer after generating smartdesk-desktop.env.`,
  );
}

function wait(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function canUsePort(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once("error", () => {
      resolve(false);
    });

    tester.once("listening", () => {
      tester.close(() => {
        resolve(true);
      });
    });

    tester.listen(port, DEFAULT_HOSTNAME);
  });
}

function getEphemeralPort() {
  return new Promise((resolve, reject) => {
    const tester = net.createServer();

    tester.once("error", reject);

    tester.once("listening", () => {
      const address = tester.address();

      tester.close(() => {
        if (!address || typeof address === "string") {
          reject(new Error("Unable to determine a free desktop port."));
          return;
        }

        resolve(address.port);
      });
    });

    tester.listen(0, DEFAULT_HOSTNAME);
  });
}

async function resolveDesktopPort() {
  const requestedPort = Number.parseInt(process.env.PORT || "", 10) || DEFAULT_PROD_PORT;

  if (await canUsePort(requestedPort)) {
    return requestedPort;
  }

  return getEphemeralPort();
}

function pingServer(targetUrl) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(targetUrl);
    const transport = parsedUrl.protocol === "https:" ? https : http;

    const request = transport.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname || "/",
        method: "GET",
        timeout: 3000,
      },
      (response) => {
        response.resume();
        resolve(response.statusCode || 200);
      },
    );

    request.once("error", reject);
    request.once("timeout", () => {
      request.destroy(new Error("Timed out while waiting for the SmartDesk server."));
    });
    request.end();
  });
}

async function waitForServer(targetUrl, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      await pingServer(targetUrl);
      return;
    } catch {
      if (nextServerProcess && nextServerProcess.exitCode !== null) {
        throw new Error("The bundled SmartDesk server closed before the desktop app could connect.");
      }

      await wait(500);
    }
  }

  throw new Error("Timed out while starting the SmartDesk desktop server.");
}

function stopNextServer() {
  if (!nextServerProcess || nextServerProcess.killed) {
    return;
  }

  nextServerProcess.kill();
  nextServerProcess = null;
}

async function startBundledServer() {
  if (desktopServerUrl && nextServerProcess && nextServerProcess.exitCode === null) {
    return desktopServerUrl;
  }

  loadDesktopEnv();
  ensureDesktopServerEnv();

  const standaloneDirectory = path.join(app.getAppPath(), ".next", "standalone");
  const serverScriptPath = path.join(standaloneDirectory, "server.js");

  if (!fs.existsSync(serverScriptPath)) {
    throw new Error(
      "SmartDesk desktop could not find the bundled Next server. Run `npm run build:desktop` before packaging.",
    );
  }

  const port = await resolveDesktopPort();

  nextServerProcess = spawn(process.execPath, [serverScriptPath], {
    cwd: standaloneDirectory,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: DEFAULT_HOSTNAME,
      NODE_ENV: "production",
      PORT: String(port),
    },
    stdio: app.isPackaged ? "ignore" : "inherit",
    windowsHide: true,
  });

  nextServerProcess.once("exit", (code) => {
    desktopServerUrl = null;

    if (!isQuitting && code !== 0) {
      dialog.showErrorBox(
        "SmartDesk Desktop Server Stopped",
        "The internal SmartDesk server stopped unexpectedly. Please restart the desktop app.",
      );
    }
  });

  desktopServerUrl = `http://${DEFAULT_HOSTNAME}:${port}`;
  return desktopServerUrl;
}

function createWindow(startUrl) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    show: false,
    backgroundColor: "#07111f",
    autoHideMenuBar: true,
    title: "SmartDesk Desktop",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (shouldKeepNavigationInApp(url, startUrl)) {
      void mainWindow?.loadURL(url);
      return { action: "deny" };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!shouldKeepNavigationInApp(url, startUrl)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  void mainWindow.loadURL(startUrl);
}

ipcMain.handle("desktop:get-meta", () => ({
  isDesktop: true,
  isPackaged: app.isPackaged,
  platform: process.platform,
  version: app.getVersion(),
}));

app.whenReady().then(async () => {
  const startUrl = shouldUseBundledServer ? await startBundledServer() : DEFAULT_DEV_URL;

  if (shouldUseBundledServer) {
    await waitForServer(startUrl);
  }

  createWindow(startUrl);

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(shouldUseBundledServer ? await startBundledServer() : DEFAULT_DEV_URL);
    }
  });
}).catch((error) => {
  dialog.showErrorBox("SmartDesk Desktop Failed To Start", error instanceof Error ? error.message : String(error));
  app.quit();
});

app.on("before-quit", () => {
  isQuitting = true;
  stopNextServer();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
