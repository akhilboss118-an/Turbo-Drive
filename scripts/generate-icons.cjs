const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'assets', 'icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const textSvg = Buffer.from(`
  <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="64" fill="#e74c3c"/>
    <rect x="64" y="64" width="384" height="384" rx="32" fill="#c0392b"/>
    <polygon points="256,140 320,260 192,260" fill="white" opacity="0.9"/>
    <rect x="220" y="260" width="72" height="100" rx="8" fill="white" opacity="0.9"/>
    <circle cx="220" cy="370" r="20" fill="#333"/>
    <circle cx="292" cy="370" r="20" fill="#333"/>
    <circle cx="220" cy="200" r="16" fill="#f1c40f"/>
    <circle cx="284" cy="200" r="16" fill="#f1c40f"/>
  </svg>
`);

async function generate() {
  for (const size of sizes) {
    await sharp(textSvg)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
    console.log(`Generated ${size}x${size} icon`);
  }
}

generate().catch(console.error);
