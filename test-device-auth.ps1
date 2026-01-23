# ============================================================================
# FasalVaidya Device-Bound Authentication Testing Script
# ============================================================================
# This script provides commands to test the device-bound auth system
# Run from the project root: f:\FasalVaidya\
# ============================================================================

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   FasalVaidya Device-Bound Authentication Test Suite         ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# CONFIGURATION
# ============================================================================

$SUPABASE_URL = $env:EXPO_PUBLIC_SUPABASE_URL
$SUPABASE_ANON_KEY = $env:EXPO_PUBLIC_SUPABASE_ANON_KEY

if (-not $SUPABASE_URL -or -not $SUPABASE_ANON_KEY) {
    Write-Host "⚠️  Warning: Supabase credentials not found in environment" -ForegroundColor Yellow
    Write-Host "   Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================================
# TEST FUNCTIONS
# ============================================================================

function Test-Prerequisites {
    Write-Host "🔍 Checking Prerequisites..." -ForegroundColor Yellow
    Write-Host ""
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Node.js not found" -ForegroundColor Red
        return $false
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-Host "✅ npm: v$npmVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ npm not found" -ForegroundColor Red
        return $false
    }
    
    # Check if frontend directory exists
    if (Test-Path "frontend") {
        Write-Host "✅ Frontend directory found" -ForegroundColor Green
    } else {
        Write-Host "❌ Frontend directory not found" -ForegroundColor Red
        return $false
    }
    
    # Check if package.json exists
    if (Test-Path "frontend/package.json") {
        Write-Host "✅ package.json found" -ForegroundColor Green
    } else {
        Write-Host "❌ package.json not found" -ForegroundColor Red
        return $false
    }
    
    Write-Host ""
    return $true
}

