const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

const LIVE_URL = "https://renendustriyel.vercel.app";

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: "Ren Endüstriyel · Ön Muhasebe",
    icon: path.join(__dirname, "../public/icons/app.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: "persist:ren-main", // Kalıcı oturum, çerez ve IndexedDB
      preload: path.join(__dirname, "preload.js"),
    },
    backgroundColor: "#1f2328",
    autoHideMenuBar: true,
  });

  // Dış bağlantıları varsayılan tarayıcıda aç
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      if (!url.includes("vercel.app") && !url.includes("localhost")) {
        shell.openExternal(url);
        return { action: "deny" };
      }
    }
    return { action: "allow" };
  });

  win.loadURL(LIVE_URL);

  // Ağ kesintisi olduğunda önbellekteki sayfayı koru
  win.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.log("Sayfa yüklenirken bağlantı hatası:", errorCode, errorDescription);
    // Service worker devredeyse servis eder, aksi halde 3 sn sonra tekrar dener
    setTimeout(() => {
      win.loadURL(LIVE_URL).catch(() => {});
    }, 4000);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
