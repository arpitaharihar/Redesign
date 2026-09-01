/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("smartDeskDesktop", {
  getMeta: () => ipcRenderer.invoke("desktop:get-meta"),
});
