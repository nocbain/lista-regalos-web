"""Actualiza los precios y las fotos de las listas de regalos del repositorio de datos.

El repositorio de datos tiene esta forma:
  listas/<nombre>.json   una lista por persona
  fotos/<archivo>.jpg    fotos de los regalos (el campo "image" guarda la ruta)

Fuentes, sin saltar ningún bloqueo:
  1. Ficha de producto de Klarna Shopping España (klarna.com/es/shopping/pl/...): precio por tienda.
  2. Enlace directo de una tienda que no bloquea y publica JSON-LD (por ejemplo IKEA).
Respeta robots.txt, se identifica con su propio User-Agent y espera entre peticiones.

Uso:
  python3 actualizar_precios.py CARPETA_DATOS [--informe informe.json] [--hoy AAAA-MM-DD]
"""
import argparse
import datetime as dt
import html as html_lib
import io
import json
import os
import random
import re
import string
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser

USER_AGENT = 'lista-regalos-precios/1.0 (uso personal)'
REQUEST_PAUSE_SECONDS = 3
REQUEST_TIMEOUT_SECONDS = 20
HISTORY_LIMIT = 60
IMAGE_MAX_SIDE = 480
IMAGE_QUALITY = 82
KLARNA_PRODUCT_RE = re.compile(r'^https://www\.klarna\.com/es/shopping/pl/[^\s"\']+$')
DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
LIST_DIR = 'listas'
PHOTO_DIR = 'fotos'
DATA_VERSION = 2
LD_RE = re.compile(r'<script[^>]*application/ld\+json[^>]*>([\s\S]*?)</script>', re.I)
# Comprobado el 2026-11-06: responden 403 a peticiones automáticas. No se consultan.
BLOCKED_DOMAINS = {
    'idealo.es', 'pccomponentes.com', 'elcorteingles.es', 'mediamarkt.es', 'fnac.es', 'decathlon.es',
    'zalando.es', 'worten.es', 'carrefour.es', 'sephora.es', 'lego.com', 'amazon.es',
}

_robots_cache = {}
_last_request_at = [0.0]


class FetchError(Exception):
    pass


def today_iso():
    return dt.date.today().isoformat()


def new_id():
    return ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(12))


def base_domain(url):
    host = urllib.parse.urlparse(url).hostname or ''
    parts = host.lower().split('.')
    return '.'.join(parts[-2:]) if len(parts) >= 2 else host


def robots_allows(url):
    parsed = urllib.parse.urlparse(url)
    root = parsed.scheme + '://' + parsed.netloc
    if root not in _robots_cache:
        parser = urllib.robotparser.RobotFileParser()
        try:
            raw = fetch_bytes(root + '/robots.txt', check_robots=False).decode('utf-8', 'ignore')
            parser.parse(raw.splitlines())
        except FetchError:
            parser.parse([])
        _robots_cache[root] = parser
    return _robots_cache[root].can_fetch(USER_AGENT, url)


def fetch_bytes(url, check_robots=True):
    if check_robots and not robots_allows(url):
        raise FetchError('robots.txt no lo permite')
    wait = REQUEST_PAUSE_SECONDS - (time.time() - _last_request_at[0])
    if wait > 0:
        time.sleep(wait)
    request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT, 'Accept-Language': 'es-ES,es;q=0.9'})
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        raise FetchError('HTTP ' + str(error.code))
    except (urllib.error.URLError, TimeoutError) as error:
        raise FetchError(str(error))
    finally:
        _last_request_at[0] = time.time()


def find_products(page_html):
    products = []
    for block in LD_RE.findall(page_html):
        try:
            data = json.loads(block)
        except ValueError:
            continue
        stack = data if isinstance(data, list) else [data]
        while stack:
            node = stack.pop()
            if isinstance(node, dict):
                kind = node.get('@type')
                if kind == 'Product' or (isinstance(kind, list) and 'Product' in kind):
                    products.append(node)
                stack.extend(v for v in node.values() if isinstance(v, (dict, list)))
            elif isinstance(node, list):
                stack.extend(node)
    return products


def to_price(value):
    try:
        price = round(float(str(value).replace(',', '.')), 2)
    except (TypeError, ValueError):
        return None
    return price if price > 0 else None


def first_image(product):
    image = product.get('image')
    if isinstance(image, list):
        image = image[0] if image else None
    if isinstance(image, dict):
        image = image.get('url')
    return image if isinstance(image, str) and image.startswith('https://') else None


