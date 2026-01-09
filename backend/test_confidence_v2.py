"""
FasalVaidya v2 Confidence Test
===============================
Tests the unified v2 model with actual images from the training dataset.
Shows real confidence scores and accuracy metrics for all 9 crops.

Usage:
    python test_confidence_v2.py
    python test_confidence_v2.py --crop banana --samples 5
    python test_confidence_v2.py --all-crops
"""

import sys
import argparse
import random
from pathlib import Path
from collections import defaultdict

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from ml.unified_inference import predict_unified, get_unified_metadata

# Dataset path - adjust if needed
DATASET_ROOT = Path(__file__).parent.parent / "Leaf Nutrient Data Sets"

# Crop folder mapping (from training config)
CROP_FOLDERS = {
    'rice': 'Rice Nutrients',
    'wheat': 'Wheat Nitrogen',
    'maize': 'Maize Nutrients',
    'banana': 'Banana leaves Nutrient',
    'coffee': 'Coffee Nutrients',
    'ashgourd': 'Ashgourd Nutrients',
    'eggplant': 'EggPlant Nutrients',
    'snakegourd': 'Snakegourd Nutrients',
    'bittergourd': 'Bittergourd Nutrients',
}

# Colors for terminal output
class Colors:
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    MAGENTA = "\033[95m"
    BOLD = "\033[1m"
    END = "\033[0m"


def find_images(crop_folder: Path, max_per_class: int = 3) -> dict:
    """Find test images organized by class."""
    images = defaultdict(list)
    
    if not crop_folder.exists():
        return images
    
    # Check for train/test/val structure
    subfolders = [d for d in crop_folder.iterdir() if d.is_dir()]
    split_keywords = {'train', 'test', 'val', 'validation'}
    has_splits = any(f.name.lower() in split_keywords for f in subfolders)
    
    if has_splits:
        # Use test set if available, otherwise validation
        test_folder = None
        for split in ['test', 'val', 'validation']:
            for folder in subfolders:
                if folder.name.lower() == split:
                    test_folder = folder
                    break
            if test_folder:
                break
        
        if not test_folder:
            test_folder = subfolders[0]
        
        # Get classes from test folder
        for class_folder in test_folder.iterdir():
            if class_folder.is_dir():
                class_name = class_folder.name
                img_files = list(class_folder.glob('*.jpg')) + list(class_folder.glob('*.jpeg')) + \
                           list(class_folder.glob('*.png')) + list(class_folder.glob('*.JPG'))
                
                if img_files:
                    # Sample random images
                    sample_size = min(len(img_files), max_per_class)
                    images[class_name] = random.sample(img_files, sample_size)
    else:
        # Classes directly in crop folder
        for class_folder in subfolders:
            class_name = class_folder.name
            img_files = list(class_folder.glob('*.jpg')) + list(class_folder.glob('*.jpeg')) + \
                       list(class_folder.glob('*.png')) + list(class_folder.glob('*.JPG'))
            
            if img_files:
                sample_size = min(len(img_files), max_per_class)
                images[class_name] = random.sample(img_files, sample_size)
    
    return images


def standardize_class_name(crop: str, class_name: str) -> str:
    """Convert original class name to standardized format."""
    # This should match the CLASS_RENAME_MAP logic
    class_map = {
        'rice': {
            'Nitrogen(N)': 'rice_nitrogen',
            'Phosphorus(P)': 'rice_phosphorus',
            'Potassium(K)': 'rice_potassium'
        },
        'wheat': {
            'control': 'wheat_control',
            'deficiency': 'wheat_deficiency'
        },
        'maize': {
            'ALL Present': 'maize_all_present',
            'ALLAB': 'maize_allab',
            'KAB': 'maize_kab',
            'NAB': 'maize_nab',
            'PAB': 'maize_pab',
            'ZNAB': 'maize_znab'
        },
        'banana': {
            'healthy': 'banana_healthy',
            'magnesium': 'banana_magnesium',
            'potassium': 'banana_potassium'
        },
        'coffee': {
            'healthy': 'coffee_healthy',
            'nitrogen-N': 'coffee_nitrogen_n',
            'phosphorus-P': 'coffee_phosphorus_p',
            'potasium-K': 'coffee_potassium_k'
        },
        'ashgourd': {
            'ash_gourd__healthy': 'ashgourd_healthy',
            'ash_gourd__K': 'ashgourd_k',
            'ash_gourd__K_Mg': 'ashgourd_k_mg',
            'ash_gourd__N': 'ashgourd_n',
            'ash_gourd__N_K': 'ashgourd_n_k',
            'ash_gourd__N_Mg': 'ashgourd_n_mg',
            'ash_gourd__PM': 'ashgourd_pm'
        },
        'eggplant': {
            'eggplant__healthy': 'eggplant_healthy',
            'eggplant__K': 'eggplant_k',
            'eggplant__N': 'eggplant_n',
            'eggplant__N_K': 'eggplant_n_k'
        },
        'snakegourd': {
            'snake_gourd__healthy': 'snakegourd_healthy',
            'snake_gourd__K': 'snakegourd_k',
            'snake_gourd__LS': 'snakegourd_ls',
            'snake_gourd__N': 'snakegourd_n',
            'snake_gourd__N_K': 'snakegourd_n_k'
        },
        'bittergourd': {
            'bitter_gourd__DM': 'bittergourd_dm',
            'bitter_gourd__healthy': 'bittergourd_healthy',
            'bitter_gourd__JAS': 'bittergourd_jas',
            'bitter_gourd__K': 'bittergourd_k',
            'bitter_gourd__K_Mg': 'bittergourd_k_mg',
            'bitter_gourd__LS': 'bittergourd_ls',
            'bitter_gourd__N': 'bittergourd_n',
            'bitter_gourd__N_K': 'bittergourd_n_k',
            'bitter_gourd__N_Mg': 'bittergourd_n_mg'
        }
    }
    
    if crop in class_map and class_name in class_map[crop]:
        return class_map[crop][class_name]
    
    # Fallback: simple conversion
    clean = class_name.replace(f"{crop}_", "").replace(f"{crop}__", "")
    clean = clean.lower().replace(' ', '_').replace('-', '_')
    return f"{crop}_{clean}"


