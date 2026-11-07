// Garage desktop: watch Otto work live, answer his questions, approve what goes out.

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const favicon = u => `https://icons.duckduckgo.com/ip3/${host(u)}.ico`;
const money = n => `$${(Number(n) || 0).toFixed(2)}`;
// On a Claude plan the run costs nothing extra; with an API key set, it's billed to that key.
const paid = () => (S.b?.auth === 'api-key' ? `billed to your API key` : 'you paid $0');
const clockTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const store = {
  get(k, d) { try { const v = localStorage.getItem(`garage.${k}`); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`garage.${k}`, JSON.stringify(v)); } catch { /* private mode */ } },
};

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ---------- icons + apps ----------

const ICON = {
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
  sparkle: '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  deck: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/>',
  grid: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  play: '<path d="M7 4v16l13-8z" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.3 14a1.5 1.5 0 0 1 2.4-1.8L8 15"/>',
  coins: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8V20h3.2l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
};
const svg = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ''}</svg>`;

const APPS = {
  messages: { name: 'Messages', icon: 'chat', grad: ['#46e08f', '#13a55c'], slot: [0.02, 0.30, 0.28, 0.66] },
  research: { name: 'Research', icon: 'search', grad: ['#5b95ff', '#2453d6'], slot: [0.02, 0.04, 0.37, 0.66] },
  browser: { name: 'Browser', icon: 'globe', grad: ['#9aa1b4', '#4d5465'], slot: [0.07, 0.11, 0.40, 0.66] },
  build: { name: 'Build', icon: 'layout', grad: ['#2ad6c9', '#0b8f99'], slot: [0.35, 0.03, 0.63, 0.88] },
  brand: { name: 'Brand', icon: 'sparkle', grad: ['#ff86bd', '#d6336c'], slot: [0.30, 0.05, 0.42, 0.78] },
  social: { name: 'Social', icon: 'heart', grad: ['#ff6b6b', '#c81e3a'], slot: [0.46, 0.04, 0.40, 0.86] },
  outreach: { name: 'Outreach', icon: 'mail', grad: ['#4fd0ff', '#0b84d6'], slot: [0.22, 0.04, 0.46, 0.88] },
  deck: { name: 'Deck', icon: 'deck', grad: ['#ffd34d', '#f08c00'], slot: [0.18, 0.04, 0.64, 0.84] },
  sheets: { name: 'Sheets', icon: 'grid', grad: ['#86e472', '#2f9e44'], slot: [0.26, 0.10, 0.52, 0.62] },
  files: { name: 'Files', icon: 'folder', grad: ['#6bb3ff', '#1c6fe0'], slot: [0.60, 0.10, 0.30, 0.62] },
  settings: { name: 'Settings', icon: 'gear', grad: ['#a3a9b5', '#5c626e'], slot: [0.34, 0.12, 0.34, 0.70] },
};
const DOCK = [['messages', 'research', 'browser'], ['build', 'brand', 'social', 'outreach'], ['deck', 'sheets'], ['files', 'settings']];
const grad = app => `linear-gradient(160deg, ${APPS[app].grad[0]}, ${APPS[app].grad[1]})`;
const NET = { x: 'X', twitter: 'X', linkedin: 'LinkedIn', instagram: 'Instagram', threads: 'Threads', reddit: 'Reddit', facebook: 'Facebook', tiktok: 'TikTok' };

function appForPath(p = '') {
  if (!p) return null;
  if (p.startsWith('site/')) return 'build';
  if (p === 'brand.json' || p === 'logo.svg') return 'brand';
  if (p === 'posts.json' || p.startsWith('posts/')) return 'social';
  if (p === 'outreach.json') return 'outreach';
  if (p === 'deck.html') return 'deck';
  if (p === 'sheet.csv') return 'sheets';
  if (p === 'research.md') return 'research';
  if (p === 'plan.json') return 'plan';
  return 'files';
}
function appForTool(ev) {
  if (ev.name === 'WebSearch') return 'research';
  if (ev.name === 'WebFetch') return 'browser';
  if (ev.name === 'Write' || ev.name === 'Edit') return appForPath(ev.path);
  return null;
}
function labelFor(ev) {
  const what = ev.nice || ev.path || 'a file';
  switch (ev.name) {
    case 'WebSearch': return `Searching “${ev.input?.query || ''}”`;
    case 'WebFetch': return `Reading ${host(ev.input?.url || '')}`;
    case 'Write': return ev.path === 'plan.json' ? 'Updating the plan' : `Writing ${what}`;
    case 'Edit': return ev.path === 'plan.json' ? 'Updating the plan' : `Editing ${what}`;
    case 'Read': return `Looking at ${what}`;
    case 'Glob': case 'Grep': return 'Looking through the files';
    case 'mcp__garage__ask_owner': return 'Asking you a question';
    default: return 'Working';
  }
}

// ---------- state ----------

let S = fresh();
function fresh() {
  return {
    slug: null, b: null, es: null, running: false, runStarted: 0, statusText: '', ask: null, queued: null, unread: 0,
    messages: [],
    research: { searches: [], tab: 'live' },
    browser: { pages: [], active: null },
    build: { file: 'site/index.html', typing: false, anim: 0, device: 'desktop', showCode: true, v: Date.now(), loaded: false },
    busyApp: null, v: Date.now(), deckV: Date.now(),
  };
}

// ---------- markdown + csv ----------

function mdInline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s)<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
}
function md(src = '') {
  const lines = src.replace(/\r/g, '').split('\n');
  const isList = l => /^\s*([-*+]|\d+[.)])\s+/.test(l);
  const isBlock = l => /^(#{1,4}\s|\s*\||\s*>)/.test(l) || isList(l);
  let out = '', i = 0;
  while (i < lines.length) {
    const l = lines[i];
    let m;
    if (!l.trim()) { i++; continue; }
    if (/^```/.test(l)) {
      const code = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      i++;
      out += `<pre><code>${esc(code.join('\n'))}</code></pre>`;
      continue;
    }
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { out += `<h${m[1].length}>${mdInline(m[2])}</h${m[1].length}>`; i++; continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(l)) { out += '<hr>'; i++; continue; }
    if (/^\s*\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const body = rows.filter(r => !/^[\s|:-]+$/.test(r));
      const [head, ...rest] = body;
      out += `<table><thead><tr>${cells(head || '').map(c => `<th>${mdInline(c)}</th>`).join('')}</tr></thead><tbody>${rest.map(r => `<tr>${cells(r).map(c => `<td>${mdInline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      continue;
    }
    if (/^\s*>/.test(l)) {
      const q = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, ''));
      out += `<blockquote>${md(q.join('\n'))}</blockquote>`;
      continue;
    }
    if (isList(l)) {
      const ordered = /^\s*\d/.test(l);
      const items = [];
      while (i < lines.length && isList(lines[i])) items.push(lines[i++].replace(/^\s*([-*+]|\d+[.)])\s+/, ''));
      const tag = ordered ? 'ol' : 'ul';
      out += `<${tag}>${items.map(x => `<li>${mdInline(x)}</li>`).join('')}</${tag}>`;
      continue;
    }
    const p = [lines[i++]];
    while (i < lines.length && lines[i].trim() && !isBlock(lines[i]) && !/^```/.test(lines[i])) p.push(lines[i++]);
    out += `<p>${mdInline(p.join(' '))}</p>`;
  }
  return out;
}
function csv(text = '') {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
function highlightHTML(src) {
  return esc(src)
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="c">$1</span>')
    .replace(/(&lt;\/?)([a-zA-Z][\w-]*)/g, '$1<span class="t">$2</span>')
    .replace(/\s([a-zA-Z-:@]+)=(&quot;.*?&quot;)/g, ' <span class="a">$1</span>=<span class="s">$2</span>');
}
function parseLinks(text = '') {
  const out = [], seen = new Set();
  const re = /\{"title":"((?:[^"\\]|\\.)*)","url":"((?:[^"\\]|\\.)*)"\}/g;
  let m;
  while ((m = re.exec(text))) {
    try { const url = JSON.parse(`"${m[2]}"`); if (!seen.has(url)) { seen.add(url); out.push({ title: JSON.parse(`"${m[1]}"`), url }); } } catch { /* skip */ }
  }
  if (!out.length) {
    for (const url of text.match(/https?:\/\/[^\s)"'\]<>]+/g) || []) if (!seen.has(url)) { seen.add(url); out.push({ title: host(url), url }); }
  }
  return out.slice(0, 8);
}

// ---------- window manager ----------

const desk = $('#desktop');
const wm = {
  wins: {}, z: 10,
  open(app, { focus = true } = {}) {
    let w = this.wins[app];
    if (!w) {
      const open = Object.values(this.wins).sort((a, b) => a.el.style.zIndex - b.el.style.zIndex);
      if (open.length >= 6) this.close(open[0].app);
      w = makeWindow(app);
      this.wins[app] = w;
      $('#windows').append(w.el);
      APPS[app].mount?.(w);
    }
    if (focus) this.focus(app);
    renderApp(app);
    renderDock();
    renderCenter();
    return w;
  },
  focus(app) {
    const w = this.wins[app];
    if (!w) return;
    w.el.style.zIndex = ++this.z;
    for (const [k, x] of Object.entries(this.wins)) x.el.classList.toggle('focused', k === app);
    if (app === 'messages') { S.unread = 0; renderDock(); }
  },
  close(app) {
    const w = this.wins[app];
    if (!w) return;
    w.el.remove();
    delete this.wins[app];
    renderDock();
    renderCenter();
  },
  closeAll() { for (const k of Object.keys(this.wins)) this.close(k); },
  isTop(app) { const w = this.wins[app]; return w && Number(w.el.style.zIndex) === this.z; },
};

function makeWindow(app) {
  const def = APPS[app];
  const el = document.createElement('div');
  el.className = 'win';
  el.dataset.app = app;
  el.innerHTML = `
    <div class="win-bar">
      <div class="lights"><button class="l-close" aria-label="Close"></button><button class="l-min" aria-label="Minimize"></button><button class="l-max" aria-label="Maximize"></button></div>
      <div class="win-title"><span class="app-ico" style="background:${grad(app)}">${svg(def.icon)}</span><span>${def.name}</span>
        <span class="otto-tag"><span class="otto" style="--s:14px;box-shadow:none"><i></i></span>Otto</span></div>
      <div class="win-actions"></div>
    </div>
    <div class="win-body"></div>
    <div class="win-resize"></div>`;
  const W = desk.clientWidth, H = desk.clientHeight;
  const saved = store.get(`win.${app}`, null);
  const [fx, fy, fw, fh] = saved || def.slot;
  const w = Math.max(320, Math.min(W - 16, fw * W)), hgt = Math.max(240, Math.min(H - 16, fh * H));
  Object.assign(el.style, {
    left: `${Math.max(8, Math.min(W - w - 8, fx * W))}px`,
    top: `${Math.max(8, Math.min(H - hgt - 8, fy * H))}px`,
    width: `${w}px`, height: `${hgt}px`,
  });
  const remember = () => store.set(`win.${app}`, [el.offsetLeft / W, el.offsetTop / H, el.offsetWidth / W, el.offsetHeight / H]);
  el.addEventListener('pointerdown', () => wm.focus(app), true);
  $('.l-close', el).onclick = () => wm.close(app);
  $('.l-min', el).onclick = () => wm.close(app);
  $('.l-max', el).onclick = () => el.classList.toggle('maxed');
  $('.win-bar', el).ondblclick = e => { if (!e.target.closest('button')) el.classList.toggle('maxed'); };
  drag($('.win-bar', el), (dx, dy, start) => {
    el.style.left = `${Math.max(-el.offsetWidth + 80, Math.min(desk.clientWidth - 80, start.left + dx))}px`;
    el.style.top = `${Math.max(0, Math.min(desk.clientHeight - 42, start.top + dy))}px`;
  }, () => ({ left: el.offsetLeft, top: el.offsetTop }), remember);
  drag($('.win-resize', el), (dx, dy, start) => {
    el.style.width = `${Math.max(300, start.w + dx)}px`;
    el.style.height = `${Math.max(200, start.h + dy)}px`;
  }, () => ({ w: el.offsetWidth, h: el.offsetHeight }), remember);
  return { app, el, body: $('.win-body', el), actions: $('.win-actions', el) };
}

function drag(handle, move, getStart, end) {
  handle.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('button, a, input')) return;
    e.preventDefault();
    const x0 = e.clientX, y0 = e.clientY, start = getStart();
    const frames = $$('iframe');
    frames.forEach(f => { f.style.pointerEvents = 'none'; });
    const onMove = ev => move(ev.clientX - x0, ev.clientY - y0, start);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      frames.forEach(f => { f.style.pointerEvents = ''; });
      end();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });
}

