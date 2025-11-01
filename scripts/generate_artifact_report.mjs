#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = path.resolve(process.cwd(), 'tmp', 'actions-artifacts');
const outPath = path.join(ARTIFACTS_DIR, 'VITE_API_BASE_report.md');

function findFiles(dir, name) {
  const res = [];
  if (!fs.existsSync(dir)) return res;
  for (const runId of fs.readdirSync(dir)) {
    const candidate = path.join(dir, runId, name);
    if (fs.existsSync(candidate)) res.push({ runId, path: candidate });
  }
  return res;
}

function readRunLog(dir, runId) {
  const p = path.join(dir, runId, 'run.log');
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

function extractTimestampFromLog(logText) {
  if (!logText) return '';
  const m = logText.match(/(Started|Job started|Run started)[: ]+(.+)/i);
  if (m) return m[2];
  // fallback: first date-like substring
  const m2 = logText.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  return m2 ? m2[0] : '';
}

function main() {
  const files = findFiles(ARTIFACTS_DIR, path.join('frontend-dist', 'VITE_API_BASE.txt'));
  if (files.length === 0) {
    console.error('No VITE_API_BASE artifacts found under', ARTIFACTS_DIR);
    process.exit(1);
  }

  const lines = ['# VITE_API_BASE report', '', '| run-id | vite_api_base | run-log-snippet |', '|---|---|---|'];
  for (const f of files.sort((a,b)=>b.runId.localeCompare(a.runId))) {
    const txt = fs.readFileSync(f.path, 'utf8').trim();
    const log = readRunLog(ARTIFACTS_DIR, f.runId);
    const ts = extractTimestampFromLog(log);
    const snippet = log ? log.split('\n').slice(0,3).join(' | ') : '';
    lines.push(`| ${f.runId} | ${txt} | ${ts} ${snippet ? '| ' + snippet : ''} |`);
  }

  fs.writeFileSync(outPath, lines.join('\n') + '\n');
  console.log('Wrote report to', outPath);
}

main();
