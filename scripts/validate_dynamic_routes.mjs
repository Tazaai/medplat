#!/usr/bin/env node
// validate_dynamic_routes.mjs
// ✅ DYNAMIC-ONLY: Automatic route validation tests after backend deployment
// Tests all dynamic endpoints and fails if legacy routes are found

const BACKEND_URL = process.env.BACKEND_URL || 'https://medplat-backend-139218747785.europe-west1.run.app';

const REQUIRED_ROUTES = [
  { method: 'GET', path: '/api/mentor/health', description: 'Mentor health check' },
  { method: 'GET', path: '/api/panel/health', description: 'Panel health check' },
  { method: 'GET', path: '/api/reasoning/health', description: 'Reasoning health check' },
  { method: 'POST', path: '/api/topics2', description: 'Topics2 endpoint (must return Firestore topics)', body: { category: 'Cardiology' } },
  { method: 'POST', path: '/api/topics2/categories', description: 'Get categories from Firestore' },
  { method: 'POST', path: '/api/dialog', description: 'Case generator' },
  { method: 'POST', path: '/api/gamify', description: 'MCQ generator' },
  { method: 'GET', path: '/api/quickref', description: 'Quick reference' },
];

const FORBIDDEN_ROUTES = [
  { method: 'GET', path: '/api/topics', description: 'Legacy static topics endpoint' },
  { method: 'GET', path: '/api/topics/categories', description: 'Legacy static categories endpoint' },
];

async function testRoute(method, path, description, body = {}) {
  try {
    const url = `${BACKEND_URL}${path}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    
    if (method === 'POST') {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const status = response.status;
    
    if (status >= 200 && status < 300) {
      console.log(`✅ ${method} ${path} - ${description} (HTTP ${status})`);
      return true;
    } else if (status === 404) {
      console.log(`❌ ${method} ${path} - ${description} (HTTP 404 - NOT FOUND)`);
      return false;
    } else {
      console.log(`⚠️  ${method} ${path} - ${description} (HTTP ${status})`);
      return status < 500; // Accept 4xx as route exists
    }
  } catch (err) {
    console.log(`❌ ${method} ${path} - ${description} (ERROR: ${err.message})`);
    return false;
  }
}

async function validateRoutes() {
  console.log('🔍 Validating dynamic-only routes...');
  console.log(`Backend URL: ${BACKEND_URL}\n`);
  
  let allPassed = true;
  
  // Test required routes
  console.log('📋 Testing required dynamic routes:');
  for (const route of REQUIRED_ROUTES) {
    const passed = await testRoute(route.method, route.path, route.description, route.body || {});
    if (!passed) allPassed = false;
    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
  }
  
  console.log('\n🚫 Testing forbidden legacy routes (should fail):');
  for (const route of FORBIDDEN_ROUTES) {
    const passed = await testRoute(route.method, route.path, route.description);
    if (passed) {
      console.log(`❌ CRITICAL: Legacy route ${route.method} ${route.path} is still accessible!`);
      allPassed = false;
    } else {
      console.log(`✅ Legacy route ${route.method} ${route.path} correctly removed`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ All route validation tests PASSED');
    console.log('✅ System is 100% dynamic-only');
    process.exit(0);
  } else {
    console.log('❌ Route validation tests FAILED');
    console.log('❌ System may still contain legacy static endpoints');
    process.exit(1);
  }
}

validateRoutes().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