def test_crop(crop: str, samples_per_class: int = 3) -> dict:
    """Test a single crop with its images."""
    print(f"\n{Colors.CYAN}{'='*70}{Colors.END}")
    print(f"{Colors.CYAN}{Colors.BOLD}Testing: {crop.upper()}{Colors.END}")
    print(f"{Colors.CYAN}{'='*70}{Colors.END}")
    
    crop_folder = DATASET_ROOT / CROP_FOLDERS[crop]
    
    if not crop_folder.exists():
        print(f"{Colors.RED}❌ Crop folder not found: {crop_folder}{Colors.END}")
        return None
    
    images = find_images(crop_folder, max_per_class=samples_per_class)
    
    if not images:
        print(f"{Colors.RED}❌ No images found{Colors.END}")
        return None
    
    print(f"📁 Found {len(images)} classes with {sum(len(imgs) for imgs in images.values())} total images\n")
    
    results = {
        'crop': crop,
        'total_tests': 0,
        'correct': 0,
        'top3_correct': 0,
        'confidences': [],
        'per_class': {}
    }
    
    for class_name, img_paths in images.items():
        expected_class = standardize_class_name(crop, class_name)
        
        print(f"\n  📊 Class: {Colors.BOLD}{class_name}{Colors.END} (expects: {expected_class})")
        print(f"     Testing {len(img_paths)} images...")
        
        class_results = {
            'tested': 0,
            'correct': 0,
            'top3_correct': 0,
            'confidences': []
        }
        
        for img_path in img_paths:
            try:
                # Run inference
                result = predict_unified(str(img_path), crop_id=crop)
                
                predicted_class = result.get('detected_class', '')
                confidence = result.get('detected_confidence', 0.0)
                top_preds = result.get('top_predictions', [])
                top3_classes = [p[0] if isinstance(p, tuple) else p.get('class', '') for p in top_preds[:3]]
                
                # Check correctness
                is_correct = predicted_class == expected_class
                is_top3 = expected_class in top3_classes
                
                results['total_tests'] += 1
                class_results['tested'] += 1
                class_results['confidences'].append(confidence)
                results['confidences'].append(confidence)
                
                if is_correct:
                    results['correct'] += 1
                    class_results['correct'] += 1
                    status = f"{Colors.GREEN}✓{Colors.END}"
                else:
                    status = f"{Colors.RED}✗{Colors.END}"
                
                if is_top3:
                    results['top3_correct'] += 1
                    class_results['top3_correct'] += 1
                
                # Print result
                conf_color = Colors.GREEN if confidence > 0.7 else (Colors.YELLOW if confidence > 0.4 else Colors.RED)
                print(f"       {status} {img_path.name[:30]:30s} → {predicted_class:25s} ({conf_color}{confidence:.1%}{Colors.END})")
                
            except Exception as e:
                print(f"       {Colors.RED}✗ ERROR: {str(e)[:50]}{Colors.END}")
        
        # Class summary
        if class_results['tested'] > 0:
            acc = class_results['correct'] / class_results['tested']
            avg_conf = sum(class_results['confidences']) / len(class_results['confidences'])
            
            acc_color = Colors.GREEN if acc > 0.7 else (Colors.YELLOW if acc > 0.5 else Colors.RED)
            print(f"     {acc_color}Class Accuracy: {acc:.1%} | Avg Confidence: {avg_conf:.1%}{Colors.END}")
            
            results['per_class'][class_name] = class_results
    
    return results


