/* ============================================================
   TextSlide – App Logic
   ============================================================ */

'use strict';

// ===== THEME DEFINITIONS =====
const THEMES = {
  ocean: {
    gradients: [
      ['#0f2027','#203a43','#2c5364'],
      ['#134e5e','#71b280'],
      ['#005c97','#363795'],
      ['#1a1a2e','#16213e','#0f3460'],
      ['#0575e6','#021b79'],
      ['#12c2e9','#c471ed'],
    ],
    overlay: 'rgba(0,20,50,0.55)',
    accent: '#12c2e9',
  },
  sunset: {
    gradients: [
      ['#f7797d','#fbd3e9','#bb377d'],
      ['#e96c4c','#f7b733'],
      ['#c94b4b','#4b134f'],
      ['#ee0979','#ff6a00'],
      ['#fc466b','#3f5efb'],
      ['#f7971e','#ffd200'],
    ],
    overlay: 'rgba(60,0,20,0.5)',
    accent: '#f7797d',
  },
  forest: {
    gradients: [
      ['#134e5e','#71b280'],
      ['#1a2a1a','#2d5a27'],
      ['#355c7d','#6c5b7b','#c06c84'],
      ['#11998e','#38ef7d'],
      ['#1d4350','#a43931'],
      ['#0b486b','#f56217'],
    ],
    overlay: 'rgba(0,30,10,0.55)',
    accent: '#71b280',
  },
  night: {
    gradients: [
      ['#0f0c29','#302b63','#24243e'],
      ['#1a1a2e','#16213e'],
      ['#0a0a0a','#1a1a2e'],
      ['#141e30','#243b55'],
      ['#200122','#6f0000'],
      ['#0f2027','#2c5364'],
    ],
    overlay: 'rgba(0,0,30,0.6)',
    accent: '#a78bfa',
  },
  rose: {
    gradients: [
      ['#f8cdda','#1d2b64'],
      ['#e96c4c','#cc2b5e'],
      ['#c94b4b','#4b134f'],
      ['#ee0979','#ff6a00'],
      ['#ff4e50','#f9d423'],
      ['#d31027','#ea384d'],
    ],
    overlay: 'rgba(50,0,30,0.52)',
    accent: '#f472b6',
  },
  slate: {
    gradients: [
      ['#2c3e50','#4ca1af'],
      ['#373b44','#4286f4'],
      ['#485563','#29323c'],
      ['#243949','#517fa4'],
      ['#1f1c2c','#928dab'],
      ['#16222a','#3a6073'],
    ],
    overlay: 'rgba(10,15,30,0.55)',
    accent: '#60a5fa',
  },
};

// ===== UNSPLASH KEYWORDS per theme =====
const THEME_KEYWORDS = {
  ocean: ['ocean','sea','water','waves','underwater'],
  sunset: ['sunset','sky','clouds','golden','dusk'],
  forest: ['forest','nature','trees','green','landscape'],
  night: ['night sky','stars','galaxy','cosmos','aurora'],
  rose: ['flowers','roses','pink','petals','bloom'],
  slate: ['mountains','architecture','city','abstract','minimal'],
};

// ===== STATE =====
let slides = [];
let currentIndex = 0;
let touchStartX = 0;
let touchStartY = 0;
let hideControlsTimer = null;
let selectedTheme = 'ocean';
let selectedFont = 'inter';
let useImages = true;
let imageCache = {};

// ===== CHAR COUNTER =====
const textInput = document.getElementById('textInput');
const charCount = document.getElementById('charCount');

textInput.addEventListener('input', () => {
  charCount.textContent = textInput.value.length.toLocaleString('de-DE');
});

document.getElementById('themeSelect').addEventListener('change', (e) => {
  selectedTheme = e.target.value;
});
document.getElementById('fontSelect').addEventListener('change', (e) => {
  selectedFont = e.target.value;
});
document.getElementById('imageToggle').addEventListener('change', (e) => {
  useImages = e.target.checked;
});

