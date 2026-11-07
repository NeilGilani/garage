#!/usr/bin/env node
// Garage: a free, open-source AI employee that builds and runs a business, on your own machine.
// Otto's brain is the owner's own Claude Code CLI, run headless with whatever it's signed in with.
// There's no Garage server and no credits.
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = dataDir();
const PUBLIC = path.join(ROOT, 'public');
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 4777);
const CLAUDE = process.env.CLAUDE_BIN || 'claude';
const SYSTEM = ['otto.md', 'site-craft.md'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n\n');
const TOOLS = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebSearch', 'WebFetch'];
const GARAGE_TOOLS = ['mcp__garage__ask_owner', 'mcp__garage__look_at_site'];
const POWER = {
  quick: { model: 'sonnet', effort: 'low' },
  standard: { model: 'sonnet', effort: 'medium' },
  max: { model: 'opus', effort: 'high' },
};
const DEFAULT_SETTINGS = { questions: 'ask', budget: 3, power: 'standard' };
// In headless mode Claude Code bills an ANTHROPIC_API_KEY whenever one is set, otherwise it uses the owner's plan.
const AUTH = process.env.ANTHROPIC_API_KEY ? 'api-key' : 'plan';
const NICE = {
  'site/index.html': 'the website', 'brand.json': 'the brand', 'logo.svg': 'the logo', 'plan.json': 'the plan',
  'posts.json': 'launch posts', 'outreach.json': 'outreach emails', 'research.md': 'the research report',
  'deck.html': 'the deck', 'sheet.csv': 'the numbers', 'design.md': 'the art direction',
};
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2',
};

fs.mkdirSync(DATA, { recursive: true });

function dataDir() {
  if (process.env.GARAGE_DATA) return path.resolve(process.env.GARAGE_DATA);
  const home = path.join(os.homedir(), 'Garage');
  // Disks are often case-insensitive, so ~/Garage can be this very checkout (cloned to ~/garage). Keep businesses out of the code.
  try {
    const a = fs.statSync(home), b = fs.statSync(ROOT);
    if (a.ino === b.ino && a.dev === b.dev) return path.join(ROOT, 'businesses');
  } catch { /* ~/Garage doesn't exist yet */ }
  return home;
}

if (spawnSync(CLAUDE, ['--version'], { encoding: 'utf8' }).status !== 0) {
  console.error(`\n  Garage needs Claude Code, Otto's brain, and couldn't find \`${CLAUDE}\`.\n  Install it (https://docs.claude.com/en/docs/claude-code/setup), sign in once by running \`claude\`, then start Garage again.\n`);
  process.exit(1);
}

// ---------- workspace helpers ----------

const bdir = slug => path.join(DATA, slug);
const gdir = slug => path.join(DATA, slug, '.garage');
const exists = f => fs.existsSync(f);
const isBusiness = slug => /^[a-z0-9-]{1,64}$/.test(slug) && exists(path.join(gdir(slug), 'business.json'));

