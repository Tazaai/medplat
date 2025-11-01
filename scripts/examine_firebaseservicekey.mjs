#!/usr/bin/env node
import fs from 'fs';
const file = process.argv[2] || '.env.local';
if (!fs.existsSync(file)) { console.error('file not found', file); process.exit(2); }
const txt = fs.readFileSync(file, 'utf8');
const key = 'FIREBASE_SERVICE_KEY';
const idx = txt.indexOf(key);
if (idx===-1) { console.error('FIREBASE_SERVICE_KEY not found'); process.exit(3); }
const eq = txt.indexOf('=', idx);
const brace = txt.indexOf('{', eq);
if (brace===-1) { console.error('No { after ='); process.exit(4); }
let i=brace; let depth=0; let inString=false; let prev='';
for (; i<txt.length; i++){
  const ch = txt[i];
  if (ch==='"' && prev!=='\\') inString = !inString;
  if (!inString){ if (ch==='{') depth++; else if (ch==='}') { depth--; if (depth===0) break; } }
  prev=ch;
}
if (depth!==0) { console.error('Could not find matching }'); process.exit(5); }
const json = txt.slice(brace, i+1);
console.log('extracted length:', json.length);
console.log('startsWith { ?', json.trim().startsWith('{'));
console.log('endsWith } ?', json.trim().endsWith('}'));
console.log('first 8 chars (masked):', json.slice(0,4).replace(/./g,'*') + json.slice(4,8).replace(/./g,'*'));
console.log('last 8 chars (masked):', json.slice(-8).replace(/./g,'*'));
try{ JSON.parse(json); console.log('JSON parse: OK'); process.exit(0);}catch(e){ console.error('JSON parse error:', e.message); process.exit(6);} 
