// Mağaza kataloğu üretici: ERP ürün listesi (urunler.json) + resim önerileri -> catalog.json
// Kullanım: node gen-catalog.mjs <urunler.json> <oneriler.json> <cikti.json> [--rapor]
import fs from "node:fs";

const [, , srcPath, onerilerPath, outPath, flag] = process.argv;
const items = JSON.parse(fs.readFileSync(srcPath, "utf8"));
const oneriler = JSON.parse(fs.readFileSync(onerilerPath, "utf8"));

const fold = (s) =>
  s
    .toLocaleUpperCase("tr-TR")
    .replace(/Ç/g, "C").replace(/Ğ/g, "G").replace(/İ/g, "I").replace(/Ö/g, "O").replace(/Ş/g, "S").replace(/Ü/g, "U")
    .replace(/\s+/g, " ")
    .trim();

// Mağazada satılmayacak satırlar: hizmet/fark kalemleri ve tehlikeli kimyasallar
const EXCLUDE = /FIYAT FARKI|KARGO BEDELI|KOMISYON|NAKLIYE|TESLIMAT VE HIZMET|FARE ILACI|KIMYASAL ILAC|NITRIK ASIT|KOSTIK/;

const RULES = [
  ["ekipman", /HAVLULUK|APARAT|ELDIVEN|SUNGER|\bBEZI?\b|FIRCA|\bMOP\b|SUPURGE|FARAS|KOVA|\bSAP\b|\bSAPLI|\bSAPSIZ|SOPASI|CEKCEK|CEK-PAS|YERSIL|PASPAS|GALOS|\bBONE\b|KOLLUK|\bTELI\b|TOPTEL|VILEDA|SPREY SISE|MASRAPA|KULLUK|KASIKLIK/],
  ["ambalaj", /BARDAK|\bKASE\b|TABLDOT|TABAG|SANDVIC|PIPET|CATAL|\bKASIK\b|SIZDIRMAZ|\bBANT|LASTIK/],
  ["poset", /POSET|TORBA|CANTA/],
  ["kagit", /HAVLU|\bHAV\b|PECETE|TUV(ALET)?\.? ?KAG|JUMBO TK|JUMBO TUVALET|KAGIDI|GARSON KATLAMA|MENDIL|POS RULO/],
  ["camasir-suyu", /CAMASIR SUYU|CAM SUYU|\bKLOR\b/],
  ["bulasik", /BULASIK|BUL\.? ?MAK|BUL\. DET|BLSK|PARLATICI|QUICK BH/],
  ["yuzey", /YUZEY|TUZEY|ARAP SABUNU|HALI SAMPUANI|ODA PARF|KIR&YAG/],
  ["sabun", /SABUN|SOAP|LUNAR|SAMPUAN|KOLONYA/],
  ["camasir-bakim", /DETERJAN|YUMUSAT|MATIK|\bSOFT\b|CAM DET|JETJEL/],
  ["yuzey", /GENEL TEM|CAM TEM|CAMSIL|YAG COZ|KIREC|\bPAS\b|\bWC\b|BANYO|TUVALET|KREM|DEGRASER|POTPORI|FIRIN|GRILL|TUZ RUHU|LAVABO|PISUVAR|KLOZET|ODA PARF|\bSODA\b|DEZENFEKTAN|MUHTESEM SIVI/],
];

const BRANDS = {
  TEX: "Tex", EFEX: "Efex", "BİNGO": "Bingo", AXOR: "Axor", DOLCE: "Dolce", "CİF": "Cif", "FİFTY": "Fifty", DOMESTOS: "Domestos",
  SELPAK: "Selpak", FOCUS: "Focus", SLEEPY: "Sleepy", ASPEROX: "Asperox", EFECTO: "Efecto", "FAMİLİA": "Familia", "VİLEDA": "Vileda",
  FLORA: "Flora", GLANEX: "Glanex", HASPET: "Haspet", "PAPİA": "Papia", TAMPA: "Tampa", "ASPİRİX": "Aspirix", CETY: "Cety",
  "DOLPHİN": "Dolphin", ECCO: "Ecco", "İLBAYS": "İlbays", MARATEM: "Maratem", MR: "Mr. Oxy", "MR.": "Mr. Oxy", "MR.OXY": "Mr. Oxy",
  "PİPETSAN": "Pipetsan", SOLO: "Solo", AREX: "Arex", AGRON: "Agron", BREFF: "Bref", CEYMOP: "Ceymop", DURACELL: "Duracell",
  "ÇAYKUR": "Çaykur", CAYKUR: "Çaykur", "KOMİLİ": "Komili", KOROPLAST: "Koroplast", LENTO: "Lento", MATSELL: "Matsell",
  "MİNTAX": "Mintax", "MİSS": "Miss", NESCAFE: "Nescafé", "NİTEX": "Nitex", OMO: "Omo", PEROS: "Peros", "RAİD": "Raid",
  "TUNÇPEK": "Tunçpek", "TURSİL": "Tursil", "YUMOŞ": "Yumoş", "ÖZCAN": "Özcan", BALKUPU: "Balküpü", FLOSOFT: "Flosoft", "KOİN": "Koin",
};

