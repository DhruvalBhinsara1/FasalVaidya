"""
FasalVaidya Unified Model v2 - Dataset Preparation Script

This script prepares a unified dataset combining 9 viable crops:
- Rice, Wheat, Maize (existing)
- Banana, Ashgourd, Coffee, EggPlant, Snakegourd, Bittergourd (new)

Skipping: Tomato, Ridgegourd, Cucumber (insufficient/imbalanced data)
"""

import os
import shutil
from pathlib import Path
from sklearn.model_selection import train_test_split
import json
from collections import defaultdict

# Dataset configuration
CROPS_CONFIG = {
    'banana': {
        'source': 'Leaf Nutrient Data Sets/Banana leaves Nutrient',
        'classes': ['healthy', 'magnesium', 'potassium'],
        'has_splits': False,
        'prefix': 'banana_'
    },
    'ashgourd': {
        'source': 'Leaf Nutrient Data Sets/Ashgourd Nutrients',
        'classes': [
            'ash_gourd__healthy',
            'ash_gourd__K',
            'ash_gourd__K_Mg',
            'ash_gourd__N',
            'ash_gourd__N_K',
            'ash_gourd__N_Mg',
            'ash_gourd__PM'
        ],
        'has_splits': False,
        'prefix': 'ashgourd_',
        'rename_classes': {
            'ash_gourd__healthy': 'healthy',
            'ash_gourd__K': 'k',
            'ash_gourd__K_Mg': 'k_mg',
            'ash_gourd__N': 'n',
            'ash_gourd__N_K': 'n_k',
            'ash_gourd__N_Mg': 'n_mg',
            'ash_gourd__PM': 'pm'
        }
    },
    'coffee': {
        'source': 'Leaf Nutrient Data Sets/Coffee Nutrients',
        'classes': ['healthy', 'nitrogen-N', 'phosphorus-P', 'potasium-K'],
        'has_splits': False,
        'prefix': 'coffee_',
        'rename_classes': {
            'nitrogen-N': 'nitrogen_n',
            'phosphorus-P': 'phosphorus_p',
            'potasium-K': 'potassium_k'
        }
    },
    'eggplant': {
        'source': 'Leaf Nutrient Data Sets/EggPlant Nutrients',
        'classes': [
            'eggplant__healthy',
            'eggplant__K',
            'eggplant__N',
            'eggplant__N_K'
        ],
        'has_splits': False,
        'prefix': 'eggplant_',
        'rename_classes': {
            'eggplant__healthy': 'healthy',
            'eggplant__K': 'k',
            'eggplant__N': 'n',
            'eggplant__N_K': 'n_k'
        }
    },
    'snakegourd': {
        'source': 'Leaf Nutrient Data Sets/Snakegourd Nutrients',
        'classes': [
            'snake_gourd__healthy',
            'snake_gourd__K',
            'snake_gourd__LS',
            'snake_gourd__N',
            'snake_gourd__N_K'
        ],
        'has_splits': False,
        'prefix': 'snakegourd_',
        'rename_classes': {
            'snake_gourd__healthy': 'healthy',
            'snake_gourd__K': 'k',
            'snake_gourd__LS': 'ls',
            'snake_gourd__N': 'n',
            'snake_gourd__N_K': 'n_k'
        }
    },
    'bittergourd': {
        'source': 'Leaf Nutrient Data Sets/Bittergourd Nutrients',
        'classes': [
            'bitter_gourd__DM',
            'bitter_gourd__healthy',
            'bitter_gourd__JAS',
            'bitter_gourd__K',
            'bitter_gourd__K_Mg',
            'bitter_gourd__LS',
            'bitter_gourd__N',
            'bitter_gourd__N_K',
            'bitter_gourd__N_Mg'
        ],
        'has_splits': False,
        'prefix': 'bittergourd_',
        'rename_classes': {
            'bitter_gourd__DM': 'dm',
            'bitter_gourd__healthy': 'healthy',
            'bitter_gourd__JAS': 'jas',
            'bitter_gourd__K': 'k',
            'bitter_gourd__K_Mg': 'k_mg',
            'bitter_gourd__LS': 'ls',
            'bitter_gourd__N': 'n',
            'bitter_gourd__N_K': 'n_k',
            'bitter_gourd__N_Mg': 'n_mg'
        }
    },
    # Existing crops
    'rice': {
        'source': 'Leaf Nutrient Data Sets/Rice Nutrients',
        'classes': ['Nitrogen(N)', 'Phosphorus(P)', 'Potassium(K)'],
        'has_splits': False,
        'prefix': 'rice_',
        'rename_classes': {
            'Nitrogen(N)': 'nitrogen',
            'Phosphorus(P)': 'phosphorus',
            'Potassium(K)': 'potassium'
        }
    },
    'wheat': {
        'source': 'Leaf Nutrient Data Sets/Wheat Nitrogen',
        'classes': ['control', 'deficiency'],
        'has_splits': True,
        'prefix': 'wheat_'
    },
    'maize': {
        'source': 'Leaf Nutrient Data Sets/Maize Nutrients',
        'classes': ['ALL Present', 'ALLAB', 'KAB', 'NAB', 'PAB', 'ZNAB'],
        'has_splits': True,
        'prefix': 'maize_',
        'rename_classes': {
            'ALL Present': 'all_present',
            'ALLAB': 'allab',
            'KAB': 'kab',
            'NAB': 'nab',
            'PAB': 'pab',
            'ZNAB': 'znab'
        }
    }
}


