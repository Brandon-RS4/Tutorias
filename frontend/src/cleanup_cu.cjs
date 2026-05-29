const fs = require('fs');
const path = require('path');

const srcDir = __dirname;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk(srcDir);
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  content = content.replace(/CU\d+:\s*/g, '');
  content = content.replace(/\s*\(CU\d+\)/g, '');
  // specific replacements
  content = content.replace(/ \u2013 CU09/g, '');
  content = content.replace(/ CU02 Asignar/g, ' Asignar');
  content = content.replace(/ CU03 Asignar/g, ' Asignar');
  content = content.replace(/ para CU12/g, '');
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
