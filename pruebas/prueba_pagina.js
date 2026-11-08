// Prueba de la página con una API de GitHub simulada. No usa la red.
// Uso: node pruebas/prueba_pagina.js
const { chromium, devices } = require('playwright');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

const DOCS = path.join(__dirname, '..', 'docs');
const OWNER = 'usuaria';
const REPO = 'datos';
const GOOD_TOKEN = 'tok_bueno';
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==', 'base64');

function today_iso() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function days_before(n) {
  const d = new Date(Date.now() - n * 86400000);
  const pad = x => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function fixture_list() {
  return {
    version: 2,
    owner_name: 'Prueba',
    items: [
      { id: 'a1', created_at: days_before(20), name: 'Auriculares', priority: 'alta', category: 'tecnologia', target_price: null, notes: '', image: 'fotos/a1.jpg',
        offers: [{ id: 'o1', shop: 'Tienda A', url: 'https://tienda.example/a', price: 80, checked_at: days_before(1),
          history: [{ date: days_before(10), price: 100 }, { date: days_before(1), price: 80 }] }] },
      { id: 'a2', created_at: days_before(5), name: 'Libro', priority: 'media', category: 'ocio', target_price: null, notes: '', image: '',
        offers: [{ id: 'o2', shop: 'Tienda B', url: '', price: 20, checked_at: days_before(2), history: [{ date: days_before(2), price: 20 }] }] },
      { id: 'a3', created_at: days_before(3), name: 'Taza', priority: 'baja', target_price: 10, notes: '', image: '',
        offers: [{ id: 'o3', shop: 'Tienda C', url: '', price: 9.5, checked_at: days_before(2), history: [{ date: days_before(2), price: 9.5 }] }] }
    ]
  };
}

// ---------- repositorio simulado ----------

class FakeRepo {
  constructor() {
    this.files = new Map();
    this.log = [];
  }
  put(file_path, buffer) {
    const sha = crypto.createHash('sha1').update(buffer).digest('hex');
    this.files.set(file_path, { buffer: buffer, sha: sha });
    return sha;
  }
  put_json(file_path, data) { return this.put(file_path, Buffer.from(JSON.stringify(data, null, 2) + '\n')); }
  json(file_path) { return JSON.parse(this.files.get(file_path).buffer.toString('utf8')); }
}

function reply(route, status, body, headers) {
  return route.fulfill({
    status: status,
    headers: Object.assign({ 'access-control-allow-origin': '*', 'content-type': 'application/json' }, headers || {}),
    body: typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)
  });
}

async function serve_api(route, repo) {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method();
  if (method === 'OPTIONS') return reply(route, 204, '', { 'access-control-allow-headers': 'Authorization, Content-Type', 'access-control-allow-methods': 'GET, PUT, DELETE' });
  const auth = request.headers()['authorization'] || '';
  if (auth !== 'Bearer ' + GOOD_TOKEN) return reply(route, 401, { message: 'Bad credentials' });
  const base = '/repos/' + OWNER + '/' + REPO;
  if (url.pathname === base && method === 'GET') return reply(route, 200, { full_name: OWNER + '/' + REPO, default_branch: 'main' });
  if (!url.pathname.startsWith(base + '/contents/')) return reply(route, 404, { message: 'Not Found' });
  const file_path = decodeURIComponent(url.pathname.slice((base + '/contents/').length));
  repo.log.push(method + ' ' + file_path);
  if (method === 'GET') {
    const children = Array.from(repo.files.keys()).filter(p => p.startsWith(file_path + '/'));
    if (!repo.files.has(file_path) && children.length) {
      return reply(route, 200, children.map(p => ({ type: 'file', name: path.basename(p), path: p })));
    }
    const file = repo.files.get(file_path);
    if (!file) return reply(route, 404, { message: 'Not Found' });
    if ((request.headers()['accept'] || '').includes('raw')) return reply(route, 200, file.buffer, { 'content-type': 'application/octet-stream' });
    return reply(route, 200, { type: 'file', path: file_path, sha: file.sha, encoding: 'base64', content: file.buffer.toString('base64') });
  }
  const body = JSON.parse(request.postData() || '{}');
  const current = repo.files.get(file_path);
  if (method === 'PUT') {
    if (current && body.sha !== current.sha) return reply(route, 409, { message: 'is at ' + current.sha + ' but expected ' + body.sha });
    if (!current && body.sha) return reply(route, 409, { message: 'sha does not match' });
    const sha = repo.put(file_path, Buffer.from(body.content, 'base64'));
    return reply(route, current ? 200 : 201, { content: { path: file_path, sha: sha } });
  }
  if (method === 'DELETE') {
    if (!current || body.sha !== current.sha) return reply(route, 409, { message: 'sha does not match' });
    repo.files.delete(file_path);
    return reply(route, 200, { content: null });
  }
  return reply(route, 405, { message: 'no' });
}

