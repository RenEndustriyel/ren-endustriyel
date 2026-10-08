// Ren Endüstriyel — masaüstü uygulaması (Electron)
// Canlı uygulamayı kendi penceresinde açar; oturum, önbellek ve çevrimdışı kayıt kuyruğu bu bilgisayarda
// kalıcı tutulur (persist:ren). Açılışta lisans doğrulanır; geçersizse etkinleştirme ekranı gösterilir.
"use strict";

const { app, BrowserWindow, Menu, shell, ipcMain, dialog, clipboard } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFileSync } = require("child_process");
const lisans = require("./lisans-ortak.cjs");
const ACIK_ANAHTAR = require("./lisans-acik-anahtar.cjs");

const APP_URL = process.env.REN_APP_URL || "https://renendustriyel.vercel.app/panel";
const APP_ORIGIN = new URL(APP_URL).origin;
const PARTITION = "persist:ren-main"; // eski sürümle aynı: oturum ve önbellek korunur

const dataDir = () => app.getPath("userData");
const lisansDosyasi = () => path.join(dataDir(), "lisans.json");
const durumDosyasi = () => path.join(dataDir(), "durum.json");

let mainWindow = null;
let licenseWindow = null;

// ---------------------------------------------------------------------------
// Tek kopya: ikinci kez açılırsa mevcut pencere öne gelir
// ---------------------------------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const w = mainWindow || licenseWindow;
    if (w) {
      if (w.isMinimized()) w.restore();
      w.focus();
    }
  });
}

app.setAppUserModelId("com.renendustriyel.muhasebe");

// ---------------------------------------------------------------------------
// Bilgisayar kodu ve lisans
// ---------------------------------------------------------------------------
function machineGuid() {
  try {
    const out = execFileSync("reg", ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"], { encoding: "utf8", windowsHide: true });
    const m = out.match(/MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/);
    if (m) return m[1].toLowerCase();
  } catch {}
  return "yok";
}
let cachedMachine = null;
function machineCode() {
  if (!cachedMachine) cachedMachine = lisans.machineCodeFrom(machineGuid(), os.hostname());
  return cachedMachine;
}

const readJson = (f) => {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch {
    return null;
  }
};
const writeJson = (f, v) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(v, null, 2));
};

/** Kayıtlı lisansı doğrular; sistem saatinin geri alınmasına karşı son görülen tarihi tutar */
function checkLicense() {
  const saved = readJson(lisansDosyasi());
  if (!saved || !saved.key) return { ok: false, reason: "yok" };
  const state = readJson(durumDosyasi()) || {};
  const now = new Date();
  if (state.sonGorulen && now.getTime() < Date.parse(state.sonGorulen) - 2 * 864e5) {
    return { ok: false, reason: "saat" };
  }
  const res = lisans.verifyKey(saved.key, ACIK_ANAHTAR, machineCode(), now);
  if (res.ok) writeJson(durumDosyasi(), { ...state, sonGorulen: now.toISOString() });
  return res;
}

function daysLeft(lic) {
  if (!lic || !lic.expires) return null;
  return Math.ceil((Date.parse(lic.expires + "T23:59:59") - Date.now()) / 864e5);
}

// ---------------------------------------------------------------------------
// Pencereler
// ---------------------------------------------------------------------------
function createLicenseWindow(reason) {
  licenseWindow = new BrowserWindow({
    width: 620,
    height: 640,
    resizable: false,
    title: "Ren Endüstriyel — Lisans Etkinleştirme",
    icon: path.join(__dirname, "build", "icon.png"),
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, sandbox: true },
  });
  licenseWindow.loadFile(path.join(__dirname, "sayfalar", "lisans.html"), { query: { neden: reason || "" } });
  licenseWindow.on("closed", () => {
    licenseWindow = null;
    if (!mainWindow) app.quit();
  });
}