// ===== TEXT PARSER =====
function parseTextToSlides(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const slideBlocks = [];

  // Split on double newline (empty line) or heading markers
  const sections = trimmed.split(/\n{2,}/);

  sections.forEach((section, idx) => {
    const lines = section.trim().split('\n').filter(l => l.trim());
    if (!lines.length) return;

    // Check if starts with heading marker
    if (lines[0].startsWith('# ')) {
      const title = lines[0].replace(/^#+\s*/, '').trim();
      const body = lines.slice(1).join(' ').trim();
      slideBlocks.push({ type: 'title', title, body, index: idx });
    } else if (lines[0].startsWith('## ')) {
      const title = lines[0].replace(/^#+\s*/, '').trim();
      const body = lines.slice(1).join(' ').trim();
      slideBlocks.push({ type: 'section', title, body, index: idx });
    } else {
      // No heading — use first sentence or first 60 chars as headline
      const combined = lines.join(' ').trim();
      const sentenceEnd = combined.search(/[.!?]\s/);
      let title, body;

      if (sentenceEnd > 0 && sentenceEnd < 80) {
        title = combined.slice(0, sentenceEnd + 1).trim();
        body  = combined.slice(sentenceEnd + 1).trim();
      } else if (combined.length <= 120) {
        title = combined;
        body  = '';
      } else {
        // Break at last word boundary before 80 chars
        const cut = combined.lastIndexOf(' ', 80);
        title = combined.slice(0, cut > 0 ? cut : 80).trim();
        body  = combined.slice(cut > 0 ? cut : 80).trim();
      }

      const type = (idx === 0) ? 'title' : (body.length === 0 ? 'highlight' : 'content');
      slideBlocks.push({ type, title, body, index: idx });
    }
  });

  return slideBlocks;
}

// ===== UNSPLASH IMAGE =====
function getImageUrl(keyword, width, height) {
  return `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(keyword)}&sig=${Math.floor(Math.random()*900)+100}`;
}

// ===== BUILD SLIDE HTML =====
function buildSlideHTML(data, gradients, themeOverlay, themeAccent, index, total, font) {
  const grad = gradients[index % gradients.length];
  const gradStr = grad.length === 2
    ? `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`
    : `linear-gradient(135deg, ${grad[0]}, ${grad[1]}, ${grad[2]})`;

  const imgUrl = imageCache[index] || null;
  let bgStyle = '';
  if (imgUrl) {
    bgStyle = `background-image: url('${imgUrl}'), ${gradStr};`;
  } else {
    bgStyle = `background-image: ${gradStr};`;
  }

  const overlayColor = themeOverlay;

  const numberLabel = `Folie ${index + 1} / ${total}`;
  const titleHtml = data.title
    ? `<h2>${escapeHtml(data.title)}</h2>`
    : '';
  const bodyHtml = data.body
    ? `<p>${escapeHtml(data.body)}</p>`
    : '';

  const decoHtml = `
    <div class="slide-deco deco-circle" style="width:400px;height:400px;top:-120px;right:-120px;"></div>
    <div class="slide-deco deco-circle" style="width:250px;height:250px;bottom:-80px;left:-60px;"></div>
  `;

  return `
    <div class="slide type-${data.type} ${index === 0 ? 'current' : 'next'}"
         style="${bgStyle}"
         data-index="${index}">
      <div class="slide-overlay" style="background:${overlayColor};"></div>
      ${decoHtml}
      <div class="slide-content">
        <div class="slide-number-badge">${index + 1} von ${total}</div>
        ${titleHtml}
        ${bodyHtml}
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===== LOADING PROGRESS =====
function setProgress(pct, label) {
  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('progressLabel').textContent = Math.round(pct) + ' %';
  if (label) document.getElementById('loadingStatus').textContent = label;
}

function completeStep(id, next) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('active');
    el.classList.add('done');
    el.querySelector('.step-icon').textContent = '✅';
  }
  if (next) {
    const nxt = document.getElementById(next);
    if (nxt) nxt.classList.add('active');
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== MAIN: START PRESENTATION =====
async function startPresentation() {
  const raw = textInput.value.trim();
  if (!raw) {
    textInput.focus();
    textInput.style.borderColor = '#f87171';
    setTimeout(() => { textInput.style.borderColor = ''; }, 1000);
    return;
  }

  selectedTheme = document.getElementById('themeSelect').value;
  selectedFont  = document.getElementById('fontSelect').value;
  useImages     = document.getElementById('imageToggle').checked;

  // Switch to loading view
  showView('loadingView');
  setProgress(0, 'Präsentation wird erstellt…');
  document.getElementById('step1').classList.add('active');
  imageCache = {};

  // Step 1: Parse text
  await delay(350);
  slides = parseTextToSlides(raw);
  setProgress(15, 'Text analysiert…');
  completeStep('step1', 'step2');

  if (!slides.length) {
    showView('editorView');
    return;
  }

  // Step 2: Layout
  await delay(280);
  setProgress(35, 'Folien werden layoutet…');
  completeStep('step2', 'step3');

  // Step 3: Apply design
  await delay(250);
  setProgress(52, 'Designs werden angewendet…');
  completeStep('step3', 'step4');

  // Step 4: Load images
  if (useImages) {
    const keywords = THEME_KEYWORDS[selectedTheme] || ['abstract'];
    const imagePromises = slides.map((_, i) => {
      return new Promise(resolve => {
        const kw = keywords[i % keywords.length];
        const url = getImageUrl(kw, 1600, 900);
        const img = new Image();
        img.onload  = () => { imageCache[i] = url; resolve(); };
        img.onerror = () => resolve(); // graceful fallback
        img.src = url;
        // Timeout – don't block forever
        setTimeout(resolve, 3500);
      });
    });

    const loadStart = 52;
    const loadEnd   = 80;
    let loaded = 0;
    for (const p of imagePromises) {
      await p;
      loaded++;
      setProgress(loadStart + ((loadEnd - loadStart) * loaded / imagePromises.length),
                  `Bild ${loaded}/${imagePromises.length} geladen…`);
    }
  } else {
    setProgress(80, 'Bilder übersprungen…');
  }
  completeStep('step4', 'step5');

  // Step 5: Render
  await delay(220);
  setProgress(90, 'Präsentation wird gerendert…');
  renderPresentation();
  await delay(180);
  setProgress(100, 'Fertig!');
  completeStep('step5', null);
  await delay(380);

  // Show presentation
  showView('presentationView');
  currentIndex = 0;
  updateSlideState();
  startAutoHideControls();
}

// ===== RENDER =====
function renderPresentation() {
  const theme = THEMES[selectedTheme] || THEMES.ocean;
  const container = document.getElementById('slidesContainer');
  container.innerHTML = '';

  const presView = document.getElementById('presentationView');
  presView.className = 'view';
  if (selectedFont === 'playfair') presView.classList.add('font-playfair');

  slides.forEach((data, i) => {
    container.insertAdjacentHTML(
      'beforeend',
      buildSlideHTML(data, theme.gradients, theme.overlay, theme.accent, i, slides.length, selectedFont)
    );
  });

  // Dot nav
  const dotNav = document.getElementById('dotNav');
  dotNav.innerHTML = '';
  slides.forEach((_, i) => {
    const btn = document.createElement('button');
    btn.className = 'dot' + (i === 0 ? ' active' : '');
    btn.setAttribute('aria-label', `Folie ${i + 1}`);
    btn.onclick = () => goToSlide(i);
    dotNav.appendChild(btn);
  });

  document.getElementById('totalSlideNum').textContent = slides.length;
  document.getElementById('currentSlideNum').textContent = 1;
}

// ===== SLIDE NAVIGATION =====
function goToSlide(newIndex) {
  if (newIndex < 0 || newIndex >= slides.length) return;

  const allSlides = document.querySelectorAll('.slide');
  const dir = newIndex > currentIndex ? 1 : -1;

  allSlides.forEach((el, i) => {
    el.classList.remove('current', 'prev', 'next');
    if (i === newIndex) {
      el.classList.add('current');
    } else if (i < newIndex) {
      el.classList.add('prev');
    } else {
      el.classList.add('next');
    }
  });

  currentIndex = newIndex;
  updateSlideState();
}

function nextSlide() {
  if (currentIndex < slides.length - 1) goToSlide(currentIndex + 1);
  resetAutoHide();
}

function prevSlide() {
  if (currentIndex > 0) goToSlide(currentIndex - 1);
  resetAutoHide();
}

function updateSlideState() {
  document.getElementById('currentSlideNum').textContent = currentIndex + 1;
  document.getElementById('prevBtn').disabled = (currentIndex === 0);
  document.getElementById('nextBtn').disabled = (currentIndex === slides.length - 1);

  // Dots
  document.querySelectorAll('.dot').forEach((d, i) => {
    d.classList.toggle('active', i === currentIndex);
  });

  // Slide progress bar
  const pct = slides.length > 1
    ? (currentIndex / (slides.length - 1)) * 100
    : 100;
  document.getElementById('slideProgress').style.width = pct + '%';
}

// ===== KEYBOARD =====
document.addEventListener('keydown', (e) => {
  const view = document.querySelector('.view.active');
  if (!view || view.id !== 'presentationView') return;

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
    e.preventDefault();
    nextSlide();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    prevSlide();
  } else if (e.key === 'Escape') {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      backToEditor();
    }
  } else if (e.key === 'f' || e.key === 'F') {
    toggleFullscreen();
  }
  resetAutoHide();
});

// ===== TOUCH SWIPE =====
const slidesContainer = document.getElementById('slidesContainer');

slidesContainer.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

slidesContainer.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;

  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
    if (dx < 0) nextSlide();
    else prevSlide();
  }
  resetAutoHide();
}, { passive: true });

// ===== TAP TO SHOW/HIDE CONTROLS =====
slidesContainer.addEventListener('click', () => {
  const controls = document.getElementById('presControls');
  const nav = document.getElementById('presNav');
  if (controls.classList.contains('hidden')) {
    controls.classList.remove('hidden');
    nav.classList.remove('hidden');
    resetAutoHide();
  }
});

function startAutoHideControls() {
  clearTimeout(hideControlsTimer);
  hideControlsTimer = setTimeout(() => {
    document.getElementById('presControls').classList.add('hidden');
    document.getElementById('presNav').classList.add('hidden');
  }, 4000);
}

function resetAutoHide() {
  document.getElementById('presControls').classList.remove('hidden');
  document.getElementById('presNav').classList.remove('hidden');
  startAutoHideControls();
}

document.getElementById('presControls').addEventListener('mousemove', resetAutoHide);
document.getElementById('presNav').addEventListener('mousemove', resetAutoHide);

// ===== FULLSCREEN =====
function toggleFullscreen() {
  const presView = document.getElementById('presentationView');
  if (!document.fullscreenElement) {
    (presView.requestFullscreen || presView.webkitRequestFullscreen || presView.mozRequestFullScreen).call(presView);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen).call(document);
  }
}

// ===== BACK TO EDITOR =====
function backToEditor() {
  if (document.fullscreenElement) {
    (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen).call(document);
  }
  showView('editorView');
  // Reset loading steps
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById('step' + i);
    if (el) {
      el.classList.remove('done', 'active');
      el.querySelector('.step-icon').textContent = '⬜';
    }
  }
}

// ===== VIEW SWITCHER =====
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// ===== MOUSE MOVE to reset hide timer in pres =====
document.getElementById('presentationView').addEventListener('mousemove', () => {
  const view = document.querySelector('.view.active');
  if (view && view.id === 'presentationView') resetAutoHide();
});

// ===== POINTER CURSOR for slides container =====
slidesContainer.style.cursor = 'pointer';
