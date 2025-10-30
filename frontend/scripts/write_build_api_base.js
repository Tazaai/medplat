#!/usr/bin/env node
// write_build_api_base.js
// After a build, write the VITE_API_BASE used for the build into dist/VITE_API_BASE.txt
import fs from 'fs';
import path from 'path';

const base = process.env.VITE_API_BASE || '';
const outDir = path.resolve(process.cwd(), 'dist');

try {
  if (!fs.existsSync(outDir)) {
    console.warn('Warning: dist directory does not exist; creating it.');
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(path.join(outDir, 'VITE_API_BASE.txt'), base, { encoding: 'utf8' });
  console.log(`Wrote VITE_API_BASE to ${path.join(outDir, 'VITE_API_BASE.txt')}`);
} catch (err) {
  console.error('Failed to write VITE_API_BASE.txt:', err);
  process.exit(1);
}
