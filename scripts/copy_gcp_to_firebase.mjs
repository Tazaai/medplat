#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ENV = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(ENV)) {
  console.error('.env.local not found');
  process.exit(2);
}
const txt = fs.readFileSync(ENV, 'utf8');
const srcKey = 'GCP_SA_KEY';
const dstKey = 'FIREBASE_SERVICE_KEY';
if (txt.includes(dstKey)) {
  console.log(`${dstKey} already present in .env.local; no action taken`);
  process.exit(0);
}
const idx = txt.indexOf(srcKey);
if (idx === -1) {
  console.error(`${srcKey} not found in .env.local`);
  process.exit(3);
}
const eq = txt.indexOf('=', idx);
if (eq === -1) {
  console.error(`No '=' after ${srcKey}`);
  process.exit(4);
}
// find opening quote after eq
let i = eq + 1;
while (i < txt.length && txt[i].trim() === '') i++;
const quote = txt[i];
if (quote !== '"' && quote !== "'") {
  console.error(`${srcKey} value not quoted; cannot safely extract`);
  process.exit(5);
}
// extract until matching closing quote (handling escaped quotes)
let j = i + 1;
let prev = '';
for (; j < txt.length; j++) {
  const ch = txt[j];
  if (ch === quote && prev !== '\\') break;
  prev = ch;
}
if (j >= txt.length) {
  console.error(`Could not find closing quote for ${srcKey} value`);
  process.exit(6);
}
const value = txt.slice(i, j+1); // includes surrounding quotes

const backup = ENV + '.bak.' + Date.now();
fs.copyFileSync(ENV, backup);

// Append export FIREBASE_SERVICE_KEY=<value> on a new line
let newTxt = txt.trimEnd() + '\n' + `export ${dstKey}=${value}\n`;
fs.writeFileSync(ENV, newTxt, { mode: 0o600 });
console.log(`Backed up original to ${backup} and added ${dstKey} to .env.local`);
process.exit(0);
