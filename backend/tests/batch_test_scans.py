"""
FasalVaidya Batch Test Script
==============================
Tests backend using actual images from CoLeaf DATASET.

Usage:
    python batch_test_scans.py
    python batch_test_scans.py --samples 5
    python batch_test_scans.py --category nitrogen-N
"""

import os
import sys
import argparse
import random
import time
from pathlib import Path
from datetime import datetime

# Ensure we can import from backend
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Constants
DATASET_PATH = Path(__file__).parent.parent.parent / "CoLeaf DATASET"
API_BASE_URL = "http://localhost:5000/api"

# Mapping of deficiency folders to expected results
DEFICIENCY_MAP = {
    "healthy": {"n": "low", "p": "low", "k": "low"},
    "nitrogen-N": {"n": "high", "p": "low", "k": "low"},
    "phosphorus-P": {"n": "low", "p": "high", "k": "low"},
    "potasium-K": {"n": "low", "p": "low", "k": "high"},
    "boron-B": {"n": "low", "p": "low", "k": "low"},  # Not NPK
    "calcium-Ca": {"n": "low", "p": "low", "k": "low"},  # Not NPK
    "iron-Fe": {"n": "low", "p": "low", "k": "low"},  # Not NPK
    "magnesium-Mg": {"n": "low", "p": "low", "k": "low"},  # Not NPK
    "manganese-Mn": {"n": "low", "p": "low", "k": "low"},  # Not NPK
}

# Colors for terminal output
class Colors:
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    END = "\033[0m"


def get_category_images(category: str, max_samples: int = 5) -> list:
    """Get sample images from a category folder."""
    category_path = DATASET_PATH / category
    
    if not category_path.exists():
        print(f"{Colors.RED}Category not found: {category}{Colors.END}")
        return []
    
    images = list(category_path.glob("*.jpg")) + list(category_path.glob("*.jpeg"))
    images += list(category_path.glob("*.png")) + list(category_path.glob("*.JPG"))
    
    if len(images) > max_samples:
        images = random.sample(images, max_samples)
    
    return images


def test_with_requests(image_path: Path, crop_id: int = 1) -> dict:
    """Test using requests library."""
    import requests
    
    with open(image_path, 'rb') as f:
        files = {'image': (image_path.name, f, 'image/jpeg')}
        data = {'crop_id': crop_id}
        
        response = requests.post(
            f"{API_BASE_URL}/scans",
            files=files,
            data=data
        )
        
        return response.json() if response.ok else {"error": response.text}


