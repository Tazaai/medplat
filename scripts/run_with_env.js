#!/usr/bin/env node
const fs = require('fs');
const { spawnSync } = require('child_process');

function parseEnvFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const env = {};
  let i = 0;
  while (i < lines.length) {
    let line = lines[i].trim();
    i++;
    if (!line || line.startsWith('#')) continue;
    // remove leading export if present
    if (line.startsWith('export ')) line = line.slice('export '.length);
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq);
    let val = line.slice(eq + 1);
    // if val starts with double-quote and doesn't end with double-quote, gather multiline
    if (val.startsWith('"') && !val.endsWith('"')) {
      val = val.slice(1) + '\n';
      while (i < lines.length && !lines[i].endsWith('"')) {
        val += lines[i] + '\n';
        i++;
      }
      if (i < lines.length) {
        val += lines[i].slice(0, -1);
        i++;
      }
    } else if (val.startsWith("'") && !val.endsWith("'")) {
      // single-quoted multiline
      val = val.slice(1) + '\n';
      while (i < lines.length && !lines[i].endsWith("'")) {
        val += lines[i] + '\n';
        i++;
      }
      if (i < lines.length) {
        val += lines[i].slice(0, -1);
        i++;
      }
    } else {
      // strip surrounding quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
    }
    env[key] = val;
  }
  return env;
}

function run(cmd, env) {
  console.log(`\n>>> Running: ${cmd}`);
  const r = spawnSync('bash', ['-lc', cmd], { stdio: 'inherit', env });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`Command failed: ${cmd} (exit ${r.status})`);
}

const envFile = process.argv[2] || '.env.local';
if (!fs.existsSync(envFile)) {
  console.error(`Env file not found: ${envFile}`);
  process.exit(1);
}
const envFromFile = parseEnvFile(envFile);
const mergedEnv = Object.assign({}, process.env, envFromFile);

try {
  run('bash review_report.sh', mergedEnv);
  run('bash test_backend_local.sh', mergedEnv);
  console.log('\nAll checks passed');
} catch (e) {
  console.error('\nError during checks:', e.message);
  process.exit(1);
}
