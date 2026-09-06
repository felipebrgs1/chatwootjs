import os
import subprocess
from PIL import Image, ImageDraw

REPO_ROOT = "/home/felipeb/chatwootjs"
CHATWOOT_DIR = os.path.join(REPO_ROOT, "chatwoot")
PUBLIC_DIR = os.path.join(REPO_ROOT, "apps/web/public")
BRAND_DIR = os.path.join(PUBLIC_DIR, "brand-assets")

os.makedirs(BRAND_DIR, exist_ok=True)

ORANGE = "#FF6B00"

# 1. Generate SVGs
def convert_svg(source_rel, dest_rel, old_color="#2781F6", new_color=ORANGE):
    src_path = os.path.join(CHATWOOT_DIR, source_rel)
    dst_path = os.path.join(PUBLIC_DIR, dest_rel)
    with open(src_path, "r", encoding="utf-8") as f:
        content = f.read()
    # Replace blue with orange
    new_content = content.replace(old_color, new_color).replace(old_color.lower(), new_color)
    with open(dst_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"Created {dst_path}")

convert_svg("public/brand-assets/logo_thumbnail.svg", "brand-assets/logo_thumbnail.svg")
convert_svg("public/brand-assets/logo.svg", "brand-assets/logo.svg")
convert_svg("public/brand-assets/logo_dark.svg", "brand-assets/logo_dark.svg")

# Also copy logo_thumbnail.svg to favicon.svg
thumb_path = os.path.join(BRAND_DIR, "logo_thumbnail.svg")
favicon_svg_path = os.path.join(PUBLIC_DIR, "favicon.svg")
with open(thumb_path, "r", encoding="utf-8") as f:
    thumb_content = f.read()
with open(favicon_svg_path, "w", encoding="utf-8") as f:
    f.write(thumb_content)
print(f"Created {favicon_svg_path}")

# 2. Render PNGs at various sizes
sizes = {
    "favicon-16x16.png": 16,
    "favicon-32x32.png": 32,
    "favicon-48x48.png": 48,
    "favicon-64x64.png": 64,
    "favicon-96x96.png": 96,
    "apple-touch-icon.png": 180,
    "android-chrome-192x192.png": 192,
    "favicon-512x512.png": 512,
    "android-chrome-512x512.png": 512,
}

for filename, size in sizes.items():
    dest_file = os.path.join(PUBLIC_DIR, filename)
    subprocess.run(
        ["rsvg-convert", "-w", str(size), "-h", str(size), thumb_path, "-o", dest_file],
        check=True,
    )
    print(f"Rendered {filename} ({size}x{size})")

# 3. Create Badge PNGs (with unread red notification dot)
badge_specs = [
    ("favicon-badge-16x16.png", "favicon-16x16.png", 16, 4),
    ("favicon-badge-32x32.png", "favicon-32x32.png", 32, 8),
    ("favicon-badge-96x96.png", "favicon-96x96.png", 96, 24),
]

for badge_name, base_name, total_size, dot_radius in badge_specs:
    base_img = Image.open(os.path.join(PUBLIC_DIR, base_name)).convert("RGBA")
    draw = ImageDraw.Draw(base_img)
    # Draw red badge circle at top right: center around (total_size - dot_radius - 1, dot_radius + 1)
    cx = total_size - dot_radius - 1
    cy = dot_radius + 1
    # White border around red dot
    draw.ellipse(
        [cx - dot_radius - 1, cy - dot_radius - 1, cx + dot_radius + 1, cy + dot_radius + 1],
        fill=(255, 255, 255, 255),
    )
    # Red dot
    draw.ellipse(
        [cx - dot_radius, cy - dot_radius, cx + dot_radius, cy + dot_radius],
        fill=(239, 68, 68, 255),  # Tailwind red-500
    )
    badge_dest = os.path.join(PUBLIC_DIR, badge_name)
    base_img.save(badge_dest, "PNG")
    print(f"Created {badge_dest}")

# 4. Generate multi-resolution favicon.ico
ico_dest = os.path.join(PUBLIC_DIR, "favicon.ico")
p16 = os.path.join(PUBLIC_DIR, "favicon-16x16.png")
p32 = os.path.join(PUBLIC_DIR, "favicon-32x32.png")
p48 = os.path.join(PUBLIC_DIR, "favicon-48x48.png")
subprocess.run(["magick", p16, p32, p48, ico_dest], check=True)
print(f"Generated {ico_dest}")

# Clean up temp 48 and 64 pngs if desired, or keep 48
os.remove(os.path.join(PUBLIC_DIR, "favicon-48x48.png"))
os.remove(os.path.join(PUBLIC_DIR, "favicon-64x64.png"))

print("All orange Chatwoot brand assets and favicons successfully generated!")