// ---------- Otto's cursor ----------

const cursor = {
  el: $('#cursor'),
  goTo(target, label) {
    let rect;
    if (typeof target === 'string') {
      for (const [k, x] of Object.entries(wm.wins)) x.el.classList.toggle('otto-on', k === target);
      const w = wm.wins[target];
      if (!w) return;
      const el = w.el;
      rect = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
    } else if (target) {
      const r = target.getBoundingClientRect(), d = desk.getBoundingClientRect();
      rect = { x: r.left - d.left, y: r.top - d.top, w: r.width, h: r.height };
    }
    if (!rect) return;
    const x = rect.x + rect.w * (0.3 + Math.random() * 0.35);
    const y = rect.y + Math.min(rect.h - 30, 60 + Math.random() * Math.max(30, rect.h * 0.45));
    this.el.hidden = false;
    this.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    $('#cursorLabel').textContent = label || '';
    clearTimeout(this.t);
    this.t = setTimeout(() => { this.el.classList.remove('tap'); void this.el.offsetWidth; this.el.classList.add('tap'); }, 820);
  },
  hide() {
    this.el.hidden = true;
    for (const x of Object.values(wm.wins)) x.el.classList.remove('otto-on');
  },
};

// ---------- event handling ----------

function apply(ev, live) {
  switch (ev.t) {
    case 'user':
      S.messages.push(ev.quiet ? { who: 'sys', text: `↻ ${ev.text}` } : { who: 'me', text: ev.text });
      break;
    case 'say':
      S.messages.push({ who: 'otto', text: ev.text });
      if (live) {
        if (!wm.wins.messages || !wm.isTop('messages')) { S.unread++; sayToast(ev.text); }
      }
      break;
    case 'run':
      S.running = true;
      S.runStarted = ev.ts;
      S.statusText = ev.kind === 'kickoff' ? 'Otto is getting started' : 'Otto is working';
      break;
    case 'tool': {
      const app = appForTool(ev);
      const label = labelFor(ev);
      S.statusText = label;
      if (ev.name === 'WebSearch') S.research.searches.push({ id: ev.id, query: ev.input?.query || '', pending: true, links: [] });
      if (ev.name === 'WebFetch') {
        S.browser.pages.push({ id: ev.id, url: ev.input?.url || '', goal: ev.input?.prompt || '', pending: true, text: '' });
        S.browser.active = ev.id;
      }
      if (live) {
        S.busyApp = app && app !== 'plan' ? app : null;
        if (app === 'plan') cursor.goTo($('#plan').hidden ? null : $('#plan'), label);
        else if (app) {
          wm.open(app);
          if (app === 'build' && (ev.name === 'Write' || ev.name === 'Edit')) buildShowCode(ev);
          if (app === 'research' && ev.name === 'Write') S.research.tab = 'report';
          cursor.goTo(app, label);
        } else if (S.busyApp == null) {
          $('#cursorLabel').textContent = label;
        }
      }
      break;
    }
    case 'result': {
      if (ev.name === 'WebSearch') {
        const s = S.research.searches.find(x => x.id === ev.id);
        if (s) { s.pending = false; s.links = parseLinks(ev.text); s.failed = !ev.ok; }
      }
      if (ev.name === 'WebFetch') {
        const p = S.browser.pages.find(x => x.id === ev.id);
        if (p) { p.pending = false; p.text = ev.text; p.failed = !ev.ok; }
      }
      if (live && ev.name === 'WebSearch') renderApp('research');
      if (live && ev.name === 'WebFetch') renderApp('browser');
      break;
    }
    case 'ask':
      S.ask = ev;
      S.messages.push({ who: 'q', text: ev.question, id: ev.id, options: ev.options });
      if (live) { showAsk(); ding(); }
      break;
    case 'answered':
      S.messages.push(ev.answer ? { who: 'me', text: ev.answer } : { who: 'sys', text: 'No answer. Otto made the call.' });
      if (S.ask?.id === ev.id) { S.ask = null; hideAsk(); }
      break;
    case 'done': {
      S.running = false;
      S.busyApp = null;
      if (S.b) S.b.apiCost = ev.total;
      for (const s of S.research.searches) s.pending = false;
      for (const p of S.browser.pages) p.pending = false;
      const took = ev.seconds ? ` in ${clockTime(ev.seconds)}` : '';
      if (ev.error) S.messages.push({ who: 'err', text: ev.error });
      else S.messages.push({ who: 'sys', text: `${ev.stopped ? 'Stopped' : 'Done'}${took} · API value ${money(ev.cost)} · ${paid()}` });
      if (live) {
        cursor.hide();
        if (ev.error) toast(`Otto hit a problem: ${ev.error.slice(0, 180)}`, 'bad');
        else if (!ev.stopped) toast(S.b?.auth === 'api-key' ? `Done${took}. That run cost <b>${money(ev.cost)}</b> on your API key.` : `Done${took}. On the API that run costs <b>${money(ev.cost)}</b>. On your plan you paid <b>$0</b>.`, 'ok');
        refresh();
        if (S.queued) { const q = S.queued; S.queued = null; setTimeout(() => sendMessage(q), 300); }
      }
      break;
    }
    case 'published':
      if (S.b) S.b.publishedUrl = ev.url;
      if (live) toast(`Live at <a href="${esc(ev.url)}" target="_blank" rel="noopener">${esc(ev.url)}</a> (GitHub Pages can take a minute the first time)`, 'ok', 12000);
      break;
    case 'status':
      if (!S.busyApp) S.statusText = ev.text;
      break;
    case 'files':
      if (ev.path?.startsWith('site/')) { S.build.v = Date.now(); S.build.flash = true; }
      if (ev.path === 'deck.html') S.deckV = Date.now();
      S.v = Date.now();
      refresh();
      break;
  }
  if (live) {
    renderTop();
    if (['user', 'say', 'ask', 'answered', 'done'].includes(ev.t)) renderApp('messages');
    if (['tool', 'result'].includes(ev.t) && ['WebSearch', 'WebFetch'].includes(ev.name)) renderApp(ev.name === 'WebSearch' ? 'research' : 'browser');
    if (['run', 'done', 'ask', 'answered', 'say'].includes(ev.t)) { renderCenter(); renderDock(); }
    if (ev.t === 'tool') renderDock();
  }
}

