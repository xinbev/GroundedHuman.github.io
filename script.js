// Case frames are extracted from pages 6–10 of the supplied supplementary PDF.
// Matching MP4 files, when present, replace frame previews automatically.
const poster = number => `public/assets/posters/frame-${String(number).padStart(3, '0')}.jpg`;
const movie = (caseNumber, method) => `public/assets/videos/case-${String(caseNumber).padStart(2, '0')}-${method}.mp4`;

const cases = [
  { title: 'Street corner', description: 'Single-person · outdoor street scene', panels: [
    { label: 'Input', role: 'Source video', image: poster(0), video: movie(1, 'input') },
    { label: 'Human3R', role: 'Baseline', image: poster(3), video: movie(1, 'human3r') },
    { label: 'UniSH', role: 'Baseline', image: poster(1), video: movie(1, 'unish') },
    { label: 'Ours', role: 'GroundedHuman', image: poster(2), video: movie(1, 'ours') }
  ] },
  { title: 'Winter park', description: 'Single-person · walking sequence', panels: [
    { label: 'Input', role: 'Source video', image: poster(4), video: movie(2, 'input') },
    { label: 'Human3R', role: 'Baseline', image: poster(5), video: movie(2, 'human3r') },
    { label: 'UniSH', role: 'Baseline', image: poster(6), video: movie(2, 'unish') },
    { label: 'Ours', role: 'GroundedHuman', image: poster(7), video: movie(2, 'ours') }
  ] },
  { title: 'Campus walk', description: 'Single-person · outdoor movement', panels: [
    { label: 'Input', role: 'Source video', image: poster(10), video: movie(3, 'input') },
    { label: 'Human3R', role: 'Baseline', image: poster(9), video: movie(3, 'human3r') },
    { label: 'UniSH', role: 'Baseline', image: poster(8), video: movie(3, 'unish') },
    { label: 'Ours', role: 'GroundedHuman', image: poster(11), video: movie(3, 'ours') }
  ] },
  { title: 'Studio duet', description: 'Multi-person · indoor sequence', panels: [
    { label: 'Input', role: 'Source video', image: poster(13), video: movie(4, 'input') },
    { label: 'Human3R', role: 'Baseline', image: poster(14), video: movie(4, 'human3r') },
    { label: 'Ours', role: 'GroundedHuman', image: poster(12), video: movie(4, 'ours') }
  ] },
  { title: 'Stairway group', description: 'Multi-person · outdoor stairway', panels: [
    { label: 'Input', role: 'Source video', image: poster(17), video: movie(5, 'input') },
    { label: 'Human3R', role: 'Baseline', image: poster(15), video: movie(5, 'human3r') },
    { label: 'Ours', role: 'GroundedHuman', image: poster(16), video: movie(5, 'ours') }
  ] }
];

const tabs = document.querySelector('#case-tabs');
const grid = document.querySelector('#comparison-grid');
const title = document.querySelector('#case-title');
const number = document.querySelector('#case-number');
const description = document.querySelector('#case-description');
const mediaStatus = document.querySelector('#media-status');
const playAll = document.querySelector('#play-all');
const playLabel = document.querySelector('#play-label');
const progress = document.querySelector('#video-progress');
const timeReadout = document.querySelector('#time-readout');
const lightbox = document.querySelector('#lightbox');
const lightboxBody = document.querySelector('#lightbox-body');
const lightboxTitle = document.querySelector('#lightbox-title');
const lightboxKicker = document.querySelector('#lightbox-kicker');
const lightboxCaption = document.querySelector('#lightbox-caption');
const lightboxPrev = document.querySelector('#lightbox-prev');
const lightboxNext = document.querySelector('#lightbox-next');

let activeCase = 0;
let activePanel = 0;
let viewMode = 'panel';
let lastFocused = null;
let renderToken = 0;
let settledVideos = 0;
let comparisonVisible = false;
let userPaused = false;
const readyVideos = new Map();

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '00:00';
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function availableDuration() {
  const durations = [...readyVideos.values()].map(video => video.duration).filter(Number.isFinite);
  return durations.length ? Math.min(...durations) : 0;
}

function masterVideo() {
  return readyVideos.get(0) || readyVideos.values().next().value || null;
}

function updateTime() {
  const master = masterVideo();
  const duration = availableDuration();
  const current = master ? Math.min(master.currentTime, duration) : 0;
  progress.value = duration ? String(Math.round(current / duration * 1000)) : '0';
  timeReadout.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
}

function updateMediaStatus() {
  const count = readyVideos.size;
  const total = cases[activeCase].panels.length;
  const canPlay = count > 0 && availableDuration() > 0;
  playAll.disabled = !canPlay;
  progress.disabled = !canPlay;
  if (count === 0 && settledVideos < total) mediaStatus.textContent = 'Loading supplementary videos…';
  else if (count === 0) mediaStatus.textContent = 'Frame previews from the supplementary material. Videos are unavailable for this sequence.';
  else mediaStatus.textContent = `${count} of ${total} videos available. Videos play automatically in view; open a panel to watch its full video.`;
  updateTime();
}