def print_summary(all_results: list):
    """Print overall summary statistics."""
    print(f"\n{Colors.MAGENTA}{'='*70}{Colors.END}")
    print(f"{Colors.MAGENTA}{Colors.BOLD}OVERALL SUMMARY{Colors.END}")
    print(f"{Colors.MAGENTA}{'='*70}{Colors.END}\n")
    
    total_tests = sum(r['total_tests'] for r in all_results if r)
    total_correct = sum(r['correct'] for r in all_results if r)
    total_top3 = sum(r['top3_correct'] for r in all_results if r)
    all_confidences = [c for r in all_results if r for c in r['confidences']]
    
    overall_acc = total_correct / total_tests if total_tests > 0 else 0
    top3_acc = total_top3 / total_tests if total_tests > 0 else 0
    avg_conf = sum(all_confidences) / len(all_confidences) if all_confidences else 0
    
    print(f"  📊 Total Tests: {total_tests}")
    print(f"  ✓  Correct: {total_correct}")
    print(f"  🎯 Top-3 Correct: {total_top3}\n")
    
    acc_color = Colors.GREEN if overall_acc > 0.7 else (Colors.YELLOW if overall_acc > 0.5 else Colors.RED)
    print(f"  {Colors.BOLD}Overall Accuracy:{Colors.END} {acc_color}{overall_acc:.1%}{Colors.END}")
    print(f"  {Colors.BOLD}Top-3 Accuracy:{Colors.END} {Colors.GREEN}{top3_acc:.1%}{Colors.END}")
    print(f"  {Colors.BOLD}Average Confidence:{Colors.END} {avg_conf:.1%}\n")
    
    # Per-crop breakdown
    print(f"  {Colors.BOLD}Per-Crop Results:{Colors.END}")
    for result in all_results:
        if result:
            crop_acc = result['correct'] / result['total_tests'] if result['total_tests'] > 0 else 0
            crop_conf = sum(result['confidences']) / len(result['confidences']) if result['confidences'] else 0
            crop_color = Colors.GREEN if crop_acc > 0.7 else (Colors.YELLOW if crop_acc > 0.5 else Colors.RED)
            
            print(f"    • {result['crop'].capitalize():12s} - {crop_color}{crop_acc:5.1%}{Colors.END} accuracy, {crop_conf:5.1%} confidence ({result['correct']}/{result['total_tests']})")
    
    print(f"\n{Colors.MAGENTA}{'='*70}{Colors.END}\n")


def main():
    parser = argparse.ArgumentParser(description='Test FasalVaidya v2 model confidence')
    parser.add_argument('--crop', type=str, help='Test specific crop (rice, wheat, maize, etc.)')
    parser.add_argument('--samples', type=int, default=3, help='Images per class to test (default: 3)')
    parser.add_argument('--all-crops', action='store_true', help='Test all 9 crops')
    
    args = parser.parse_args()
    
    print(f"\n{Colors.BOLD}{Colors.CYAN}🚀 FasalVaidya v2 Confidence Test{Colors.END}")
    print(f"{Colors.CYAN}{'='*70}{Colors.END}")
    
    # Load and display model info
    try:
        metadata = get_unified_metadata()
        if metadata:
            print(f"  Model: v{metadata.get('model_version', 'unknown')}")
            print(f"  Crops: {metadata.get('num_crops', 0)}")
            print(f"  Classes: {metadata.get('num_classes', 0)}")
            print(f"  Training Accuracy: {metadata.get('metrics', {}).get('accuracy', 0):.1%}")
    except:
        pass
    
    print(f"  Dataset: {DATASET_ROOT}")
    print(f"  Samples per class: {args.samples}")
    print(f"{Colors.CYAN}{'='*70}{Colors.END}\n")
    
    # Determine which crops to test
    if args.crop:
        if args.crop.lower() not in CROP_FOLDERS:
            print(f"{Colors.RED}❌ Unknown crop: {args.crop}{Colors.END}")
            print(f"Available: {', '.join(CROP_FOLDERS.keys())}")
            return 1
        crops_to_test = [args.crop.lower()]
    elif args.all_crops:
        crops_to_test = list(CROP_FOLDERS.keys())
    else:
        # Default: test a few crops
        crops_to_test = ['rice', 'wheat', 'maize', 'banana']
    
    # Run tests
    all_results = []
    for crop in crops_to_test:
        result = test_crop(crop, samples_per_class=args.samples)
        if result:
            all_results.append(result)
    
    # Print summary
    if all_results:
        print_summary(all_results)
    else:
        print(f"\n{Colors.RED}❌ No results to display{Colors.END}\n")
    
    return 0


if __name__ == '__main__':
    exit(main())