let refreshTimer;
function refresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    if (!S.slug) return;
    const slug = S.slug;
    try {
      const b = await api(`/api/b/${slug}`);
      if (S.slug !== slug) return;
      const { log, ...rest } = b;
      S.b = rest;
      S.v = Date.now();
      if (!b.running && S.running) { S.running = false; cursor.hide(); }
      renderAll();
    } catch (e) { console.warn(e); }
  }, 220);
}

// ---------- rendering: chrome ----------

function renderAll() {
  renderTop();
  renderPlan();
  renderDock();
  renderCenter();
  for (const app of Object.keys(wm.wins)) renderApp(app);
}

function renderTop() {
  const b = S.b;
  $('#bizName').textContent = b ? (b.name || 'New business') : 'Garage';
  $('#bizMark').innerHTML = b?.hasLogo ? `<img src="/b/${S.slug}/logo.svg?v=${S.v}" alt="">` : '';
  $('#meterApi').textContent = money(b?.apiCost || 0);
  $('#meter').hidden = !b;
  $$('#meter .paid').forEach(x => { x.hidden = b?.auth === 'api-key'; });
  const st = $('#status');
  st.hidden = !S.running;
  if (S.running) {
    $('#statusText').textContent = S.ask ? 'Otto is waiting for your answer' : (S.statusText || 'Otto is working');
    st.style.cursor = S.ask ? 'pointer' : '';
  }
  document.title = S.ask ? '● Otto needs you · Garage' : (b?.name ? `${b.name} · Garage` : 'Garage');
}