def get_class_name(crop_name, original_class, config):
    """Get the standardized class name with crop prefix"""
    rename_map = config.get('rename_classes', {})
    class_name = rename_map.get(original_class, original_class)
    return f"{config['prefix']}{class_name}"


def create_splits(source_path, output_path, classes, prefix, rename_map, val_split=0.2):
    """
    Create train/val splits for crops without existing splits
    """
    stats = defaultdict(lambda: {'train': 0, 'val': 0})
    
    for original_class in classes:
        class_path = source_path / original_class
        if not class_path.exists():
            print(f"  ⚠️  Warning: {original_class} not found, skipping")
            continue
        
        # Get all images
        images = []
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']:
            images.extend(list(class_path.glob(ext)))
        
        if len(images) == 0:
            print(f"  ⚠️  No images found in {original_class}, skipping")
            continue
        
        # Split into train/val
        train_imgs, val_imgs = train_test_split(
            images, test_size=val_split, random_state=42, shuffle=True
        )
        
        # Get standardized class name
        class_name = rename_map.get(original_class, original_class)
        final_class_name = f"{prefix}{class_name}"
        
        # Copy to output structure
        train_out = output_path / 'train' / final_class_name
        val_out = output_path / 'val' / final_class_name
        train_out.mkdir(parents=True, exist_ok=True)
        val_out.mkdir(parents=True, exist_ok=True)
        
        for img in train_imgs:
            shutil.copy2(img, train_out / img.name)
        for img in val_imgs:
            shutil.copy2(img, val_out / img.name)
        
        stats[final_class_name]['train'] = len(train_imgs)
        stats[final_class_name]['val'] = len(val_imgs)
        
        print(f"  ✅ {final_class_name}: {len(train_imgs)} train, {len(val_imgs)} val")
    
    return stats


def copy_existing_splits(source_path, output_path, classes, prefix, rename_map):
    """
    Copy crops that already have train/val/test splits with renaming
    """
    stats = defaultdict(lambda: {'train': 0, 'val': 0, 'test': 0})
    
    for split in ['train', 'val', 'test']:
        split_path = source_path / split
        if not split_path.exists():
            continue
        
        for original_class in classes:
            src_class_path = split_path / original_class
            if not src_class_path.exists():
                continue
            
            # Get standardized class name
            class_name = rename_map.get(original_class, original_class)
            final_class_name = f"{prefix}{class_name}"
            
            # Copy to output
            dest_class_path = output_path / split / final_class_name
            dest_class_path.mkdir(parents=True, exist_ok=True)
            
            # Copy all images
            count = 0
            for ext in ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']:
                for img in src_class_path.glob(ext):
                    shutil.copy2(img, dest_class_path / img.name)
                    count += 1
            
            stats[final_class_name][split] = count
        
        print(f"  ✅ Copied {split} split")
    
    return stats