function readJSON(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJSON(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

const meta = slug => readJSON(path.join(gdir(slug), 'business.json'));
const saveMeta = (slug, m) => writeJSON(path.join(gdir(slug), 'business.json'), m);

function rel(slug, file) {
  if (!file) return null;
  const r = path.relative(bdir(slug), path.resolve(bdir(slug), file));
  return r.startsWith('..') ? file : r.split(path.sep).join('/');
}

function listFiles(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(full, base, out);
    else out.push({ path: path.relative(base, full).split(path.sep).join('/'), size: fs.statSync(full).size });
    if (out.length > 300) break;
  }
  return out;
}

function workspace(slug) {
  const d = bdir(slug);
  const json = f => {
    const t = readText(path.join(d, f));
    if (t == null) return null;
    try { return JSON.parse(t); } catch { return { _invalid: true }; }
  };
  return {
    brand: json('brand.json'),
    plan: json('plan.json'),
    posts: json('posts.json'),
    outreach: json('outreach.json'),
    research: readText(path.join(d, 'research.md')),
    sheet: readText(path.join(d, 'sheet.csv')),
    has: {
      site: exists(path.join(d, 'site', 'index.html')),
      deck: exists(path.join(d, 'deck.html')),
      logo: exists(path.join(d, 'logo.svg')),
    },
    files: listFiles(d),
  };
}

function summary(slug) {
  const m = meta(slug);
  const brand = readJSON(path.join(bdir(slug), 'brand.json'));
  return {
    slug, idea: m.idea, created: m.created,
    name: brand?.name || m.name || null, tagline: brand?.tagline || null,
    colors: brand?.colors || null,
    hasLogo: exists(path.join(bdir(slug), 'logo.svg')),
    running: runs.has(slug), apiCost: m.apiCost || 0,
  };
}

function slugFor(idea) {
  const words = idea.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w)).slice(0, 4);
  return `${words.join('-') || 'business'}-${crypto.randomBytes(2).toString('hex')}`.slice(0, 60);
}
const STOP = new Set(['a', 'an', 'the', 'for', 'of', 'to', 'and', 'that', 'with', 'in', 'on', 'my', 'i', 'want', 'build', 'business', 'start', 'make', 'who', 'is']);

// ---------- live events ----------

const subs = new Map(); // slug -> Set<res>

function emit(slug, ev, persist = true) {
  ev.ts = Date.now();
  if (persist) fs.appendFileSync(path.join(gdir(slug), 'log.jsonl'), JSON.stringify(slimForLog(ev)) + '\n');
  const line = `data: ${JSON.stringify(ev)}\n\n`;
  for (const res of subs.get(slug) || []) res.write(line);
}

function slimForLog(ev) {
  const out = { ...ev };
  if (ev.input) {
    out.input = { ...ev.input };
    for (const k of ['content', 'new_string', 'old_string']) {
      if (typeof out.input[k] === 'string' && out.input[k].length > 1500) out.input[k] = out.input[k].slice(0, 1500) + '\n…';
    }
  }
  if (typeof ev.text === 'string' && ev.t === 'result' && ev.text.length > 4000) out.text = ev.text.slice(0, 4000) + '…';
  return out;
}

