// Lisans anahtar çiftini BİR KEZ üretir.
//  - Gizli anahtar → desktop-keygen/keys/ren-lisans-ozel.pem  (git'e girmez; seri üretici kullanır, YEDEKLEYİN)
//  - Açık anahtar  → desktop/lisans-acik-anahtar.cjs          (masaüstü uygulamasına gömülür)
// Zaten varsa üzerine YAZMAZ (aksi halde dağıtılmış tüm anahtarlar geçersiz olur).
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.join(__dirname, "..", "..");
const privPath = path.join(root, "desktop-keygen", "keys", "ren-lisans-ozel.pem");
const pubPath = path.join(root, "desktop", "lisans-acik-anahtar.cjs");

if (fs.existsSync(privPath)) {
  console.log("Anahtar çifti zaten var, dokunulmadı:", privPath);
  process.exit(0);
}
const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
fs.mkdirSync(path.dirname(privPath), { recursive: true });
fs.writeFileSync(privPath, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
const pub = publicKey.export({ type: "spki", format: "pem" });
fs.writeFileSync(pubPath, `// Ren Muhasebe lisans doğrulama — AÇIK anahtar (gizli değildir)\nmodule.exports = ${JSON.stringify(pub)};\n`);
console.log("Gizli anahtar:", privPath);
console.log("Açık anahtar :", pubPath);
