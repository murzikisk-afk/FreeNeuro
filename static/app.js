/* FreeNeuro v3 — чаты, песочница, уточнение промпта, приоритеты моделей, память */
"use strict";

/* ================= иконки (SVG, без эмодзи) ================= */
const ICONS = {
  chats: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="7" cy="17" r="2"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',
  brain: '<svg viewBox="0 0 24 24"><path d="M12 4a3 3 0 00-3 3c0 .8.3 1.5.8 2A3 3 0 007 14a3 3 0 003 3c.8 0 1.5-.3 2-.8a3 3 0 002 .8 3 3 0 003-3 3 3 0 00-2.8-5A3 3 0 0012 4z"/><path d="M12 4v17"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  bot: '<svg viewBox="0 0 24 24"><rect x="5" y="9" width="14" height="10" rx="3"/><path d="M12 5v4"/><path d="M9 14h.01M15 14h.01"/><path d="M9 16.5h6"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M3 11l18-8-6 18-3-7-9-3z"/><path d="M12 12l9-9"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  photo: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M4 17l5-5 4 4 3-3 4 4"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M14 3v4h4"/></svg>',
  image: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M4 18l5-5 4 4 3-3 4 4"/></svg>',
  doc: '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 15h6"/></svg>',
  code: '<svg viewBox="0 0 24 24"><path d="M8 8l-4 4 4 4M16 8l4 4-4 4"/></svg>',
  archive: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M10 13h4"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 11l5 5 5-5"/><path d="M5 20h14"/></svg>',
  move: '<svg viewBox="0 0 24 24"><path d="M8 4H4v4M16 4h4v4M8 16H4v4M16 16h4v4"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 14V4M7 8l5-5 5 5"/><path d="M5 13v6a1 1 0 001 1h12a1 1 0 001-1v-6"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 14l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 10l6 6 6-6"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.4l6-.8z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 10-2.3 5.7"/><path d="M20 6v6h-6"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18"/></svg>',
  wand: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.9 2.4 2.4.9-2.4.9L19 21.6l-.9-2.4-2.4-.9 2.4-.9z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/></svg>',
  cycle: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 11-2.3-5.7"/><path d="M20 4v6h-6"/></svg>',
  feather: '<svg viewBox="0 0 24 24"><path d="M20 5c-5 0-9 3-9 9v6"/><path d="M11 14h8"/><path d="M4 21h7"/></svg>',
  diamond: '<svg viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 12L2 9z"/></svg>',
};
const ic = (name, cls) => `<span class="${cls || 'ic'}">${ICONS[name] || ''}</span>`;

/* ================= утилиты ================= */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const escAttr = esc;
function fmtSize(n) {
  if (n == null) return '';
  for (const u of ['Б', 'КБ', 'МБ', 'ГБ']) { if (n < 1024) return u === 'Б' ? n + ' ' + u : (n / 1024).toFixed(1).replace('.0', '') + ' ' + u; n /= 1024; }
  return (n / 1024).toFixed(1) + ' ТБ';
}
function fmtTime(ts) {
  const d = new Date(ts);
  const p = (x) => String(x).padStart(2, '0');
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  return (same ? '' : p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.') + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) || 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
let toastTimer = null;
function toast(msg, ms) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), ms || 2800);
}

/* ================= модалка ================= */
let modalResolve = null;
function openModal({ title, text, input, placeholder, value, okLabel }) {
  $('#modal-title').textContent = title || '';
  $('#modal-text').textContent = text || '';
  $('#modal-text').classList.toggle('hidden', !text);
  const inp = $('#modal-input');
  if (input) { inp.classList.remove('hidden'); inp.placeholder = placeholder || ''; inp.value = value || ''; setTimeout(() => inp.focus(), 60); }
  else inp.classList.add('hidden');
  $('#modal-ok').textContent = okLabel || 'ОК';
  $('#modal').classList.remove('hidden');
  $('#modal-veil').classList.remove('hidden');
  return new Promise((res) => { modalResolve = res; });
}
function closeModal(result) {
  $('#modal').classList.add('hidden');
  $('#modal-veil').classList.add('hidden');
  if (modalResolve) { modalResolve(result); modalResolve = null; }
}
$('#modal-ok').addEventListener('click', () => closeModal($('#modal-input').classList.contains('hidden') ? true : $('#modal-input').value.trim()));
$('#modal-cancel').addEventListener('click', () => closeModal(null));
$('#modal-veil').addEventListener('click', () => closeModal(null));

/* ================= шторка ================= */
function openSheet(title, bodyHTML) {
  $('#sheet-title').textContent = title;
  $('#sheet-body').innerHTML = bodyHTML;
  $('#sheet').classList.remove('hidden');
  $('#veil').classList.remove('hidden');
  $('#sheet-body').scrollTop = 0;
}
function closeSheet() {
  $('#sheet').classList.add('hidden');
  $('#veil').classList.add('hidden');
  $('#sheet-body').innerHTML = '';
}
$('#sheet-close').addEventListener('click', closeSheet);
$('#veil').addEventListener('click', closeSheet);