setInterval(() => {
  if (S.running && S.runStarted) $('#statusTime').textContent = clockTime((Date.now() - S.runStarted) / 1000);
  const now = new Date();
  $('#clock').textContent = `${now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}, 1000);

function renderPlan() {
  const plan = S.b?.ws?.plan;
  const el = $('#plan');
  if (!Array.isArray(plan) || !plan.length) { el.hidden = true; return; }
  el.hidden = false;
  const done = plan.filter(p => p.status === 'done').length;
  el.innerHTML = `<h3><span>Plan</span><span>${done}/${plan.length}</span></h3><ol>${plan.map(p => `<li class="${esc(p.status)}"><i class="tick"></i><span>${esc(p.title || p.id)}</span></li>`).join('')}</ol>`;
}

function pendingCount(list) { return Array.isArray(list) ? list.filter(x => (x.status || 'pending') === 'pending').length : 0; }

function renderDock() {
  const dock = $('#dock');
  if (!S.slug) { dock.hidden = true; return; }
  dock.hidden = false;
  const badges = {
    social: pendingCount(S.b?.ws?.posts),
    outreach: pendingCount(S.b?.ws?.outreach),
    messages: S.unread + (S.ask ? 1 : 0),
  };
  dock.innerHTML = DOCK.map(group => group.map(app => {
    const n = badges[app] || 0;
    const cls = ['dock-app', wm.wins[app] ? 'open' : '', S.running && S.busyApp === app ? 'busy' : ''].join(' ');
    return `<button class="${cls}" data-app="${app}" title="${APPS[app].name}"><span class="dock-tile" style="background:${grad(app)}">${svg(APPS[app].icon)}</span><span>${APPS[app].name}</span>${n ? `<b class="badge">${n}</b>` : ''}</button>`;
  }).join('')).join('<i class="dock-sep"></i>');
}
$('#dock').addEventListener('click', e => {
  const btn = e.target.closest('.dock-app');
  if (!btn) return;
  const app = btn.dataset.app;
  if (wm.wins[app] && wm.isTop(app)) wm.close(app);
  else wm.open(app);
});

const EXAMPLES = [
  'Mobile dog grooming van in San Jose',
  'Small-batch hot sauce sold at farmers markets',
  'A study planner app for high schoolers',
  'Heavyweight hoodies for night-shift workers',
];
const DEFAULT_STEPS = [
  ['Build your brand and logo', 'brand'], ['Design and write your website', 'build'], ['Research your market', 'research'],
  ['Write launch posts', 'social'], ['Find your first customers', 'outreach'], ['Make a pitch deck', 'deck'], ['Run the numbers', 'sheets'],
];
function appForStep(t = '') {
  const s = t.toLowerCase();
  if (/brand|logo|name/.test(s)) return 'brand';
  if (/research|market|competitor/.test(s)) return 'research';
  if (/post|social|launch/.test(s)) return 'social';
  if (/outreach|email|customer|partner|stockist/.test(s)) return 'outreach';
  if (/deck|pitch/.test(s)) return 'deck';
  if (/number|budget|sheet|price|pricing|cost/.test(s)) return 'sheets';
  return 'build';
}

let carouselTimer;
function renderCenter() {
  const c = $('#center');
  clearInterval(carouselTimer);
  if (!S.slug) { renderHome(); return; }
  if (Object.keys(wm.wins).length && S.running) { c.hidden = true; return; }
  c.hidden = false;
  const b = S.b || {};
  const s = b.settings || { questions: 'ask', budget: 3, power: 'standard' };
  const plan = Array.isArray(b.ws?.plan) ? b.ws.plan : null;
  let steps;
  if (!plan) steps = DEFAULT_STEPS;
  else {
    const left = plan.filter(p => p.status !== 'done').map(p => [p.title || p.id, appForStep(p.title || p.id)]);
    steps = left.length ? left : [['Sharpen the website', 'build'], ['Find more customers', 'outreach'], ['Dig deeper into the market', 'research']];
  }
  const label = S.running ? 'Otto is working' : (plan ? 'What I’ll do next' : 'What I’ll do in this run');
  const button = S.running
    ? `<button class="btn-primary" data-act="stop">${svg('stop')} Stop Otto</button>`
    : `<button class="btn-primary" data-act="${plan ? 'next' : 'kickoff'}">${svg('play')} ${plan ? 'Keep going' : 'Start building'}</button>`;
  c.innerHTML = `
    <div class="card">
      <div class="card-main">
        <span class="otto otto-lg ${S.running ? 'think' : ''}"><i></i></span>
        <p class="eyebrow">${label}</p>
        <div class="carousel" id="carousel"></div>
        <div class="dots">${steps.map((_, i) => `<span class="${i ? '' : 'on'}"></span>`).join('')}</div>
        ${button}
      </div>
      <div class="chips">
        <button class="chip" data-chip="questions">${svg('hand')}<span>Questions</span><b>${s.questions === 'decide' ? 'Decide for me' : 'Ask me'}</b></button>
        <button class="chip" data-chip="budget">${svg('coins')}<span>Budget per run</span><b>${money(s.budget)} cap</b></button>
        <button class="chip" data-chip="power">${svg('bolt')}<span>Power</span><b>${{ quick: 'Quick', standard: 'Standard', max: 'Max' }[s.power] || 'Standard'}</b></button>
      </div>
    </div>`;
  let i = 0;
  const show = () => {
    const [text, app] = steps[i % steps.length];
    $('#carousel').innerHTML = `<div class="carousel-item"><span class="carousel-ico" style="background:${grad(app)}">${svg(APPS[app].icon)}</span><span class="carousel-text">${esc(text)}</span></div>`;
    $$('.dots span', c).forEach((d, k) => d.classList.toggle('on', k === i % steps.length));
  };
  show();
  if (steps.length > 1) carouselTimer = setInterval(() => { i++; show(); }, 2600);
  c.onclick = async e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    const chip = e.target.closest('[data-chip]')?.dataset.chip;
    if (act === 'stop') return stopRun();
    if (act) return startRun(act);
    if (chip) {
      const next = {
        questions: { questions: s.questions === 'ask' ? 'decide' : 'ask' },
        budget: { budget: [1, 3, 5, 10][([1, 3, 5, 10].indexOf(Number(s.budget)) + 1) % 4] },
        power: { power: { quick: 'standard', standard: 'max', max: 'quick' }[s.power] || 'standard' },
      }[chip];
      S.b.settings = await api(`/api/b/${S.slug}/settings`, { method: 'POST', body: next });
      renderCenter();
      renderApp('settings');
    }
  };
}

async function renderHome() {
  const c = $('#center');
  c.hidden = false;
  c.innerHTML = `
    <div class="card">
      <div class="card-main">
        <span class="otto otto-lg"><i></i></span>
        <h1 class="headline">Start a business tonight.<br><em>Pay nothing.</em></h1>
        <p class="sub">Tell Otto the idea. He builds the brand, website, research, launch posts, outreach and pitch deck while you watch.</p>
        <textarea class="idea" id="idea" placeholder="e.g. Heavyweight hoodies for night-shift nurses, sold in small drops"></textarea>
        <div class="examples">${EXAMPLES.map(x => `<button data-ex="${esc(x)}">${esc(x)}</button>`).join('')}</div>
        <button class="btn-primary" id="buildBtn">${svg('play')} Build it</button>
        <p class="small-print">Runs on the Claude Code you already have. No credits, no subscription, and every file is yours.</p>
      </div>
      <div class="recent" id="recent" hidden></div>
    </div>`;
  const idea = $('#idea');
  idea.focus();
  c.onclick = e => {
    const ex = e.target.closest('[data-ex]');
    if (ex) { idea.value = ex.dataset.ex; idea.focus(); }
    const open = e.target.closest('[data-slug]');
    if (open) location.hash = `#/b/${open.dataset.slug}`;
  };
  idea.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); create(); } };
  $('#buildBtn').onclick = create;
  async function create() {
    const text = idea.value.trim();
    if (!text) { idea.focus(); return; }
    $('#buildBtn').disabled = true;
    try {
      const { slug } = await api('/api/businesses', { method: 'POST', body: { idea: text } });
      location.hash = `#/b/${slug}`;
    } catch (e) { toast(esc(e.message), 'bad'); $('#buildBtn').disabled = false; }
  }
  try {
    const list = await api('/api/businesses');
    if (S.slug || !list.length) return;
    const r = $('#recent');
    r.hidden = false;
    r.innerHTML = `<div class="recent-title">Your businesses</div>${list.map(x => `
      <button data-slug="${x.slug}">
        <span class="biz-mark" style="width:28px;height:28px;border-radius:8px">${x.hasLogo ? `<img src="/b/${x.slug}/logo.svg" alt="">` : ''}</span>
        <span style="min-width:0"><b style="display:block">${esc(x.name || 'Untitled')}</b><span style="color:var(--faint);font-size:12px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.tagline || x.idea)}</span></span>
        ${x.running ? '<span class="pulse" style="margin-left:auto"></span>' : ''}
      </button>`).join('')}`;
  } catch { /* server not ready */ }
}

// ---------- rendering: apps ----------

function renderApp(app) {
  const w = wm.wins[app];
  if (!w || !APPS[app].render) return;
  const active = document.activeElement;
  if (active && w.body.contains(active) && /TEXTAREA|INPUT/.test(active.tagName) && app !== 'messages') return;
  APPS[app].render(w);
}
const emptyState = (text, think) => `<div class="empty"><div><span class="otto otto-sm ${think ? 'think' : ''}"><i></i></span><p>${text}</p></div></div>`;
const url = p => `/b/${S.slug}/${p}?v=${S.v}`;

APPS.messages.mount = w => {
  w.body.innerHTML = `<div class="chat"><div class="msgs"></div><form><input placeholder="Message Otto…" aria-label="Message Otto"><button class="tool-btn accent">Send</button></form></div>`;
  $('form', w.body).onsubmit = e => {
    e.preventDefault();
    const input = $('input', w.body);
    if (input.value.trim()) { sendMessage(input.value.trim()); input.value = ''; }
  };
};
APPS.messages.render = w => {
  const box = $('.msgs', w.body);
  box.innerHTML = S.messages.slice(-200).map(m => {
    if (m.who === 'q') {
      const open = S.ask?.id === m.id;
      return `<div class="msg q"><small>Otto asked</small>${esc(m.text)}${open ? '<div style="margin-top:8px"><button class="tool-btn accent" data-answer>Answer</button></div>' : ''}</div>`;
    }
    return `<div class="msg ${m.who}">${m.who === 'otto' ? md(m.text) : esc(m.text)}</div>`;
  }).join('') || emptyState('Say hi to Otto.');
  box.scrollTop = box.scrollHeight;
  box.onclick = e => { if (e.target.closest('[data-answer]')) showAsk(); };
  if (wm.isTop('messages')) S.unread = 0;
};

