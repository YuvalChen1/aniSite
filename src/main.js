import './style.css';
import { AudioManager } from './audio.js';

// RSS-to-JSON service (Handles CORS and parsing)
const RSS_TO_JSON = url => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;

const RSS_FEEDS = {
  sports:  RSS_TO_JSON('https://feeds.bbci.co.uk/sport/rss.xml'),
  culture: RSS_TO_JSON('https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml'),
};

// DOM Elements
const character = document.getElementById('character');
const zones = document.querySelectorAll('.interactive-zone');
const modal = document.getElementById('article-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-title');
const articlesContainer = document.getElementById('articles-container');
const gameContainer = document.getElementById('game-container');
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const muteBgmBtn = document.getElementById('mute-bgm');
const muteSfxBtn = document.getElementById('mute-sfx');
const tvScreen = document.getElementById('tv-screen');
const newspaper = document.getElementById('newspaper');

// State
let isAnimating = false;
let audio = null;

// ─── XML RSS Parser ──────────────────────────────────────────────────────────
function parseRSS(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const items = [...doc.querySelectorAll('item')].slice(0, 6);

  return items.map(item => {
    const title = item.querySelector('title')?.textContent || '';
    const description = item.querySelector('description')?.textContent?.replace(/<[^>]+>/g, '') || '';
    const link = item.querySelector('link')?.textContent || '#';
    const pubDate = item.querySelector('pubDate')?.textContent || '';

    // Try multiple thumbnail sources including media:content and media:thumbnail
    let thumb = '';
    const mediaContent = item.getElementsByTagName('media:content')[0];
    const mediaThumb = item.getElementsByTagName('media:thumbnail')[0];
    const enclosure = item.querySelector('enclosure');

    if (mediaContent) thumb = mediaContent.getAttribute('url');
    else if (mediaThumb) thumb = mediaThumb.getAttribute('url');
    else if (enclosure) thumb = enclosure.getAttribute('url');
    else if (item.querySelector('thumbnail')) thumb = item.querySelector('thumbnail').getAttribute('url');

    return { title, description, link, pubDate, thumb };
  });
}

// ─── Start Experience ────────────────────────────────────────────────────────
startBtn.addEventListener('click', () => {
  audio = new AudioManager();
  audio.startBGM();

  startOverlay.style.opacity = '0';
  startOverlay.style.pointerEvents = 'none';
  setTimeout(() => { startOverlay.style.display = 'none'; }, 500);

  init();
});

// ─── Audio Buttons ───────────────────────────────────────────────────────────
muteBgmBtn.addEventListener('click', () => {
  if (!audio) return;
  const muted = audio.toggleBGM();
  muteBgmBtn.classList.toggle('muted', muted);
  muteBgmBtn.title = muted ? 'Unmute Music' : 'Mute Music';
});

muteSfxBtn.addEventListener('click', () => {
  if (!audio) return;
  const muted = audio.toggleSFX();
  muteSfxBtn.classList.toggle('muted', muted);
  muteSfxBtn.title = muted ? 'Unmute SFX' : 'Mute SFX';
});

// ─── Game Init ───────────────────────────────────────────────────────────────
function init() {
  // TV zone
  zones.forEach(zone => {
    zone.addEventListener('click', () => {
      if (isAnimating) return;
      handleZoneClick(zone);
    });
  });

  // Newspaper is its own interactive element (no zone div)
  newspaper.addEventListener('click', () => {
    if (isAnimating) return;
    handleZoneClick(newspaper);
  });

  closeModalBtn.addEventListener('click', closeModal);
}

// ─── Zone Click ───────────────────────────────────────────────────────────────
function handleZoneClick(el) {
  isAnimating = true;
  const category = el.getAttribute('data-target');

  // For the newspaper, walk the character to the counter stool position
  // For TV zone, use the zone bounds as before
  let targetLeft, targetTop;

  if (category === 'sports') {
    // Walk to the counter stool position
    // Counter surface is at ~28%, Stool seat is at ~46%
    targetLeft = 24; 
    targetTop  = 46; 
  } else {
    const elRect = el.getBoundingClientRect();
    const containerRect = gameContainer.getBoundingClientRect();
    targetLeft = ((elRect.left - containerRect.left) + elRect.width / 2) / containerRect.width * 100;
    targetTop  = ((elRect.bottom - containerRect.top) - character.offsetHeight / 2) / containerRect.height * 100;
  }

  moveCharacter(targetLeft, targetTop, () => {
    performAction(category, () => {
      openModal(category);
    });
  });
}

