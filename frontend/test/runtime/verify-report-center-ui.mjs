import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('ORBIT_RUNTIME_VERIFY=true is required.');
const baseUrl = process.env.ORBIT_RUNTIME_FRONTEND ?? 'http://127.0.0.1:3001';
const credentials = JSON.parse(await readFile('/private/tmp/orbit-runtime-06-1-credentials.json', 'utf8'));
const login = await fetch('http://127.0.0.1:4000/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials) });
const body = await login.json();
if (!login.ok || !body.success) throw new Error('Runtime login failed.');

const port = 9334;
const browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`,
  `--user-data-dir=/private/tmp/orbit-report-center-chrome-${Date.now()}`, '--window-size=1600,1100', 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  for (let attempt = 0; attempt < 30; attempt += 1) { try { await fetch(`http://127.0.0.1:${port}/json/version`); break; } catch { await sleep(250); } }
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(`${baseUrl}/login`)}`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0; const pending = new Map();
  socket.onmessage = (event) => { const message = JSON.parse(event.data); const callback = pending.get(message.id); if (!callback) return; pending.delete(message.id); if (message.error) callback.reject(new Error(message.error.message)); else callback.resolve(message.result); };
  const command = (method, params = {}) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params })); });
  const evaluate = async (expression) => (await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
  const navigate = async (path) => { await command('Page.navigate', { url: `${baseUrl}${path}` }); await sleep(3500); return evaluate('document.body.innerText'); };
  const screenshot = async (path) => { const result = await command('Page.captureScreenshot', { format: 'png' }); await writeFile(path, Buffer.from(result.data, 'base64')); };
  await command('Page.enable'); await command('Runtime.enable');
  await navigate('/login');
  await evaluate(`(() => { const inputs = document.querySelectorAll('input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(inputs[0], ${JSON.stringify(credentials.email)}); inputs[0].dispatchEvent(new Event('input', { bubbles: true })); set.call(inputs[1], ${JSON.stringify(credentials.password)}); inputs[1].dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('button[type=submit]').click(); })()`);
  await sleep(5000); await command('Page.navigate', { url: `${baseUrl}/reports` }); await sleep(5000);
  const center = await evaluate('document.body.innerText'); await screenshot('/private/tmp/orbit-report-center.png');
  const menu = await evaluate("document.querySelector('aside')?.innerText ?? ''");
  await evaluate("[...document.querySelectorAll('button')].find((button) => button.innerText.includes('Iniciar'))?.click()"); await sleep(1800);
  const workflow = await evaluate("document.querySelector('[role=dialog]')?.innerText ?? ''");
  const templates = await navigate('/report-templates'); await screenshot('/private/tmp/orbit-report-templates.png');
  await navigate('/settings');
  const settingsMain = await evaluate("document.querySelector('main')?.innerText ?? ''");
  const result = {
    reportCenterVisible: center.includes('Central de Relatórios'),
    fiveWorkflowCardsVisible: ['Ordem de Serviço', 'Relatório de Visita Técnica', 'Laudo Técnico', 'PMOC', 'Recibo'].every((label) => center.includes(label)),
    workflowWizardVisible: workflow.toLowerCase().includes('workflow documental') && workflow.includes('Operation oficial') && workflow.includes('Preview'),
    menuReorganized: menu.includes('Modelos de Relatórios') && menu.includes('Central de Relatórios') && menu.includes('Financeiro') && menu.includes('Documentos'),
    templatesOnly: templates.includes('Modelos de Documentos') && !templates.includes('Dados reais'),
    settingsDocumentSectionRemoved: !settingsMain.includes('Modelos de documento') && !settingsMain.includes('Configuração real consumida de /documents/configuration'),
  };
  if (Object.values(result).some((value) => value !== true)) throw new Error(`UI verification failed: ${JSON.stringify(result)}`);
  await writeFile('/private/tmp/orbit-report-center-ui-evidence.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { socket?.close(); browser.kill('SIGTERM'); }