function setPlaybackState(playing) {
  playLabel.textContent = playing ? 'Pause videos' : 'Play videos';
  playAll.querySelector('.play-icon').textContent = playing ? 'Ⅱ' : '▶';
  playAll.setAttribute('aria-label', playing ? 'Pause available videos' : 'Play available videos');
}

function pauseVideos() {
  readyVideos.forEach(video => video.pause());
  setPlaybackState(false);
}

function playVideos() {
  const master = masterVideo();
  if (!master || !availableDuration()) return;
  if (master.currentTime >= availableDuration() - .08) {
    readyVideos.forEach(video => { video.currentTime = 0; });
  }
  const start = master.currentTime;
  readyVideos.forEach(video => {
    if (video !== master) video.currentTime = Math.min(start, video.duration || start);
    video.play().catch(() => { pauseVideos(); });
  });
  setPlaybackState(true);
}

function maybeAutoplay() {
  if (!comparisonVisible || userPaused || !lightbox.hidden || document.hidden) return;
  if (settledVideos !== cases[activeCase].panels.length || !readyVideos.size) return;
  playVideos();
}

function renderTabs() {
  if (tabs.children.length === cases.length) {
    [...tabs.children].forEach((button, index) => {
      button.setAttribute('aria-selected', index === activeCase ? 'true' : 'false');
      button.tabIndex = index === activeCase ? 0 : -1;
    });
    return;
  }
  cases.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'case-tab';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', 'comparison-grid');
    button.setAttribute('aria-label', `Show ${item.title} comparison`);
    button.setAttribute('aria-selected', index === activeCase ? 'true' : 'false');
    button.tabIndex = index === activeCase ? 0 : -1;
    const group = item.panels.length === 3 ? 'MULTI PERSON' : 'SINGLE PERSON';
    button.innerHTML = `<span class="case-tab-visual"><img src="${item.panels[0].image}" alt="" decoding="async" /></span><span class="case-tab-info"><small>${String(index + 1).padStart(2, '0')} / ${group}</small><strong>${item.title}</strong></span>`;
    button.addEventListener('click', () => renderCase(index));
    button.addEventListener('keydown', event => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      const next = (index + step + cases.length) % cases.length;
      renderCase(next);
      tabs.children[next].focus();
    });
    tabs.append(button);
  });
}

function renderCase(index) {
  pauseVideos();
  userPaused = false;
  readyVideos.clear();
  settledVideos = 0;
  renderToken += 1;
  const token = renderToken;
  activeCase = index;
  const current = cases[index];
  title.textContent = current.title;
  number.textContent = `${String(index + 1).padStart(2, '0')} / ${String(cases.length).padStart(2, '0')}`;
  description.textContent = current.description;
  grid.classList.toggle('three-up', current.panels.length === 3);
  grid.replaceChildren();
  renderTabs();
  current.panels.forEach((panel, panelIndex) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `comparison-card${panel.label === 'Ours' ? ' ours' : ''}`;
    card.setAttribute('aria-label', `Open ${panel.label} ${current.title} preview`);
    card.innerHTML = `<span class="card-label">${panel.label}<small>${panel.role}</small></span><span class="card-visual"><img src="${panel.image}" alt="" /><video muted playsinline preload="metadata" poster="${panel.image}"></video><span class="card-expand" aria-hidden="true">↗</span></span><span class="card-meta"><span class="media-kind">Frame preview</span><span>Open full size</span></span>`;
    card.addEventListener('click', () => openPanel(panelIndex, card));
    grid.append(card);
    const video = card.querySelector('video');
    let didSettle = false;
    const markSettled = () => {
      if (!didSettle) { settledVideos += 1; didSettle = true; }
    };
    video.addEventListener('loadedmetadata', () => {
      if (token !== renderToken) return;
      markSettled();
      readyVideos.set(panelIndex, video);
      card.classList.add('is-ready');
      card.querySelector('.media-kind').textContent = 'Video ready';
      card.setAttribute('aria-label', `Open ${panel.label} ${current.title} video`);
      video.addEventListener('timeupdate', syncTime);
      video.addEventListener('ended', () => {
        if (video !== masterVideo()) return;
        if (comparisonVisible && !userPaused && lightbox.hidden && !document.hidden) playVideos();
        else pauseVideos();
      });
      updateMediaStatus();
      maybeAutoplay();
    }, { once: true });
    video.addEventListener('error', () => {
      if (token !== renderToken) return;
      markSettled();
      readyVideos.delete(panelIndex);
      card.classList.remove('is-ready');
      card.querySelector('.media-kind').textContent = 'Frame preview';
      updateMediaStatus();
      maybeAutoplay();
    }, { once: true });
    video.src = panel.video;
    video.load();
  });
  updateMediaStatus();
}

