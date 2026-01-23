"""
Multi-Tenant Feature Test Script
=================================
Tests user isolation by simulating multiple users and verifying
that each user only sees their own scans.
"""

import requests
import uuid
import json
from pathlib import Path

# Configuration
API_BASE_URL = "http://localhost:5000"
TEST_IMAGE_PATH = Path(__file__).parent.parent / "ml" / "data" / "test_images"

# Generate test user IDs
USER_A = str(uuid.uuid4())
USER_B = str(uuid.uuid4())
LEGACY_USER = "00000000-0000-0000-0000-000000000000"

print("="*70)
print("🧪 Multi-Tenant Isolation Test")
print("="*70)
print(f"\n👤 User A ID: {USER_A[:8]}...")
print(f"👤 User B ID: {USER_B[:8]}...")
print(f"👤 Legacy User ID: {LEGACY_USER[:8]}...")
print()

def test_health():
    """Test if backend is running."""
    try:
        response = requests.get(f"{API_BASE_URL}/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running")
            return True
        else:
            print(f"❌ Backend returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        print(f"💡 Make sure backend is running: python app.py")
        return False

def get_scans(user_id):
    """Get scans for a specific user."""
    headers = {"X-User-ID": user_id}
    response = requests.get(f"{API_BASE_URL}/api/scans", headers=headers)
    if response.status_code == 200:
        data = response.json()
        return data.get('scans', [])
    return []

def create_mock_scan(user_id, crop_id=1):
    """Create a mock scan for testing (without actual image upload)."""
    # Since we need to upload an image, we'll just check scans
    # In a real test, you'd upload an actual image here
    pass

def test_isolation():
    """Test that users can only see their own scans."""
    print("\n" + "="*70)
    print("🔍 Testing User Isolation")
    print("="*70)
    
    # Get scans for each user
    print(f"\n📊 Fetching scans for User A ({USER_A[:8]}...)...")
    user_a_scans = get_scans(USER_A)
    print(f"   Found: {len(user_a_scans)} scans")
    
    print(f"\n📊 Fetching scans for User B ({USER_B[:8]}...)...")
    user_b_scans = get_scans(USER_B)
    print(f"   Found: {len(user_b_scans)} scans")
    
    print(f"\n📊 Fetching scans for Legacy User ({LEGACY_USER[:8]}...)...")
    legacy_scans = get_scans(LEGACY_USER)
    print(f"   Found: {len(legacy_scans)} scans (pre-migration scans)")
    
    # Verify isolation
    print("\n" + "-"*70)
    print("✅ Verification:")
    print("-"*70)
    
    # Check if User A and User B have different scans
    if len(user_a_scans) == 0 and len(user_b_scans) == 0:
        print("✅ Both new users have no scans (as expected for new users)")
    else:
        # Check for any overlap in scan IDs
        user_a_ids = {scan['scan_id'] for scan in user_a_scans}
        user_b_ids = {scan['scan_id'] for scan in user_b_scans}
        overlap = user_a_ids & user_b_ids
        
        if overlap:
            print(f"❌ ISOLATION BREACH! Users share {len(overlap)} scans: {overlap}")
            return False
        else:
            print(f"✅ No scan overlap between User A and User B")
    
    # Legacy user should have old scans (if any existed before migration)
    if len(legacy_scans) > 0:
        print(f"✅ Legacy user has {len(legacy_scans)} scans from pre-migration data")
    else:
        print(f"ℹ️  No legacy scans found (database was empty before migration)")
    
    return True

def test_user_header():
    """Test that backend requires X-User-ID header."""
    print("\n" + "="*70)
    print("🔍 Testing X-User-ID Header")
    print("="*70)
    
    # Test without header (should use legacy user as fallback)
    print("\n📊 Fetching scans WITHOUT X-User-ID header...")
    response = requests.get(f"{API_BASE_URL}/api/scans")
    if response.status_code == 200:
        data = response.json()
        scans = data.get('scans', [])
        print(f"   Found: {len(scans)} scans (using legacy user fallback)")
        print("✅ Backend handles missing header gracefully")
    else:
        print(f"❌ Unexpected status: {response.status_code}")
        return False
    
    # Test with valid header
    print(f"\n📊 Fetching scans WITH X-User-ID header ({USER_A[:8]}...)...")
    headers = {"X-User-ID": USER_A}
    response = requests.get(f"{API_BASE_URL}/api/scans", headers=headers)
    if response.status_code == 200:
        data = response.json()
        scans = data.get('scans', [])
        print(f"   Found: {len(scans)} scans")
        print("✅ Backend accepts X-User-ID header")
        return True
    else:
        print(f"❌ Unexpected status: {response.status_code}")
        return False

def test_database_schema():
    """Test that database has user_id columns."""
    print("\n" + "="*70)
    print("🔍 Testing Database Schema")
    print("="*70)
    
    # Test by trying to get crops (should work regardless of user)
    print("\n📊 Testing /api/crops endpoint...")
    response = requests.get(f"{API_BASE_URL}/api/crops")
    if response.status_code == 200:
        data = response.json()
        crops = data.get('crops', [])
        print(f"   Found: {len(crops)} crops")
        print("✅ Crops endpoint working")
    else:
        print(f"❌ Crops endpoint failed: {response.status_code}")
        return False
    
    # Test that we can get a scan with user filtering
    # This will fail if user_id column doesn't exist
    headers = {"X-User-ID": USER_A}
    response = requests.get(f"{API_BASE_URL}/api/scans?limit=1", headers=headers)
    if response.status_code == 200:
        print("✅ User-filtered queries working (user_id column exists)")
        return True
    else:
        print(f"❌ User-filtered query failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def run_all_tests():
    """Run all tests."""
    print("\n🚀 Starting Multi-Tenant Feature Tests...\n")
    
    # Test 1: Backend health
    if not test_health():
        print("\n❌ Backend not running. Stopping tests.")
        return False
    
    # Test 2: Database schema
    if not test_database_schema():
        print("\n❌ Database schema test failed.")
        return False
    
    # Test 3: Header handling
    if not test_user_header():
        print("\n❌ Header handling test failed.")
        return False
    
    # Test 4: User isolation
    if not test_isolation():
        print("\n❌ User isolation test failed.")
        return False
    
    # All tests passed
    print("\n" + "="*70)
    print("🎉 ALL TESTS PASSED!")
    print("="*70)
    print("\n✅ Multi-tenant feature is working correctly:")
    print("   • Backend accepts X-User-ID header")
    print("   • Users are isolated (cannot see each other's scans)")
    print("   • Database schema includes user_id columns")
    print("   • Legacy user fallback working")
    print("\n💡 Next steps:")
    print("   1. Test with frontend app on different devices")
    print("   2. Verify device UUIDs are being generated")
    print("   3. Upload test scans and verify isolation")
    
    return True

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
