"""Gera as ilustrações do japonês (SVG -> PNG -> WebP): início (com balão), trilha e semana.
Uso: python3 scripts/ja-art.py  (precisa de Playwright/Chromium e Pillow)"""
import math, random, os, subprocess, json
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'media')
random.seed(7)
RED = '#d62839'; RED2 = '#b51d2e'; INK = '#1d1a1f'; CREAM = '#fff8f3'

def defs():
    return f'''<defs>
 <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf6"/><stop offset="1" stop-color="#fde7e2"/></linearGradient>
 <radialGradient id="sun" cx=".42" cy=".38" r=".75"><stop offset="0" stop-color="#f0504f"/><stop offset=".7" stop-color="{RED}"/><stop offset="1" stop-color="#c41f33"/></radialGradient>
 <linearGradient id="fuji" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3f5c"/><stop offset="1" stop-color="#262636"/></linearGradient>
 <linearGradient id="hill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7d6d2"/><stop offset="1" stop-color="#f1c3bf"/></linearGradient>
 <radialGradient id="disc" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#3a3740"/><stop offset="1" stop-color="#141216"/></radialGradient>
 <linearGradient id="rice" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f1ece8"/></linearGradient>
 <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#7a2a2a" flood-opacity=".18"/></filter>
 <pattern id="sei" width="56" height="28" patternUnits="userSpaceOnUse">
  <g fill="none" stroke="#f3c9c3" stroke-width="2">
   <path d="M0 28a28 28 0 0 1 56 0M8 28a20 20 0 0 1 40 0M16 28a12 12 0 0 1 24 0"/>
   <path d="M-28 14a28 28 0 0 1 56 0M-20 14a20 20 0 0 1 40 0M-12 14a12 12 0 0 1 24 0" transform="translate(28 0)"/>
  </g>
 </pattern>
</defs>'''

def sun(cx, cy, r):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#sun)"/>'

def fuji(x, base, w, h):
    # montanha com topo achatado e neve recortada
    l, r = x - w / 2, x + w / 2
    tw = w * 0.075
    top = base - h
    m = f'M{l} {base} C{l + w*.18} {base - h*.25} {x - tw*1.6} {top + h*.12} {x - tw} {top} L{x + tw} {top} C{x + tw*1.6} {top + h*.12} {r - w*.18} {base - h*.25} {r} {base} Z'
    sy = top + h * 0.36
    snow = (f'M{x - tw} {top} L{x + tw} {top} C{x + tw*1.35} {top + h*.1} {x + tw*1.9} {top + h*.22} {x + tw*2.35} {sy} '
            f'L{x + tw*1.6} {sy - h*.05} L{x + tw*1.05} {sy + h*.02} L{x + tw*.35} {sy - h*.07} L{x - tw*.35} {sy + h*.03} '
            f'L{x - tw*1.1} {sy - h*.06} L{x - tw*1.7} {sy + h*.01} L{x - tw*2.35} {sy} C{x - tw*1.9} {top + h*.22} {x - tw*1.35} {top + h*.1} {x - tw} {top} Z')
    return f'<path d="{m}" fill="url(#fuji)"/><path d="{snow}" fill="#fff"/>'

def torii(x, base, s):
    # portão vermelho
    w = 110 * s; h = 120 * s; p = 9 * s
    return f'''<g fill="{RED}">
 <rect x="{x - w*.36}" y="{base - h}" width="{p}" height="{h}" rx="{p*.3}"/>
 <rect x="{x + w*.36 - p}" y="{base - h}" width="{p}" height="{h}" rx="{p*.3}"/>
 <rect x="{x - w*.47}" y="{base - h*.78}" width="{w*.94}" height="{p*.9}" rx="{p*.3}"/>
 <path d="M{x - w*.62} {base - h - p*.6} Q{x} {base - h - p*.2} {x + w*.62} {base - h - p*.6} L{x + w*.58} {base - h + p*1.1} Q{x} {base - h + p*1.5} {x - w*.58} {base - h + p*1.1} Z"/>
 <rect x="{x - p*.45}" y="{base - h + p}" width="{p*.9}" height="{h*.22 - p*.2}"/>
</g><path d="M{x - w*.6} {base - h - p*.55} Q{x} {base - h - p*.15} {x + w*.6} {base - h - p*.55}" stroke="{INK}" stroke-width="{p*.7}" fill="none" stroke-linecap="round"/>'''

