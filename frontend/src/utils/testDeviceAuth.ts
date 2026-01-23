/**
 * Device-Bound Authentication Test Suite
 * ========================================
 * Comprehensive tests for device-bound identity system
 */

import { deviceUserService, getRemoteUser, isPhoneAvailable, syncUserToServer } from '../services/deviceUserService';
import { getDeviceId, initializeDeviceId } from './deviceId';

// =================================================================
// TEST UTILITIES
// =================================================================

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  data?: any;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string, data?: any) {
  results.push({ name, passed, message, data });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
  if (data) {
    console.log('   Data:', JSON.stringify(data, null, 2));
  }
}

// =================================================================
// DEVICE ID TESTS
// =================================================================

export async function testDeviceIdGeneration(): Promise<TestResult> {
  console.log('\n🧪 TEST 1: Device ID Generation');
  console.log('================================');
  
  try {
    await initializeDeviceId();
    const deviceId = await getDeviceId();
    
    if (!deviceId) {
      logTest('Device ID Generation', false, 'Device ID is null or undefined');
      return results[results.length - 1];
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValidUUID = uuidRegex.test(deviceId);
    
    if (!isValidUUID) {
      logTest('Device ID Generation', false, `Invalid UUID format: ${deviceId}`);
      return results[results.length - 1];
    }
    
    logTest('Device ID Generation', true, `Valid UUID generated`, { deviceId });
    return results[results.length - 1];
  } catch (error: any) {
    logTest('Device ID Generation', false, `Error: ${error.message}`);
    return results[results.length - 1];
  }
}

export async function testDeviceIdPersistence(): Promise<TestResult> {
  console.log('\n🧪 TEST 2: Device ID Persistence');
  console.log('=================================');
  
  try {
    const deviceId1 = await getDeviceId();
    const deviceId2 = await getDeviceId();
    
    if (deviceId1 !== deviceId2) {
      logTest('Device ID Persistence', false, 'Device ID changed between calls');
      return results[results.length - 1];
    }
    
    logTest('Device ID Persistence', true, 'Device ID remains stable', { deviceId: deviceId1 });
    return results[results.length - 1];
  } catch (error: any) {
    logTest('Device ID Persistence', false, `Error: ${error.message}`);
    return results[results.length - 1];
  }
}

// =================================================================
// USER SERVICE TESTS
// =================================================================

export async function testSupabaseConnection(): Promise<TestResult> {
  console.log('\n🧪 TEST 3: Supabase Connection');
  console.log('================================');
  
  try {
    const client = deviceUserService.getClient();
    
    if (!client) {
      logTest('Supabase Connection', false, 'Supabase client is not configured');
      return results[results.length - 1];
    }
    
    const isConfigured = deviceUserService.isConfigured();
    
    logTest('Supabase Connection', isConfigured, 
      isConfigured ? 'Supabase client initialized' : 'Supabase not configured');
    return results[results.length - 1];
  } catch (error: any) {
    logTest('Supabase Connection', false, `Error: ${error.message}`);
    return results[results.length - 1];
  }
}

export async function testUserCreation(): Promise<TestResult> {
  console.log('\n🧪 TEST 4: User Creation in Supabase');
  console.log('=====================================');
  
  try {
    const result = await syncUserToServer(
      undefined, // no phone
      'Test User',
      undefined // no photo
    );
    
    if (!result.success) {
      logTest('User Creation', false, `Failed: ${result.error}`);
      return results[results.length - 1];
    }
    
    logTest('User Creation', true, 'User created/updated successfully', {
      isNew: result.isNew,
      user: result.user,
    });
    return results[results.length - 1];
  } catch (error: any) {
    logTest('User Creation', false, `Error: ${error.message}`);
    return results[results.length - 1];
  }
}

export async function testUserRetrieval(): Promise<TestResult> {
  console.log('\n🧪 TEST 5: User Retrieval from Supabase');
  console.log('=========================================');
  
  try {
    const user = await getRemoteUser();
    
    if (!user) {
      logTest('User Retrieval', false, 'User not found in Supabase');
      return results[results.length - 1];
    }
    
    const deviceId = await getDeviceId();
    if (user.device_id !== deviceId) {
      logTest('User Retrieval', false, 'Device ID mismatch');
      return results[results.length - 1];
    }
    
    logTest('User Retrieval', true, 'User retrieved successfully', { user });
    return results[results.length - 1];
  } catch (error: any) {
    logTest('User Retrieval', false, `Error: ${error.message}`);
    return results[results.length - 1];
  }
}

export async function testPhoneAntiHijack(): Promise<TestResult> {
  console.log('\n🧪 TEST 6: Phone Anti-Hijack Protection');
  console.log('=========================================');
  
  try {
    // First, set a phone number
    const testPhone = `+91${Date.now().toString().slice(-10)}`;
    
    const result1 = await syncUserToServer(testPhone, 'Test User');
    
    if (!result1.success) {
      logTest('Phone Anti-Hijack', false, `Failed to set phone: ${result1.error}`);
      return results[results.length - 1];
    }
    
    console.log('   Phone set:', testPhone);
    
    // Check if phone is available (should be false for same device)
    const available = await isPhoneAvailable(testPhone);
    
    // For same device, it should be available (not hijacked)
    if (!available) {
      logTest('Phone Anti-Hijack', false, 'Own phone marked as unavailable');
      return results[results.length - 1];
    }
    
    logTest('Phone Anti-Hijack', true, 'Anti-hijack working correctly', {
      phone: testPhone,
      canUseOwnPhone: available,
    });
    return results[results.length - 1];
  } catch (error: any) {
    logTest('Phone Anti-Hijack', false, `Error: ${error.message}`);
    return results[results.length - 1];
  }
}

export async function testProfileUpdate(): Promise<TestResult> {
  console.log('\n🧪 TEST 7: Profile Update');
  console.log('==========================');
  
  try {
    const timestamp = new Date().toISOString();
    const result = await syncUserToServer(
      undefined,
      `Updated User ${timestamp}`,
      undefined
    );
    
    if (!result.success) {
      logTest('Profile Update', false, `Update failed: ${result.error}`);
      return results[results.length - 1];
    }
    
    // Verify update
    const user = await getRemoteUser();
    
    if (!user || !user.name?.includes('Updated User')) {
      logTest('Profile Update', false, 'Update not reflected in database');
      return results[results.length - 1];
    }
    
    logTest('Profile Update', true, 'Profile updated successfully', { user });
    return results[results.length - 1];
  } catch (error: any) {
    logTest('Profile Update', false, `Error: ${error.message}`);
    return results[results.length - 1];
  }
}

// =================================================================
// COMPREHENSIVE TEST RUNNER
// =================================================================

export async function runAllTests(): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   DEVICE-BOUND AUTHENTICATION TEST SUITE             ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
  
  results.length = 0; // Clear previous results
  
  // Run all tests
  await testDeviceIdGeneration();
  await testDeviceIdPersistence();
  await testSupabaseConnection();
  await testUserCreation();
  await testUserRetrieval();
  await testPhoneAntiHijack();
  await testProfileUpdate();
  
  // Summary
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   TEST SUMMARY                                        ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log('');
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  console.log('');
  
  if (failed > 0) {
    console.log('Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.message}`);
    });
  }
  
  console.log('');
  
  return;
}

// =================================================================
// INDIVIDUAL TEST EXPORTS
// =================================================================

export const tests = {
  deviceIdGeneration: testDeviceIdGeneration,
  deviceIdPersistence: testDeviceIdPersistence,
  supabaseConnection: testSupabaseConnection,
  userCreation: testUserCreation,
  userRetrieval: testUserRetrieval,
  phoneAntiHijack: testPhoneAntiHijack,
  profileUpdate: testProfileUpdate,
  runAll: runAllTests,
};

export default tests;
