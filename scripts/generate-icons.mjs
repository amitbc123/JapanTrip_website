// One-time script: rasterizes src/assets/app-icon.svg into the PWA icon set.
// Usage: node scripts/generate-icons.mjs
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const SVG_PATH = path.join(ROOT, "src", "assets", "app-icon.svg")
const PUBLIC_DIR = path.join(ROOT, "public")

const MASKABLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#F2EDE4"/>
  <g transform="translate(64 64) scale(0.75)">
    ${(await readFile(SVG_PATH, "utf-8")).replace(/<\/?svg[^>]*>/g, "")}
  </g>
</svg>`

async function main() {
  const svg = await readFile(SVG_PATH)

  await sharp(svg).resize(192, 192).png().toFile(path.join(PUBLIC_DIR, "pwa-192x192.png"))
  await sharp(svg).resize(512, 512).png().toFile(path.join(PUBLIC_DIR, "pwa-512x512.png"))
  await sharp(Buffer.from(MASKABLE_SVG))
    .resize(512, 512)
    .png()
    .toFile(path.join(PUBLIC_DIR, "pwa-maskable-512x512.png"))
  await sharp(svg).resize(180, 180).png().toFile(path.join(PUBLIC_DIR, "apple-touch-icon.png"))

  await writeFile(path.join(PUBLIC_DIR, "favicon.svg"), await readFile(SVG_PATH))

  console.log("Wrote pwa-192x192.png, pwa-512x512.png, pwa-maskable-512x512.png, apple-touch-icon.png, favicon.svg")
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
