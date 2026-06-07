/* ═══════════════════════════════════════════════
   DIGITAL CAMPFIRE — script.js
═══════════════════════════════════════════════ */

'use strict';

const API = '/api/messages';

// ─── Daily questions ────────────────────────────────────────────────────────
const DAILY_QUESTIONS = [
  "What is something you wish your younger self knew?",
  "What is a small victory you're proud of?",
  "What keeps you going on the hard days?",
  "What is a place that holds a special memory for you?",
  "What is the most beautiful thing you've witnessed this year?",
  "What advice would you give to someone who feels lost?",
  "What song always takes you somewhere else?",
  "What do you want to forgive yourself for?",
  "What made you smile unexpectedly recently?",
  "What dream are you quietly working toward?",
  "What is a kindness a stranger once showed you?",
  "If tonight were your last night by a campfire, what would you say?",
  "What is a lesson life taught you the hard way?",
  "What is something you're grateful for that most people take for granted?",
  "Who changed your life without knowing it?",
  "What is a fear you've faced that made you stronger?",
  "What is a moment you wish you could revisit?",
  "What simple thing brings you the most peace?",
  "What story about yourself do you tell most often?",
  "What does home mean to you?",
];

// ─── Category emoji map ──────────────────────────────────────────────────────
const CAT_EMOJI = {
  'Advice': '💡',
  'Confession': '🤫',
  'Dream': '🌙',
  'Memory': '📸',
  'Story': '📖',
  'Gratitude': '🙏',
  'Random Thought': '✨',
};

// ─── Favorites (local only — user preference) ─────────────────────────────────
const LS_KEY_FAVORITES = 'dc_favorites';
const LS_KEY_QUESTION  = 'dc_daily_question';
const LS_KEY_QDATE     = 'dc_daily_date';

function loadFavorites() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY_FAVORITES) || '[]')); }
  catch { return new Set(); }
}
function saveFavorites(set) {
  localStorage.setItem(LS_KEY_FAVORITES, JSON.stringify([...set]));
}

// ─── State ───────────────────────────────────────────────────────────────────
let messages     = [];
let favorites    = new Set();
let activeFilter = 'All';
let searchQuery  = '';
let currentOpenId = null;

// ─── Init ────────────────────────────────────────────────────────────────────
async function init() {
  favorites = loadFavorites();

  setupStars();
  setupEmbers();
  setupFireSparks();
  setupDailyQuestion();
  setupForm();
  setupSearch();
  setupFilters();
  setupScrollReveal();

  // Modal close
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-fav').addEventListener('click', () => toggleFavFromModal(currentOpenId));

  // Story overlay
  document.getElementById('story-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeStory();
  });
  document.getElementById('story-close').addEventListener('click', closeStory);
  document.getElementById('btn-another').addEventListener('click', showRandomStory);
  document.getElementById('story-fav').addEventListener('click', () => toggleFavFromModal(currentOpenId));

  document.getElementById('btn-random').addEventListener('click', showRandomStory);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeStory(); }
  });

  await fetchMessages();
}

// ─── API ─────────────────────────────────────────────────────────────────────
async function fetchMessages() {
  showGalleryLoading();
  try {
    const res  = await fetch(API);
    if (!res.ok) throw new Error('Server error');
    const data = await res.json();
    // Normalize field names from server
    messages = data.map(m => ({
      id:       m.id,
      text:     m.text,
      category: m.category,
      author:   m.alias,        // alias is the only name the server exposes
      ts:       m.created_at,
    }));
    renderGallery();
    renderFavorites();
  } catch (err) {
    console.error('Failed to load messages:', err);
    showToast('Could not load sparks — is the server running?');
    hideGalleryLoading();
  }
}

async function postMessage(text, category) {
  const res = await fetch(API, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text, category }),
  });
  if (!res.ok) throw new Error('Post failed');
  return res.json(); // { id, alias, created_at }
}

