const SAFE_HOSTS = ['127.0.0.1', 'localhost', '::1'];

function assertSafeBaseUrl(baseUrl) {
  const url = new URL(baseUrl);
  const host = url.hostname.toLowerCase();
  const productionLike = !SAFE_HOSTS.includes(host) && !host.includes('staging') && !host.includes('dev') && !host.includes('local');
  if (productionLike && process.env.ORBIT_PERF_ALLOW_PRODUCTION !== 'true') {
    throw new Error(`Refusing to run performance scenarios against production-like host "${host}"`);
  }
}

const BASE_URL = (process.env.ORBIT_PERF_BASE_URL ?? 'http://127.0.0.1:3001/api/v1').replace(/\/$/, '');
const SCENARIO = process.env.ORBIT_PERF_SCENARIO ?? 'dashboard';
const VUS = Number(process.env.ORBIT_PERF_VUS ?? '2');
const DURATION_SECONDS = Number(process.env.ORBIT_PERF_DURATION_SECONDS ?? '10');
const EMAIL = process.env.ORBIT_PERF_EMAIL ?? 'perf.owner@orbit.local';
const PASSWORD = process.env.ORBIT_PERF_PASSWORD ?? 'PerfPassword!2026';

assertSafeBaseUrl(BASE_URL);

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function timed(metrics, label, fn) {
  const started = performance.now();
  try {
    const result = await fn();
    const durationMs = performance.now() - started;
    metrics.push({ label, durationMs, ok: true });
    return result;
  } catch (error) {
    const durationMs = performance.now() - started;
    metrics.push({ label, durationMs, ok: false, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function request(token, method, path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Request-Id': `perf-${crypto.randomUUID()}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`${method} ${path} ${response.status} ${JSON.stringify(parsed?.error ?? parsed).slice(0, 240)}`);
  }
  return parsed?.data ?? parsed;
}

async function login(email = EMAIL, password = PASSWORD) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Request-Id': `perf-login-${crypto.randomUUID()}` },
    body: JSON.stringify({ email, password }),
  });
  const parsed = await response.json();
  if (!response.ok) throw new Error(`login failed ${response.status} ${JSON.stringify(parsed)}`);
  return parsed.data.accessToken;
}

async function pickFirst(token, path) {
  const data = await request(token, 'GET', path);
  return data.items?.[0] ?? null;
}

