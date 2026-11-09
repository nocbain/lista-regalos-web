"""Comprueba qué enlaces de tienda puede leer el script de precios desde donde se ejecuta.

Para cada enlace muestra: si robots.txt lo permite, el código HTTP, el tamaño de la
respuesta, el título de la página y, si es una ficha de producto, el precio que encuentra.
Respeta robots.txt y espera entre peticiones, igual que el script de precios.

Uso:
  python3 probar_enlaces.py URL [URL ...]
"""
import json
import re
import sys
import time
import urllib.error
import urllib.request

import actualizar_precios as ap


def probe(url):
    result = {'url': url, 'robots': None, 'http': None, 'caracteres': 0, 'titulo': '', 'producto': False, 'precio': None, 'foto': False}
    try:
        result['robots'] = ap.robots_allows(url)
    except Exception as error:  # robots.txt ilegible: se informa y se sigue
        result['robots'] = 'error: ' + str(error)
    if result['robots'] is False:
        return result
    wait = ap.REQUEST_PAUSE_SECONDS - (time.time() - ap._last_request_at[0])
    if wait > 0:
        time.sleep(wait)
    request = urllib.request.Request(url, headers={'User-Agent': ap.USER_AGENT, 'Accept-Language': 'es-ES,es;q=0.9'})
    try:
        with urllib.request.urlopen(request, timeout=ap.REQUEST_TIMEOUT_SECONDS) as response:
            result['http'] = response.status
            page = response.read().decode('utf-8', 'ignore')
    except urllib.error.HTTPError as error:
        result['http'] = error.code
        return result
    except Exception as error:
        result['http'] = 'error: ' + str(error)[:120]
        return result
    finally:
        ap._last_request_at[0] = time.time()
    result['caracteres'] = len(page)
    match = re.search(r'<title[^>]*>([\s\S]*?)</title>', page, re.I)
    result['titulo'] = re.sub(r'\s+', ' ', match.group(1)).strip()[:80] if match else ''
    products = ap.find_products(page)
    result['producto'] = bool(products)
    for product in products:
        offers = product.get('offers')
        candidates = offers if isinstance(offers, list) else [offers]
        prices = [ap.to_price(o.get('price') or o.get('lowPrice')) for o in candidates if isinstance(o, dict)]
        prices = [p for p in prices if p is not None]
        if prices:
            result['precio'] = min(prices)
            result['foto'] = bool(ap.first_image(product) or ap.og_image(page))
            break
    return result


def main():
    urls = [u for arg in sys.argv[1:] for u in arg.split() if u.startswith('https://')]
    if not urls:
        raise SystemExit('Pasa al menos un enlace https://')
    results = [probe(url) for url in urls]
    print(json.dumps(results, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
