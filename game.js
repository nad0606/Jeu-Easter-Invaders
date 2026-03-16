const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');


const W = canvas.width, H = canvas.height;
let circleAngle = 0;
let storyIndex = 0;
let lastDropTime = 0;
let circleY = 50;



const bgFiles = {
  1: 'fondecraneasterinvaders.jpg',
  2: 'fondecraneasterinvaders2.jpg',
  3: 'fondecraneasterinvaders3.jpg',
    4: 'fondecraneasterinvaders.jpg',
      5: 'fondecraneasterinvaders5.jpg',
        6: 'fondecraneasterinvaders6.jpg',
          7: 'fondecraneasterinvaders.jpg',  
          8: 'fondecraneasterinvaders2.jpg',  
          9: 'fondecraneasterinvaders3.jpg',  
          10: 'fondecraneasterinvaders.jpg',  
          11: 'fondecraneasterinvaders5.jpg',  
          12: 'fondecraneasterinvaders6.jpg',  
          13: 'fondecraneasterinvaders.jpg',  
          14: 'fondecraneasterinvaders2.jpg',  
          15: 'fondecraneasterinvaders3.jpg',
            16: 'fondecraneasterinvaders.jpg',
              17: 'fondecraneasterinvaders5.jpg',
                18: 'fondecraneasterinvaders6.jpg',
                  19: 'fondecraneasterinvaders.jpg',
                    20: 'fondecraneasterinvaders2.jpg',
  
};

const backgrounds = {};

function preloadBackgrounds() {
  Object.entries(bgFiles).forEach(([lvl, src]) => {
    const img = new Image();
    img.src = src;
    backgrounds[lvl] = img;
  });
}
preloadBackgrounds();

function drawBackground() {
  const bg = backgrounds[level];
  if (bg && bg.complete && bg.naturalWidth > 0) {
    
    ctx.drawImage(bg, 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = '#080818';
    ctx.fillRect(0, 0, W, H);
    drawStars();
  }
}



let state = 'idle';
let score = 0, lives = 3, level = 1;
let player, bullets, enemies, mushrooms, carrots, floats;
let keys = {}, mouseX = -1, mouseClick = false;
let animId, lastShot = 0, enemyDir = 1, frameCount = 0;
let lastMushroomTime = 0, lastCarrotTime = 0;


const CARROT_INTERVAL   = 12000; 


const STORAGE_KEY = 'easterInvadersScores';
const MAX_SCORES  = 3;
let scores = [];

function loadScores() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) scores = JSON.parse(s);
  } catch(e) {}
}

function saveScores() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(scores)); }
  catch(e) {}
}

function addScore(name, newScore, lvl) {
  scores.push({ name, score: newScore, level: lvl });
  scores.sort((a, b) => b.score - a.score);
  if (scores.length > MAX_SCORES) scores = scores.slice(0, MAX_SCORES);
  saveScores();
}

function isNewBest(newScore) {
  return scores.length === 0 || newScore >= scores[0].score;
}

loadScores();


canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouseX = e.clientX - r.left;
});
canvas.addEventListener('mouseleave', () => { mouseX = -1; });
canvas.addEventListener('mousedown', e => { if (e.button === 0) mouseClick = true; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

let autoFireInterval = null;

function startAutoFire() {
  if (autoFireInterval) return;
  autoFireInterval = setInterval(() => {
    if (state === 'playing') shoot(Date.now());
  }, 400);
}

function stopAutoFire() {
  clearInterval(autoFireInterval);
  autoFireInterval = null;
}


const isMobile = () => window.matchMedia('(max-width: 768px)').matches;


canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const x = (touch.clientX - r.left) * (canvas.width / r.width);
  player.x = Math.max(0, Math.min(W - player.w, x - player.w / 2));
}, { passive: false });

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  startAutoFire();
  const r = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const x = (touch.clientX - r.left) * (canvas.width / r.width);
  player.x = Math.max(0, Math.min(W - player.w, x - player.w / 2));
}, { passive: false });

canvas.addEventListener('touchend', () => {
  stopAutoFire();
});


const btnLeft  = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

btnLeft.addEventListener('touchstart',  e => { e.preventDefault(); keys['ArrowLeft']  = true;  startAutoFire(); }, { passive: false });
btnLeft.addEventListener('touchend',    e => { e.preventDefault(); keys['ArrowLeft']  = false; stopAutoFire();  }, { passive: false });
btnRight.addEventListener('touchstart', e => { e.preventDefault(); keys['ArrowRight'] = true;  startAutoFire(); }, { passive: false });
btnRight.addEventListener('touchend',   e => { e.preventDefault(); keys['ArrowRight'] = false; stopAutoFire();  }, { passive: false });