async function pickRandom(token, path) {
  const data = await request(token, 'GET', path);
  const items = data.items ?? [];
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

async function dashboard(token, metrics) {
  const endpoints = [
    '/assignments?limit=50',
    '/assignments?status=ASSIGNED&limit=1',
    '/assignments?status=ACCEPTED&limit=1',
    '/assignments?status=STARTED&limit=1',
    '/assignments?status=COMPLETED&limit=1',
    '/assignments?status=REJECTED&limit=1',
    '/operations/stats',
    '/asset-lifecycle?limit=8',
    '/inventory/stats',
    '/inventory/movements?limit=5',
    '/maintenance-plans/stats',
    '/maintenance-plans?active=true&limit=5',
    '/pmoc/stats',
    '/pmoc?active=true&limit=5',
    '/financial/stats',
    '/purchase-orders/stats',
    '/purchase-orders?status=SENT&limit=5',
  ];
  await Promise.all(endpoints.map((path) => timed(metrics, `GET ${path}`, () => request(token, 'GET', path))));
}

async function operationsDispatch(token, metrics) {
  const assignment = await timed(metrics, 'GET /assignments/my', () => pickFirst(token, '/assignments/my?limit=1'));
  await timed(metrics, 'GET /assignments', () => request(token, 'GET', '/assignments?limit=20'));
  if (assignment?.id) {
    await timed(metrics, 'GET /assignments/:id', () => request(token, 'GET', `/assignments/${assignment.id}`));
  }
}

async function inventoryConsumption(token, metrics) {
  const inventory = await timed(metrics, 'GET /inventory', () => pickRandom(token, '/inventory?limit=20'));
  const operation = await timed(metrics, 'GET /operations', () => pickRandom(token, '/operations?limit=20'));
  await timed(metrics, 'GET /inventory/movements', () => request(token, 'GET', '/inventory/movements?limit=20'));
  if (inventory?.id && inventory?.product?.id && operation?.id) {
    await timed(metrics, 'POST /operations/:id/materials', () =>
      request(token, 'POST', `/operations/${operation.id}/materials`, {
        productId: inventory.product.id,
        inventoryItemId: inventory.id,
        quantity: 0.001,
        notes: 'Performance consumption',
      }),
    );
  }
}

async function procurementReceipt(token, metrics) {
  const supplier = await timed(metrics, 'GET /suppliers', () => pickFirst(token, '/suppliers?active=true&limit=1'));
  const product = await timed(metrics, 'GET /products', () => pickRandom(token, '/products?active=true&limit=20'));
  if (!supplier?.id || !product?.id) {
    await timed(metrics, 'GET /purchase-orders fallback', () => request(token, 'GET', '/purchase-orders?limit=20'));
    return;
  }
  const order = await timed(metrics, 'POST /purchase-orders', () =>
    request(token, 'POST', '/purchase-orders', {
      supplierId: supplier.id,
      notes: 'Performance purchase order',
    }),
  );
  if (!order?.id) return;
  const item = await timed(metrics, 'POST /purchase-orders/:id/items', () =>
    request(token, 'POST', `/purchase-orders/${order.id}/items`, {
      productId: product.id,
      quantity: 0.001,
      unit: product.unit ?? 'un',
      snapshotCost: 1,
      snapshotDescription: product.name ?? 'Performance item',
    }),
  );
  await timed(metrics, 'PATCH /purchase-orders/:id/send', () => request(token, 'PATCH', `/purchase-orders/${order.id}/send`, {}));
  if (item?.id) {
    await timed(metrics, 'POST /purchase-orders/:id/receipts', () =>
      request(token, 'POST', `/purchase-orders/${order.id}/receipts`, {
        notes: 'Performance receipt',
        items: [{ itemId: item.id, quantity: 0.001 }],
      }),
    );
  }
}

async function financialSettlement(token, metrics) {
  const account = await timed(metrics, 'GET /financial/accounts', () => pickFirst(token, '/financial/accounts?active=true&limit=1'));
  const category = await timed(metrics, 'GET /financial/categories', () => pickFirst(token, '/financial/categories?type=INCOME&active=true&limit=1'));
  await timed(metrics, 'GET /financial/stats', () => request(token, 'GET', '/financial/stats'));
  if (!account?.id || !category?.id) return;
  const entry = await timed(metrics, 'POST /financial/entries', () =>
    request(token, 'POST', '/financial/entries', {
      accountId: account.id,
      categoryId: category.id,
      type: 'RECEIVABLE',
      origin: 'MANUAL',
      amount: 1,
      dueDate: new Date().toISOString(),
      description: 'Performance settlement',
    }),
  );
  if (entry?.id) {
    await timed(metrics, 'PATCH /financial/entries/:id/pay', () =>
      request(token, 'PATCH', `/financial/entries/${entry.id}/pay`, { notes: 'Performance settlement' }),
    );
  }
}

async function budgetLifecycle(token, metrics) {
  const budget = await timed(metrics, 'GET /budgets', () => pickFirst(token, '/budgets?limit=1'));
  await timed(metrics, 'GET /budgets/stats', () => request(token, 'GET', '/budgets/stats'));
  if (budget?.id) {
    await timed(metrics, 'GET /budgets/:id', () => request(token, 'GET', `/budgets/${budget.id}`));
  }
}

async function documentEngine(token, metrics) {
  const template = await timed(metrics, 'GET /organization/templates', () => pickFirst(token, '/organization/templates?limit=1'));
  const operation = await timed(metrics, 'GET /operations', () => pickRandom(token, '/operations?limit=100'));
  if (template?.id) {
    await timed(metrics, 'GET /documents/templates/:id/preview', () => request(token, 'GET', `/documents/templates/${template.id}/preview`));
  }
  if (operation?.id) {
    await timed(metrics, 'GET /documents/operations/:id/preview', () => request(token, 'GET', `/documents/operations/${operation.id}/WORK_ORDER/preview`));
    const rendered = await timed(metrics, 'POST /documents/operations/:id/render', () => request(token, 'POST', `/documents/operations/${operation.id}/WORK_ORDER/render`, {}));
    if (rendered?.id) {
      await timed(metrics, 'GET /documents/:id/download', () => request(token, 'GET', `/documents/${rendered.id}/download`));
    }
  }
}

async function operatorRead(_ownerToken, metrics, context) {
  const token = context.operatorToken;
  const assignment = await timed(metrics, 'GET /assignments/my', () => pickFirst(token, '/assignments/my?limit=1'));
  await timed(metrics, 'GET /equipments', () => request(token, 'GET', '/equipments?limit=20'));
  if (assignment?.operation?.equipment?.id) {
    await timed(metrics, 'GET /equipments/:id/lifecycle', () => request(token, 'GET', `/equipments/${assignment.operation.equipment.id}/lifecycle?limit=10`));
  }
}

const scenarios = {
  dashboard,
  'operations-dispatch': operationsDispatch,
  'inventory-consumption': inventoryConsumption,
  'procurement-receipt': procurementReceipt,
  'financial-settlement': financialSettlement,
  'budget-lifecycle': budgetLifecycle,
  'document-engine': documentEngine,
  'operator-read': operatorRead,
};

async function runScenario(name) {
  const token = await login();
  const context = {
    ownerToken: token,
    operatorToken: name === 'operator-read' ? await login('perf.operator@orbit.local', PASSWORD) : null,
  };
  const metrics = [];
  const deadline = Date.now() + DURATION_SECONDS * 1000;
  let iterations = 0;
  const workers = Array.from({ length: VUS }, async () => {
    while (Date.now() < deadline) {
      await scenarios[name](token, metrics, context);
      iterations += 1;
      await sleep(50);
    }
  });
  await Promise.all(workers);
  const durations = metrics.map((item) => item.durationMs);
  const failures = metrics.filter((item) => !item.ok);
  const byLabel = new Map();
  for (const item of metrics) {
    const group = byLabel.get(item.label) ?? [];
    group.push(item.durationMs);
    byLabel.set(item.label, group);
  }
  const slowest = [...byLabel.entries()]
    .map(([label, values]) => ({ label, p95: percentile(values, 95), count: values.length }))
    .sort((a, b) => b.p95 - a.p95)[0] ?? null;

  return {
    scenario: name,
    vus: VUS,
    durationSeconds: DURATION_SECONDS,
    iterations,
    requests: metrics.length,
    p50: Number(percentile(durations, 50).toFixed(2)),
    p95: Number(percentile(durations, 95).toFixed(2)),
    p99: Number(percentile(durations, 99).toFixed(2)),
    errorRate: metrics.length ? Number((failures.length / metrics.length).toFixed(4)) : 0,
    slowest,
    sampleErrors: failures.slice(0, 3),
  };
}

const selected = SCENARIO === 'all' ? Object.keys(scenarios) : [SCENARIO];
for (const name of selected) {
  if (!scenarios[name]) throw new Error(`Unknown scenario ${name}`);
  const summary = await runScenario(name);
  console.log(JSON.stringify(summary));
}