function readLog(slug, limit = 600) {
  const t = readText(path.join(gdir(slug), 'log.jsonl')) || '';
  const lines = t.trim().split('\n').filter(Boolean).slice(-limit);
  return lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

function flatten(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(c => (typeof c === 'string' ? c : c.text || '')).join('\n');
  return '';
}

// ---------- Otto runs ----------

const runs = new Map(); // slug -> run
const asks = new Map(); // slug -> pending question waiting on the owner

const PROMPTS = {
  kickoff: (idea, variety = '') => `New business. The owner's idea, in their words:
"""
${idea}
"""

Build it now, end to end. First write plan.json with these steps, all "todo", then work through them in order, marking each "doing" then "done":
1. brand: brand.json and logo.svg
2. site: follow your site craft notes. Write design.md first, then site/index.html (copy logo.svg into site/ too), then look_at_site on desktop, mobile and overview and refine until it's portfolio-quality
3. research: research.md (search the web, cite sources)
4. posts: posts.json plus an image card for each post in posts/
5. outreach: outreach.json (5 to 8 real organizations)
6. deck: deck.html
7. numbers: sheet.csv

The deck and the post cards follow the same art direction as the site.
${variety}
If a real decision is the owner's to make before you start (for example, two very different directions for the name), ask it early. After the site is up, tell the owner in one short message. When everything is done, finish with 2 to 4 sentences: what you built, the one decision you need from them, and the best next move.`,
  next: () => `Keep going. Look at plan.json and what exists. If every step is done, add 1 to 3 new steps a sharp founder would do next for this business, then do the first one. Do one meaningful step, keep plan.json current, and report in 1 to 3 sentences.`,
  fix: () => `Check everything for problems and fix them: invalid JSON in any file, broken or unbalanced HTML, files the site or deck reference that don't exist, unreadable color contrast, layout that breaks on a 360px phone, leftover placeholder text. Report what you fixed in 1 to 3 sentences.`,
};

// What the other businesses in this Garage already look like, so every new site comes out different.
function variety(slug) {
  const others = fs.readdirSync(DATA).filter(s => s !== slug && isBusiness(s)).map(s => {
    const brand = readJSON(path.join(bdir(s), 'brand.json'));
    const design = readText(path.join(bdir(s), 'design.md')) || '';
    const line = k => design.match(new RegExp('^[\\s>*-]*\\**' + k + '\\**\\s*:\\s*\\**\\s*(.+)$', 'im'))?.[1]?.trim();
    if (!brand?.name) return null;
    const fonts = [brand.fonts?.display, brand.fonts?.body].filter(Boolean).join(' + ');
    const bits = [fonts && `fonts ${fonts}`, brand.colors?.primary && `primary ${brand.colors.primary}`, line('Concept') && `concept "${line('Concept')}"`, line('Signature') && `signature "${line('Signature')}"`, line('Archetype') && `archetype "${line('Archetype')}"`];
    return `- ${brand.name}: ${bits.filter(Boolean).join('; ')}`;
  }).filter(Boolean).slice(-8);
  return others.length ? `\nOther businesses in this Garage already look like this. Pick a clearly different concept, signature, archetype, font pairing and palette:\n${others.join('\n')}\n` : '';
}

function settingsLine(s) {
  const q = s.questions === 'decide'
    ? 'Questions: DECIDE. Do not call ask_owner. Make reasonable calls yourself and mention the important ones.'
    : 'Questions: ASK. When a decision is genuinely the owner\'s (name direction, price, audience, tone), call ask_owner with 2 to 4 concrete options. At most 3 questions per run. Don\'t ask what you can decide.';
  return `[Owner settings. ${q}]\n\n`;
}

function startRun(slug, prompt, kind, { retry = false } = {}) {
  if (runs.has(slug)) return false;
  const m = meta(slug);
  const s = { ...DEFAULT_SETTINGS, ...m.settings };
  const power = POWER[s.power] || POWER.standard;
  const mcpFile = path.join(gdir(slug), 'mcp.json');
  writeJSON(mcpFile, {
    mcpServers: {
      garage: {
        command: process.execPath,
        args: [path.join(ROOT, 'mcp.js')],
        env: { GARAGE_URL: `http://${HOST}:${PORT}`, GARAGE_SLUG: slug, GARAGE_DIR: bdir(slug) },
      },
    },
  });
  const args = [
    '-p', settingsLine(s) + prompt,
    '--output-format', 'stream-json', '--verbose',
    // Sandbox: file tools stay inside this business's folder, nothing runs code,
    // and none of the owner's own Claude Code settings, hooks, skills or MCP servers load.
    '--restricted', '--setting-sources', 'project', '--strict-mcp-config', '--mcp-config', mcpFile,
    '--disable-slash-commands',
    '--tools', TOOLS.join(','), '--allowedTools', [...TOOLS, ...GARAGE_TOOLS].join(' '),
    '--permission-mode', 'dontAsk',
    '--model', power.model, '--effort', power.effort,
    '--max-budget-usd', String(Math.max(0.25, Number(s.budget) || 3)),
    '--append-system-prompt', SYSTEM,
  ];
  if (m.sessionId) args.push('--resume', m.sessionId);

  const child = spawn(CLAUDE, args, {
    cwd: bdir(slug),
    env: { ...process.env, MCP_TOOL_TIMEOUT: '86400000' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const run = { child, kind, tools: new Map(), cost: 0, stderr: '', resultError: null, stopped: false, started: Date.now() };
  runs.set(slug, run);
  emit(slug, { t: 'run', state: 'started', kind });

  let buf = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      try { onStream(slug, run, JSON.parse(line)); } catch (e) { console.error('[stream]', e.message); }
    }
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', d => { run.stderr = (run.stderr + d).slice(-4000); });
  child.on('error', err => { run.stderr += `\n${err.message}`; });
  child.on('close', code => {
    runs.delete(slug);
    const mm = meta(slug);
    if (code !== 0 && !run.stopped && !retry && mm.sessionId && /no conversation found/i.test(run.stderr)) {
      mm.sessionId = null;
      saveMeta(slug, mm);
      startRun(slug, prompt, kind, { retry: true });
      return;
    }
    mm.apiCost = (mm.apiCost || 0) + (run.cost || 0);
    mm.runs = (mm.runs || 0) + 1;
    saveMeta(slug, mm);
    settleAsk(slug, null);
    const failed = !run.stopped && (code !== 0 || run.resultError);
    emit(slug, {
      t: 'done', kind, ok: !failed, stopped: run.stopped,
      cost: run.cost || 0, total: mm.apiCost, seconds: Math.round((Date.now() - run.started) / 1000),
      error: failed ? (run.resultError || run.stderr.trim().slice(-600) || `claude exited with code ${code}`) : null,
    });
  });
  return true;
}

function onStream(slug, run, ev) {
  if (ev.type === 'system' && ev.subtype === 'init') {
    const m = meta(slug);
    if (m.sessionId !== ev.session_id) { m.sessionId = ev.session_id; saveMeta(slug, m); }
    return;
  }
  if (ev.type === 'system' && ev.subtype === 'task_summary') {
    if (ev.detail) emit(slug, { t: 'status', text: ev.detail }, false);
    return;
  }
  if (ev.type === 'assistant' && !ev.parent_tool_use_id) {
    for (const b of ev.message?.content || []) {
      if (b.type === 'text' && b.text.trim()) emit(slug, { t: 'say', text: b.text.trim() });
      if (b.type === 'tool_use') {
        run.tools.set(b.id, b);
        const p = rel(slug, b.input?.file_path);
        emit(slug, { t: 'tool', id: b.id, name: b.name, input: b.input, path: p, nice: NICE[p] || p });
      }
    }
    return;
  }
  if (ev.type === 'user') {
    for (const b of ev.message?.content || []) {
      if (b.type !== 'tool_result') continue;
      const call = run.tools.get(b.tool_use_id);
      emit(slug, { t: 'result', id: b.tool_use_id, name: call?.name, ok: !b.is_error, text: flatten(b.content).slice(0, 12000) });
      if (call && (call.name === 'Write' || call.name === 'Edit') && !b.is_error) {
        emit(slug, { t: 'files', path: rel(slug, call.input?.file_path) }, false);
      }
    }
    return;
  }
  if (ev.type === 'result' || 'total_cost_usd' in ev) {
    run.cost = ev.total_cost_usd || 0;
    if (ev.is_error) run.resultError = typeof ev.result === 'string' && ev.result ? ev.result : ev.subtype || 'Run failed';
  }
}

function settleAsk(slug, answer) {
  const a = asks.get(slug);
  if (!a) return false;
  asks.delete(slug);
  if (!a.res.writableEnded) {
    a.res.writeHead(200, { 'content-type': 'application/json' });
    a.res.end(JSON.stringify({ answer }));
  }
  emit(slug, { t: 'answered', id: a.id, answer });
  return true;
}

// ---------- publishing (GitHub Pages, free) ----------

function sh(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { err += d; });
    p.on('error', reject);
    p.on('close', code => (code === 0 ? resolve(out) : reject(new Error((err || out).trim() || `${cmd} exited ${code}`))));
  });
}