document.addEventListener('keydown', e => {
  if (state === 'over') return;
  keys[e.key] = true;
  if ([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))
    e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.key] = false; });


function showBtn(id)  { document.getElementById(id).style.display = 'inline-block'; }
function hideBtn(id)  { document.getElementById(id).style.display = 'none'; }
function hideAllBtns() {
  hideBtn('next-btn');
  hideBtn('replay-btn');
  document.getElementById('start-btn').style.display = 'none';
}

document.getElementById('start-btn').addEventListener('click', e => {
  e.target.style.display = 'none';
  if (state === 'story_end') {
    document.getElementById('rules-overlay').style.display = 'none';
    document.getElementById('btn-area').style.display = 'none';
    startGame();
  } else {
    showStory();
  }
});

document.getElementById('story-next-btn').addEventListener('click', () => {
  if (state === 'midstory') {
    nextMidStoryScene();
  } else {
    nextStoryScene();
  }
});

document.getElementById('story-skip-btn').addEventListener('click', () => {
  document.getElementById('story-controls').style.display = 'none';
  if (state === 'midstory') {
    endMidStory();
  } else {
    document.getElementById('btn-area').style.display = 'flex';
    drawSaveMessage();
  }
});

document.getElementById('next-btn').addEventListener('click', () => { startNextLevel(); });
document.getElementById('replay-btn').addEventListener('click', () => {
  hideAllBtns();
  startGame();
});


function showNameOverlay(isBest) {
  const overlay = document.getElementById('name-overlay');
  document.getElementById('overlay-msg').textContent = isBest
    ? '🌟 Nouveau meilleur score ! Entre ton pseudo !'
    : 'Entre ton pseudo pour le classement';
  document.getElementById('name-input').value = '';
  overlay.style.display = 'flex';
  setTimeout(() => document.getElementById('name-input').focus(), 50);
}
function hideNameOverlay() {
  document.getElementById('name-overlay').style.display = 'none';
}

function startGame() {
  score = 0; lives = 3; level = 1;
  document.getElementById('btn-area').style.display = 'flex';
  player = { x: W/2-60, y: H-120, w: 120, h: 120, speed: 4, hit: 0 };
  bullets = []; mushrooms = []; carrots = []; floats = [];
  lastMushroomTime = 0; lastCarrotTime = 0;
  spawnEnemies();
  updateHUD();
  state = 'playing';
  document.getElementById('message').textContent =
    '← → pour bouger  |  Espace ou ↑ pour tirer  |  Attrape les carottes et évite les champignons !';
  gameLoop();
}
function spawnEnemies() {
  enemies = [];
  const config = getLevelConfig();
  const types = ['egg', 'bell', 'chicken'];
  const positions = getFormationPositions(config.formation, config.enemyCount);

  let idx = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < config.enemyCount; c++) {
      const pos = positions[idx] || { x: 80 + c * 80, y: 60 + r * 80 };
      enemies.push({
        x: pos.x - 40,
        y: pos.y,
        w: 80, h: 80,
        type: types[r],
        variant: c % 3,
        alive: true, hit: 0
      });
      idx++;
    }
  }
  enemyDir = 1;
  circleAngle = 0;
  circleY = 50; 
  lastDropTime = 0;
}


