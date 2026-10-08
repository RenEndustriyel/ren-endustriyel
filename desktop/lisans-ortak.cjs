// Ren Muhasebe — lisans anahtarı biçimi (masaüstü uygulaması ve seri üretici ORTAK kullanır)
//
// Anahtar = Crockford Base32( yük (19 bayt) + Ed25519 imzası (64 bayt) ), "REN-" önekli 5'li gruplar.
// Yük (ikili):
//   [0]      sürüm (1)
//   [1..4]   lisans no (uint32)
//   [5..14]  bilgisayar kodu (10 bayt = 16 Base32 karakter)
//   [15..16] bitiş günü (2020-01-01'den gün; 0 = süresiz)
//   [17..18] üretim günü (2020-01-01'den gün)
// Yalnızca gizli anahtara sahip seri üretici geçerli anahtar üretebilir; uygulama açık anahtarla doğrular.
"use strict";

const crypto = require("crypto");

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford (I, L, O, U yok)
const EPOCH = Date.UTC(2020, 0, 1);
const PAYLOAD_LEN = 19;
const SIG_LEN = 64;

function b32encode(buf) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = ((value << 8) | byte) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function b32decode(str) {
  const clean = String(str)
    .toUpperCase()
    .replace(/^\s*REN-?/, "")
    .replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error("Geçersiz karakter");
    value = ((value << 5) | idx) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

const toDay = (iso) => (iso ? Math.round((Date.parse(iso + "T00:00:00Z") - EPOCH) / 864e5) : 0);
const fromDay = (d) => (d ? new Date(EPOCH + d * 864e5).toISOString().slice(0, 10) : null);
const normalizeMachine = (m) => String(m || "").toUpperCase().replace(/[^0-9A-Z]/g, "");

/** Ekranda gösterilecek biçim: REN-XXXXX-XXXXX-... */
function formatKey(raw) {
  return "REN-" + raw.match(/.{1,5}/g).join("-");
}

/**
 * Seri üretici: anahtar üretir.
 * @param {{ id: number, machine: string, expires: string|null, issued: string }} lic
 */
function createKey(lic, privateKeyPem) {
  const machine = b32decode(normalizeMachine(lic.machine));
  if (machine.length !== 10) throw new Error("Bilgisayar kodu 16 karakter olmalı (XXXX-XXXX-XXXX-XXXX).");
  const p = Buffer.alloc(PAYLOAD_LEN);
  p[0] = 1;
  p.writeUInt32BE(lic.id >>> 0, 1);
  machine.copy(p, 5);
  p.writeUInt16BE(toDay(lic.expires), 15);
  p.writeUInt16BE(toDay(lic.issued), 17);
  const sig = crypto.sign(null, p, privateKeyPem);
  return formatKey(b32encode(Buffer.concat([p, sig])));
}

/**
 * Anahtarı doğrular. Döner: { ok, lic?, reason? }  ·  reason: "bozuk" | "imza" | "bilgisayar" | "sure"
 * lic = { id, machine, expires, issued }
 */
function verifyKey(key, publicKeyPem, machineCode, today = new Date()) {
  let buf;
  try {
    buf = b32decode(key);
  } catch {
    return { ok: false, reason: "bozuk" };
  }
  if (buf.length < PAYLOAD_LEN + SIG_LEN) return { ok: false, reason: "bozuk" };
  const p = buf.subarray(0, PAYLOAD_LEN);
  const sig = buf.subarray(PAYLOAD_LEN, PAYLOAD_LEN + SIG_LEN);
  let valid = false;
  try {
    valid = p[0] === 1 && crypto.verify(null, p, publicKeyPem, sig);
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false, reason: "imza" };
  const machine = b32encode(p.subarray(5, 15)).slice(0, 16).match(/.{4}/g).join("-");
  const lic = { id: p.readUInt32BE(1), machine, expires: fromDay(p.readUInt16BE(15)), issued: fromDay(p.readUInt16BE(17)) };
  if (machineCode && normalizeMachine(machine) !== normalizeMachine(machineCode)) return { ok: false, reason: "bilgisayar", lic };
  if (lic.expires && today > new Date(lic.expires + "T23:59:59")) return { ok: false, reason: "sure", lic };
  return { ok: true, lic };
}

/** Bilgisayar kodu: Windows MachineGuid + bilgisayar adı → 16 karakter (XXXX-XXXX-XXXX-XXXX) */
function machineCodeFrom(machineGuid, hostname) {
  const h = crypto.createHash("sha256").update(`ren|${machineGuid}|${String(hostname).toUpperCase()}`).digest();
  return b32encode(h.subarray(0, 10)).slice(0, 16).match(/.{4}/g).join("-");
}

const REASONS = {
  bozuk: "Anahtar hatalı yazılmış ya da eksik.",
  imza: "Bu anahtar Ren Endüstriyel tarafından üretilmemiş.",
  bilgisayar: "Bu anahtar başka bir bilgisayar için üretilmiş.",
  sure: "Lisans süresi dolmuş.",
};

module.exports = { createKey, verifyKey, machineCodeFrom, formatKey, REASONS };
