#!/usr/bin/env python3
"""Render every frame of the Star Catcher video (1920x1080, 30 fps).

Scenes:
  0-3s    hook      — ONE PROMPT. ONE GAME. + the prompt typed out
  3-11s   terminal  — the agent working: files appearing line by line
  11-27s  gameplay  — the real game, played by the bot, from frames.json
  27-30s  CTA       — your agent can build this too
The make.fun referral end card is appended afterwards by ffmpeg.

Usage: python3 tools/render_frames.py <frames.json> <outdir>
"""
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
FPS = 30
OUT = sys.argv[2]
FRAMES = json.load(open(sys.argv[1]))

SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
MONO_R = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
SANS_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

def font(path, size):
    return ImageFont.truetype(path, size)

# ---- palette ---------------------------------------------------------------
MAGENTA = (255, 79, 154)
INK = (10, 8, 32)
CREAM = (255, 248, 220)
GOLD = (255, 215, 0)
PALE = (255, 224, 102)

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def gradient_bg():
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    stops = [(0.0, (10, 8, 32)), (0.6, (27, 16, 64)), (1.0, (61, 26, 94))]
    for y in range(H):
        t = y / (H - 1)
        if t < 0.6:
            c = lerp(stops[0][1], stops[1][1], t / 0.6)
        else:
            c = lerp(stops[1][1], stops[2][1], (t - 0.6) / 0.4)
        d.line([(0, y), (W, y)], fill=c)
    return img

BASE = gradient_bg()

def draw_star(d, x, y, r, rot, color):
    pts = []
    for i in range(8):
        a = rot + i * math.pi / 4
        rr = r if i % 2 == 0 else r * 0.38
        pts.append((x + math.cos(a) * rr, y + math.sin(a) * rr))
    d.polygon(pts, fill=color)

def draw_bg_stars(d, snap):
    for b in snap["bgStars"]:
        tw = 0.45 + 0.55 * abs(math.sin(snap["t"] * b["speed"] + b["phase"]))
        v = int(255 * tw)
        r = b["r"]
        d.ellipse([b["x"] - r, b["y"] - r, b["x"] + r, b["y"] + r],
                  fill=(v, v, int(220 * tw)))

def text_center(d, y, s, f, fill):
    w = d.textlength(s, font=f)
    d.text(((W - w) / 2, y), s, font=f, fill=fill)

def fade(k):
    return max(0.0, min(1.0, k))

