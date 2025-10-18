#!/usr/bin/env node

/**
 * Icon Generator for ClassFlow AI PWA
 *
 * This script generates PNG icons from the SVG source.
 *
 * Usage:
 * 1. Install sharp: npm install --save-dev sharp
 * 2. Run: node scripts/generate-icons.js
 *
 * Or use the browser-based generator at: public/generate-icons.html
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('📱 ClassFlow AI Icon Generator');
console.log('');
console.log('⚠️  This script requires the "sharp" package.');
console.log('   Install it with: npm install --save-dev sharp');
console.log('');
console.log('💡 Alternative: Open public/generate-icons.html in a browser');
console.log('   and download the icons manually.');
console.log('');

try {
  const sharp = await import('sharp');

  const svgPath = join(__dirname, '../public/icon.svg');
  const svgBuffer = readFileSync(svgPath);

  // Generate 192x192 icon
  await sharp.default(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(join(__dirname, '../public/icon-192.png'));

  console.log('✅ Generated icon-192.png');

  // Generate 512x512 icon
  await sharp.default(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(__dirname, '../public/icon-512.png'));

  console.log('✅ Generated icon-512.png');
  console.log('');
  console.log('🎉 All icons generated successfully!');

} catch (error) {
  if (error.code === 'ERR_MODULE_NOT_FOUND') {
    console.log('❌ Sharp package not found.');
    console.log('');
    console.log('Please choose one of these options:');
    console.log('');
    console.log('Option 1 - Install sharp and run this script:');
    console.log('  npm install --save-dev sharp');
    console.log('  node scripts/generate-icons.js');
    console.log('');
    console.log('Option 2 - Use the browser-based generator:');
    console.log('  1. Open: public/generate-icons.html in a browser');
    console.log('  2. Click "Download Both Icons"');
    console.log('  3. Move the downloaded files to public/');
    console.log('');
  } else {
    console.error('❌ Error generating icons:', error.message);
  }
  process.exit(1);
}
