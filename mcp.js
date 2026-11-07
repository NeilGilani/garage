#!/usr/bin/env node
// Garage's bridge into Otto's toolbox, spoken as MCP over stdio:
// ask_owner pops a question up in the app and waits, as long as it takes, for the owner's answer;
// look_at_site screenshots the site in a headless browser so Otto can see what he built.
import readline from 'node:readline';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const { GARAGE_URL = 'http://127.0.0.1:4777', GARAGE_SLUG, GARAGE_DIR = process.cwd() } = process.env;

const VIEWS = {
  desktop: { size: '1440,1800', scale: 1, note: 'Desktop, 1440px wide, the first 1800px of the page.' },
  mobile: { size: '390,1500', scale: 2, note: 'Phone, 390px wide, the first 1500px of the page.' },
  overview: { size: '1440,7000', scale: 0.3, note: 'The whole page at desktop width, shrunk to judge rhythm, not detail. Blank space at the bottom is past the end of the page.' },
};

function findChrome() {
  const candidates = [
    process.env.GARAGE_CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  return candidates.find(p => p && fs.existsSync(p)) || null;
}

async function lookAtSite({ view = 'desktop', page = 'site/index.html', anchor = '' } = {}) {
  const v = VIEWS[view] || VIEWS.desktop;
  const file = path.resolve(GARAGE_DIR, page);
  if (!file.startsWith(path.resolve(GARAGE_DIR) + path.sep) || !fs.existsSync(file)) {
    return [{ type: 'text', text: `There's no ${page} to look at yet.` }];
  }
  const chrome = findChrome();
  if (!chrome) return [{ type: 'text', text: 'No Chrome, Edge or Chromium is installed, so I can\'t take a screenshot. Review the HTML carefully instead.' }];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'garage-look-'));
  const out = path.join(tmp, 'shot.png');
  const url = pathToFileURL(file).href + (anchor ? `#${encodeURIComponent(String(anchor).replace(/^#/, ''))}` : '');
  // A throwaway profile keeps the owner's own browser, cookies and extensions out of it.
  const args = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', `--user-data-dir=${path.join(tmp, 'profile')}`, `--window-size=${v.size}`,
    `--force-device-scale-factor=${v.scale}`, '--virtual-time-budget=5000', `--screenshot=${out}`, url];
  try {
    await new Promise((resolve, reject) => {
      const p = spawn(chrome, args, { stdio: 'ignore' });
      const t = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('the browser took too long')); }, 45000);
      p.on('error', reject);
      p.on('close', () => { clearTimeout(t); resolve(); });
    });
    if (!fs.existsSync(out)) throw new Error('no screenshot was produced');
    const data = fs.readFileSync(out);
    const shots = path.join(GARAGE_DIR, '.garage', 'shots');
    fs.mkdirSync(shots, { recursive: true });
    fs.writeFileSync(path.join(shots, `${view}.png`), data);
    return [
      { type: 'image', data: data.toString('base64'), mimeType: 'image/png' },
      { type: 'text', text: `${v.note}${anchor ? ` Scrolled to #${anchor}.` : ''} Judge it against the checklist in your site craft notes, then fix the biggest problems.` },
    ];
  } catch (e) {
    return [{ type: 'text', text: `Couldn't take a screenshot (${e.message}). Review the HTML carefully instead.` }];
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const TOOLS = [{
  name: 'ask_owner',
  description: 'Ask the business owner a question and wait for their answer. It pops up live in their workspace. ' +
    'Use it for decisions that are genuinely theirs (name direction, price, audience, tone, which of two paths). ' +
    'Give 2 to 4 short, concrete options; they can also type their own answer. Blocks until they answer.',
  inputSchema: {
    type: 'object',
    properties: {
      question: { type: 'string', description: 'One clear question, under 140 characters.' },
      options: { type: 'array', items: { type: 'string' }, maxItems: 4, description: '2 to 4 short answer choices.' },
      why: { type: 'string', description: 'One short sentence on why you are asking.' },
    },
    required: ['question'],
  },
}, {
  name: 'look_at_site',
  description: 'Take a screenshot of the website (or the deck, or a post card) in a real browser and see it. ' +
    'Use it after building or changing the site: desktop, then mobile, then overview for the whole page\'s rhythm. ' +
    'Pass an anchor (a section id) to look further down the page.',
  inputSchema: {
    type: 'object',
    properties: {
      view: { type: 'string', enum: ['desktop', 'mobile', 'overview'], description: 'Which view to capture. Default desktop.' },
      page: { type: 'string', description: 'Workspace-relative HTML file. Default site/index.html.' },
      anchor: { type: 'string', description: 'Optional element id to scroll to before the screenshot.' },
    },
  },
}];

function post(pathname, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(new URL(pathname, GARAGE_URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) },
    }, res => {
      let s = '';
      res.setEncoding('utf8');
      res.on('data', c => { s += c; });
      res.on('end', () => { try { resolve(JSON.parse(s)); } catch { reject(new Error(s || 'Bad response')); } });
    });
    req.on('error', reject);
    req.end(data);
  });
}

const send = msg => process.stdout.write(JSON.stringify(msg) + '\n');

async function call(name, args) {
  if (name === 'look_at_site') return lookAtSite(args);
  if (name !== 'ask_owner') throw new Error(`Unknown tool ${name}`);
  const { answer } = await post(`/api/b/${GARAGE_SLUG}/ask`, args || {});
  return answer == null
    ? 'The owner did not answer (they may have stopped the run or stepped away). Make a reasonable call yourself and say what you chose.'
    : `The owner answered: ${answer}`;
}

readline.createInterface({ input: process.stdin }).on('line', async line => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  const { id, method, params } = msg;
  if (id === undefined) return; // notifications
  try {
    if (method === 'initialize') {
      send({ jsonrpc: '2.0', id, result: { protocolVersion: params?.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'garage', version: '0.1.0' } } });
    } else if (method === 'tools/list') {
      send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    } else if (method === 'tools/call') {
      const out = await call(params.name, params.arguments);
      send({ jsonrpc: '2.0', id, result: { content: typeof out === 'string' ? [{ type: 'text', text: out }] : out } });
    } else {
      send({ jsonrpc: '2.0', id, result: {} });
    }
  } catch (e) {
    send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Couldn't reach the owner: ${e.message}` }], isError: true } });
  }
});
