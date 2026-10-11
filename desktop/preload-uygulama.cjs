// Ana pencere (canlı uygulama) köprüsü: yalnızca masaüstü bayrağı ve bağlantı sayfasının "tekrar dene" işlemi.
// Lisans işlemleri bu pencereye AÇILMAZ.
"use strict";
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("renMasaustu", {
  masaustu: true,
  yenidenDene: (url) => ipcRenderer.invoke("uygulama:yeniden-dene", url),
});
