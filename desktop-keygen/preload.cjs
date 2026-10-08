"use strict";
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("uretici", {
  liste: () => ipcRenderer.invoke("liste"),
  uret: (f) => ipcRenderer.invoke("uret", f),
  kopyala: (t) => ipcRenderer.invoke("kopyala", t),
  dosyaKaydet: (rec) => ipcRenderer.invoke("dosyaKaydet", rec),
  csv: () => ipcRenderer.invoke("csv"),
});
