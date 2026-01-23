/**
 * Supabase Sync Test Script
 * =========================
 * Tests if the Supabase RPC functions exist and can accept data
 * 
 * Run with: node test-supabase-sync.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSupabaseConnection() {
  console.log('\n🔍 Testing Supabase Connection...');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);

  // Test 1: Anonymous sign-in
  console.log('\n📝 Test 1: Anonymous Sign-In');
  const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
  
  if (authError) {
    console.error('❌ Anonymous sign-in failed:', authError.message);
    return false;
  }
  
  console.log('✅ Anonymous sign-in successful');
  console.log(`   User ID: ${authData.user.id}`);

  // Test 2: Check if tables exist
  console.log('\n📝 Test 2: Check Tables');
  const tables = ['users', 'leaf_scans', 'diagnoses', 'recommendations'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('id').limit(1);
    
    if (error) {
      console.error(`❌ Table '${table}' error:`, error.message);
    } else {
      console.log(`✅ Table '${table}' exists (${data ? data.length : 0} records)`);
    }
  }

  // Test 3: Check RPC functions
  console.log('\n📝 Test 3: Check RPC Functions');
  const rpcFunctions = [
    'sync_leaf_scans_batch',
    'sync_diagnoses_batch',
    'sync_recommendations_batch',
    'get_changes_since'
  ];

  for (const funcName of rpcFunctions) {
    try {
      // Test with empty data
      const testParam = funcName.includes('get_changes') 
        ? { table_name: 'leaf_scans', since_timestamp: '1970-01-01T00:00:00Z' }
        : funcName.includes('leaf_scans')
        ? { scans_data: [] }
        : funcName.includes('diagnoses')
        ? { diagnoses_data: [] }
        : { recommendations_data: [] };

      const { data, error } = await supabase.rpc(funcName, testParam);
      
      if (error) {
        if (error.message.includes('Could not find the function')) {
          console.error(`❌ RPC '${funcName}' NOT FOUND - needs to be deployed`);
        } else {
          console.error(`❌ RPC '${funcName}' error:`, error.message);
        }
      } else {
        console.log(`✅ RPC '${funcName}' exists and callable`);
        console.log(`   Response:`, JSON.stringify(data).substring(0, 100));
      }
    } catch (err) {
      console.error(`❌ RPC '${funcName}' exception:`, err.message);
    }
  }

  // Test 4: Try to push a test scan
  console.log('\n📝 Test 4: Push Test Data');
  const testScan = {
    id: '00000000-0000-0000-0000-000000000001',
    scan_uuid: 'test-scan-' + Date.now(),
    crop_id: 1,
    image_path: '/test/path.jpg',
    image_filename: 'test.jpg',
    status: 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  const { data: pushData, error: pushError } = await supabase.rpc('sync_leaf_scans_batch', {
    scans_data: [testScan]
  });

  if (pushError) {
    console.error('❌ Push test failed:', pushError.message);
  } else {
    console.log('✅ Push test successful');
    console.log('   Response:', pushData);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log('If you see "NOT FOUND" errors above, you need to:');
  console.log('1. Go to Supabase Dashboard → SQL Editor');
  console.log('2. Run: supabase_schema/01_remote_schema.sql');
  console.log('3. Run: supabase_schema/02_rpc_functions.sql');
  console.log('='.repeat(60));
}

testSupabaseConnection().catch(console.error);
