from PIL import Image
import os

src = r"C:/Users/나정우/.gemini/antigravity/brain/8e34ae4d-375b-4aa5-9e5c-bfe9e602f945/uploaded_image_1769063043794.png"
dst = "icon.ico"

try:
    img = Image.open(src)
    # Resize to standard icon sizes
    img.save(dst, format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(f"Successfully created {dst}")
except Exception as e:
    print(f"Error: {e}")
