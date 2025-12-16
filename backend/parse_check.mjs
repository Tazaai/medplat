import fs from 'fs';
import { parse } from 'acorn';

function checkFile(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    console.log(`\n=== Parsing ${filepath} ===`);
    
    try {
      parse(content, { 
        ecmaVersion: 'latest', 
        sourceType: 'module',
        locations: true 
      });
      console.log('✅ File parses successfully');
      return true;
    } catch (parseError) {
      console.error(`❌ Parse error at line ${parseError.loc?.line || 'unknown'}, column ${parseError.loc?.column || 'unknown'}:`);
      console.error(`   ${parseError.message}`);
      
      if (parseError.loc) {
        const lines = content.split('\n');
        const errorLine = lines[parseError.loc.line - 1];
        console.error(`\n   Line ${parseError.loc.line}: ${errorLine}`);
        console.error(`   ${' '.repeat(parseError.loc.column - 1)}^`);
      }
      return false;
    }
  } catch (e) {
    console.error(`❌ Failed to read file: ${e.message}`);
    return false;
  }
}

const results = await Promise.all([
  checkFile('./routes/dialog_api.mjs'),
  checkFile('./routes/cases_api.mjs')
]);

process.exit(results.every(r => r) ? 0 : 1);

