"""Baixa a ordem dos traços do KanjiVG (CC BY-SA 3.0, Ulrich Apel) para kana e os kanji do baralho.
Gera public/strokes.json: { "あ": ["M..","M..",...], ... } (caminhos SVG na caixa 109×109, na ordem certa).
Uso: python3 scripts/fetch-strokes.py"""
import json, re, os, sys, urllib.request
ROOT = os.path.join(os.path.dirname(__file__), '..')
src = open(os.path.join(ROOT, 'lib/alphabet.ts'), encoding='utf8').read()
kana = []
for name in ('HIRA', 'KATA'):
    block = src[src.index(f'export const {name}'):]
    block = block[:block.index('];')]
    kana += re.findall(r"\['(.)', '", block)
kanji = re.findall(r"\['(.)', '", open(os.path.join(ROOT, 'lib/kanji.ts'), encoding='utf8').read())
chars = list(dict.fromkeys(kana + kanji))
out = {}
for ch in chars:
    url = f'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/{ord(ch):05x}.svg'
    try:
        svg = urllib.request.urlopen(url, timeout=20).read().decode('utf8')
    except Exception as e:
        print('falhou', ch, e, file=sys.stderr); continue
    paths = re.findall(r'<path id="kvg:[0-9a-f]+-s(\d+)"[^>]*?\sd="([^"]+)"', svg)
    out[ch] = [d for _, d in sorted(paths, key=lambda x: int(x[0]))]
json.dump(out, open(os.path.join(ROOT, 'public/strokes.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'de', len(chars), 'caracteres')