const levelConfigs = [
  /* Niveau 1  */ { formation:'lines',   enemyCount:8,  speed:0.4, mushroomInterval:5000, mushroomSpeed:1.8 },
  /* Niveau 2  */ { formation:'lines',   enemyCount:10,  speed:0.5, mushroomInterval:4500, mushroomSpeed:2.0 },
  /* Niveau 3  */ { formation:'v',       enemyCount:8,  speed:0.6, mushroomInterval:4000, mushroomSpeed:2.2 },
  /* Niveau 4  */ { formation:'v',       enemyCount:10,  speed:0.5, mushroomInterval:3800, mushroomSpeed:2.4 },
  /* Niveau 5  */ { formation:'circle',  enemyCount:9,  speed:0.6, mushroomInterval:3500, mushroomSpeed:2.6 },
  /* Niveau 6  */ { formation:'circle',  enemyCount:12,  speed:0.7, mushroomInterval:3200, mushroomSpeed:2.8 },
  /* Niveau 7  */ { formation:'lines',   enemyCount:12, speed:0.6, mushroomInterval:3000, mushroomSpeed:3.0 },
  /* Niveau 8  */ { formation:'lines',   enemyCount:14, speed:0.7, mushroomInterval:2800, mushroomSpeed:3.2 },
  /* Niveau 9  */ { formation:'zigzag',  enemyCount:10, speed:0.8, mushroomInterval:2600, mushroomSpeed:3.4 },
  /* Niveau 10 */ { formation:'zigzag',  enemyCount:14, speed:0.7, mushroomInterval:2400, mushroomSpeed:3.6 },
  /* Niveau 11 */ { formation:'random',  enemyCount:14, speed:0.8, mushroomInterval:2200, mushroomSpeed:3.8 },
  /* Niveau 12 */ { formation:'circle',  enemyCount:10, speed:1.0, mushroomInterval:2000, mushroomSpeed:4.0 },
  /* Niveau 13 */ { formation:'v',       enemyCount:12, speed:1.0, mushroomInterval:1800, mushroomSpeed:4.2 },
  /* Niveau 14 */ { formation:'v',       enemyCount:14, speed:1.0, mushroomInterval:1600, mushroomSpeed:4.4 },
  /* Niveau 15 */ { formation:'zigzag',  enemyCount:16, speed:0.9, mushroomInterval:1400, mushroomSpeed:4.6 },
  /* Niveau 16 */ { formation:'random',  enemyCount:16, speed:0.7, mushroomInterval:1200, mushroomSpeed:4.8 },
  /* Niveau 17 */ { formation:'circle',  enemyCount:12, speed:1.4, mushroomInterval:1100, mushroomSpeed:5.0 },
  /* Niveau 18 */ { formation:'v',       enemyCount:18, speed:1.2, mushroomInterval:1000, mushroomSpeed:5.2 },
  /* Niveau 19 */ { formation:'zigzag',  enemyCount:18, speed:1.0, mushroomInterval:900,  mushroomSpeed:5.4 },
  /* Niveau 20 */ { formation:'random',  enemyCount:18, speed:1.1, mushroomInterval:800,  mushroomSpeed:5.6 },
];

function getLevelConfig() {
  const idx = Math.min(level - 1, levelConfigs.length - 1);
  return levelConfigs[idx];
}

function getFormationPositions(formation, count) {
  const positions = [];
  const cx = W / 2;

  if (formation === 'lines') {
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < count; c++)
        positions.push({ 
          x: 80 + c * (W - 160) / (count - 1 || 1), 
          y: 60 + r * 60
        });

 } else if (formation === 'v') {
  const cols = count;
  const half = Math.ceil(cols / 2);
  
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < cols; i++) {
      const xOffset = i < half 
        ? cx - (half - i) * 70 
        : cx + (i - half + 1) * 70;
      positions.push({
        x: Math.max(50, Math.min(W - 50, xOffset)),
        y: 30 + row * 70 + (Math.abs(i - half + 0.5)) * 15
      });
    }
  }

  for (let i = 0; i < cols; i++) {
    const xOffset = i < half 
      ? cx - (half - i) * 70 
      : cx + (i - half + 1) * 70;
    positions.push({
      x: Math.max(50, Math.min(W - 50, xOffset)),
      y: 30 + 2 * 70 + (Math.abs(i - half + 0.5)) * 15
    });
  }

  } else if (formation === 'circle') {
    const total = count * 3;
    const radius = 180;
    for (let i = 0; i < total; i++) {
      const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
      positions.push({
        x: cx + Math.cos(angle) * radius,
        y: 180 + Math.sin(angle) * 80
      });
    }


  } else if (formation === 'zigzag') {
    const total = count * 3;
    const cols = Math.ceil(total / 3);
    for (let i = 0; i < total; i++) {
      positions.push({
        x: 80 + (i % cols) * ((W - 160) / (cols - 1 || 1)),
        y: 40 + Math.floor(i / cols) * 70 + (i % 2) * 30
      });
    }

  } else if (formation === 'random') {
    const total = count * 3;
    for (let i = 0; i < total; i++) {
      positions.push({
        x: 80 + Math.random() * (W - 160),
        y: 40 + Math.random() * 150
      });
    }
  }

  return positions;
}


function startNextLevel() {
  hideAllBtns();
  document.getElementById('next-btn').textContent = '🐣 Niveau suivant';
  document.getElementById('btn-area').style.display = 'flex';
  bullets = []; mushrooms = []; carrots = [];
  lastMushroomTime = Date.now();
  lastCarrotTime = Date.now();
  state = 'playing';
  document.getElementById('message').textContent =
    '← → pour bouger  |  Espace ou ↑ pour tirer  |  Attrape les carottes !';
  gameLoop();
}

function updateHUD() {
  document.getElementById('score').textContent = score;
  document.getElementById('lives').textContent = '❤️'.repeat(Math.max(0, lives));
  document.getElementById('level').textContent = level;
}


