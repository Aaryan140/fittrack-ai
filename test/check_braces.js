// test/check_braces.js — JSX-aware brace checker
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).flatMap(f => {
    const full = path.join(dir, f);
    return fs.statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(path.join(ROOT, 'src')).filter(f => f.endsWith('.js'));

let allOk = true;

files.forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  const rel  = path.relative(ROOT, file);

  // Strip all string/template literals before counting braces
  // This handles style={{ }}, template literals ${}, JSX strings, etc.
  let stripped = '';
  let i = 0;
  while (i < code.length) {
    // Skip line comments
    if (code[i] === '/' && code[i+1] === '/') {
      while (i < code.length && code[i] !== '\n') i++;
      stripped += '\n';
      continue;
    }
    // Skip block comments
    if (code[i] === '/' && code[i+1] === '*') {
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i+1] === '/')) { stripped += ' '; i++; }
      i += 2;
      continue;
    }
    // Skip template literals (handles ${} inside)
    if (code[i] === '`') {
      i++;
      let depth = 0;
      while (i < code.length) {
        if (code[i] === '\\') { i += 2; continue; }
        if (code[i] === '$' && code[i+1] === '{') { depth++; i += 2; continue; }
        if (code[i] === '}' && depth > 0) { depth--; i++; continue; }
        if (code[i] === '`' && depth === 0) { i++; break; }
        i++;
      }
      continue;
    }
    // Skip double-quoted strings
    if (code[i] === '"') {
      i++;
      while (i < code.length && !(code[i] === '"' && code[i-1] !== '\\')) i++;
      i++;
      continue;
    }
    // Skip single-quoted strings
    if (code[i] === "'") {
      i++;
      while (i < code.length && !(code[i] === "'" && code[i-1] !== '\\')) i++;
      i++;
      continue;
    }
    stripped += code[i];
    i++;
  }

  // Now count only real braces
  let depth = 0;
  for (const ch of stripped) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
  }

  if (depth !== 0) {
    console.log('MISMATCH', rel, 'net='+depth);
    allOk = false;
  }
});

if (allOk) {
  console.log('OK all ' + files.length + ' files have balanced braces');
} else {
  process.exit(1);
}
