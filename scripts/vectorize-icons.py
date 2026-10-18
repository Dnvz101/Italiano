# Vetoriza um lote de PNGs chapados com UMA paleta compartilhada (consistência entre ícones).
import sys, re, glob, os, json, vtracer
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
files = sorted(glob.glob(os.path.join(SRC, '*.png')))
N = 320

def load(f):
    im = Image.open(f).convert('RGB')
    return im.resize((N, N), Image.LANCZOS)

ims = [load(f) for f in files]
def dist(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b))
WHITE = (255, 255, 255)
H = lambda h: tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
# paleta fixa do Ascolto (tirada dos tons mais frequentes dos ícones gerados)
uniq = [H(x) for x in ['#a0ead2', '#7cd6b2', '#187a70', '#0b3d38', '#bc3263', '#9a1c4c']] + [WHITE]
print('paleta:', ['#%02x%02x%02x' % c for c in uniq])

def near(c):
    return min(uniq, key=lambda p: dist(c, p))

meta = {}
for f, im in zip(files, ims):
    name = os.path.splitext(os.path.basename(f))[0]
    px = im.load()
    for y in range(N):
        for x in range(N):
            px[x, y] = near(px[x, y])
    rgba = im.convert('RGBA')
    d = rgba.load()
    for y in range(N):
        for x in range(N):
            if d[x, y][:3] == WHITE:
                d[x, y] = (255, 255, 255, 0)
    bb = rgba.getbbox()
    pad = 6
    bb = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(N, bb[2] + pad), min(N, bb[3] + pad))
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    side = max(w, h)
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(rgba.crop(bb), ((side - w) // 2, (side - h) // 2))
    tmp = f'/tmp/_q_{name}.png'
    sq.save(tmp)
    out = os.path.join(OUT, name + '.svg')
    vtracer.convert_image_to_svg_py(tmp, out, colormode='color', hierarchical='stacked', mode='spline',
        filter_speckle=10, color_precision=8, layer_difference=10, corner_threshold=60,
        length_threshold=4, splice_threshold=45, path_precision=1)
    s = open(out).read()
    s = re.sub(r'<\?xml[^>]*>\s*', '', s)
    s = re.sub(r'<!--.*?-->\s*', '', s, flags=re.S)
    s = re.sub(r'width="\d+" height="\d+"', f'viewBox="0 0 {side} {side}"', s, count=1)
    open(out, 'w').write(s)
    meta[name] = {'bytes': len(s), 'paths': s.count('<path')}
print(json.dumps(meta))