const ABBR = { TUV: "Tuvalet", "KAĞ": "Kağıdı", KAG: "Kağıdı", BUL: "Bulaşık", "BLŞK": "Bulaşık", MAK: "Makinesi", DET: "Deterjanı", END: "Endüstriyel", PLSTK: "Plastik", PLTNM: "Platinum", PROF: "Professional", TEM: "Temizlik", HAV: "Havlusu" };
const UNITS = { ML: "ml", LT: "L", L: "L", KG: "kg", GR: "gr", CM: "cm", MM: "mm", MT: "m", OZ: "oz", CC: "cc", AD: "adet" };
const KEEP = new Set(["WC", "XL", "M", "S", "M-L", "BH", "VP", "YTS", "R-EX", "X"]);
const FIX = { QUICK: "Quick", GRILL: "Grill", PINE: "Pine", SIYAH: "Siyah", TIRYAKI: "Tiryaki", SEKER: "Şeker", BALKUPU: "Balküpü", CAYKUR: "Çaykur", YUMUSATICI: "Yumuşatıcı", VE: "ve", NESCAFE: "Nescafé", BREFF: "Bref" };

const cap = (w) =>
  w
    .toLocaleLowerCase("tr-TR")
    .replace(/(^|[-.(&+/'])(\p{L})/gu, (_, a, b) => a + b.toLocaleUpperCase("tr-TR"));

function prettyName(raw) {
  const spaced = raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(\d) (L[İIÜU])(?=\s|$)/g, "$1$2")
    .replace(/(\S)\(/g, "$1 (")
    .replace(/(\p{L})\.(?=[\p{L}\d])/gu, "$1. ");
  return spaced
    .split(" ")
    .map((tok) => {
      const m = tok.match(/^(\(*)(.*?)([.,)]*)$/);
      const [, pre, core, post] = m;
      const up = core.toLocaleUpperCase("tr-TR");
      const close = post.replace(/\./g, "");
      if (!core) return tok;
      if (ABBR[up]) return pre + ABBR[up] + close;
      if (FIX[up]) return pre + FIX[up] + post;
      if (UNITS[up]) return pre + UNITS[up] + post;
      if (KEEP.has(up)) return pre + up + post;
      if (/^[A-Z]{1,3}\d+$/.test(up) || /^\d+[-/]\p{L}$/u.test(up)) return pre + up + post;
      if (/^\d/.test(core)) {
        return (
          pre +
          core
            .toLocaleLowerCase("tr-TR")
            .replace(/(\d)(lt|l)$/, "$1 L")
            .replace(/(\d)(ml|kg|gr|cm|cc|mm)$/, "$1 $2") +
          post
        );
      }
      return pre + cap(core) + post;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

const slugify = (s) =>
  fold(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Resimler: yalnızca birebir ("tam") eşleşen resmi görseller
const imageById = new Map();
for (const o of oneriler) if (o.match === "tam") imageById.set(o.product_id, o.image);
for (const p of items) if (p.image_path) imageById.set(p.id, p.image_path);

// Önizleme fiyatları (mevcut /magaza demosundaki örnek fiyatlar); gerçek fiyatlar ERP'den bağlanacak
const DEMO = {
  "domestos-pro-camasir-suyu-5l.png": [389, "adet", "5 L bidon"],
  "domestos-pro-camasir-suyu-1250ml.png": [1248, "koli", "1,25 L · 16'lı koli"],
  "domestos-pro-banyo-temizleyici-750ml.png": [1690, "koli", "750 ml · 20'li koli"],
  "domestos-pro-tuvalet-temizleyici-750ml.png": [1580, "koli", "750 ml · 20'li koli"],
  "domestos-pro-dezenfektan-sprey-750ml.png": [1920, "koli", "750 ml · 12'li koli"],
  "cif-pro-bulasik-deterjani-1420ml.png": [1380, "koli", "1,42 L · 12'li koli"],
  "cif-pro-elde-yikama-bulasik-5l.png": [1760, "koli", "5 L · 4'lü koli"],
  "cif-pro-izgara-ocak-firin-750ml.png": [2140, "koli", "750 ml · 12'li koli"],
  "cif-pro-krem-temizleyici-750ml.png": [1840, "koli", "750 ml · 16'lı koli"],
  "yumos-pro-tekstil-parfumu-750ml.png": [1990, "koli", "750 ml · 12'li koli"],
};

const seen = new Set();
const out = [];
const report = {};
for (const p of items) {
  if (!p.is_active) continue;
  const f = fold(p.name);
  if (EXCLUDE.test(f)) continue;
  const cat = (RULES.find(([, re]) => re.test(f)) ?? ["diger"])[0];
  const first = p.name.trim().split(/\s+/)[0].toLocaleUpperCase("tr-TR");
  const brand = BRANDS[first] ?? "";
  let slug = slugify(p.name);
  for (let n = 2; seen.has(slug); n++) slug = `${slugify(p.name)}-${n}`;
  seen.add(slug);
  const image = imageById.get(p.id) ?? "";
  const demo = image ? DEMO[image.split("/").pop()] : undefined;
  const row = { id: p.id, slug, name: prettyName(p.name), brand, cat, image };
  if (p.barcode) row.barcode = String(p.barcode);
  if (demo) Object.assign(row, { price: demo[0], unit: demo[1], pack: demo[2] });
  out.push(row);
  (report[cat] ??= []).push(row.name);
}

out.sort((a, b) => Number(!!b.image) - Number(!!a.image) || a.name.localeCompare(b.name, "tr"));
fs.writeFileSync(outPath, JSON.stringify(out));
console.log("toplam", out.length, "| resimli", out.filter((x) => x.image).length, "| fiyatlı", out.filter((x) => x.price).length);
for (const [k, v] of Object.entries(report)) console.log(k, v.length);
if (flag === "--rapor") for (const [k, v] of Object.entries(report)) console.log(`\n== ${k}\n` + v.join(" | "));
