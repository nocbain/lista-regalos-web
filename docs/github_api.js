// Acceso al repositorio privado de datos con la API REST de GitHub.
// El token solo se envía a api.github.com.
(() => {
  'use strict';

  const API_ROOT = 'https://api.github.com';
  const JSON_ACCEPT = 'application/vnd.github+json';
  const RAW_ACCEPT = 'application/vnd.github.raw+json';
  const CHUNK_SIZE = 0x8000;

  class GitHubError extends Error {
    constructor(code, status, detail) {
      super(code + (detail ? ': ' + detail : ''));
      this.code = code;
      this.status = status || 0;
    }
  }

  function bytes_to_base64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE));
    }
    return btoa(binary);
  }

  function utf8_to_base64(text) {
    return bytes_to_base64(new TextEncoder().encode(text));
  }

  function base64_to_utf8(base64) {
    const binary = atob(String(base64 || '').replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function code_for(response) {
    const status = response.status;
    if (status === 401) return 'bad_token';
    if ((status === 403 || status === 429) && response.headers.get('x-ratelimit-remaining') === '0') return 'rate_limited';
    if (status === 429) return 'rate_limited';
    if (status === 403) return 'forbidden';
    if (status === 404) return 'not_found';
    if (status === 409) return 'conflict';
    if (status === 413) return 'too_large';
    if (status === 422) return 'invalid';
    return 'upstream_error';
  }

  class GitHubStore {
    constructor(connection) {
      this.owner = connection.owner;
      this.repo = connection.repo;
      this.branch = connection.branch || '';
      this.token = connection.token;
    }

    repo_path() {
      return '/repos/' + encodeURIComponent(this.owner) + '/' + encodeURIComponent(this.repo);
    }

    contents_path(file_path) {
      return this.repo_path() + '/contents/' + String(file_path).split('/').map(encodeURIComponent).join('/');
    }

    with_ref(path) {
      return this.branch ? path + '?ref=' + encodeURIComponent(this.branch) : path;
    }

    async request(method, path, options) {
      const opts = options || {};
      const headers = { Accept: opts.accept || JSON_ACCEPT, Authorization: 'Bearer ' + this.token };
      const init = { method: method, headers: headers, cache: 'no-store', referrerPolicy: 'no-referrer' };
      if (opts.body !== undefined) {
        headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(opts.body);
      }
      let response;
      try {
        response = await fetch(API_ROOT + path, init);
      } catch (error) {
        throw new GitHubError('network', 0, String(error && error.message || error));
      }
      if (!response.ok) {
        let detail = '';
        try { detail = (await response.json()).message || ''; } catch (error) { /* sin detalle */ }
        let code = code_for(response);
        // GitHub responde 422 cuando falta el sha de un archivo que ya existe o el sha no coincide.
        if (code === 'invalid' && /sha/i.test(detail)) code = 'conflict';
        throw new GitHubError(code, response.status, detail);
      }
      return response;
    }

    async check_repo() {
      const response = await this.request('GET', this.repo_path());
      const info = await response.json();
      if (!this.branch) this.branch = info.default_branch || 'main';
      return info;
    }

    async list_lists(directory) {
      let entries;
      try {
        const response = await this.request('GET', this.with_ref(this.contents_path(directory)));
        entries = await response.json();
      } catch (error) {
        if (error.code === 'not_found') return [];
        throw error;
      }
      if (!Array.isArray(entries)) return [];
      return entries
        .filter(entry => entry.type === 'file' && /^[a-z0-9_-]+\.json$/i.test(entry.name))
        .map(entry => ({ slug: entry.name.replace(/\.json$/i, ''), path: entry.path }))
        .sort((a, b) => a.slug.localeCompare(b.slug));
    }

    async read_json(file_path) {
      const response = await this.request('GET', this.with_ref(this.contents_path(file_path)));
      const meta = await response.json();
      let base64 = meta.content;
      if (meta.encoding !== 'base64' || !base64) {
        // Archivos de más de 1 MB: la API de contenidos no incluye el texto y hay que pedir el blob.
        const blob_response = await this.request('GET', this.repo_path() + '/git/blobs/' + encodeURIComponent(meta.sha));
        base64 = (await blob_response.json()).content;
      }
      let data;
      try {
        data = JSON.parse(base64_to_utf8(base64));
      } catch (error) {
        throw new GitHubError('bad_json', 0, file_path);
      }
      return { data: data, sha: meta.sha };
    }

    async write_json(file_path, data, sha, message) {
      const body = { message: message, content: utf8_to_base64(JSON.stringify(data, null, 2) + '\n') };
      if (sha) body.sha = sha;
      if (this.branch) body.branch = this.branch;
      const response = await this.request('PUT', this.contents_path(file_path), { body: body });
      const result = await response.json();
      return result.content.sha;
    }

    async read_photo(file_path) {
      const response = await this.request('GET', this.with_ref(this.contents_path(file_path)), { accept: RAW_ACCEPT });
      return response.blob();
    }

    async upload_photo(file_path, base64, message) {
      const body = { message: message, content: base64 };
      if (this.branch) body.branch = this.branch;
      await this.request('PUT', this.contents_path(file_path), { body: body });
    }

    async delete_file(file_path, message) {
      const response = await this.request('GET', this.with_ref(this.contents_path(file_path)));
      const meta = await response.json();
      const body = { message: message, sha: meta.sha };
      if (this.branch) body.branch = this.branch;
      await this.request('DELETE', this.contents_path(file_path), { body: body });
    }
  }

  window.GitHubStore = GitHubStore;
  window.GitHubError = GitHubError;
})();
