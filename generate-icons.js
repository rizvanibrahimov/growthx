const sharp = require('sharp');
const path = require('path');

const SOURCE = path.join(__dirname, 'GrowthX_Avatar_1024.png');
const OUT_DIR = path.join(__dirname, 'client', 'public', 'app-icons');

const SIZES = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512];

async function generate() {
  for (const size of SIZES) {
    const outPath = path.join(OUT_DIR, `icon-${size}.png`);
    await sharp(SOURCE)
      .resize(size, size, { fit: 'cover', background: { r: 10, g: 11, b: 15, alpha: 1 } })
      .png()
      .toFile(outPath);
    console.log(`✓ icon-${size}.png`);
  }
  console.log('\nAll icons generated!');
}

generate().catch(console.error);
