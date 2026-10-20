const fs = require('fs');
if (fs.existsSync('public/images')) {
  console.log('public/images:', fs.readdirSync('public/images'));
}
if (fs.existsSync('public/images/products')) {
  const p = fs.readdirSync('public/images/products');
  console.log('products count:', p.length);
  console.log('All files:', p);
}
