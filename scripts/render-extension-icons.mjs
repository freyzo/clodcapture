/**
 * Rasterizes chrome-store/clodcapture_icon_v4.html (512 canvas) into icons/.
 * Run from repo root: node scripts/render-extension-icons.mjs
 * Requires: playwright, sharp (devDependencies).
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'chrome-store', 'clodcapture_icon_v4.html');
const tmpPng = path.join(root, 'icons', '.icon-render-512.png');

if (!fs.existsSync(htmlPath)) {
  console.error('Missing:', htmlPath);
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 700, height: 700 } });
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
await page.locator('#c').waitFor({ state: 'visible' });
await page.waitForTimeout(150);
await page.locator('#c').screenshot({ path: tmpPng });
await browser.close();

const sizes = [128, 48, 16];
const buf = await fs.promises.readFile(tmpPng);
for (const size of sizes) {
  await sharp(buf)
    .resize(size, size, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(root, 'icons', `icon${size}.png`));
}
await fs.promises.unlink(tmpPng);
console.log('Wrote icons/icon128.png icon48.png icon16.png');
