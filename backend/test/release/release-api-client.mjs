import { randomUUID } from 'node:crypto';

export class ReleaseApiError extends Error {
  constructor(message, { status, code, details, url, body } = {}) {
    super(message);
    this.name = 'ReleaseApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.url = url;
    this.body = body;
  }
}

export function requiredEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new ReleaseApiError(`${name} is required for this release verification`);
  }
  return value.trim();
}

export function normalizeBaseUrl(value) {
  return value.replace(/\/$/, '');
}

export class ReleaseApiClient {
  constructor({ baseUrl, accessToken = null }) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.accessToken = accessToken;
  }

  withToken(accessToken) {
    return new ReleaseApiClient({ baseUrl: this.baseUrl, accessToken });
  }

  async request(path, { method = 'GET', body, query, expectedStatus } = {}) {
    const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') continue;
        url.searchParams.set(key, String(value));
      }
    }

    const headers = { 'X-Request-Id': randomUUID() };
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    const allowedStatuses = Array.isArray(expectedStatus)
      ? expectedStatus
      : [expectedStatus ?? (method === 'POST' ? 201 : 200)];
    if (!allowedStatuses.includes(response.status)) {
      throw new ReleaseApiError(`Unexpected HTTP ${response.status} for ${method} ${path}`, {
        status: response.status,
        code: payload?.error?.code,
        details: payload?.error?.details,
        url: url.toString(),
        body: payload,
      });
    }
    if (payload && payload.success === false) {
      throw new ReleaseApiError(`API error for ${method} ${path}: ${payload.error?.message}`, {
        status: response.status,
        code: payload.error?.code,
        details: payload.error?.details,
        url: url.toString(),
        body: payload,
      });
    }
    return payload?.success === true ? payload.data : payload;
  }

  get(path, options = {}) {
    return this.request(path, { ...options, method: 'GET' });
  }

  post(path, body, options = {}) {
    return this.request(path, { ...options, method: 'POST', body });
  }

  patch(path, body, options = {}) {
    return this.request(path, { ...options, method: 'PATCH', body });
  }

  delete(path, options = {}) {
    return this.request(path, { ...options, method: 'DELETE', expectedStatus: options.expectedStatus ?? 200 });
  }
}

export async function login(api, email, password) {
  const session = await api.post('/auth/login', { email, password }, { expectedStatus: [200, 201] });
  if (!session?.accessToken || !session?.refreshToken) {
    throw new ReleaseApiError('Login did not return access and refresh tokens');
  }
  return session;
}

export function firstItem(page) {
  if (Array.isArray(page)) return page[0];
  if (Array.isArray(page?.items)) return page.items[0];
  if (Array.isArray(page?.data)) return page.data[0];
  return undefined;
}
