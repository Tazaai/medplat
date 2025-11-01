#!/usr/bin/env node
// Validate that an env var or file contains valid JSON.
import fs from 'fs';

const arg = process.argv[2];
const fileArg = process.argv[3];
if (!arg) {
  console.error('Usage: validate_secret_json.mjs <ENV_VAR_NAME> [path/to/.env.file]');
  process.exit(2);
}

function tryParse(jsonText) {
  try {
    JSON.parse(jsonText);
    return true;
  } catch (err) {
    return err.message;
  }
}

async function main() {
  // If a filename is provided, try to parse the env file and extract the var
  if (fileArg && fs.existsSync(fileArg)) {
    const text = fs.readFileSync(fileArg, 'utf8');
    const lines = text.split(/\r?\n/);
    let i = 0;
    let found = false;
    let val = '';
    while (i < lines.length) {
      let line = lines[i];
      i++;
      if (!line || line.trim().startsWith('#')) continue;
      // remove leading export if present
      if (line.trim().startsWith('export ')) {
        line = line.replace(/export\s+/, '');
      }
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let v = line.slice(eq + 1);
      v = v.trim();
      if ((v.startsWith('"') && !v.endsWith('"')) || (v.startsWith("'") && !v.endsWith("'"))) {
        // multiline
        const quote = v[0];
        v = v.slice(1) + '\n';
        while (i < lines.length && !lines[i].endsWith(quote)) {
          v += lines[i] + '\n';
          i++;
        }
        if (i < lines.length) {
          v += lines[i].slice(0, -1);
          i++;
        }
      } else {
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
      }
      if (key === arg) {
        found = true;
        val = v;
        break;
      }
    }
    if (!found) {
      console.error(`ERROR: ${arg} not found in ${fileArg}`);
      process.exit(3);
    }
    const ok = tryParse(val);
    if (ok === true) {
      console.log(`OK: ${arg} in ${fileArg} contains valid JSON`);
      process.exit(0);
    } else {
      console.error(`ERROR: ${arg} in ${fileArg} invalid JSON: ${ok}`);
      process.exit(1);
    }
  }

  // Otherwise treat as env var name
  const val = process.env[arg];
  if (typeof val === 'undefined') {
    console.error(`ERROR: env var ${arg} is not set`);
    process.exit(3);
  }
  const ok = tryParse(val);
  if (ok === true) {
    console.log(`OK: env var ${arg} contains valid JSON`);
    process.exit(0);
  } else {
    console.error(`ERROR: env var ${arg} invalid JSON: ${ok}`);
    process.exit(1);
  }
}

main();