/* ================= markdown ================= */
function lineInline(s) {
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (a, t, u) => `<img class="img-out" src="${u}" alt="${esc(t)}">`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (a, t, u) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}
function blocks(s) {
  const lines = s.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    const h = ln.match(/^(#{1,6})\s+(.*)$/);
    if (h) { out.push(`<h${h[1].length}>${lineInline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^\s*([-*•])\s+/.test(ln)) {
      const items = [];
      while (i < lines.length && /^\s*([-*•])\s+/.test(lines[i])) items.push(lineInline(lines[i++].replace(/^\s*[-*•]\s+/, '')));
      out.push('<ul>' + items.map((x) => `<li>${x}</li>`).join('') + '</ul>');
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(ln)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lineInline(lines[i++].replace(/^\s*\d+[.)]\s+/, '')));
      out.push('<ol>' + items.map((x) => `<li>${x}</li>`).join('') + '</ol>');
      continue;
    }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(ln)) { out.push('<hr>'); i++; continue; }
    if (/^>\s?/.test(ln)) {
      const qs = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) qs.push(lineInline(lines[i++].replace(/^>\s?/, '')));
      out.push('<blockquote>' + qs.join('<br>') + '</blockquote>');
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(ln) && i + 1 < lines.length && /^\s*\|[\s:\-|]+\|\s*$/.test(lines[i + 1])) {
      const header = ln.trim().split('|').slice(1, -1).map((x) => x.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(lines[i++].trim().split('|').slice(1, -1).map((x) => x.trim()));
      out.push('<table><thead><tr>' + header.map((x) => `<th>${lineInline(x)}</th>`).join('') + '</tr></thead><tbody>' +
        rows.map((r) => '<tr>' + r.map((x) => `<td>${lineInline(x)}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }
    const ps = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6})\s/.test(lines[i]) && !/^\s*([-*•]|\d+[.)])\s/.test(lines[i]) && !/^>\s?/.test(lines[i]) && !/^\s*(\||---|\*\*\*)\s*$/.test(lines[i])) ps.push(lineInline(lines[i++]));
    if (ps.length) out.push('<p>' + ps.join('<br>') + '</p>');
    else i++;
  }
  return out.join('');
}
function renderMd(src) {
  if (!src) return '';
  const out = [];
  const re = /```([\w+-]*)[ \t]*\n?([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push(blocks(esc(src.slice(last, m.index))));
    const code = m[2].replace(/\n$/, '');
    out.push(`<pre><button class="copy-btn" data-code="${escAttr(code)}" title="Копировать">${ic('copy')}</button><code>${esc(code)}</code></pre>`);
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push(blocks(esc(src.slice(last))));
  return `<div class="md">${out.join('')}</div>`;
}

/* ================= состояние ================= */
const LS = { chats: 'fn_chats_v3', chatId: 'fn_chatid_v3', settings: 'fn_settings_v3', prefs: 'fn_prefs_v3' };
const DEFAULT_SETTINGS = {
  openrouter: [], groq: [], gemini: [], custom: [],
  system: '', temperature: 0.7, reasoning: 'medium',
};
const state = {
  chats: [], chatId: null, models: [], profiles: null,
  settings: null, prefs: null,
  profile: 'auto', model: 'auto', searchWeb: false, refine: false,
  busy: false, ctrl: null, attachments: [],
};
function loadLS(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
  catch (e) { return fallback; }
}
function saveLS(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* переполнение — игнорируем */ } }
function curChat() { return state.chats.find((c) => c.id === state.chatId) || null; }
function saveChats() {
  const slim = state.chats.map((c) => ({ ...c, messages: c.messages.slice(-200) }));
  saveLS(LS.chats, slim);
}
function keysObj() {
  const s = state.settings || DEFAULT_SETTINGS;
  return {
    openrouter: (s.openrouter || []).filter(Boolean),
    groq: (s.groq || []).filter(Boolean),
    gemini: (s.gemini || []).filter(Boolean),
    custom: (s.custom || []).map((r) => ({ ...r })).filter((r) => r.url),
  };
}
function effectiveModels() {
  const list = [];
  for (const m of state.models) list.push({ id: m.id, name: m.name, prov: m.provider_name || '', vision: m.vision, paid: m.paid, custom: false });
  for (const srv of ((state.settings || {}).custom || [])) {
    const nm = (srv.name || '').trim() || (srv.url || '').trim().slice(0, 12);
    for (const mod of (srv.models || '').split(',').map((s) => s.trim()).filter(Boolean))
      list.push({ id: 'custom:' + nm + ':' + mod, name: mod, prov: 'свой: ' + nm, vision: !!srv.vision, paid: !!srv.paid, custom: true });
  }
  return list;
}
function orderedModels() {
  const eff = effectiveModels();
  const ids = eff.map((m) => m.id);
  const order = ((state.prefs || {}).order || []).filter((id) => ids.includes(id));
  const rest = ids.filter((id) => !order.includes(id));
  return [...order, ...rest].map((id) => eff.find((m) => m.id === id));
}
function isDisabled(id) { return !!((state.prefs || {}).disabled || {})[id]; }
function modelName(id) {
  if (id === 'auto') return 'авто';
  const m = effectiveModels().find((x) => x.id === id);
  return m ? m.name : id;
}

/* ================= чаты ================= */
function migrateOld() {
  if (!localStorage.getItem(LS.settings)) {
    const old = loadLS('fn_settings2', null);
    if (old) { saveLS(LS.settings, { ...DEFAULT_SETTINGS, ...old }); }
  }
  if (!localStorage.getItem(LS.chats)) {
    const old = loadLS('fn_chat', null);
    if (Array.isArray(old) && old.length) {
      const chat = { id: uid(), title: 'Старый чат', summary: '', created: Date.now(), messages: old };
      saveLS(LS.chats, [chat]);
      saveLS(LS.chatId, chat.id);
    }
  }
}
function newChat() {
  const c = { id: uid(), title: 'Новый чат', summary: '', created: Date.now(), messages: [] };
  state.chats.unshift(c);
  state.chatId = c.id;
  saveChats(); saveLS(LS.chatId, c.id);
  renderHeader(); renderChat();
  closeSheet();
}
function switchChat(id) {
  state.chatId = id;
  saveLS(LS.chatId, id);
  renderHeader(); renderChat();
  closeSheet();
}
function autoTitle(msg) {
  const t = (msg.content || '').trim().replace(/\s+/g, ' ').slice(0, 32);
  return t || 'Чат';
}
function renderHeader() {
  const c = curChat();
  $('#chat-title').textContent = c ? c.title : 'FreeNeuro';
  $('#tb-model').textContent = state.profile !== 'auto'
    ? ((state.profiles || {})[state.profile] || {}).name || state.profile
    : (state.model === 'auto' ? 'Авто' : modelName(state.model));
}

/* ================= рендер чата ================= */
function msgHTML(m) {
  const isUser = m.role === 'user';
  let chips = '';
  if (Array.isArray(m.files) && m.files.length) {
    chips = m.files.map((f) => {
      const fname = f.name || f.path || '';
      const isImg = /\.(png|jpe?g|webp|gif|bmp)$/i.test(fname);
      if (isUser) {
        return `<span class="file-chip">${ic(isImg ? 'image' : 'file')}${esc(fname)}</span>`;
      }
      const dl = `/api/sandbox/download?chat=${encodeURIComponent(state.chatId)}&path=${encodeURIComponent(f.path || fname)}`;
      return `<span class="file-chip">${ic(isImg ? 'image' : 'file')}${esc(fname)} <a href="${dl}" download="${escAttr(fname)}" title="Скачать">${ic('download')}</a></span>`;
    }).join('');
  }
  let content = '';
  if (m.role === 'user') content = esc(m.content || '').replace(/\n/g, '<br>');
  else content = renderMd(m.content || '');
  const meta = m.role === 'bot'
    ? `<div class="meta">${chips}${m.model ? `<span class="model-tag">${esc(m.model)}</span>` : ''}<span>${fmtTime(m.ts)}</span></div>`
    : `<div class="meta">${chips}<span>${fmtTime(m.ts)}</span></div>`;
  return `<div class="msg ${isUser ? 'user' : 'bot'}${m.err ? ' err' : ''}" data-idx="">
    <div class="avatar">${ic(isUser ? 'user' : 'bot')}</div>
    <div class="body"><div class="bubble">${content}</div>${meta}</div></div>`;
}
function renderChat() {
  const c = curChat();
  const chatEl = $('#chat');
  if (!c || !c.messages.length) {
    chatEl.innerHTML = `<div class="empty-hint">${ic('bot')}<div>FreeNeuro — бесплатные нейросети на твоём телефоне.<br>
      <b>Песочница</b>: кнопка с папкой сверху — файлы хранятся на сервере,<br>нейросеть читает их сама (PDF, DOCX, XLSX, картинки, код).<br>
      <b>Уточнение промпта</b>: кнопка с волшебной палочкой — ИИ задаст вопросы<br>и соберёт правильный промпт до отправки.<br>
      Ключи и приоритеты моделей — в настройках.</div></div>`;
    return;
  }
  chatEl.innerHTML = c.messages.map((m, i) => msgHTML(m).replace('data-idx=""', `data-idx="${i}"`)).join('');
  chatEl.scrollTop = chatEl.scrollHeight;
  bindCopy();
}
function bindCopy() {
  $$('.copy-btn').forEach((b) => b.addEventListener('click', () => {
    const code = b.getAttribute('data-code') || '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => toast('Скопировано'), () => fallbackCopy(code));
    } else fallbackCopy(code);
  }));
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); toast('Скопировано'); } catch (e) { toast('Не удалось скопировать'); }
  ta.remove();
}
function scrollBottom(force) {
  const el = $('#chat');
  const near = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
  if (force || near) el.scrollTop = el.scrollHeight;
}

/* ================= сжатие истории ================= */
async function maybeSummarize() {
  const c = curChat();
  if (!c || c.messages.length < 50) return;
  const oldPart = c.messages.slice(0, c.messages.length - 25);
  const interesting = oldPart.filter((m) => m.role === 'user' || (m.role === 'bot' && !m.err));
  if (interesting.length < 6) { c.messages = c.messages.slice(-40); saveChats(); return; }
  try {
    const r = await fetch('/api/summarize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: interesting.slice(-30), keys: keysObj() }),
    });
    const j = await r.json();
    if (j.ok && j.summary) {
      c.summary = c.summary ? c.summary + '\n' + j.summary : j.summary;
      c.summary = c.summary.slice(-2500);
    }
  } catch (e) { /* тихо */ }
  c.messages = c.messages.slice(-25);
  saveChats();
}

/* ================= отправка ================= */
function liveBubble() {
  const el = document.createElement('div');
  el.className = 'msg bot';
  el.innerHTML = `<div class="avatar">${ic('bot')}</div>
    <div class="body">
      <div class="bubble"><div class="md"><span class="typing"><i></i><i></i><i></i></span></div></div>
      <div class="meta"><span class="model-tag"></span><span class="tool-hint"></span></div>
    </div>`;
  $('#chat').appendChild(el);
  scrollBottom(true);
  return {
    el, md: el.querySelector('.md'), tag: el.querySelector('.model-tag'),
    hint: el.querySelector('.tool-hint'), files: [],
  };
}
let renderTimer = null;
function updateLive(live, text) {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    live.md.innerHTML = renderMd(text) || '<span class="typing"><i></i><i></i><i></i></span>';
    scrollBottom();
  }, 60);
}
function liveChips(live) {
  return live.files.map((f) => {
    const isImg = /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name || f.path || '');
    const dl = `/api/sandbox/download?chat=${encodeURIComponent(state.chatId)}&path=${encodeURIComponent(f.path)}`;
    return `<span class="file-chip">${ic(isImg ? 'image' : 'file')}${esc(f.name)} <a href="${dl}" download="${escAttr(f.name)}" title="Скачать">${ic('download')}</a></span>`;
  }).join('');
}
async function send() {
  const input = $('#input');
  const text = input.value.trim();
  const files = state.attachments.map((a) => a.path);
  if ((!text && !files.length) || state.busy) return;
  if (!state.chatId) newChatSilent();
  const c = curChat();
  if (c.title === 'Новый чат') { c.title = autoTitle({ content: text || files[0] }); renderHeader(); }

  const fmeta = state.attachments.map((a) => ({ path: a.path, name: a.name }));
  c.messages.push({ role: 'user', content: text, files: fmeta, ts: Date.now() });
  state.attachments = []; renderAttachments();
  input.value = ''; autosize();
  const userEl = document.createElement('div');
  userEl.className = 'msg user';
  userEl.innerHTML = `<div class="avatar">${ic('user')}</div><div class="body"><div class="bubble">${esc(text).replace(/\n/g, '<br>') || ic('file')}</div></div>`;
  $('#chat').appendChild(userEl); scrollBottom(true);
  saveChats();

  const live = liveBubble();
  state.busy = true;
  setSendBtn();
  const ctrl = new AbortController();
  state.ctrl = ctrl;
  let acc = '';
  let liveModel = '';
  let done = false;

  const windowMsgs = c.messages.filter((m) => !m.err || m.role === 'user').slice(-40)
    .map((m) => ({ role: m.role, content: m.content }));

  const payload = {
    messages: windowMsgs,
    model: state.profile !== 'auto' ? state.profile : state.model,
    chat: state.chatId,
    keys: keysObj(),
    system: (state.settings || {}).system || '',
    temperature: (state.settings || {}).temperature,
    reasoning: (state.settings || {}).reasoning || 'medium',
    refine: state.refine,
    search: state.searchWeb,
    files,
    summary: c.summary || '',
    model_prefs: { order: ((state.prefs || {}).order || []), disabled: ((state.prefs || {}).disabled || {}) },
  };
  if (!payload.model_prefs.order.length) delete payload.model_prefs;

  function handle(ev) {
    switch (ev.t) {
      case 'start':
        liveModel = (ev.name || ev.id || '');
        live.tag.textContent = liveModel;
        if (ev.fallback) live.hint.textContent = 'без ключей — бесплатная модель';
        break;
      case 'switch':
        live.hint.textContent = 'переключился на ' + (ev.to || '');
        break;
      case 'tool':
        live.hint.textContent = 'инструмент: ' + (ev.name || '') + '…';
        break;
      case 'search':
        live.hint.textContent = 'нашёл ' + (ev.n || '') + ' результатов в интернете';
        break;
      case 'image': {
        const img = document.createElement('img');
        img.className = 'img-out';
        img.src = ev.url;
        img.alt = ev.prompt || 'картинка';
        live.md.appendChild(img);
        if (ev.file) live.files.push({ path: ev.file, name: ev.file });
        live.md.querySelectorAll('.file-chip').forEach((x) => x.remove());
        live.md.insertAdjacentHTML('beforeend', liveChips(live));
        break;
      }
      case 'file': {
        const f = { path: ev.path || ev.name, name: ev.name || ev.path };
        live.files.push(f);
        live.md.insertAdjacentHTML('beforeend', liveChips(live));
        break;
      }
      case 'delta':
        acc += ev.v;
        updateLive(live, acc);
        break;
      case 'done':
        done = true;
        liveModel = liveModel || ev.id || '';
        break;
      case 'error':
        acc = acc || '';
        done = true;
        live.err = ev.v || 'ошибка';
        break;
    }
  }

  try {
    const r = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: ctrl.signal,
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done: rd } = await reader.read();
      if (rd) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop();
      for (const part of parts) {
        for (const line of part.split('\n')) {
          if (line.startsWith('data: ')) {
            try { handle(JSON.parse(line.slice(6))); } catch (e) { /* битый чанк */ }
          }
        }
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError') { live.err = 'нет ответа: ' + e.message; done = true; }
  }
  state.busy = false;
  state.ctrl = null;
  setSendBtn();
  clearTimeout(renderTimer);

  let finalText = acc.trim();
  if (!done && !finalText && !live.files.length) {
    live.md.innerHTML = '<div class="md">остановлено</div>';
    finalText = live.err || 'остановлено';
  }
  live.md.innerHTML = renderMd(finalText) + (live.files.length ? liveChips(live) : '');
  live.hint.textContent = '';
  c.messages.push({
    role: 'assistant', content: finalText, model: liveModel,
    files: live.files, ts: Date.now(), err: !!live.err && !finalText,
  });
  saveChats();
  maybeSummarize();

  // режим уточнения: вытаскиваем готовый промпт
  if (state.refine) {
    let m = finalText.match(/```prompt\s*\n?([\s\S]*?)(```|$)/);
    let got = m ? m[1].trim() : '';
    if (!got) {
      const mm = finalText.match(/ИТОГОВЫЙ ПРОМПТ:\s*([\s\S]*)/i);
      got = mm ? mm[1].trim() : '';
    }
    if (got) {
      $('#input').value = got;
      autosize();
      setRefine(false);
      toast('Промпт готов — проверь и отправляй');
      $('#input').focus();
    }
  }
}
function setSendBtn() {
  const b = $('#btn-send');
  b.innerHTML = state.busy ? ic('stop') : ic('send');
  b.classList.toggle('on', state.busy);
}
$('#btn-send').addEventListener('click', () => {
  if (state.busy) { if (state.ctrl) state.ctrl.abort(); return; }
  send();
});
$('#input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});
function autosize() {
  const t = $('#input');
  t.style.height = 'auto';
  t.style.height = Math.min(t.scrollHeight, 130) + 'px';
}
$('#input').addEventListener('input', autosize);

/* ================= режим уточнения промпта ================= */
function setRefine(on) {
  state.refine = on;
  $('#refine-banner').classList.toggle('hidden', !on);
  $('#btn-refine').classList.toggle('on', on);
  $('#input').placeholder = on ? 'Опиши задачу — ИИ уточнит и соберёт промпт…' : 'Сообщение…';
}
$('#btn-refine').addEventListener('click', () => setRefine(!state.refine));
$('#btn-refine-off').addEventListener('click', () => setRefine(false));

/* ================= вложения (без сжатия) ================= */
function renderAttachments() {
  const box = $('#attachments');
  if (!state.attachments.length) { box.innerHTML = ''; box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  box.innerHTML = state.attachments.map((a, i) => {
    const img = /\.(png|jpe?g|webp|gif|bmp)$/i.test(a.name);
    return `<div class="att">${img ? `<img class="thumb" src="${a.url}">` : ic(a.sandbox ? 'folder' : 'file')}
      <span class="att-name">${esc(a.name)}</span>
      <button class="att-x" data-i="${i}">×</button></div>`;
  }).join('');
  box.querySelectorAll('.att-x').forEach((b) => b.addEventListener('click', () => {
    state.attachments.splice(+b.getAttribute('data-i'), 1);
    renderAttachments();
  }));
}
async function addAttachments(fileList, gallery) {
  const list = [...fileList];
  for (const f of list) {
    try {
      const fd = new FormData();
      fd.append('file', f, f.name);
      const r = await fetch('/api/sandbox/upload?chat=' + encodeURIComponent(state.chatId), { method: 'POST', body: fd });
      const j = await r.json();
      if (!j.ok) { toast('Не загрузилось: ' + (j.msg || '')); continue; }
      const isImg = /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name);
      state.attachments.push({ path: j.path || f.name, name: f.name, url: isImg ? URL.createObjectURL(f) : '', sandbox: false });
    } catch (e) {
      toast('Не удалось загрузить ' + f.name);
    }
  }
  renderAttachments();
  toast(gallery ? 'Фото в песочнице — без сжатия' : 'Файлы в песочнице чата', 1800);
}
$('#btn-file').addEventListener('click', () => $('#file-input').click());
$('#btn-photo').addEventListener('click', () => $('#photo-input').click());
$('#file-input').addEventListener('change', (e) => { addAttachments(e.target.files, false); e.target.value = ''; });
$('#photo-input').addEventListener('change', (e) => { addAttachments(e.target.files, true); e.target.value = ''; });

/* ================= песочница ================= */
function fileIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (/^(png|jpe?g|webp|gif|bmp|svg)$/.test(ext)) return 'image';
  if (/^(docx?|pdf|pptx?|xlsx?|odt|rtf)$/.test(ext)) return 'doc';
  if (/^(py|js|ts|java|c|cpp|cs|go|rs|html|css|json|xml|sh|sql|md)$/.test(ext)) return 'code';
  if (/^(zip|rar|7z|tar|gz)$/.test(ext)) return 'archive';
  return 'file';
}
function fileCls(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (/^(png|jpe?g|webp|gif|bmp|svg)$/.test(ext)) return 'img';
  if (/^(docx?|pdf|pptx?|xlsx?|odt|rtf)$/.test(ext)) return 'doc';
  if (/^(py|js|ts|java|c|cpp|cs|go|rs|html|css|json|xml|sh|sql|md)$/.test(ext)) return 'code';
  if (/^(zip|rar|7z|tar|gz)$/.test(ext)) return 'arc';
  return '';
}
async function loadSandboxList(insertMode) {
  try {
    const r = await fetch('/api/sandbox?chat=' + encodeURIComponent(state.chatId));
    const j = await r.json();
    const files = j.files || [];
    const body = $('#sandbox-list');
    if (!files.length) { body.innerHTML = '<div class="empty">Песочница пуста. Закинь файлы — нейросеть сможет их читать, а ты — скачивать и перемещать.</div>'; return; }
    body.innerHTML = files.map((f) => `
      <div class="row" data-path="${escAttr(f.path)}">
        <div class="ficon ${fileCls(f.name)}">${ic(fileIcon(f.name))}</div>
        <div class="grow"><div class="t1">${esc(f.path)}</div><div class="t2">${fmtSize(f.size)} · ${fmtTime(f.mtime * 1000)}</div></div>
        <div class="act">
          <button class="ic-btn act-chat" title="${insertMode ? 'Прикрепить к сообщению' : 'Вставить в чат'}">${ic('share')}</button>
          <button class="ic-btn act-dl" title="Скачать">${ic('download')}</button>
          <button class="ic-btn act-mv" title="Переместить / переименовать">${ic('move')}</button>
          <button class="ic-btn act-del" title="Удалить">${ic('trash')}</button>
        </div>
      </div>`).join('');
    body.querySelectorAll('.row').forEach((row) => {
      const path = row.getAttribute('data-path');
      row.querySelector('.act-chat').addEventListener('click', () => {
        if (insertMode) {
          const isImg = /\.(png|jpe?g|webp|gif|bmp)$/i.test(path);
          state.attachments.push({ path, name: path.split('/').pop(), url: '', sandbox: true });
          renderAttachments();
          closeSheet();
          toast('Файл прикреплён к сообщению');
        } else {
          toast('Попроси нейросеть: «прочитай файл ' + path + '» — или прикрепи его к сообщению');
        }
      });
      row.querySelector('.act-dl').addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = '/api/sandbox/download?chat=' + encodeURIComponent(state.chatId) + '&path=' + encodeURIComponent(path);
        a.download = path.split('/').pop();
        document.body.appendChild(a); a.click(); a.remove();
      });
      row.querySelector('.act-mv').addEventListener('click', async () => {
        const to = await openModal({ title: 'Переместить / переименовать', input: true, placeholder: 'новый путь, например docs/файл.txt', value: path, okLabel: 'Переместить' });
        if (!to) return;
        try {
          const r = await fetch('/api/sandbox/move?chat=' + encodeURIComponent(state.chatId), {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: path, to }),
          });
          const j = await r.json();
          toast(j.ok ? 'Перемещено' : (j.msg || 'Не удалось'));
          loadSandboxList(insertMode);
        } catch (e) { toast('Не удалось'); }
      });
      row.querySelector('.act-del').addEventListener('click', async () => {
        const ok = await openModal({ title: 'Удалить файл?', text: path, okLabel: 'Удалить' });
        if (!ok) return;
        try {
          const r = await fetch('/api/sandbox?chat=' + encodeURIComponent(state.chatId) + '&path=' + encodeURIComponent(path), { method: 'DELETE' });
          const j = await r.json();
          toast(j.ok ? 'Удалено' : (j.msg || 'Не удалось'));
          loadSandboxList(insertMode);
        } catch (e) { toast('Не удалось'); }
      });
      row.addEventListener('click', () => {
        if (/\.(png|jpe?g|webp|gif|bmp)$/i.test(path)) {
          $('#preview-img').src = '/api/sandbox/raw?chat=' + encodeURIComponent(state.chatId) + '&path=' + encodeURIComponent(path);
          $('#preview-veil').classList.remove('hidden');
        }
      });
    });
  } catch (e) {
    $('#sandbox-list').innerHTML = '<div class="empty">Не удалось получить список.</div>';
  }
}
function openSandbox(insertMode) {
  openSheet(insertMode ? 'Вставить файл из песочницы' : 'Песочница чата', `
    <div class="sand-tools">
      <span class="sand-path" title="${esc(curChat() ? curChat().title : '')}">${esc(curChat() ? curChat().title : '')}</span>
      <button class="btn mini" id="sand-up">${ic('plus')} Загрузить</button>
      <button class="btn mini ghost" id="sand-ref">${ic('refresh')}</button>
    </div>
    <div class="hint" style="margin-bottom:10px">Нейросеть читает файлы сама: PDF, DOCX, XLSX, PPTX, код, картинки (без сжатия). Закинь — и попроси в чате.</div>
    <div id="sandbox-list"></div>
    <input type="file" id="sand-file-input" hidden multiple>`);
  $('#sand-up').addEventListener('click', () => $('#sand-file-input').click());
  $('#sand-ref').addEventListener('click', () => loadSandboxList(insertMode));
  $('#sand-file-input').addEventListener('change', async (e) => {
    await addAttachments(e.target.files, false);
    $('#sand-file-input').value = '';
    loadSandboxList(insertMode);
  });
  loadSandboxList(insertMode);
}
$('#btn-sandbox').addEventListener('click', () => openSandbox(false));
$('#btn-sandbox-ins').addEventListener('click', () => openSandbox(true));
$('#preview-veil').addEventListener('click', () => $('#preview-veil').classList.add('hidden'));

/* ================= поиск в чате ================= */
function openSearch() {
  openSheet('Поиск в чате', `
    <input class="in" id="search-q" placeholder="Что ищем в этом чате?">
    <div class="search-results" id="search-res" style="margin-top:12px"></div>`);
  const q = $('#search-q');
  const res = $('#search-res');
  q.addEventListener('input', () => {
    const c = curChat();
    const t = q.value.trim().toLowerCase();
    if (!c || !t) { res.innerHTML = ''; return; }
    const hits = [];
    c.messages.forEach((m, i) => {
      const hay = (m.content || '').toLowerCase();
      let pos = hay.indexOf(t);
      if (pos < 0) return;
      let snippet = m.content.slice(Math.max(0, pos - 30), pos + t.length + 60);
      if (pos > 30) snippet = '…' + snippet;
      hits.push({ i, snippet, role: m.role });
    });
    if (!hits.length) { res.innerHTML = '<div class="empty">Ничего не нашлось.</div>'; return; }
    res.innerHTML = hits.slice(0, 30).map((h) => `
      <div class="row" data-i="${h.i}">
        <div class="ficon">${ic(h.role === 'user' ? 'user' : 'bot')}</div>
        <div class="grow"><div class="t1">Сообщение ${h.i + 1}</div><div class="t2 snippet">${esc(h.snippet)}</div></div>
      </div>`).join('');
    res.querySelectorAll('.row').forEach((row) => row.addEventListener('click', () => {
      const idx = +row.getAttribute('data-i');
      closeSheet();
      const el = $('#chat').querySelector(`.msg[data-idx="${idx}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('flash');
        setTimeout(() => el.classList.remove('flash'), 1600);
      }
    }));
  });
  setTimeout(() => q.focus(), 60);
}
$('#btn-search').addEventListener('click', openSearch);

