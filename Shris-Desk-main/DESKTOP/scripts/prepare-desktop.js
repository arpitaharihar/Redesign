/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const standaloneDirectory = path.join(projectRoot, ".next", "standalone");
const staticSourceDirectory = path.join(projectRoot, ".next", "static");
const publicSourceDirectory = path.join(projectRoot, "public");
const staticTargetDirectory = path.join(standaloneDirectory, ".next", "static");
const publicTargetDirectory = path.join(standaloneDirectory, "public");

function ensureDirectoryExists(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function copyDirectory(sourceDirectory, targetDirectory) {
  if (!fs.existsSync(sourceDirectory)) {
    return;
  }

  ensureDirectoryExists(targetDirectory);

  for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDirectory, entry.name);
    const targetPath = path.join(targetDirectory, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
}

if (!fs.existsSync(standaloneDirectory)) {
  throw new Error("Next standalone output is missing. Run `npm run build` before `node scripts/prepare-desktop.js`.");
}

copyDirectory(staticSourceDirectory, staticTargetDirectory);
copyDirectory(publicSourceDirectory, publicTargetDirectory);

console.log("Prepared SmartDesk desktop assets inside .next/standalone.");
