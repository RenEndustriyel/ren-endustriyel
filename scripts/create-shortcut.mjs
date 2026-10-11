import { join } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const targetExe = join(root, "Ren Endüstriyel.exe");
const iconPath = join(root, "public", "icons", "app.ico");
const tempVbs = join(process.env.TEMP || "C:\\Windows\\Temp", "make_ren_lnk.vbs");

const vbsContent = [
  'Set oWS = CreateObject("WScript.Shell")',
  'sLinkFile = oWS.SpecialFolders("Desktop") & "\\Ren Endüstriyel.lnk"',
  "Set oLink = oWS.CreateShortcut(sLinkFile)",
  `oLink.TargetPath = "${targetExe.replace(/\\/g, "\\\\")}"`,
  `oLink.WorkingDirectory = "${root.replace(/\\/g, "\\\\")}"`,
  `oLink.IconLocation = "${iconPath.replace(/\\/g, "\\\\")}"`,
  'oLink.Description = "Ren Endüstriyel Ön Muhasebe Masaüstü Uygulaması"',
  "oLink.Save",
].join("\r\n");

writeFileSync(tempVbs, vbsContent, "latin1");
try {
  execSync(`cscript //nologo "${tempVbs}"`);
  console.log("✅ Masaüstüne 'Ren Endüstriyel' kısayolu başarıyla eklendi!");
} catch (err) {
  console.error("Kısayol oluşturulurken hata:", err);
} finally {
  try {
    unlinkSync(tempVbs);
  } catch {}
}