APPS.research.render = w => {
  const r = S.research;
  const report = S.b?.ws?.research;
  w.body.innerHTML = `
    <div class="tabs"><button data-tab="live" class="${r.tab === 'live' ? 'on' : ''}">Live searches (${r.searches.length})</button><button data-tab="report" class="${r.tab === 'report' ? 'on' : ''}">Report${report ? '' : ' (not yet)'}</button></div>
    ${r.tab === 'report'
      ? (report ? `<div class="prose">${md(report)}</div>` : emptyState('Otto writes the report after he’s searched.'))
      : (r.searches.length ? `<div class="searches">${r.searches.slice().reverse().map(s => `
        <div class="search ${s.pending ? 'pending' : ''}">
          <div class="search-q">${svg('search')}<span>${esc(s.query)}</span></div>
          ${s.links.length ? `<div class="links">${s.links.map((l, k) => `<a class="link" style="animation-delay:${k * 60}ms" href="${esc(l.url)}" target="_blank" rel="noopener"><img src="${esc(favicon(l.url))}" alt="" loading="lazy"><span class="link-title">${esc(l.title)}</span><span class="link-host">${esc(host(l.url))}</span></a>`).join('')}</div>` : ''}
        </div>`).join('')}</div>` : emptyState('When Otto searches the web, you’ll see it here.'))}`;
  w.body.onclick = e => {
    const t = e.target.closest('[data-tab]');
    if (t) { r.tab = t.dataset.tab; renderApp('research'); }
  };
};

APPS.browser.render = w => {
  const { pages, active } = S.browser;
  const p = pages.find(x => x.id === active) || pages[pages.length - 1];
  if (!p) { w.body.innerHTML = emptyState('Pages Otto reads show up here.'); return; }
  w.body.innerHTML = `
    <div class="browser">
      <div class="b-tabs">${pages.slice(-10).map(x => `<button class="b-tab ${x === p ? 'on' : ''}" data-id="${x.id}"><img src="${esc(favicon(x.url))}" alt=""><span>${esc(host(x.url))}</span></button>`).join('')}</div>
      <div class="b-addr"><div class="b-url">${svg('lock')}<span>${esc(p.url)}</span></div><a class="tool-btn" href="${esc(p.url)}" target="_blank" rel="noopener">${svg('external')} Open</a></div>
      ${p.pending ? '<div class="loading-bar"></div>' : ''}
      <div class="b-page">
        ${p.goal ? `<div class="b-goal">Otto is looking for: ${esc(p.goal)}</div>` : ''}
        ${p.pending ? '<div class="skeleton"><i></i><i></i><i></i><i></i><i></i></div>' : `<div class="prose" style="padding:0">${md(p.text || (p.failed ? 'Couldn’t read this page.' : ''))}</div>`}
      </div>
    </div>`;
  w.body.onclick = e => {
    const t = e.target.closest('[data-id]');
    if (t) { S.browser.active = t.dataset.id; renderApp('browser'); }
  };
};

APPS.build.mount = w => {
  w.body.innerHTML = `
    <div class="build">
      <div class="build-bar">
        <div class="build-file">${svg('file')}<b class="bf-name">site/index.html</b></div>
        <div class="seg" data-seg="device"><button data-d="desktop">Desktop</button><button data-d="mobile">Phone</button></div>
        <button class="tool-btn" data-act="code">Code</button>
        <a class="tool-btn" data-link="open" target="_blank" rel="noopener">${svg('external')} Open</a>
        <a class="tool-btn" data-link="zip">Download</a>
        <button class="tool-btn accent" data-act="publish">Publish</button>
      </div>
      <div class="build-split"><pre class="code"></pre><div class="preview"><div class="flash"></div></div></div>
    </div>`;
  w.body.onclick = e => {
    const d = e.target.closest('[data-d]')?.dataset.d;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (d) { S.build.device = d; renderApp('build'); }
    if (act === 'code') { S.build.showCode = !S.build.showCode; renderApp('build'); }
    if (act === 'publish') publishSite();
  };
};
APPS.build.render = w => {
  const B = S.build, has = S.b?.ws?.has?.site;
  $('.bf-name', w.body).textContent = B.file;
  $$('[data-d]', w.body).forEach(b => b.classList.toggle('on', b.dataset.d === B.device));
  $('[data-act="code"]', w.body).classList.toggle('accent', false);
  $('[data-act="code"]', w.body).textContent = B.showCode ? 'Hide code' : 'Code';
  const open = $('[data-link="open"]', w.body), zip = $('[data-link="zip"]', w.body), pub = $('[data-act="publish"]', w.body);
  open.href = S.b?.publishedUrl || `/b/${S.slug}/site/index.html`;
  zip.href = `/api/b/${S.slug}/export`;
  [open, zip, pub].forEach(x => { x.hidden = !has; });
  pub.textContent = S.b?.publishedUrl ? 'Update live site' : 'Publish';
  const split = $('.build-split', w.body);
  split.classList.toggle('no-code', !B.showCode);
  const preview = $('.preview', w.body);
  preview.classList.toggle('mobile', B.device === 'mobile');
  let frame = $('iframe', preview);
  if (!has) {
    frame?.remove();
    if (!$('.empty', preview)) preview.insertAdjacentHTML('afterbegin', emptyState(S.running ? 'Otto is about to build your site…' : 'No website yet.', S.running));
  } else {
    $('.empty', preview)?.remove();
    if (!frame) {
      frame = document.createElement('iframe');
      frame.title = 'Website preview';
      frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-modals');
      preview.prepend(frame);
    }
    if (frame.dataset.v !== String(B.v)) { frame.dataset.v = B.v; loadFrame(frame, 'site/index.html', 'site/'); }
    if (B.flash) { B.flash = false; const f = $('.flash', preview); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
    if (!B.typing && !B.loaded) {
      B.loaded = true;
      fetch(`/b/${S.slug}/${B.file}`).then(r => (r.ok ? r.text() : '')).then(t => { if (!B.typing && t) $('.code', w.body).innerHTML = highlightHTML(t); });
    }
  }
};
function buildShowCode(ev) {
  const w = wm.wins.build;
  if (!w) return;
  const B = S.build;
  B.file = ev.path || B.file;
  $('.bf-name', w.body).textContent = B.file;
  const pre = $('.code', w.body);
  cancelAnimationFrame(B.anim);
  if (ev.name === 'Edit') {
    B.typing = false;
    pre.innerHTML = `<span class="c">// Otto is editing ${esc(B.file)}</span>\n\n<span class="del">${esc(ev.input?.old_string || '')}</span><span class="ins">${esc(ev.input?.new_string || '')}</span>`;
    return;
  }
  const text = ev.input?.content || '';
  const total = text.length;
  const step = Math.max(24, Math.ceil(total / 150));
  const caret = '<span class="caret"></span>';
  let i = 0;
  B.typing = true;
  const tick = () => {
    i = Math.min(total, i + step);
    pre.innerHTML = esc(text.slice(0, i)) + caret;
    pre.scrollTop = pre.scrollHeight;
    if (i < total) B.anim = requestAnimationFrame(tick);
    else { B.typing = false; pre.innerHTML = /\.(html|svg)$/.test(B.file) ? highlightHTML(text) : esc(text); }
  };
  tick();
}

APPS.brand.render = w => {
  const br = S.b?.ws?.brand;
  if (!br || br._invalid) { w.body.innerHTML = emptyState(br?._invalid ? 'brand.json has a problem. Try “Fix” in Settings.' : (S.running ? 'Otto is working on your brand…' : 'No brand yet.'), S.running); return; }
  const col = br.colors || {};
  const fonts = br.fonts || {};
  for (const f of [fonts.display, fonts.body].filter(Boolean)) loadFont(f);
  w.body.innerHTML = `
    <div class="brand">
      <div class="brand-hero" style="background:${esc(col.background || '#fff')};color:${esc(col.ink || '#111')}">
        ${S.b.ws.has.logo ? `<img src="${url('logo.svg')}" alt="${esc(br.name)} logo">` : ''}
        <div class="brand-tag" style="font-family:'${esc(fonts.display || '')}',serif">${esc(br.tagline || '')}</div>
      </div>
      <div class="swatches">${Object.entries(col).map(([k, v]) => `<button class="swatch" data-copy="${esc(v)}" title="Copy ${esc(v)}"><i style="background:${esc(v)}"></i><span><b>${esc(k)}</b>${esc(v)}</span></button>`).join('')}</div>
      <div class="fonts">${[['Display', fonts.display], ['Body', fonts.body]].filter(x => x[1]).map(([k, f]) => `<div class="font-card"><div class="aa" style="font-family:'${esc(f)}'">Aa</div><b style="font-family:'${esc(f)}'">${esc(f)}</b><br><span>${k}</span></div>`).join('')}</div>
      <dl class="kv">
        ${br.description ? `<dt>About</dt><dd>${esc(br.description)}</dd>` : ''}
        ${br.audience ? `<dt>Audience</dt><dd>${esc(br.audience)}</dd>` : ''}
        ${br.voice ? `<dt>Voice</dt><dd>${esc(br.voice)}</dd>` : ''}
        ${Array.isArray(br.domain_ideas) && br.domain_ideas.length ? `<dt>Domains</dt><dd>${br.domain_ideas.map(esc).join(' · ')}</dd>` : ''}
      </dl>
    </div>`;
  w.body.onclick = e => {
    const c = e.target.closest('[data-copy]');
    if (c) { navigator.clipboard?.writeText(c.dataset.copy); toast(`Copied ${esc(c.dataset.copy)}`); }
  };
};
const loadedFonts = new Set();
function loadFont(f) {
  if (loadedFonts.has(f)) return;
  loadedFonts.add(f);
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;700&display=swap`;
  document.head.append(l);
}

function queueHead(list, noun) {
  const n = pendingCount(list);
  return `<div class="queue-head">${n ? `<span class="pill pending">${n} waiting for your OK</span>` : '<span class="pill">All reviewed</span>'}<span>Nothing goes out until you send it.</span></div>`;
}
const intent = (net, text) => ({
  x: `https://x.com/intent/post?text=${encodeURIComponent(text)}`,
  twitter: `https://x.com/intent/post?text=${encodeURIComponent(text)}`,
  linkedin: `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`,
  threads: `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`,
  facebook: null, instagram: null, reddit: null, tiktok: null,
}[net] || null);

