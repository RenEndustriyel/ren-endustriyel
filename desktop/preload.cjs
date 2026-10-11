// Pencere ile ana süreç arasındaki güvenli köprü (yalnızca izin verilen işlemler)
"use strict";
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("renMasaustu", {
  masaustu: true,
  makineKodu: () => ipcRenderer.invoke("lisans:makine"),
  etkinlestir: (key) => ipcRenderer.invoke("lisans:etkinlestir", key),
  dosyadanOku: () => ipcRenderer.invoke("lisans:dosyadan"),
  baslat: () => ipcRenderer.invoke("lisans:baslat"),
  kopyala: (text) => ipcRenderer.invoke("lisans:kopyala", text),
  yenidenDene: (url) => ipcRenderer.invoke("uygulama:yeniden-dene", url),
});
