const fs = require('fs');
const files = fs.readdirSync('public/images/products');
console.log('jjk:', files.filter(f => f.includes('jjk') || f.includes('jujutsu')));
console.log('figures:', files.filter(f => f.includes('figure') || f.includes('fig')));
console.log('frieren:', files.filter(f => f.includes('frieren')));
console.log('chainsaw:', files.filter(f => f.includes('chainsaw') || f.includes('csm')));
console.log('solo leveling / ln:', files.filter(f => f.includes('solo') || f.includes('ln')));
