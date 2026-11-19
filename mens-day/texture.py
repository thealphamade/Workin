#!/usr/bin/env python3
"""Adds the crumpled, pasted-poster paper texture to a flat render.

usage: python3 texture.py in.png out.png [seed]
The crease field is procedural (random fold lines + soft wrinkles), lit from
the upper left, and applied so creases read on both the white shirt and the
black paper.
"""
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
seed = int(sys.argv[3]) if len(sys.argv) > 3 else 7
rng = np.random.default_rng(seed)

img = np.asarray(Image.open(src).convert("RGB")).astype(np.float32) / 255.0
H, W = img.shape[:2]
k = W / 1080.0                                  # render scale
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32) / k   # poster units


def smooth_noise(cells_x, cells_y, amp):
    g = rng.standard_normal((cells_y, cells_x)).astype(np.float32)
    g = (g - g.min()) / (g.max() - g.min())
    im = Image.fromarray(g, mode="F").resize((W, H), Image.BICUBIC)   # float: no banding
    return (np.asarray(im, dtype=np.float32) - 0.5) * amp


h = np.zeros((H, W), np.float32)
# long folds: soft ridges along random lines, fading along their length
for _ in range(14):
    cx, cy = rng.uniform(-100, 1180), rng.uniform(-100, 1450)
    ang = rng.uniform(0, np.pi)
    nx, ny = np.cos(ang), np.sin(ang)
    d = (xx - cx) * nx + (yy - cy) * ny                 # across the fold
    t = -(xx - cx) * ny + (yy - cy) * nx                # along the fold
    length = rng.uniform(150, 650)
    width = rng.uniform(3, 8)
    reach = rng.uniform(25, 90)
    sign = rng.choice([-1, 1])
    along = np.exp(-(t / length) ** 2)
    ridge = np.exp(-np.abs(d) / reach) * 0.75 + np.exp(-(d / width) ** 2) * 0.25
    h += sign * rng.uniform(1.0, 3.2) * ridge * along
# short crinkles
for _ in range(45):
    cx, cy = rng.uniform(0, 1080), rng.uniform(0, 1350)
    ang = rng.uniform(0, np.pi)
    nx, ny = np.cos(ang), np.sin(ang)
    d = (xx - cx) * nx + (yy - cy) * ny
    t = -(xx - cx) * ny + (yy - cy) * nx
    along = np.exp(-(t / rng.uniform(30, 140)) ** 2)
    h += rng.choice([-1, 1]) * rng.uniform(.4, 1.1) * np.exp(-np.abs(d) / rng.uniform(8, 22)) * along
# broad, soft buckling of the paper
h += smooth_noise(8, 10, 26) + smooth_noise(18, 22, 9) + smooth_noise(45, 56, 2)

# light from the upper left
gy, gx = np.gradient(h)
gx *= k; gy *= k
nz = 1.0 / np.sqrt(gx * gx + gy * gy + 1.0)
nxv, nyv = -gx * nz, -gy * nz
L = np.array([-0.55, -0.62, 0.56]); L /= np.linalg.norm(L)
s = nxv * L[0] + nyv * L[1] + nz * L[2]
s = s / L[2] - 1.0                                # 0 on flat paper
s = np.clip(s, -0.9, 0.9)

lum = (img @ np.array([0.299, 0.587, 0.114], np.float32))[..., None]
sh = s[..., None]
# multiplicative shading for light areas, additive sheen for dark areas
out = img * (1.0 + (0.22 + 0.33 * (1.0 - lum)) * sh)
out += np.clip(sh, 0, None) * 0.26 * (1.0 - lum)        # highlight ridges on black
out += np.clip(sh, None, 0) * 0.02 * (1.0 - lum)
# very fine paper grain
out += (rng.standard_normal((H, W, 1)).astype(np.float32)) * 0.008
out = np.clip(out, 0, 1)
Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save(dst, optimize=True)
print("wrote", dst)
