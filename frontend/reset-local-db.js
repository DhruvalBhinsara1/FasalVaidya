/**
 * Script to reset local SQLite database
 * Run this to apply schema changes after updating localSync.ts
 * 
 * Usage: node reset-local-db.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🗑️  Resetting local SQLite database...\n');

// Expo SQLite stores databases in different locations per platform
const possiblePaths = [
  // Android emulator
  path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk', 'platforms'),
  // iOS simulator - varies by Xcode version
  path.join(os.homedir(), 'Library', 'Developer', 'CoreSimulator', 'Devices'),
];

console.log('📍 Database storage locations:');
console.log('   iOS Simulator: ~/Library/Developer/CoreSimulator/Devices/*/data/Containers/Data/Application/*/Library/LocalDatabase/');
console.log('   Android Emulator: /data/data/com.yourapp/databases/\n');

console.log('⚠️  To completely reset the database, you need to:');
console.log('\n📱 Option 1: Uninstall the app from your device/emulator');
console.log('   - This is the easiest and most reliable method');
console.log('   - On iOS simulator: Long press app → Remove App');
console.log('   - On Android emulator: Settings → Apps → FasalVaidya → Uninstall');
console.log('   - Then reinstall using: npx expo start\n');

console.log('📱 Option 2: Clear app data (Android only)');
console.log('   - Settings → Apps → FasalVaidya → Storage → Clear Data\n');

console.log('🔧 Option 3: Add migration code (for production)');
console.log('   - Keep existing user data');
console.log('   - Drop and recreate tables with new schema');
console.log('   - More complex but preserves data\n');

console.log('💡 Recommended: Use Option 1 (Uninstall/Reinstall)\n');
console.log('✅ After resetting, the new schema will be created automatically on next app start.');
