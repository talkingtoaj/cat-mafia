"""Draw the sidewalk strip: a gutter along the shops, slanted cobbles, and a curb.

The strip repeats every WIDTH pixels with no seam.
Run from the repo root: python3 art/tools/sidewalk.py
"""
import random
from PIL import Image

WIDTH, HEIGHT = 288, 34
SLANT = 0.6  # how far each stone edge leans right per pixel going up

MORTAR = (42, 40, 34)
DARK = (23, 21, 18)
STONES = [(175, 130, 82), (154, 137, 112), (184, 161, 125), (175, 142, 94), (168, 151, 126), (152, 123, 90)]
LIGHT = (200, 173, 130)
SHADE = (105, 87, 65)
GUTTER_LIP = (126, 111, 87)
GUTTER_DEEP = (58, 52, 41)
WATER = (75, 70, 50)
WATER_GLINT = (152, 160, 150)
CURB_TOP = (214, 196, 160)
CURB_FACE = (126, 111, 87)
CURB_SHADE = (75, 70, 50)

# Cobble rows from back (top) to front: (height, stone width). Farther rows are smaller.
ROWS = [(4, 8), (5, 12), (6, 16), (7, 18)]
GUTTER_H = 6
CURB_H = 6


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def main():
    rnd = random.Random(7)
    im = Image.new('RGB', (WIDTH, HEIGHT), MORTAR)
    px = im.load()

    # Gutter: a stone lip, a dark wet channel, and an iron grate now and then.
    for x in range(WIDTH):
        px[x, 0] = GUTTER_LIP
        px[x, 1] = DARK
        for y in range(2, GUTTER_H - 1):
            px[x, y] = GUTTER_DEEP if y < 3 else WATER
        px[x, GUTTER_H - 1] = LIGHT
    for x in range(0, WIDTH, 7):  # slow ripples on the water
        px[(x + rnd.randrange(3)) % WIDTH, 4] = WATER_GLINT
    for gx in (40, 184):
        for x in range(gx, gx + 12):
            for y in range(1, GUTTER_H - 1):
                px[x, y] = DARK if (x - gx) % 2 else (90, 92, 96)
        for y in range(1, GUTTER_H - 1):
            px[gx - 1, y] = px[gx + 12, y] = DARK

    # Slanted cobbles.
    y0 = GUTTER_H
    for row, (h, sw) in enumerate(ROWS):
        count = WIDTH // sw
        tones = [rnd.choice(STONES) for _ in range(count)]
        offset = rnd.randrange(sw)
        yb = y0 + h - 1
        for y in range(y0, yb + 1):
            for x in range(WIDTH):
                u = (x - offset - (yb - y) * SLANT) % WIDTH
                i, lu = int(u // sw) % count, u % sw
                top, bottom = y == y0, y == yb
                left, right = lu < 1, lu >= sw - 1
                if top or left:
                    c = MORTAR
                elif (y == y0 + 1 and lu < 2) or (bottom and right):
                    c = MORTAR  # rounded corners
                elif y == y0 + 1 or lu < 2:
                    c = lerp(tones[i], LIGHT, 0.5)
                elif bottom or right:
                    c = lerp(tones[i], SHADE, 0.6)
                else:
                    c = tones[i]
                px[x, y] = c
        y0 = yb + 1

    # Little cracks and dirt, never on mortar.
    for _ in range(60):
        x, y = rnd.randrange(WIDTH), rnd.randrange(GUTTER_H + 1, y0)
        if px[x, y] in STONES:
            px[x, y] = lerp(px[x, y], SHADE, 0.7)

    # Curb: worn top edge and a shaded front face with joints.
    for x in range(WIDTH):
        px[x, y0] = CURB_TOP
        px[x, y0 + 1] = lerp(CURB_TOP, CURB_FACE, 0.4)
        for y in range(y0 + 2, HEIGHT):
            px[x, y] = CURB_FACE if y < HEIGHT - 1 else CURB_SHADE
    for jx in range(0, WIDTH, 24):
        for y in range(y0 + 2, HEIGHT):
            px[jx, y] = CURB_SHADE

    assert y0 + CURB_H == HEIGHT, (y0, HEIGHT)
    im.save('public/assets/tiles/sidewalk.png')


main()
