import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('ORBIT_RUNTIME_VERIFY=true is required.');
const baseUrl = process.env.ORBIT_RUNTIME_FRONTEND ?? 'http://localhost:3001';
const credentials = JSON.parse(await readFile('/private/tmp/orbit-runtime-06-1-credentials.json', 'utf8'));
const evidence = JSON.parse(await readFile('/private/tmp/orbit-dc02-evidence.json', 'utf8'));
const loginResponse = await fetch('http://127.0.0.1:4000/api/v1/auth/login', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials),
});
const loginBody = await loginResponse.json();
if (!loginResponse.ok || !loginBody.success) throw new Error('Runtime login failed.');
const port = 9336;
const browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`,
  `--user-data-dir=/private/tmp/orbit-dc02-chrome-${Date.now()}`, '--window-size=1800,1200', 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { await fetch(`http://127.0.0.1:${port}/json/version`); break; } catch { await sleep(250); }
  }
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(`${baseUrl}/login`)}`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0; const pending = new Map();
  socket.onmessage = (event) => { const message = JSON.parse(event.data); const callback = pending.get(message.id); if (!callback) return; pending.delete(message.id); if (message.error) callback.reject(new Error(message.error.message)); else callback.resolve(message.result); };
  const command = (method, params = {}) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params })); });
  const evaluate = async (expression) => (await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
  const screenshot = async (path) => { const result = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(path, Buffer.from(result.data, 'base64')); };
  await command('Page.enable'); await command('Runtime.enable');
  await sleep(2000);
  await evaluate(`(() => { localStorage.setItem('erp.platform.accessToken', ${JSON.stringify(loginBody.data.accessToken)}); localStorage.setItem('erp.platform.refreshToken', ${JSON.stringify(loginBody.data.refreshToken)}); location.href = '/reports'; })()`);
  await sleep(5000);
  await evaluate(`(() => { const input = [...document.querySelectorAll('input')].find((item) => item.placeholder?.includes('Buscar número')); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(input, ${JSON.stringify(evidence.documentNumber)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(4500);
  await screenshot('/private/tmp/orbit-dc02-report-center-debug.png');
  const found = await evaluate(`document.body.innerText.includes(${JSON.stringify(evidence.documentNumber)})`);
  if (!found) {
    const bodyText = await evaluate('document.body.innerText');
    throw new Error(`Rendered report is missing from the Central de Relatórios UI: ${bodyText.slice(0, 800)}`);
  }
  await evaluate(`([...document.querySelectorAll('tr')].find((row) => row.innerText.includes(${JSON.stringify(evidence.documentNumber)})))?.click()`);
  await sleep(3500);
  const viewerText = await evaluate("document.querySelector('[role=dialog]')?.innerText ?? ''");
  const pageCount = Number((viewerText.match(/Página\s+\d+\s+de\s+(\d+)/) ?? [])[1] ?? 0);
  const requiredText = ['Identificação do relatório', 'Cliente', 'Local da visita'];
  if (!requiredText.every((text) => viewerText.includes(text))) throw new Error('Official report preview did not render the identity sections.');
  await screenshot('/private/tmp/orbit-dc02-preview-page-1.png');
  const thumbnails = await evaluate("document.querySelectorAll('[role=dialog] aside')[0]?.querySelectorAll('button').length ?? 0");
  for (let page = 1; page < thumbnails; page += 1) {
    await evaluate(`document.querySelectorAll('[role=dialog] aside')[0]?.querySelectorAll('button')[${page}]?.click()`);
    await sleep(500);
    await screenshot(`/private/tmp/orbit-dc02-preview-page-${page + 1}.png`);
  }
  const result = {
    documentNumber: evidence.documentNumber,
    repositoryVisible: found,
    previewVisible: true,
    previewPageCount: pageCount,
    thumbnailCount: thumbnails,
    identitySectionsVisible: true,
  };
  await writeFile('/private/tmp/orbit-dc02-ui-evidence.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  socket?.close();
  browser.kill('SIGTERM');
}
