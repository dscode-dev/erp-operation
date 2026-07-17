import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('ORBIT_RUNTIME_VERIFY=true is required.');
const baseUrl = process.env.ORBIT_RUNTIME_FRONTEND ?? 'http://localhost:3000';
const credentials = JSON.parse(await readFile('/private/tmp/orbit-pmoc-fix02a-credentials.json', 'utf8'));
const evidence = JSON.parse(await readFile('/private/tmp/orbit-pmoc-fix02a-evidence.json', 'utf8'));
const apiBase = 'http://127.0.0.1:4000/api/v1';
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

async function api(path, token, init = {}) {
  const response = await fetch(`${apiBase}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init.headers ?? {}) } });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${JSON.stringify(body.error)}`);
  return body.data;
}
const auth = await api('/auth/login', '', { method: 'POST', headers: {}, body: JSON.stringify(credentials.owner) });
const signatures = await api('/signatures?page=1&limit=100&active=true', auth.accessToken);
const previousTechnical = signatures.items.find((item) => item.name === evidence.scenario3.previousTechnicalSignature);
const selectedTechnical = signatures.items.find((item) => item.name === evidence.scenario3.technicalSignature);
if (!previousTechnical || !selectedTechnical) throw new Error('Runtime signatures are unavailable.');

const port = 9342;
const browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`, `--user-data-dir=/private/tmp/orbit-pmoc-fix02a-chrome-${Date.now()}`, '--window-size=1800,1400', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  for (let attempt = 0; attempt < 40; attempt += 1) { try { await fetch(`http://127.0.0.1:${port}/json/version`); break; } catch { await sleep(250); } }
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(`${baseUrl}/login`)}`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0; const pending = new Map();
  socket.onmessage = (event) => { const message = JSON.parse(event.data); const callback = pending.get(message.id); if (!callback) return; pending.delete(message.id); if (message.error) callback.reject(new Error(message.error.message)); else callback.resolve(message.result); };
  const command = (method, params = {}) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params })); });
  const evaluate = async (expression) => (await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
  const screenshot = async (path) => { const shot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(path, Buffer.from(shot.data, 'base64')); };
  const navigate = async (path) => { await command('Page.navigate', { url: `${baseUrl}${path}` }); await sleep(4500); return evaluate('document.body.innerText'); };
  const openReview = async (pmocId) => {
    await navigate(`/pmoc/${pmocId}`);
    await evaluate(`([...document.querySelectorAll('button')].find((button) => button.innerText.includes('Revisar assinaturas')))?.click()`);
    await sleep(5000);
    return evaluate('document.body.innerText');
  };
  await command('Page.enable'); await command('Runtime.enable');
  await navigate('/login');
  await evaluate(`(() => { const inputs = document.querySelectorAll('input'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(inputs[0], ${JSON.stringify(credentials.owner.email)}); inputs[0].dispatchEvent(new Event('input', { bubbles: true })); setter.call(inputs[1], ${JSON.stringify(credentials.owner.password)}); inputs[1].dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await evaluate(`([...document.querySelectorAll('button')].find((button) => button.innerText.trim() === 'Entrar'))?.click()`);
  await sleep(5000);

  const scenario1Text = await openReview(evidence.scenario1.pmocPlanId);
  if (!scenario1Text.includes('Cliente cenário Operator') || !scenario1Text.includes('Operator PMOC UX-02.1 (Operator)') || !scenario1Text.includes(evidence.scenario1.technicalSignature)) throw new Error(`Scenario 1 UI evidence is incomplete: ${scenario1Text.slice(0, 2200)}`);
  await screenshot('/private/tmp/orbit-pmoc-fix02a-scenario-1-operator.png');

  await api(`/documents/${evidence.scenario2.documentId}/handoff/customer-signature`, auth.accessToken, { method: 'PATCH', body: JSON.stringify({ signerName: 'Cliente cenário Platform UI', signerRole: 'Gestor da unidade', signatureData: `data:image/png;base64,${png}`, collectedAt: '2026-07-17T17:05:00.000Z', timezone: 'America/Recife' }) });
  await api(`/documents/${evidence.scenario2.documentId}/handoff/technical-signature`, auth.accessToken, { method: 'PATCH', body: JSON.stringify({ signatureId: previousTechnical.id }) });
  await api(`/pmoc/${evidence.scenario2.pmocPlanId}`, auth.accessToken, { method: 'PATCH', body: JSON.stringify({ signatureOverrideId: previousTechnical.id }) });
  const scenario2Text = await openReview(evidence.scenario2.pmocPlanId);
  if (!scenario2Text.includes('Cliente cenário Platform UI') || !scenario2Text.includes('Owner PMOC UX-02.1 (Owner)') || !scenario2Text.includes('Substituir assinatura')) throw new Error(`Scenario 2 UI evidence is incomplete: ${scenario2Text.slice(0, 2200)}`);
  await screenshot('/private/tmp/orbit-pmoc-fix02a-scenario-2-platform.png');

  await api(`/documents/${evidence.scenario3.documentId}/handoff/customer-signature`, auth.accessToken, { method: 'PATCH', body: JSON.stringify({ signerName: 'Cliente substituído UI', signerRole: 'Diretoria', signatureData: `data:image/png;base64,${png}`, collectedAt: '2026-07-17T17:20:00.000Z', timezone: 'America/Recife' }) });
  await api(`/documents/${evidence.scenario3.documentId}/handoff/technical-signature`, auth.accessToken, { method: 'PATCH', body: JSON.stringify({ signatureId: selectedTechnical.id }) });
  await api(`/pmoc/${evidence.scenario3.pmocPlanId}`, auth.accessToken, { method: 'PATCH', body: JSON.stringify({ signatureOverrideId: selectedTechnical.id }) });
  const scenario3Text = await openReview(evidence.scenario3.pmocPlanId);
  if (!scenario3Text.includes('Cliente substituído UI') || !scenario3Text.includes(evidence.scenario3.technicalSignature) || scenario3Text.includes(evidence.scenario3.previousTechnicalSignature)) throw new Error(`Scenario 3 UI evidence is incomplete: ${scenario3Text.slice(0, 2200)}`);
  await screenshot('/private/tmp/orbit-pmoc-fix02a-scenario-3-replacement.png');

  const result = { scenario1OperatorVisible: true, scenario2PlatformCollectionVisible: true, scenario3ReplacementVisible: true, officialPreviewVisible: scenario3Text.includes('Preview do documento'), screenshots: ['/private/tmp/orbit-pmoc-fix02a-scenario-1-operator.png', '/private/tmp/orbit-pmoc-fix02a-scenario-2-platform.png', '/private/tmp/orbit-pmoc-fix02a-scenario-3-replacement.png'] };
  await writeFile('/private/tmp/orbit-pmoc-fix02a-ui-evidence.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { socket?.close(); browser.kill('SIGTERM'); }
