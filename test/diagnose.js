const fs = require('fs');
const files = ['src/pages/ActivityPage.js','src/pages/SetupPage.js','src/pages/WorkoutPage.js'];
files.forEach(f => {
  const code = fs.readFileSync(f, 'utf8');
  let d = 0;
  let inStr = false, strCh = '';
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (inStr) {
      if (ch === strCh && code[i-1] !== '\\') inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strCh = ch; continue; }
    if (ch === '{') d++;
    if (ch === '}') d--;
  }
  const lines = code.split('\n');
  console.log(f, '-> net braces:', d, '| lines:', lines.length);
  console.log('Last 8 lines:');
  lines.slice(-8).forEach((l, i) => console.log(lines.length - 8 + i + 1 + ':', l));
  console.log('---');
});
