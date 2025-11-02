// Simple integration test for /api/topics/search
// Usage: node test/integration/topics_search_integration.mjs

const BACKEND = process.env.BACKEND_BASE || 'http://localhost:8080';
const TIMEOUT = 10000;

async function main(){
  console.log('Integration test: topics search against', BACKEND);
  const healthRes = await fetch(`${BACKEND}/`);
  if(!healthRes.ok){
    console.error('Health check failed:', healthRes.status);
    process.exitCode = 2;
    return;
  }
  console.log('Health OK');

  const res = await fetch(`${BACKEND}/api/topics/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: '' }),
    // add short timeout by racing with a promise
  });

  if(!res.ok){
    console.error('Search request failed:', res.status);
    process.exitCode = 3;
    return;
  }

  const data = await res.json();
  if(typeof data !== 'object' || !('topics' in data)){
    console.error('Unexpected response shape:', data);
    process.exitCode = 4;
    return;
  }

  console.log('Search OK — topics.length =', Array.isArray(data.topics) ? data.topics.length : 'unknown');
  process.exitCode = 0;
}

main().catch(err=>{
  console.error('Test error:', err);
  process.exitCode = 1;
});
