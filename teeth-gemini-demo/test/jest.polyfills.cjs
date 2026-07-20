/**
 * Minimal Fetch API stubs for react-router data APIs under jsdom.
 * Full undici is avoided because it also needs ReadableStream in this environment.
 */
const { TextEncoder, TextDecoder } = require('util');

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;

class HeadersPolyfill {
  constructor(init) {
    this._map = new Map();
    if (!init) return;
    if (Array.isArray(init)) {
      for (const [key, value] of init) this.set(key, value);
      return;
    }
    if (typeof init.forEach === 'function') {
      init.forEach((value, key) => this.set(key, value));
      return;
    }
    for (const [key, value] of Object.entries(init)) this.set(key, value);
  }

  get(name) {
    return this._map.get(String(name).toLowerCase()) ?? null;
  }

  set(name, value) {
    this._map.set(String(name).toLowerCase(), String(value));
  }

  has(name) {
    return this._map.has(String(name).toLowerCase());
  }

  forEach(callback) {
    this._map.forEach((value, key) => callback(value, key, this));
  }
}

class RequestPolyfill {
  constructor(input, init = {}) {
    this.url = typeof input === 'string' ? input : String(input.url);
    this.method = String(init.method ?? 'GET').toUpperCase();
    this.headers = new HeadersPolyfill(init.headers);
    this.body = init.body ?? null;
    this.signal = init.signal;
  }

  clone() {
    return new RequestPolyfill(this.url, {
      method: this.method,
      headers: this.headers,
      body: this.body,
      signal: this.signal,
    });
  }
}

class ResponsePolyfill {
  constructor(body = null, init = {}) {
    this.body = body;
    this.status = init.status ?? 200;
    this.statusText = init.statusText ?? '';
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new HeadersPolyfill(init.headers);
  }

  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
  }

  async text() {
    return this.body == null ? '' : String(this.body);
  }

  clone() {
    return new ResponsePolyfill(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
    });
  }
}

globalThis.Headers = HeadersPolyfill;
globalThis.Request = RequestPolyfill;
globalThis.Response = ResponsePolyfill;
globalThis.fetch = async () => new ResponsePolyfill(null, { status: 404 });
