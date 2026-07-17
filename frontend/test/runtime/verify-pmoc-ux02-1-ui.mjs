import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('ORBIT_RUNTIME_VERIFY=true is required.');
const baseUrl = process.env.ORBIT_RUNTIME_FRONTEND ?? 'http://127.0.0.1:3001';
const credentials = JSON.parse(await readFile('/private/tmp/orbit-pmoc-ux02-1-credentials.json', 'utf8'));
const evidence = JSON.parse(await readFile('/private/tmp/orbit-pmoc-ux02-1-evidence.json', 'utf8'));
async function login(input) {
  const response = await fetch('http://127.0.0.1:4000/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error('Runtime login failed.');
  return body.data;
}
const owner = await login(credentials.owner);
const operator = await login(credentials.operator);
const port = 9341;
const browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`, `--user-data-dir=/private/tmp/orbit-pmoc-ux021-chrome-${Date.now()}`, '--window-size=1800,1200', 'about:blank'], { stdio: 'ignore' });
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
  const activateSession = async (auth, scope, loginPath) => {
    await navigate(loginPath);
    await evaluate(`localStorage.setItem(${JSON.stringify(`erp.${scope}.accessToken`)}, ${JSON.stringify(auth.accessToken)}); localStorage.setItem(${JSON.stringify(`erp.${scope}.refreshToken`)}, ${JSON.stringify(auth.refreshToken)}); location.reload(); true`);
    await sleep(4000);
  };
  await command('Page.enable'); await command('Runtime.enable');
  await activateSession(owner, 'platform', '/login');

  await navigate(`/pmoc/${evidence.pmocPlanId}`);
  await evaluate(`([...document.querySelectorAll('button')].find((button) => button.innerText.trim() === 'Execuções'))?.click()`);
  await sleep(1800);
  const detailText = await evaluate('document.body.innerText');
  if (!detailText.includes('Assinado · 4/4 imagens')) throw new Error(`PMOC detail does not expose signed/image status: ${detailText.slice(0, 1800)}`);
  await evaluate(`document.querySelector('button[title="Preview, gerar e baixar PMOC"]')?.click()`);
  await sleep(4500);
  const documentText = await evaluate(`document.querySelector('[role="dialog"]')?.innerText ?? ''`);
  if (!['Atualizar preview', 'Renderizar documento atual', 'Download PDF'].every((label) => documentText.includes(label))) throw new Error('Official PMOC document actions are not visible.');
  if (!documentText.includes('ASSINADO') || !documentText.includes('4/4 imagens obrigatórias')) throw new Error('Document drawer status is incomplete.');
  await screenshot('/private/tmp/orbit-pmoc-ux02-1-document-drawer.png');

  await activateSession(operator, 'operator', '/operator/login');
  const operatorText = await navigate(`/operator/services/${evidence.assignmentId}`);
  await screenshot('/private/tmp/orbit-pmoc-ux02-1-operator.png');
  if (!operatorText.toLocaleLowerCase('pt-BR').includes('equipamentos cobertos') || !operatorText.includes('4/16 imagens')) throw new Error(`Operator did not receive PMOC equipment/evidence context: ${operatorText.slice(0, 1800)}`);
  if (operatorText.includes('Não foi possível consultar a política de assinatura')) throw new Error('Operator could not read the sanitized PMOC signature policy.');

  await activateSession(owner, 'platform', '/login'); await navigate('/pmoc');
  await evaluate(`([...document.querySelectorAll('button')].find((button) => button.innerText.includes('Novo PMOC')))?.click()`); await sleep(1800);
  await evaluate(`(() => { const select = document.querySelector('[role="dialog"] select'); if (!select || select.options.length < 2) throw new Error('Customer select missing'); const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; setter.call(select, select.options[1].value); select.dispatchEvent(new Event('change', { bubbles: true })); })()`); await sleep(1800);
  await evaluate(`([...document.querySelectorAll('[role="dialog"] button')].find((button) => button.innerText.includes('Continuar')))?.click()`); await sleep(1000);
  for (let group = 0; group < 2; group += 1) {
    await evaluate(`document.querySelectorAll('[role="dialog"] button[aria-haspopup="listbox"]')[${group}]?.click()`); await sleep(400);
    await evaluate(`document.querySelector('[role="dialog"] [role="listbox"] [role="option"]')?.click()`); await sleep(350);
    await evaluate(`document.querySelectorAll('[role="dialog"] button[aria-haspopup="listbox"]')[${group}]?.click()`); await sleep(250);
  }
  await evaluate(`([...document.querySelectorAll('[role="dialog"] button')].find((button) => button.innerText.includes('Continuar')))?.click()`); await sleep(500);
  await evaluate(`([...document.querySelectorAll('[role="dialog"] button')].find((button) => button.innerText.includes('Continuar')))?.click()`); await sleep(500);
  await evaluate(`(() => { const select = document.querySelector('[role="dialog"] select'); if (!select || select.options.length < 2) throw new Error('Technician select missing'); const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; setter.call(select, select.options[1].value); select.dispatchEvent(new Event('change', { bubbles: true })); })()`); await sleep(400);
  await evaluate(`([...document.querySelectorAll('[role="dialog"] button')].find((button) => button.innerText.includes('Continuar')))?.click()`); await sleep(2000);
  const wizardText = await evaluate(`document.querySelector('[role="dialog"]')?.innerText ?? ''`);
  const normalizedWizardText = wizardText.toLocaleLowerCase('pt-BR');
  if (!normalizedWizardText.includes('assinatura institucional') || !normalizedWizardText.includes('somente leitura') || !normalizedWizardText.includes('assinatura híbrida') || !normalizedWizardText.includes('alterar assinatura somente deste pmoc')) throw new Error(`HYBRID wizard policy is incomplete: ${wizardText.slice(0, 900)}`);
  if (normalizedWizardText.includes('assinatura desativada') || normalizedWizardText.includes('não é possível adicionar assinatura')) throw new Error('False disabled signature message remains visible.');
  await screenshot('/private/tmp/orbit-pmoc-ux02-1-wizard-signature.png');

  const result = { wizardHybridReadonlyVisible: true, falseDisabledMessageAbsent: true, multipleEquipmentOperationVisible: true, documentActionsVisible: true, signedStatusVisible: true, mandatoryImageStatusVisible: true, operatorFlowVisible: true, screenshots: ['/private/tmp/orbit-pmoc-ux02-1-wizard-signature.png', '/private/tmp/orbit-pmoc-ux02-1-document-drawer.png', '/private/tmp/orbit-pmoc-ux02-1-operator.png'] };
  await writeFile('/private/tmp/orbit-pmoc-ux02-1-ui-evidence.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { socket?.close(); browser.kill('SIGTERM'); }
