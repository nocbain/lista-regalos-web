"""Pruebas sin red del script de precios. Uso: python3 -m unittest discover precios"""
import io
import json
import os
import tempfile
import unittest
from unittest import mock

import actualizar_precios as ap

KLARNA_URL = 'https://www.klarna.com/es/shopping/pl/cl1/123/Belleza/Serum/'
KLARNA_PAGE = ('<script type="application/ld+json">' + json.dumps({
    '@type': 'Product', 'name': 'Sérum', 'image': 'https://img.example/serum.png',
    'offers': {'@type': 'AggregateOffer', 'offers': [
        {'price': '19,99', 'priceCurrency': 'EUR', 'seller': {'name': 'Druni'}},
        {'price': '17.5', 'priceCurrency': 'EUR', 'seller': {'name': 'Primor'}},
        {'price': '16', 'priceCurrency': 'EUR', 'seller': {'name': 'Agotada'}, 'availability': 'https://schema.org/OutOfStock'},
        {'price': '18', 'priceCurrency': 'USD', 'seller': {'name': 'Fuera'}},
    ]}}) + '</script>')


def read_text(path):
    with open(path, encoding='utf-8') as handle:
        return handle.read()


def png_bytes():
    from PIL import Image
    out = io.BytesIO()
    Image.new('RGBA', (900, 600), (200, 30, 90, 255)).save(out, 'PNG')
    return out.getvalue()


class FakeWeb:
    def __init__(self, pages):
        self.pages = pages
        self.asked = []

    def __call__(self, url, check_robots=True):
        self.asked.append(url)
        if url not in self.pages:
            raise ap.FetchError('HTTP 404')
        return self.pages[url]


class ApplyPriceTest(unittest.TestCase):
    def test_first_price_and_changes(self):
        offer = {'price': None, 'history': []}
        ap.apply_price(offer, 10.0, '2026-11-01')
        ap.apply_price(offer, 10.0, '2026-11-02')
        ap.apply_price(offer, 8.0, '2026-11-03')
        self.assertEqual(offer['history'], [{'date': '2026-11-01', 'price': 10.0}, {'date': '2026-11-03', 'price': 8.0}])
        self.assertEqual(offer['checked_at'], '2026-11-03')

    def test_history_without_date_is_removed(self):
        offer = {'price': 39.99, 'history': [{'date': None, 'price': 39.99}]}
        ap.apply_price(offer, 39.99, '2026-11-08')
        self.assertEqual(offer['history'], [{'date': '2026-11-08', 'price': 39.99}])


class UpdateListTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.data_dir = self.tmp.name
        os.makedirs(os.path.join(self.data_dir, 'listas'))

    def tearDown(self):
        self.tmp.cleanup()

    def write_list(self, items):
        path = os.path.join(self.data_dir, 'listas', 'prueba.json')
        with open(path, 'w', encoding='utf-8') as handle:
            json.dump({'version': 2, 'owner_name': 'Prueba', 'items': items}, handle)
        return path

    def test_klarna_link_becomes_shops_and_photo_file(self):
        path = self.write_list([
            {'id': 'a1', 'name': 'Sérum', 'image': '', 'offers': [{'id': 'o1', 'shop': 'Klarna', 'url': KLARNA_URL + '?utm=x', 'price': None, 'history': []}]},
            {'id': 'a2', 'name': 'Hecho', 'done_at': '2026-11-01', 'offers': [{'id': 'o2', 'url': KLARNA_URL, 'price': 5.0, 'history': []}]},
        ])
        web = FakeWeb({KLARNA_URL: KLARNA_PAGE.encode(), 'https://img.example/serum.png': png_bytes()})
        with mock.patch.object(ap, 'fetch_bytes', web):
            report = ap.update_list(path, '2026-11-08', self.data_dir)
        data = json.loads(read_text(path))
        item = data['items'][0]
        shops = sorted((o['shop'], o['price']) for o in item['offers'])
        self.assertEqual(shops, [('Druni', 19.99), ('Primor', 17.5)])
        self.assertTrue(item['image'].startswith('fotos/a1-') and item['image'].endswith('.jpg'))
        self.assertTrue(os.path.isfile(os.path.join(self.data_dir, item['image'])))
        self.assertEqual(data['items'][1]['offers'][0]['price'], 5.0, 'un regalo conseguido no se toca')
        self.assertEqual(len(report), 1)
        self.assertIn('foto añadida', report[0]['cambios'])

    def test_blocked_shop_is_not_requested(self):
        path = self.write_list([{'id': 'b1', 'name': 'Libro', 'offers': [{'id': 'o1', 'shop': 'Amazon', 'url': 'https://www.amazon.es/dp/X', 'price': 10.0, 'history': []}]}])
        web = FakeWeb({})
        with mock.patch.object(ap, 'fetch_bytes', web):
            ap.update_list(path, '2026-11-08', self.data_dir)
        self.assertEqual(web.asked, [])

    def test_shop_with_json_ld_and_price_drop(self):
        url = 'https://www.ikea.com/es/es/p/lampara-1/'
        page = '<script type="application/ld+json">{"@type":"Product","offers":{"price":"14.99"}}</script>'
        path = self.write_list([{'id': 'c1', 'name': 'Lámpara', 'image': 'fotos/c1.jpg',
                                 'offers': [{'id': 'o1', 'shop': 'IKEA', 'url': url, 'price': 19.99, 'history': [{'date': '2026-11-01', 'price': 19.99}]}]}])
        with mock.patch.object(ap, 'fetch_bytes', FakeWeb({url: page.encode()})):
            report = ap.update_list(path, '2026-11-08', self.data_dir)
        offer = json.loads(read_text(path))['items'][0]['offers'][0]
        self.assertEqual(offer['price'], 14.99)
        self.assertEqual(offer['history'][-1], {'date': '2026-11-08', 'price': 14.99})
        self.assertEqual(report[0]['cambios'], ['IKEA: 19.99 -> 14.99'])

    def test_unchanged_list_is_not_rewritten(self):
        path = self.write_list([{'id': 'd1', 'name': 'Sin tienda', 'offers': []}])
        before = read_text(path)
        with mock.patch.object(ap, 'fetch_bytes', FakeWeb({})):
            ap.update_list(path, '2026-11-08', self.data_dir)
        self.assertEqual(read_text(path), before)


if __name__ == '__main__':
    unittest.main()