function syncTime() {
  const master = masterVideo();
  if (!master) return;
  readyVideos.forEach(video => {
    if (video !== master && Math.abs(video.currentTime - master.currentTime) > .28) {
      video.currentTime = Math.min(master.currentTime, video.duration || master.currentTime);
    }
  });
  updateTime();
}

playAll.addEventListener('click', () => {
  const master = masterVideo();
  if (!master) return;
  if (!master.paused) { userPaused = true; pauseVideos(); return; }
  userPaused = false;
  playVideos();
});

progress.addEventListener('input', () => {
  const time = Number(progress.value) / 1000 * availableDuration();
  readyVideos.forEach(video => { video.currentTime = Math.min(time, video.duration || time); });
  updateTime();
});

document.querySelector('#next-case').addEventListener('click', () => renderCase((activeCase + 1) % cases.length));

function showLightbox() {
  pauseVideos();
  lightbox.hidden = false;
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  lightbox.querySelector('.lightbox-close').focus();
}

function openPanel(index, origin = null) {
  if (origin) lastFocused = origin;
  viewMode = 'panel';
  activePanel = index;
  const current = cases[activeCase];
  const panel = current.panels[index];
  lightboxKicker.textContent = `CASE ${String(activeCase + 1).padStart(2, '0')} / ${String(cases.length).padStart(2, '0')}`;
  lightboxTitle.textContent = `${current.title} · ${panel.label}`;
  lightboxBody.replaceChildren();
  if (readyVideos.has(index)) {
    const video = document.createElement('video');
    video.src = panel.video;
    video.poster = panel.image;
    video.controls = true;
    video.playsInline = true;
    video.muted = true;
    video.loop = true;
    video.preload = 'metadata';
    video.setAttribute('aria-label', `${panel.label} video for ${current.title}`);
    const inline = readyVideos.get(index);
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = inline.currentTime;
      video.play().catch(() => {});
    }, { once: true });
    lightboxBody.append(video);
    lightboxCaption.textContent = `${panel.label} · full video`;
  } else {
    const image = document.createElement('img');
    image.src = panel.image;
    image.alt = `${panel.label} frame preview for ${current.title}`;
    lightboxBody.append(image);
    lightboxCaption.textContent = `${panel.label} · frame preview from supplementary material`;
  }
  lightboxPrev.disabled = false;
  lightboxNext.disabled = false;
  if (lightbox.hidden) showLightbox();
}

function openFigure(source, alt, origin) {
  lastFocused = origin;
  viewMode = 'figure';
  lightboxKicker.textContent = 'MANUSCRIPT FIGURE';
  lightboxTitle.textContent = alt;
  lightboxBody.replaceChildren();
  const image = document.createElement('img');
  image.src = source;
  image.alt = alt;
  lightboxBody.append(image);
  lightboxCaption.textContent = 'Figure from the GroundedHuman v3 manuscript';
  lightboxPrev.disabled = true;
  lightboxNext.disabled = true;
  showLightbox();
}

function closeLightbox() {
  lightbox.hidden = true;
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  lightboxBody.replaceChildren();
  if (lastFocused?.isConnected) lastFocused.focus();
  lastFocused = null;
  maybeAutoplay();
}

document.querySelectorAll('[data-figure]').forEach(button => button.addEventListener('click', () => openFigure(button.dataset.figure, button.dataset.alt, button)));
document.querySelectorAll('[data-close-lightbox]').forEach(element => element.addEventListener('click', closeLightbox));
lightboxPrev.addEventListener('click', () => { if (viewMode === 'panel') openPanel((activePanel - 1 + cases[activeCase].panels.length) % cases[activeCase].panels.length); });
lightboxNext.addEventListener('click', () => { if (viewMode === 'panel') openPanel((activePanel + 1) % cases[activeCase].panels.length); });
document.addEventListener('keydown', event => {
  if (lightbox.hidden) return;
  if (event.key === 'Escape') { event.preventDefault(); closeLightbox(); return; }
  if (event.key === 'Tab') {
    const focusable = [...lightbox.querySelectorAll('button:not(:disabled), video[controls]')];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    return;
  }
  if (viewMode === 'panel' && event.key === 'ArrowLeft') { event.preventDefault(); lightboxPrev.click(); }
  if (viewMode === 'panel' && event.key === 'ArrowRight') { event.preventDefault(); lightboxNext.click(); }
});

renderCase(0);

new IntersectionObserver(([entry]) => {
  comparisonVisible = entry.isIntersecting;
  if (comparisonVisible) maybeAutoplay();
  else pauseVideos();
}, { threshold: 0.15 }).observe(grid);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseVideos();
  else maybeAutoplay();
});