// ─── Character Movement ──────────────────────────────────────────────────────
function moveCharacter(leftPercent, topPercent, onComplete) {
  const currentLeft = parseFloat(character.style.left) || 45;
  const distance = Math.abs(currentLeft - leftPercent);
  const duration = Math.max(1, distance / 20);

  character.classList.remove('idle', 'sitting');
  character.classList.add('walking');
  character.style.transform = leftPercent < currentLeft ? 'scaleX(-1)' : 'scaleX(1)';
  character.style.transition = `left ${duration}s linear, top ${duration}s linear`;
  character.style.left = `calc(${leftPercent}% - 30px)`;
  character.style.top  = `calc(${topPercent}% - 140px)`;

  if (audio) audio.startWalkingSound();

  setTimeout(() => {
    character.classList.remove('walking');
    character.classList.add('idle');
    if (audio) audio.stopWalkingSound();
    onComplete();
  }, duration * 1000);
}

// ─── Arrival Action ───────────────────────────────────────────────────────────
function performAction(category, onComplete) {
  if (category === 'culture') {
    character.classList.remove('idle');
    character.classList.add('sitting');
    // Turn TV on after a short delay (character sits down first)
    setTimeout(() => tvScreen.classList.add('on'), 400);
    if (audio) audio.playTVStatic();
  } else {
    // Sit on counter stool and flip open newspaper
    character.classList.remove('idle');
    character.classList.add('reading');
    newspaper.classList.remove('opening');
    void newspaper.offsetWidth; // force reflow to restart animation
    newspaper.classList.add('opening');
    if (audio) audio.playPaperFlip();
  }

  setTimeout(onComplete, 900);
}

// ─── Modal Open ───────────────────────────────────────────────────────────────
async function openModal(category) {
  const labels = { sports: '🏆 Top Sports', culture: '🎬 Entertainment & Culture' };
  modalTitle.textContent = labels[category] || 'News';

  articlesContainer.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:50px;color:var(--text-muted);">
      <span style="font-size:2rem;">⏳</span><br/>Loading live articles…
    </div>`;

  modal.classList.remove('hidden');
  gameContainer.classList.add('modal-open');

  try {
    const res = await fetch(RSS_FEEDS[category]);
    const data = await res.json();
    
    if (data.status !== 'ok') throw new Error('feed error');
    
    const articles = data.items.slice(0, 6);

    // Enlarge BBC thumbnails to 600px wide for better quality
    const enlargeThumb = url =>
      url ? url.replace(/\/standard\/\d+\//, '/standard/960/') : '';

    articlesContainer.innerHTML = articles.map(a => {
      // rss2json uses 'thumbnail' or 'enclosure.link'
      const img = enlargeThumb(a.thumbnail || (a.enclosure && a.enclosure.link)) 
                  || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600';
      
      const title = a.title.length > 70 ? a.title.substring(0, 70) + '…' : a.title;
      const desc  = a.description.length > 130 ? a.description.substring(0, 130) + '…' : a.description;
      const date  = a.pubDate ? new Date(a.pubDate).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }) : '';

      return `
        <div class="article-card" onclick="window.open('${a.link}','_blank')" title="${a.title}">
          <div class="article-img" style="background-image:url('${img}')"></div>
          <div class="article-content">
            <div class="article-date">${date}</div>
            <h3>${title}</h3>
            <p>${desc || 'Click to read more.'}</p>
            <span class="read-more">Read Article →</span>
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    console.error('RSS fetch error:', err);
    articlesContainer.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:50px;color:#fca5a5;">
        ⚠️ Could not load live articles. Please try again later.
      </div>`;
  }
}

// ─── Modal Close ──────────────────────────────────────────────────────────────
function closeModal() {
  modal.classList.add('hidden');
  gameContainer.classList.remove('modal-open');
  character.classList.remove('sitting', 'reading');
  character.classList.add('idle');
  // Turn TV off and reset newspaper
  tvScreen.classList.remove('on');
  newspaper.classList.remove('opening');
  setTimeout(() => { isAnimating = false; }, 500);
}
