"""Repaint shop sign text with a hand-made pixel font so it reads crisp.

Run from the repo root: python3 art/tools/signs.py
"""
from PIL import Image

# 4x5 font for the small tea house sign. Accent marks are drawn separately.
SMALL = {
    'C': ['.###', '#...', '#...', '#...', '.###'],
    'A': ['.##.', '#..#', '####', '#..#', '#..#'],
    'Y': ['#.#', '#.#', '.#.', '.#.', '.#.'],
    'O': ['.##.', '#..#', '#..#', '#..#', '.##.'],
    'G': ['.###', '#...', '#.##', '#..#', '.###'],
    'I': ['#', '#', '#', '#', '#'],
    ' ': ['..', '..', '..', '..', '..'],
}
# 5x7 font for the fish shop sign.
BIG = {
    'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    'I': ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
    'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    'C': ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
}


def draw(im, text, font, x0, y0, color, cedilla=(), breve=()):
    """Draw text; indexes in cedilla/breve get the Turkish marks."""
    px = im.load()
    h = len(next(iter(font.values())))
    x = x0
    for i, ch in enumerate(text):
        rows = font[ch]
        w = len(rows[0])
        for dy, row in enumerate(rows):
            for dx, c in enumerate(row):
                if c == '#':
                    px[x + dx, y0 + dy] = color
        mid = x + w // 2
        if i in cedilla:  # little hook under the letter
            px[mid, y0 + h] = color
            px[mid, y0 + h + 1] = color
            px[mid - 1, y0 + h + 1] = color
        if i in breve:  # small cup above the letter
            px[mid - 1, y0 - 2] = color
            px[mid, y0 - 1] = color
            px[mid + 1, y0 - 2] = color
        x += w + 1


def width(text, font):
    return sum(len(font[c][0]) + 1 for c in text) - 1


def repaint(path, box, bg, fg, text, font, y0, **marks):
    im = Image.open(path).convert('RGBA')
    l, t, r, b = box
    for y in range(t, b + 1):
        for x in range(l, r + 1):
            im.putpixel((x, y), bg)
    x0 = l + (r - l + 1 - width(text, font)) // 2
    draw(im, text, font, x0, y0, fg, **marks)
    im.save(path)


S = 'public/assets/shops/'
repaint(S + 'cay.png', (47, 98, 92, 108), (64, 85, 101, 255), (232, 226, 204, 255),
        'CAY OCAGI', SMALL, 101, cedilla={0}, breve={7})
repaint(S + 'balik.png', (31, 79, 78, 89), (232, 230, 224, 255), (31, 57, 101, 255),
        'BALIKCI', BIG, 80, cedilla={5})