/* ================= память ================= */
async function loadMemoryList() {
  const listEl = $('#mem-list');
  if (!listEl) return;
  try {
    const r = await fetch('/api/memory');
    const j = await r.json();
    const items = j.items || [];
    if (!items.length) { listEl.innerHTML = '<div class="empty">Память пуста. Нейросеть запоминает важное о тебе инструментом memory_add — или добавь вручную.</div>'; return; }
    listEl.innerHTML = items.map((it, i) => `
      <div class="row">
        <div class="ficon">${ic('brain')}</div>
        <div class="grow"><div class="t1" style="font-weight:400">${esc(it.text)}</div><div class="t2">${fmtTime(it.ts * 1000)}</div></div>
        <div class="act"><button class="ic-btn mem-del" data-i="${i}" title="Удалить">${ic('trash')}</button></div>
      </div>`).join('');
    listEl.querySelectorAll('.mem-del').forEach((b) => b.addEventListener('click', async () => {
      await fetch('/api/memory/' + b.getAttribute('data-i'), { method: 'DELETE' });
      loadMemoryList();
    }));
  } catch (e) { listEl.innerHTML = '<div class="empty">Не удалось загрузить память.</div>'; }
}
function openMemory() {
  openSheet('Память', `
    <input class="in" id="mem-add" placeholder="Что запомнить о тебе?">
    <button class="btn wide" id="mem-add-btn" style="margin:8px 0 4px">Добавить</button>
    <div class="sect">Записи</div>
    <div id="mem-list"></div>
    <div class="sect">Сжатие нейросетью</div>
    <button class="btn wide" id="mem-compress">Сжать память (объединить, убрать лишнее)</button>
    <button class="btn wide danger" id="mem-clear" style="margin-top:8px">Очистить память</button>`);
  $('#mem-add-btn').addEventListener('click', async () => {
    const t = $('#mem-add').value.trim();
    if (!t) return;
    await fetch('/api/memory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t }) });
    $('#mem-add').value = '';
    loadMemoryList();
  });
  $('#mem-compress').addEventListener('click', async () => {
    const b = $('#mem-compress');
    b.disabled = true; b.textContent = 'Сжимаю…';
    try {
      const r = await fetch('/api/memory/compress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: keysObj() }),
      });
      const j = await r.json();
      toast(j.ok ? j.msg : (j.msg || 'Не удалось'));
    } catch (e) { toast('Сжатие не удалось'); }
    b.disabled = false; b.textContent = 'Сжать память (объединить, убрать лишнее)';
    loadMemoryList();
  });
  $('#mem-clear').addEventListener('click', async () => {
    const ok = await openModal({ title: 'Очистить память?', text: 'Все записи будут удалены.', okLabel: 'Очистить' });
    if (!ok) return;
    await fetch('/api/memory', { method: 'DELETE' });
    loadMemoryList();
    toast('Память очищена');
  });
  loadMemoryList();
}
$('#btn-memory').addEventListener('click', openMemory);

