#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ENV_FILE = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(ENV_FILE)) {
  console.error('.env.local not found in project root');
  process.exit(2);
}

const txt = fs.readFileSync(ENV_FILE, 'utf8');
const keyName = 'FIREBASE_SERVICE_KEY';
const idx = txt.indexOf(keyName);
if (idx === -1) {
  console.error('FIREBASE_SERVICE_KEY not found in .env.local');
  process.exit(3);
}

// Find the '=' after the key name
const eqIdx = txt.indexOf('=', idx);
if (eqIdx === -1) {
  console.error('No = after FIREBASE_SERVICE_KEY');
  process.exit(4);
}

// Find the first brace '{' after the '='
const braceStart = txt.indexOf('{', eqIdx);
if (braceStart === -1) {
  console.error('No JSON object start "{" found after FIREBASE_SERVICE_KEY');
  process.exit(5);
}

// Brace matching to find the end '}' (naive but works for well-formed JSON)
let i = braceStart;
let depth = 0;
let inString = false;
let prevChar = '';
for (; i < txt.length; i++) {
  const ch = txt[i];
  if (ch === '"' && prevChar !== '\\') inString = !inString;
  if (!inString) {
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        break;
      }
    }
  }
  prevChar = ch;
}

if (depth !== 0) {
  console.error('Could not find matching closing } for FIREBASE_SERVICE_KEY JSON block');
  process.exit(6);
}

const jsonEnd = i; // index of '}'
const jsonText = txt.slice(braceStart, jsonEnd + 1);

// We'll write the JSON as a single-line raw JSON value wrapped in single quotes
// This preserves internal double quotes and avoids double-escaping.
const singleLineRaw = jsonText.replace(/\r?\n/g, '');
const before = txt.slice(0, eqIdx + 1);
const after = txt.slice(jsonEnd + 1);
const newVal = "'" + singleLineRaw + "'";
const newTxt = before + newVal + after;

// Backup
const backup = ENV_FILE + '.bak.' + Date.now();
fs.copyFileSync(ENV_FILE, backup);
fs.writeFileSync(ENV_FILE, newTxt, { mode: 0o600 });

console.log('Backed up .env.local to', backup);
console.log('Rewrote FIREBASE_SERVICE_KEY in .env.local to a single-line quoted JSON (new file saved, secrets not printed)');
process.exit(0);