def test_with_urllib(image_path: Path, crop_id: int = 1) -> dict:
    """Test using urllib (no external dependencies)."""
    import urllib.request
    import urllib.parse
    import json
    from email.mime.multipart import MIMEMultipart
    
    boundary = '----FormBoundary' + str(int(time.time()))
    
    with open(image_path, 'rb') as f:
        image_data = f.read()
    
    body = []
    body.append(f'--{boundary}'.encode())
    body.append(f'Content-Disposition: form-data; name="image"; filename="{image_path.name}"'.encode())
    body.append(b'Content-Type: image/jpeg')
    body.append(b'')
    body.append(image_data)
    body.append(f'--{boundary}'.encode())
    body.append(f'Content-Disposition: form-data; name="crop_id"'.encode())
    body.append(b'')
    body.append(str(crop_id).encode())
    body.append(f'--{boundary}--'.encode())
    
    body_bytes = b'\r\n'.join(body)
    
    req = urllib.request.Request(
        f"{API_BASE_URL}/scans",
        data=body_bytes,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        return {"error": str(e)}


def format_severity(severity: str) -> str:
    """Format severity with color."""
    if severity == "healthy":
        return f"{Colors.GREEN}✓ {severity}{Colors.END}"
    elif severity == "attention":
        return f"{Colors.YELLOW}! {severity}{Colors.END}"
    else:
        return f"{Colors.RED}✗ {severity}{Colors.END}"


def run_batch_test(categories: list = None, samples_per_category: int = 3):
    """Run batch tests on dataset images."""
    
    print(f"\n{Colors.CYAN}═══════════════════════════════════════════════════════{Colors.END}")
    print(f"{Colors.CYAN}  FasalVaidya Batch Test - CoLeaf Dataset{Colors.END}")
    print(f"{Colors.CYAN}═══════════════════════════════════════════════════════{Colors.END}")
    print(f"  Dataset Path: {DATASET_PATH}")
    print(f"  API URL: {API_BASE_URL}")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{Colors.CYAN}═══════════════════════════════════════════════════════{Colors.END}\n")
    
    # Determine which send function to use
    try:
        import requests
        send_func = test_with_requests
        print(f"{Colors.BLUE}Using: requests library{Colors.END}\n")
    except ImportError:
        send_func = test_with_urllib
        print(f"{Colors.YELLOW}Using: urllib (install 'requests' for better support){Colors.END}\n")
    
    # Get categories to test
    if categories is None:
        categories = [d.name for d in DATASET_PATH.iterdir() if d.is_dir()]
    
    total_tests = 0
    passed_tests = 0
    results_summary = []
    
    for category in categories:
        print(f"\n{Colors.BLUE}▶ Testing category: {category}{Colors.END}")
        print("-" * 50)
        
        images = get_category_images(category, samples_per_category)
        
        if not images:
            print(f"  {Colors.YELLOW}No images found, skipping...{Colors.END}")
            continue
        
        category_passed = 0
        
        for img_path in images:
            total_tests += 1
            
            print(f"\n  📷 {img_path.name}")
            
            try:
                result = send_func(img_path, crop_id=random.randint(1, 4))
                
                if "error" in result:
                    print(f"     {Colors.RED}Error: {result['error'][:100]}{Colors.END}")
                    continue
                
                # Display results
                print(f"     Crop: {result.get('crop_name', 'Unknown')}")
                print(f"     N Score: {result.get('n_score', 0):.1f}% - {format_severity(result.get('n_severity', 'unknown'))}")
                print(f"     P Score: {result.get('p_score', 0):.1f}% - {format_severity(result.get('p_severity', 'unknown'))}")
                print(f"     K Score: {result.get('k_score', 0):.1f}% - {format_severity(result.get('k_severity', 'unknown'))}")
                print(f"     Overall: {format_severity(result.get('overall_status', 'unknown'))}")
                
                # Check if results make sense for category
                expected = DEFICIENCY_MAP.get(category, {})
                
                if category == "healthy":
                    if result.get('overall_status') in ['healthy', 'attention']:
                        passed_tests += 1
                        category_passed += 1
                        print(f"     {Colors.GREEN}✓ PASS (healthy detected){Colors.END}")
                    else:
                        print(f"     {Colors.YELLOW}? CHECK (expected healthy){Colors.END}")
                
                elif category == "nitrogen-N":
                    if result.get('n_severity') in ['attention', 'critical']:
                        passed_tests += 1
                        category_passed += 1
                        print(f"     {Colors.GREEN}✓ PASS (N deficiency detected){Colors.END}")
                    else:
                        print(f"     {Colors.YELLOW}? CHECK (expected N deficiency){Colors.END}")
                
                elif category == "phosphorus-P":
                    if result.get('p_severity') in ['attention', 'critical']:
                        passed_tests += 1
                        category_passed += 1
                        print(f"     {Colors.GREEN}✓ PASS (P deficiency detected){Colors.END}")
                    else:
                        print(f"     {Colors.YELLOW}? CHECK (expected P deficiency){Colors.END}")
                
                elif category in ["potasium-K", "potassium-K"]:
                    if result.get('k_severity') in ['attention', 'critical']:
                        passed_tests += 1
                        category_passed += 1
                        print(f"     {Colors.GREEN}✓ PASS (K deficiency detected){Colors.END}")
                    else:
                        print(f"     {Colors.YELLOW}? CHECK (expected K deficiency){Colors.END}")
                
                else:
                    # For other deficiencies, just check API works
                    passed_tests += 1
                    category_passed += 1
                    print(f"     {Colors.GREEN}✓ PASS (API responded){Colors.END}")
                
                results_summary.append({
                    "category": category,
                    "image": img_path.name,
                    "result": result
                })
                
            except Exception as e:
                print(f"     {Colors.RED}Exception: {str(e)}{Colors.END}")
        
        print(f"\n  Category Results: {category_passed}/{len(images)} passed")
    
    # Final summary
    print(f"\n{Colors.CYAN}═══════════════════════════════════════════════════════{Colors.END}")
    print(f"{Colors.CYAN}  BATCH TEST SUMMARY{Colors.END}")
    print(f"{Colors.CYAN}═══════════════════════════════════════════════════════{Colors.END}")
    print(f"  Total Tests: {total_tests}")
    print(f"  Passed: {Colors.GREEN}{passed_tests}{Colors.END}")
    print(f"  Rate: {(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "  Rate: N/A")
    print(f"  Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{Colors.CYAN}═══════════════════════════════════════════════════════{Colors.END}\n")
    
    return results_summary


def test_api_health():
    """Quick test to check if API is running."""
    import urllib.request
    import json
    
    try:
        req = urllib.request.Request(f"{API_BASE_URL}/health")
        with urllib.request.urlopen(req, timeout=5) as response:
            result = json.loads(response.read().decode())
            if result.get('status') == 'ok':
                print(f"{Colors.GREEN}✓ API is running: {result.get('message')}{Colors.END}")
                return True
    except Exception as e:
        print(f"{Colors.RED}✗ API not available: {e}{Colors.END}")
        print(f"  Make sure to start the backend first:")
        print(f"  cd backend && python app.py")
    
    return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Batch test FasalVaidya API with dataset images")
    parser.add_argument("--samples", type=int, default=3, help="Number of samples per category")
    parser.add_argument("--category", type=str, help="Test specific category only")
    parser.add_argument("--url", type=str, default="http://localhost:5000/api", help="API base URL")
    
    args = parser.parse_args()
    API_BASE_URL = args.url
    
    print(f"\n{Colors.CYAN}FasalVaidya Batch Tester{Colors.END}\n")
    
    # Check API health first
    if not test_api_health():
        print(f"\n{Colors.RED}Please start the backend server and try again.{Colors.END}")
        sys.exit(1)
    
    # Run batch tests
    categories = [args.category] if args.category else None
    run_batch_test(categories=categories, samples_per_category=args.samples)