/* ================= список чатов ================= */
function openChats() {
  const chats = state.chats;
  openSheet('Чаты', `
    <button class="btn wide" id="chat-new">${ic('plus')} Новый чат</button>
    <div class="sect">Мои чаты — у каждого своя песочница</div>
    <div id="chat-list">${chats.map((c) => `
      <div class="row${c.id === state.chatId ? ' on' : ''}" data-id="${c.id}">
        <div class="ficon">${ic('chats')}</div>
        <div class="grow"><div class="t1">${esc(c.title)}</div>
        <div class="t2">${c.messages.length} сообщений · ${fmtTime(c.created)}${c.summary ? ' · есть сжатие истории' : ''}</div></div>
        <div class="act">
          <button class="ic-btn act-ren" title="Переименовать">${ic('edit')}</button>
          <button class="ic-btn act-del" title="Удалить чат">${ic('trash')}</button>
        </div>
      </div>`).join('') || '<div class="empty">Чатов пока нет.</div>'}</div>`);
  $('#chat-new').addEventListener('click', newChat);
  const listEl = $('#chat-list');
  listEl.querySelectorAll('.row').forEach((row) => {
    const id = row.getAttribute('data-id');
    row.addEventListener('click', (e) => {
      if (e.target.closest('.act')) return;
      switchChat(id);
    });
    row.querySelector('.act-ren').addEventListener('click', async (e) => {
      e.stopPropagation();
      const c = state.chats.find((x) => x.id === id);
      const t = await openModal({ title: 'Название чата', input: true, value: c.title, okLabel: 'Сохранить' });
      if (t) { c.title = t; saveChats(); openChats(); renderHeader(); }
    });
    row.querySelector('.act-del').addEventListener('click', async (e) => {
      e.stopPropagation();
      const c = state.chats.find((x) => x.id === id);
      const ok = await openModal({ title: 'Удалить чат?', text: 'Сообщения и его песочница (файлы) будут потеряны.', okLabel: 'Удалить' });
      if (!ok) return;
      state.chats = state.chats.filter((x) => x.id !== id);
      if (state.chatId === id) {
        if (state.chats.length) state.chatId = state.chats[0].id;
        else { state.chats = []; state.chatId = null; newChatSilent(); }
      }
      saveChats(); saveLS(LS.chatId, state.chatId);
      renderHeader(); renderChat(); openChats();
    });
  });
}
$('#btn-chats').addEventListener('click', openChats);
$('#chat-title').addEventListener('click', openChats);

