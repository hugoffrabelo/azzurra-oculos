"""Comprime as fotos do site para a web (mantém os mesmos nomes de arquivo).
Uso: python tools/comprimir-fotos.py
- Fotos de produto (assets/images/products): no máximo 800x800
- Capas do Guia (assets/images/guia): no máximo 900 px no lado maior
JPEG progressivo qualidade 82, sem metadados. Fotos já pequenas só são otimizadas.
"""
from pathlib import Path
from PIL import Image

IMAGENS = Path(__file__).resolve().parent.parent / "assets" / "images"
PASTAS = {"products": 800, "guia": 900}
QUALIDADE = 82

antes = depois = 0
for pasta, lado in PASTAS.items():
    for f in sorted((IMAGENS / pasta).glob("*.jpg")):
        tam0 = f.stat().st_size
        with Image.open(f) as im:
            ja_otimizada = max(im.size) <= lado and tam0 <= 150 * 1024
        if ja_otimizada:   # não recomprime (evita perder qualidade a cada execução)
            continue
        with Image.open(f) as im:
            im = im.convert("RGB")
            if max(im.size) > lado:
                im.thumbnail((lado, lado), Image.LANCZOS)
            im.save(f, "JPEG", quality=QUALIDADE, optimize=True, progressive=True)
        tam1 = f.stat().st_size
        antes += tam0
        depois += tam1
        print(f"{pasta}/{f.name:34} {tam0 // 1024:5} KB -> {tam1 // 1024:4} KB")
print(f"Total: {antes / 1048576:.1f} MB -> {depois / 1048576:.2f} MB")
