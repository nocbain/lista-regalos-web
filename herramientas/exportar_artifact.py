"""Pasa una lista antigua (página HTML de claude.ai con el bloque gift_data) al repositorio de datos.

Escribe listas/<nombre>.json y guarda cada foto incrustada como fotos/<id>.jpg.
También quita las entradas de historial sin fecha.

Uso:
  python3 exportar_artifact.py PAGINA.html CARPETA_DATOS [--nombre elena] [--propietario Elena]
"""
import argparse
import base64
import json
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'precios'))
import actualizar_precios as ap  # noqa: E402

DATA_RE = re.compile(r'<script type="application/json" id="gift_data">([\s\S]*?)</script>')
DATA_URL_RE = re.compile(r'^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$')
EXTENSIONS = {'jpeg': 'jpg', 'png': 'png', 'webp': 'webp'}


def slug_of(text):
    text = re.sub(r'[^a-z0-9]+', '_', text.lower()).strip('_')
    return text[:60] or 'lista'


def export_page(page_path, data_dir, slug=None, owner=None):
    with open(page_path, encoding='utf-8') as handle:
        match = DATA_RE.search(handle.read())
    if not match:
        raise SystemExit('No encuentro el bloque gift_data en ' + page_path)
    data = json.loads(match.group(1))
    if owner:
        data['owner_name'] = owner
    data['version'] = ap.DATA_VERSION
    slug = slug or slug_of(data.get('owner_name') or os.path.splitext(os.path.basename(page_path))[0])
    os.makedirs(os.path.join(data_dir, ap.LIST_DIR), exist_ok=True)
    os.makedirs(os.path.join(data_dir, ap.PHOTO_DIR), exist_ok=True)
    photos = 0
    for item in data.get('items', []):
        image_match = DATA_URL_RE.match(item.get('image') or '')
        if image_match:
            safe_id = re.sub(r'[^A-Za-z0-9_-]', '', str(item.get('id')))[:40] or ap.new_id()
            name = safe_id + '.' + EXTENSIONS[image_match.group(1)]
            with open(os.path.join(data_dir, ap.PHOTO_DIR, name), 'wb') as handle:
                handle.write(base64.b64decode(image_match.group(2)))
            item['image'] = ap.PHOTO_DIR + '/' + name
            photos += 1
        elif item.get('image') and not str(item['image']).startswith(ap.PHOTO_DIR + '/'):
            item['image'] = ''
        for offer in item.get('offers') or []:
            offer['history'] = ap.clean_history(offer.get('history'))
    out_path = os.path.join(data_dir, ap.LIST_DIR, slug + '.json')
    ap.write_json(out_path, data)
    return out_path, len(data.get('items', [])), photos


def main():
    parser = argparse.ArgumentParser(description='Exporta una lista antigua de claude.ai al repositorio de datos.')
    parser.add_argument('pagina')
    parser.add_argument('datos')
    parser.add_argument('--nombre', help='nombre del archivo de la lista, sin .json')
    parser.add_argument('--propietario', help='nombre de la persona dueña de la lista')
    args = parser.parse_args()
    out_path, items, photos = export_page(args.pagina, args.datos, args.nombre, args.propietario)
    print(json.dumps({'lista': out_path, 'regalos': items, 'fotos': photos}, ensure_ascii=False))


if __name__ == '__main__':
    main()
