"""Generate GRYND brand PNG assets programmatically using PIL.
Produces: icon.png (1024), adaptive-icon.png (1024), splash-image.png (800), favicon.png (256).
The brand mark is a stylized lightning-bolt + upward chevron — cyan->purple analogous neon gradient on black.
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT_DIR = Path("/app/frontend/assets/images")
OUT_DIR.mkdir(parents=True, exist_ok=True)

CYAN = (0, 229, 255)
PURPLE = (176, 38, 255)
GREEN = (57, 255, 20)
BG = (0, 0, 0)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make_gradient_image(size, top_color, bottom_color):
    """Vertical linear gradient."""
    w, h = size
    img = Image.new("RGB", size, top_color)
    pixels = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        col = lerp(top_color, bottom_color, t)
        for x in range(w):
            pixels[x, y] = col
    return img


def bolt_polygon(cx, cy, size):
    """Return points for a stylized lightning bolt fused with an upward chevron.
    Coordinates are relative to bolt size; returned absolute.
    """
    s = size
    # Bold lightning bolt going down-left then down-right, with arrow head at top
    # Designed in a 100x140 viewbox, then scaled and translated.
    pts_norm = [
        (50, 0),    # top point (arrow tip)
        (95, 50),   # right shoulder
        (62, 55),   # right notch in
        (90, 100),  # right of mid bolt
        (50, 140),  # bottom tip
        (10, 100),  # left of mid bolt
        (38, 55),   # left notch in
        (5, 50),    # left shoulder
    ]
    # Scale: viewbox is 100 wide, 140 tall — fit within size box
    scale = s / 140  # height-driven (taller dimension)
    half_w = 100 * scale / 2
    return [(cx + (x - 50) * scale, cy + (y - 70) * scale) for x, y in pts_norm]


def draw_mark(canvas, cx, cy, mark_size, glow=True):
    """Draw GRYND brand mark on canvas with cyan->purple gradient + glow."""
    # Build a mask of the bolt shape
    W, H = canvas.size
    mask = Image.new("L", (W, H), 0)
    mdraw = ImageDraw.Draw(mask)
    pts = bolt_polygon(cx, cy, mark_size)
    mdraw.polygon(pts, fill=255)

    # Build gradient image (cyan top, purple bottom) sized to canvas
    gradient = make_gradient_image((W, H), CYAN, PURPLE)

    # Composite gradient through mask onto canvas
    canvas.paste(gradient, (0, 0), mask)

    if glow:
        # Outer glow: dilate the mask + heavy blur + tint cyan, blend additive
        glow_mask = mask.filter(ImageFilter.MaxFilter(15))
        glow_mask = glow_mask.filter(ImageFilter.GaussianBlur(radius=max(mark_size // 25, 6)))
        glow_layer = Image.new("RGB", (W, H), CYAN)
        canvas_rgba = canvas.convert("RGB")
        canvas_rgba = Image.composite(
            Image.blend(canvas_rgba, glow_layer, 0.4),
            canvas_rgba,
            glow_mask,
        )
        canvas.paste(canvas_rgba)
        # Re-draw the solid gradient bolt on top so the symbol is crisp
        canvas.paste(gradient, (0, 0), mask)


def add_film_grain(img, opacity=12):
    """Add subtle film-grain noise to RGB image."""
    import random
    W, H = img.size
    noise = Image.new("L", (W, H))
    px = noise.load()
    for y in range(H):
        for x in range(W):
            px[x, y] = random.randint(0, 255)
    noise_rgb = Image.merge("RGB", (noise, noise, noise))
    return Image.blend(img.convert("RGB"), noise_rgb, opacity / 255)


def make_icon(out_path: Path, size: int, bg_transparent: bool = False, with_grain: bool = True):
    if bg_transparent:
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        # Draw on opaque temp then mask
        temp = Image.new("RGB", (size, size), BG)
        draw_mark(temp, size // 2, size // 2, int(size * 0.6), glow=True)
        # Build alpha from how far each pixel is from BG (any non-pure-black goes opaque)
        alpha = Image.new("L", (size, size), 0)
        pixels_a = alpha.load()
        pixels_t = temp.load()
        for y in range(size):
            for x in range(size):
                r, g, b = pixels_t[x, y]
                if r + g + b > 8:
                    pixels_a[x, y] = 255
        canvas = Image.merge("RGBA", (*temp.split(), alpha))
    else:
        canvas = Image.new("RGB", (size, size), BG)
        draw_mark(canvas, size // 2, size // 2, int(size * 0.6), glow=True)
        if with_grain:
            canvas = add_film_grain(canvas, opacity=8)
        canvas = canvas.convert("RGBA")

    canvas.save(out_path, "PNG", optimize=True)
    print(f"  ✓ {out_path.name} ({size}x{size})")


def make_splash(out_path: Path, size: int = 800):
    """Splash: mark centered, wordmark below, transparent bg."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # Render mark on opaque, then composite
    temp = Image.new("RGB", (size, size), BG)
    mark_size = int(size * 0.45)
    cy = int(size * 0.40)
    draw_mark(temp, size // 2, cy, mark_size, glow=True)

    # Alpha: anything non-black
    alpha = Image.new("L", (size, size), 0)
    px_a = alpha.load()
    px_t = temp.load()
    for y in range(size):
        for x in range(size):
            r, g, b = px_t[x, y]
            if r + g + b > 8:
                px_a[x, y] = 255
    composed = Image.merge("RGBA", (*temp.split(), alpha))

    # Wordmark "GRYND"
    draw = ImageDraw.Draw(composed)
    font_size = int(size * 0.13)
    font = None
    for candidate in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]:
        if Path(candidate).exists():
            font = ImageFont.truetype(candidate, font_size)
            break
    if font is None:
        font = ImageFont.load_default()
    text = "GRYND"
    # Compute width to center
    bbox = draw.textbbox((0, 0), text, font=font, stroke_width=0)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    text_x = (size - tw) // 2
    text_y = cy + mark_size // 2 + int(size * 0.04)
    # Draw with letter spacing by drawing chars one by one
    cur_x = text_x
    letter_spacing = int(size * 0.012)
    for ch in text:
        draw.text((cur_x, text_y), ch, font=font, fill=(255, 255, 255, 255))
        bb = draw.textbbox((0, 0), ch, font=font)
        cur_x += (bb[2] - bb[0]) + letter_spacing

    composed.save(out_path, "PNG", optimize=True)
    print(f"  ✓ {out_path.name} ({size}x{size})")


if __name__ == "__main__":
    print("Generating GRYND brand assets…")
    make_icon(OUT_DIR / "icon.png", 1024, bg_transparent=False, with_grain=True)
    make_icon(OUT_DIR / "adaptive-icon.png", 1024, bg_transparent=True, with_grain=False)
    make_icon(OUT_DIR / "favicon.png", 256, bg_transparent=False, with_grain=False)
    make_splash(OUT_DIR / "splash-image.png", 800)
    print("Done.")
