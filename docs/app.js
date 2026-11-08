
(() => {
  'use strict';

  // ---------- constantes ----------

  const DATA_VERSION = 2;
  const IMAGE_MAX_SIDE = 480;
  const IMAGE_QUALITY = 0.82;
  const HISTORY_LIMIT = 60;
  const STORAGE_KEY = 'lista_regalos_vista';
  const CONNECTION_KEY = 'lista_regalos_conexion';
  const LAST_LIST_KEY = 'lista_regalos_ultima';
  const LIST_DIR = 'listas';
  const PHOTO_DIR = 'fotos';
  const PHOTO_PATH_RE = /^fotos\/[A-Za-z0-9_-]+\.(jpe?g|png|webp)$/;
  const DATA_URL_RE = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;
  const SLUG_RE = /^[a-z0-9_-]{1,60}$/;
  const REPO_RE = /^([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})$/;
  const PRIORITY_OPTIONS = [['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']];
  const PRIORITY_TITLES = { alta: 'Prioridad alta', media: 'Prioridad media', baja: 'Prioridad baja' };
  const PRIORITY_RANK = { alta: 0, media: 1, baja: 2 };
  const CATEGORY_OPTIONS = [
    ['belleza', 'Belleza'],
    ['moda', 'Moda'],
    ['tecnologia', 'Tecnología'],
    ['hogar', 'Hogar'],
    ['ocio', 'Ocio'],
    ['otros', 'Otros']
  ];
  const CATEGORY_NAMES = Object.fromEntries(CATEGORY_OPTIONS);
  const NO_CATEGORY = 'sin_categoria';
  const VIEW_OPTIONS = [['todos', 'Todos'], ['ofertas', 'Ofertas'], ['conseguidos', 'Conseguidos']];
  const SORT_OPTIONS = [
    ['prioridad', 'Prioridad'],
    ['precio_asc', 'Precio más bajo'],
    ['precio_desc', 'Precio más alto'],
    ['recientes', 'Recientes'],
    ['nombre', 'Nombre']
  ];
  const SHOP_NAMES = {
    'amazon.es': 'Amazon',
    'pccomponentes.com': 'PcComponentes',
    'elcorteingles.es': 'El Corte Inglés',
    'mediamarkt.es': 'MediaMarkt',
    'fnac.es': 'Fnac',
    'idealo.es': 'idealo',
    'carrefour.es': 'Carrefour',
    'decathlon.es': 'Decathlon',
    'zalando.es': 'Zalando',
    'ikea.com': 'IKEA',
    'leroymerlin.es': 'Leroy Merlin',
    'aliexpress.com': 'AliExpress',
    'ebay.es': 'eBay',
    'worten.es': 'Worten',
    'casadellibro.com': 'Casa del Libro',
    'game.es': 'GAME',
    'apple.com': 'Apple',
    'coolmod.com': 'Coolmod',
    'backmarket.es': 'Back Market',
    'sephora.es': 'Sephora',
    'druni.es': 'Druni',
    'primor.eu': 'Primor',
    'notino.es': 'Notino',
    'douglas.es': 'Douglas',
    'lush.com': 'LUSH',
    'victoriassecret.com': "Victoria's Secret",
    'charlottetilbury.com': 'Charlotte Tilbury',
    'yves-rocher.es': 'Yves Rocher',
    'lefties.com': 'Lefties',
    'zara.com': 'Zara',
    'mango.com': 'Mango',
    'parfois.com': 'Parfois',
    'puma.com': 'Puma',
    'footlocker.es': 'Foot Locker',
    'gap.es': 'GAP',
    'urbanoutfitters.com': 'Urban Outfitters',
    'dyson.es': 'Dyson',
    'miravia.es': 'Miravia',
    'lidl.es': 'Lidl'
  };
  const MONEY = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  const DATE_SHORT = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
  const DATE_LONG = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const COLLATOR = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
  // Punto medio para la vista y coma para VoiceOver, que así hace una pausa en vez de leer el símbolo.
  const SEPARATOR = '<span aria-hidden="true"> · </span><span class="sr-only">, </span>';
  const PAUSE = '<span class="sr-only">, </span>';
  const ICON_PATHS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    chevron_down: '<path d="m6 9 6 6 6-6"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    trash: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12"/><path d="M9 7V4h6v3"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    photo: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/>',
    gift: '<rect x="4" y="10" width="16" height="10" rx="1.5"/><path d="M3 7.5h18V10H3z"/><path d="M12 7.5V20"/><path d="M12 7.5c-1.5-3-5.5-3.5-5.5-1.3S10.5 7.5 12 7.5zM12 7.5c1.5-3 5.5-3.5 5.5-1.3S13.5 7.5 12 7.5z"/>',
    bow: '<path d="M12 9.5C9.5 5 4 5 4.5 9c.4 3 5 3 7.5.5z"/><path d="M12 9.5C14.5 5 20 5 19.5 9c-.4 3-5 3-7.5.5z"/><path d="m11 10.5-3 8.5M13 10.5l3 8.5"/>'
  };

  // ---------- estado ----------

  const app_el = document.getElementById('app');
  let state = normalize_state(null);
  const ui = {
    mode: 'edit', phase: 'loading', store: null, lists: [], slug: '', sha: null,
    view: 'todos', category: 'todas', sort: 'prioridad', query: '', saving: false
  };
  const sheet = { kind: null, item_id: null, draft: null, dirty: false, return_el: null, pending_leave: null, flash: '' };
  const photo_urls = new Map();
  const photo_loads = new Map();
  let sheet_el = null;
  let toast_el = null;
  let live_el = null;
  let toast_timer = null;
  let live_timer = null;
  let offer_seq = 0;

  document.documentElement.lang = 'es';
  restore_view_prefs();
  create_chrome();
  wire_events();
  boot();

  function normalize_state(raw) {
    const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    if (!Array.isArray(data.items)) data.items = [];
    data.items = data.items.filter(item => item && typeof item === 'object' && item.id);
    data.version = DATA_VERSION;
    return data;
  }

  // ---------- conexión con el repositorio de datos ----------

  function read_connection() {
    try {
      const saved = JSON.parse(localStorage.getItem(CONNECTION_KEY) || 'null');
      if (saved && typeof saved.token === 'string' && saved.token && REPO_RE.test(saved.owner + '/' + saved.repo)) return saved;
    } catch (err) { /* sin conexión guardada */ }
    return null;
  }

  function save_connection(connection) {
    try { localStorage.setItem(CONNECTION_KEY, JSON.stringify(connection)); } catch (err) { /* el navegador no guarda nada */ }
  }

  function forget_token() {
    const saved = read_connection();
    try {
      if (saved) localStorage.setItem(CONNECTION_KEY, JSON.stringify({ owner: saved.owner, repo: saved.repo, token: '' }));
      else localStorage.removeItem(CONNECTION_KEY);
    } catch (err) { /* nada que borrar */ }
  }

  function remembered_repo() {
    const param = new URLSearchParams(location.search).get('datos');
    if (param && REPO_RE.test(param)) return param;
    try {
      const saved = JSON.parse(localStorage.getItem(CONNECTION_KEY) || 'null');
      if (saved && saved.owner && saved.repo) return saved.owner + '/' + saved.repo;
    } catch (err) { /* sin datos */ }
    return '';
  }

  function list_path(slug) { return LIST_DIR + '/' + (slug || ui.slug) + '.json'; }

  function wanted_slug() {
    const param = new URLSearchParams(location.search).get('lista');
    if (param && SLUG_RE.test(param)) return param;
    try {
      const last = localStorage.getItem(LAST_LIST_KEY);
      if (last && SLUG_RE.test(last)) return last;
    } catch (err) { /* sin datos */ }
    return '';
  }

  function remember_slug(slug) {
    try { localStorage.setItem(LAST_LIST_KEY, slug); } catch (err) { /* opcional */ }
    try {
      const url = new URL(location.href);
      url.searchParams.set('lista', slug);
      history.replaceState(null, '', url.href);
    } catch (err) { /* opcional */ }
  }

  async function boot() {
    const connection = read_connection();
    if (!connection) {
      render_setup('');
      return;
    }
    ui.store = new window.GitHubStore(connection);
    await open_list(wanted_slug());
  }

  async function open_list(slug) {
    ui.phase = 'loading';
    render_status('Cargando la lista…', false);
    try {
      ui.lists = await ui.store.list_lists(LIST_DIR);
      if (!ui.lists.length) {
        ui.phase = 'no_lists';
        render_no_lists('');
        return;
      }
      const chosen = ui.lists.find(entry => entry.slug === slug) || ui.lists[0];
      const result = await ui.store.read_json(chosen.path);
      state = normalize_state(result.data);
      ui.sha = result.sha;
      ui.slug = chosen.slug;
      ui.phase = 'ready';
      remember_slug(chosen.slug);
      render_page();
    } catch (error) {
      handle_load_error(error);
    }
  }

  function handle_load_error(error) {
    const code = error && error.code;
    if (code === 'bad_token') {
      forget_token();
      render_setup('GitHub no acepta el token. Puede estar mal copiado o caducado. Pega un token nuevo.');
    } else if (code === 'not_found' || code === 'forbidden') {
      render_setup('No encuentro el repositorio de datos, o el token no tiene acceso a él. Comprueba el nombre y los permisos del token.');
    } else if (code === 'rate_limited') {
      render_status('GitHub ha limitado las peticiones. Espera un minuto y vuelve a intentarlo.', true);
    } else if (code === 'bad_json') {
      render_status('El archivo de la lista no tiene un formato válido. Revísalo en el repositorio de datos.', true);
    } else {
      render_status('No se pudo cargar la lista. Comprueba la conexión y vuelve a intentarlo.', true);
    }
  }

  function render_status(text, can_retry) {
    document.title = 'Lista de regalos';
    app_el.innerHTML = '<main class="page"><header class="top"><h1 class="title"><span class="name">Lista de regalos</span></h1></header>' +
      '<div class="empty" role="status">' + icon('gift') + '<p>' + escape_html(text) + '</p>' +
      (can_retry ? '<button type="button" class="btn primary" data-action="retry">Volver a intentarlo</button>' +
        '<button type="button" class="btn secondary" data-action="disconnect">Cambiar repositorio o token</button>' : '') +
      '</div></main>';
  }

  function render_setup(error_text) {
    ui.phase = 'setup';
    document.title = 'Conectar la lista de regalos';
    const repo = remembered_repo();
    app_el.innerHTML = '<main class="page"><header class="top"><h1 class="title"><span class="lead">' + icon('bow') + 'Lista de regalos</span> <span class="name">Conectar</span></h1>' +
      '<p class="summary">Los regalos están en un repositorio privado de GitHub. Para verlos y editarlos, escribe el nombre del repositorio y un token de acceso.</p></header>' +
      '<form class="setup" id="setup_form" novalidate>' +
      '<p class="form-error" id="setup_error" role="alert"' + (error_text ? '' : ' hidden') + '>' + escape_html(error_text) + '</p>' +
      '<div class="field"><label class="field-label" for="f_repo">Repositorio de datos</label>' +
      '<input class="input" id="f_repo" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="usuario/lista-regalos-datos" value="' + escape_html(repo) + '"></div>' +
      '<div class="field"><label class="field-label" for="f_token">Token de GitHub</label>' +
      '<input class="input" id="f_token" type="password" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-describedby="f_token_hint">' +
      '<p class="hint" id="f_token_hint">Crea un token de tipo «fine-grained» en GitHub (Settings → Developer settings → Personal access tokens). ' +
      'Dale acceso solo al repositorio de datos, con el permiso «Contents: Read and write». El token se guarda solo en este navegador.</p></div>' +
      '<button type="submit" class="btn primary block" id="setup_btn">Conectar</button></form></main>';
    const focus = app_el.querySelector(repo ? '#f_token' : '#f_repo');
    if (focus) focus.focus();
  }

  async function submit_setup() {
    const repo_raw = String(app_el.querySelector('#f_repo').value || '').trim().replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '');
    const token = String(app_el.querySelector('#f_token').value || '').trim();
    const error_el = app_el.querySelector('#setup_error');
    const show = text => { error_el.textContent = text; error_el.hidden = false; };
    const match = REPO_RE.exec(repo_raw);
    if (!match) return show('Escribe el repositorio así: usuario/nombre-del-repositorio.');
    if (!token) return show('Pega el token de GitHub.');
    const button = app_el.querySelector('#setup_btn');
    button.disabled = true;
    button.textContent = 'Conectando…';
    const store = new window.GitHubStore({ owner: match[1], repo: match[2], token: token });
    try {
      await store.check_repo();
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Conectar';
      if (error.code === 'bad_token') return show('GitHub no acepta el token. Comprueba que lo has copiado entero.');
      if (error.code === 'not_found' || error.code === 'forbidden') return show('No encuentro el repositorio, o el token no tiene acceso a él.');
      return show('No se pudo conectar con GitHub. Comprueba la conexión y vuelve a intentarlo.');
    }
    save_connection({ owner: match[1], repo: match[2], branch: store.branch, token: token });
    ui.store = store;
    await open_list(wanted_slug());
  }

  function slug_from_name(name) {
    return normalize_text(name).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  }

  function render_no_lists(error_text) {
    document.title = 'Lista de regalos';
    app_el.innerHTML = '<main class="page"><header class="top"><h1 class="title"><span class="name">Lista de regalos</span></h1>' +
      '<p class="summary">El repositorio de datos todavía no tiene listas. Crea la primera.</p></header>' +
      new_list_form_html(error_text) + '</main>';
    const input = app_el.querySelector('#f_owner');
    if (input) input.focus();
  }

  function new_list_form_html(error_text) {
    return '<form class="setup" id="new_list_form" novalidate>' +
      '<p class="form-error" id="new_list_error" role="alert"' + (error_text ? '' : ' hidden') + '>' + escape_html(error_text) + '</p>' +
      '<div class="field"><label class="field-label" for="f_owner">¿De quién es la lista?</label>' +
      '<input class="input" id="f_owner" type="text" maxlength="60" autocomplete="off" placeholder="Nombre"></div>' +
      '<button type="submit" class="btn primary block" id="new_list_btn">Crear lista</button></form>';
  }

  async function submit_new_list(root) {
    const owner = String(root.querySelector('#f_owner').value || '').trim();
    const error_el = root.querySelector('#new_list_error');
    const show = text => { error_el.textContent = text; error_el.hidden = false; };
    const slug = slug_from_name(owner);
    if (!owner || !slug) return show('Escribe un nombre.');
    if (ui.lists.some(entry => entry.slug === slug)) return show('Ya hay una lista con ese nombre.');
    const button = root.querySelector('#new_list_btn');
    button.disabled = true;
    button.textContent = 'Creando…';
    try {
      await ui.store.write_json(list_path(slug), { version: DATA_VERSION, owner_name: owner.slice(0, 60), items: [] }, null, 'Nueva lista: ' + owner);
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Crear lista';
      return show(error_message(error));
    }
    if (sheet_el.open) sheet_el.close();
    await open_list(slug);
  }

  function disconnect() {
    forget_token();
    ui.store = null;
    state = normalize_state(null);
    for (const url of photo_urls.values()) if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    photo_urls.clear();
    photo_loads.clear();
    if (sheet_el.open) sheet_el.close();
    render_setup('');
  }

  // ---------- fotos ----------

  function is_photo_path(value) { return typeof value === 'string' && PHOTO_PATH_RE.test(value); }

  function img_html(image, alt, extra) {
    const attrs = ' alt="' + escape_html(alt) + '"' + (extra || '');
    if (DATA_URL_RE.test(image)) return '<img src="' + image + '"' + attrs + '>';
    const ready = photo_urls.get(image);
    return '<img data-photo="' + escape_html(image) + '"' + (ready ? ' src="' + escape_html(ready) + '"' : '') + attrs + '>';
  }

  function load_photo(path) {
    if (photo_urls.has(path)) return Promise.resolve(photo_urls.get(path));
    if (!photo_loads.has(path)) {
      const job = ui.store.read_photo(path)
        .then(blob => {
          const url = URL.createObjectURL(blob);
          photo_urls.set(path, url);
          return url;
        })
        .catch(() => {
          photo_loads.delete(path);
          return '';
        });
      photo_loads.set(path, job);
    }
    return photo_loads.get(path);
  }

  function hydrate_photos(root) {
    if (!ui.store || !root) return;
    root.querySelectorAll('img[data-photo]:not([src])').forEach(img => {
      const path = img.dataset.photo;
      if (!is_photo_path(path)) return;
      load_photo(path).then(url => { if (url && img.isConnected) img.src = url; });
    });
  }

  function data_url_to_base64(data_url) { return data_url.slice(data_url.indexOf(',') + 1); }

  async function delete_photo_quietly(path, reason) {
    if (!is_photo_path(path) || !ui.store) return;
    try {
      await ui.store.delete_file(path, reason);
    } catch (error) { /* una foto que queda sin usar no rompe nada */ }
  }

  function find_item(id) { return state.items.find(it => it.id === id) || null; }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function new_id() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36); }

  function today_iso() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  function restore_view_prefs() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && VIEW_OPTIONS.some(([key]) => key === saved.view)) ui.view = saved.view;
      if (saved && typeof saved.category === 'string') ui.category = saved.category;
      if (saved && SORT_OPTIONS.some(([key]) => key === saved.sort)) ui.sort = saved.sort;
    } catch (err) { /* sin preferencias guardadas */ }
  }

  function save_view_prefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ view: ui.view, category: ui.category, sort: ui.sort }));
    } catch (err) { /* opcional */ }
  }

  // ---------- formato ----------

  function escape_html(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function icon(name, extra_class) {
    return '<svg class="icon' + (extra_class ? ' ' + extra_class : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICON_PATHS[name] + '</svg>';
  }

  function format_money(n) { return MONEY.format(n); }

  function format_input_number(n) { return typeof n === 'number' ? n.toFixed(2).replace('.', ',') : ''; }

  function parse_iso(iso) {
    if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const d = new Date(iso + 'T12:00:00');
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function days_ago(iso) {
    const then = parse_iso(iso);
    if (!then) return null;
    const now = parse_iso(today_iso());
    return Math.round((now - then) / 86400000);
  }

  function when_text(iso) {
    const days = days_ago(iso);
    if (days == null) return '';
    if (days <= 0) return 'hoy';
    if (days === 1) return 'ayer';
    const d = parse_iso(iso);
    return 'el ' + (days < 300 ? DATE_SHORT.format(d) : DATE_LONG.format(d));
  }

  function checked_text(iso) {
    const when = when_text(iso);
    return when ? 'comprobado ' + when : 'sin fecha de comprobación';
  }

  function short_date(iso) {
    const days = days_ago(iso);
    if (days == null) return '';
    if (days <= 0) return 'hoy';
    const d = parse_iso(iso);
    return days < 300 ? DATE_SHORT.format(d) : DATE_LONG.format(d);
  }

  function parse_price(raw) {
    if (raw == null) return null;
    let s = String(raw).replace(/[€\s ]/g, '').replace(/eur$/i, '');
    if (!s) return null;
    if (s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if ((s.match(/\./g) || []).length > 1) {
      s = s.replace(/\./g, '');
    } else if (/^\d{1,3}\.\d{3}$/.test(s)) {
      s = s.replace('.', '');
    }
    if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
    const n = Number(s);
    return Number.isFinite(n) ? round2(n) : NaN;
  }

  function safe_url(raw) {
    try {
      const u = new URL(String(raw || '').trim());
      return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : '';
    } catch (err) { return ''; }
  }

  function safe_image(value) {
    return typeof value === 'string' && (DATA_URL_RE.test(value) || is_photo_path(value)) ? value : '';
  }

  function shop_label(hostname) {
    const host = String(hostname || '').toLowerCase().replace(/^www\./, '');
    for (const [domain, label] of Object.entries(SHOP_NAMES)) {
      if (host === domain || host.endsWith('.' + domain)) return label;
    }
    return host;
  }

  function suggest_from_url(raw) {
    const href = safe_url(raw);
    if (!href) return null;
    const u = new URL(href);
    const shop = shop_label(u.hostname);
    const segments = u.pathname.split('/').filter(Boolean).reverse();
    let name = '';
    for (const seg of segments) {
      let s;
      try { s = decodeURIComponent(seg); } catch (err) { s = seg; }
      s = s.replace(/\.(html?|php|aspx?)$/i, '').replace(/^\d+[_-]+/, '').replace(/[_+-]+/g, ' ').replace(/\s+/g, ' ').trim();
      const words = s.split(' ').filter(w => w && !/^[a-z]?\d{5,}[a-z]?$/i.test(w));
      const letter_words = words.filter(w => /[a-záéíóúñü]{2,}/i.test(w));
      if (letter_words.length >= 2) { name = words.join(' '); break; }
    }
    if (name) name = name.charAt(0).toUpperCase() + name.slice(1);
    return { shop: shop, name: name.slice(0, 140) };
  }

  function normalize_text(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function list_title(data) {
    const owner = String(data.owner_name || '').trim();
    return owner ? 'Lista de regalos de ' + owner : 'Lista de regalos';
  }

  // ---------- cálculos ----------

  function item_priority(item) { return PRIORITY_TITLES[item.priority] ? item.priority : 'media'; }

  function item_category(item) { return CATEGORY_NAMES[item.category] ? item.category : NO_CATEGORY; }

  function clean_history(offer) {
    const list = Array.isArray(offer.history) ? offer.history : [];
    return list
      .filter(h => h && typeof h.price === 'number' && Number.isFinite(h.price) && parse_iso(h.date))
      .map((h, i) => ({ date: h.date, price: h.price, i: i }))
      .sort((a, b) => a.date.localeCompare(b.date) || a.i - b.i);
  }

  function offer_stats(offer) {
    const history = Array.isArray(offer.history) ? offer.history.filter(h => h && typeof h.price === 'number') : [];
    const price = typeof offer.price === 'number' ? offer.price : null;
    const prev = history.length >= 2 ? history[history.length - 2].price : null;
    const drop = (price != null && prev != null && price < prev)
      ? { prev: prev, amount: round2(prev - price), pct: Math.round((prev - price) / prev * 100) }
      : null;
    return { price: price, drop: drop };
  }

  function item_view(item) {
    const offers = (Array.isArray(item.offers) ? item.offers : []).map(offer => Object.assign({ offer: offer }, offer_stats(offer)));
    const priced = offers.filter(o => o.price != null).sort((a, b) => a.price - b.price);
    const best = priced[0] || null;
    const target = typeof item.target_price === 'number' ? item.target_price : null;
    const target_hit = !!(best && target != null && best.price <= target);
    const done = !!item.done_at;
    const on_deal = !done && !!(best && (best.drop || target_hit));
    return { offers: offers, priced: priced, best: best, target: target, target_hit: target_hit, done: done, on_deal: on_deal };
  }

  function all_entries() {
    return state.items.map((item, index) => ({ item: item, index: index, view: item_view(item) }));
  }

  function in_view(entry, view) {
    if (view === 'conseguidos') return entry.view.done;
    if (entry.view.done) return false;
    if (view === 'ofertas') return entry.view.on_deal;
    return true;
  }

  function search_text(entry) {
    if (entry.search == null) {
      const item = entry.item;
      const shops = entry.view.offers.map(o => o.offer.shop || '').join(' ');
      const cat = item_category(item);
      entry.search = normalize_text([item.name, item.notes, shops, cat === NO_CATEGORY ? '' : CATEGORY_NAMES[cat]].join(' '));
    }
    return entry.search;
  }

  function filter_entries(entries) {
    const q = normalize_text(ui.query.trim());
    const list = entries.filter(e =>
      in_view(e, ui.view) &&
      (ui.category === 'todas' || item_category(e.item) === ui.category) &&
      (!q || search_text(e).includes(q)));
    return sort_entries(list);
  }

  function sort_entries(list) {
    const by_name = (a, b) => COLLATOR.compare(String(a.item.name || ''), String(b.item.name || ''));
    const price_of = e => (e.view.best ? e.view.best.price : null);
    const copy = list.slice();
    if (ui.sort === 'precio_asc' || ui.sort === 'precio_desc') {
      const dir = ui.sort === 'precio_asc' ? 1 : -1;
      copy.sort((a, b) => {
        const pa = price_of(a);
        const pb = price_of(b);
        if (pa == null && pb == null) return by_name(a, b);
        if (pa == null) return 1;
        if (pb == null) return -1;
        return (pa - pb) * dir || by_name(a, b);
      });
    } else if (ui.sort === 'recientes') {
      copy.sort((a, b) => String(b.item.created_at || '').localeCompare(String(a.item.created_at || '')) || b.index - a.index);
    } else if (ui.sort === 'nombre') {
      copy.sort(by_name);
    } else {
      copy.sort((a, b) =>
        (PRIORITY_RANK[item_priority(a.item)] - PRIORITY_RANK[item_priority(b.item)]) ||
        (Number(b.view.on_deal) - Number(a.view.on_deal)) ||
        by_name(a, b));
    }
    return copy;
  }

  // ---------- página ----------

  function create_chrome() {
    sheet_el = document.createElement('dialog');
    sheet_el.className = 'sheet';
    sheet_el.id = 'sheet';
    sheet_el.setAttribute('aria-labelledby', 'sheet_title');
    document.body.appendChild(sheet_el);
    toast_el = document.createElement('div');
    toast_el.className = 'toast';
    toast_el.setAttribute('role', 'status');
    toast_el.hidden = true;
    document.body.appendChild(toast_el);
    live_el = document.createElement('p');
    live_el.className = 'sr-only';
    live_el.setAttribute('role', 'status');
    document.body.appendChild(live_el);
  }

  function render_page() {
    if (ui.phase !== 'ready') return;
    document.title = list_title(state);
    const entries = all_entries();
    const focus = capture_focus();
    const show_fab = ui.mode === 'edit' && entries.length > 0;
    const parts = ['<main class="page' + (show_fab ? ' has-fab' : '') + '">', header_html(entries)];
    // El botón flotante va justo después de la cabecera para que se alcance pronto con el teclado y con VoiceOver.
    if (show_fab) {
      parts.push('<button type="button" class="fab" data-action="add">' + icon('plus') + '<span>Añadir regalo</span></button>');
    }
    if (entries.length) {
      parts.push(toolbar_html(entries));
      parts.push('<div class="list-head"><p class="result-count" id="result_count"></p>' + sort_html() + '</div>');
      parts.push('<div id="list_region"></div>');
    } else {
      parts.push(empty_list_html());
    }
    parts.push('<p class="foot-note">Los precios se buscan una vez al día y pueden cambiar en cualquier momento. Comprueba el precio final en la tienda antes de comprar.</p>');
    parts.push('<p class="foot-note">Datos en ' + escape_html(ui.store.owner + '/' + ui.store.repo) + '. ' +
      '<button type="button" class="link-btn" data-action="disconnect">Olvidar el token en este navegador</button></p>');
    parts.push('</main>');
    app_el.innerHTML = parts.join('');
    if (entries.length) render_results(entries, false);
    hydrate_photos(app_el);
    restore_focus(focus);
  }

  function header_html(entries) {
    const owner = String(state.owner_name || '').trim();
    const title = owner
      ? '<h1 class="title"><span class="lead">' + icon('bow') + 'Lista de regalos de</span> <span class="name">' + escape_html(owner) + '</span></h1>'
      : '<h1 class="title"><span class="name">Lista de regalos</span></h1>';
    return '<header class="top">' + title + '<p class="summary" id="summary">' + summary_html(entries) + '</p>' + list_switch_html() + '</header>';
  }

  function list_label(slug) {
    const text = slug.replace(/_/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function list_switch_html() {
    let options = '';
    for (const entry of ui.lists) {
      options += '<option value="' + escape_html(entry.slug) + '"' + (entry.slug === ui.slug ? ' selected' : '') + '>' + escape_html(list_label(entry.slug)) + '</option>';
    }
    options += '<option value="__nueva">Nueva lista…</option>';
    return '<div class="sort list-switch"><label for="list_select">Lista</label><span class="select-wrap"><select id="list_select">' + options + '</select>' + icon('chevron_down') + '</span></div>';
  }

  function summary_html(entries) {
    if (!entries.length) return 'Todavía no hay regalos en la lista.';
    const active = entries.filter(e => !e.view.done);
    const n = active.length;
    const bits = ['<strong>' + n + '</strong> ' + (n === 1 ? 'regalo' : 'regalos')];
    const deals = active.filter(e => e.view.on_deal).length;
    if (deals) bits.push('<strong>' + deals + '</strong> en oferta');
    const priced = active.filter(e => e.view.best);
    if (priced.length) {
      const total = round2(priced.reduce((sum, e) => sum + e.view.best.price, 0));
      bits.push('total estimado <strong>' + format_money(total) + '</strong>' +
        (priced.length < n ? ' (' + priced.length + ' con precio)' : ''));
    }
    let latest = '';
    for (const e of active) {
      for (const o of e.view.offers) {
        if (parse_iso(o.offer.checked_at) && o.offer.checked_at > latest) latest = o.offer.checked_at;
      }
    }
    let html = bits.join(SEPARATOR);
    if (latest) html += '<br>Última comprobación de precios: ' + when_text(latest);
    return html;
  }

  function toolbar_html(entries) {
    const counts = { todos: 0, ofertas: 0, conseguidos: 0 };
    for (const e of entries) {
      if (e.view.done) counts.conseguidos += 1;
      else {
        counts.todos += 1;
        if (e.view.on_deal) counts.ofertas += 1;
      }
    }
    const views = VIEW_OPTIONS.filter(([key]) => key !== 'conseguidos' || counts.conseguidos > 0);
    if (!views.some(([key]) => key === ui.view)) ui.view = 'todos';
    let seg = '<fieldset><legend class="sr-only">Mostrar</legend><div class="segmented">';
    for (const [key, label] of views) {
      seg += '<input class="choice-input" type="radio" name="view" id="view_' + key + '" value="' + key + '"' + (ui.view === key ? ' checked' : '') + '>' +
        '<label for="view_' + key + '">' + label + ' <span class="count">' + counts[key] + '</span></label>';
    }
    seg += '</div></fieldset>';
    return '<div class="toolbar">' + search_html() + seg + '<div id="chips_slot">' + chips_html(entries) + '</div></div>';
  }

  function search_html() {
    return '<div class="search" role="search">' + icon('search') +
      '<label class="sr-only" for="search_input">Buscar en la lista</label>' +
      '<input id="search_input" type="search" placeholder="Buscar" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" value="' + escape_html(ui.query) + '">' +
      '</div>';
  }

  function chips_html(entries) {
    const scoped = entries.filter(e => in_view(e, ui.view));
    const counts = {};
    for (const e of scoped) {
      const cat = item_category(e.item);
      counts[cat] = (counts[cat] || 0) + 1;
    }
    const keys = CATEGORY_OPTIONS.map(([key]) => key).filter(key => counts[key]);
    if (counts[NO_CATEGORY] && keys.length) keys.push(NO_CATEGORY);
    if (keys.length < 2) {
      ui.category = 'todas';
      return '';
    }
    if (ui.category !== 'todas' && !keys.includes(ui.category)) ui.category = 'todas';
    const options = [['todas', 'Todas', scoped.length]].concat(keys.map(key => [key, key === NO_CATEGORY ? 'Sin categoría' : CATEGORY_NAMES[key], counts[key]]));
    let html = '<fieldset><legend class="sr-only">Categoría</legend><div class="chips">';
    for (const [key, label, count] of options) {
      html += '<input class="choice-input" type="radio" name="category" id="cat_' + key + '" value="' + key + '"' + (ui.category === key ? ' checked' : '') + '>' +
        '<label for="cat_' + key + '">' + escape_html(label) + ' <span class="count">' + count + '</span></label>';
    }
    return html + '</div></fieldset>';
  }

  function sort_html() {
    let options = '';
    for (const [value, label] of SORT_OPTIONS) {
      options += '<option value="' + value + '"' + (ui.sort === value ? ' selected' : '') + '>' + label + '</option>';
    }
    return '<div class="sort"><label for="sort_select">Ordenar por</label><span class="select-wrap"><select id="sort_select">' + options + '</select>' + icon('chevron_down') + '</span></div>';
  }

  function render_results(entries, announce) {
    const region = document.getElementById('list_region');
    if (!region) return;
    const visible = filter_entries(entries || all_entries());
    const count_text = visible.length === 1 ? '1 regalo' : visible.length + ' regalos';
    const count_el = document.getElementById('result_count');
    if (count_el) count_el.textContent = count_text;
    region.innerHTML = visible.length ? list_html(visible) : no_results_html();
    hydrate_photos(region);
    if (announce) announce_live(visible.length ? 'Se muestran ' + count_text : 'No hay regalos con estos filtros');
  }

  function list_html(visible) {
    const grouped = ui.sort === 'prioridad' && ui.view !== 'conseguidos';
    if (!grouped) {
      const heading = ui.view === 'conseguidos' ? 'Conseguidos' : 'Regalos';
      return '<section class="section" aria-labelledby="sec_all"><h2 class="sr-only" id="sec_all">' + heading + '</h2>' +
        '<ul class="group" role="list">' + visible.map(e => row_html(e, true)).join('') + '</ul></section>';
    }
    let html = '';
    for (const [key] of PRIORITY_OPTIONS) {
      const rows = visible.filter(e => item_priority(e.item) === key);
      if (!rows.length) continue;
      html += '<section class="section" aria-labelledby="sec_' + key + '">' +
        '<h2 class="section-title" id="sec_' + key + '">' + PRIORITY_TITLES[key] + ' <span class="count">' + rows.length + '</span></h2>' +
        '<ul class="group" role="list">' + rows.map(e => row_html(e, false)).join('') + '</ul></section>';
    }
    return html;
  }

  function row_html(entry, show_priority) {
    const item = entry.item;
    const view = entry.view;
    const name = escape_html(item.name || 'Sin nombre');
    const image = safe_image(item.image);
    const thumb = image
      ? '<span class="thumb">' + img_html(image, '', ' loading="lazy" decoding="async"') + '</span>'
      : '<span class="thumb empty">' + icon('gift') + '</span>';
    const meta = [];
    if (show_priority && !view.done) meta.push(PRIORITY_TITLES[item_priority(item)]);
    const cat = item_category(item);
    if (cat !== NO_CATEGORY) meta.push(CATEGORY_NAMES[cat]);
    const shop_source = view.best || view.offers[0];
    if (shop_source && shop_source.offer.shop) meta.push(escape_html(shop_source.offer.shop));
    let side = view.best
      ? '<span class="row-price">' + format_money(view.best.price) + '</span>'
      : '<span class="row-noprice">Sin precio</span>';
    if (view.done) {
      side += PAUSE + '<span class="badge done">' + icon('check') + 'Conseguido</span>';
    } else if (view.on_deal) {
      side += PAUSE + (view.best.drop && view.best.drop.pct >= 1
        ? '<span class="badge deal"><span aria-hidden="true">−' + view.best.drop.pct + ' %</span><span class="sr-only">Oferta, ha bajado un ' + view.best.drop.pct + ' %</span></span>'
        : '<span class="badge deal">Oferta</span>');
    }
    return '<li><button type="button" class="row' + (view.done ? ' is-done' : '') + (view.on_deal ? ' is-deal' : '') + '" data-open="' + escape_html(item.id) + '" aria-haspopup="dialog">' +
      thumb +
      '<span class="row-body"><span class="row-main"><span class="row-name">' + name + '</span>' + PAUSE +
      (meta.length ? '<span class="row-meta">' + meta.join(SEPARATOR) + '</span>' + PAUSE : '') + '</span>' +
      '<span class="row-side">' + side + '</span></span>' +
      icon('chevron', 'chev') + '</button></li>';
  }

  function no_results_html() {
    const only_deals = ui.view === 'ofertas' && !ui.query.trim() && ui.category === 'todas';
    if (only_deals) {
      return '<div class="empty">' + icon('gift') + '<h2>Ahora mismo no hay ofertas</h2>' +
        '<p>Un regalo aparece aquí cuando su precio baja o llega al precio objetivo.</p></div>';
    }
    return '<div class="empty">' + icon('search') + '<h2>No hay regalos con estos filtros</h2>' +
      '<p>Prueba con otra búsqueda o quita los filtros.</p>' +
      '<button type="button" class="btn secondary" data-action="clear_filters">Quitar filtros</button></div>';
  }

  function empty_list_html() {
    if (ui.mode === 'edit') {
      return '<div class="empty">' + icon('gift') + '<h2>Todavía no hay regalos</h2>' +
        '<p>Pulsa «Añadir regalo» y pega el enlace del producto. El nombre y la tienda se rellenan solos.</p>' +
        '<button type="button" class="btn primary" data-action="add">' + icon('plus') + 'Añadir regalo</button></div>';
    }
    return '<div class="empty">' + icon('gift') + '<h2>Todavía no hay regalos</h2><p>Cuando se añadan, aparecerán aquí.</p></div>';
  }

  function capture_focus() {
    const el = document.activeElement;
    if (!el || !el.id || !app_el.contains(el)) return null;
    let start = null;
    let end = null;
    try { start = el.selectionStart; end = el.selectionEnd; } catch (err) { /* sin selección */ }
    return { id: el.id, start: start, end: end };
  }

  function restore_focus(info) {
    if (!info) return;
    const el = document.getElementById(info.id);
    if (!el) return;
    el.focus({ preventScroll: true });
    try {
      if (info.start != null && typeof el.setSelectionRange === 'function') el.setSelectionRange(info.start, info.end);
    } catch (err) { /* sin selección */ }
  }

  function announce_live(text) {
    clearTimeout(live_timer);
    live_timer = setTimeout(() => { live_el.textContent = text; }, 450);
  }

  function show_toast(text) {
    if (sheet_el.open) {
      const scroller = sheet_el.querySelector('.sheet-scroll');
      if (scroller) {
        let el = scroller.querySelector('.sheet-flash');
        if (!el) {
          el = document.createElement('p');
          el.className = 'sheet-flash';
          el.setAttribute('role', 'status');
          scroller.prepend(el);
        }
        el.innerHTML = icon('check') + escape_html(text);
        return;
      }
    }
    toast_el.textContent = text;
    toast_el.hidden = false;
    clearTimeout(toast_timer);
    toast_timer = setTimeout(() => { toast_el.hidden = true; }, 4500);
  }

  // ---------- eventos de la página ----------

  function wire_events() {
    app_el.addEventListener('click', on_app_click);
    app_el.addEventListener('input', on_app_input);
    app_el.addEventListener('change', on_app_change);
    app_el.addEventListener('submit', on_app_submit);
    sheet_el.addEventListener('click', on_sheet_click);
    sheet_el.addEventListener('input', on_sheet_input);
    sheet_el.addEventListener('change', on_sheet_change);
    sheet_el.addEventListener('submit', on_sheet_submit);
    sheet_el.addEventListener('cancel', on_sheet_cancel);
    sheet_el.addEventListener('close', on_sheet_close);
    sheet_el.addEventListener('dragover', on_drag_over);
    sheet_el.addEventListener('drop', on_drop);
    document.addEventListener('paste', on_paste);
  }

  function on_app_click(event) {
    const opener = event.target.closest('[data-open]');
    if (opener) {
      open_detail(opener.dataset.open);
      return;
    }
    const action_el = event.target.closest('[data-action]');
    if (!action_el) return;
    const action = action_el.dataset.action;
    if (action === 'retry') boot();
    if (action === 'disconnect') disconnect();
    if (action === 'add') open_add();
    if (action === 'clear_filters') {
      ui.view = 'todos';
      ui.category = 'todas';
      ui.query = '';
      save_view_prefs();
      render_page();
      const search = document.getElementById('search_input');
      if (search) search.focus();
      announce_live('Filtros quitados');
    }
  }

  function on_app_input(event) {
    if (event.target.id !== 'search_input') return;
    ui.query = event.target.value;
    render_results(null, true);
  }

  function on_app_submit(event) {
    event.preventDefault();
    if (event.target.id === 'setup_form') submit_setup();
    else if (event.target.id === 'new_list_form') submit_new_list(app_el);
  }

  function open_new_list() {
    const html = form_head('Nueva lista') + '<div class="sheet-scroll">' + new_list_form_html('') + '</div>';
    open_sheet('new_list', null, html, '#f_owner');
  }

  function on_app_change(event) {
    const target = event.target;
    if (target.id === 'list_select') {
      if (target.value === '__nueva') {
        target.value = ui.slug;
        open_new_list();
      } else if (target.value !== ui.slug) {
        open_list(target.value);
      }
      return;
    }
    if (target.name === 'view') {
      ui.view = target.value;
      save_view_prefs();
      const entries = all_entries();
      const slot = document.getElementById('chips_slot');
      if (slot) slot.innerHTML = chips_html(entries);
      render_results(entries, true);
    } else if (target.name === 'category') {
      ui.category = target.value;
      save_view_prefs();
      render_results(null, true);
    } else if (target.id === 'sort_select') {
      ui.sort = target.value;
      save_view_prefs();
      render_results(null, true);
    }
  }

  // ---------- hoja inferior ----------

  function open_sheet(kind, item_id, html, focus_selector) {
    const was_open = sheet_el.open;
    sheet.kind = kind;
    sheet.item_id = item_id;
    sheet.dirty = false;
    sheet.pending_leave = null;
    sheet_el.innerHTML = html;
    if (!was_open) {
      sheet.return_el = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
      sheet_el.showModal();
      document.documentElement.classList.add('sheet-open');
    }
    const scroller = sheet_el.querySelector('.sheet-scroll');
    if (scroller) {
      scroller.scrollTop = 0;
      scroller.addEventListener('scroll', on_sheet_scroll, { passive: true });
    }
    hydrate_photos(sheet_el);
    const target = sheet_el.querySelector(focus_selector || '#sheet_title');
    if (target) target.focus();
  }

  function on_sheet_scroll(event) {
    const head = sheet_el.querySelector('.sheet-head');
    if (head) head.classList.toggle('scrolled', event.currentTarget.scrollTop > 4);
  }

  function on_sheet_close() {
    document.documentElement.classList.remove('sheet-open');
    const id = sheet.item_id;
    const return_el = sheet.return_el;
    sheet.kind = null;
    sheet.item_id = null;
    sheet.draft = null;
    sheet.dirty = false;
    sheet.return_el = null;
    sheet.pending_leave = null;
    sheet.flash = '';
    sheet_el.innerHTML = '';
    let target = return_el && document.contains(return_el) ? return_el : null;
    if (!target && id) {
      target = Array.from(app_el.querySelectorAll('[data-open]')).find(el => el.dataset.open === id) || null;
    }
    if (target) target.focus();
  }

  function on_sheet_cancel(event) {
    if (ui.saving) {
      event.preventDefault();
      return;
    }
    if (sheet.dirty) {
      event.preventDefault();
      show_discard('close');
    }
  }

  function sheet_head(kicker) {
    return '<div class="sheet-head"><span class="grabber" aria-hidden="true"></span>' +
      '<p class="sheet-kicker">' + escape_html(kicker) + '</p>' +
      '<button type="button" class="icon-btn" data-action="close_sheet" aria-label="Cerrar">' + icon('close') + '</button></div>';
  }

  function form_head(title) {
    return '<div class="sheet-head"><span class="grabber" aria-hidden="true"></span>' +
      '<h2 class="sheet-head-title" id="sheet_title" tabindex="-1">' + escape_html(title) + '</h2>' +
      '<button type="button" class="icon-btn" data-action="close_sheet" aria-label="Cerrar">' + icon('close') + '</button></div>';
  }

  function request_leave(after) {
    if (sheet.dirty && (sheet.kind === 'item' || sheet.kind === 'prices')) show_discard(after);
    else do_leave(after);
  }

  function do_leave(after) {
    if (after === 'detail' && sheet.item_id && find_item(sheet.item_id)) open_detail(sheet.item_id);
    else if (sheet_el.open) sheet_el.close();
  }

  function show_discard(after) {
    const foot = sheet_el.querySelector('#form_foot');
    if (!foot) {
      do_leave(after);
      return;
    }
    sheet.pending_leave = after;
    if (!foot.dataset.saved) foot.dataset.saved = foot.innerHTML;
    foot.innerHTML = '<div class="discard-bar" role="group" aria-labelledby="discard_text"><p id="discard_text">Tienes cambios sin guardar. ¿Los descartas?</p>' +
      '<div class="confirm-actions"><button type="button" class="btn secondary" data-action="keep_editing">Seguir editando</button>' +
      '<button type="button" class="btn danger" data-action="discard">Descartar</button></div></div>';
    foot.querySelector('[data-action="keep_editing"]').focus();
  }

  function hide_discard() {
    const foot = sheet_el.querySelector('#form_foot');
    if (!foot || !foot.dataset.saved) return;
    foot.innerHTML = foot.dataset.saved;
    delete foot.dataset.saved;
    sheet.pending_leave = null;
    const submit = foot.querySelector('[type="submit"]');
    if (submit) submit.focus();
  }

  function on_sheet_click(event) {
    if (event.target === sheet_el) {
      if (!ui.saving) request_leave('close');
      return;
    }
    const el = event.target.closest('[data-action]');
    if (!el || ui.saving) return;
    const action = el.dataset.action;
    if (action === 'close_sheet') request_leave('close');
    else if (action === 'edit') open_item_form(sheet.item_id, null);
    else if (action === 'prices') open_prices(sheet.item_id);
    else if (action === 'toggle_done') toggle_done(sheet.item_id, el);
    else if (action === 'ask_delete') show_delete_confirm();
    else if (action === 'cancel_delete') hide_delete_confirm();
    else if (action === 'confirm_delete') delete_item(sheet.item_id, el);
    else if (action === 'skip_link') open_item_form(null, blank_draft());
    else if (action === 'cancel_form') request_leave(sheet.item_id ? 'detail' : 'close');
    else if (action === 'add_offer') add_offer_card();
    else if (action === 'remove_offer') remove_offer_card(el);
    else if (action === 'remove_photo') remove_photo();
    else if (action === 'keep_editing') hide_discard();
    else if (action === 'discard') do_leave(sheet.pending_leave || 'close');
  }

  function on_sheet_input(event) {
    const target = event.target;
    if (sheet.kind === 'item' || sheet.kind === 'prices') sheet.dirty = true;
    if (target.getAttribute && target.getAttribute('aria-invalid') === 'true') target.removeAttribute('aria-invalid');
    if (target.classList && target.classList.contains('o-url')) suggest_into_card(target);
  }

  function on_sheet_change(event) {
    if (event.target && event.target.id === 'f_photo') {
      const file = event.target.files && event.target.files[0];
      if (file) set_photo_from_file(file);
      event.target.value = '';
    }
  }

  function on_sheet_submit(event) {
    event.preventDefault();
    if (ui.saving) return;
    const id = event.target.id;
    if (id === 'new_list_form') submit_new_list(sheet_el);
    else if (id === 'link_form') submit_link();
    else if (id === 'item_form') submit_item_form();
    else if (id === 'prices_form') submit_prices();
  }

  function on_drag_over(event) {
    const box = event.target.closest && event.target.closest('#photo_box');
    if (!box) return;
    event.preventDefault();
  }

  function on_drop(event) {
    const box = event.target.closest && event.target.closest('#photo_box');
    if (!box) return;
    event.preventDefault();
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) set_photo_from_file(file);
  }

  function on_paste(event) {
    if (!sheet_el.open || sheet.kind !== 'item') return;
    const items = event.clipboardData ? Array.from(event.clipboardData.items || []) : [];
    const image_item = items.find(it => it.kind === 'file' && /^image\//.test(it.type));
    if (!image_item) return;
    event.preventDefault();
    set_photo_from_file(image_item.getAsFile());
  }

  // ---------- ficha del regalo ----------

  function open_detail(id, flash_text) {
    const item = find_item(id);
    if (!item) {
      show_toast('Ese regalo ya no está en la lista.');
      return;
    }
    if (flash_text != null) sheet.flash = flash_text;
    open_sheet('detail', id, detail_html(item), '#sheet_title');
  }

  function detail_html(item) {
    const view = item_view(item);
    const owner = ui.mode === 'edit';
    const name = escape_html(item.name || 'Sin nombre');
    const image = safe_image(item.image);
    const prio = item_priority(item);
    const cat = item_category(item);
    let body = '';
    if (sheet.flash) body += '<p class="sheet-flash" role="status">' + icon('check') + escape_html(sheet.flash) + '</p>';
    if (image) body += '<figure class="hero">' + img_html(image, 'Foto de ' + (item.name || 'Sin nombre')) + '</figure>';
    body += '<h2 class="sheet-title" id="sheet_title" tabindex="-1">' + name + '</h2>';
    let tags = '';
    if (view.done) tags += '<li class="tag is-done">' + icon('check') + 'Conseguido</li>';
    tags += '<li class="tag' + (prio === 'alta' ? ' is-alta' : '') + '">' + PRIORITY_TITLES[prio] + '</li>';
    if (cat !== NO_CATEGORY) tags += '<li class="tag">' + CATEGORY_NAMES[cat] + '</li>';
    body += '<ul class="tags" role="list">' + tags + '</ul>';
    if (item.notes) body += '<p class="notes">' + escape_html(item.notes) + '</p>';
    body += price_tag_html(view, owner);
    body += shops_html(view);
    body += history_html(view);
    if (owner) body += target_html(view) + owner_actions_html(view);
    const foot = owner
      ? '<div class="sheet-foot"><button type="button" class="btn secondary" data-action="prices">Actualizar precios</button>' +
        '<button type="button" class="btn primary" data-action="edit">Editar</button></div>'
      : '';
    return sheet_head(cat !== NO_CATEGORY ? CATEGORY_NAMES[cat] : 'Regalo') + '<div class="sheet-scroll">' + body + '</div>' + foot;
  }

  function price_tag_html(view, owner) {
    const best = view.best;
    if (!best) {
      const hint = owner
        ? (view.offers.length ? 'Apunta el precio con «Actualizar precios».' : 'Añade una tienda y su precio desde «Editar».')
        : 'Todavía no se ha apuntado el precio.';
      return '<div class="price-tag"><p class="tag-label">Precio</p><p class="tag-price is-empty">Sin precio todavía</p>' +
        '<p class="tag-shop">' + hint + '</p></div>' + go_shop_html(view, owner);
    }
    const deal_on = !view.done && view.on_deal;
    let deal = '';
    if (deal_on && best.drop) {
      deal = '<p class="tag-deal">Ha bajado ' + format_money(best.drop.amount) + ' (' + best.drop.pct + ' %). Antes costaba <s>' + format_money(best.drop.prev) + '</s></p>';
    } else if (deal_on && view.target_hit) {
      deal = '<p class="tag-deal">Ya está en el precio objetivo (' + format_money(view.target) + ') o por debajo.</p>';
    }
    const label = deal_on ? 'Oferta' : (view.priced.length > 1 ? 'Mejor precio' : 'Precio');
    return '<div class="price-tag' + (deal_on ? ' is-deal' : '') + '">' +
      '<p class="tag-label">' + label + '</p>' +
      '<p class="tag-price">' + format_money(best.price) + '</p>' +
      '<p class="tag-shop">en ' + escape_html(best.offer.shop || 'la tienda') + SEPARATOR + checked_text(best.offer.checked_at) + '</p>' +
      deal + '</div>' + go_shop_html(view, owner);
  }

  function go_shop_html(view, owner) {
    let target = view.best && safe_url(view.best.offer.url) ? view.best : null;
    if (!target) target = view.offers.find(o => safe_url(o.offer.url)) || null;
    if (!target) return '';
    const shop = escape_html(target.offer.shop || 'la tienda');
    return '<a class="btn ' + (owner ? 'secondary' : 'primary') + ' block go-shop" href="' + escape_html(safe_url(target.offer.url)) + '" target="_blank" rel="noopener noreferrer">' +
      'Ver en ' + shop + icon('external') + '<span class="sr-only"> (se abre en otra pestaña)</span></a>';
  }

  function shops_html(view) {
    if (view.offers.length < 2) return '';
    const sorted = view.offers.slice().sort((a, b) => {
      if (a.price == null && b.price == null) return 0;
      if (a.price == null) return 1;
      if (b.price == null) return -1;
      return a.price - b.price;
    });
    const rows = sorted.map(o => {
      const shop = escape_html(o.offer.shop || 'Tienda');
      const url = safe_url(o.offer.url);
      const is_best = view.best && o === view.best && view.priced.length > 1;
      return '<li class="shop-row' + (is_best ? ' is-best' : '') + '"><div class="shop-main"><span class="shop-name">' + shop + '</span>' +
        '<span class="shop-meta">' + (o.price != null ? checked_text(o.offer.checked_at) : 'Sin precio') + '</span></div>' +
        (o.price != null ? '<span class="shop-price">' + format_money(o.price) + '</span>' : '') +
        (url ? '<a class="icon-btn" href="' + escape_html(url) + '" target="_blank" rel="noopener noreferrer" aria-label="Ver en ' + shop + ' (se abre en otra pestaña)">' + icon('external') + '</a>' : '') +
        '</li>';
    }).join('');
    return '<section class="block" aria-labelledby="shops_title"><h3 class="block-title" id="shops_title">Tiendas</h3><ul class="plain-list" role="list">' + rows + '</ul></section>';
  }

  function history_html(view) {
    if (!view.best) return '';
    const offer = view.best.offer;
    const points = clean_history(offer);
    if (points.length < 2) return '';
    const shop = escape_html(offer.shop || 'la tienda');
    const last = points[points.length - 1];
    const end_date = parse_iso(offer.checked_at) && offer.checked_at > last.date ? offer.checked_at : last.date;
    const W = 320;
    const H = 110;
    const PAD_X = 6;
    const PAD_Y = 12;
    const time = iso => parse_iso(iso).getTime();
    const t0 = time(points[0].date);
    const t1 = time(end_date);
    const prices = points.map(p => p.price);
    const p_min = Math.min.apply(null, prices);
    const p_max = Math.max.apply(null, prices);
    const xs = iso => (t1 === t0 ? W / 2 : PAD_X + (time(iso) - t0) / (t1 - t0) * (W - 2 * PAD_X));
    const ys = v => (p_max === p_min ? H / 2 : PAD_Y + (p_max - v) / (p_max - p_min) * (H - 2 * PAD_Y));
    const r = n => Math.round(n * 10) / 10;
    let line = 'M' + r(xs(points[0].date)) + ' ' + r(ys(points[0].price));
    for (let i = 1; i < points.length; i++) {
      line += ' H' + r(xs(points[i].date)) + ' V' + r(ys(points[i].price));
    }
    line += ' H' + r(xs(end_date));
    const base = H - PAD_Y / 2;
    const area = line + ' V' + base + ' H' + r(xs(points[0].date)) + ' Z';
    const label_points = points.length <= 6
      ? points.map(p => format_money(p.price) + ' ' + (short_date(p.date) === 'hoy' ? 'hoy' : 'el ' + short_date(p.date))).join(', ')
      : 'empezó en ' + format_money(points[0].price) + ' el ' + short_date(points[0].date) + ' y ahora está en ' + format_money(last.price);
    const aria = 'Historial de precio en ' + shop + ': ' + label_points + '. Mínimo ' + format_money(p_min) + ', máximo ' + format_money(p_max) + '.';
    const svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + escape_html(aria) + '">' +
      '<line class="grid" x1="0" x2="' + W + '" y1="' + r(ys(p_max)) + '" y2="' + r(ys(p_max)) + '" stroke-dasharray="3 4"/>' +
      '<line class="grid" x1="0" x2="' + W + '" y1="' + r(ys(p_min)) + '" y2="' + r(ys(p_min)) + '" stroke-dasharray="3 4"/>' +
      '<path class="area" d="' + area + '"/>' +
      '<path class="line" d="' + line + '"/>' +
      '<circle class="dot" cx="' + r(xs(end_date)) + '" cy="' + r(ys(last.price)) + '" r="5"/></svg>';
    const axis = '<div class="chart-axis" aria-hidden="true"><span>' + short_date(points[0].date) + '</span><span>' + short_date(end_date) + '</span></div>';
    const facts = '<dl class="chart-facts"><div><dt>Mínimo</dt><dd>' + format_money(p_min) + '</dd></div>' +
      '<div><dt>Máximo</dt><dd>' + format_money(p_max) + '</dd></div>' +
      '<div><dt>Cambios</dt><dd>' + (points.length - 1) + '</dd></div></dl>';
    return '<section class="block" aria-labelledby="hist_title"><h3 class="block-title" id="hist_title">Historial en ' + shop + '</h3>' + svg + axis + facts + '</section>';
  }

  function target_html(view) {
    const text = view.target != null
      ? '<strong>' + format_money(view.target) + '</strong>. Cuando el mejor precio llegue a esa cifra, el regalo se marcará como oferta.'
      : 'Sin precio objetivo. Ponlo en «Editar» y el regalo se marcará como oferta al llegar a esa cifra.';
    return '<section class="block" aria-labelledby="target_title"><h3 class="block-title" id="target_title">Precio objetivo</h3><p class="info-text">' + text + '</p></section>';
  }

  function owner_actions_html(view) {
    const done_btn = view.done
      ? '<button type="button" class="action-row" data-action="toggle_done">' + icon('undo') + '<span>Volver a la lista de deseos</span></button>'
      : '<button type="button" class="action-row" data-action="toggle_done">' + icon('check') + '<span>Marcar como conseguido</span></button>';
    return '<ul class="actions-list" role="list"><li>' + done_btn + '</li><li id="delete_slot">' + delete_button_html() + '</li></ul>';
  }

  function delete_button_html() {
    return '<button type="button" class="action-row danger" data-action="ask_delete">' + icon('trash') + '<span>Eliminar regalo</span></button>';
  }

  function show_delete_confirm() {
    const slot = sheet_el.querySelector('#delete_slot');
    const item = find_item(sheet.item_id);
    if (!slot || !item) return;
    slot.innerHTML = '<div class="confirm-box" role="group" aria-labelledby="confirm_text"><p id="confirm_text">¿Eliminar «' + escape_html(item.name || 'este regalo') + '» de la lista?</p>' +
      '<div class="confirm-actions"><button type="button" class="btn secondary" data-action="cancel_delete">Cancelar</button>' +
      '<button type="button" class="btn danger" data-action="confirm_delete">Eliminar</button></div></div>';
    slot.querySelector('[data-action="cancel_delete"]').focus();
  }

  function hide_delete_confirm() {
    const slot = sheet_el.querySelector('#delete_slot');
    if (!slot) return;
    slot.innerHTML = delete_button_html();
    slot.querySelector('button').focus();
  }

  // ---------- añadir y editar ----------

  function blank_draft() {
    return { name: '', category: '', priority: 'media', target_price: null, notes: '', image: '', offers: [] };
  }

  function draft_from_item(item) {
    return {
      name: item.name || '',
      category: CATEGORY_NAMES[item.category] ? item.category : '',
      priority: item_priority(item),
      target_price: typeof item.target_price === 'number' ? item.target_price : null,
      notes: item.notes || '',
      image: safe_image(item.image),
      offers: (Array.isArray(item.offers) ? item.offers : []).map(o => ({ id: o.id, url: o.url || '', shop: o.shop || '', price: typeof o.price === 'number' ? o.price : null }))
    };
  }

  function open_add() {
    if (ui.mode !== 'edit') return;
    sheet.flash = '';
    const html = '<form class="sheet-form" id="link_form" novalidate>' + form_head('Nuevo regalo') +
      '<div class="sheet-scroll"><div class="form-body">' +
      '<p class="form-error" id="form_error" role="alert" hidden></p>' +
      '<div class="field"><label class="field-label" for="f_link">Enlace del producto</label>' +
      '<input class="input" id="f_link" type="url" inputmode="url" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://" aria-describedby="f_link_hint">' +
      '<p class="hint" id="f_link_hint">Pega el enlace de la tienda. Con él se rellenan el nombre y la tienda. Cada día se buscan el precio y la foto si la tienda lo permite; si no, puedes ponerlos tú.</p></div>' +
      '</div></div>' +
      '<div class="sheet-foot"><button type="button" class="btn secondary" data-action="skip_link">Añadir sin enlace</button>' +
      '<button type="submit" class="btn primary">Continuar</button></div></form>';
    open_sheet('link', null, html, '#f_link');
  }

  function submit_link() {
    const raw = value_of('f_link').trim();
    const draft = blank_draft();
    if (raw) {
      const url = safe_url(raw);
      if (!url) return form_error('Ese enlace no es válido. Tiene que empezar por https://', 'f_link');
      const suggestion = suggest_from_url(url);
      draft.name = suggestion ? suggestion.name : '';
      draft.offers = [{ id: new_id(), url: url, shop: suggestion ? suggestion.shop : '', price: null }];
    }
    open_item_form(null, draft);
    return true;
  }

  function open_item_form(item_id, draft) {
    const item = item_id ? find_item(item_id) : null;
    if (item_id && !item) return;
    const d = draft || draft_from_item(item);
    sheet.draft = { image: d.image || '' };
    let category_options = '<option value="">Sin categoría</option>';
    for (const [key, label] of CATEGORY_OPTIONS) {
      category_options += '<option value="' + key + '"' + (d.category === key ? ' selected' : '') + '>' + label + '</option>';
    }
    let prio = '';
    for (const [key, label] of PRIORITY_OPTIONS) {
      prio += '<input class="choice-input" type="radio" name="f_priority" id="f_prio_' + key + '" value="' + key + '"' + (d.priority === key ? ' checked' : '') + '>' +
        '<label for="f_prio_' + key + '">' + label + '</label>';
    }
    const offers = d.offers.length ? d.offers : [{ id: new_id(), url: '', shop: '', price: null }];
    const body =
      '<p class="form-error" id="form_error" role="alert" hidden></p>' +
      photo_field_html(d.image) +
      '<div class="field"><label class="field-label" for="f_name">Nombre</label>' +
      '<input class="input" id="f_name" type="text" maxlength="140" autocomplete="off" aria-required="true" value="' + escape_html(d.name) + '"></div>' +
      '<div class="field"><label class="field-label" for="f_category">Categoría</label>' +
      '<span class="select-wrap is-block"><select id="f_category">' + category_options + '</select>' + icon('chevron_down') + '</span></div>' +
      '<fieldset class="field prio-group"><legend class="field-label">Prioridad</legend><div class="segmented">' + prio + '</div></fieldset>' +
      '<div class="field"><span class="field-label">Tiendas y precios</span>' +
      '<div class="offer-list" id="offer_list">' + offers.map((o, i) => offer_card_html(o, i + 1)).join('') + '</div>' +
      '<div><button type="button" class="link-btn" data-action="add_offer">' + icon('plus') + 'Añadir otra tienda</button></div></div>' +
      '<div class="field"><label class="field-label" for="f_target">Precio objetivo (€)</label>' +
      '<input class="input" id="f_target" type="text" inputmode="decimal" autocomplete="off" placeholder="Opcional" aria-describedby="f_target_hint" value="' + format_input_number(d.target_price) + '">' +
      '<p class="hint" id="f_target_hint">Cuando el mejor precio llegue a esta cifra, el regalo se marcará como oferta.</p></div>' +
      '<div class="field"><label class="field-label" for="f_notes">Notas</label>' +
      '<textarea class="textarea" id="f_notes" maxlength="600" placeholder="Talla, color, modelo…">' + escape_html(d.notes) + '</textarea></div>';
    const html = '<form class="sheet-form" id="item_form" novalidate>' + form_head(item ? 'Editar regalo' : 'Nuevo regalo') +
      '<div class="sheet-scroll"><div class="form-body">' + body + '</div></div>' +
      '<div class="sheet-foot" id="form_foot"><button type="button" class="btn secondary" data-action="cancel_form">Cancelar</button>' +
      '<button type="submit" class="btn primary" id="submit_btn">' + (item ? 'Guardar cambios' : 'Añadir a la lista') + '</button></div></form>';
    open_sheet('item', item_id, html, item || d.name ? '#sheet_title' : '#f_name');
  }

  function photo_field_html(image) {
    return '<div class="field"><span class="field-label" id="photo_label">Foto</span>' +
      '<div class="photo-picker"><div class="photo-box' + (image ? '' : ' is-empty') + '" id="photo_box">' +
      (image ? img_html(image, 'Foto elegida') : icon('photo')) + '</div>' +
      '<div class="photo-side"><div class="photo-actions">' +
      '<input class="choice-input file-input" type="file" id="f_photo" accept="image/*" aria-describedby="photo_hint">' +
      '<label class="btn secondary" for="f_photo">' + (image ? 'Cambiar foto' : 'Elegir foto') + '</label>' +
      '<button type="button" class="btn secondary" data-action="remove_photo" id="remove_photo"' + (image ? '' : ' hidden') + '>Quitar</button></div>' +
      '<p class="hint" id="photo_hint">Elige una foto del carrete o de tus archivos.</p></div></div></div>';
  }

  function offer_card_html(offer, position) {
    offer_seq += 1;
    const n = offer_seq;
    return '<div class="offer-card" data-offer-id="' + escape_html(offer.id || new_id()) + '" role="group" aria-labelledby="ot_' + n + '">' +
      '<div class="offer-head"><p class="offer-title" id="ot_' + n + '">Tienda ' + position + '</p>' +
      '<button type="button" class="link-btn danger" data-action="remove_offer" aria-label="Quitar tienda ' + position + '">Quitar</button></div>' +
      '<div class="field"><label class="field-label" for="o_url_' + n + '">Enlace</label>' +
      '<input class="input o-url" id="o_url_' + n + '" type="url" inputmode="url" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://" value="' + escape_html(offer.url || '') + '"></div>' +
      '<div class="offer-grid"><div class="field"><label class="field-label" for="o_shop_' + n + '">Tienda</label>' +
      '<input class="input o-shop" id="o_shop_' + n + '" type="text" maxlength="60" autocomplete="off" value="' + escape_html(offer.shop || '') + '"></div>' +
      '<div class="field"><label class="field-label" for="o_price_' + n + '">Precio (€)</label>' +
      '<input class="input o-price" id="o_price_' + n + '" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00" value="' + format_input_number(offer.price) + '"></div></div></div>';
  }

  function renumber_offers() {
    sheet_el.querySelectorAll('.offer-card').forEach((card, i) => {
      card.querySelector('.offer-title').textContent = 'Tienda ' + (i + 1);
      card.querySelector('[data-action="remove_offer"]').setAttribute('aria-label', 'Quitar tienda ' + (i + 1));
    });
  }

  function add_offer_card() {
    const list = sheet_el.querySelector('#offer_list');
    if (!list) return;
    list.insertAdjacentHTML('beforeend', offer_card_html({ id: new_id(), url: '', shop: '', price: null }, list.children.length + 1));
    renumber_offers();
    sheet.dirty = true;
    const inputs = list.querySelectorAll('.o-url');
    inputs[inputs.length - 1].focus();
  }

  function remove_offer_card(button) {
    const list = sheet_el.querySelector('#offer_list');
    const card = button.closest('.offer-card');
    if (!list || !card) return;
    sheet.dirty = true;
    if (list.children.length > 1) {
      const index = Array.from(list.children).indexOf(card);
      card.remove();
      renumber_offers();
      const cards = list.querySelectorAll('.offer-card');
      const next_card = cards[Math.min(index, cards.length - 1)];
      if (next_card) next_card.querySelector('.o-url').focus();
    } else {
      card.querySelectorAll('input').forEach(input => { input.value = ''; });
      card.querySelector('.o-url').focus();
    }
  }

  function suggest_into_card(input) {
    const suggestion = suggest_from_url(input.value);
    if (!suggestion) return;
    const card = input.closest('.offer-card');
    const shop_input = card ? card.querySelector('.o-shop') : null;
    if (shop_input && !shop_input.value.trim() && suggestion.shop) shop_input.value = suggestion.shop;
    const name_input = sheet_el.querySelector('#f_name');
    if (name_input && !name_input.value.trim() && suggestion.name) name_input.value = suggestion.name;
  }

  function set_photo(data_url) {
    if (sheet.kind !== 'item' || !sheet.draft) return;
    sheet.draft.image = data_url || '';
    sheet.dirty = true;
    const box = sheet_el.querySelector('#photo_box');
    if (box) {
      box.classList.toggle('is-empty', !data_url);
      box.innerHTML = data_url ? img_html(data_url, 'Foto elegida') : icon('photo');
      hydrate_photos(box);
    }
    const label = sheet_el.querySelector('label[for="f_photo"]');
    if (label) label.textContent = data_url ? 'Cambiar foto' : 'Elegir foto';
    const remove = sheet_el.querySelector('#remove_photo');
    if (remove) remove.hidden = !data_url;
  }

  function remove_photo() {
    set_photo('');
    const input = sheet_el.querySelector('#f_photo');
    if (input) input.focus();
  }

  async function set_photo_from_file(file) {
    if (!file || !/^image\//.test(file.type || '')) {
      form_error('Ese archivo no es una imagen. Prueba con una foto JPG, PNG o WebP.');
      return;
    }
    try {
      set_photo(await image_file_to_data_url(file));
      const err = sheet_el.querySelector('#form_error');
      if (err) err.hidden = true;
    } catch (error) {
      form_error('No se pudo leer esa imagen. Prueba con otra foto.');
    }
  }

  function image_file_to_data_url(file) {
    return new Promise((resolve, reject) => {
      const object_url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
          const width = Math.max(1, Math.round(img.naturalWidth * scale));
          const height = Math.max(1, Math.round(img.naturalHeight * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
        } catch (error) {
          reject(error);
        } finally {
          URL.revokeObjectURL(object_url);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(object_url); reject(new Error('image_load_failed')); };
      img.src = object_url;
    });
  }

  function value_of(id) {
    const el = sheet_el.querySelector('#' + id);
    return el ? String(el.value || '') : '';
  }

  function checked_value(name) {
    const el = sheet_el.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  function form_error(message, field_id) {
    const el = sheet_el.querySelector('#form_error');
    sheet_el.querySelectorAll('[aria-invalid="true"]').forEach(node => node.removeAttribute('aria-invalid'));
    if (el) {
      el.textContent = message;
      el.hidden = false;
    }
    const field = field_id ? sheet_el.querySelector('#' + field_id) : null;
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      if (el) field.setAttribute('aria-errormessage', 'form_error');
      field.focus();
    } else if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
    return false;
  }

  function report_error(message) {
    if (sheet_el.open) {
      if (sheet_el.querySelector('#form_error')) {
        form_error(message);
        return;
      }
      const scroller = sheet_el.querySelector('.sheet-scroll');
      if (scroller) {
        let el = scroller.querySelector('.sheet-error');
        if (!el) {
          el = document.createElement('p');
          el.className = 'form-error sheet-error';
          el.setAttribute('role', 'alert');
          scroller.prepend(el);
        }
        el.textContent = message;
        el.scrollIntoView({ block: 'nearest' });
        return;
      }
    }
    toast_el.textContent = message;
    toast_el.hidden = false;
    clearTimeout(toast_timer);
    toast_timer = setTimeout(() => { toast_el.hidden = true; }, 6000);
  }

  async function submit_item_form() {
    const name = value_of('f_name').trim();
    if (!name) return form_error('Escribe el nombre del regalo.', 'f_name');
    let target_price = null;
    const target_raw = value_of('f_target').trim();
    if (target_raw) {
      target_price = parse_price(target_raw);
      if (Number.isNaN(target_price)) return form_error('El precio objetivo no es válido. Escribe solo la cifra, por ejemplo 49,99.', 'f_target');
    }
    const offers_input = [];
    for (const card of sheet_el.querySelectorAll('.offer-card')) {
      const url_el = card.querySelector('.o-url');
      const shop_el = card.querySelector('.o-shop');
      const price_el = card.querySelector('.o-price');
      const url_raw = url_el.value.trim();
      const shop_raw = shop_el.value.trim();
      const price_raw = price_el.value.trim();
      if (!url_raw && !shop_raw && !price_raw) continue;
      let url = '';
      if (url_raw) {
        url = safe_url(url_raw);
        if (!url) return form_error('Revisa el enlace: tiene que empezar por https://', url_el.id);
      }
      let price = null;
      if (price_raw) {
        price = parse_price(price_raw);
        if (Number.isNaN(price)) return form_error('Revisa el precio: escribe solo la cifra, por ejemplo 29,99.', price_el.id);
      }
      const shop = (shop_raw || (url ? shop_label(new URL(url).hostname) : '')).slice(0, 60);
      offers_input.push({ id: card.dataset.offerId || new_id(), url: url, shop: shop, price: price });
    }

    const is_new = !sheet.item_id;
    const item_id = sheet.item_id || new_id();
    const priority = checked_value('f_priority');
    const category = value_of('f_category');
    const notes = value_of('f_notes').trim().slice(0, 600);
    const old_item = find_item(item_id);
    const old_image = old_item && is_photo_path(old_item.image) ? old_item.image : '';
    let image = sheet.draft && sheet.draft.image ? sheet.draft.image : '';
    busy_label(sheet_el.querySelector('#submit_btn'), 'Guardando…');
    if (DATA_URL_RE.test(image)) {
      set_saving(true);
      const photo_path = PHOTO_DIR + '/' + item_id + '-' + Date.now().toString(36) + '.jpg';
      try {
        await ui.store.upload_photo(photo_path, data_url_to_base64(image), 'Foto de ' + name.slice(0, 60));
      } catch (error) {
        set_saving(false);
        return form_error('No se pudo subir la foto. ' + error_message(error));
      }
      photo_urls.set(photo_path, image);
      image = photo_path;
    }
    const saved = await commit(next => {
      const today = today_iso();
      let item = next.items.find(it => it.id === item_id);
      if (!item) {
        if (!is_new) return 'Este regalo ya no está en la lista. Cierra y vuelve a abrir la página.';
        item = { id: item_id, created_at: today, offers: [] };
        next.items.push(item);
      }
      item.name = name.slice(0, 140);
      item.notes = notes;
      item.priority = PRIORITY_TITLES[priority] ? priority : 'media';
      if (CATEGORY_NAMES[category]) item.category = category;
      else delete item.category;
      item.target_price = target_price;
      item.image = image;
      item.updated_at = today;
      const old_offers = new Map((Array.isArray(item.offers) ? item.offers : []).map(o => [o.id, o]));
      item.offers = offers_input.map(input => {
        const old = old_offers.get(input.id);
        const offer = old ? Object.assign({}, old) : { id: input.id, history: [], checked_at: null, price: null };
        offer.url = input.url;
        offer.shop = input.shop;
        if (!Array.isArray(offer.history)) offer.history = [];
        if (input.price == null) {
          offer.price = null;
        } else if (!old || old.price !== input.price) {
          offer.price = input.price;
          const last = offer.history.length ? offer.history[offer.history.length - 1] : null;
          if (!last || last.price !== input.price) offer.history = offer.history.concat([{ date: today, price: input.price }]).slice(-HISTORY_LIMIT);
          offer.checked_at = today;
        }
        return offer;
      });
      return null;
    }, { message: (is_new ? 'Regalo añadido: ' : 'Regalo editado: ') + name.slice(0, 60), toast: is_new ? 'Regalo añadido' : 'Cambios guardados', open_item: item_id });
    if (saved && old_image && old_image !== image) delete_photo_quietly(old_image, 'Foto sustituida');
    return true;
  }

  // ---------- precios ----------

  function open_prices(id) {
    const item = find_item(id);
    if (!item) return;
    const offers = Array.isArray(item.offers) ? item.offers : [];
    let body;
    let foot;
    if (!offers.length) {
      body = '<p class="info-text">Este regalo todavía no tiene tiendas. Añádelas desde «Editar».</p>';
      foot = '<div class="sheet-foot" id="form_foot"><button type="button" class="btn secondary" data-action="cancel_form">Volver</button>' +
        '<button type="button" class="btn primary" data-action="edit">Editar</button></div>';
    } else {
      body = '<p class="form-error" id="form_error" role="alert" hidden></p><div class="price-rows">' + offers.map((o, i) => {
        const field_id = 'p_price_' + i;
        const now = typeof o.price === 'number'
          ? 'Ahora: ' + format_money(o.price) + ', ' + checked_text(o.checked_at) + '.'
          : 'Todavía sin precio.';
        return '<div class="price-row"><label class="field-label" for="' + field_id + '">Precio en ' + escape_html(o.shop || 'la tienda ' + (i + 1)) + ' (€)</label>' +
          '<input class="input p-price" id="' + field_id + '" data-offer-id="' + escape_html(o.id) + '" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00" value="' + format_input_number(o.price) + '" aria-describedby="' + field_id + '_now">' +
          '<p class="price-now" id="' + field_id + '_now">' + now + '</p></div>';
      }).join('') + '</div><p class="hint">Si un precio no ha cambiado, déjalo igual: quedará como comprobado hoy.</p>';
      foot = '<div class="sheet-foot" id="form_foot"><button type="button" class="btn secondary" data-action="cancel_form">Cancelar</button>' +
        '<button type="submit" class="btn primary" id="submit_btn">Guardar precios</button></div>';
    }
    const html = '<form class="sheet-form" id="prices_form" novalidate>' + form_head('Actualizar precios') +
      '<div class="sheet-scroll"><p class="sheet-kicker is-subject">' + escape_html(item.name || '') + '</p>' + body + '</div>' + foot + '</form>';
    open_sheet('prices', id, html, '#sheet_title');
  }

  async function submit_prices() {
    const item_id = sheet.item_id;
    const inputs = [];
    for (const input of sheet_el.querySelectorAll('.p-price')) {
      const raw = input.value.trim();
      if (!raw) continue;
      const price = parse_price(raw);
      if (Number.isNaN(price)) return form_error('Revisa este precio: escribe solo la cifra, por ejemplo 29,99.', input.id);
      inputs.push({ offer_id: input.dataset.offerId, price: price });
    }
    busy_label(sheet_el.querySelector('#submit_btn'), 'Guardando…');
    const item = find_item(item_id);
    await commit(next => {
      const target = next.items.find(it => it.id === item_id);
      if (!target) return 'Este regalo ya no está en la lista. Cierra y vuelve a abrir la página.';
      const today = today_iso();
      for (const input of inputs) {
        const offer = (target.offers || []).find(o => o.id === input.offer_id);
        if (!offer) continue;
        if (!Array.isArray(offer.history)) offer.history = [];
        const last = offer.history.length ? offer.history[offer.history.length - 1] : null;
        offer.price = input.price;
        if (!last || last.price !== input.price) offer.history = offer.history.concat([{ date: today, price: input.price }]).slice(-HISTORY_LIMIT);
        offer.checked_at = today;
      }
      target.updated_at = today;
      return null;
    }, { message: 'Precios a mano: ' + String(item ? item.name : '').slice(0, 60), toast: 'Precios guardados', open_item: item_id });
    return true;
  }

  // ---------- conseguido y borrar ----------

  async function toggle_done(id, button) {
    const item = find_item(id);
    if (!item) return;
    const now_done = !item.done_at;
    busy_label(button, 'Guardando…');
    await commit(next => {
      const target = next.items.find(it => it.id === id);
      if (!target) return 'Este regalo ya no está en la lista.';
      const today = today_iso();
      if (now_done) target.done_at = today;
      else delete target.done_at;
      target.updated_at = today;
      return null;
    }, { message: (now_done ? 'Conseguido: ' : 'Vuelve a la lista: ') + String(item.name || '').slice(0, 60), toast: now_done ? 'Marcado como conseguido' : 'Ha vuelto a la lista de deseos', open_item: id });
  }

  async function delete_item(id, button) {
    const item = find_item(id);
    if (!item) return;
    const photo = is_photo_path(item.image) ? item.image : '';
    busy_label(button, 'Eliminando…');
    const saved = await commit(next => {
      next.items = next.items.filter(it => it.id !== id);
      return null;
    }, { message: 'Regalo eliminado: ' + String(item.name || '').slice(0, 60), toast: 'Regalo eliminado' });
    if (saved && photo) delete_photo_quietly(photo, 'Foto de un regalo eliminado');
  }

  // ---------- guardado ----------

  function busy_label(button, text) {
    if (!button) return;
    button.dataset.label = button.innerHTML;
    button.textContent = text;
  }

  function set_saving(is_saving) {
    ui.saving = is_saving;
    sheet_el.setAttribute('aria-busy', is_saving ? 'true' : 'false');
    sheet_el.querySelectorAll('button').forEach(button => {
      button.disabled = is_saving;
      if (!is_saving && button.dataset.label) {
        button.innerHTML = button.dataset.label;
        delete button.dataset.label;
      }
    });
  }

  function error_message(error) {
    const code = error && error.code;
    if (code === 'bad_token') return 'GitHub no acepta el token. Pulsa «Olvidar el token» y pega uno nuevo.';
    if (code === 'forbidden') return 'El token no tiene permiso para guardar. Dale el permiso «Contents: Read and write».';
    if (code === 'rate_limited') return 'GitHub ha limitado las peticiones. Espera un minuto y vuelve a intentarlo.';
    if (code === 'conflict') return 'La lista ha cambiado desde otro sitio. Repite el cambio.';
    if (code === 'too_large') return 'El archivo es demasiado grande para GitHub.';
    return 'No se pudo guardar. Comprueba la conexión y vuelve a intentarlo.';
  }

  // Aplica el cambio sobre la versión más reciente de la lista. Si otro sitio (por ejemplo, la
  // actualización diaria de precios) ha guardado antes, vuelve a leer la lista y repite el cambio.
  async function commit(mutate, done) {
    if (!ui.store) return false;
    set_saving(true);
    let base = state;
    let sha = ui.sha;
    for (let attempt = 0; attempt < 3; attempt++) {
      const next = clone(base);
      const problem = mutate(next);
      if (problem) {
        set_saving(false);
        report_error(problem);
        return false;
      }
      try {
        ui.sha = await ui.store.write_json(list_path(), next, sha, done.message || 'Lista actualizada');
        state = next;
        set_saving(false);
        after_save(done);
        return true;
      } catch (error) {
        if (error.code === 'conflict' && attempt < 2) {
          try {
            const fresh = await ui.store.read_json(list_path());
            base = normalize_state(fresh.data);
            sha = fresh.sha;
            state = base;
            ui.sha = sha;
            render_page();
            continue;
          } catch (read_error) {
            error = read_error;
          }
        }
        set_saving(false);
        report_error(error_message(error));
        return false;
      }
    }
    set_saving(false);
    return false;
  }

  function after_save(done) {
    render_page();
    const text = done.toast || '';
    if (done.open_item && find_item(done.open_item)) {
      open_detail(done.open_item, text);
    } else {
      if (sheet_el.open) sheet_el.close();
      if (text) show_toast(text);
    }
  }
})();
