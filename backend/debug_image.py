from PIL import Image, ImageOps
import numpy as np

img_path = 'uploads/7b0e2936-2a52-4c05-8273-8c28c7fd7ec7.jpg'

print("=== Original Image ===")
img = Image.open(img_path)
print(f"Size: {img.size}")
print(f"Mode: {img.mode}")

exif = img.getexif()
print(f"Has EXIF: {len(exif) > 0}")
if exif:
    orientation = exif.get(274)
    print(f"Orientation tag: {orientation}")

print("\n=== After EXIF Transpose ===")
img_fixed = ImageOps.exif_transpose(img)
print(f"Size after fix: {img_fixed.size}")

print("\n=== After RGB Convert ===")
img_rgb = img_fixed.convert('RGB')
print(f"Mode: {img_rgb.mode}")

print("\n=== After Resize to 224x224 ===")
img_resized = img_rgb.resize((224, 224), Image.LANCZOS)
print(f"Size: {img_resized.size}")

print("\n=== Pixel Stats ===")
arr = np.array(img_resized)
print(f"Shape: {arr.shape}")
print(f"Dtype: {arr.dtype}")
print(f"Range: [{arr.min()}, {arr.max()}]")
print(f"Mean: {arr.mean():.2f}")
print(f"Std: {arr.std():.2f}")

print("\n=== After MobileNetV2 Preprocessing ===")
arr_preprocessed = (arr.astype(np.float32) / 127.5) - 1.0
print(f"Range: [{arr_preprocessed.min():.3f}, {arr_preprocessed.max():.3f}]")
print(f"Mean: {arr_preprocessed.mean():.3f}")
print(f"Std: {arr_preprocessed.std():.3f}")