/* ================= профили и выбор модели ================= */
function renderChips() {
  const profs = state.profiles || { auto: { name: 'Авто' }, light: { name: 'Лёгкие' }, strong: { name: 'Сильные' } };
  const chips = $('#profile-chips');
  chips.innerHTML = ['auto', 'light', 'strong'].map((pid) => {
    const p = profs[pid] || { name: pid };
    return `<button class="chip${state.profile === pid ? ' on' : ''}" data-p="${pid}">${ic(p.icon || 'check')}${esc(p.name)}</button>`;
  }).join('');
  chips.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
    state.profile = b.getAttribute('data-p');
    renderChips(); renderHeader();
    if (state.profile !== 'auto') state.model = 'auto';
    updateModelChip();
  }));
  updateModelChip();
}
function updateModelChip() {
  const b = $('#btn-model');
  b.innerHTML = state.model === 'auto' ? 'Модель: авто' : esc(modelName(state.model));
}
function openPicker() {
  const eff = orderedModels();
  openSheet('Выбор модели', `
    <div class="hint" style="margin-bottom:10px">Список — от умных к простым. Приоритеты, выключение и свои модели — в настройках.</div>
    ${eff.map((m) => {
      const dis = isDisabled(m.id);
      const sel = state.model === m.id;
      return `<div class="row${dis ? ' dis' : ''}${sel ? ' on' : ''}" data-id="${escAttr(m.id)}">
        <div class="ficon">${ic(m.custom ? 'archive' : 'bot')}</div>
        <div class="grow"><div class="t1">${esc(m.name)}${m.vision ? ' · видит картинки' : ''}</div>
        <div class="t2">${esc(m.prov)}${m.paid ? ' · платная' : ''}${dis ? ' · выключена в настройках' : ''}</div></div>
        ${m.paid ? `<span class="t2" style="color:var(--warn)">$</span>` : ''}${dis ? `<span class="t2">выкл</span>` : (sel ? ic('check') : '')}
      </div>`;
    }).join('')}
    <button class="btn wide ghost" id="pick-auto" style="margin-top:6px">Авто (сам выбирает лучшую)</button>
    <button class="btn wide ghost" id="pick-refresh" style="margin-top:8px">${ic('refresh')} Обновить список с OpenRouter</button>`);
  $('#pick-auto').addEventListener('click', () => { state.model = 'auto'; updateModelChip(); closeSheet(); toast('Режим авто'); });
  $('#pick-refresh').addEventListener('click', async () => {
    const b = $('#pick-refresh');
    b.disabled = true; b.textContent = 'Проверяю цены на OpenRouter…';
    try {
      const r = await fetch('/api/models?refresh=1');
      const j = await r.json();
      state.models = j.models || [];
      state.profiles = j.profiles || null;
      const paidNow = state.models.filter((m) => m.paid).length;
      toast(paidNow ? 'Список обновлён. Платных теперь: ' + paidNow + ' — они не участвуют в авто' : 'Всё бесплатное, список обновлён');
      openPicker();
    } catch (e) { toast('Не удалось обновить список'); }
    b.disabled = false;
  });
  $('#sheet-body').querySelectorAll('.row[data-id]').forEach((row) => row.addEventListener('click', () => {
    const id = row.getAttribute('data-id');
    if (isDisabled(id)) { toast('Включи эту модель в настройках'); return; }
    const mm = effectiveModels().find((x) => x.id === id);
    if (mm && mm.paid) toast('Внимание: модель платная — нужны кредиты OpenRouter. В авто она не участвует.');
    state.profile = 'auto';
    renderChips(); updateModelChip(); renderHeader();
    closeSheet();
  }));
}
$('#btn-model').addEventListener('click', openPicker);
$('#btn-searchweb').addEventListener('click', () => {
  state.searchWeb = !state.searchWeb;
  $('#btn-searchweb').classList.toggle('on', state.searchWeb);
  toast(state.searchWeb ? 'Поиск в интернете включён' : 'Поиск в интернете выключен');
});

