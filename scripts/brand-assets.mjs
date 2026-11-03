import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
const source = path.resolve(process.env.EFLOW_WEB_SOURCE || "../EflowWeb");
fs.copyFileSync(path.join(source, "public/icon.svg"), "assets/eflow-mark.svg");
for (const [name, size, src, padding] of [
  ["eflow-icon.png", 1024, "assets/eflow-mark.svg", 180],
  ["eflow-splash.png", 640, "assets/eflow-logo.svg", 40],
]) {
  const svg = fs.readFileSync(src, "utf8").replace(/<\?xml[^>]+\?>/g, "");
  const inner = svg.replace(
    /<svg\b([^>]*)>/,
    (_match, attributes) =>
      `<svg ${attributes.replace(/\s(?:width|height)="[^"]*"/g, "")} x="${padding}" y="${padding}" width="${size - padding * 2}" height="${size - padding * 2}" preserveAspectRatio="xMidYMid meet">`,
  );
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="100%" height="100%" fill="#fff"/>${inner}</svg>`;
  fs.writeFileSync(path.join("assets", name), new Resvg(xml).render().asPng());
}
console.log("Rendered native icon and launch assets from existing eFlow SVGs.");
