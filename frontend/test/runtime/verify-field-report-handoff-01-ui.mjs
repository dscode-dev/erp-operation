import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('ORBIT_RUNTIME_VERIFY=true is required.');
const baseUrl = process.env.ORBIT_RUNTIME_FRONTEND ?? 'http://127.0.0.1:3000';
const credentials = JSON.parse(await readFile('/private/tmp/orbit-field-report-handoff-01-credentials.json', 'utf8'));
const runtime = JSON.parse(await readFile('/private/tmp/orbit-field-report-handoff-01-evidence.json', 'utf8'));
async function login(input) {
  const response = await fetch('http://127.0.0.1:4000/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error('Runtime login failed.');
  return body.data;
}
const owner = await login(credentials.owner);
const operator = await login(credentials.operator);
const handoffResponse = await fetch(`http://127.0.0.1:4000/api/v1/documents/${runtime.documentId}/handoff`, { headers: { authorization: `Bearer ${owner.accessToken}` } });
const handoffBody = await handoffResponse.json();
if (!handoffResponse.ok || !handoffBody.success) throw new Error('Runtime handoff lookup failed.');
const documentNumber = handoffBody.data.number;
const port = 9344;
const browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`, `--user-data-dir=/private/tmp/orbit-field-handoff-chrome-${Date.now()}`, '--window-size=1800,1200', 'about:blank'], { stdio: 'ignore' });
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
  const activate = async (input, loginPath) => { await navigate(loginPath); await evaluate(`(() => { const inputs = document.querySelectorAll('input'); if (inputs.length < 2) throw new Error('Login fields are missing'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(inputs[0], ${JSON.stringify(input.email)}); inputs[0].dispatchEvent(new Event('input', { bubbles: true })); set.call(inputs[1], ${JSON.stringify(input.password)}); inputs[1].dispatchEvent(new Event('input', { bubbles: true })); const button = document.querySelector('button[type="submit"]'); setTimeout(() => button?.click(), 0); return true; })()`); await sleep(4500); };
  await command('Page.enable'); await command('Runtime.enable');

  await activate(credentials.owner, '/login');
  const reportsText = await navigate('/reports');
  if (!reportsText.includes('Relatórios recebidos')) throw new Error(`Platform inbox is not visible: ${reportsText.slice(0, 1800)}`);
  await evaluate(`(() => { const input = document.querySelector('input[placeholder="Número, cliente ou operador"]'); if (!input) throw new Error('Handoff search is missing'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(input, ${JSON.stringify(documentNumber)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(2200);
  const clicked = await evaluate(`(() => { const row = [...document.querySelectorAll('tbody tr')].find((item) => item.innerText.includes(${JSON.stringify(documentNumber)})); if (!row) return false; row.click(); return true; })()`);
  if (!clicked) { const filteredText = await evaluate('document.body.innerText'); await screenshot('/private/tmp/orbit-field-report-handoff-01-search-failure.png'); throw new Error(`Runtime report was not found after filtering for ${documentNumber}: ${filteredText.slice(0, 2600)}`); }
  await sleep(3500);
  const reviewText = await evaluate(`document.querySelector('[role="dialog"]')?.innerText ?? ''`);
  const reviewRequired = ['Dados coletados e complementação técnica', 'Evidências coletadas', 'Assinatura do cliente coletada', 'Responsável técnico', 'Preview e emissão oficial'];
  if (!reviewRequired.every((label) => reviewText.includes(label))) throw new Error(`Platform review drawer is incomplete: ${reviewText.slice(0, 2200)}`);
  if (!reviewText.includes('Cliente Runtime') || !reviewText.includes('Evidência OS')) throw new Error('Collected signature/evidence is not visible in review.');
  await screenshot('/private/tmp/orbit-field-report-handoff-01-platform-review.png');

  await navigate('/documentos');
  const repositoryText = await evaluate('document.body.innerText');
  if (!repositoryText.toLocaleUpperCase('pt-BR').includes('STATUS') || !repositoryText.toLocaleUpperCase('pt-BR').includes('VERSÃO')) throw new Error(`Document repository does not expose editorial status and revision/version columns: ${repositoryText.slice(0, 1800)}`);
  await screenshot('/private/tmp/orbit-field-report-handoff-01-repository.png');

  for (const action of ['accept', 'start']) {
    const response = await fetch(`http://127.0.0.1:4000/api/v1/assignments/${runtime.assignmentId}/${action}`, { method: 'PATCH', headers: { authorization: `Bearer ${operator.accessToken}`, 'content-type': 'application/json' }, body: '{}' });
    const body = await response.json();
    if ((!response.ok || !body.success) && response.status !== 409) throw new Error(`Could not ${action} runtime Assignment: ${JSON.stringify(body.error)}`);
  }
  await activate(credentials.operator, '/operator/login');
  const operatorText = await navigate(`/operator/services/${runtime.assignmentId}`);
  const operatorRequired = ['Preparar relatório para revisão', 'Tipo do relatório', 'Equipamentos envolvidos', 'Evidências', 'Assinatura do cliente', 'Salvar rascunho', 'Enviar para revisão'];
  const normalizedOperatorText = operatorText.toLocaleLowerCase('pt-BR');
  if (!operatorRequired.every((label) => normalizedOperatorText.includes(label.toLocaleLowerCase('pt-BR')))) throw new Error(`Operator collection flow is incomplete: ${operatorText.slice(0, 2400)}`);
  if (operatorText.includes('Renderizar documento') || operatorText.includes('Download PDF')) throw new Error('Operator exposes final emission actions.');
  const optionLabels = await evaluate(`[...document.querySelectorAll('select option')].map((option) => option.innerText)`);
  for (const label of ['Ordem de Serviço', 'Relatório de Visita Técnica', 'Laudo Técnico', 'Orçamento', 'PMOC']) if (!optionLabels.includes(label)) throw new Error(`Operator report type is missing: ${label}`);
  await screenshot('/private/tmp/orbit-field-report-handoff-01-operator.png');

  const result = { platformInboxVisible: true, prefilledReviewVisible: true, evidenceVisible: true, customerSignatureVisible: true, technicalSignatureVisible: true, officialViewerVisible: true, repositoryEditorialStateVisible: true, operatorCollectionVisible: true, operatorFinalEmissionAbsent: true, fiveOperatorTypesVisible: true, screenshots: ['/private/tmp/orbit-field-report-handoff-01-platform-review.png', '/private/tmp/orbit-field-report-handoff-01-repository.png', '/private/tmp/orbit-field-report-handoff-01-operator.png'] };
  await writeFile('/private/tmp/orbit-field-report-handoff-01-ui-evidence.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { socket?.close(); browser.kill('SIGTERM'); }
