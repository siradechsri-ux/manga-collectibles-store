const fs = require('fs');
const path = require('path');

const missing = [];
const checked = new Set();

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') scanDir(full);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.json')) {
      const content = fs.readFileSync(full, 'utf8');
      const matches = content.matchAll(/['"](\/images\/[a-zA-Z0-9_\-\.\/]+)['"]/g);
      for (const m of matches) {
        const imgPath = m[1];
        if (checked.has(imgPath)) continue;
        checked.add(imgPath);

        const diskPath = path.join('public', imgPath);
        if (!fs.existsSync(diskPath)) {
          missing.push({ file: full, imgPath, diskPath });
        }
      }
    }
  }
}

scanDir('src');
console.log('Total unique /images/... paths checked:', checked.size);
console.log('Missing images on disk:', missing);