function createMainWindow() {
  const state = readJson(durumDosyasi()) || {};
  const b = state.pencere || { width: 1360, height: 860 };
  mainWindow = new BrowserWindow({
    ...b,
    minWidth: 980,
    minHeight: 640,
    title: "Ren Endüstriyel · Ön Muhasebe",
    icon: path.join(__dirname, "build", "icon.png"),
    show: false,
    backgroundColor: "#0f172a",
    webPreferences: { partition: PARTITION, preload: path.join(__dirname, "preload-uygulama.cjs"), contextIsolation: true, sandbox: true, spellcheck: false },
  });
  if (state.tamEkran) mainWindow.maximize();
  mainWindow.once("ready-to-show", () => mainWindow.show());

  // Pencere boyutunu hatırla
  const saveBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const s = readJson(durumDosyasi()) || {};
    writeJson(durumDosyasi(), { ...s, pencere: mainWindow.isMaximized() ? s.pencere : mainWindow.getBounds(), tamEkran: mainWindow.isMaximized() });
  };
  mainWindow.on("close", saveBounds);
  mainWindow.on("closed", () => (mainWindow = null));

  // Dış bağlantılar tarayıcıda; uygulama içi yeni pencereler (PDF, yazdır) uygulamada açılır
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(APP_ORIGIN) || url.startsWith("blob:") || url === "about:blank") {
      return { action: "allow", overrideBrowserWindowOptions: { autoHideMenuBar: true, icon: path.join(__dirname, "build", "icon.png"), webPreferences: { partition: PARTITION } } };
    }
    if (/^(https?|mailto|tel|whatsapp):/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(APP_ORIGIN)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  // İlk açılışta internet yoksa ve sayfa önbellekte değilse bilgilendirme sayfası
  mainWindow.webContents.on("did-fail-load", (_e, code, _desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return; // -3: iptal (yönlendirme)
    mainWindow.loadFile(path.join(__dirname, "sayfalar", "baglanti.html"), { query: { hedef: url || APP_URL } });
  });

  mainWindow.loadURL(APP_URL);
  buildMenu();
}

