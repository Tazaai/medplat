#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || '.env.local';
const text = fs.readFileSync(file, 'utf8');
const lines = text.split(/\r?\n/);
let out = [];
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  if (!line.trim()) { i++; continue; }
  if (line.trim().startsWith('#')) { out.push(line); i++; continue; }
  // handle export VAR="... (possibly multiline JSON) ..."
  const m = line.match(/^\s*export\s+([A-Za-z_][A-Za-z0-9_]*)=("|')?(.*)$/);
  if (m) {
    const name = m[1];
    const quote = m[2];
    let rest = m[3] || '';
    if (quote === '"') {
      // if rest contains ending ", it's single-line
      if (rest.endsWith('"')) {
        const val = rest.slice(0, -1);
        out.push(`${name}='${val.replace(/'/g, "'\\\"'\\\"")}'`);
        i++; continue;
      }
      // multiline: gather until a line that ends with "
      let buf = rest + '\n';
      i++;
      while (i < lines.length && !lines[i].endsWith('"')) {
        buf += lines[i] + '\n';
        i++;
      }
      if (i < lines.length) {
        // include last line without trailing quote
        buf += lines[i].slice(0, -1);
        i++;
      }
      const single = buf.replace(/\\n/g, '\\\\n').replace(/'/g, "'\\\"'\\\"");
      out.push(`${name}='${single.replace(/\n/g, "\\n")}'`);
      continue;
    }
    // no starting double-quote, just export raw value
    out.push(line.replace(/^\s*export\s+/, ''));
    i++; continue;
  }
  // fallback: pass through
  out.push(line);
  i++;
}
process.stdout.write(out.join('\n'));