APPS.social.render = w => {
  const posts = S.b?.ws?.posts;
  if (!Array.isArray(posts) || !posts.length) { w.body.innerHTML = emptyState(posts?._invalid ? 'posts.json has a problem. Try “Fix” in Settings.' : (S.running ? 'Otto is writing launch posts…' : 'No posts yet.'), S.running); return; }
  w.body.innerHTML = `<div class="queue">${queueHead(posts)}${posts.map(p => {
    const st = p.status || 'pending', net = String(p.network || '').toLowerCase();
    return `<div class="item ${st}" data-id="${esc(p.id)}">
      <div class="item-head"><span class="net">${esc(NET[net] || p.network || 'Post')}</span><span class="pill ${st}">${st}</span></div>
      <div class="post-grid">${p.image ? `<img src="${url(p.image)}" alt="Post image" onerror="this.style.visibility='hidden'">` : '<div></div>'}<textarea class="edit" data-field="text">${esc(p.text || '')}</textarea></div>
      <div class="item-actions">
        ${st === 'pending' ? `<button class="tool-btn" data-act="skipped">Skip</button><button class="tool-btn accent" data-act="approved">${intent(net, '') ? 'Approve & post' : 'Approve & copy'}</button>` : ''}
        ${st === 'approved' ? `<button class="tool-btn" data-act="pending">Undo</button><button class="tool-btn accent" data-act="post">${intent(net, '') ? 'Post it' : 'Copy text'}</button>` : ''}
        ${st === 'skipped' ? '<button class="tool-btn" data-act="pending">Restore</button>' : ''}
      </div></div>`;
  }).join('')}</div>`;
  bindQueue(w, 'posts', (item, fields) => {
    const net = String(item.network || '').toLowerCase();
    const link = intent(net, fields.text);
    if (link) window.open(link, '_blank', 'noopener');
    else { navigator.clipboard?.writeText(fields.text); toast(`Copied. Paste it into ${esc(NET[net] || 'the app')}${item.image ? ' and attach the image' : ''}.`); }
  });
};

function ownerName() {
  let n = store.get('owner', '');
  if (!n) { n = (prompt('Your name, to sign the email:') || '').trim(); if (n) store.set('owner', n); }
  return n || '{{owner}}';
}
APPS.outreach.render = w => {
  const list = S.b?.ws?.outreach;
  if (!Array.isArray(list) || !list.length) { w.body.innerHTML = emptyState(list?._invalid ? 'outreach.json has a problem. Try “Fix” in Settings.' : (S.running ? 'Otto is finding people to reach out to…' : 'No outreach yet.'), S.running); return; }
  w.body.innerHTML = `<div class="queue">${queueHead(list)}${list.map(o => {
    const st = o.status || 'pending';
    return `<div class="item ${st}" data-id="${esc(o.id)}">
      <div class="item-head"><b>${esc(o.name || o.org)}</b>${o.org && o.org !== o.name ? `<span style="color:var(--muted)">${esc(o.org)}</span>` : ''}<span class="pill ${st}" style="margin-left:auto">${st}</span></div>
      ${o.why ? `<div class="item-why">${esc(o.why)}</div>` : ''}
      <div class="contact">${o.email ? `<span>${svg('mail').replace('<svg', '<svg width="12" height="12"')} ${esc(o.email)}</span>` : ''}${o.contact_url ? `<a href="${esc(o.contact_url)}" target="_blank" rel="noopener">${esc(host(o.contact_url))}</a>` : ''}</div>
      <input class="edit" data-field="subject" value="${esc(o.subject || '')}" aria-label="Subject">
      <textarea class="edit" data-field="body" style="min-height:140px">${esc(o.body || '')}</textarea>
      <div class="item-actions">
        ${st === 'pending' ? `<button class="tool-btn" data-act="skipped">Skip</button><button class="tool-btn accent" data-act="approved">Approve & open email</button>` : ''}
        ${st === 'approved' ? '<button class="tool-btn" data-act="pending">Undo</button><button class="tool-btn accent" data-act="post">Open email</button>' : ''}
        ${st === 'skipped' ? '<button class="tool-btn" data-act="pending">Restore</button>' : ''}
      </div></div>`;
  }).join('')}</div>`;
  bindQueue(w, 'outreach', (item, fields) => {
    const body = fields.body.replaceAll('{{owner}}', ownerName());
    if (item.email) location.href = `mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent(fields.subject)}&body=${encodeURIComponent(body)}`;
    else {
      navigator.clipboard?.writeText(`${fields.subject}\n\n${body}`);
      if (item.contact_url) window.open(item.contact_url, '_blank', 'noopener');
      toast('No public email, so the message is copied. Paste it into their contact form.');
    }
  });
};