// ---------- servidor de la página ----------

const server = http.createServer((req, res) => {
  const name = new URL(req.url, 'http://x').pathname.replace(/^\/+/, '') || 'index.html';
  const file = path.join(DOCS, name);
  if (!file.startsWith(DOCS) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

const results = [];
function check(name, ok, detail) { results.push({ name: name, ok: !!ok, detail: detail === undefined ? '' : String(detail) }); }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  const repo = new FakeRepo();
  repo.put_json('listas/prueba.json', fixture_list());
  repo.put_json('listas/otra.json', { version: 2, owner_name: 'Otra', items: [] });
  repo.put('fotos/a1.jpg', TINY_JPEG);

  const ctx = await browser.newContext({ ...devices['iPhone 15'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  // Los avisos «Failed to load resource» son las respuestas 401 y 409 que la prueba provoca a propósito.
  page.on('console', m => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await ctx.route('https://api.github.com/**', route => serve_api(route, repo));

  // 1. Pantalla de conexión
  await page.goto(base + '/index.html?lista=prueba');
  await page.waitForSelector('#setup_form');
  check('conexión: se pide repositorio y token', await page.$('#f_repo') && await page.$('#f_token'));
  await page.fill('#f_repo', OWNER + '/' + REPO);
  await page.fill('#f_token', 'tok_malo');
  await page.click('#setup_btn');
  await page.waitForSelector('#setup_error:not([hidden])');
  check('conexión: token malo da error', /no acepta el token/.test(await page.textContent('#setup_error')));
  await page.fill('#f_token', GOOD_TOKEN);
  await page.click('#setup_btn');
  await page.waitForSelector('.row');

  // 2. Lista cargada
  const info = await page.evaluate(() => ({
    title: document.title,
    rows: document.querySelectorAll('.row').length,
    deal_rows: Array.from(document.querySelectorAll('.row.is-deal')).map(r => r.dataset.open),
    summary: document.getElementById('summary').textContent,
    lists: Array.from(document.querySelectorAll('#list_select option')).map(o => o.value)
  }));
  check('lista: título', info.title === 'Lista de regalos de Prueba', info.title);
  check('lista: 3 filas', info.rows === 3, info.rows);
  check('ofertas: bajada y precio objetivo destacados', info.deal_rows.sort().join(',') === 'a1,a3', info.deal_rows.join(','));
  check('ofertas: resumen', /2 en oferta/.test(info.summary), info.summary);
  check('lista: selector de listas', info.lists.join(',') === 'otra,prueba,__nueva', info.lists.join(','));
  await page.waitForFunction(() => { const img = document.querySelector('[data-open="a1"] img'); return img && img.src.startsWith('blob:') && img.complete; });
  check('foto: se carga desde el repositorio privado', true);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lista_regalos_conexion')));
  check('conexión: guardada en el navegador', stored && stored.token === GOOD_TOKEN && stored.repo === REPO);

  // 3. Añadir un regalo con foto
  if (process.env.CAPTURA) await page.screenshot({ path: process.env.CAPTURA });
  await page.click('.fab');
  await page.fill('#f_link', 'https://www.ikea.com/es/es/p/lampara-de-mesa-blanca-12345/');
  await page.click('#link_form [type="submit"]');
  await page.waitForSelector('#item_form');
  const suggested = await page.inputValue('#f_name');
  check('añadir: nombre sugerido por el enlace', /lampara de mesa blanca/i.test(suggested), suggested);
  await page.setInputFiles('#f_photo', { name: 'foto.png', mimeType: 'image/png', buffer: fs.readFileSync(path.join(__dirname, 'foto_prueba.png')) });
  await page.waitForSelector('#photo_box img');
  await page.click('#submit_btn');
  await page.waitForSelector('#sheet_title.sheet-title');
  const added = repo.json('listas/prueba.json').items.find(it => /lampara/i.test(it.name));
  check('añadir: regalo guardado en el JSON', !!added);
  check('añadir: foto subida como archivo', added && /^fotos\/[a-z0-9]+-[a-z0-9]+\.jpg$/.test(added.image) && repo.files.has(added.image), added && added.image);
  check('añadir: el JSON no lleva la foto incrustada', !/data:image/.test(repo.files.get('listas/prueba.json').buffer.toString()));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.getElementById('sheet').open);

  // 4. Conflicto: la actualización diaria guarda mientras la página está abierta
  const server_side = repo.json('listas/prueba.json');
  server_side.items.find(it => it.id === 'a2').offers[0].price = 15;
  repo.put_json('listas/prueba.json', server_side);
  await page.click('[data-open="a2"]');
  await page.waitForSelector('[data-action="toggle_done"]');
  await page.click('[data-action="toggle_done"]');
  await page.waitForSelector('.tag.is-done');
  const merged = repo.json('listas/prueba.json').items.find(it => it.id === 'a2');
  check('conflicto: se conserva el precio de la actualización', merged.offers[0].price === 15, merged.offers[0].price);
  check('conflicto: se guarda el cambio de la página', merged.done_at === today_iso(), merged.done_at);
  await page.keyboard.press('Escape');

  // 5. Borrar un regalo borra su foto
  const photo_of_added = added && added.image;
  await page.click('[data-open="' + added.id + '"]');
  await page.waitForSelector('[data-action="ask_delete"]');
  await page.click('[data-action="ask_delete"]');
  await page.click('[data-action="confirm_delete"]');
  await page.waitForFunction(() => !document.getElementById('sheet').open);
  await page.waitForTimeout(300);
  check('borrar: regalo quitado', !repo.json('listas/prueba.json').items.some(it => it.id === added.id));
  check('borrar: foto quitada', !repo.files.has(photo_of_added), photo_of_added);

  // 6. Cambiar de lista
  await page.selectOption('#list_select', 'otra');
  await page.waitForFunction(() => document.title === 'Lista de regalos de Otra');
  check('listas: cambio a otra lista', new URL(page.url()).searchParams.get('lista') === 'otra', page.url());

  // 7. Nueva lista
  await page.selectOption('#list_select', '__nueva');
  await page.waitForSelector('#new_list_form');
  await page.fill('#f_owner', 'María José');
  await page.click('#new_list_btn');
  await page.waitForFunction(() => document.title === 'Lista de regalos de María José');
  check('listas: nueva lista creada', repo.files.has('listas/maria_jose.json'));

  // 8. Olvidar el token
  await page.click('[data-action="disconnect"]');
  await page.waitForSelector('#setup_form');
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('lista_regalos_conexion')));
  check('desconectar: el token se borra', after && after.token === '' && after.repo === REPO, JSON.stringify(after));
  check('desconectar: se recuerda el repositorio', (await page.inputValue('#f_repo')) === OWNER + '/' + REPO);

  check('sin errores en la página', errors.length === 0, errors.join(' | '));
  await browser.close();
  server.close();
  for (const r of results) console.log((r.ok ? 'OK    ' : 'FALLO ') + r.name + (r.ok || !r.detail ? '' : '  -> ' + r.detail));
  const bad = results.filter(r => !r.ok).length;
  console.log('\n' + (results.length - bad) + '/' + results.length + ' bien');
  process.exit(bad ? 1 : 0);
})().catch(error => { console.error(error); process.exit(1); });
