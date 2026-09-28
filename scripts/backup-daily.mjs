/**
 * Ren Endüstriyel — Günlük Otomatik Canlı Yedekleme Betiği
 * 
 * Canlıdaki (Vercel & Supabase) veritabanı yedeğini alır ve belirlenen klasöre kaydeder.
 * Kullanım:
 *   node scripts/backup-daily.mjs
 *   node scripts/backup-daily.mjs --folder "C:\Yedekler" --mode dated
 *   node scripts/backup-daily.mjs --folder "C:\Yedekler" --mode overwrite
 */

import { existsSync, mkdirSync, writeFileSync, appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Ayarları oku veya varsayılanları kullan
let config = {
  folder: "C:\\RenMuhasebe_Yedekler",
  mode: "dated", // "dated" (tarih tarih) veya "overwrite" (üstüne yaz)
  liveUrl: "https://ren2209-claude-focused-mccarthy-syg.vercel.app",
  token: "ren_muhasebe_backup_secret_2026",
};

const configFile = join(__dirname, "backup-config.json");
if (existsSync(configFile)) {
  try {
    const raw = JSON.parse(readFileSync(configFile, "utf8"));
    config = { ...config, ...raw };
  } catch {}
}

// Komut satırı argümanlarını kontrol et
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--folder" && args[i + 1]) config.folder = args[++i];
  if (args[i] === "--mode" && args[i + 1]) config.mode = args[++i];
}

console.log("==================================================");
console.log("Ren Endüstriyel · Günlük Canlı Yedekleme Başlatıldı");
console.log(`Tarih/Saat  : ${new Date().toLocaleString("tr-TR")}`);
console.log(`Hedef Klasör: ${config.folder}`);
console.log(`Yedekleme Modu: ${config.mode === "dated" ? "Tarih Tarih (Arşiv)" : "Üstüne Yaz (Tek Güncel Dosya)"}`);
console.log("==================================================");

import { createClient } from "@supabase/supabase-js";

async function fetchFromSupabaseDirectly() {
  console.log("Supabase veritabanına doğrudan bağlanılıyor...");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://araetdkscwosdbwdemlk.supabase.co";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_tfPWKeB0mjDYqs7seLcvHw_58FvH0AX";

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const BACKUP_TABLES = [
    "organizations",
    "memberships",
    "profiles",
    "number_series",
    "categories",
    "tags",
    "units",
    "warehouses",
    "price_lists",
    "price_list_items",
    "contacts",
    "contact_addresses",
    "products",
    "product_units",
    "product_stocks",
    "stock_movements",
    "stock_transfers",
    "stock_counts",
    "documents",
    "document_lines",
    "payment_allocations",
    "accounts",
    "transactions",
    "cheques",
    "cheque_events",
    "bank_statement_imports",
    "bank_statement_lines",
    "employees",
    "payroll_items",
    "reminders",
    "calendar_events",
  ];

  const result = {};
  const counts = {};
  let totalRecords = 0;

  for (const table of BACKUP_TABLES) {
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (!error && Array.isArray(data)) {
        result[table] = data;
        counts[table] = data.length;
        totalRecords += data.length;
      } else {
        result[table] = [];
        counts[table] = 0;
      }
    } catch {
      result[table] = [];
      counts[table] = 0;
    }
  }

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    app: "Ren Endüstriyel Ön Muhasebe",
    source: "supabase_direct",
    counts,
    totalRecords,
    tables: result,
  };
}

async function runBackup() {
  if (!existsSync(config.folder)) {
    mkdirSync(config.folder, { recursive: true });
    console.log(`Hedef klasör oluşturuldu: ${config.folder}`);
  }

  let data = null;
  const endpoint = `${config.liveUrl}/api/backup?token=${encodeURIComponent(config.token)}`;
  console.log(`Canlı sunucuya bağlanılıyor: ${config.liveUrl}...`);

  try {
    const res = await fetch(endpoint, {
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      data = await res.json();
    } else {
      console.log(`Canlı API henüz hazır değil veya yanıt vermedi (${res.status}).`);
    }
  } catch (err) {
    console.log("Canlı API bağlantısı başarısız, doğrudan veritabanına geçiliyor...");
  }

  if (!data) {
    data = await fetchFromSupabaseDirectly();
  }

  try {
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName =
      config.mode === "dated"
        ? `Ren_Yedek_${dateStr}.json`
        : `Ren_Yedek_Guncel.json`;

    const targetFilePath = join(config.folder, fileName);
    const jsonStr = JSON.stringify(data, null, 2);
    writeFileSync(targetFilePath, jsonStr, "utf8");

    const sizeKb = (Buffer.byteLength(jsonStr, "utf8") / 1024).toFixed(1);
    const logLine = `[${new Date().toISOString()}] BAŞARILI | Dosya: ${fileName} | Kayıt: ${data.totalRecords} | Boyut: ${sizeKb} KB\n`;
    appendFileSync(join(config.folder, "backup.log"), logLine, "utf8");

    console.log("--------------------------------------------------");
    console.log(`✅ Yedekleme başarıyla tamamlandı!`);
    console.log(`📁 Dosya : ${targetFilePath}`);
    console.log(`📊 Toplam: ${data.totalRecords} kayıt`);
    console.log(`💾 Boyut : ${sizeKb} KB`);
    console.log("--------------------------------------------------");
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("❌ Dosya yazma hatası:", errMsg);
    const errLine = `[${new Date().toISOString()}] HATA | ${errMsg}\n`;
    try {
      appendFileSync(join(config.folder, "backup.log"), errLine, "utf8");
    } catch {}
    process.exit(1);
  }
}

runBackup();
