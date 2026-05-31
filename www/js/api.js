const api = {
  async request(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch('/api' + path, opts);
    const json = await res.json();

    if (!json.success) {
      if (res.status === 423) {
        const details = json.error?.details || {};
        throw new LockedError(json.error?.message || '系统正在编辑中', details);
      }
      throw new ApiError(json.error?.code || 'UNKNOWN', json.error?.message || 'Unknown error', res.status);
    }

    return json.data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  delete(path) { return this.request('DELETE', path); },
};

class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

class LockedError extends ApiError {
  constructor(message, details) {
    super('RESOURCE_LOCKED', message, 423);
    this.details = details;
  }
}

window.ApiError = ApiError;
window.LockedError = LockedError;
