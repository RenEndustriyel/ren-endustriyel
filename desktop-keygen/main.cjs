// Ren Lisans Üretici — masaüstü uygulaması için bilgisayara bağlı, süreli lisans anahtarları üretir.
// Gizli anahtar kurulumla birlikte gelir (resources/ren-lisans-ozel.pem). BU PROGRAMI KİMSEYE VERMEYİN.
"use strict";

const { app, BrowserWindow, ipcMain, dialog, clipboard, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const lisans = require("./lisans-ortak.cjs");

const kayitDosyasi = () => path.join(app.getPath("userData"), "lisanslar.json");

function privateKey() {
  const candidates = [
    path.join(process.resourcesPath || "", "ren-lisans-ozel.pem"),
    path.join(__dirname, "keys", "ren-lisans-ozel.pem"),
  ];
  for (const p of candidates) if (p && fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  return null;
}

const readList = () => {
  try {
    return JSON.parse(fs.readFileSync(kayitDosyasi(), "utf8"));
  } catch {
    return [];
  }
};
const writeList = (list) => {
  fs.mkdirSync(path.dirname(kayitDosyasi()), { recursive: true });
  // önce yedek, sonra yaz (kayıt kaybı olmasın)
  if (fs.existsSync(kayitDosyasi())) fs.copyFileSync(kayitDosyasi(), kayitDosyasi() + ".yedek");
  fs.writeFileSync(kayitDosyasi(), JSON.stringify(list, null, 2));
};

ipcMain.handle("liste", () => readList());
ipcMain.handle("uret", (_e, f) => {
  const pk = privateKey();
  if (!pk) return { ok: false, mesaj: "Gizli anahtar bulunamadı. Program hatalı kurulmuş." };
  const machine = String(f.machine || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (machine.length !== 16) return { ok: false, mesaj: "Bilgisayar kodu 16 karakter olmalı (XXXX-XXXX-XXXX-XXXX)." };
  if (!String(f.musteri || "").trim()) return { ok: false, mesaj: "Müşteri adını yazın." };
  const list = readList();
  const id = list.reduce((m, x) => Math.max(m, x.id), 1000) + 1;
  const issued = new Date().toISOString().slice(0, 10);
  const lic = { id, machine: machine.match(/.{4}/g).join("-"), expires: f.expires || null, issued };
  let key;
  try {
    key = lisans.createKey(lic, pk);
  } catch (e) {
    return { ok: false, mesaj: String(e.message || e) };
  }
  // üretilen anahtarı hemen doğrula
  const pub = require("crypto").createPublicKey(pk).export({ type: "spki", format: "pem" });
  if (!lisans.verifyKey(key, pub, lic.machine).ok && !(lic.expires && lic.expires < issued)) return { ok: false, mesaj: "Anahtar doğrulanamadı." };
  const rec = { ...lic, musteri: String(f.musteri).trim(), telefon: String(f.telefon || "").trim(), not: String(f.not || "").trim(), key, olusturma: new Date().toISOString() };
  list.unshift(rec);
  writeList(list);
  return { ok: true, kayit: rec };
});
ipcMain.handle("kopyala", (_e, t) => clipboard.writeText(String(t)));
ipcMain.handle("dosyaKaydet", async (_e, rec) => {
  const r = await dialog.showSaveDialog({
    title: "Lisans dosyasını kaydet",
    defaultPath: `Ren-Lisans-${rec.id}-${String(rec.musteri).replace(/[^\p{L}\p{N}]+/gu, "-")}.lic`,
    filters: [{ name: "Lisans", extensions: ["lic"] }],
  });
  if (r.canceled || !r.filePath) return false;
  fs.writeFileSync(r.filePath, rec.key + "\r\n");
  return true;
});
ipcMain.handle("csv", async () => {
  const list = readList();
  const r = await dialog.showSaveDialog({ title: "Lisans listesini dışa aktar", defaultPath: "ren-lisanslar.csv", filters: [{ name: "CSV", extensions: ["csv"] }] });
  if (r.canceled || !r.filePath) return false;
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["Lisans no", "Müşteri", "Telefon", "Bilgisayar kodu", "Üretim", "Bitiş", "Not", "Anahtar"], ...list.map((x) => [x.id, x.musteri, x.telefon, x.machine, x.issued, x.expires || "Süresiz", x.not, x.key])];
  fs.writeFileSync(r.filePath, "﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n"));
  return true;
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  const w = new BrowserWindow({
    width: 1100,
    height: 780,
    title: "Ren Lisans Üretici",
    icon: path.join(__dirname, "build", "icon.ico"),
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, sandbox: true },
  });
  w.loadFile(path.join(__dirname, "index.html"));
  if (!privateKey()) dialog.showErrorBox("Gizli anahtar yok", "Lisans üretmek için gizli anahtar dosyası gerekli (ren-lisans-ozel.pem).");
});
app.on("window-all-closed", () => app.quit());