function bindQueue(w, file, send) {
  const list = S.b.ws[file];
  w.body.onclick = async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const card = btn.closest('[data-id]');
    const item = list.find(x => String(x.id) === card.dataset.id);
    const fields = {};
    $$('[data-field]', card).forEach(f => { fields[f.dataset.field] = f.value; });
    const act = btn.dataset.act;
    try {
      if (act === 'post') { send(item, fields); return; }
      const saved = await api(`/api/b/${S.slug}/review`, { method: 'POST', body: { file, id: item.id, status: act, patch: fields } });
      Object.assign(item, saved);
      if (act === 'approved') send(item, fields);
      renderApp(w.app);
      renderDock();
    } catch (err) { toast(esc(err.message), 'bad'); }
  };
  w.body.onfocusout = async e => {
    const f = e.target.closest('[data-field]');
    if (!f) return;
    const card = f.closest('[data-id]');
    const item = list.find(x => String(x.id) === card.dataset.id);
    if (!item || item[f.dataset.field] === f.value) return;
    item[f.dataset.field] = f.value;
    api(`/api/b/${S.slug}/review`, { method: 'POST', body: { file, id: item.id, patch: { [f.dataset.field]: f.value } } }).catch(() => {});
  };
}

APPS.deck.render = w => {
  if (!S.b?.ws?.has?.deck) { w.body.innerHTML = emptyState(S.running ? 'Otto is making your deck…' : 'No deck yet.', S.running); return; }
  let frame = $('iframe', w.body);
  if (!frame) {
    w.body.innerHTML = `<div class="frame-wrap"><div class="frame-bar"><span style="color:var(--muted);font-size:12px;margin-right:auto">Click the slide, then use ← → to move</span><a class="tool-btn" href="/b/${S.slug}/deck.html" target="_blank" rel="noopener">${svg('external')} Present / PDF</a></div><iframe class="frame" title="Deck" sandbox="allow-scripts allow-popups"></iframe></div>`;
    frame = $('iframe', w.body);
  }
  if (frame.dataset.v !== String(S.deckV)) { frame.dataset.v = S.deckV; loadFrame(frame, 'deck.html', ''); }
};

// Previews load as srcdoc rather than navigating the frame: some embedded browsers block
// iframes that navigate to localhost, and srcdoc also swaps in without a flash.
async function loadFrame(frame, path, base) {
  const res = await fetch(`/b/${S.slug}/${path}?v=${Date.now()}`).catch(() => null);
  if (!res?.ok) return;
  const inject = `<base href="${location.origin}/b/${S.slug}/${base}" target="_blank"><script>document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;e.preventDefault();const t=document.getElementById(a.getAttribute('href').slice(1));if(t)t.scrollIntoView({behavior:'smooth'})});<\/script>`;
  const html = await inlineImages(await res.text(), `${location.origin}/b/${S.slug}/${base}`);
  frame.srcdoc = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + inject) : inject + html;
}

// The same browsers block a sandboxed frame's own requests to localhost, so local images ride along as data URLs.
async function inlineImages(html, baseUrl) {
  const refs = new Set([...html.matchAll(/\b(?:src|href)="(?!https?:|data:|#|mailto:|tel:|\/\/)([^"]+\.(?:svg|png|jpe?g|webp|gif|ico))"/gi)].map(m => m[1]));
  for (const ref of refs) {
    try {
      const r = await fetch(new URL(ref, baseUrl));
      if (!r.ok) continue;
      const blob = await r.blob();
      const data = await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(blob); });
      html = html.split(`"${ref}"`).join(`"${data}"`);
    } catch { /* leave the reference as is */ }
  }
  return html;
}

