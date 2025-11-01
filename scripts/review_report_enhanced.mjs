#!/usr/bin/env node
// Enhanced review runner for MedPlat
// - Runs ./review_report.sh
// - Saves raw logs to tmp/logs/review_report_raw_<ts>.log
// - Writes a short markdown summary tmp/logs/agent_enhanced_<ts>.md

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const logsDir = path.resolve(process.cwd(), 'tmp', 'logs');
await fs.mkdir(logsDir, { recursive: true });

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const rawLog = path.join(logsDir, `review_report_raw_${ts}.log`);
const summaryMd = path.join(logsDir, `agent_enhanced_${ts}.md`);

function runCommand(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d.toString(); process.stdout.write(d); });
    child.stderr.on('data', (d) => { err += d.toString(); process.stderr.write(d); });
    child.on('close', (code) => resolve({ code: code ?? 0, stdout: out, stderr: err }));
  });
}

console.log(`▶ Running review_report.sh (enhanced) — logs -> ${rawLog}`);
const res = await runCommand('bash', ['./review_report.sh']);
await fs.writeFile(rawLog, res.stdout + '\n' + res.stderr, 'utf8');

// Produce a compact summary: first lines that include emoji status markers
const lines = (res.stdout || '').split(/\r?\n/);
const statusLines = lines.filter(l => /✅|⚠️|❌|🚨|READY FOR DEPLOYMENT|NOT READY|Local backend smoke tests|Health OK|Topics OK|Dialog OK|Gamify OK/i.test(l));

const header = `# MedPlat Enhanced Diagnostic Report\n\n- Timestamp: ${new Date().toISOString()}\n- Command: bash review_report.sh\n- Exit code: ${res.code}\n\n`;
let summary = `${header}## Summary (extracted)\n`;
if (statusLines.length) {
  summary += statusLines.map(s => `- ${s}`).join('\n') + '\n\n';
} else {
  summary += '- (no status lines extracted)\n\n';
}

summary += '---\n\n## Full log (raw)\n\n';
summary += res.stdout || '';
if (res.stderr) summary += '\n\n[stderr]\n' + res.stderr;

await fs.writeFile(summaryMd, summary, 'utf8');
console.log(`✔ Enhanced agent summary written to ${summaryMd}`);
console.log(`✔ Raw log written to ${rawLog}`);

// Exit with the same code as the underlying script
process.exit(res.code ?? 0);