function addFloat(x, y, text, color) {
  floats.push({ x, y, text, color, alpha: 1, vy: -1.2 });
}
function drawFloats() {
  floats = floats.filter(f => {
    f.y += f.vy; f.alpha -= 0.025;
    if (f.alpha <= 0) return false;
    ctx.save();
    ctx.globalAlpha = f.alpha;
    ctx.fillStyle = f.color;
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
    return true;
  });
}


function shoot(now) {
  if (now - lastShot > 400) {
    if (level >= 8) {
      bullets.push({ x: player.x + player.w/2 - 25, y: player.y, w: 6, h: 12, speed: 7 });
      bullets.push({ x: player.x + player.w/2 + 15, y: player.y, w: 6, h: 12, speed: 7 });
    } else {
      bullets.push({ x: player.x + player.w/2 - 3, y: player.y, w: 6, h: 12, speed: 7 });
    }
    lastShot = now;
  }
}


function hit(a, b) {
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

function drawHitEffect() {
  if (player.hit <= 0) return;
  const alpha = player.hit / 30;
  const gradient = ctx.createRadialGradient(W/4, H/4, H*0.4, W/4, H/4, H);
  gradient.addColorStop(0, 'rgba(255,0,0,0)');
  gradient.addColorStop(1, `rgba(255,0,0,${alpha * 0.7})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}

function drawStars() {
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.arc((i*137.5)%W, (i*97.3)%H, 0.8, 0, Math.PI*2);
    ctx.fill();
  }
}

/* LAPIN*/
const spriteLabin = new Image();
spriteLabin.src = 'lapinface.png';

const spriteLabin2 = new Image();
spriteLabin2.src = 'lapin2fusils.png';

const imgFin = new Image();
imgFin.src = 'lapinensemble.jpg';

/* ENNEMIES*/
const spritesEnemies = {
  chicken: [new Image(), new Image(), new Image()],
  egg:     [new Image(), new Image(), new Image()],
  bell:    [new Image(), new Image(), new Image()],
};
spritesEnemies.chicken[0].src = 'soldatpoulet.png';
spritesEnemies.chicken[1].src = 'soldatpoulet2.png';
spritesEnemies.chicken[2].src = 'soldatpoulet3.png';
spritesEnemies.egg[0].src     = 'soldatoeuf.png';
spritesEnemies.egg[1].src     = 'soldatoeuf2.png';
spritesEnemies.egg[2].src     = 'soldatoeuf3.png';
spritesEnemies.bell[0].src    = 'soldatcloche.png';
spritesEnemies.bell[1].src    = 'soldatcloche2.png';
spritesEnemies.bell[2].src    = 'soldatcloche3.png';

/* CAROTTE CHAMPIGNON*/
const spriteCarotte = new Image();
spriteCarotte.src = 'carotte.png';

const spriteChampignon = new Image();
spriteChampignon.src = 'champignon.png';

function drawMushroom(m) {
  if (spriteChampignon.complete && spriteChampignon.naturalWidth > 0) {
    ctx.drawImage(spriteChampignon, m.x, m.y, m.w, m.h);
  } else {
    ctx.fillStyle = '#cc2200';
    ctx.fillRect(m.x, m.y, m.w, m.h);
  }
}

function drawCarrot(c) {
  if (spriteCarotte.complete && spriteCarotte.naturalWidth > 0) {
    ctx.drawImage(spriteCarotte, c.x, c.y, c.w, c.h);
  } else {
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(c.x, c.y, c.w, c.h);
  }
}

function drawPlayer(p) {
  const sprite = level >= 8 ? spriteLabin2 : spriteLabin;
  if (sprite.complete && sprite.naturalWidth > 0) {
    ctx.drawImage(sprite, p.x, p.y, p.w, p.h);
  } else {
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }
  if (p.hit > 0) {
    ctx.strokeStyle = 'rgba(255,100,100,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  }
}

function drawEnemy(e) {
  if (!e.alive) return;
  ctx.save();
  if (e.hit > 0) ctx.globalAlpha = 0.5;

  const sprites = spritesEnemies[e.type];
  const img = sprites[e.variant];

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, e.x, e.y, e.w, e.h);
  } else {
    
    const colors = { chicken: '#f5c842', egg: '#FF9AA2', bell: '#d4a0ff' };
    ctx.fillStyle = colors[e.type] || '#ffffff';
    ctx.fillRect(e.x, e.y, e.w, e.h);
  }

  ctx.restore();
}

function drawBullet(b) {
  ctx.fillStyle = '#ffff44';
  ctx.beginPath();
  ctx.ellipse(b.x+3, b.y+6, 3, 6, 0, 0, Math.PI*2);
  ctx.fill();
}


const storyImages = {};
['lapinfamille', 'lapinkidnapping', 'lapinlapinedebutjeu','lapinfamille', 'lapinkidnapping', 'lapinlapinedebutjeu', 
 'lapinapinecalin2', 'lapinlapinepeur2', '3lapinspeur','lapinensemble'].forEach(name => {
  const img = new Image();
  img.src = name + '.jpg';
  storyImages[name] = img;
});

const storyScenes = [
  { image: 'lapinfamille',       speaker: 'Narration',        text: "Il était une fois, dans une clairière enchantée parsemée de fleurs colorées et d'arbres majestueux, une famille de lapins qui coulait des jours heureux." },
  { image: 'lapinfamille',       speaker: 'Papa Lapin',        text: "Regardez notre belle clairière, mes enfants ! Est-ce que ce n'est pas le plus beau endroit du monde pour jouer et être heureux ?" },
  { image: 'lapinfamille',       speaker: 'Petit Lapereau',    text: "Oui, Papa Lapin ! C'est le paradis !" },
  { image: 'lapinkidnapping',    speaker: 'Monsieur Poulet',   text: "Eh bien, eh bien, eh bien ! Quel spectacle ! Une famille de lapins heureuse dans leur belle clairière !" },
  { image: 'lapinkidnapping',    speaker: 'Maman Lapine',      text: "Papa Lapin, aide-moi !" },
  { image: 'lapinkidnapping',    speaker: 'Papa Lapin',        text: "Laissez Maman Lapine tranquille !" },
  { image: 'lapinkidnapping',    speaker: 'Monsieur Poulet',   text: "Oh, vous pensez que vous pouvez m'arrêter ?" },
  { image: 'lapinkidnapping',    speaker: 'Papa Lapin',        text: "Je vais vous retrouver ! Et je vais sauver Maman Lapine !" },
  { image: 'lapinlapinedebutjeu',speaker: 'Papa Lapin',        text: "Maman Lapine ! Je ne peux pas te laisser seule face à ce monstre !" },
  { image: 'lapinlapinedebutjeu',speaker: 'Maman Lapine',      text: "Tu le dois. Pour nos petits. Promets-moi de rester toi-même, de rester fort. Ne change pas pour ce monstre, ne deviens pas comme lui, plein de haine." },
];

const midStoryScenes = [
  { image: 'lapinapinecalin2',  speaker: 'Papa Lapin',   text: "Maman Lapine ! Je t'ai trouvée !" },
  { image: 'lapinapinecalin2',  speaker: 'Maman Lapine', text: "Papa Lapin... C'est vraiment toi ? Tu es venu... après tout ce chemin ?" },
  { image: 'lapinapinecalin2',  speaker: 'Papa Lapin',   text: "Je ne t'aurais jamais laissée ici." },
  { image: 'lapinlapinepeur2',   speaker: 'Maman Lapine', text: "Nos bébés... Il est revenu chercher nos bébés pendant que tu risquais ta vie pour moi ? Oh non !" },
  { image: 'lapinlapinepeur2',   speaker: 'Papa Lapin',   text: "Il ne veut pas juste nous faire du mal, il veut nous détruire !" },
  { image: '3lapinspeur',        speaker: 'Monsieur Poulet', text: "Alors, mes petits lapereaux... papa et maman sont partis vous chercher ?" },
  { image: '3lapinspeur',        speaker: 'Lapereau 1',   text: "Laissez-nous tranquilles, Monsieur Poulet ! Papa va venir, et il sera très en colère !" },
  { image: '3lapinspeur',        speaker: 'Lapereau 2',   text: "J'ai froid... et cet endroit fait un bruit bizarre. Je veux retourner dans la clairière avec Maman !" },
];
let midStoryIndex = 0;



function drawStoryScene(index) {
  const scene = storyScenes[index];
  const img = storyImages[scene.image];
  ctx.clearRect(0, 0, W, H);

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, 0, 0, W, H);
  } else {
    ctx.fillStyle = '#080818';
    ctx.fillRect(0, 0, W, H);
  }

  const isNarration = scene.speaker === 'Narration';
  const speakerColors = {
    'Narration':       '#ffffff',
    'Papa Lapin':      '#ffd700',
    'Petit Lapereau':  '#aaffaa',
    'Maman Lapine':    '#f876aa',
    'Monsieur Poulet': '#ea0d0d',
  };

  if (isNarration) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(40, 30, W-80, 90, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(40, 30, W-80, 90, 12); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 16px Arial';
    ctx.textAlign = 'center';
    wrapText(ctx, scene.text, W/2, 62, W-120, 24);
  } else {
    const boxH = 140;
    const boxY = H - boxH - 20;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.beginPath(); ctx.roundRect(40, boxY, W-80, boxH, 14); ctx.fill();
    ctx.strokeStyle = speakerColors[scene.speaker] || '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(40, boxY, W-80, boxH, 14); ctx.stroke();
    ctx.fillStyle = speakerColors[scene.speaker] || '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(scene.speaker + ' :', 65, boxY + 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    wrapText(ctx, scene.text, 65, boxY + 58, W - 120, 24);
  }
  ctx.textAlign = 'left';
}

function showMidStory() {
  state = 'midstory';
  midStoryIndex = 0;
  drawMidStoryScene(midStoryIndex);
  document.getElementById('message').textContent = '';
  document.getElementById('btn-area').style.display = 'none';
  document.getElementById('story-controls').style.display = 'flex';
}

function drawMidStoryScene(index) {
  const scene = midStoryScenes[index];
  const img = storyImages[scene.image];
  ctx.clearRect(0, 0, W, H);
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, 0, 0, W, H);
  } else {
    ctx.fillStyle = '#080818';
    ctx.fillRect(0, 0, W, H);
  }
  const speakerColors = {
    'Papa Lapin':      '#ffd700',
    'Maman Lapine':    '#ffaacc',
    'Monsieur Poulet': '#ff6644',
    'Lapereau 1':      '#aaffaa',
    'Lapereau 2':      '#aaffaa',
  };
  const boxH = 140, boxY = H - boxH - 20;
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.beginPath(); ctx.roundRect(40, boxY, W-80, boxH, 14); ctx.fill();
  ctx.strokeStyle = speakerColors[scene.speaker] || '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(40, boxY, W-80, boxH, 14); ctx.stroke();
  ctx.fillStyle = speakerColors[scene.speaker] || '#ffffff';
  ctx.font = 'bold 18px Arial'; ctx.textAlign = 'left';
  ctx.fillText(scene.speaker + ' :', 65, boxY + 30);
  ctx.fillStyle = '#ffffff'; ctx.font = '16px Arial';
  wrapText(ctx, scene.text, 65, boxY + 58, W - 120, 24);
  ctx.textAlign = 'left';
}

function nextMidStoryScene() {
  midStoryIndex++;
  if (midStoryIndex >= midStoryScenes.length) {
    endMidStory();
  } else {
    drawMidStoryScene(midStoryIndex);
  }
}

function endMidStory() {
  document.getElementById('story-controls').style.display = 'none';
  document.getElementById('btn-area').style.display = 'flex';
  showBtn('next-btn');
  document.getElementById('next-btn').textContent = '▶ Continuer niveau 8';
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

function showStory() {
  state = 'story';
  storyIndex = 0;
  drawStoryScene(storyIndex);
  document.getElementById('message').textContent = '';
  document.getElementById('btn-area').style.display = 'none';
  document.getElementById('story-controls').style.display = 'flex';
}

function nextStoryScene() {
  storyIndex++;
  if (storyIndex >= storyScenes.length) {
    endStory();
  } else {
    drawStoryScene(storyIndex);
  }
}

function endStory() {
  document.getElementById('story-controls').style.display = 'none';
  document.getElementById('btn-area').style.display = 'flex';
  drawSaveMessage();
}

function drawSaveMessage() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#080818';
  ctx.fillRect(0, 0, W, H);
  drawStars();
  state = 'story_end';
  document.getElementById('rules-overlay').style.display = 'flex';
  showBtn('start-btn');
  document.getElementById('start-btn').textContent = '▶ Commencer !';
}
function drawEndGame() {
  cancelAnimationFrame(animId);
  state = 'gameover_win';
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(imgFin, 0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🎉 Félicitations !!', W/2, H/2 - 80);
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px Arial';
  ctx.fillText('La famille Lapin est réunie !', W/2, H/2 - 30);
  ctx.fillStyle = '#ffd700';
  ctx.font = '20px Arial';
  ctx.fillText('Score final : ' + score + ' pts', W/2, H/2 + 20);
  ctx.fillStyle = 'rgb(255, 255, 255)';
  ctx.font = '16px Arial';
  ctx.fillText('Merci d\'avoir joué à Easter Invaders ! 🐰\n By HAMDOUN Nada', W/2, H/2 + 60);
  ctx.textAlign = 'left';
  document.getElementById('message').textContent = '';
  showBtn('replay-btn');
  document.getElementById('replay-btn').textContent = '🐰 Rejouer';
}


function drawCrosshair(x) {
  const cy = player.y + player.h/2;
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x-8, cy); ctx.lineTo(x+8, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, cy-8); ctx.lineTo(x, cy+8); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, cy, 5, 0, Math.PI*2); ctx.stroke();
}


function drawLevelScreen() {
const bg = backgrounds[level];
if (bg && bg.complete) {
  ctx.drawImage(bg, 0, 0, W, H);
} else {
 
  drawBackground();
}
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath(); ctx.roundRect(W/2-200, H/2-100, 400, 170, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(180,120,255,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(W/2-200, H/2-100, 400, 170, 16); ctx.stroke();
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 26px Arial'; ctx.textAlign = 'center';
  ctx.fillText('🎉 Félicitations !', W/2, H/2-50);
  ctx.fillStyle = '#ffffff'; ctx.font = '20px Arial';
  ctx.fillText('Tu passes au niveau ' + level, W/2, H/2-10);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.97)'; ctx.font = '15px Arial';
  ctx.fillText('Prêt(e) ? Clique sur le bouton pour continuer !', W/2, H/2+30);
  ctx.restore();
}


function drawPodium(finalScore, finalLevel, playerName) {
  const best = isNewBest(finalScore);
 drawBackground();
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.beginPath(); ctx.roundRect(W/2-220, 20, 440, H-40, 18); ctx.fill();
  ctx.strokeStyle = 'rgba(220,60,60,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(W/2-220, 20, 440, H-40, 18); ctx.stroke();

  ctx.fillStyle = '#ff4444'; ctx.font = 'bold 28px Arial'; ctx.textAlign = 'center';
  ctx.fillText('😵 Perdu !', W/2, 68);
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '14px Arial';
  ctx.fillText('Les ennemis ont été plus forts que toi pour cette fois !!', W/2, 96);

  if (best) {
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 14px Arial';
    ctx.fillText('🏆 Félicitations ' + playerName + ', c\'est ton nouveau meilleur score !!', W/2, 122);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '12px Arial';
  ctx.fillText('Ton score', W/2, 150);
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 42px Arial';
  ctx.fillText(finalScore, W/2, 198);
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '12px Arial';
  ctx.fillText('niveau ' + finalLevel, W/2, 218);

  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 15px Arial';
  ctx.fillText('— Classement —', W/2, 252);

  const medals = ['🥇','🥈','🥉'];
  const podiumColors = ['#ffd700','#c0c0c0','#cd7f32'];

  if (scores.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '13px Arial';
    ctx.fillText('Aucun score encore', W/2, 285);
  } else {
    scores.forEach((s, i) => {
      const y = 284 + i*62;
      const isCurrent = (s.name === playerName && s.score === finalScore && s.level === finalLevel);
      const bx = W/2-175, bw = 350, bh = 50;
      ctx.fillStyle = isCurrent ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.05)';
      ctx.beginPath(); ctx.roundRect(bx, y-30, bw, bh, 8); ctx.fill();
      if (isCurrent) {
        ctx.strokeStyle = 'rgba(255,215,0,0.45)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(bx, y-30, bw, bh, 8); ctx.stroke();
      }
      ctx.font = '20px Arial'; ctx.textAlign = 'left';
      ctx.fillText(medals[i]||'', bx+8, y-2);
      ctx.fillStyle = podiumColors[i]||'#fff'; ctx.font = 'bold 14px Arial';
      ctx.fillText('#'+(i+1), bx+38, y-2);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 15px Arial';
      ctx.fillText(s.name||'???', bx+65, y-2);
      ctx.fillStyle = '#ffd700'; ctx.font = 'bold 17px Arial'; ctx.textAlign = 'right';
      ctx.fillText(s.score+' pts', bx+bw-10, y-2);
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '12px Arial';
      ctx.fillText('niv. '+s.level, bx+bw-10, y+16);
    });
  }
  ctx.restore();
}


function gameLoop() {
  if (state !== 'playing') return;
  frameCount++;
  const now = Date.now();

  drawBackground();

  
  if (mouseX >= 0) {
    player.x = Math.max(0, Math.min(W-player.w, mouseX - player.w/2));
  } else {
    if (keys['ArrowLeft'] || keys['a']) player.x = Math.max(0, player.x - player.speed);
    if (keys['ArrowRight']|| keys['d']) player.x = Math.min(W-player.w, player.x + player.speed);
  }
  if (keys[' '] || keys['ArrowUp']) shoot(now);
  if (mouseClick) { shoot(now); mouseClick = false; }

 
  bullets = bullets.filter(b => b.y > -20);
  bullets.forEach(b => { b.y -= b.speed; drawBullet(b); });

  const alive = enemies.filter(e => e.alive);
if (alive.length === 0) {
  level++;
  updateHUD();

  if (level > 20) {
    drawEndGame();
    return;
  }

  if (level === 8) {
    cancelAnimationFrame(animId);
    showMidStory();
    return;
  }

  spawnEnemies();
  state = 'levelscreen';
  drawLevelScreen();
  document.getElementById('message').textContent = '';
  showBtn('next-btn');
  return;
}


  const config = getLevelConfig();
  const spd = config.speed;

 if (config.formation === 'circle') {
  circleAngle += 0.008;
  const cx = W / 2;
  if (now - lastDropTime > 2000) {
    circleY += 20;
    lastDropTime = now;
  }
  alive.forEach((e, i) => {
    const angle = circleAngle + (i / alive.length) * Math.PI * 2;
   e.x = cx + Math.cos(angle) * 280 - e.w / 2;  
    e.y = circleY + Math.sin(angle) * 80;
  });

  } else {
    alive.forEach(e => { e.x += enemyDir * spd; });
    const lx = Math.min(...alive.map(e => e.x));
    const rx = Math.max(...alive.map(e => e.x + e.w));
    const border = config.formation === 'lines' ? 10 : 150;
    if (rx > W - border || lx < border) {
      enemyDir *= -1;
      if (config.formation === 'lines') {
        alive.forEach(e => { e.y += 15; });
      }
    }
    if (config.formation !== 'lines' && config.formation !== 'circle') {
  const dropInterval = config.formation === 'v' ? 3000 
    : config.formation === 'zigzag' ? 2000 
    : 2000;
  if (now - lastDropTime > dropInterval) {
    alive.forEach(e => { e.y += 20; });
    lastDropTime = now;
  }
}
  }

  
  if (now - lastMushroomTime > config.mushroomInterval && alive.length > 0) {
    const s = alive[Math.floor(Math.random() * alive.length)];
    mushrooms.push({ x: s.x+s.w/2-30, y: s.y+s.h, w: 60, h: 60, speed: config.mushroomSpeed });
    lastMushroomTime = now;
  }

 
  if (now - lastCarrotTime > CARROT_INTERVAL) {
    carrots.push({ x: Math.random()*(W-30)+10, y: -30, w: 60, h: 80, speed: 0.7 });
    lastCarrotTime = now;
  }

  
  mushrooms = mushrooms.filter(m => {
    m.y += m.speed;
    if (m.y > H) return false;
    drawMushroom(m);
    if (hit(m, player)) {
      lives--; updateHUD(); player.hit = 30;
      addFloat(player.x+player.w/2, player.y-10, '-1 vie', '#ff4444');
      if (lives <= 0) { endGame(); return false; }
      return false;
    }
    return true;
  });

 
  carrots = carrots.filter(c => {
    c.y += c.speed;
    if (c.y > H) return false;
    drawCarrot(c);
    if (hit(c, player)) {
      lives++; updateHUD();
      addFloat(player.x+player.w/2, player.y-10, '+1 vie ❤️', '#ff88aa');
      return false;
    }
    return true;
  });

  
  enemies.forEach(e => {
    if (!e.alive) return;
    if (e.hit > 0) e.hit--;
    drawEnemy(e);
    if (e.y + e.h > player.y) { endGame(); return; }
    bullets.forEach((b, bi) => {
      if (hit(b, e)) {
        e.alive = false;
        const pts = { egg: 100, bell: 200, chicken: 300 };
        const gained = pts[e.type] || 100;
        score += gained; updateHUD();
        addFloat(e.x+e.w/2, e.y, '+'+gained, '#ffff44');
        bullets.splice(bi, 1);
      }
    });
  });

  if (player.hit > 0) player.hit--;
  drawHitEffect();
drawPlayer(player);
 
  drawFloats();
  if (mouseX >= 0) drawCrosshair(mouseX);

  animId = requestAnimationFrame(gameLoop);
}


function endGame() {
  state = 'over';
  cancelAnimationFrame(animId);
  const finalScore = score, finalLevel = level;
  const best = isNewBest(finalScore);
  showNameOverlay(best);

  function confirmName() {
    const raw  = document.getElementById('name-input').value.trim();
    const name = raw || 'Anonyme';
    hideNameOverlay();
    addScore(name, finalScore, finalLevel);
    drawPodium(finalScore, finalLevel, name);
    document.getElementById('message').textContent = '';
    showBtn('replay-btn');
  }

  document.getElementById('name-confirm-btn').onclick = confirmName;
  document.getElementById('name-input').onkeydown = e => {
    if (e.key === 'Enter') confirmName();
  };
}