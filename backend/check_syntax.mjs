import fs from 'fs';

function checkFile(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    console.log(`\n=== Checking ${filepath} ===`);
    console.log(`File length: ${content.length} characters`);
    console.log(`Last 200 chars: ${content.slice(-200)}`);
    
    // Try to parse as module
    new Function('return ' + content)();
    console.log('✅ Syntax appears valid');
  } catch (e) {
    console.error(`❌ Syntax error: ${e.message}`);
    console.error(`Stack: ${e.stack}`);
  }
}

checkFile('./routes/dialog_api.mjs');
checkFile('./routes/cases_api.mjs');

