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
  4. salva em site/assets/images/provador/<id>.webp (WebP com transparência)
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

from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(AQUI)
SAIDA = os.path.join(SITE, 'assets', 'images', 'provador')
ENTRADA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(SITE), 'fotos-provador')
LARGURA_MAX = 900
TOLERANCIA = 28          # diferença de cor aceita como "fundo"
# armações claras pedem tolerância menor para não serem apagadas junto com o fundo
TOLERANCIA_POR_ID = {'cat-eye-branco': 8, 'quadrado-cristal': 14}


def ids_do_catalogo():
    js = open(os.path.join(SITE, 'assets', 'js', 'products.js'), encoding='utf8').read()
    return set(re.findall(r"id: '([^']+)'", js))


def tem_transparencia(im):
    if im.mode != 'RGBA':
        return False
    return im.getchannel('A').getextrema()[0] < 250


def remover_fundo(im, tol=TOLERANCIA):
    """Apaga o fundo liso: tudo da cor do fundo ligado às bordas, mais os "buracos"
    de fundo presos dentro da armação (ex.: entre as duas pontes do aviador).
    A borda fica com transparência gradual para não aparecer contorno branco."""
    import numpy as np
    from scipy import ndimage
    rgb = np.asarray(im.convert('RGB')).astype(np.int16)
    h, w, _ = rgb.shape
    borda = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    cor_fundo = np.median(borda, axis=0)
    dist = np.abs(rgb - cor_fundo).max(axis=2)
    candidato = dist <= tol
    rotulos, n = ndimage.label(candidato)
    na_borda = set(np.unique(np.concatenate([rotulos[0], rotulos[-1], rotulos[:, 0], rotulos[:, -1]]))) - {0}
    fundo = np.isin(rotulos, list(na_borda))
    # buracos internos: grandes o suficiente e praticamente da cor exata do fundo
    tam = ndimage.sum(np.ones_like(rotulos), rotulos, index=np.arange(1, n + 1))
    media = ndimage.mean(dist, rotulos, index=np.arange(1, n + 1))
    for i in range(n):
        if (i + 1) not in na_borda and tam[i] >= 150 and media[i] <= tol * 0.35:
            fundo |= rotulos == (i + 1)
    alfa = np.where(fundo, 0.0, 1.0)
    # faixa de 2 px em volta do fundo: transparência proporcional à diferença de cor
    faixa = ndimage.binary_dilation(fundo, iterations=2) & ~fundo
    alfa[faixa] = np.clip((dist[faixa] - tol * 0.3) / (tol * 1.6), 0, 1)
    saida = im.convert('RGBA')
    saida.putalpha(Image.fromarray((alfa * 255).astype(np.uint8), 'L'))
    return saida


def preparar(caminho, destino, tol=TOLERANCIA):
    im = Image.open(caminho)
    im.load()
    if not tem_transparencia(im):
        im = remover_fundo(im, tol)
    im = im.convert('RGBA')
    caixa = im.getchannel('A').point(lambda a: 255 if a > 20 else 0).getbbox()
    if not caixa:
        raise ValueError('a imagem ficou vazia depois de tirar o fundo')
    im = im.crop(caixa)
    if im.width > LARGURA_MAX:
        im = im.resize((LARGURA_MAX, round(im.height * LARGURA_MAX / im.width)), Image.LANCZOS)
    im.save(destino, 'WEBP', quality=86, method=6)   # WebP com transparência: bem mais leve que PNG
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
            tam = preparar(os.path.join(ENTRADA, nome), os.path.join(SAIDA, base + '.webp'), TOLERANCIA_POR_ID.get(base, TOLERANCIA))
            print(f'  ok  {base}.webp  {tam[0]}x{tam[1]}')
        except Exception as e:  # noqa: BLE001
            print(f'  ERRO em {nome}: {e}')
    # lista final = tudo o que existe na pasta de saída e ainda está no catálogo
    for arq in sorted(os.listdir(SAIDA)):
        base, ext = os.path.splitext(arq)
        if ext == '.webp' and base in ids:
            prontos.append(base)
    with open(os.path.join(SAIDA, 'lista.json'), 'w', encoding='utf8') as f:
        json.dump(prontos, f, ensure_ascii=False, indent=2)
    print(f'{len(prontos)} óculos com imagem real no provador.')


if __name__ == '__main__':
    main()
