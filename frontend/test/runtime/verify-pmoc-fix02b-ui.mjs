import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('ORBIT_RUNTIME_VERIFY=true is required.');
const baseUrl = process.env.ORBIT_RUNTIME_FRONTEND ?? 'http://localhost:3000';
const credentials = JSON.parse(await readFile('/private/tmp/orbit-pmoc-fix02b-credentials.json', 'utf8'));
const evidence = JSON.parse(await readFile('/private/tmp/orbit-pmoc-fix02b-evidence.json', 'utf8'));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64');
const uploadA = '/private/tmp/orbit-pmoc-fix02b-upload-a.png';
const uploadB = '/private/tmp/orbit-pmoc-fix02b-upload-b.png';
await Promise.all([writeFile(uploadA, png), writeFile(uploadB, png)]);

const port = 9343;
const browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`, `--user-data-dir=/private/tmp/orbit-pmoc-fix02b-chrome-${Date.now()}`, '--window-size=1800,1400', 'about:blank'], { stdio: 'ignore' });
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
  const navigate = async (path) => { await command('Page.navigate', { url: `${baseUrl}${path}` }); await sleep(5000); return evaluate('document.body.innerText'); };
  const openEvidence = async (pmocId) => {
    await navigate(`/pmoc/${pmocId}`);
    await evaluate(`([...document.querySelectorAll('button')].find((button) => button.innerText.includes('Revisar evidências')))?.click()`);
    await sleep(5500);
    return evaluate('document.body.innerText');
  };
  await command('Page.enable'); await command('Runtime.enable'); await command('DOM.enable');
  await navigate('/login');
  await evaluate(`(() => { const inputs = document.querySelectorAll('input'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(inputs[0], ${JSON.stringify(credentials.owner.email)}); inputs[0].dispatchEvent(new Event('input', { bubbles: true })); setter.call(inputs[1], ${JSON.stringify(credentials.owner.password)}); inputs[1].dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await evaluate(`([...document.querySelectorAll('button')].find((button) => button.innerText.trim() === 'Entrar'))?.click()`);
  await sleep(5000);

  const scenario1Text = await openEvidence(evidence.scenario1.pmocPlanId);
  if (!scenario1Text.includes('Procedimento 1') || !scenario1Text.includes('Operator PMOC UX-02.1') || !scenario1Text.includes('Evidências fotográficas')) throw new Error(`Scenario 1 UI evidence is incomplete: ${scenario1Text.slice(0, 2400)}`);
  await screenshot('/private/tmp/orbit-pmoc-fix02b-scenario-1-operator.png');

  let scenario2Text = await openEvidence(evidence.scenario2.pmocPlanId);
  if (!scenario2Text.includes('Condensadora —') || !scenario2Text.includes('Registro complementar') || !scenario2Text.includes('Arraste imagens ou selecione vários arquivos')) throw new Error(`Scenario 2 UI evidence is incomplete: ${scenario2Text.slice(0, 2600)}`);
  await evaluate(`([...document.querySelectorAll('button')].find((button) => button.innerText.trim() === 'Editar legenda'))?.click()`);
  await sleep(400);
  await evaluate(`(() => { const input = [...document.querySelectorAll('input')].find((item) => item.placeholder === 'Legenda da evidência'); if (!input) return false; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, 'Condensadora — revisão visual'); input.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await evaluate(`([...document.querySelectorAll('button')].find((button) => button.innerText.trim() === 'Salvar'))?.click()`);
  await sleep(4500);
  scenario2Text = await evaluate('document.body.innerText');
  if (!scenario2Text.includes('Condensadora — revisão visual') || !scenario2Text.includes('Preview do documento')) throw new Error('Scenario 2 caption/preview refresh was not reflected in the Wizard.');

  const document = await command('DOM.getDocument', { depth: -1, pierce: true });
  const inputNode = await command('DOM.querySelector', { nodeId: document.root.nodeId, selector: 'input[type="file"][aria-label="Adicionar fotos"]' });
  if (!inputNode.nodeId) throw new Error('Official evidence uploader input was not found.');
  await command('DOM.setFileInputFiles', { nodeId: inputNode.nodeId, files: [uploadA, uploadB] });
  await evaluate(`document.querySelector('input[type="file"][aria-label="Adicionar fotos"]')?.dispatchEvent(new Event('change', { bubbles: true }))`);
  await sleep(1200);
  const pendingCount = await evaluate(`document.querySelectorAll('input[placeholder="Legenda opcional"]').length`);
  const pendingText = await evaluate('document.body.innerText');
  if (pendingCount !== 2 || !pendingText.includes('Enviar 2 foto(s)')) throw new Error(`Multiple-file preview was not prepared: count=${pendingCount} ${pendingText.slice(-1600)}`);
  await evaluate(`([...document.querySelectorAll('button')].find((button) => button.innerText.includes('Enviar 2 foto(s)')))?.click()`);
  let progressVisible = false;
  for (let attempt = 0; attempt < 30; attempt += 1) { const text = await evaluate('document.body.innerText'); if (text.includes('Enviando evidências')) { progressVisible = true; break; } await sleep(50); }
  await sleep(4500);
  scenario2Text = await evaluate('document.body.innerText');
  if (!scenario2Text.includes('2 evidência(s) adicionada(s)') || !progressVisible) throw new Error('Upload progress/completion was not visible.');
  await screenshot('/private/tmp/orbit-pmoc-fix02b-scenario-2-platform.png');

  const evidenceImages = await evaluate(`document.querySelectorAll('img[alt^="Condensadora"], img[alt="Painel elétrico"], img[alt="Ambiente técnico"], img[alt="Registro complementar"]').length`);
  if (evidenceImages < 4 || !scenario2Text.includes('Preview do documento')) throw new Error('Scenario 3 Wizard/Preview evidence did not remain visible after upload.');
  await screenshot('/private/tmp/orbit-pmoc-fix02b-scenario-3-document.png');

  const result = {
    scenario1OperatorMetadataVisible: true,
    scenario2CaptionEditingVisible: true,
    scenario2MultipleUploadVisible: true,
    scenario2UploadProgressVisible: progressVisible,
    scenario3OfficialPreviewVisible: true,
    responsiveGridClassesVerifiedByBuild: true,
    screenshots: ['/private/tmp/orbit-pmoc-fix02b-scenario-1-operator.png', '/private/tmp/orbit-pmoc-fix02b-scenario-2-platform.png', '/private/tmp/orbit-pmoc-fix02b-scenario-3-document.png'],
  };
  await writeFile('/private/tmp/orbit-pmoc-fix02b-ui-evidence.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { socket?.close(); browser.kill('SIGTERM'); }