function buildMenu() {
  const template = [
    {
      label: "Dosya",
      submenu: [
        { label: "Ana sayfa", accelerator: "Alt+Home", click: () => mainWindow && mainWindow.loadURL(APP_URL) },
        { label: "Yenile", accelerator: "F5", click: () => mainWindow && mainWindow.webContents.reload() },
        { label: "Yazdır…", accelerator: "Ctrl+P", click: () => mainWindow && mainWindow.webContents.print() },
        { type: "separator" },
        { label: "Çıkış", accelerator: "Alt+F4", role: "quit" },
      ],
    },
    {
      label: "Düzen",
      submenu: [
        { label: "Geri al", role: "undo" },
        { label: "Yinele", role: "redo" },
        { type: "separator" },
        { label: "Kes", role: "cut" },
        { label: "Kopyala", role: "copy" },
        { label: "Yapıştır", role: "paste" },
        { label: "Tümünü seç", role: "selectAll" },
      ],
    },
    {
      label: "Görünüm",
      submenu: [
        { label: "Geri", accelerator: "Alt+Left", click: () => mainWindow && mainWindow.webContents.navigationHistory.goBack() },
        { label: "İleri", accelerator: "Alt+Right", click: () => mainWindow && mainWindow.webContents.navigationHistory.goForward() },
        { type: "separator" },
        { label: "Yakınlaştır", role: "zoomIn" },
        { label: "Uzaklaştır", role: "zoomOut" },
        { label: "Normal boyut", role: "resetZoom" },
        { type: "separator" },
        { label: "Tam ekran", role: "togglefullscreen" },
      ],
    },
    {
      label: "Yardım",
      submenu: [
        { label: "Lisans bilgisi", click: showLicenseInfo },
        { label: "Bilgisayar kodunu kopyala", click: () => clipboard.writeText(machineCode()) },
        { type: "separator" },
        { label: "Geliştirici araçları", accelerator: "Ctrl+Shift+I", click: () => mainWindow && mainWindow.webContents.toggleDevTools() },
        { label: "Hakkında", click: showAbout },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function showLicenseInfo() {
  const r = checkLicense();
  const lic = r.lic;
  const left = daysLeft(lic);
  dialog.showMessageBox(mainWindow, {
    type: "info",
    title: "Lisans bilgisi",
    message: r.ok ? "Lisans geçerli" : "Lisans geçersiz",
    detail: [
      lic ? `Lisans no: ${lic.id}` : null,
      `Bilgisayar kodu: ${machineCode()}`,
      lic ? `Bitiş: ${lic.expires ? `${lic.expires.split("-").reverse().join(".")} (${left} gün kaldı)` : "Süresiz"}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    buttons: ["Tamam"],
  });
}

function showAbout() {
  dialog.showMessageBox(mainWindow, {
    type: "info",
    title: "Hakkında",
    message: `Ren Endüstriyel Ön Muhasebe ${app.getVersion()}`,
    detail: "Ren Endüstriyel ön muhasebe uygulaması.\nVeriler web uygulaması ile ortaktır; internet yokken kayıtlar bu bilgisayarda saklanır ve bağlantı gelince gönderilir.",
    buttons: ["Tamam"],
  });
}

// ---------------------------------------------------------------------------
// Etkinleştirme ekranı ile iletişim
// ---------------------------------------------------------------------------
ipcMain.handle("lisans:makine", () => machineCode());
ipcMain.handle("lisans:etkinlestir", (_e, key) => {
  const res = lisans.verifyKey(key, ACIK_ANAHTAR, machineCode());
  if (!res.ok) return { ok: false, mesaj: lisans.REASONS[res.reason] || "Anahtar geçersiz." };
  writeJson(lisansDosyasi(), { key: String(key).trim(), etkinlestirme: new Date().toISOString() });
  writeJson(durumDosyasi(), { ...(readJson(durumDosyasi()) || {}), sonGorulen: new Date().toISOString() });
  return { ok: true, lic: res.lic };
});
ipcMain.handle("lisans:dosyadan", async () => {
  const r = await dialog.showOpenDialog(licenseWindow, { title: "Lisans dosyası seç", filters: [{ name: "Lisans", extensions: ["lic", "txt"] }], properties: ["openFile"] });
  if (r.canceled || !r.filePaths[0]) return null;
  return fs.readFileSync(r.filePaths[0], "utf8").trim();
});
ipcMain.handle("lisans:baslat", () => {
  if (!checkLicense().ok) return false;
  createMainWindow();
  if (licenseWindow) {
    const w = licenseWindow;
    licenseWindow = null;
    w.close();
  }
  return true;
});
ipcMain.handle("lisans:kopyala", (_e, text) => clipboard.writeText(String(text)));
ipcMain.handle("uygulama:yeniden-dene", (_e, url) => mainWindow && mainWindow.loadURL(url && String(url).startsWith(APP_ORIGIN) ? url : APP_URL));

// ---------------------------------------------------------------------------
// Açılış
// ---------------------------------------------------------------------------
app.whenReady().then(() => {
  if (process.env.REN_SMOKE) return smokeTest();
  const r = checkLicense();
  if (!r.ok) return createLicenseWindow(r.reason);
  createMainWindow();
  const left = daysLeft(r.lic);
  if (left !== null && left <= 15) {
    setTimeout(() => {
      dialog.showMessageBox(mainWindow, { type: "warning", title: "Lisans süresi", message: `Lisansınızın bitmesine ${left} gün kaldı.`, detail: "Yenilemek için Ren Endüstriyel ile iletişime geçin.", buttons: ["Tamam"] });
    }, 4000);
  }
});

app.on("window-all-closed", () => app.quit());

// Duman testi (geliştirme): pencere göstermeden açılışı dener
async function smokeTest() {
  const out = { makine: machineCode(), lisans: checkLicense() };
  const w = new BrowserWindow({ show: false, webPreferences: { partition: PARTITION, preload: path.join(__dirname, "preload-uygulama.cjs"), contextIsolation: true, sandbox: true } });
  try {
    await w.loadURL(APP_URL);
    out.baslik = w.getTitle();
    out.adres = w.webContents.getURL();
    out.masaustuBayragi = await w.webContents.executeJavaScript("Boolean(window.renMasaustu && window.renMasaustu.masaustu)");
  } catch (e) {
    out.hata = String(e);
  }
  const l = new BrowserWindow({ show: false, webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, sandbox: true } });
  await l.loadFile(path.join(__dirname, "sayfalar", "lisans.html"), { query: { neden: "yok" } });
  await new Promise((r) => setTimeout(r, 800));
  out.lisansEkrani = await l.webContents.executeJavaScript("document.getElementById(\"makine\").textContent");
  console.log("SMOKE " + JSON.stringify(out));
  app.exit(0);
}
