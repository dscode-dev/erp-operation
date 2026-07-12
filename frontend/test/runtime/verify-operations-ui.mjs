import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('ORBIT_RUNTIME_VERIFY=true is required.');

const credentials = JSON.parse(await readFile('/private/tmp/orbit-runtime-06-1-credentials.json', 'utf8'));
const operationEvidence = JSON.parse(await readFile('/private/tmp/orbit-runtime-06-1-evidence.json', 'utf8'));
const loginResponse = await fetch('http://127.0.0.1:4000/api/v1/auth/login', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials),
});
const loginBody = await loginResponse.json();
if (!loginResponse.ok || !loginBody.success) throw new Error('Runtime browser login failed.');

const port = 9333;
const browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`,
  `--user-data-dir=/private/tmp/orbit-chrome-${Date.now()}`, '--window-size=1600,1100', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForBrowser() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try { return await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(250); }
  }
  throw new Error('Chrome DevTools did not start.');
}

let socket;
try {
  await waitForBrowser();
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('http://localhost:3000/login')}`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const handler = pending.get(message.id);
    if (!handler) return;
    pending.delete(message.id);
    if (message.error) handler.reject(new Error(message.error.message)); else handler.resolve(message.result);
  };
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const screenshot = async (path) => {
    const result = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(path, Buffer.from(result.data, 'base64'));
  };

  await command('Page.enable'); await command('Runtime.enable');
  await command('Page.navigate', { url: 'http://localhost:3000/login' });
  await sleep(2500);
  await evaluate(`localStorage.setItem('erp.platform.accessToken', ${JSON.stringify(loginBody.data.accessToken)}); localStorage.setItem('erp.platform.refreshToken', ${JSON.stringify(loginBody.data.refreshToken)});`);
  await evaluate("location.href = '/operacoes'");
  await sleep(5000);
  const tableText = await evaluate('document.body.innerText');
  await screenshot('/private/tmp/orbit-operations-table-06-1.png');
  const firstRowText = await evaluate("document.querySelector('tbody tr')?.innerText ?? ''");
  await evaluate("document.querySelector('tbody tr')?.click()");
  await sleep(4500);
  const drawerText = await evaluate('document.body.innerText');
  const operationSignatureVisible = await evaluate("Boolean([...document.querySelectorAll('img')].find((img) => img.alt === 'Assinatura' && img.getBoundingClientRect().height > 0))");
  await screenshot('/private/tmp/orbit-operation-drawer-06-1.png');
  await evaluate("(() => { const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('OS-') && item.innerText.includes('Ordem de Serviço')); button?.scrollIntoView({ block: 'center' }); button?.click(); })()");
  await sleep(5000);
  const qrPreviewVisible = await evaluate("Boolean([...document.querySelectorAll('article img')].find((img) => img.alt === 'QR do equipamento' && img.getBoundingClientRect().height > 0))");
  await screenshot('/private/tmp/orbit-work-order-preview-qr-dc01-2.png');
  const nextViewerPage = "(() => { const label = [...document.querySelectorAll('span')].find((item) => /^Página \\d+ \\/ \\d+$/.test(item.innerText)); const group = label?.parentElement; group?.querySelectorAll('button')?.[1]?.click(); })()";
  const pageLabel = await evaluate("[...document.querySelectorAll('span')].find((item) => /^Página \\d+ \\/ \\d+$/.test(item.innerText))?.innerText ?? 'Página 1 / 1'");
  const totalPages = Number(pageLabel.split('/')[1]?.trim() ?? 1);
  for (let page = 1; page < totalPages; page += 1) { await evaluate(nextViewerPage); await sleep(400); }
  const previewText = await evaluate('document.body.innerText');
  const institutionalSignatureVisible = await evaluate("document.body.innerText.includes('Responsável Técnico Runtime') && document.body.innerText.includes('CREA-PE 123456') && Boolean([...document.querySelectorAll('article img')].find((img) => img.alt === 'Responsável técnico' && img.getBoundingClientRect().height > 0))");
  const executionSignatureVisible = await evaluate("Boolean([...document.querySelectorAll('article img')].find((img) => img.alt === 'Assinatura do cliente/responsável' && img.getBoundingClientRect().height > 0))");
  const previewSignatureVisible = institutionalSignatureVisible && executionSignatureVisible;
  const viewerDebug = await evaluate("({ pageLabels: [...document.querySelectorAll('span')].map((item) => item.innerText).filter((text) => text?.startsWith('Página ')), chevrons: document.querySelectorAll('svg.lucide-chevron-right').length, articleImages: [...document.querySelectorAll('article img')].map((img) => ({ alt: img.alt, height: img.getBoundingClientRect().height })) })");
  await screenshot('/private/tmp/orbit-work-order-preview-signatures-dc01-2.png');

  const expectedScheduled = '15/07 · 10:30';
  const result = {
    route: '/operacoes',
    operationShortId: operationEvidence.operationShortId,
    apiCreatedAt: operationEvidence.createdAt,
    apiScheduledFor: operationEvidence.scheduledFor,
    tableHeadersVisible: tableText.includes('CRIADO') && tableText.includes('DATA DO AGENDAMENTO'),
    ambiguousDataHeaderAbsent: !tableText.split('\n').includes('DATA'),
    scheduledValueVisibleInRow: firstRowText.includes(expectedScheduled),
    tableRowText: firstRowText,
    drawerDatesSectionVisible: drawerText.toLowerCase().includes('datas') && drawerText.toLowerCase().includes('criado em'),
    drawerScheduledVisible: drawerText.toLowerCase().includes('agendado para') && drawerText.includes(expectedScheduled),
    operationSignatureVisible,
    realPreviewLabelVisible: previewText.includes('Pré-visualização com dados reais da operação.'),
    workOrderPreviewVisible: previewText.includes('Ordem de Serviço'),
    previewSignatureVisible,
    qrPreviewVisible,
    institutionalSignatureVisible,
    executionSignatureVisible,
    viewerDebug,
  };
  await writeFile('/private/tmp/orbit-runtime-ui-06-1-evidence.json', JSON.stringify(result, null, 2));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  socket?.close();
  browser.kill('SIGTERM');
}