APPS.sheets.render = w => {
  const t = S.b?.ws?.sheet;
  if (!t) { w.body.innerHTML = emptyState(S.running ? 'Otto is running the numbers…' : 'No numbers yet.', S.running); return; }
  const rows = csv(t);
  const [head = [], ...body] = rows;
  const num = v => /^\s*-?\$?\(?[\d,]+(\.\d+)?\)?%?\s*$/.test(v);
  w.body.innerHTML = `<div class="sheet"><div style="display:flex;justify-content:flex-end;margin-bottom:8px"><a class="tool-btn" href="/b/${S.slug}/sheet.csv" download>Download CSV</a></div>
    <table><thead><tr>${head.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td class="${num(c) ? 'num' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
};

APPS.files.render = w => {
  const files = S.b?.ws?.files || [];
  if (!files.length) { w.body.innerHTML = emptyState('Nothing here yet.'); return; }
  const size = n => (n > 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);
  w.body.innerHTML = `<div class="files">${files.map(f => `<button class="file" data-path="${esc(f.path)}">${svg(f.path.includes('/') ? 'folder' : 'file')}<span>${esc(f.path)}</span><span>${size(f.size)}</span></button>`).join('')}</div>`;
  w.body.onclick = e => {
    const p = e.target.closest('[data-path]')?.dataset.path;
    if (!p) return;
    const app = appForPath(p);
    if (app && app !== 'files' && app !== 'plan') wm.open(app);
    else window.open(`/b/${S.slug}/${p}`, '_blank', 'noopener');
  };
};

APPS.settings.render = w => {
  const s = S.b?.settings || {};
  const b = S.b || {};
  const seg = (key, opts) => `<div class="seg" data-key="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(s[key]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  w.body.innerHTML = `
    <div class="settings">
      <div class="field"><label>Questions</label>${seg('questions', [['ask', 'Ask me'], ['decide', 'Decide for me']])}<p>When a decision is yours to make, Otto stops and asks, or makes the call himself.</p></div>
      <div class="field"><label>Power</label>${seg('power', [['quick', 'Quick'], ['standard', 'Standard'], ['max', 'Max']])}<p>Quick and Standard run Sonnet; Max runs Opus with deeper thinking.</p></div>
      <div class="field"><label>Budget per run: <span id="budgetVal">${money(s.budget)}</span></label><input type="range" min="0.5" max="10" step="0.5" value="${s.budget}" id="budget"><p>A cap on each run, measured at API prices. Otto stops when he hits it.</p></div>
      <div class="field"><label>Your name</label><input type="text" id="owner" value="${esc(store.get('owner', ''))}" placeholder="Used to sign outreach emails"></div>
      <div class="field"><label>Website</label><p>${b.publishedUrl ? `Live at <a href="${esc(b.publishedUrl)}" target="_blank" rel="noopener">${esc(b.publishedUrl)}</a>` : 'Not published yet. Publish puts it on GitHub Pages under your account, free.'}</p></div>
      <div class="field"><label>Repair</label><div><button class="tool-btn" data-act="fix">${svg('wrench')} Check and fix everything</button></div><p>Otto checks every file for broken bits and fixes them. No daily limit.</p></div>
      <div class="field"><label>Danger zone</label><div><button class="tool-btn danger" data-act="archive">Archive this business</button></div><p>Moves it to businesses/.archive. Nothing is deleted.</p></div>
      <p style="color:var(--faint);font-size:12px;margin:0">${b.runs || 0} runs · ${money(b.apiCost)} of API value · ${paid()}</p>
    </div>`;
  w.body.onclick = async e => {
    const segBtn = e.target.closest('[data-v]');
    if (segBtn) {
      const key = segBtn.closest('[data-key]').dataset.key;
      S.b.settings = await api(`/api/b/${S.slug}/settings`, { method: 'POST', body: { [key]: segBtn.dataset.v } });
      renderApp('settings');
      renderCenter();
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'fix') startRun('fix');
    if (act === 'archive' && confirm('Archive this business? It moves to businesses/.archive and can be restored by moving it back.')) {
      try { await api(`/api/b/${S.slug}/archive`, { method: 'POST' }); location.hash = ''; } catch (err) { toast(esc(err.message), 'bad'); }
    }
  };
  $('#budget', w.body).oninput = e => { $('#budgetVal').textContent = money(e.target.value); };
  $('#budget', w.body).onchange = async e => {
    S.b.settings = await api(`/api/b/${S.slug}/settings`, { method: 'POST', body: { budget: Number(e.target.value) } });
    renderCenter();
  };
  $('#owner', w.body).onchange = e => store.set('owner', e.target.value.trim());
};

// ---------- actions ----------

async function startRun(kind, message) {
  try {
    await api(`/api/b/${S.slug}/run`, { method: 'POST', body: { kind, message } });
  } catch (e) { toast(esc(e.message), 'bad'); }
}
async function sendMessage(text) {
  if (S.running) {
    S.queued = text;
    toast('Otto is mid-run. Your message goes to him as soon as he finishes.');
    return;
  }
  await startRun('chat', text);
}
async function stopRun() {
  try { await api(`/api/b/${S.slug}/stop`, { method: 'POST' }); } catch (e) { toast(esc(e.message), 'bad'); }
}
async function publishSite() {
  const again = !!S.b?.publishedUrl;
  if (!again && !confirm('Publish this website publicly?\n\nGarage creates a public GitHub repo under your account and turns on GitHub Pages (free).')) return;
  toast(again ? 'Updating the live site…' : 'Publishing…');
  try {
    const { url: live } = await api(`/api/b/${S.slug}/publish`, { method: 'POST' });
    S.b.publishedUrl = live;
    renderApp('build');
  } catch (e) { toast(`Publish failed: ${esc(e.message)}`, 'bad', 10000); }
}

$('#stopBtn').onclick = e => { e.stopPropagation(); stopRun(); };
$('#status').onclick = () => { if (S.ask) showAsk(); };
$('#command').onsubmit = e => {
  e.preventDefault();
  const input = $('#commandInput');
  const text = input.value.trim();
  if (!text || !S.slug) return;
  input.value = '';
  sendMessage(text);
};

// ---------- ask card ----------

function showAsk() {
  const a = S.ask;
  if (!a) return;
  const layer = $('#askLayer');
  layer.hidden = false;
  layer.innerHTML = `
    <div class="ask" role="dialog" aria-modal="true" aria-labelledby="askQ">
      <span class="otto otto-lg wait"><i></i></span>
      <p class="eyebrow">Otto needs you</p>
      <h2 id="askQ">${esc(a.question)}</h2>
      ${a.why ? `<p class="why">${esc(a.why)}</p>` : '<p class="why"></p>'}
      ${a.options?.length ? `<div class="ask-options">${a.options.map((o, i) => `<button data-i="${i}"><kbd>${i + 1}</kbd><span>${esc(o)}</span></button>`).join('')}</div>` : ''}
      <form><input placeholder="${a.options?.length ? 'Or type your own answer…' : 'Type your answer…'}" aria-label="Your answer"><button class="tool-btn accent">Send</button></form>
      <button class="ask-later">Hide for now. Otto keeps waiting.</button>
    </div>`;
  const reply = async text => {
    if (!text) return;
    try { await api(`/api/b/${S.slug}/answer`, { method: 'POST', body: { id: a.id, answer: text } }); } catch (e) { toast(esc(e.message), 'bad'); }
  };
  layer.onclick = e => {
    const opt = e.target.closest('[data-i]');
    if (opt) reply(a.options[Number(opt.dataset.i)]);
    if (e.target.closest('.ask-later')) hideAsk();
  };
  $('form', layer).onsubmit = e => { e.preventDefault(); reply($('input', layer).value.trim()); };
  ($('.ask-options button', layer) || $('input', layer)).focus();
  renderTop();
}
function hideAsk() {
  $('#askLayer').hidden = true;
  $('#askLayer').innerHTML = '';
  renderTop();
  renderDock();
}
window.addEventListener('keydown', e => {
  if ($('#askLayer').hidden || !S.ask || e.target.tagName === 'INPUT') return;
  const n = Number(e.key);
  if (n >= 1 && n <= (S.ask.options?.length || 0)) $(`.ask-options [data-i="${n - 1}"]`)?.click();
  if (e.key === 'Escape') hideAsk();
});

let audio;
function ding() {
  try {
    audio ||= new AudioContext();
    const t = audio.currentTime;
    [660, 990].forEach((f, i) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.35);
      o.connect(g).connect(audio.destination);
      o.start(t + i * 0.12);
      o.stop(t + i * 0.12 + 0.4);
    });
  } catch { /* no audio */ }
}

// ---------- toasts ----------

function toast(html, kind = '', ms = 5200) {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `<span>${html}</span>`;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), ms);
  return el;
}
function sayToast(text) {
  const el = toast(`<b>Otto</b> ${mdInline(text.length > 200 ? `${text.slice(0, 200)}…` : text)}`, '', 7000);
  el.prepend(Object.assign(document.createElement('span'), { className: 'otto otto-sm', innerHTML: '<i></i>' }));
  el.style.cursor = 'pointer';
  el.onclick = e => { if (!e.target.closest('a')) { wm.open('messages'); el.remove(); } };
}

// ---------- business switcher ----------

$('#bizSwitch').onclick = async e => {
  e.stopPropagation();
  const menu = $('#bizMenu');
  if (!menu.hidden) { menu.hidden = true; return; }
  const list = await api('/api/businesses').catch(() => []);
  menu.innerHTML = `
    <button data-go="">${'<span class="mi-mark" style="background:var(--otto);color:#1b0f07">+</span>'}<span class="mi-text"><span class="mi-name">New business</span><span class="mi-sub">Start from an idea</span></span></button>
    ${list.length ? '<hr>' : ''}
    ${list.map(x => `<button data-go="${x.slug}" class="${x.slug === S.slug ? 'on' : ''}"><span class="mi-mark">${x.hasLogo ? `<img src="/b/${x.slug}/logo.svg" alt="">` : esc((x.name || '?')[0])}</span><span class="mi-text"><span class="mi-name">${esc(x.name || 'Untitled')}</span><span class="mi-sub">${x.running ? 'Otto is working' : esc(x.tagline || x.idea)}</span></span></button>`).join('')}`;
  menu.hidden = false;
  menu.onclick = ev => {
    const b = ev.target.closest('[data-go]');
    if (!b) return;
    menu.hidden = true;
    location.hash = b.dataset.go ? `#/b/${b.dataset.go}` : '';
  };
};
document.addEventListener('click', e => { if (!e.target.closest('#bizMenu')) $('#bizMenu').hidden = true; });

// ---------- routing ----------

async function openBusiness(slug) {
  S.es?.close();
  wm.closeAll();
  cursor.hide();
  hideAsk();
  S = fresh();
  S.slug = slug;
  let b;
  try { b = await api(`/api/b/${slug}`); } catch (e) { toast(esc(e.message), 'bad'); location.hash = ''; return; }
  if (S.slug !== slug) return;
  const { log, ...rest } = b;
  S.b = rest;
  for (const ev of log) apply(ev, false);
  S.running = b.running;
  if (!b.running) { for (const s of S.research.searches) s.pending = false; for (const p of S.browser.pages) p.pending = false; }
  S.ask = b.pendingAsk;
  S.unread = 0;
  $('#command').hidden = false;
  renderAll();
  if (b.ws.has.site) wm.open('build', { focus: false });
  if (S.running || S.messages.length) wm.open('messages');
  if (S.ask) showAsk();
  connect(slug);
}

function connect(slug) {
  const es = new EventSource(`/api/b/${slug}/events`);
  S.es = es;
  let opened = false;
  es.onopen = () => { if (opened) refresh(); opened = true; };
  es.onmessage = e => {
    if (S.slug !== slug) return;
    try { apply(JSON.parse(e.data), true); } catch (err) { console.warn(err); }
  };
}

function showHome() {
  S.es?.close();
  wm.closeAll();
  cursor.hide();
  hideAsk();
  S = fresh();
  $('#command').hidden = true;
  $('#plan').hidden = true;
  renderTop();
  renderDock();
  renderHome();
}

function route() {
  const m = location.hash.match(/^#\/b\/([a-z0-9-]+)/);
  if (m) openBusiness(m[1]);
  else showHome();
}
window.addEventListener('hashchange', route);
route();