def blossom(cx, cy, r, rot=0, c='#f9a8b8', c2='#ffd3dc'):
    petals = []
    for i in range(5):
        a = math.radians(rot + i * 72)
        px, py = cx + math.cos(a) * r * .55, cy + math.sin(a) * r * .55
        petals.append(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{r*.52:.1f}" ry="{r*.4:.1f}" transform="rotate({rot + i*72 + 90:.1f} {px:.1f} {py:.1f})" fill="{c}"/>')
    return ''.join(petals) + f'<circle cx="{cx}" cy="{cy}" r="{r*.32}" fill="{c2}"/><circle cx="{cx}" cy="{cy}" r="{r*.14}" fill="#e2566c"/>'

def branch(x, y, s, flip=1):
    d = f'M{x} {y} C{x + 90*s*flip} {y + 30*s} {x + 160*s*flip} {y + 20*s} {x + 250*s*flip} {y + 70*s}'
    d2 = f'M{x + 120*s*flip} {y + 28*s} C{x + 150*s*flip} {y + 60*s} {x + 170*s*flip} {y + 80*s} {x + 160*s*flip} {y + 115*s}'
    g = f'<path d="{d}" stroke="#5a3b36" stroke-width="{9*s}" fill="none" stroke-linecap="round"/><path d="{d2}" stroke="#5a3b36" stroke-width="{6*s}" fill="none" stroke-linecap="round"/>'
    for (bx, by, br) in [(70, 18, 22), (135, 30, 26), (200, 46, 22), (250, 72, 18), (160, 112, 20), (100, 50, 15), (185, 85, 16)]:
        g += blossom(x + bx*s*flip, y + by*s, br*s, rot=random.randint(0, 72))
    return g

def petal(x, y, s, rot):
    return f'<ellipse cx="{x}" cy="{y}" rx="{7*s}" ry="{4.5*s}" transform="rotate({rot} {x} {y})" fill="#f7a1b3" opacity=".9"/>'

def vinyl(cx, cy, r):
    g = f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#disc)" filter="url(#soft)"/>'
    for k in range(6):
        rr = r * (.42 + k * .095)
        g += f'<circle cx="{cx}" cy="{cy}" r="{rr:.1f}" fill="none" stroke="#ffffff" stroke-opacity=".07" stroke-width="2"/>'
    g += f'<path d="M{cx - r*.7} {cy - r*.45} A{r*.83} {r*.83} 0 0 1 {cx - r*.1} {cy - r*.82}" stroke="#fff" stroke-opacity=".22" stroke-width="{r*.06}" fill="none" stroke-linecap="round"/>'
    g += f'<circle cx="{cx}" cy="{cy}" r="{r*.34}" fill="#fff"/><circle cx="{cx}" cy="{cy}" r="{r*.22}" fill="{RED}"/><circle cx="{cx}" cy="{cy}" r="{r*.045}" fill="{INK}"/>'
    return g

def note(x, y, s, c=INK, rot=0):
    return f'<g transform="translate({x} {y}) rotate({rot}) scale({s})" fill="{c}"><ellipse cx="0" cy="22" rx="9" ry="7" transform="rotate(-20 0 22)"/><rect x="6" y="-14" width="4" height="37" rx="2"/><path d="M8 -14c8 2 16 6 16 16-3-6-9-8-16-8z"/></g>'

def onigiri(cx, cy, s, phones=True, wave=False):
    w = 170 * s; h = 160 * s
    top = cy - h / 2; bot = cy + h / 2
    body = (f'M{cx} {top} C{cx + w*.18} {top} {cx + w*.52} {bot - h*.28} {cx + w*.5} {bot - h*.1} '
            f'C{cx + w*.48} {bot + h*.04} {cx + w*.3} {bot} {cx} {bot} C{cx - w*.3} {bot} {cx - w*.48} {bot + h*.04} {cx - w*.5} {bot - h*.1} '
            f'C{cx - w*.52} {bot - h*.28} {cx - w*.18} {top} {cx} {top} Z')
    g = f'<g filter="url(#soft)"><path d="{body}" fill="url(#rice)" stroke="#e7ddd6" stroke-width="{2*s}"/></g>'
    # alga
    nw = w * .34; nh = h * .3
    g += f'<rect x="{cx - nw/2}" y="{bot - nh}" width="{nw}" height="{nh}" rx="{6*s}" fill="#22302a"/><rect x="{cx - nw/2 + 6*s}" y="{bot - nh + 8*s}" width="{nw*.25}" height="{4*s}" rx="2" fill="#3c5148"/>'
    # rosto
    ey = cy - h * .02
    g += f'<ellipse cx="{cx - w*.15}" cy="{ey}" rx="{9*s}" ry="{11*s}" fill="{INK}"/><ellipse cx="{cx + w*.15}" cy="{ey}" rx="{9*s}" ry="{11*s}" fill="{INK}"/>'
    g += f'<circle cx="{cx - w*.15 + 3*s}" cy="{ey - 4*s}" r="{3.2*s}" fill="#fff"/><circle cx="{cx + w*.15 + 3*s}" cy="{ey - 4*s}" r="{3.2*s}" fill="#fff"/>'
    g += f'<ellipse cx="{cx - w*.27}" cy="{ey + 16*s}" rx="{11*s}" ry="{7*s}" fill="#f7a1b3" opacity=".8"/><ellipse cx="{cx + w*.27}" cy="{ey + 16*s}" rx="{11*s}" ry="{7*s}" fill="#f7a1b3" opacity=".8"/>'
    g += f'<path d="M{cx - 10*s} {ey + 12*s} Q{cx} {ey + 24*s} {cx + 10*s} {ey + 12*s}" stroke="{INK}" stroke-width="{4*s}" fill="#e2566c" stroke-linecap="round" stroke-linejoin="round"/>'
    if phones:
        g += f'<path d="M{cx - w*.44} {cy + h*.02} C{cx - w*.5} {top - h*.18} {cx + w*.5} {top - h*.18} {cx + w*.44} {cy + h*.02}" stroke="{INK}" stroke-width="{11*s}" fill="none" stroke-linecap="round"/>'
        for sx in (-1, 1):
            g += f'<rect x="{cx + sx*w*.46 - 15*s}" y="{cy - 20*s}" width="{30*s}" height="{46*s}" rx="{13*s}" fill="{RED}" stroke="{INK}" stroke-width="{4*s}"/>'
    if wave:
        g += f'<path d="M{cx + w*.45} {cy + h*.05} q{30*s} {-25*s} {38*s} {-60*s}" stroke="#efe6df" stroke-width="{18*s}" fill="none" stroke-linecap="round"/>'
    return g

def bubble(x, y, w, h, tx, ty):
    r = 26
    return (f'<g filter="url(#soft)"><path d="M{x + r} {y} H{x + w - r} Q{x + w} {y} {x + w} {y + r} V{y + h - r} Q{x + w} {y + h} {x + w - r} {y + h} '
            f'H{x + w*.34} L{tx} {ty} L{x + w*.18} {y + h} H{x + r} Q{x} {y + h} {x} {y + h - r} V{y + r} Q{x} {y} {x + r} {y} Z" fill="#fff" stroke="#f1d3cf" stroke-width="2.5"/></g>')

def hills(W, H, y, color='url(#hill)'):
    return (f'<path d="M0 {y} C{W*.15} {y - 40} {W*.3} {y - 10} {W*.45} {y - 30} S{W*.75} {y - 50} {W} {y - 20} V{H} H0 Z" fill="{color}"/>'
            f'<path d="M0 {y + 30} C{W*.2} {y + 5} {W*.4} {y + 40} {W*.6} {y + 20} S{W*.85} {y + 10} {W} {y + 30} V{H} H0 Z" fill="url(#sei)" opacity=".9"/>')

def svg(W, H, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{defs()}<rect width="{W}" height="{H}" fill="url(#sky)"/>{body}</svg>'

arts = {}
# Início: 1200x400, balão à direita (posição usada no HeroGreeting)
W, H = 1200, 400
b = sun(360, 185, 125) + fuji(400, 330, 560, 190) + hills(W, H, 320) + torii(130, 330, 1.05)
b += branch(-10, -6, 1.0) + ''.join(petal(x, y, 1.2, r) for x, y, r in [(300, 60, 20), (520, 40, -30), (600, 110, 45), (250, 150, 10)])
b += vinyl(690, 330, 120) + onigiri(830, 268, .92, phones=True)
b += note(560, 70, 1.4, RED, -8) + note(1150, 250, 1.2, INK, 10) + note(1010, 330, 1.0, RED, -12)
b += bubble(880, 18, 280, 132, 860, 190)
arts['ja-hero'] = (W, H, b, {'left': round(880 / W * 100, 1), 'top': round(18 / H * 100, 1), 'w': round(280 / W * 100, 1), 'h': round(132 / H * 100, 1)})

# Trilha: 1207x389, texto à esquerda
W, H = 1207, 389
b = sun(860, 150, 120) + fuji(900, 320, 600, 200) + hills(W, H, 315) + torii(1120, 330, .95)
b += branch(W + 10, -10, .95, flip=-1) + ''.join(petal(x, y, 1.1, r) for x, y, r in [(560, 80, 20), (640, 40, -30), (480, 160, 45)])
b += vinyl(640, 300, 105) + onigiri(760, 255, .82)
b += note(1010, 60, 1.2, RED, -8) + note(560, 200, 1.0, INK, 10)
arts['ja-trilha'] = (W, H, b, None)

# Semana: 1207x411, o desenho fica à direita (o cartão mascara a esquerda)
W, H = 1207, 411
b = sun(960, 165, 120) + fuji(960, 345, 560, 200) + hills(W, H, 340) + branch(W + 10, -10, 1.0, flip=-1)
b += vinyl(860, 360, 140) + note(700, 120, 1.5, RED, -8) + note(1120, 280, 1.3, INK, 8)
b += ''.join(petal(x, y, 1.2, r) for x, y, r in [(760, 70, 20), (690, 230, -30), (1040, 300, 45)])
arts['ja-semana'] = (W, H, b, None)

tmp = '/tmp/ja-art'
os.makedirs(tmp, exist_ok=True)
for name, (W, H, body, bub) in arts.items():
    open(f'{tmp}/{name}.svg', 'w').write(svg(W, H, body))
    if bub: print(name, 'balão', json.dumps(bub))
js = f'''const {{ chromium }} = require('playwright');
(async () => {{ const b = await chromium.launch({{ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }});
for (const n of {json.dumps(list(arts))}) {{ const p = await b.newPage({{ deviceScaleFactor: 1 }});
 await p.goto('file://{tmp}/' + n + '.svg'); const el = await p.$('svg'); await el.screenshot({{ path: '{tmp}/' + n + '.png' }}); }}
await b.close(); }})();'''
open(f'{tmp}/r.js', 'w').write(js)
subprocess.run(['node', f'{tmp}/r.js'], check=True, cwd='/tmp/claude-0/e2e')
from PIL import Image
for n in arts:
    Image.open(f'{tmp}/{n}.png').convert('RGB').save(os.path.join(OUT, n + '.webp'), quality=88, method=6)
    print('ok', n)
