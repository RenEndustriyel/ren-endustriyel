import sharp from "sharp";
import { fileURLToPath } from "node:url";

const src = fileURLToPath(new URL("./logo-source.webp", import.meta.url));
const out = fileURLToPath(new URL("../public/icons/", import.meta.url));

// Siyah arka planı şeffaf yap (logo koyu zemin üzerinde)
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < data.length; i += 4) {
  const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  if (lum < 18) data[i + 3] = 0;
  else if (lum < 40) data[i + 3] = Math.round(((lum - 18) / 22) * 255);
}
const transparent = sharp(data, { raw: info }).png();
const cropped = await transparent.extract({ left: 106, top: 106, width: 800, height: 800 }).toBuffer();

await sharp(cropped).resize(256, 256).png().toFile(out + "logo-mark.png");

const bg = { r: 17, g: 24, b: 39, alpha: 1 }; // koyu lacivert-gri zemin
async function onBg(size, pad, file) {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(cropped).resize(inner, inner).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(out + file);
}
await onBg(192, 0.04, "icon-192.png");
await onBg(512, 0.04, "icon-512.png");
await onBg(512, 0.14, "icon-maskable-512.png");
await onBg(180, 0.06, "apple-touch-icon.png");
await onBg(48, 0.02, "favicon-48.png");
console.log("ok");