def read_klarna(url):
    """Devuelve (precios por tienda, imagen) de una ficha de Klarna."""
    page = fetch_bytes(url).decode('utf-8', 'ignore')
    products = find_products(page)
    if not products:
        raise FetchError('la ficha no tiene datos de producto')
    product = products[0]
    offers = product.get('offers') or {}
    listed = offers.get('offers') if isinstance(offers, dict) else offers
    by_shop = {}
    for offer in listed or []:
        if not isinstance(offer, dict) or offer.get('priceCurrency', 'EUR') != 'EUR':
            continue
        if 'OutOfStock' in str(offer.get('availability', '')):
            continue
        seller = offer.get('seller') or {}
        shop = (seller.get('name') if isinstance(seller, dict) else str(seller)) or ''
        price = to_price(offer.get('price'))
        if shop and price is not None:
            key = shop.strip().lower()
            if key not in by_shop or price < by_shop[key][1]:
                by_shop[key] = (shop.strip()[:60], price)
    return list(by_shop.values()), first_image(product)


def read_shop_page(url):
    """Devuelve (precio, imagen) de la ficha de una tienda con JSON-LD."""
    page = fetch_bytes(url).decode('utf-8', 'ignore')
    for product in find_products(page):
        offers = product.get('offers')
        candidates = offers if isinstance(offers, list) else [offers]
        prices = []
        for offer in candidates:
            if isinstance(offer, dict):
                prices.append(to_price(offer.get('price') or offer.get('lowPrice')))
        prices = [p for p in prices if p is not None]
        if prices:
            return min(prices), first_image(product) or og_image(page)
    raise FetchError('no se encontró el precio en la ficha')


def og_image(page_html):
    match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', page_html, re.I)
    url = html_lib.unescape(match.group(1)) if match else None
    return url if url and url.startswith('https://') else None


def image_to_jpeg(url):
    from PIL import Image
    raw = fetch_bytes(url)
    with Image.open(io.BytesIO(raw)) as img:
        img = img.convert('RGBA')
        scale = min(1.0, IMAGE_MAX_SIDE / max(img.size))
        size = (max(1, round(img.size[0] * scale)), max(1, round(img.size[1] * scale)))
        img = img.resize(size, Image.LANCZOS)
        canvas = Image.new('RGB', size, (255, 255, 255))
        canvas.paste(img, mask=img.split()[3])
        out = io.BytesIO()
        canvas.save(out, 'JPEG', quality=IMAGE_QUALITY, optimize=True)
    return out.getvalue()


def save_photo(data_dir, item_id, jpeg_bytes):
    """Guarda la foto en fotos/ y devuelve la ruta relativa que va en el campo image."""
    safe_id = re.sub(r'[^A-Za-z0-9_-]', '', str(item_id))[:40] or new_id()
    name = safe_id + '-' + new_id()[:6] + '.jpg'
    os.makedirs(os.path.join(data_dir, PHOTO_DIR), exist_ok=True)
    with open(os.path.join(data_dir, PHOTO_DIR, name), 'wb') as handle:
        handle.write(jpeg_bytes)
    return PHOTO_DIR + '/' + name


def clean_history(history):
    """Quita las entradas sin fecha válida o sin precio: no sirven para el historial."""
    if not isinstance(history, list):
        return []
    return [h for h in history if isinstance(h, dict) and isinstance(h.get('date'), str)
            and DATE_RE.match(h['date']) and isinstance(h.get('price'), (int, float))]


def apply_price(offer, price, today):
    """Aplica la regla de la app: primera entrada siempre, después solo cuando cambia."""
    changed = offer.get('price') != price
    history = clean_history(offer.get('history'))
    if price is not None:
        last = history[-1] if history else None
        if not history or (last and last.get('price') != price):
            history = (history + [{'date': today, 'price': price}])[-HISTORY_LIMIT:]
    offer['history'] = history
    offer['price'] = price
    offer['checked_at'] = today
    return changed


def klarna_link_of(item):
    if isinstance(item.get('klarna_url'), str) and KLARNA_PRODUCT_RE.match(item['klarna_url']):
        return item['klarna_url']
    for offer in item.get('offers') or []:
        url = (offer.get('url') or '').split('?')[0]
        if KLARNA_PRODUCT_RE.match(url):
            return url
    return None