async function publish(slug) {
  const m = meta(slug);
  const site = path.join(bdir(slug), 'site');
  if (!exists(path.join(site, 'index.html'))) throw new Error('There is no website yet.');
  const user = (await sh('gh', ['api', 'user', '-q', '.login'])).trim();
  const repo = m.repo || `garage-${slug}`;
  if (!m.repo) {
    const name = readJSON(path.join(bdir(slug), 'brand.json'))?.name || m.idea.slice(0, 60);
    await sh('gh', ['repo', 'create', repo, '--public', '--description', `${name}: website built with Garage`]);
    m.repo = repo;
    saveMeta(slug, m);
  }
  const out = path.join(gdir(slug), 'publish');
  fs.rmSync(out, { recursive: true, force: true });
  fs.cpSync(site, out, { recursive: true });
  fs.writeFileSync(path.join(out, '.nojekyll'), '');
  const git = args => sh('git', ['-c', 'user.name=Garage', '-c', 'user.email=garage@users.noreply.github.com', ...args], { cwd: out });
  await git(['init', '-q', '-b', 'main']);
  await git(['add', '-A']);
  await git(['commit', '-q', '-m', 'Publish from Garage']);
  await git(['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', 'push', '-q', '--force', `https://github.com/${user}/${repo}.git`, 'main']);
  try {
    await sh('gh', ['api', `repos/${user}/${repo}/pages`, '-X', 'POST', '-f', 'source[branch]=main', '-f', 'source[path]=/']);
  } catch (e) {
    if (!/409|already/i.test(e.message)) throw e;
  }
  const url = `https://${user.toLowerCase()}.github.io/${repo}/`;
  m.publishedUrl = url;
  saveMeta(slug, m);
  emit(slug, { t: 'published', url, repo: `https://github.com/${user}/${repo}` });
  return url;
}

