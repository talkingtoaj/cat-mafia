"""Build the muted backdrop from the two Retro Diffusion halves.

Run from the repo root: python3 art/tools/backdrop.py
"""
from collections import deque
from PIL import Image

DUSK = (62, 44, 88)  # what the far houses fade toward


def clear_sky(im):
    """Flood-fill the sky color from the top edge to transparent."""
    px = im.load()
    w, h = im.size
    sky = px[0, 0]
    q = deque((x, 0) for x in range(w))
    seen = set()
    while q:
        x, y = q.popleft()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h) or px[x, y] != sky:
            continue
        seen.add((x, y))
        px[x, y] = (0, 0, 0, 0)
        q.extend([(x + 1, y), (x - 1, y), (x, y + 1)])


def mute(c):
    r, g, b, a = c
    if a == 0:
        return c
    glow = r > 200 and g > 130 and b < 120  # lit windows stay a bit warm
    gray = (r * 3 + g * 6 + b) // 10
    fade, dusk = (0.25, 0.35) if glow else (0.55, 0.6)
    out = []
    for ch, d in zip((r, g, b), DUSK):
        ch = ch + (gray - ch) * fade
        ch = ch + (d - ch) * dusk
        out.append(round(ch))
    return (*out, 255)


halves = [Image.open(f'art/concepts/backdrop_px_{s}.png').convert('RGBA') for s in ('left', 'right')]
for half in halves:
    clear_sky(half)
im = Image.new('RGBA', (sum(h.width for h in halves), halves[0].height))
im.paste(halves[0], (0, 0))
im.paste(halves[1], (halves[0].width, 0))
im.putdata([mute(c) for c in im.getdata()])
im.save('public/assets/tiles/backdrop.png')
print(im.size)
