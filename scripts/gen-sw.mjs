// public/sw.js dosyasını üretir: derleme sürümü + tüm uygulama sayfaları (çevrimdışı önbellek için)
// npm run build öncesinde otomatik çalışır (prebuild).
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const appDir = join(root, "src/app");
const routes = new Set();

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name === "page.tsx") {
      const rel = relative(appDir, dir)
        .split(sep)
        .filter((seg) => seg && !seg.startsWith("("));
      if (rel.some((seg) => seg.startsWith("["))) continue; // dinamik sayfalar
      routes.add("/" + rel.join("/"));
    }
  }
}
walk(appDir);
routes.delete("/");

const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? Date.now().toString(36);
const tpl = readFileSync(join(root, "scripts/sw.template.js"), "utf8");
writeFileSync(join(root, "public/sw.js"), tpl.replace("__VERSION__", version).replace("__ROUTES__", JSON.stringify([...routes].sort())));
console.log(`sw.js: sürüm ${version}, ${routes.size} sayfa`);