def prepare_dataset(base_path, output_path, val_split=0.2):
    """
    Prepare unified dataset with train/val splits
    """
    base_path = Path(base_path)
    output_path = Path(output_path)
    
    print("╔════════════════════════════════════════════════════════════╗")
    print("║     FasalVaidya Unified Model v2 - Dataset Preparation    ║")
    print("╚════════════════════════════════════════════════════════════╝\n")
    
    # Create output directory
    output_path.mkdir(parents=True, exist_ok=True)
    
    all_stats = {}
    total_images = {'train': 0, 'val': 0, 'test': 0}
    
    for crop_name, config in CROPS_CONFIG.items():
        print(f"\n{'='*60}")
        print(f"Processing: {crop_name.upper()}")
        print(f"{'='*60}")
        
        source_path = base_path / config['source']
        
        if not source_path.exists():
            print(f"  ❌ Source not found: {source_path}")
            continue
        
        if config['has_splits']:
            # Copy existing train/val/test structure
            stats = copy_existing_splits(
                source_path, 
                output_path,
                config['classes'],
                config['prefix'],
                config.get('rename_classes', {})
            )
        else:
            # Create train/val splits from direct class folders
            stats = create_splits(
                source_path, 
                output_path,
                config['classes'],
                config['prefix'],
                config.get('rename_classes', {}),
                val_split
            )
        
        all_stats[crop_name] = stats
        
        # Update totals
        for class_name, counts in stats.items():
            for split in ['train', 'val', 'test']:
                total_images[split] += counts.get(split, 0)
    
    # Save statistics
    print(f"\n\n{'='*60}")
    print("DATASET PREPARATION COMPLETE")
    print(f"{'='*60}\n")
    
    print("📊 Summary Statistics:")
    print(f"  Total training images:   {total_images['train']:,}")
    print(f"  Total validation images: {total_images['val']:,}")
    print(f"  Total test images:       {total_images['test']:,}")
    print(f"  Grand total:             {sum(total_images.values()):,}")
    
    # Count total classes
    total_classes = sum(len(stats) for stats in all_stats.values())
    print(f"\n  Total classes: {total_classes}")
    print(f"  Total crops: {len(all_stats)}")
    
    # Save detailed statistics to JSON
    stats_file = output_path / 'dataset_stats.json'
    with open(stats_file, 'w') as f:
        json.dump({
            'crops': all_stats,
            'totals': total_images,
            'summary': {
                'total_classes': total_classes,
                'total_crops': len(all_stats),
                'total_images': sum(total_images.values())
            }
        }, f, indent=2)
    
    print(f"\n✅ Statistics saved to: {stats_file}")
    
    # Create labels.txt file
    labels_file = output_path / 'labels.txt'
    all_classes = []
    for crop_stats in all_stats.values():
        all_classes.extend(sorted(crop_stats.keys()))
    
    with open(labels_file, 'w') as f:
        for class_name in sorted(all_classes):
            f.write(f"{class_name}\n")
    
    print(f"✅ Class labels saved to: {labels_file}")
    
    print(f"\n📁 Dataset ready at: {output_path}")
    print("\n🚀 Next step: Run training script (train_unified_v2.py)")
    

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        base_path = sys.argv[1]
    else:
        base_path = 'B:/FasalVaidya'
    
    if len(sys.argv) > 2:
        output_path = sys.argv[2]
    else:
        output_path = 'B:/FasalVaidya/backend/ml/unified_v2_dataset'
    
    prepare_dataset(
        base_path=base_path,
        output_path=output_path,
        val_split=0.2
    )
