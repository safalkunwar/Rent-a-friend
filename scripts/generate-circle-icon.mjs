import sharp from 'sharp';

const svg = `<svg width="1024" height="1024"><circle cx="512" cy="512" r="512" fill="black"/></svg>`;

await sharp('public/sathi-logo.jpeg')
  .resize(1024, 1024, { fit: 'cover', position: 'centre' })
  .composite([{ input: Buffer.from(svg), blend: 'dest-in' }])
  .png()
  .toFile('public/sathi-logo-circle.png');

console.log('generated public/sathi-logo-circle.png');
