import { ReleaseApiClient, login, requiredEnv } from './release-api-client.mjs';

const apiBaseUrl = requiredEnv('ORBIT_RELEASE_API_URL');
const frontendBaseUrl = requiredEnv('ORBIT_RELEASE_FRONTEND_URL').replace(/\/$/, '');
const ownerEmail = requiredEnv('ORBIT_RELEASE_OWNER_EMAIL');
const ownerPassword = requiredEnv('ORBIT_RELEASE_OWNER_PASSWORD');

const api = new ReleaseApiClient({ baseUrl: apiBaseUrl });

async function checkFrontendRoute(path) {
  const response = await fetch(`${frontendBaseUrl}${path}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok || !contentType.includes('text/html')) {
    throw new Error(`Frontend route ${path} failed: ${response.status} ${contentType}`);
  }
  const html = await response.text();
  if (!html.includes('__next')) {
    throw new Error(`Frontend route ${path} did not return a Next.js document`);
  }
}

async function main() {
  const health = await api.get('/health', { expectedStatus: 200 });
  if (
    health?.database_connection !== 'ok' &&
    health?.database_connection !== 'connected' &&
    health?.database_connection !== true
  ) {
    throw new Error(`Health check did not confirm database connectivity: ${JSON.stringify(health)}`);
  }

  const session = await login(api, ownerEmail, ownerPassword);
  const authenticated = api.withToken(session.accessToken);
  await authenticated.get('/auth/me', { expectedStatus: 200 });
  await authenticated.get('/health/ready', { expectedStatus: 200 });
  await authenticated.get('/metrics', { expectedStatus: 200 });

  await Promise.all([
    checkFrontendRoute('/login'),
    checkFrontendRoute('/'),
    checkFrontendRoute('/clientes'),
    checkFrontendRoute('/equipamentos'),
    checkFrontendRoute('/operacoes'),
    checkFrontendRoute('/documentos'),
    checkFrontendRoute('/budgets'),
    checkFrontendRoute('/financial'),
    checkFrontendRoute('/purchase-orders'),
    checkFrontendRoute('/operator/login'),
  ]);

  console.log(
    JSON.stringify({
      status: 'PASS',
      check: 'frontend_smoke',
      routes: [
        '/login',
        '/',
        '/clientes',
        '/equipamentos',
        '/operacoes',
        '/documentos',
        '/budgets',
        '/financial',
        '/purchase-orders',
        '/operator/login',
      ],
    }),
  );
}

main().catch((error) => {
  console.error(JSON.stringify({ status: 'FAIL', check: 'frontend_smoke', error: error.message }));
  process.exit(1);
});