// ---------- http ----------

function send(res, code, body) {
  res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.setEncoding('utf8');
    req.on('data', c => { s += c; if (s.length > 2e6) req.destroy(); });
    req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function serveFile(res, root, relPath) {
  const file = path.resolve(root, '.' + path.posix.normalize('/' + relPath));
  if (!file.startsWith(root + path.sep) && file !== root) return send(res, 403, { error: 'forbidden' });
  if (file.split(path.sep).includes('.garage')) return send(res, 403, { error: 'forbidden' });
  let target = file;
  if (exists(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
  if (!exists(target)) return send(res, 404, { error: 'not found' });
  res.writeHead(200, { 'content-type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(target).pipe(res);
}

const routes = [];
const route = (method, pattern, fn) => routes.push({ method, pattern, fn });

route('GET', /^\/api\/businesses$/, (req, res) => {
  const list = fs.readdirSync(DATA).filter(isBusiness).map(summary).sort((a, b) => b.created - a.created);
  send(res, 200, list);
});

route('POST', /^\/api\/businesses$/, async (req, res) => {
  const { idea, settings } = await readBody(req);
  if (!idea || !idea.trim()) return send(res, 400, { error: 'Tell Otto your idea first.' });
  const slug = slugFor(idea);
  fs.mkdirSync(gdir(slug), { recursive: true });
  saveMeta(slug, {
    slug, idea: idea.trim(), created: Date.now(), name: null, sessionId: null, apiCost: 0, runs: 0,
    settings: { ...DEFAULT_SETTINGS, ...(settings || {}) },
  });
  emit(slug, { t: 'user', text: idea.trim() });
  startRun(slug, PROMPTS.kickoff(idea.trim(), variety(slug)), 'kickoff');
  send(res, 201, { slug });
});

route('GET', /^\/api\/b\/([a-z0-9-]+)$/, (req, res, slug) => {
  const m = meta(slug);
  const a = asks.get(slug);
  send(res, 200, {
    ...summary(slug), auth: AUTH, settings: { ...DEFAULT_SETTINGS, ...m.settings }, publishedUrl: m.publishedUrl || null,
    repo: m.repo || null, runs: m.runs || 0, ws: workspace(slug), log: readLog(slug),
    pendingAsk: a ? { id: a.id, question: a.question, options: a.options, why: a.why } : null,
  });
});

route('GET', /^\/api\/b\/([a-z0-9-]+)\/events$/, (req, res, slug) => {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
  res.write(': connected\n\n');
  if (!subs.has(slug)) subs.set(slug, new Set());
  subs.get(slug).add(res);
  const beat = setInterval(() => res.write(': beat\n\n'), 20000);
  req.on('close', () => { clearInterval(beat); subs.get(slug)?.delete(res); });
});

route('POST', /^\/api\/b\/([a-z0-9-]+)\/run$/, async (req, res, slug) => {
  const { kind = 'chat', message = '' } = await readBody(req);
  if (runs.has(slug)) return send(res, 409, { error: 'Otto is already working. Stop him first or wait.' });
  let prompt;
  if (kind === 'kickoff') {
    prompt = PROMPTS.kickoff(meta(slug).idea, variety(slug));
  } else if (kind === 'chat') {
    if (!message.trim()) return send(res, 400, { error: 'Empty message.' });
    emit(slug, { t: 'user', text: message.trim() });
    prompt = message.trim();
  } else if (kind === 'next') {
    emit(slug, { t: 'user', text: 'Keep going.', quiet: true });
    prompt = PROMPTS.next();
  } else if (kind === 'fix') {
    emit(slug, { t: 'user', text: 'Check everything and fix what\'s broken.', quiet: true });
    prompt = PROMPTS.fix();
  } else return send(res, 400, { error: 'Unknown run.' });
  startRun(slug, prompt, kind);
  send(res, 202, { ok: true });
});

route('POST', /^\/api\/b\/([a-z0-9-]+)\/stop$/, (req, res, slug) => {
  const run = runs.get(slug);
  if (!run) return send(res, 200, { ok: true });
  run.stopped = true;
  settleAsk(slug, null);
  run.child.kill('SIGINT');
  setTimeout(() => { if (runs.get(slug) === run) run.child.kill('SIGKILL'); }, 4000);
  send(res, 200, { ok: true });
});

// Otto's ask_owner tool (via mcp.js) long-polls here until the owner answers in the app.
route('POST', /^\/api\/b\/([a-z0-9-]+)\/ask$/, async (req, res, slug) => {
  const { question = '', options = [], why = '' } = await readBody(req);
  settleAsk(slug, null);
  const id = crypto.randomBytes(4).toString('hex');
  const ask = { id, question: String(question), options: (Array.isArray(options) ? options : []).map(String).slice(0, 4), why: String(why || ''), res };
  asks.set(slug, ask);
  res.on('close', () => {
    if (asks.get(slug) === ask) { asks.delete(slug); emit(slug, { t: 'answered', id, answer: null }); }
  });
  emit(slug, { t: 'ask', id, question: ask.question, options: ask.options, why: ask.why });
});

route('POST', /^\/api\/b\/([a-z0-9-]+)\/answer$/, async (req, res, slug) => {
  const { id, answer } = await readBody(req);
  const a = asks.get(slug);
  if (!a || a.id !== id) return send(res, 409, { error: 'That question is no longer open.' });
  settleAsk(slug, String(answer || '').trim() || null);
  send(res, 200, { ok: true });
});

route('POST', /^\/api\/b\/([a-z0-9-]+)\/settings$/, async (req, res, slug) => {
  const body = await readBody(req);
  const m = meta(slug);
  const s = { ...DEFAULT_SETTINGS, ...m.settings };
  if (['ask', 'decide'].includes(body.questions)) s.questions = body.questions;
  if (POWER[body.power]) s.power = body.power;
  if (Number(body.budget) > 0) s.budget = Math.min(50, Number(body.budget));
  m.settings = s;
  saveMeta(slug, m);
  send(res, 200, s);
});

// Approve, skip or edit a drafted post or email. Nothing is sent from here: the owner sends it.
route('POST', /^\/api\/b\/([a-z0-9-]+)\/review$/, async (req, res, slug) => {
  const { file, id, status, patch = {} } = await readBody(req);
  if (!['posts', 'outreach'].includes(file)) return send(res, 400, { error: 'Unknown list.' });
  const f = path.join(bdir(slug), `${file}.json`);
  const list = readJSON(f);
  if (!Array.isArray(list)) return send(res, 409, { error: `${file}.json isn't a list yet.` });
  const item = list.find(x => x.id === id);
  if (!item) return send(res, 404, { error: 'Not found.' });
  if (['pending', 'approved', 'skipped'].includes(status)) item.status = status;
  for (const k of ['text', 'subject', 'body', 'email']) if (typeof patch[k] === 'string') item[k] = patch[k];
  writeJSON(f, list);
  emit(slug, { t: 'files', path: `${file}.json` }, false);
  send(res, 200, item);
});

route('GET', /^\/api\/b\/([a-z0-9-]+)\/shot\/(desktop|mobile|overview)$/, (req, res, slug) => {
  const file = path.join(gdir(slug), 'shots', `${req.url.match(/shot\/(\w+)/)[1]}.png`);
  if (!exists(file)) return send(res, 404, { error: 'No screenshot yet.' });
  res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

route('POST', /^\/api\/b\/([a-z0-9-]+)\/publish$/, async (req, res, slug) => {
  try { send(res, 200, { url: await publish(slug) }); } catch (e) { send(res, 500, { error: e.message }); }
});

route('GET', /^\/api\/b\/([a-z0-9-]+)\/export$/, (req, res, slug) => {
  const site = path.join(bdir(slug), 'site');
  if (!exists(site)) return send(res, 404, { error: 'No website yet.' });
  res.writeHead(200, { 'content-type': 'application/zip', 'content-disposition': `attachment; filename="${slug}-site.zip"` });
  spawn('zip', ['-r', '-q', '-', '.'], { cwd: site }).stdout.pipe(res);
});

route('POST', /^\/api\/b\/([a-z0-9-]+)\/archive$/, (req, res, slug) => {
  if (runs.has(slug)) return send(res, 409, { error: 'Stop Otto first.' });
  const dest = path.join(DATA, '.archive');
  fs.mkdirSync(dest, { recursive: true });
  fs.renameSync(bdir(slug), path.join(dest, `${slug}-${Date.now()}`));
  send(res, 200, { ok: true });
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}`);
  const p = decodeURIComponent(url.pathname);
  try {
    for (const r of routes) {
      const m = r.method === req.method && p.match(r.pattern);
      if (!m) continue;
      if (m[1] && !isBusiness(m[1])) return send(res, 404, { error: 'No such business.' });
      return await r.fn(req, res, m[1]);
    }
    const site = p.match(/^\/b\/([a-z0-9-]+)\/(.*)$/);
    if (site && req.method === 'GET') {
      if (!isBusiness(site[1])) return send(res, 404, { error: 'No such business.' });
      return serveFile(res, bdir(site[1]), site[2]);
    }
    if (req.method === 'GET') return serveFile(res, PUBLIC, p === '/' ? 'index.html' : p.slice(1));
    send(res, 404, { error: 'not found' });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) send(res, 500, { error: e.message });
  }
});
server.requestTimeout = 0; // ask_owner holds a request open until the owner answers
server.on('error', err => {
  console.error(err.code === 'EADDRINUSE' ? `\n  Port ${PORT} is busy. Try: PORT=4778 npx github:NeilGilani/garage\n` : err);
  process.exit(1);
});
server.listen(PORT, HOST, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  Garage is running → ${url}\n  Your businesses live in ${DATA}\n  Press Ctrl+C to stop.\n`);
  if (!process.env.GARAGE_NO_OPEN) {
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    spawn(opener, [url], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  }
});

function shutdown() {
  for (const run of runs.values()) run.child.kill('SIGINT');
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