// ─── Stars canvas ────────────────────────────────────────────────────────────
function setupStars() {
  const canvas = document.getElementById('stars-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, stars = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.4 + 0.2,
      speed: Math.random() * 0.012 + 0.004,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => {
      const alpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(248, 250, 252, ${alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
}

// ─── Floating embers ──────────────────────────────────────────────────────────
function setupEmbers() {
  const container = document.getElementById('embers-container');
  const COUNT = 22;
  for (let i = 0; i < COUNT; i++) setTimeout(() => createEmber(container), i * 420);
}

function createEmber(container) {
  const ember = document.createElement('div');
  ember.className = 'ember';
  const size  = Math.random() * 4 + 2;
  const left  = 30 + Math.random() * 40;
  const dur   = 6 + Math.random() * 10;
  const delay = Math.random() * 4;
  const drift = (Math.random() - 0.5) * 120 + 'px';
  ember.style.cssText = `width:${size}px;height:${size}px;left:${left}%;bottom:30vh;--drift:${drift};animation-duration:${dur}s;animation-delay:${delay}s;`;
  container.appendChild(ember);
  ember.addEventListener('animationend', () => { ember.remove(); createEmber(container); });
}

// ─── Fire sparks ──────────────────────────────────────────────────────────────
function setupFireSparks() {
  const container = document.getElementById('fire-sparks');
  if (!container) return;

  function spawn() {
    const spark   = document.createElement('div');
    spark.className = 'fspark';
    const size    = Math.random() * 5 + 2;
    const startX  = 50 + (Math.random() - 0.5) * 60;
    const driftX  = (Math.random() - 0.5) * 90 + 'px';
    const riseY   = -(140 + Math.random() * 120) + 'px';
    const dur     = 0.9 + Math.random() * 1.2;
    const delay   = Math.random() * 0.5;
    const palette = ['#ffffff','#fff5cc','#FFE566','#FFD166','#FFA500','#FF8A00'];
    const colour  = palette[Math.floor(Math.random() * palette.length)];
    spark.style.cssText = `width:${size}px;height:${size}px;left:${startX}%;bottom:10px;background:${colour};box-shadow:0 0 ${size*2}px ${size}px ${colour}88;--fx:${driftX};--fy:${riseY};animation-duration:${dur}s;animation-delay:${delay}s;`;
    container.appendChild(spark);
    spark.addEventListener('animationend', () => spark.remove());
  }

  setInterval(spawn, 125);
}

// ─── Daily Question ───────────────────────────────────────────────────────────
function setupDailyQuestion() {
  const el    = document.getElementById('daily-question');
  const btn   = document.getElementById('btn-new-question');
  const today = new Date().toDateString();
  let question;

  if (localStorage.getItem(LS_KEY_QDATE) === today) {
    question = localStorage.getItem(LS_KEY_QUESTION) || pickQuestion();
  } else {
    question = pickQuestion();
    localStorage.setItem(LS_KEY_QUESTION, question);
    localStorage.setItem(LS_KEY_QDATE, today);
  }
  el.textContent = question;

  btn.addEventListener('click', () => {
    el.classList.add('fade');
    setTimeout(() => {
      const q = pickQuestion(el.textContent);
      el.textContent = q;
      localStorage.setItem(LS_KEY_QUESTION, q);
      el.classList.remove('fade');
    }, 350);
  });
}

function pickQuestion(current) {
  const pool = current ? DAILY_QUESTIONS.filter(q => q !== current) : DAILY_QUESTIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Share form ───────────────────────────────────────────────────────────────
function setupForm() {
  const form     = document.getElementById('share-form');
  const textarea = document.getElementById('msg-text');
  const charNum  = document.getElementById('char-num');

  textarea.addEventListener('input', () => { charNum.textContent = textarea.value.length; });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const text     = textarea.value.trim();
    const category = document.getElementById('msg-category').value;

    if (!text || !category) { showToast('Please fill in the category and message.'); return; }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Tossing…';

    try {
      const { id, alias, created_at } = await postMessage(text, category);

      // Optimistically add to local state
      messages.unshift({ id, text, category, author: alias, ts: created_at });
      form.reset();
      charNum.textContent = '0';
      renderGallery();
      renderFavorites();
      showToast('Your spark has been tossed into the fire 🔥');
      setTimeout(() => {
        document.getElementById('section-gallery').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    } catch {
      showToast('Could not save your spark — please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="btn-icon">🔥</span> Toss into the Fire';
    }
  });
}

// ─── Search ───────────────────────────────────────────────────────────────────
function setupSearch() {
  const input = document.getElementById('search-input');
  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { searchQuery = input.value.trim().toLowerCase(); renderGallery(); }, 220);
  });
}

// ─── Filters ──────────────────────────────────────────────────────────────────
function setupFilters() {
  const chips = document.getElementById('filter-chips');
  chips.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    chips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter;
    renderGallery();
  });
}

// ─── Gallery loading state ────────────────────────────────────────────────────
function showGalleryLoading() {
  const grid = document.getElementById('spark-grid');
  grid.innerHTML = Array.from({ length: 6 }, () => '<div class="shimmer"></div>').join('');
  document.getElementById('empty-state').hidden = true;
}
function hideGalleryLoading() {
  document.getElementById('spark-grid').innerHTML = '';
}

// ─── Render ───────────────────────────────────────────────────────────────────
function filteredMessages() {
  return messages.filter(m => {
    const matchFilter = activeFilter === 'All' || m.category === activeFilter;
    const matchSearch = !searchQuery ||
      m.text.toLowerCase().includes(searchQuery) ||
      m.author.toLowerCase().includes(searchQuery) ||
      m.category.toLowerCase().includes(searchQuery);
    return matchFilter && matchSearch;
  });
}

function renderGallery() {
  const grid  = document.getElementById('spark-grid');
  const empty = document.getElementById('empty-state');
  const msgs  = filteredMessages();

  grid.innerHTML = '';
  if (msgs.length === 0) { empty.hidden = false; return; }
  empty.hidden = true;
  msgs.forEach((msg, i) => grid.appendChild(buildCard(msg, i)));
}

function renderFavorites() {
  const grid  = document.getElementById('favorites-grid');
  const empty = document.getElementById('fav-empty-state');
  const favMsgs = messages.filter(m => favorites.has(m.id));

  grid.innerHTML = '';
  if (favMsgs.length === 0) { empty.hidden = false; return; }
  empty.hidden = true;
  favMsgs.forEach((msg, i) => grid.appendChild(buildCard(msg, i)));
}

function buildCard(msg, index) {
  const isFav = favorites.has(msg.id);
  const card  = document.createElement('div');
  card.className = 'spark-card';
  card.style.animationDelay = `${index * 0.06}s`;
  card.dataset.id = msg.id;

  card.innerHTML = `
    <div class="spark-card-header">
      <span class="category-badge">${CAT_EMOJI[msg.category] || '✦'} ${escHtml(msg.category)}</span>
      <button class="card-fav-btn ${isFav ? 'active' : ''}" data-id="${msg.id}" title="${isFav ? 'Remove favorite' : 'Add to favorites'}">♥</button>
    </div>
    <p class="spark-text">${escHtml(msg.text)}</p>
    <div class="spark-meta">
      <span class="spark-alias">~ ${escHtml(msg.author)}</span>
      <span>${relativeTime(msg.ts)}</span>
    </div>
  `;

  card.addEventListener('click', e => { if (e.target.closest('.card-fav-btn')) return; openModal(msg.id); });
  card.querySelector('.card-fav-btn').addEventListener('click', e => { e.stopPropagation(); toggleFav(msg.id); });
  return card;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(id) {
  const msg = messages.find(m => m.id === id);
  if (!msg) return;
  currentOpenId = id;

  document.getElementById('modal-category').textContent = `${CAT_EMOJI[msg.category] || '✦'} ${msg.category}`;
  document.getElementById('modal-message').textContent  = msg.text;
  document.getElementById('modal-author').textContent   = `~ ${msg.author}`;
  document.getElementById('modal-time').textContent     = formatDate(msg.ts);

  const favBtn = document.getElementById('modal-fav');
  favBtn.textContent = favorites.has(id) ? '♥ Favorited' : '♥ Favorite';
  favBtn.classList.toggle('active', favorites.has(id));

  document.getElementById('modal-overlay').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').hidden = true;
  document.body.style.overflow = '';
  currentOpenId = null;
}

// ─── Story overlay ────────────────────────────────────────────────────────────
function showRandomStory() {
  if (messages.length === 0) { showToast('No sparks yet — share the first one! 🔥'); return; }
  const msg = messages[Math.floor(Math.random() * messages.length)];
  currentOpenId = msg.id;

  document.getElementById('story-category').textContent = `${CAT_EMOJI[msg.category] || '✦'} ${msg.category}`;
  document.getElementById('story-message').textContent  = msg.text;
  document.getElementById('story-author').textContent   = `~ ${msg.author}`;
  document.getElementById('story-time').textContent     = formatDate(msg.ts);

  const favBtn = document.getElementById('story-fav');
  favBtn.textContent = favorites.has(msg.id) ? '♥ Favorited' : '♥ Favorite';
  favBtn.classList.toggle('active', favorites.has(msg.id));

  document.getElementById('story-overlay').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeStory() {
  document.getElementById('story-overlay').hidden = true;
  document.body.style.overflow = '';
  currentOpenId = null;
}

// ─── Favorites ────────────────────────────────────────────────────────────────
function toggleFav(id) {
  if (favorites.has(id)) { favorites.delete(id); showToast('Removed from favorites'); }
  else                   { favorites.add(id);    showToast('Added to favorites ♥'); }
  saveFavorites(favorites);
  renderGallery();
  renderFavorites();
}

function toggleFavFromModal(id) {
  if (!id) return;
  toggleFav(id);
  const isFav = favorites.has(id);
  const label = isFav ? '♥ Favorited' : '♥ Favorite';
  const mf = document.getElementById('modal-fav');
  const sf = document.getElementById('story-fav');
  if (mf) { mf.textContent = label; mf.classList.toggle('active', isFav); }
  if (sf) { sf.textContent = label; sf.classList.toggle('active', isFav); }
}

// ─── Scroll reveal ────────────────────────────────────────────────────────────
function setupScrollReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { targets.forEach(el => el.classList.add('visible')); return; }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.12 });
  targets.forEach(el => observer.observe(el));
}

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const min  = Math.floor(diff / 60000);
  const hr   = Math.floor(diff / 3600000);
  const day  = Math.floor(diff / 86400000);
  if (min < 1)  return 'just now';
  if (min < 60) return `${min}m ago`;
  if (hr  < 24) return `${hr}h ago`;
  if (day < 7)  return `${day}d ago`;
  return formatDate(ts);
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
