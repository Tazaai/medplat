#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ENV = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(ENV)) {
  console.error('.env.local not found');
  process.exit(2);
}
let s = fs.readFileSync(ENV, 'utf8');
const backup = ENV + '.bak.sanitized.' + Date.now();
fs.copyFileSync(ENV, backup);

// Fix common bad trailing sequences like }'"" -> }'
const orig = "}'\"\"";
if (s.includes(orig)) {
  s = s.replace(orig, "}'\n");
  fs.writeFileSync(ENV, s, { mode: 0o600 });
  console.log('Rewrote .env.local (fixed', orig, '). Backup at', backup);
  process.exit(0);
} else {
  console.log('No known bad patterns found in .env.local. Backup at', backup);
  process.exit(0);
}
