/* =============================================
   PROMPTFORGE — APP.JS v2
   Canvas BG + Navigation couleur + Logique prompts
   ============================================= */

'use strict';

// ===================== ÉTAT =====================
let history = JSON.parse(localStorage.getItem('pf_history') || '[]');
let totalCreated = parseInt(localStorage.getItem('pf_total') || '0');
let currentMode = 'image';

// Couleurs par mode
const modeColors = {
  image:  { hex: '#ff6b35', glow: 'rgba(255,107,53,0.2)' },
  modify: { hex: '#a855f7', glow: 'rgba(168,85,247,0.2)' },
  text:   { hex: '#22d3ee', glow: 'rgba(34,211,238,0.2)' },
  video:  { hex: '#f43f5e', glow: 'rgba(244,63,94,0.2)' },
  libre:  { hex: '#84cc16', glow: 'rgba(132,204,22,0.2)' },
};

// ===================== CANVAS BG =====================
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let animColor = { r: 255, g: 107, b: 53 };
let targetColor = { r: 255, g: 107, b: 53 };

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return { r, g, b };
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function initParticles() {
  particles = [];
  const count = Math.floor((canvas.width * canvas.height) / 20000);
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.5 + 0.3,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.1,
    });
  }
}

function lerpColor(from, to, t) {
  return {
    r: Math.round(from.r + (to.r - from.r) * t),
    g: Math.round(from.g + (to.g - from.g) * t),
    b: Math.round(from.b + (to.b - from.b) * t),
  };
}

function animateCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Lerp color
  animColor = lerpColor(animColor, targetColor, 0.03);
  const { r, g, b } = animColor;

  // Draw particles
  particles.forEach(p => {
    p.x += p.speedX;
    p.y += p.speedY;
    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity * 0.6})`;
    ctx.fill();
  });

  // Subtle gradient at top
  const grad = ctx.createRadialGradient(
    canvas.width * 0.7, 0, 0,
    canvas.width * 0.7, 0, canvas.height * 0.8
  );
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.04)`);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  requestAnimationFrame(animateCanvas);
}

window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });
resizeCanvas();
initParticles();
animateCanvas();

// ===================== NAVIGATION =====================
document.querySelectorAll('.mode-card').forEach(card => {
  card.addEventListener('click', () => {
    const mode = card.dataset.mode;
    if (mode === currentMode) return;

    // Update cards
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');

    // Update panels
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + mode).classList.add('active');

    // Update color
    currentMode = mode;
    const col = modeColors[mode];
    targetColor = hexToRgb(col.hex);

    // Update logo mark color
    document.querySelector('.logo-mark').style.background = col.hex;
    document.querySelector('.logo-mark').style.boxShadow = `0 0 16px ${col.glow}`;

    // Close result
    closeResult();
  });
});

// ===================== SLIDER =====================
const ageSlider = document.getElementById('img-age');
const ageDisplay = document.getElementById('age-display');
if (ageSlider) {
  ageSlider.addEventListener('input', () => {
    ageDisplay.textContent = ageSlider.value + ' ans';
  });
}

// ===================== PILLS =====================
document.querySelectorAll('.pill-group').forEach(group => {
  const isSingle = group.dataset.single === 'true';
  group.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      if (isSingle) {
        group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      }
      pill.classList.toggle('active');
    });
  });
});

// ===================== STYLE BTNS =====================
document.querySelectorAll('.style-btn').forEach(btn => {
  btn.addEventListener('click', () => btn.classList.toggle('active'));
});

