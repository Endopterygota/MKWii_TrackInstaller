"""
Generate a professional Windows application icon for MKWii Track Installer.

Uses Python Pillow to draw:
- A rounded-square shape with green gradient fill
- White "MK" text centered on the square
- Transparent background outside the rounded square

Output files:
  public/icon.png   (256x256 RGBA base image)
  public/icon.ico   (multi-size ICO with 16,32,48,64,128,256 px variants)
"""

import math
import os
from PIL import Image, ImageDraw, ImageFilter

OUTPUT_DIR = "public"
BASE_SIZE = 256
ICO_SIZES = [256, 128, 64, 48, 32, 16]

# Green gradient colors (light to dark) — matches app branding.
GREEN_LIGHT = (0, 180, 80)
GREEN_DARK  = (0, 120, 50)


class Color:
    """RGBA helper."""

    def __init__(self, r, g, b, a=255):
        self.color = (r, g, b, a)

    @staticmethod
    def lerp(c1, c2, t):
        """Linear interpolation between two RGBA tuples."""
        return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def rounded_rectangle(draw, xy, radius, fill=None, outline=None, width=0):
    """Draw a filled rounded rectangle with optional outline."""
    x0, y0, x1, y1 = xy
    r = int(radius)
    draw.chord((x0, y0, x0 + 2 * r, y0 + 2 * r), 180, 270, fill=fill, outline=None)
    draw.chord((x1 - 2 * r, y0, x1, y0 + 2 * r), 270, 360, fill=fill, outline=None)
    draw.chord((x0, y1 - 2 * r, x0 + 2 * r, y1), 90, 180, fill=fill, outline=None)
    draw.chord((x1 - 2 * r, y1 - 2 * r, x1, y1), 0, 90, fill=fill, outline=None)
    draw.rectangle([x0 + r, y0, x1 - r, y1], fill=fill, outline=None)
    draw.rectangle([x0, y0 + r, x1, y1 - r], fill=fill, outline=None)


def create_icon(size):
    """Create a single icon image at the given size.

    Returns a PIL Image in RGBA mode with rounded-square green gradient and white MK text.
    """
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Scaling factors
    scale = size / BASE_SIZE

    # Rounded square dimensions with padding
    margin = int(16 * scale)
    rect_left = margin
    rect_top = margin
    rect_right = size - margin
    rect_bottom = size - margin

    radius = max(int(48 * scale), 4)

    # Draw gradient-filled rounded square by scanning line by line.
    for y in range(rect_top, rect_bottom + 1):
        t_v = (y - rect_top) / max(rect_bottom - rect_top, 1)
        # Gradient is diagonal: top-left is light, bottom-right is dark
        base_color = Color.lerp(GREEN_LIGHT + (255,), GREEN_DARK + (255,), t_v)

        for x in range(rect_left, rect_right + 1):
            tx, ty = (x - rect_left) / max(rect_right - rect_left, 1), t_v
            # Check if point is inside rounded rectangle
            cx, cy = rect_left + radius, rect_top + radius

            if x < rect_left or y < rect_top or x > rect_right or y > rect_bottom:
                continue

            in_rect = True
            corner_dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)

            # Check four corners
            if x <= rect_left + radius and y <= rect_top + radius:
                if corner_dist > radius:
                    in_rect = False
            elif x >= rect_right - radius and y <= rect_top + radius:
                cx, cy = rect_right - radius, rect_top + radius
                if math.sqrt((x - cx) ** 2 + (y - cy) ** 2) > radius:
                    in_rect = False
            elif x <= rect_left + radius and y >= rect_bottom - radius:
                cx, cy = rect_left + radius, rect_bottom - radius
                if math.sqrt((x - cx) ** 2 + (y - cy) ** 2) > radius:
                    in_rect = False
            elif x >= rect_right - radius and y >= rect_bottom - radius:
                cx, cy = rect_right - radius, rect_bottom - radius
                if math.sqrt((x - cx) ** 2 + (y - cy) ** 2) > radius:
                    in_rect = False

            if in_rect:
                # Add a slight brightness boost toward center for depth
                mx = size / 2
                my = size / 2
                dist_center = math.sqrt((x - mx) ** 2 + (y - my) ** 2)
                max_dist = math.sqrt(2) * (size / 2)
                boost = max(0, 1 - dist_center / max_dist) * 30
                final_color = tuple(min(255, c + int(boost)) for c in base_color)
                img.putpixel((x, y), final_color)

    # Draw MK text
    font_size = max(int(140 * scale), 12)
    try:
        from PIL import ImageFont
        fonts_to_try = [
            "C:\\Windows\\Fonts\\SegoeUI-Bold.ttf",
            "C:\\Windows\\Fonts\\Arial-Bold.ttf",
            "C:\\Windows\\Fonts\\arialbd.ttf",
            "C:\\Windows\\Fonts\\arial.ttf",
        ]
        font = None
        for fpath in fonts_to_try:
            if os.path.exists(fpath):
                try:
                    font = ImageFont.truetype(fpath, font_size)
                    break
                except Exception:
                    pass

        if font is None:
            font = ImageFont.load_default()
    except ImportError:
        font = ImageFont.load_default()

    # Measure text and center it
    try:
        bbox = draw.textbbox((0, 0), "MK", font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
    except AttributeError:
        text_w, text_h = draw.textsize("MK", font=font)

    text_x = (size - text_w) // 2
    text_y = (size - text_h) // 2 - int(8 * scale)

    # Draw white text with a strong drop shadow for contrast against green
    shadow_color = (0, 0, 0, 180)
    draw.text((text_x + 3, text_y + 3), "MK", fill=shadow_color, font=font)
    draw.text((text_x, text_y), "MK", fill=(255, 255, 255, 255), font=font)

    return img


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Generate base 256x256 PNG
    base_img = create_icon(BASE_SIZE)
    png_path = os.path.join(OUTPUT_DIR, "icon.png")
    base_img.save(png_path, "PNG")
    print(f"Saved {png_path} ({os.path.getsize(png_path)} bytes)")

    # Generate multi-size ICO
    ico_sizes = sorted(ICO_SIZES)
    icons = []
    for size in ico_sizes:
        img = create_icon(size)
        resized = img.resize((size, size), Image.LANCZOS)
        icons.append(resized)

    ico_path = os.path.join(OUTPUT_DIR, "icon.ico")
    icons[0].save(ico_path, format="ICO", append_images=icons[1:])
    print(f"Saved {ico_path} ({os.path.getsize(ico_path)} bytes)")

    # Verify ICO contents by reopening
    verify = Image.open(ico_path)
    collected = set()
    try:
        while True:
            collected.add(verify.size[0])
            verify.seek(verify.tell() + 1)
    except EOFError:
        pass
    print("ICO contains sizes:", sorted(collected))


if __name__ == "__main__":
    main()