/* ================= настройки ================= */
function srvHTML(srv, i) {
  const nm = (srv.name || '').trim() || (srv.url || '').trim().slice(0, 12);
  return `<div class="srv" data-i="${i}">
    <div class="srv-head"><b>Сервер ${i + 1}</b>
      <button class="ic-btn sm srv-del" title="Удалить сервер">${ic('trash')}</button></div>
    <input class="in srv-name" placeholder="Название (например CometAPI)" value="${escAttr(srv.name || '')}">
    <input class="in srv-url" placeholder="Адрес OpenAI-совместимого API, например https://api.cometapi.com/v1" value="${escAttr(srv.url || '')}">
    <input class="in srv-key" placeholder="Ключ (необязательно)" value="${escAttr(srv.key || '')}">
    <div class="pair">
      <input class="in srv-models" placeholder="Модели через запятую, например gpt-4o,claude-3-5" value="${escAttr(srv.models || '')}">
      <button class="btn ghost srv-probe" title="Узнать модели с сервера">${ic('search')}</button>
    </div>
    <div class="chk-row"><input type="checkbox" class="srv-vision"${srv.vision ? ' checked' : ''}> <span>эти модели видят картинки</span></div>
    <div class="chk-row"><input type="checkbox" class="srv-paid"${srv.paid ? ' checked' : ''}> <span>модели платные — в авто-режим не пускать</span></div>
    <select class="in srv-probed hidden"><option value="">— модели с сервера —</option></select>
  </div>`;
}
function collectSettings() {
  const s = state.settings;
  s.openrouter = $('#set-or').value.split('\n').map((x) => x.trim()).filter(Boolean);
  s.groq = $('#set-groq').value.split('\n').map((x) => x.trim()).filter(Boolean);
  s.gemini = $('#set-gem').value.split('\n').map((x) => x.trim()).filter(Boolean);
  s.system = $('#set-sys').value;
  s.temperature = +$('#set-temp').value;
  s.reasoning = $('#set-reas').value;
  const customs = [];
  $$('#settings-form .srv').forEach((el) => {
    const name = el.querySelector('.srv-name').value.trim();
    const url = el.querySelector('.srv-url').value.trim();
    if (!url) return;
    customs.push({
      name, url,
      key: el.querySelector('.srv-key').value.trim(),
      models: el.querySelector('.srv-models').value,
      vision: el.querySelector('.srv-vision').checked,
      paid: el.querySelector('.srv-paid').checked,
    });
  });
  s.custom = customs;
  saveLS(LS.settings, s);
  return s;
}
function prioRowHTML(m, idx) {
  const dis = isDisabled(m.id);
  return `<div class="row prio-row${dis ? ' dis' : ''}" data-id="${escAttr(m.id)}">
    <span class="prio-pos">${idx + 1}</span>
    <div class="grow"><div class="t1">${esc(m.name)}</div><div class="t2">${esc(m.prov)}${m.vision ? ' · видит картинки' : ''}${m.paid ? ' · платная (в авто не участвует)' : ''}</div></div>
    <div class="act">
      <button class="ic-btn p-up" title="Выше">${ic('up')}</button>
      <button class="ic-btn p-down" title="Ниже">${ic('down')}</button>
      <button class="ic-btn p-top" title="В самый верх">${ic('star')}</button>
      <button class="ic-btn p-toggle${dis ? '' : ' on'}" title="Включена / выключена">${ic(dis ? 'close' : 'check')}</button>
    </div>
  </div>`;
}
function renderPrioList() {
  const list = orderedModels();
  const el = $('#prio-list');
  el.innerHTML = list.map(prioRowHTML).join('');
  el.querySelectorAll('.prio-row').forEach((row) => {
    const id = row.getAttribute('data-id');
    row.querySelector('.p-up').addEventListener('click', () => { movePrio(id, -1); renderPrioList(); });
    row.querySelector('.p-down').addEventListener('click', () => { movePrio(id, 1); renderPrioList(); });
    row.querySelector('.p-top').addEventListener('click', () => { movePrio(id, -999); renderPrioList(); });
    row.querySelector('.p-toggle').addEventListener('click', () => {
      state.prefs.disabled[id] = !state.prefs.disabled[id];
      if (!state.prefs.disabled[id]) delete state.prefs.disabled[id];
      renderPrioList();
    });
  });
}
function movePrio(id, dir) {
  const list = orderedModels().map((m) => m.id);
  const i = list.indexOf(id);
  if (i < 0) return;
  const j = Math.max(0, Math.min(list.length - 1, i + dir));
  list.splice(i, 1);
  list.splice(j, 0, id);
  state.prefs.order = list;
}
function openSettings() {
  const s = state.settings;
  openSheet('Настройки', `
    <div id="settings-form">
      <div class="sect">Ключи (по одному на строку — можно несколько)</div>
      <textarea class="in" id="set-or" rows="2" placeholder="OpenRouter: openrouter.ai/keys">${esc((s.openrouter || []).join('\n'))}</textarea>
      <div class="hint">Бесплатные ключи без карты — openrouter.ai/keys</div>
      <textarea class="in" id="set-groq" rows="2" placeholder="Groq: console.groq.com/keys" style="margin-top:8px">${esc((s.groq || []).join('\n'))}</textarea>
      <div class="hint">Groq — очень быстрые модели, бесплатные лимиты</div>
      <textarea class="in" id="set-gem" rows="2" placeholder="Gemini: aistudio.google.com/apikey" style="margin-top:8px">${esc((s.gemini || []).join('\n'))}</textarea>
      <div class="hint">Gemini — видит картинки, лимиты щедрые</div>

      <div class="sect">Свои серверы (OpenAI-совместимые, например CometAPI)</div>
      <div id="srv-list">${(s.custom || []).map(srvHTML).join('')}</div>
      <button class="btn wide ghost" id="srv-add">${ic('plus')} Добавить сервер</button>

      <div class="sect">Системный промпт (обучение ИИ — пиши, как ему себя вести)</div>
      <textarea class="in" id="set-sys" rows="4" placeholder="Твой личный system prompt…">${esc(s.system || '')}</textarea>

      <div class="sect">Сила размышлений</div>
      <select class="in" id="set-reas">
        <option value="low"${s.reasoning === 'low' ? ' selected' : ''}>Лёгкие — быстро и коротко</option>
        <option value="medium"${s.reasoning === 'medium' ? ' selected' : ''}>Средние — баланс</option>
        <option value="high"${s.reasoning === 'high' ? ' selected' : ''}>Сильные — по шагам, с проверкой</option>
      </select>
      <div class="range-row" style="margin-top:10px">
        <span class="t2">Температура</span>
        <input type="range" id="set-temp" min="0" max="1.5" step="0.1" value="${s.temperature ?? 0.7}">
        <span class="val" id="set-temp-val">${s.temperature ?? 0.7}</span>
      </div>

      <div class="sect">Приоритет моделей — умные сверху, простые снизу</div>
      <div class="hint" style="margin-bottom:8px">Переставляй стрелками, звёздочка — в самый верх. Выключенные не участвуют даже в авто-режиме.</div>
      <div id="prio-list"></div>
      <button class="btn wide ghost" id="prio-reset" style="margin-top:8px">${ic('refresh')} Сбросить приоритеты к стандартным</button>
    </div>
    <button class="btn wide" id="set-save" style="margin:14px 0 20px">Сохранить настройки</button>`);

  $('#set-temp').addEventListener('input', () => { $('#set-temp-val').textContent = $('#set-temp').value; });
  $('#srv-add').addEventListener('click', () => {
    state.settings.custom = state.settings.custom || [];
    state.settings.custom.push({ name: '', url: '', key: '', models: '', vision: false, paid: false });
    openSettings();
    const rows = $$('#settings-form .srv');
    rows[rows.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $$('#settings-form .srv').forEach((el) => {
    const i = +el.getAttribute('data-i');
    el.querySelector('.srv-del').addEventListener('click', () => {
      state.settings.custom.splice(i, 1);
      openSettings();
    });
    el.querySelector('.srv-probe').addEventListener('click', async () => {
      const url = el.querySelector('.srv-url').value.trim();
      const key = el.querySelector('.srv-key').value.trim();
      const sel = el.querySelector('.srv-probed');
      if (!url) { toast('Сначала впиши адрес сервера'); return; }
      sel.classList.remove('hidden');
      sel.innerHTML = '<option>проверяю…</option>';
      try {
        const r = await fetch('/api/probe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, key }) });
        const j = await r.json();
        if (j.ok && j.models && j.models.length) {
          sel.innerHTML = '<option value="">— выбери модель —</option>' + j.models.map((m) => `<option value="${escAttr(m)}">${esc(m)}</option>`).join('');
          toast('Нашёл ' + j.models.length + ' моделей');
        } else {
          sel.innerHTML = '<option value="">не удалось — впиши вручную</option>';
          toast('Не удалось: ' + (j.msg || 'сервер не ответил') + '. Впиши модели вручную');
        }
      } catch (e) {
        sel.innerHTML = '<option value="">не удалось — впиши вручную</option>';
        toast('Не удалось проверить. Впиши модели вручную');
      }
    });
    el.querySelector('.srv-probed').addEventListener('change', (e2) => {
      const v = e2.target.value;
      if (!v) return;
      const mi = el.querySelector('.srv-models');
      const cur = mi.value.split(',').map((x) => x.trim()).filter(Boolean);
      if (!cur.includes(v)) { cur.push(v); mi.value = cur.join(','); }
      toast('Модель добавлена: ' + v);
    });
  });
  renderPrioList();
  $('#prio-reset').addEventListener('click', () => {
    state.prefs = { order: effectiveModels().map((m) => m.id), disabled: {} };
    renderPrioList();
    toast('Приоритеты сброшены');
  });
  $('#set-save').addEventListener('click', () => {
    state.prefs.order = orderedModels().map((m) => m.id);
    saveLS(LS.prefs, state.prefs);
    collectSettings();
    toast('Сохранено');
    renderChips(); renderHeader();
    closeSheet();
  });
}
$('#btn-settings').addEventListener('click', openSettings);

/* ================= очистить чат ================= */
$('#btn-clear').addEventListener('click', async () => {
  const ok = await openModal({ title: 'Очистить чат?', text: 'Сообщения удалятся, файлы в песочнице останутся.', okLabel: 'Очистить' });
  if (!ok) return;
  const c = curChat();
  if (c) { c.messages = []; c.summary = ''; saveChats(); renderChat(); }
  toast('Чат очищен');
});

/* ================= запуск ================= */
function $$(sel, root) { return [...(root || document).querySelectorAll(sel)]; }
function newChatSilent() {
  const c = { id: uid(), title: 'Новый чат', summary: '', created: Date.now(), messages: [] };
  state.chats.push(c);
  state.chatId = c.id;
  saveChats(); saveLS(LS.chatId, c.id);
}
async function init() {
  migrateOld();
  state.settings = { ...DEFAULT_SETTINGS, ...loadLS(LS.settings, {}) };
  state.prefs = loadLS(LS.prefs, null) || { order: [], disabled: {} };
  state.chats = loadLS(LS.chats, []);
  state.chatId = loadLS(LS.chatId, null);
  if (!state.chats.length || !state.chats.find((c) => c.id === state.chatId)) {
    state.chats = state.chats.filter((c) => c.id === state.chatId);
    newChatSilent();
  }
  $('#btn-chats').innerHTML = ic('chats');
  $('#btn-settings').innerHTML = ic('settings');
  $('#btn-search').innerHTML = ic('search');
  $('#btn-sandbox').innerHTML = ic('folder');
  $('#btn-memory').innerHTML = ic('brain');
  $('#btn-clear').innerHTML = ic('trash');
  $('#btn-refine-off').innerHTML = ic('close');
  $('#btn-searchweb').innerHTML = ic('globe');
  $('#btn-refine').innerHTML = ic('wand');
  $('#btn-file').innerHTML = ic('plus');
  $('#btn-photo').innerHTML = ic('photo');
  $('#btn-sandbox-ins').innerHTML = ic('folder');
  $('#sheet-close').innerHTML = ic('close');
  setSendBtn();
  renderChips();
  renderHeader();
  renderChat();

  try {
    const r = await fetch('/api/models');
    const j = await r.json();
    state.models = j.models || [];
    state.profiles = j.profiles || null;
    renderChips();
    renderHeader();
    // фоново сверяем цены с OpenRouter (что платно, а что нет)
    fetch('/api/models?refresh=1').then((rr) => rr.json()).then((jj) => {
      state.models = jj.models || [];
      const paidNow = state.models.filter((m) => m.paid).length;
      if (paidNow) toast('Обновил список: ' + paidNow + ' моделей стали платными и отключены из авто');
      updateModelChip();
    }).catch(() => {});
  } catch (e) {
    toast('Сервер недоступен');
  }
  if (!state.settings.temperature) state.settings.temperature = 0.7;
  if (!state.settings.reasoning) state.settings.reasoning = 'medium';
}
init();
