const fs = require('fs');
const path = require('path');

const aliases = [
  { src: 'public/images/products/jjk-vol-01.jpg', dest: 'public/images/products/jjk-v1.jpg' },
  { src: 'public/images/products/frieren-vol-01.jpg', dest: 'public/images/products/frieren-v1.jpg' },
  { src: 'public/images/products/chainsaw-vol-01.jpg', dest: 'public/images/products/csm-v1.jpg' },
  { src: 'public/images/products/sololeveling-vol-01.jpg', dest: 'public/images/products/ln-sl-v1.jpg' },
  { src: 'public/images/products/figure-2001.jpg', dest: 'public/images/products/fig-2001.jpg' },
  { src: 'public/images/products/figure-2002.jpg', dest: 'public/images/products/fig-2002.jpg' },
];

for (const { src, dest } of aliases) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${src} -> ${dest}`);
  } else {
    console.error(`Source not found: ${src}`);
  }
}