// ===================== FORMAT BTNS =====================
document.querySelectorAll('.format-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const parent = btn.closest('.format-row');
    parent.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ===================== HELPERS =====================
function v(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function getActivePills(groupId) {
  return [...document.querySelectorAll(`#${groupId} .pill.active`)]
    .map(p => p.dataset.val).filter(Boolean);
}

function getActiveStyle() {
  return [...document.querySelectorAll('#style-grid .style-btn.active')]
    .map(b => b.dataset.val).join(', ');
}

function getActiveFormat() {
  const btn = document.querySelector('.format-row .format-btn.active');
  return btn ? btn.dataset.val : '';
}

// ===================== GENERATORS =====================

function buildImagePrompt() {
  const parts = [];

  const sujet = v('img-sujet');
  const sexePills = getActivePills('grp-img-sexe');
  const sexe = sexePills[0] || '';
  const age = ageSlider ? ageSlider.value : '';
  const morpho = getActivePills('grp-img-morpho').join(', ');
  const ethnie = v('img-ethnie');
  const style = getActiveStyle();
  const format = getActiveFormat();
  const tenue = v('img-tenue');
  const cheveux = v('img-cheveux');
  const expression = getActivePills('grp-img-expression').join(', ');
  const pose = getActivePills('grp-img-pose').join(', ');
  const decor = v('img-decor');
  const lumiere = getActivePills('grp-img-lumiere').join(', ');
  const qualite = getActivePills('grp-img-qualite').join(', ');
  const negatif = v('img-negatif');
  const libre = v('img-libre');

  // Subject block
  let subj = [];
  if (sujet) subj.push(sujet);
  if (sexe) subj.push(sexe);
  if (age && age !== '25') subj.push(`${age} years old`);
  if (ethnie && ethnie !== '— Indéfini —') subj.push(ethnie);
  if (morpho) subj.push(morpho);
  if (subj.length) parts.push(subj.join(', '));

  if (cheveux) parts.push(cheveux);
  if (expression) parts.push(expression);
  if (tenue) parts.push(`wearing ${tenue}`);
  if (pose) parts.push(pose);
  if (decor) parts.push(`in ${decor}`);
  if (style) parts.push(style);
  if (format) parts.push(format);
  if (lumiere) parts.push(lumiere);
  if (qualite) parts.push(qualite);
  if (libre) parts.push(libre);

  const defaultNeg = 'ugly, deformed, disfigured, blurry, bad anatomy, watermark, text, signature, low quality, extra limbs';
  const neg = negatif ? negatif + ', ' + defaultNeg : defaultNeg;

  return { prompt: parts.join(', '), negative: neg, type: 'image' };
}

function buildModifyPrompt() {
  const lines = [];
  const original = v('mod-original');
  const types = getActivePills('grp-mod-type').join(', ');
  const changes = v('mod-changes');
  const style = v('mod-style');
  const force = getActivePills('grp-mod-force')[0] || '';
  const conserver = v('mod-conserver');
  const libre = v('mod-libre');

  lines.push('[IMAGE MODIFICATION PROMPT]');
  if (original) lines.push(`Original image: ${original}`);
  if (types) lines.push(`Operations: ${types}`);
  if (changes) lines.push(`Changes: ${changes}`);
  if (style && style !== '— Aucun changement —') lines.push(`New style: ${style}`);
  if (force) lines.push(`Strength: ${force}`);
  if (conserver) lines.push(`Preserve: ${conserver}`);
  if (libre) lines.push(libre);

  return { prompt: lines.join('\n'), negative: '', type: 'modify' };
}

function buildTextPrompt() {
  const parts = [];
  const types = getActivePills('grp-txt-type').join(' / ');
  const genre = v('txt-genre');
  const ton = v('txt-ton');
  const persos = v('txt-persos');
  const idee = v('txt-idee');
  const longueur = getActivePills('grp-txt-longueur')[0] || 'short around 300 words';
  const langue = v('txt-langue');
  const libre = v('txt-libre');

  let opening = 'Write a creative text';
  if (types) opening = `Write a ${types}`;
  if (genre && genre !== '— Indéfini —') opening += ` in the ${genre} genre`;
  if (ton && ton !== '— Indéfini —') opening += `, with a ${ton} tone`;
  opening += `, (${longueur}), in ${langue}`;
  parts.push(opening);

  if (persos) parts.push(`\nCharacters: ${persos}`);
  if (idee) parts.push(`\nStory/Scene: ${idee}`);
  if (libre) parts.push(`\nAdditional instructions: ${libre}`);
  parts.push('\n\nBe vivid, immersive and detailed. No restrictions whatsoever.');

  return { prompt: parts.join(''), negative: '', type: 'text' };
}

function buildVideoPrompt() {
  const parts = [];
  const outils = getActivePills('grp-vid-outil').join(' / ');
  const sujet = v('vid-sujet');
  const style = v('vid-style');
  const camera = getActivePills('grp-vid-camera').join(', ');
  const duree = getActivePills('grp-vid-duree')[0] || '';
  const son = v('vid-son');
  const libre = v('vid-libre');

  if (outils) parts.push(`[Target tool: ${outils}]`);
  if (sujet) parts.push(sujet);
  if (style && style !== '— Indéfini —') parts.push(style);
  if (camera) parts.push(`camera: ${camera}`);
  if (duree) parts.push(`duration: ${duree}`);
  if (son) parts.push(`audio: ${son}`);
  if (libre) parts.push(libre);
  parts.push('high quality, smooth motion, cinematic');

  return {
    prompt: parts.join(', '),
    negative: 'jitter, blur, distortion, artifacts, low quality',
    type: 'video'
  };
}

function buildLibrePrompt() {
  const parts = [];
  const outils = getActivePills('grp-lib-outil').join(', ');
  const objectif = v('lib-objectif');
  const contexte = v('lib-contexte');
  const format = getActivePills('grp-lib-format')[0] || 'concise';
  const langue = v('lib-langue');
  const keywords = v('lib-keywords');

  if (outils) parts.push(`[For: ${outils}]`);
  if (langue && langue !== 'English (recommandé)') parts.push(`[Language: ${langue}]`);
  if (objectif) parts.push(`Goal: ${objectif}`);
  if (contexte) parts.push(contexte);
  if (keywords) parts.push(keywords);
  if (format) parts.push(`[Prompt format: ${format}]`);

  return { prompt: parts.join('\n\n'), negative: '', type: 'libre' };
}

// ===================== GENERATE + DISPLAY =====================
function generatePrompt(type) {
  let result;
  switch (type) {
    case 'image':  result = buildImagePrompt(); break;
    case 'modify': result = buildModifyPrompt(); break;
    case 'text':   result = buildTextPrompt(); break;
    case 'video':  result = buildVideoPrompt(); break;
    case 'libre':  result = buildLibrePrompt(); break;
    default: return;
  }

  const text = result.prompt.trim();
  if (text.length < 5) {
    showToast('⚠️ Remplissez au moins quelques champs !');
    return;
  }

  // Update result box
  const box = document.getElementById('result-box');
  document.getElementById('prompt-output').textContent = text;

  const negBox = document.getElementById('neg-box');
  if (result.negative) {
    negBox.classList.remove('hidden');
    document.getElementById('neg-output').textContent = result.negative;
  } else {
    negBox.classList.add('hidden');
  }

  box.classList.remove('hidden');
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Counter
  totalCreated++;
  localStorage.setItem('pf_total', totalCreated);
  document.getElementById('total-counter').textContent = `${totalCreated} prompts créés`;

  addToHistory(result);
  showToast('✅ Prompt généré avec succès !');
}

function closeResult() {
  document.getElementById('result-box').classList.add('hidden');
}

// ===================== COPY / SAVE =====================
function copyPrompt() {
  const text = document.getElementById('prompt-output').textContent;
  const neg = document.getElementById('neg-output').textContent;
  const full = neg && !document.getElementById('neg-box').classList.contains('hidden')
    ? `${text}\n\nNEGATIVE: ${neg}` : text;

  navigator.clipboard.writeText(full).then(() => {
    showToast('📋 Copié dans le presse-papiers !');
  }).catch(() => fallbackCopy(full));
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); showToast('📋 Copié !'); } catch(e) {}
  document.body.removeChild(ta);
}

