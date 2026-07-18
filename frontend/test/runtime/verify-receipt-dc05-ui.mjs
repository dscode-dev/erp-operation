import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const credentials = JSON.parse(await readFile(process.env.ORBIT_RUNTIME_CREDENTIALS, 'utf8'));
const frontend = process.env.ORBIT_RUNTIME_FRONTEND ?? 'http://127.0.0.1:3000';
const login = await fetch('http://127.0.0.1:4000/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials) });
const auth = await login.json();
if (!login.ok || !auth.success) throw new Error('UI runtime login failed.');
const browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--disable-web-security', '--no-sandbox', '--remote-debugging-port=9341',
  `--user-data-dir=/private/tmp/orbit-dc05-chrome-${Date.now()}`, '--window-size=1600,1100', 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  for (let attempt = 0; attempt < 40; attempt += 1) { try { await fetch('http://127.0.0.1:9341/json/version'); break; } catch { await sleep(250); } }
  const target = await (await fetch(`http://127.0.0.1:9341/json/new?${encodeURIComponent(`${frontend}/login`)}`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0; const pending = new Map();
  socket.onmessage = (event) => { const data = JSON.parse(event.data); const callback = pending.get(data.id); if (!callback) return; pending.delete(data.id); if (data.error) callback.reject(new Error(data.error.message)); else callback.resolve(data.result); };
  const command = (method, params = {}) => new Promise((resolve, reject) => { const current = ++id; pending.set(current, { resolve, reject }); socket.send(JSON.stringify({ id: current, method, params })); });
  const evaluate = async (expression) => (await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
  await command('Page.enable'); await command('Runtime.enable');
  await command('Page.navigate', { url: `${frontend}/login` }); await sleep(2500);
  await evaluate(`localStorage.setItem('erp.platform.accessToken', ${JSON.stringify(auth.data.accessToken)}); localStorage.setItem('erp.platform.refreshToken', ${JSON.stringify(auth.data.refreshToken)});`);
  await command('Page.navigate', { url: `${frontend}/reports` }); await sleep(4500);
  const before = await evaluate(`({ url: location.href, body: document.body.innerText.slice(0, 1200), buttons: [...document.querySelectorAll('button')].map((item) => item.innerText).filter(Boolean).slice(0, 30) })`);
  await evaluate(`[...document.querySelectorAll('button')].find((item) => item.innerText.includes('Recibo') && item.innerText.includes('Iniciar'))?.click()`); await sleep(1200);
  const origin = await evaluate("document.querySelector('[role=dialog]')?.innerText ?? ''");
  await evaluate(`[...document.querySelectorAll('[role=dialog] button')].find((item) => item.innerText.includes('Preenchimento manual'))?.click()`); await sleep(400);
  await evaluate(`[...document.querySelectorAll('[role=dialog] button')].find((item) => item.innerText.trim() === 'Continuar')?.click()`); await sleep(700);
  const dataStep = await evaluate("document.querySelector('[role=dialog]')?.innerText ?? ''");
  const result = {
    receiptAvailable: origin.includes('Recibo') || origin.includes('RECIBO'),
    manualOrigin: origin.includes('Preenchimento manual'),
    workOrderOrigin: origin.includes('A partir de Ordem de Serviço'),
    fiveSteps: ['Origem', 'Dados do recibo', 'Garantia', 'Assinatura técnica', 'Preview'].every((label) => origin.includes(label)),
    editableDataStep: ['Número', 'Data', 'Cliente', 'Endereço', 'Valor', 'Valor por extenso', 'Serviço', 'Descrição', 'Texto da declaração'].every((label) => dataStep.includes(label)),
    noCustomerSignature: !origin.includes('Assinatura do cliente'),
  };
  if (Object.values(result).some((value) => value !== true)) throw new Error(`DC-05 UI failed: ${JSON.stringify({ result, before })}`);
  await writeFile('/private/tmp/orbit-dc05-ui-evidence.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { socket?.close(); browser.kill('SIGTERM'); }