# ---- scenes ----------------------------------------------------------------
def hook_frame(i):
    img = BASE.copy()
    d = ImageDraw.Draw(img)
    # a few drifting stars for life
    for k in range(40):
        x = (k * 173) % W
        y = (k * 97) % 500 + 40
        r = 2 + (k % 3)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 248, 220))
    f_big = font(SANS, 170)
    f_mid = font(SANS, 110)
    f_prm = font(MONO, 46)
    if i >= 2:
        a = fade((i - 2) / 12)
        d.text((120, 200), "ONE PROMPT.", font=f_big,
               fill=tuple(int(255 * a) if j == 0 else int(c * a) for j, c in enumerate((255, 255, 255))))
    if i >= 32:
        a = fade((i - 32) / 12)
        d.text((120, 400), "ONE GAME.", font=f_mid,
               fill=tuple(int(c * a) for c in MAGENTA))
    if i >= 62:
        prompt = '"Build me a tiny browser game: catch the falling stars"'
        n = int((i - 62) / 1.2) + 1
        shown = prompt[:max(0, min(len(prompt), n))]
        d.text((120, 640), "> " + shown, font=f_prm, fill=CREAM)
        if (i // 15) % 2 == 0 and n < len(prompt):
            w = d.textlength("> " + shown, font=f_prm)
            d.rectangle([120 + w + 6, 640, 120 + w + 22, 640 + 52], fill=CREAM)
    return img

TERM_LINES = [
    ('$ muse "build me a tiny browser game: catch the falling stars"', CREAM),
    ("✓ game.html — the page", (140, 255, 170)),
    ("✓ game.js — Star Catcher: 30s round, 5 lives", (140, 255, 170)),
    ("✓ deterministic seed 20261123 — every run plays the same", (140, 255, 170)),
    ("✓ built in one prompt — now watch it play", (255, 215, 0)),
]

def terminal_frame(i):
    img = BASE.copy()
    d = ImageDraw.Draw(img)
    # window
    x0, y0, x1, y1 = 160, 170, 1760, 910
    d.rounded_rectangle([x0, y0, x1, y1], radius=28, fill=(16, 14, 40))
    d.rounded_rectangle([x0, y0, x1, y1], radius=28, outline=(90, 70, 140), width=3)
    d.ellipse([x0 + 36, y0 + 30, x0 + 62, y0 + 56], fill=(255, 95, 86))
    d.ellipse([x0 + 76, y0 + 30, x0 + 102, y0 + 56], fill=(255, 189, 46))
    d.ellipse([x0 + 116, y0 + 30, x0 + 142, y0 + 56], fill=(39, 201, 63))
    f_head = font(SANS, 34)
    d.text((x0 + 170, y0 + 24), "agent — working", font=f_head, fill=(160, 150, 200))
    # pulsing dot
    pulse = 0.5 + 0.5 * math.sin(i / 6.0)
    r = 10 + 4 * pulse
    cx, cy = x1 - 90, y0 + 43
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=MAGENTA)
    f_term = font(MONO, 40)
    f_term_r = font(MONO_R, 40)
    y = y0 + 110
    # line 0 types char by char, the rest appear whole in sequence
    per = 30  # frames per line after the first
    total0 = len(TERM_LINES[0][0])
    n0 = min(total0, max(0, int(i * 1.6)))
    d.text((x0 + 40, y), TERM_LINES[0][0][:n0], font=f_term, fill=TERM_LINES[0][1])
    y += 86
    for li in range(1, len(TERM_LINES)):
        start = 44 + (li - 1) * per
        if i >= start:
            d.text((x0 + 40, y), TERM_LINES[li][0], font=f_term_r, fill=TERM_LINES[li][1])
        y += 86
    # cursor
    if i < 44:
        w = d.textlength(TERM_LINES[0][0][:n0], font=f_term)
        if (i // 12) % 2 == 0:
            d.rectangle([x0 + 40 + w + 4, y0 + 110, x0 + 40 + w + 20, y0 + 110 + 46], fill=CREAM)
    return img

def cta_frame(i, last_snap):
    # dimmed last gameplay frame
    img = draw_game_from_snap(last_snap)
    ov = Image.new("RGBA", (W, H), (10, 8, 32, 170))
    img = Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")
    d = ImageDraw.Draw(img)
    a = fade(i / 15)
    msg = "Your agent can build this too."
    size = 118
    while True:
        f_big = font(SANS, size)
        if d.textlength(msg, font=f_big) <= 1700 or size <= 60:
            break
        size -= 6
    f_sub = font(SANS, 64)
    white = tuple(int(c * a) for c in (255, 255, 255))
    mag = tuple(int(c * a) for c in MAGENTA)
    text_center(d, 380, "Your agent can build this too.", f_big, white)
    text_center(d, 560, "Come build on make.fun", f_sub, mag)
    return img

def draw_game_from_snap(snap):
    img = BASE.copy()
    d = ImageDraw.Draw(img)
    draw_bg_stars(d, snap)
    for s in snap["stars"]:
        draw_star(d, s["x"], s["y"], 38 if s["golden"] else 30,
                  s["spin"], GOLD if s["golden"] else PALE)
    bx = snap["basketX"]
    bw, bh, gy = 260, 46, 960
    d.polygon([(bx - bw / 2, gy), (bx + bw / 2, gy),
               (bx + bw / 2 - 24, gy + bh), (bx - bw / 2 + 24, gy + bh)],
              fill=MAGENTA)
    d.rectangle([bx - bw / 2, gy - 8, bx + bw / 2, gy + 2], fill=(255, 143, 192))
    d.rectangle([0, gy + bh, W, H], fill=(42, 26, 78))
    f_hud = font(SANS, 64)
    d.text((48, 28), "SCORE %d" % snap["score"], font=f_hud, fill=(255, 255, 255))
    t = "%ds" % math.ceil(snap["timeLeft"])
    tw = d.textlength(t, font=f_hud)
    d.text(((W - tw) / 2, 28), t, font=f_hud, fill=(255, 255, 255))
    hearts = ("♥ " * snap["lives"]) + ("♡ " * (5 - snap["lives"]))
    hw = d.textlength(hearts, font=f_hud)
    d.text((W - 48 - hw, 28), hearts, font=f_hud, fill=(255, 120, 180))
    return img

def main():
    os.makedirs(OUT, exist_ok=True)
    n = 0
    # hook 0-90
    for i in range(90):
        hook_frame(i).save(os.path.join(OUT, "f%04d.png" % n)); n += 1
    # terminal 90-330
    for i in range(240):
        terminal_frame(i).save(os.path.join(OUT, "f%04d.png" % n)); n += 1
    # gameplay 330-810
    f_cap = font(SANS, 44)
    for j, snap in enumerate(FRAMES):
        img = draw_game_from_snap(snap)
        if j < 90:
            d = ImageDraw.Draw(img)
            cap = "the real game — played by the agent itself"
            cw = d.textlength(cap, font=f_cap)
            d.rounded_rectangle([(W - cw) / 2 - 24, H - 108, (W + cw) / 2 + 24, H - 40],
                                radius=24, fill=(10, 8, 32))
            d.text(((W - cw) / 2, H - 98), cap, font=f_cap, fill=CREAM)
        img.save(os.path.join(OUT, "f%04d.png" % n)); n += 1
    # CTA 810-900
    last = FRAMES[-1]
    for i in range(90):
        cta_frame(i, last).save(os.path.join(OUT, "f%04d.png" % n)); n += 1
    print("rendered %d frames to %s" % (n, OUT))

main()