def update_item(item, today, report, data_dir):
    name = item.get('name') or item.get('id')
    entry = {'regalo': name, 'cambios': [], 'errores': []}
    image_url = None
    klarna_url = klarna_link_of(item)
    offers = item.setdefault('offers', [])

    if klarna_url:
        item['klarna_url'] = klarna_url
        # El enlace a Klarna que puso la persona se convierte en las tiendas de esa ficha.
        offers[:] = [o for o in offers if (o.get('url') or '').split('?')[0] != klarna_url or o.get('source') == 'klarna']
        try:
            shops, image_url = read_klarna(klarna_url)
            seen = set()
            for shop, price in shops:
                key = shop.lower()
                seen.add(key)
                offer = next((o for o in offers if (o.get('shop') or '').strip().lower() == key
                              and (o.get('source') == 'klarna' or not o.get('url'))), None)
                if offer is None:
                    offer = {'id': new_id(), 'shop': shop, 'url': klarna_url, 'price': None, 'checked_at': None, 'history': [], 'source': 'klarna'}
                    offers.append(offer)
                    entry['cambios'].append('nueva tienda ' + shop + ': ' + str(price))
                elif offer.get('price') != price:
                    entry['cambios'].append(shop + ': ' + str(offer.get('price')) + ' -> ' + str(price))
                if not offer.get('url'):
                    offer['url'] = klarna_url
                    offer['source'] = 'klarna'
                apply_price(offer, price, today)
            for offer in offers:
                if offer.get('source') == 'klarna' and (offer.get('shop') or '').strip().lower() not in seen:
                    if offer.get('price') is not None:
                        entry['cambios'].append(offer.get('shop', '') + ': ya no aparece en Klarna')
                    apply_price(offer, None, today)
        except FetchError as error:
            entry['errores'].append('Klarna: ' + str(error))

    for offer in offers:
        url = offer.get('url') or ''
        if offer.get('source') == 'klarna' or not url.startswith('https://') or KLARNA_PRODUCT_RE.match(url.split('?')[0]):
            continue
        if base_domain(url) in BLOCKED_DOMAINS:
            continue
        try:
            price, shop_image = read_shop_page(url)
            if offer.get('price') != price:
                entry['cambios'].append((offer.get('shop') or base_domain(url)) + ': ' + str(offer.get('price')) + ' -> ' + str(price))
            apply_price(offer, price, today)
            image_url = image_url or shop_image
        except FetchError as error:
            entry['errores'].append((offer.get('shop') or base_domain(url)) + ': ' + str(error))

    if not item.get('image') and image_url:
        try:
            item['image'] = save_photo(data_dir, item.get('id'), image_to_jpeg(image_url))
            entry['cambios'].append('foto añadida')
        except Exception as error:  # una foto que falla no debe parar la actualización
            entry['errores'].append('foto: ' + str(error))

    if entry['cambios']:
        item['updated_at'] = today
    if entry['cambios'] or entry['errores']:
        report.append(entry)


def list_files(data_dir):
    folder = os.path.join(data_dir, LIST_DIR)
    if not os.path.isdir(folder):
        raise SystemExit('No encuentro la carpeta ' + folder)
    return sorted(os.path.join(folder, name) for name in os.listdir(folder) if name.endswith('.json'))


def write_json(path, data):
    # Mismo formato que guarda la página: sangría de 2 espacios y salto de línea final.
    text = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    with open(path, 'w', encoding='utf-8') as handle:
        handle.write(text)


def update_list(path, today, data_dir):
    with open(path, encoding='utf-8') as handle:
        data = json.load(handle)
    before = json.dumps(data, sort_keys=True)
    report = []
    for item in data.get('items', []):
        if not isinstance(item, dict) or item.get('done_at'):
            continue
        update_item(item, today, report, data_dir)
    # La fecha de comprobación cambia aunque el precio no cambie: también se guarda.
    if json.dumps(data, sort_keys=True) != before:
        data['version'] = DATA_VERSION
        write_json(path, data)
    return report


def main():
    parser = argparse.ArgumentParser(description='Actualiza precios y fotos de las listas de regalos.')
    parser.add_argument('datos', help='carpeta del repositorio de datos (contiene listas/ y fotos/)')
    parser.add_argument('--informe', help='archivo donde guardar el informe en JSON')
    parser.add_argument('--hoy', default=today_iso(), help='fecha de hoy (AAAA-MM-DD), para pruebas')
    args = parser.parse_args()
    full_report = {}
    for path in list_files(args.datos):
        full_report[os.path.basename(path)] = update_list(path, args.hoy, args.datos)
    text = json.dumps(full_report, ensure_ascii=False, indent=1)
    if args.informe:
        with open(args.informe, 'w', encoding='utf-8') as handle:
            handle.write(text + '\n')
    print(text)


if __name__ == '__main__':
    main()