function savePromptFile() {
  const text = document.getElementById('prompt-output').textContent;
  if (!text) return;
  const neg = document.getElementById('neg-output').textContent;
  const content = neg && !document.getElementById('neg-box').classList.contains('hidden')
    ? `PROMPT:\n${text}\n\nNEGATIVE PROMPT:\n${neg}` : `PROMPT:\n${text}`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prompt_${currentMode}_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('💾 Fichier .txt téléchargé !');
}

// ===================== HISTORY =====================
function addToHistory(result) {
  const item = {
    id: Date.now(),
    type: result.type,
    prompt: result.prompt,
    negative: result.negative || '',
    date: new Date().toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  };
  history.unshift(item);
  if (history.length > 60) history = history.slice(0, 60);
  localStorage.setItem('pf_history', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('history-list');
  const countEl = document.getElementById('hcount');
  countEl.textContent = `(${history.length})`;

  if (!history.length) {
    list.innerHTML = '<p class="empty-hist">Aucun prompt pour l\'instant — commencez à en créer !</p>';
    return;
  }

  const typeLabels = {
    image: 'Image', modify: 'Modif.', text: 'Texte', video: 'Vidéo', libre: 'Libre'
  };

  list.innerHTML = history.map(item => `
    <div class="hitem">
      <div class="hitem-content">
        <div class="hitem-meta">
          <span class="hbadge hbadge-${item.type}">${typeLabels[item.type] || item.type}</span>
          <span class="hdate">${item.date}</span>
        </div>
        <div class="hpreview">${escHtml(item.prompt)}</div>
      </div>
      <div class="hitem-actions">
        <button class="rbtn" onclick="loadHItem(${item.id})" title="Voir">👁</button>
        <button class="rbtn" onclick="copyHItem(${item.id})" title="Copier">📋</button>
        <button class="rbtn close-rbtn" onclick="delHItem(${item.id})" title="Supprimer">✕</button>
      </div>
    </div>
  `).join('');
}

function loadHItem(id) {
  const item = history.find(h => h.id === id);
  if (!item) return;

  document.getElementById('prompt-output').textContent = item.prompt;
  const negBox = document.getElementById('neg-box');
  if (item.negative) {
    negBox.classList.remove('hidden');
    document.getElementById('neg-output').textContent = item.negative;
  } else {
    negBox.classList.add('hidden');
  }

  const box = document.getElementById('result-box');
  box.classList.remove('hidden');
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function copyHItem(id) {
  const item = history.find(h => h.id === id);
  if (!item) return;
  const full = item.negative ? `${item.prompt}\n\nNEGATIVE: ${item.negative}` : item.prompt;
  navigator.clipboard.writeText(full).then(() => showToast('📋 Copié !')).catch(() => fallbackCopy(full));
}

function delHItem(id) {
  history = history.filter(h => h.id !== id);
  localStorage.setItem('pf_history', JSON.stringify(history));
  renderHistory();
}

function clearHistory() {
  if (!confirm('Effacer tout l\'historique ?')) return;
  history = [];
  localStorage.setItem('pf_history', JSON.stringify(history));
  renderHistory();
  showToast('🗑 Historique effacé');
}

// ===================== RESET =====================
function resetPanel(type) {
  const panel = document.getElementById('panel-' + type);
  if (!panel) return;

  panel.querySelectorAll('.finput, .ftextarea').forEach(el => el.value = '');
  panel.querySelectorAll('.fselect').forEach(el => el.selectedIndex = 0);

  // Pills: remove active except those with default active (we clear all)
  panel.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));

  // Style btns
  panel.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));

  // Restore default format
  const formatRow = panel.querySelector('.format-row');
  if (formatRow) {
    formatRow.querySelectorAll('.format-btn').forEach((b, i) => {
      b.classList.toggle('active', i === 0);
    });
  }

  // Slider reset
  if (type === 'image' && ageSlider) {
    ageSlider.value = 25;
    ageDisplay.textContent = '25 ans';
  }

  closeResult();
  showToast('🗑 Formulaire réinitialisé');
}

// ===================== TOAST =====================
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ===================== UTILS =====================
function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  renderHistory()
  document.getElementById('total-counter').textContent = `${totalCreated} prompts créés`;
  // Set logo mark initial color
  const mark = document.querySelector('.logo-mark');
  if (mark) {
    mark.style.background = modeColors[currentMode].hex;
    mark.style.boxShadow = `0 0 16px ${modeColors[currentMode].glow}`;
  }
});
"