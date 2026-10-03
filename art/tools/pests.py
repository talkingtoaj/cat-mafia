"""Shrink the 32px Retro Diffusion pest sprites to game size, keeping their palette.

Run from the repo root: python3 art/tools/pests.py
"""
from PIL import Image

SIZES = {'pigeon': 22, 'mouse': 18, 'gull': 28}

for name, size in SIZES.items():
    src = Image.open(f'art/sprites_src/{name}.png').convert('RGBA')
    src = src.crop(src.getbbox())
    scale = size / max(src.size)
    w, h = round(src.width * scale), round(src.height * scale)
    small = src.resize((w, h), Image.BOX)
    # Snap colors back to the source palette and make alpha all-or-nothing.
    pal = src.convert('RGB').quantize(colors=16)
    rgb = small.convert('RGB').quantize(palette=pal, dither=Image.Dither.NONE).convert('RGBA')
    out = Image.new('RGBA', (w, h))
    for y in range(h):
        for x in range(w):
            if small.getpixel((x, y))[3] > 110:
                out.putpixel((x, y), rgb.getpixel((x, y))[:3] + (255,))
    out.save(f'public/assets/sprites/{name}.png')
    print(name, out.size)
