"""
Prepara as imagens do provador virtual.

Uso (na pasta do projeto):
    python site/tools/preparar-provador.py [pasta-de-entrada]

Entrada: imagens dos óculos de frente (PNG transparente, ou JPG/PNG com fundo liso
branco ou cinza), com o nome igual ao ID do produto. Padrão: ../fotos-provador
(a pasta "fotos-provador" ao lado de "site").

Para cada imagem:
  1. se não tiver transparência, remove o fundo liso a partir das bordas
  2. corta as sobras transparentes
  3. reduz para no máximo 1200 px de largura
  4. salva em site/assets/images/provador/<id>.png
Depois grava site/assets/images/provador/lista.json com os IDs prontos,
que é o que o provador lê para saber quais óculos têm imagem real.
"""
import json
import os
import re
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:  # noqa: BLE001
    pass

from PIL import Image, ImageDraw, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(AQUI)
SAIDA = os.path.join(SITE, 'assets', 'images', 'provador')
ENTRADA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(SITE), 'fotos-provador')
LARGURA_MAX = 1200
TOLERANCIA = 28          # diferença de cor aceita como "fundo"


def ids_do_catalogo():
    js = open(os.path.join(SITE, 'assets', 'js', 'products.js'), encoding='utf8').read()
    return set(re.findall(r"id: '([^']+)'", js))


def tem_transparencia(im):
    if im.mode != 'RGBA':
        return False
    return im.getchannel('A').getextrema()[0] < 250


def remover_fundo(im):
    """Apaga o fundo liso ligado às bordas (flood fill a partir dos cantos e das bordas)."""
    rgb = im.convert('RGB')
    marca = (255, 0, 254)
    w, h = rgb.size
    pontos = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    pontos += [(x, 0) for x in range(0, w, max(1, w // 20))] + [(x, h - 1) for x in range(0, w, max(1, w // 20))]
    pontos += [(0, y) for y in range(0, h, max(1, h // 10))] + [(w - 1, y) for y in range(0, h, max(1, h // 10))]
    for p in pontos:
        if rgb.getpixel(p) != marca:
            ImageDraw.floodfill(rgb, p, marca, thresh=TOLERANCIA)
    # máscara: fundo = 0, óculos = 255; borda suavizada para não serrilhar
    mascara = Image.new('L', (w, h), 255)
    dados = rgb.load()
    m = mascara.load()
    for y in range(h):
        for x in range(w):
            if dados[x, y] == marca:
                m[x, y] = 0
    mascara = mascara.filter(ImageFilter.GaussianBlur(0.8))
    saida = im.convert('RGBA')
    saida.putalpha(mascara)
    return saida


def preparar(caminho, destino):
    im = Image.open(caminho)
    im.load()
    if not tem_transparencia(im):
        im = remover_fundo(im)
    im = im.convert('RGBA')
    caixa = im.getchannel('A').point(lambda a: 255 if a > 20 else 0).getbbox()
    if not caixa:
        raise ValueError('a imagem ficou vazia depois de tirar o fundo')
    im = im.crop(caixa)
    if im.width > LARGURA_MAX:
        im = im.resize((LARGURA_MAX, round(im.height * LARGURA_MAX / im.width)), Image.LANCZOS)
    im.save(destino, 'PNG', optimize=True)
    return im.size


def main():
    if not os.path.isdir(ENTRADA):
        print(f'Pasta não encontrada: {ENTRADA}')
        print('Crie a pasta "fotos-provador" ao lado de "site" e salve as imagens lá.')
        sys.exit(1)
    os.makedirs(SAIDA, exist_ok=True)
    ids = ids_do_catalogo()
    prontos = []
    for nome in sorted(os.listdir(ENTRADA)):
        base, ext = os.path.splitext(nome)
        if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
            continue
        if base not in ids:
            print(f'  ignorado (nome não é um ID do catálogo): {nome}')
            continue
        try:
            tam = preparar(os.path.join(ENTRADA, nome), os.path.join(SAIDA, base + '.png'))
            print(f'  ok  {base}.png  {tam[0]}x{tam[1]}')
        except Exception as e:  # noqa: BLE001
            print(f'  ERRO em {nome}: {e}')
    # lista final = tudo o que existe na pasta de saída e ainda está no catálogo
    for arq in sorted(os.listdir(SAIDA)):
        base, ext = os.path.splitext(arq)
        if ext == '.png' and base in ids:
            prontos.append(base)
    with open(os.path.join(SAIDA, 'lista.json'), 'w', encoding='utf8') as f:
        json.dump(prontos, f, ensure_ascii=False, indent=2)
    print(f'{len(prontos)} óculos com imagem real no provador.')


if __name__ == '__main__':
    main()