function Install-Dependencies {
    Write-Host "📦 Installing Dependencies..." -ForegroundColor Yellow
    Write-Host ""
    
    Push-Location frontend
    
    try {
        npm install
        Write-Host ""
        Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
    
    Pop-Location
    Write-Host ""
}

function Test-SupabaseMigration {
    Write-Host "🗄️  Testing Supabase Migration..." -ForegroundColor Yellow
    Write-Host ""
    
    if (-not $SUPABASE_URL -or -not $SUPABASE_ANON_KEY) {
        Write-Host "❌ Supabase credentials not set" -ForegroundColor Red
        Write-Host "   Please set environment variables first" -ForegroundColor Yellow
        Write-Host ""
        return
    }
    
    Write-Host "📋 Migration file: supabase_schema/04_device_auth_migration.sql" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To apply migration:" -ForegroundColor Yellow
    Write-Host "1. Open Supabase Dashboard: $SUPABASE_URL" -ForegroundColor Cyan
    Write-Host "2. Go to SQL Editor" -ForegroundColor Cyan
    Write-Host "3. Copy contents of supabase_schema/04_device_auth_migration.sql" -ForegroundColor Cyan
    Write-Host "4. Execute the SQL" -ForegroundColor Cyan
    Write-Host ""
}

function Start-DevServer {
    Write-Host "🚀 Starting Development Server..." -ForegroundColor Yellow
    Write-Host ""
    
    Push-Location frontend
    
    Write-Host "Starting Expo..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    
    npx expo start
    
    Pop-Location
}

function Test-DeviceId {
    Write-Host "🆔 Testing Device ID Generation..." -ForegroundColor Yellow
    Write-Host ""
    
    Push-Location frontend
    
    $script = @"
import { getDeviceId, initializeDeviceId } from './src/utils/deviceId';

async function test() {
  console.log('🧪 Testing Device ID...');
  await initializeDeviceId();
  const deviceId = await getDeviceId();
  console.log('✅ Device ID:', deviceId);
  
  // Test persistence
  const deviceId2 = await getDeviceId();
  if (deviceId === deviceId2) {
    console.log('✅ Device ID is persistent');
  } else {
    console.log('❌ Device ID changed!');
  }
}

test().catch(console.error);
"@
    
    Write-Host "Test script:" -ForegroundColor Cyan
    Write-Host $script -ForegroundColor Gray
    Write-Host ""
    Write-Host "To run manually: Create a test file and execute with Node" -ForegroundColor Yellow
    
    Pop-Location
    Write-Host ""
}

function Show-TestCommands {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   Available Test Commands                                     ║" -ForegroundColor Cyan
    Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "1️⃣  Test-Prerequisites" -ForegroundColor Green
    Write-Host "    Check if all required tools are installed" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "2️⃣  Install-Dependencies" -ForegroundColor Green
    Write-Host "    Install npm packages for the frontend" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "3️⃣  Test-SupabaseMigration" -ForegroundColor Green
    Write-Host "    Show instructions for applying database migration" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "4️⃣  Start-DevServer" -ForegroundColor Green
    Write-Host "    Start Expo development server" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "5️⃣  Test-DeviceId" -ForegroundColor Green
    Write-Host "    Show device ID test script" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Example Usage:" -ForegroundColor Yellow
    Write-Host "  . .\test-device-auth.ps1" -ForegroundColor Cyan
    Write-Host "  Test-Prerequisites" -ForegroundColor Cyan
    Write-Host "  Install-Dependencies" -ForegroundColor Cyan
    Write-Host "  Start-DevServer" -ForegroundColor Cyan
    Write-Host ""
}

# ============================================================================
# MAIN MENU
# ============================================================================

function Show-Menu {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   Device Auth Test Menu                                       ║" -ForegroundColor Cyan
    Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Check Prerequisites" -ForegroundColor Green
    Write-Host "2. Install Dependencies" -ForegroundColor Green
    Write-Host "3. Apply Supabase Migration" -ForegroundColor Green
    Write-Host "4. Start Development Server" -ForegroundColor Green
    Write-Host "5. Test Device ID" -ForegroundColor Green
    Write-Host "6. Show All Commands" -ForegroundColor Green
    Write-Host "Q. Quit" -ForegroundColor Red
    Write-Host ""
}

function Start-InteractiveMenu {
    while ($true) {
        Show-Menu
        $choice = Read-Host "Select an option"
        
        switch ($choice.ToUpper()) {
            "1" { Test-Prerequisites; Pause }
            "2" { Install-Dependencies; Pause }
            "3" { Test-SupabaseMigration; Pause }
            "4" { Start-DevServer; break }
            "5" { Test-DeviceId; Pause }
            "6" { Show-TestCommands; Pause }
            "Q" { Write-Host "Goodbye! 👋" -ForegroundColor Cyan; return }
            default { Write-Host "Invalid option" -ForegroundColor Red }
        }
    }
}

# ============================================================================
# QUICK START
# ============================================================================

function Start-QuickTest {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   Quick Start Test Sequence                                   ║" -ForegroundColor Cyan
    Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Running automated test sequence..." -ForegroundColor Yellow
    Write-Host ""
    
    # Step 1: Prerequisites
    Write-Host "Step 1/4: Checking prerequisites..." -ForegroundColor Cyan
    if (-not (Test-Prerequisites)) {
        Write-Host "❌ Prerequisites check failed. Please install missing tools." -ForegroundColor Red
        return
    }
    
    # Step 2: Dependencies
    Write-Host "Step 2/4: Installing dependencies..." -ForegroundColor Cyan
    Install-Dependencies
    
    # Step 3: Migration
    Write-Host "Step 3/4: Migration instructions..." -ForegroundColor Cyan
    Test-SupabaseMigration
    
    Write-Host "⏸️  Please apply the migration in Supabase Dashboard before continuing" -ForegroundColor Yellow
    $continue = Read-Host "Press Enter when migration is complete (or Q to quit)"
    if ($continue.ToUpper() -eq "Q") {
        return
    }
    
    # Step 4: Start server
    Write-Host "Step 4/4: Starting development server..." -ForegroundColor Cyan
    Start-DevServer
}

# ============================================================================
# AUTO-RUN
# ============================================================================

# If script is run with -Menu parameter, show interactive menu
param(
    [switch]$Menu,
    [switch]$QuickStart,
    [switch]$Help
)

if ($Help) {
    Show-TestCommands
} elseif ($Menu) {
    Start-InteractiveMenu
} elseif ($QuickStart) {
    Start-QuickTest
} else {
    # Just load functions for manual use
    Show-TestCommands
}

# ============================================================================
# EXPORT FUNCTIONS
# ============================================================================

Export-ModuleMember -Function @(
    'Test-Prerequisites',
    'Install-Dependencies',
    'Test-SupabaseMigration',
    'Start-DevServer',
    'Test-DeviceId',
    'Show-TestCommands',
    'Show-Menu',
    'Start-InteractiveMenu',
    'Start-QuickTest'
)
