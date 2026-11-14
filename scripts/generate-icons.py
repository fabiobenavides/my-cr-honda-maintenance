#!/usr/bin/env python3
"""Generate app icons from a constructed upright sans-serif H.

The mark is a geometric, vertical, bold H in the app teal (#0F6B7A).
It is intentionally not Honda's logo: no slant, no trapezoid legs,
no Honda red, and no wordmark.

Requires Pillow. Run from the repo root:

    python3 scripts/generate-icons.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[1]
ASSETS = REPO / "assets"

# Canvas and brand color
SIZE = 1024
TEAL = (15, 107, 122, 255)  # #0F6B7A
WHITE = (255, 255, 255, 255)

# Upright bold H, optically centered, with comfortable padding.
# Height is ~55% of the canvas, inside Android's 66% adaptive safe zone
# (center 72/108 of the foreground).
H_HEIGHT = 560
STEM = 128
GAP = 208
BAR = 116
RADIUS = 24
H_WIDTH = STEM + GAP + STEM  # 464
H_LEFT = (SIZE - H_WIDTH) // 2  # 280
H_TOP = (SIZE - H_HEIGHT) // 2  # 232
# Crossbar slightly above geometric center for optical balance.
BAR_TOP = H_TOP + (H_HEIGHT - BAR) // 2 - 8

SCALE = 4  # supersample, then downscale for clean edges


def h_rects(scale: int = 1) -> list[tuple[int, int, int, int]]:
    s = scale
    left = H_LEFT * s
    top = H_TOP * s
    stem = STEM * s
    gap = GAP * s
    height = H_HEIGHT * s
    bar = BAR * s
    bar_top = BAR_TOP * s
    right_left = left + stem + gap
    width = H_WIDTH * s
    return [
        (left, top, left + stem, top + height),  # left stem
        (right_left, top, right_left + stem, top + height),  # right stem
        (left, bar_top, left + width, bar_top + bar),  # crossbar
    ]


def draw_h(draw: ImageDraw.ImageDraw, color: tuple[int, int, int, int], scale: int) -> None:
    radius = RADIUS * scale
    for box in h_rects(scale):
        draw.rounded_rectangle(box, radius=radius, fill=color)


def render(background: tuple[int, int, int, int] | None, fill: tuple[int, int, int, int], size: int = SIZE) -> Image.Image:
    canvas = SIZE * SCALE
    if background is None:
        img = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    else:
        img = Image.new("RGBA", (canvas, canvas), background)
    draw = ImageDraw.Draw(img)
    draw_h(draw, fill, SCALE)
    return img.resize((size, size), Image.Resampling.LANCZOS)


def svg_for(background: str | None, fill: str) -> str:
    rects = h_rects(1)
    shapes = "\n".join(
        f'    <rect x="{x}" y="{y}" width="{x2 - x}" height="{y2 - y}" rx="{RADIUS}" ry="{RADIUS}" />'
        for x, y, x2, y2 in rects
    )
    bg = (
        f'  <rect width="{SIZE}" height="{SIZE}" fill="{background}"/>\n'
        if background
        else ""
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 {SIZE} {SIZE}">
  <!-- Upright bold sans-serif H for My Car Maintenance.
       Deliberately not Honda's logo: vertical stems of equal width,
       no slant or trapezoid, no Honda red, no wordmark. Color: app teal #0F6B7A. -->
{bg}  <g fill="{fill}">
{shapes}
  </g>
</svg>
"""


def save_png(img: Image.Image, path: Path, flatten_rgb: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if flatten_rgb:
        img = img.convert("RGB")
    img.save(path, "PNG")
    print(f"wrote {path.relative_to(REPO)} ({img.size[0]}x{img.size[1]} {img.mode})")


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)

    # Source SVGs
    (ASSETS / "icon.svg").write_text(svg_for("#0F6B7A", "#FFFFFF"), encoding="utf-8")
    (ASSETS / "icon-foreground.svg").write_text(svg_for(None, "#FFFFFF"), encoding="utf-8")
    print("wrote assets/icon.svg")
    print("wrote assets/icon-foreground.svg")

    icon = render(TEAL, WHITE)
    foreground = render(None, WHITE)
    monochrome = render(None, WHITE)
    splash = render(None, WHITE)

    save_png(icon, ASSETS / "icon.png", flatten_rgb=True)
    save_png(foreground, ASSETS / "adaptive-icon.png")
    save_png(monochrome, ASSETS / "android-icon-monochrome.png")
    save_png(splash, ASSETS / "splash-icon.png")

    favicon = render(TEAL, WHITE, size=192)
    save_png(favicon, ASSETS / "favicon.png")


if __name__ == "__main__":
    main()
