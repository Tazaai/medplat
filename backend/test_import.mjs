async function testImport(filepath) {
  try {
    console.log(`\nTesting ${filepath}...`);
    const mod = await import(filepath);
    console.log(`✅ ${filepath} imported successfully`);
    console.log(`   Default export type: ${typeof mod.default}`);
    if (typeof mod.default === 'function') {
      const router = mod.default();
      console.log(`   Router created: ${router ? 'yes' : 'no'}`);
      if (router && router.stack) {
        console.log(`   Router has ${router.stack.length} routes`);
      }
    }
    return true;
  } catch (e) {
    console.error(`❌ ${filepath} FAILED:`);
    console.error(`   Error: ${e.message}`);
    if (e.stack) {
      const lines = e.stack.split('\n').slice(0, 5);
      console.error(`   Stack: ${lines.join('\n')}`);
    }
    return false;
  }
}

const results = await Promise.all([
  testImport('./routes/dialog_api.mjs'),
  testImport('./routes/cases_api.mjs')
]);

console.log(`\n=== Results ===`);
console.log(`dialog_api.mjs: ${results[0] ? '✅ OK' : '❌ FAILED'}`);
console.log(`cases_api.mjs: ${results[1] ? '✅ OK' : '❌ FAILED'}`);

