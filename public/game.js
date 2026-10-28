(() => {
const cv = document.getElementById('c');
let cx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const FONT = 'Bungee, Impact, sans-serif';

// ---------- sparad progress ----------
const freshStats = () => ({levels:0, dmg:0, coins:0, recruit:0, lost:0, kills:{}, bosses:0, maxN:0});
const fresh = () => ({level:1, coins:0, up:{max:0, start:0, dmg:0, rate:0, armor:0}, weps:['gevar'], equip:'gevar', lives:3, run:freshStats(), att:freshStats()});
let save = fresh();
let meta = {perks:[], best:freshStats(), bestLevel:0, runs:0, allKills:{}, seen:{}};
try {
  const s = JSON.parse(localStorage.getItem('truppen-v3'));
  if (s && s.level) save = Object.assign(fresh(), s, {up:Object.assign(fresh().up, s.up), run:Object.assign(freshStats(), s.run), att:Object.assign(freshStats(), s.att)});
  const m = JSON.parse(localStorage.getItem('truppen-meta'));
  if (m) meta = Object.assign(meta, m, {best:Object.assign(freshStats(), m.best), seen:m.seen || {}});
} catch(e) {}
const persist = () => { try { localStorage.setItem('truppen-v3', JSON.stringify(save)); localStorage.setItem('truppen-meta', JSON.stringify(meta)); } catch(e) {} };
const perkVal = id => meta.perks.filter(p => p.id === id).reduce((a, p) => a + (typeof p.v === 'number' ? p.v : 0), 0);
const maxLives = () => 3 + perkVal('life');
function st(k, v){ save.run[k] += v; save.att[k] += v; }
function stMax(n){ if (n > save.run.maxN) save.run.maxN = n; if (n > save.att.maxN) save.att.maxN = n; }
function seeKey(key){
  if (!meta.seen[key]){ meta.seen[key] = {lv:L, k:0}; if (state === 'play') addText(W/2, H*.24, 'Nytt i bestiariet!', C.gold, 16, 1.6); }
  return meta.seen[key];
}
const skinKey = type => `${themeFor(L).skin}:${type || 'grunt'}`;
function stKill(type){ for (const o of [save.run.kills, save.att.kills, meta.allKills]) o[type] = (o[type] || 0) + 1; }

const dec = v => v.toFixed(2).replace('.', ',');
const UPS = {
  max:   {name:'Maxstorlek', steps:60, val:i => Math.round(20 * 1.14 ** i), cost:i => Math.round(30 * 1.36 ** i),
          show:i => `${UPS.max.val(i)} soldater`, next:i => `${UPS.max.val(i)} → ${UPS.max.val(i+1)}`},
  start: {name:'Starttrupp', vals:[20,25,30,35,40,45,50,55,60], cost:i => Math.round(25 * 1.6 ** i),
          show:i => `${UPS.start.vals[i]} % av maxstorleken`, next:i => `${UPS.start.vals[i]} % → ${UPS.start.vals[i+1]} % av maxstorleken`},
  dmg:   {name:'Skada', steps:60, cost:i => Math.round(30 * 1.34 ** i),
          show:i => `×${dec(1.1 ** i)}`, next:i => `Steg ${i}: ×${dec(1.1 ** i)} → ×${dec(1.1 ** (i+1))}`},
  rate:  {name:'Eldhastighet', steps:15, cost:i => Math.round(45 * 1.42 ** i),
          show:i => `×${dec(1.05 ** i)}`, next:i => `×${dec(1.05 ** i)} → ×${dec(1.05 ** (i+1))}`},
  armor: {name:'Rustning', steps:6, cost:i => Math.round(60 * 1.7 ** i),
          show:i => `−${7*i} % förluster`, next:i => `−${7*i} % → −${7*(i+1)} % förluster`}
};
const upSteps = k => UPS[k].vals ? UPS[k].vals.length - 1 : UPS[k].steps;
const capN = () => UPS.max.val(save.up.max);
const startN = () => Math.min(capN(), Math.max(5, Math.round(capN() * (UPS.start.vals[save.up.start] / 100 + perkVal('start')))));
const priceUp = k => Math.round(UPS[k].cost(save.up[k]) * (1 - perkVal('disc')));
const priceWep = k => Math.round(TYPES[k].cost * (1 - perkVal('disc')));
const dmgMul = () => 1.1 ** save.up.dmg * (1 + perkVal('dmg'));
const rateMul = () => 1.05 ** save.up.rate * (1 + perkVal('rate'));
const armor = () => Math.min(.6, .07 * save.up.armor + perkVal('armor'));
const unitStr = () => 3 * dmgMul();

const ETYPES = {
  grunt:  {col:'#7bd04f', hp:1,   walk:1,   r:1,    w:5},
  runner: {col:'#3fc1d9', hp:.45, walk:2.3, r:.75,  w:2,   from:3},
  brute:  {col:'#9a55e0', hp:3.2, walk:.55, r:1.45, w:1,   from:6},
  armor:  {col:'#8d96a3', hp:1.3, walk:.9,  r:1.1,  w:1.3, from:8,  armored:true},
  split:  {col:'#f39a2c', hp:1.2, walk:1,   r:1.05, w:1.3, from:11, split:true}
};
function pickType(){
  const opts = Object.keys(ETYPES).filter(k => !ETYPES[k].from || L >= ETYPES[k].from);
  let tot = opts.reduce((a, k) => a + ETYPES[k].w, 0), r = Math.random() * tot;
  for (const k of opts){ r -= ETYPES[k].w; if (r <= 0) return k; }
  return 'grunt';
}

const TYPES = {
  gevar: {name:'Gevär',      rate:.34, dmg:1,   spd:1000, col:'#ffd84d', r:2.6, max:10, len:26, desc:'Pålitligt allround'},
  kpist: {name:'Kulspruta',  rate:.11, dmg:.38, spd:1150, col:'#fff3a8', r:2,   max:12, len:30, cost:150, desc:'Snabb eld, låg skada per skott'},
  hagel: {name:'Hagelgevär', rate:.55, dmg:1.9, spd:900,  col:'#ffb347', r:2.4, max:9,  len:14, cost:320, spread:.32, range:520, desc:'Bred spridning, kort räckvidd'},
  raket: {name:'Raket',      rate:.8,  dmg:3.8, spd:700,  col:'#ff7a33', r:4.5, max:5,  len:14, cost:650, splash:58, desc:'Långsam men skadar alla runt träffen'},
  laser: {name:'Laser',      rate:.26, dmg:1.0, spd:1600, col:'#6ff3ff', r:2.2, max:8,  len:60, cost:1300, pierce:true, desc:'Går igenom fiender'}
};
const ORDER = ['gevar','kpist','hagel','raket','laser'];
const pc = v => Math.round(v * 100) + ' %';
const PERKS = {
  dmg:     {name:'Skarpskytt',    desc:v => `+${pc(v)} skada`,                                  roll:q => .05 + .30 * q},
  rate:    {name:'Snabbladdning', desc:v => `+${pc(v)} eldhastighet`,                           roll:q => .04 + .16 * q},
  start:   {name:'Veteraner',     desc:v => `Starta varje nivå med +${pc(v)} av maxstorleken`,  roll:q => .05 + .20 * q},
  cash:    {name:'Krigskassa',    desc:v => `Börja varje omgång med ${v} mynt`,                 roll:q => Math.round((60 + 2400 * q ** 1.6) / 10) * 10},
  loot:    {name:'Plundrare',     desc:v => `+${pc(v)} mynt från fällda fiender`,              roll:q => .10 + .40 * q},
  armor:   {name:'Härdade',       desc:v => `−${pc(v)} förluster`,                              roll:q => .05 + .15 * q},
  gate:    {name:'Rekryterare',   desc:v => `Plusportar ger +${pc(v)} fler soldater`,          roll:q => .10 + .40 * q},
  boss:    {name:'Bossjägare',    desc:v => `+${pc(v)} skada mot bossar`,                       roll:q => .15 + .60 * q},
  medic:   {name:'Fältsjukvård',  desc:v => `Återfår ${pc(v)} av maxstorleken var femte sekund`, roll:q => .01 + .03 * q},
  disc:    {name:'Förhandlare',   desc:v => `Allt i förrådet blir ${pc(v)} billigare`,          roll:q => .05 + .20 * q},
  arsenal: {name:'Arsenal',       desc:v => `Börja varje omgång med ${TYPES[v].name}`,         roll:q => q < .15 ? 'kpist' : q < .32 ? 'hagel' : q < .5 ? 'raket' : 'laser', fixed:true},
  life:    {name:'Sjunde livet',  desc:v => `+${v} liv i varje omgång`,                         roll:q => 1, fixed:true, minL:10, w:.35}
};
const RARITY = ['Vanlig','Ovanlig','Sällsynt','Episk'];

const BOSSES = [
  {kind:'tank',  name:'Pansarvagnen', info:'Skjuter granater mot dig. Håll dig undan de röda ringarna.'},
  {kind:'hive',  name:'Bikupan',      info:'Släpper ut småkryp och skyddar sig med en sköld.'},
  {kind:'heli',  name:'Helikoptern',  info:'Rör sig snabbt och fäller bomber. Flytta dig när marken blir röd.'},
  {kind:'titan', name:'Titanen',      info:'Granater, bomber och sköld på en gång.'}
];
const bossOf = L => BOSSES[(L / 5 - 1) % BOSSES.length];

function levelCfg(L){
  return {
    len: Math.min(38 + L * 2.5, 75),
    hp: 13 * 1.31 ** (L - 1),
    spawn: Math.min(.7 + L * .07, 2.4),
    scroll: Math.min(110 + L * 4, 200),
    boss: L % 5 === 0
  };
}

// ---------- perspektiv ----------
const PW = 360, PL = 1000, F = 280, SQY = PL - 130, BOSSY = 300;
let W = 0, H = 0, dpr = 1, K = 1, HZ = 0;
const C = {};
const CKEYS = ['ink','panel','sky1','sky2','hills','hills2','grass1','grass2','road','road2','stripe','kerbA','kerbB','tree','tree2','trunk','friend','friend2','skin','good','bad','gold','coin'];
function readColors(){
  const s = getComputedStyle(document.documentElement);
  CKEYS.forEach(k => C[k] = s.getPropertyValue('--' + k).trim());
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColors);
new MutationObserver(readColors).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
function proj(x, y){
  const z = Math.max(PL - y, -F + 30);
  const s = F / (F + z);
  return {X: W/2 + (x - PW/2) * s * K, Y: HZ + (H - HZ) * s, s: s * K};
}
function resize(){
  const r = cv.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = r.width; H = r.height;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  HZ = H * .17;
  K = (W - 12) / (PW * F / (F + 130));
  readColors();
}
addEventListener('resize', resize);

// ---------- speltillstånd ----------
let state = 'menu', t = 0, dist = 0, speed = 90;
let L = 1, cfg, lt, squad, bullets, enemies, gates, hazards, parts, rings, texts, props;
let spawnE, spawnG, spawnW = 8, fireT, flashT = 0, shake = 0, glow = null, boss = null, bossSpawned, finish, endT;
let earn, keyDir = 0, bossWipe = false, lifeItem = null, medAcc = 0;

const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const clusterR = () => 7 + 4.3 * Math.sqrt(Math.min(Math.max(squad.n, 1), 90));

const THEMES = [
  {name:'Ökenfronten', sky:['#e39a52','#f8dfb2'], hills:['#c4864a','#d9a066'], shape:'dunes',
   g1:'#e2be7c', g2:'#d8b26f', road:'#8a7a63', road2:'#94846c', stripe:'#f6eedc', kerbA:'#e5b62a', kerbB:'#2b2b2b',
   tree:'#5f8f3e', tree2:'#7aab52', trunk:'#7a5a3a', props:['cactus','cactus','rock','barrel','sandbag'], amb:'dust', skin:'beetle'},
  {name:'Bikupeängen', sky:['#6fc0ee','#e8f7d6'], hills:['#5c9a3e','#78b552'], shape:'rolling',
   g1:'#86c34f', g2:'#7cb948', road:'#9a7652', road2:'#a4805b', stripe:'#f2e2b8', kerbA:'#f4c21b', kerbB:'#2a2418',
   tree:'#3d7f3a', tree2:'#5aa34d', trunk:'#7a5a3a', props:['tree','flower','flower','flower','hive'], amb:'pollen', skin:'bee'},
  {name:'Bergspasset', sky:['#6f9fd3','#e6f0fa'], hills:['#7d8fa7','#a3b3c8'], shape:'peaks',
   g1:'#e9eff6', g2:'#dde5ef', road:'#4f5661', road2:'#58606c', stripe:'#f5f5f2', kerbA:'#d8392f', kerbB:'#f4f4f4',
   tree:'#2f5e46', tree2:'#3f7a5a', trunk:'#5a4330', props:['pine','pine','pine','snowrock'], amb:'snow', skin:'yeti'},
  {name:'Vulkanen', sky:['#2e0f10','#a8401c'], hills:['#231615','#3a221e'], shape:'volcano',
   g1:'#3a302d', g2:'#332a27', road:'#26211f', road2:'#2e2826', stripe:'#ff8a3a', kerbA:'#ff6a1f', kerbB:'#1a1514',
   tree:'#2a2220', tree2:'#3a2e2a', trunk:'#1c1614', props:['lavarock','lavarock','deadtree'], amb:'embers', lava:true, skin:'magma'}
];
const chapterOf = L => Math.floor((L - 1) / 5);
const themeFor = L => THEMES[chapterOf(L) % THEMES.length];
function hexMix(a, b, k){
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = sh => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
let TH = null, thKey = '';
function isDark(){ const v = parseInt((C.panel || '#ffffff').slice(1), 16); return ((v >> 16) & 255) + ((v >> 8) & 255) + (v & 255) < 300; }
function theme(){
  const dark = isDark(), key = chapterOf(L) % THEMES.length + '|' + dark;
  if (key !== thKey){
    const base = themeFor(L);
    TH = Object.assign({}, base);
    if (dark){
      const night = '#0b1124', k = base.lava ? .25 : .5;
      for (const f of ['g1','g2','road','road2','tree','tree2','trunk']) TH[f] = hexMix(base[f], night, k);
      TH.sky = base.sky.map((c, i) => hexMix(c, i ? '#2a3360' : night, base.lava ? .3 : .7));
      TH.hills = base.hills.map(c => hexMix(c, night, .55));
      TH.kerbB = hexMix(base.kerbB, night, .3);
    }
    thKey = key;
    makeProps(); amb = [];
  }
  return TH;
}
let amb = [];
function makeProps(){
  props = [];
  const kinds = (TH || themeFor(L)).props, span = PL + 1400, n = 24;
  for (let i = 0; i < n; i++){
    const left = i % 2 === 0;
    props.push({x: left ? -40 - Math.random() * 120 : PW + 40 + Math.random() * 120,
      y: -1300 + i * span / n + Math.random() * 40, kind: kinds[Math.random() * kinds.length | 0], size: .8 + Math.random() * .5,
      hue: Math.random()});
  }
}
function moveProps(dt){ for (const p of props){ p.y += speed * dt; if (p.y > PL + 120) p.y -= PL + 1420; } }

function setupLevel(){
  L = save.level; cfg = levelCfg(L); lt = 0; speed = cfg.scroll;
  squad = {x:PW/2, tx:PW/2, n:startN(), type:save.equip};
  bullets = []; enemies = []; gates = []; hazards = []; parts = []; rings = []; texts = [];
  spawnE = 1.2; spawnG = 1.2; spawnW = 8 + Math.random() * 4; fireT = 0; boss = null; bossSpawned = false; finish = null; endT = 0;
  earn = {kills:0, over:0}; bossWipe = false; medAcc = 0;
  lifeItem = Math.random() < .125 ? {at:cfg.len * (.2 + Math.random() * .6), x:40 + Math.random() * (PW - 80), y:null} : null;
  shake = 0; glow = null;
  theme();
  addText(W/2, H*.38, `Nivå ${L}`, '#fff', 46, 2.2);
  if (cfg.boss) addText(W/2, H*.38 + 46, `Boss: ${bossOf(L).name}`, C.gold, 22, 2.2);
  else addText(W/2, H*.38 + 44, `${themeFor(L).name}, ${L % 5}/5`, '#fff', 18, 2.2);
  updateHud();
}

function addText(X, Y, s, col, size = 24, life = 1){ texts.push({X, Y, s, col, size, life, age:0}); }
function burst(X, Y, col, n = 10, pw = 1){
  for (let i = 0; i < n; i++){
    const a = Math.random() * Math.PI * 2, v = (80 + Math.random() * 200) * pw;
    parts.push({X, Y, vx:Math.cos(a)*v, vy:Math.sin(a)*v - 60, life:.45 + Math.random()*.35, col, size:2 + Math.random()*3*pw});
  }
}

function lose(raw, X, Y, label){
  const k = Math.max(1, Math.round(raw * (1 - armor())));
  st('lost', Math.min(k, Math.max(0, squad.n)));
  squad.n -= k; shake = .3; glow = {col:C.bad, life:.3};
  addText(X, Y, (label ? label + ' ' : '') + '−' + k, C.bad, label ? 22 : 28);
}

function spawnEnemy(x, y, hpScale = 1, type){
  type = type || pickType();
  const T = ETYPES[type];
  const ramp = 1 + .4 * Math.min(1, lt / cfg.len);
  const hp = Math.max(1, Math.round(cfg.hp * (.75 + Math.random() * .5) * ramp * hpScale * T.hp));
  const r = 15 * T.r * (.9 + Math.random() * .2) * (hpScale < 1 ? .8 : 1);
  seeKey(skinKey(type));
  enemies.push({x: x ?? r + Math.random() * (PW - 2*r), y: y ?? -60, r, hp, max:hp, type,
    col:T.col, armored:!!T.armored, split:!!T.split && hpScale >= 1,
    walk:(30 + Math.random() * 30 + L * 1.5) * T.walk, hit:0, wob:Math.random() * 6});
}
function spawnWall(){
  const n = L > 12 ? 6 : 5;
  for (let i = 0; i < n; i++) spawnEnemy((i + .5) * PW / n, -60, .5, "grunt");
  addText(W/2, H*.3, 'Mur!', C.bad, 22);
}
function spawnBoss(){
  const B = bossOf(L);
  const cycle = Math.floor((L / 5 - 1) / BOSSES.length);
  const hp = Math.round(cfg.hp * 180 * (1 + cycle * .3));
  boss = {boss:true, kind:B.kind, name:B.name, x:PW/2, y:-120, r:B.kind === 'heli' ? 38 : 46, hp, max:hp,
    hit:0, ph:0, shell:2.5, bomb:3, minion:3, shield:0, shieldT:5, f:1 + (L/5 - 1) * .12, extra:cycle, timer:45, charging:false};
  enemies.push(boss);
  bossSpawned = true;
  seeKey('boss:' + B.kind);
  addText(W/2, H*.4, B.name + '!', C.bad, 32, 1.6);
  addText(W/2, H*.4 + 34, B.info, '#fff', 13, 2.4);
  addText(W/2, H*.4 + 58, 'Fäll den inom 45 sekunder', C.gold, 13, 2.4);
}

function makeGate(good){
  const r = Math.random(), sc = Math.max(1, capN() / 25);
  if (good){
    if (r < .08 && L >= 2) return {k:'mul', v:2};
    if (r < .27 && save.weps.length > 1){
      const opts = save.weps.filter(o => o !== squad.type);
      return {k:'type', v:opts[Math.random()*opts.length|0]};
    }
    return {k:'add', v:Math.round((2 + Math.random()*3) * sc * (1 + perkVal('gate')))};
  }
  if (r < .22) return {k:'div', v:2};
  return {k:'add', v:-Math.round((2 + Math.random()*4) * sc)};
}
function spawnGateRow(){
  const a = makeGate(true), b = makeGate(Math.random() < .3);
  const flip = Math.random() < .5;
  gates.push({y:-80, L: flip ? a : b, R: flip ? b : a, used:false, fade:0});
}
function gateLabel(g){
  if (g.k === 'add'){ const v = Math.round(g.v); return v >= 0 ? '+' + v : '−' + Math.abs(v); }
  if (g.k === 'mul') return '×' + g.v;
  if (g.k === 'div') return '÷' + g.v;
  return TYPES[g.v].name;
}
function gateCol(g){
  if (g.k === 'type') return C.gold;
  if (g.k === 'mul' || (g.k === 'add' && Math.round(g.v) >= 0)) return C.good;
  return C.bad;
}
function applyGate(g){
  const p = proj(squad.x, SQY), before = squad.n;
  let n = squad.n;
  if (g.k === 'add') n += Math.round(g.v);
  else if (g.k === 'mul') n *= g.v;
  else if (g.k === 'div') n = Math.ceil(n / g.v);
  else { squad.type = g.v; fireT = 0; }
  if (n > capN()){
    const over = n - capN(), c = Math.floor(over / 3);
    n = capN(); earn.over += c; save.coins += c; st('coins', c);
    addText(p.X, p.Y - 100, `Full trupp! +${c} mynt`, C.coin, 18);
  }
  squad.n = n;
  const d = n - before;
  if (d > 0) st('recruit', d); else if (d < 0) st('lost', Math.min(-d, before));
  const col = g.k === 'type' ? C.gold : (d >= 0 ? C.good : C.bad);
  glow = {col, life:.35};
  if (g.k === 'type') addText(p.X, p.Y - 70, TYPES[g.v].name + '!', C.gold, 28);
  else addText(p.X, p.Y - 70, (d >= 0 ? '+' : '−') + Math.abs(d), col, 32);
  burst(p.X, p.Y - 20, col, 18);
}

function updateHud(){
  $('lvlName').textContent = `Nivå ${L}`;
  $('coins').textContent = save.coins;
  $('lives').textContent = save.lives;
  const pr = bossSpawned ? 1 : Math.min(1, lt / cfg.len);
  $('prog').style.width = (pr * 100).toFixed(1) + '%';
}

// ---------- uppdatering ----------
function update(dt){
  t += dt; lt += dt;
  dist += speed * dt * .8;
  moveProps(dt);

  if (keyDir) squad.tx += keyDir * 420 * dt;
  const cr = clusterR();
  squad.tx = clamp(squad.tx, cr, PW - cr);
  squad.x += (squad.tx - squad.x) * Math.min(1, dt * 14);

  // spawn
  const running = lt < (cfg.boss ? cfg.len : cfg.len - 1.5);
  const escort = boss && boss.y >= BOSSY;
  if (running || escort){
    spawnE -= dt;
    if (spawnE <= 0){
      let k = 1;
      if (Math.random() < Math.min(.6, lt / cfg.len * .6 + L * .02)) k++;
      if (L > 6 && Math.random() < .25) k++;
      for (let i = 0; i < k; i++) spawnEnemy();
      spawnE = Math.max(.4, 1.4 / cfg.spawn) * (.6 + Math.random() * .8) * (escort ? 2 : 1);
    }
  }
  if (running && L >= 4 && !cfg.boss){
    spawnW -= dt;
    if (spawnW <= 0){ spawnWall(); spawnW = 10 + Math.random() * 5; }
  }
  spawnG -= dt;
  if (spawnG <= 0){
    const nearBoss = cfg.boss && !bossSpawned && cfg.len - lt < 4;
    if ((running && !nearBoss) || (boss && boss.y >= BOSSY)){ spawnGateRow(); spawnG = boss ? 7 : 5 + Math.random() * 1.5; }
    else spawnG = .5;
  }
  if (!running && cfg.boss && !bossSpawned) spawnBoss();
  if (!cfg.boss && !finish && lt >= cfg.len - 5) finish = {y:-80};
  if (finish){
    finish.y += speed * dt;
    if (finish.y >= SQY) return complete();
  }
  if (bossSpawned && !boss){
    endT += dt;
    if (endT > 1.6) return complete();
  }

  // extra liv på vägen
  if (lifeItem){
    if (lifeItem.y === null && lt >= lifeItem.at){ lifeItem.y = -80; addText(W/2, H*.3, 'Ett liv dök upp!', '#ff6b8a', 18); }
    if (lifeItem.y !== null){
      lifeItem.y += speed * dt;
      if (lifeItem.y >= SQY - 6){
        if (Math.abs(squad.x - lifeItem.x) < cr + 20){
          save.lives = Math.min(9, save.lives + 1); persist();
          const p = proj(lifeItem.x, SQY);
          addText(p.X, p.Y - 90, '+1 liv!', '#ff6b8a', 30); burst(p.X, p.Y - 30, '#ff6b8a', 30, 1.4); glow = {col:'#ff6b8a', life:.4};
          lifeItem = null;
        } else if (lifeItem.y > SQY + 40) lifeItem = null;
      }
    }
  }
  // fältsjukvård
  const med = perkVal('medic');
  if (med > 0 && squad.n > 0 && squad.n < capN()){
    medAcc += capN() * med * dt / 5;
    while (medAcc >= 1 && squad.n < capN()){ squad.n++; medAcc--; st('recruit', 1); }
  }
  stMax(squad.n);

  // eld
  const T = TYPES[squad.type];
  fireT -= dt; flashT -= dt;
  if (fireT <= 0 && squad.n > 0){
    fireT = Math.max(fireT + T.rate / rateMul(), 0); flashT = .06;
    const k = Math.min(squad.n, T.max);
    const per = T.dmg * dmgMul() * squad.n / k;
    for (let i = 0; i < k; i++){
      const ox = k === 1 ? 0 : (-1 + 2 * i / (k - 1)) * cr * .8;
      const y0 = SQY - cr * .5;
      bullets.push({x:squad.x + ox, y:y0, vx: T.spread ? (Math.random()*2 - 1) * T.spread * T.spd : 0, vy:-T.spd,
        dmg:per, share:squad.n / k * T.dmg, splash:T.splash || 0, col:T.col, r:T.r, len:T.len, minY: T.range ? y0 - T.range : -120,
        rocket:squad.type === 'raket', pierce:!!T.pierce, hits:T.pierce ? new Set() : null});
    }
  }
  for (const b of bullets){
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y < b.minY || b.x < -40 || b.x > PW + 40) b.dead = true;
    if (b.rocket && Math.random() < .6){
      const p = proj(b.x, b.y);
      parts.push({X:p.X, Y:p.Y - 18*p.s, vx:(Math.random()-.5)*20, vy:-10, life:.3, col:'rgba(200,200,200,.7)', size:3*p.s});
    }
  }

  // portar
  const m = PW / 2;
  for (const g of gates){
    g.y += speed * dt;
    if (g.used){ g.fade += dt; continue; }
    for (const s of [g.L, g.R]) if (s.pulse) s.pulse = Math.max(0, s.pulse - dt);
    for (const b of bullets){
      if (b.dead || b.gate === g || b.y > g.y + 20 || b.y < g.y - 20) continue;
      b.gate = g;
      const s = b.x < m ? g.L : g.R;
      if (s.k === 'add'){ s.v += .1 * b.share / Math.max(1, Math.sqrt(squad.n)); s.pulse = .12; }
    }
    if (g.y >= SQY - 6){
      g.used = true;
      applyGate(squad.x < m ? g.L : g.R);
      if (squad.n <= 0) return fail();
    }
  }
  gates = gates.filter(g => g.y < PL + 100 && g.fade < .4);

  // fiender
  for (const e of enemies){
    if (e.boss) updateBoss(e, dt);
    else {
      e.y += (speed + e.walk) * dt;
      e.x += clamp(squad.x - e.x, -1, 1) * Math.min(40, 10 + L * 1.2) * dt;
    }
    e.x = clamp(e.x, e.r, PW - e.r);
    if (e.hit > 0) e.hit -= dt;
    for (const b of bullets){
      if (b.dead || (b.hits && b.hits.has(e))) continue;
      const dx = b.x - e.x, dy = b.y - e.y;
      if (dx*dx + dy*dy < (e.r + b.r + 3) ** 2){
        const p = proj(b.x, b.y);
        if (e.shield > 0){ b.dead = true; burst(p.X, p.Y - 40*p.s, '#8fe9ff', 2, .5); continue; }
        if (b.hits) b.hits.add(e); else b.dead = true;
        { const dd = b.dmg * (e.armored && !b.splash ? .5 : 1) * (e.boss ? 1 + perkVal('boss') : 1); st('dmg', Math.min(Math.max(e.hp, 0), dd)); e.hp -= dd; } e.hit = .08;
        if (b.splash){
          burst(p.X, p.Y - 15*p.s, '#ff9a3c', 10);
          rings.push({X:p.X, Y:p.Y, r:4, max:b.splash * p.s, life:.35});
          for (const o of enemies){
            if (o === e || o.shield > 0) continue;
            const ox = o.x - b.x, oy = o.y - b.y;
            if (ox*ox + oy*oy < (b.splash + o.r) ** 2){ const dd = b.dmg * .5 * (o.boss ? 1 + perkVal('boss') : 1); st('dmg', Math.min(Math.max(o.hp, 0), dd)); o.hp -= dd; o.hit = .08; }
          }
        } else if (Math.random() < .4) burst(p.X, p.Y - e.r*p.s, e.boss ? '#ccc' : e.col, 2, .5);
      }
    }
    if (e.boss) continue;
    // kontakt
    const dx = e.x - squad.x, dy = e.y - SQY;
    if (e.hp > 0 && dx*dx + dy*dy < (e.r + cr * .85) ** 2){
      const p = proj(e.x, e.y);
      lose(Math.min(Math.ceil(e.hp / unitStr() / 3), Math.ceil(capN() * .3)), p.X, p.Y - 60);
      e.hp = 0; e.contact = true;
      burst(p.X, p.Y - 20, C.friend, 16);
    } else if (e.hp > 0 && !e.passed && e.y > SQY + 25){
      // straff för missad fiende
      e.passed = true;
      const p = proj(squad.x, SQY);
      lose(Math.max(1, Math.min(Math.ceil(e.hp / unitStr() / 6), Math.ceil(capN() * .15))), p.X, p.Y + 30, 'Missad');
    }
    if (squad.n <= 0) return fail();
  }
  const born = [];
  for (const e of enemies){
    if (e.hp <= 0 && !e.gone){
      e.gone = true;
      if (!e.contact){
        if (e.split) for (const d of [-1, 1]) born.push({x:clamp(e.x + d * 20, 12, PW - 12), y:e.y, r:e.r * .7, hp:Math.max(1, Math.round(e.max * .4)), max:Math.max(1, Math.round(e.max * .4)),
          type:'split', col:'#f7b75a', walk:e.walk * 1.2, hit:0, wob:Math.random() * 6});
        const reward = e.boss ? 0 : Math.max(1, Math.round(e.max * .08 * (1 + perkVal('loot'))));
        earn.kills += reward; save.coins += reward; st('coins', reward);
        if (!e.boss) stKill(e.type || 'grunt');
        seeKey(e.boss ? 'boss:' + e.kind : skinKey(e.type)).k++;
        const p = proj(e.x, e.y);
        burst(p.X, p.Y - e.r*p.s, e.boss ? '#ffb347' : e.col, e.boss ? 50 : 14, e.boss ? 2 : 1);
        rings.push({X:p.X, Y:p.Y - e.r*p.s, r:4, max:(e.boss ? 160 : 40) * p.s, life:e.boss ? .6 : .35});
        if (e.boss){ addText(W/2, H*.4, 'Bossen fälld!', C.gold, 32, 1.6); shake = .5; boss = null; hazards = []; st('bosses', 1); }
      }
    }
  }
  enemies = enemies.filter(e => !e.gone && e.y < PL + 60).concat(born);
  bullets = bullets.filter(b => !b.dead);

  // bossens attacker
  for (const h of hazards){
    if (h.type === 'shell'){
      h.y += h.vy * dt;
      const pr = (h.y - h.y0) / (SQY - h.y0);
      h.x = h.x0 + (h.tx - h.x0) * pr; h.pr = pr;
      if (pr >= 1){
        h.dead = true;
        const p = proj(h.tx, SQY);
        burst(p.X, p.Y - 10, '#ff9a3c', 16, 1.3);
        rings.push({X:p.X, Y:p.Y, r:4, max:h.r * 1.6 * p.s, life:.4});
        if (Math.abs(squad.x - h.tx) < h.r + cr * .55) lose(Math.max(3, Math.ceil(squad.n * .22)), p.X, p.Y - 70, 'Träff');
      }
    } else {
      h.t -= dt;
      if (h.t <= 0){
        h.dead = true;
        const p = proj(h.x, SQY);
        burst(p.X, p.Y - 10, '#ff6a3c', 22, 1.5);
        rings.push({X:p.X, Y:p.Y, r:4, max:h.r * 1.8 * p.s, life:.45});
        if (Math.abs(squad.x - h.x) < h.r + cr * .45) lose(Math.max(3, Math.ceil(squad.n * .25)), p.X, p.Y - 70, 'Bomb');
      }
    }
  }
  hazards = hazards.filter(h => !h.dead);
  if (squad.n <= 0) return fail();

  stepFx(dt);
  updateHud();
}

function updateBoss(e, dt){
  e.ph += dt;
  if (e.y < BOSSY && !e.charging){ e.y = Math.min(BOSSY, e.y + 150 * dt); return; }
  const enraged = e.hp < e.max / 2;
  const f = e.f * (enraged ? 1.35 : 1);
  if (enraged && !e.raged){ e.raged = true; addText(W/2, H*.3, 'Bossen blir rasande!', C.bad, 20, 1.5); }
  e.timer -= dt;
  if (e.timer <= 0){
    if (!e.charging){ e.charging = true; addText(W/2, H*.3, 'Bossen anfaller!', C.bad, 26, 1.5); }
    e.y += 45 * dt;
    if (e.y >= SQY - 70){ squad.n = 0; bossWipe = true; return; }
  }
  if (e.kind === 'heli') e.x = PW/2 + Math.sin(e.ph * 1.25 * Math.min(f, 1.6)) * (PW/2 - 50);
  else if (e.kind === 'hive') e.x = PW/2 + Math.sin(e.ph * .6) * (PW/2 - 70);
  else e.x += clamp(squad.x - e.x, -1, 1) * (e.kind === 'titan' ? 70 : 45) * dt;

  if (e.kind === 'tank' || e.kind === 'titan'){
    e.shell -= dt;
    if (e.shell <= 0){
      const n = (e.kind === 'titan' ? 3 : (f > 1.5 ? 2 : 1)) + e.extra;
      for (let i = 0; i < n; i++){
        const off = n === 1 ? 0 : (i - (n - 1) / 2) * 70;
        hazards.push({type:'shell', x0:e.x, x:e.x, y0:e.y + 20, y:e.y + 20, tx:clamp(squad.x + off, 20, PW - 20), vy:300 + 20 * f, r:24, pr:0});
      }
      e.shell = (e.kind === 'titan' ? 2.6 : 2.1) / f;
    }
  }
  if (e.kind === 'heli' || e.kind === 'titan' || (e.extra > 0 && e.kind === 'tank')){
    e.bomb -= dt;
    if (e.bomb <= 0){
      const n = (e.kind === 'heli' ? 3 : 2) + e.extra;
      const xs = [squad.x];
      while (xs.length < n) xs.push(clamp(squad.x + (Math.random() < .5 ? -1 : 1) * (60 + Math.random() * 80), 30, PW - 30));
      for (const x of xs) hazards.push({type:'bomb', x, t:1.3, T:1.3, r:42});
      e.bomb = (e.kind === 'heli' ? 2.6 : 4) / f;
    }
  }
  if (e.kind === 'hive' || e.kind === 'titan' || e.extra > 0){
    if (e.shield > 0) e.shield -= dt;
    e.shieldT -= dt;
    if (e.shieldT <= 0){ e.shield = 2.5; e.shieldT = 8 / Math.min(f, 1.6); }
  }
  if (e.kind === 'hive'){
    e.minion -= dt;
    if (e.minion <= 0){
      const n = 3 + Math.floor(f);
      for (let i = 0; i < n; i++) spawnEnemy(clamp(e.x + (i - (n-1)/2) * 40, 20, PW - 20), e.y + 30, .6);
      e.minion = 4.5 / f;
    }
  }
}

function stepFx(dt){
  for (const p of parts){ p.X += p.vx*dt; p.Y += p.vy*dt; p.vy += 300*dt; p.vx *= .96; p.life -= dt; }
  parts = parts.filter(p => p.life > 0);
  if (parts.length > 400) parts.splice(0, parts.length - 400);
  for (const r of rings){ r.life -= dt; r.r += (r.max - r.r) * Math.min(1, dt * 12); }
  rings = rings.filter(r => r.life > 0);
  for (const x of texts){ x.Y -= 40*dt; x.life -= dt; x.age += dt; }
  texts = texts.filter(x => x.life > 0);
  if (shake > 0) shake -= dt;
  if (glow){ glow.life -= dt; if (glow.life <= 0) glow = null; }
}

// ---------- ritning ----------
function rr(x, y, w, h, r){
  r = Math.max(0, Math.min(r, w/2, h/2));
  cx.beginPath();
  cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r);
  cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath();
}
function quad(x0, y0, x1, y1, col){
  const a = proj(x0, y0), b = proj(x1, y0), c = proj(x1, y1), d = proj(x0, y1);
  cx.fillStyle = col; cx.beginPath();
  cx.moveTo(a.X, a.Y); cx.lineTo(b.X, b.Y); cx.lineTo(c.X, c.Y); cx.lineTo(d.X, d.Y); cx.closePath(); cx.fill();
}
function shadow(X, Y, rx, a = .25){
  cx.fillStyle = `rgba(0,0,0,${a})`;
  cx.beginPath(); cx.ellipse(X, Y, rx, rx * .35, 0, 0, 7); cx.fill();
}
const fmtN = n => (n = Math.round(n), n >= 1e6) ? (n / 1e6).toFixed(1).replace('.', ',') + 'M' : n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',') + 'k' : String(n);
function label(txt, X, Y, size, col = '#fff', stroke = 'rgba(0,0,0,.55)'){
  cx.font = `${size}px ${FONT}`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.lineJoin = 'round'; cx.lineWidth = Math.max(2, size * .2); cx.strokeStyle = stroke;
  cx.strokeText(txt, X, Y); cx.fillStyle = col; cx.fillText(txt, X, Y);
}

function drawHills(T){
  const [h1, h2] = T.hills;
  if (T.shape === 'peaks'){
    const pk = [[.05,.6],[.2,1],[.36,.7],[.55,1.15],[.72,.75],[.88,1],[1.02,.6]];
    for (const [x, h] of pk){
      const X = x * W, top = HZ - 60 * h, w = 70 * h;
      cx.fillStyle = h2; cx.beginPath(); cx.moveTo(X - w, HZ); cx.lineTo(X, top); cx.lineTo(X + w, HZ); cx.fill();
      cx.fillStyle = '#f6f9fc'; cx.beginPath(); cx.moveTo(X - w*.28, top + 17*h); cx.lineTo(X, top); cx.lineTo(X + w*.28, top + 17*h);
      cx.lineTo(X + w*.1, top + 12*h); cx.lineTo(X - w*.05, top + 19*h); cx.closePath(); cx.fill();
    }
    cx.fillStyle = h1; cx.beginPath(); cx.moveTo(0, HZ);
    for (let i = 0; i <= 10; i++) cx.lineTo(i * W / 10, HZ - 10 - (i % 2) * 14);
    cx.lineTo(W, HZ); cx.closePath(); cx.fill();
    return;
  }
  if (T.shape === 'volcano'){
    const X = W * .62, top = HZ - 72;
    cx.fillStyle = h2; cx.beginPath(); cx.moveTo(X - 150, HZ); cx.lineTo(X - 26, top); cx.lineTo(X + 26, top); cx.lineTo(X + 150, HZ); cx.fill();
    const g = cx.createRadialGradient(X, top, 2, X, top, 40);
    g.addColorStop(0, 'rgba(255,170,60,.95)'); g.addColorStop(1, 'rgba(255,80,20,0)');
    cx.fillStyle = g; cx.fillRect(X - 45, top - 40, 90, 70);
    cx.strokeStyle = 'rgba(255,110,30,.8)'; cx.lineWidth = 2;
    cx.beginPath(); cx.moveTo(X - 8, top + 2); cx.lineTo(X - 20, top + 30); cx.lineTo(X - 34, top + 56); cx.stroke();
    cx.beginPath(); cx.moveTo(X + 10, top + 2); cx.lineTo(X + 22, top + 40); cx.stroke();
    for (let i = 0; i < 4; i++){
      const k = (t * .25 + i / 4) % 1;
      cx.fillStyle = `rgba(60,50,50,${.5 * (1 - k)})`;
      cx.beginPath(); cx.arc(X + Math.sin(k * 6 + i) * 12, top - 10 - k * 70, 12 + k * 24, 0, 7); cx.fill();
    }
    cx.fillStyle = h1; cx.beginPath(); cx.moveTo(0, HZ);
    for (let i = 0; i <= 6; i++) cx.lineTo(i * W / 6, HZ - 8 - Math.cos(i * 2.3) * 7);
    cx.lineTo(W, HZ); cx.closePath(); cx.fill();
    return;
  }
  const smooth = T.shape === 'dunes';
  for (const [col, amp, base, fr] of [[h2, 12, 18, 1.7], [h1, 7, 7, 2.3]]){
    cx.fillStyle = col; cx.beginPath(); cx.moveTo(0, HZ);
    const n = smooth ? 24 : 8;
    for (let i = 0; i <= n; i++){
      const x = i * W / n, a = i / n * Math.PI * (smooth ? 3 : 4);
      cx.lineTo(x, HZ - base - Math.sin(a * fr / 1.7 + fr) * amp - (smooth ? Math.sin(a * 2.7) * 4 : (i % 3) * 5));
    }
    cx.lineTo(W, HZ); cx.closePath(); cx.fill();
  }
}

function drawWorld(){
  const T = theme();
  const g = cx.createLinearGradient(0, 0, 0, HZ);
  g.addColorStop(0, T.sky[0]); g.addColorStop(1, T.sky[1]);
  cx.fillStyle = g; cx.fillRect(0, 0, W, HZ + 2);
  drawHills(T);

  cx.fillStyle = T.g1; cx.fillRect(0, HZ, W, H - HZ);
  const near = PL + 140, o = dist / .8 % 160;
  for (let y = -1600 + o; y < near; y += 160) quad(-3000, y, PW + 3000, y + 80, T.g2);
  if (T.lava){
    const lo = dist / .8 % 520;
    cx.globalAlpha = .75 + .25 * Math.sin(t * 3);
    for (let y = -1560 + lo; y < near; y += 520){
      quad(-300, y, -70, y + 26, '#ff5a1f'); quad(-240, y + 6, -110, y + 18, '#ffc04a');
      quad(PW + 90, y + 260, PW + 320, y + 290, '#ff5a1f'); quad(PW + 140, y + 268, PW + 260, y + 282, '#ffc04a');
    }
    cx.globalAlpha = 1;
  }
  quad(-14, -3000, PW + 14, near, T.road);
  for (let y = -1600 + o; y < near; y += 160) quad(0, y, PW, y + 80, T.road2);
  const ok = dist / .8 % 60;
  for (let y = -1500 + ok; y < near; y += 60){
    quad(-16, y, 0, y + 30, T.kerbA); quad(-16, y + 30, 0, y + 60, T.kerbB);
    quad(PW, y, PW + 16, y + 30, T.kerbA); quad(PW, y + 30, PW + 16, y + 60, T.kerbB);
  }
  for (let y = -1500 + (dist / .8 % 90); y < near; y += 90) quad(PW/2 - 3, y, PW/2 + 3, y + 45, T.stripe);
}

function stepAmb(dt){
  const T = theme(); if (!T.amb) return;
  const rate = {dust:14, pollen:8, snow:40, embers:16}[T.amb];
  let n = rate * dt + Math.random();
  while (n-- > 1 && amb.length < 160){
    if (T.amb === 'snow') amb.push({x:Math.random() * W, y:-5, vx:-10 + Math.random() * 20, vy:40 + Math.random() * 50, r:1 + Math.random() * 2.2, life:12, col:'#ffffff'});
    else if (T.amb === 'embers') amb.push({x:Math.random() * W, y:H + 5, vx:-15 + Math.random() * 30, vy:-(40 + Math.random() * 60), r:1 + Math.random() * 1.8, life:4 + Math.random() * 4, col:Math.random() < .5 ? '#ff8a3a' : '#ffc04a'});
    else if (T.amb === 'pollen') amb.push({x:Math.random() * W, y:HZ + Math.random() * (H - HZ), vx:-8 + Math.random() * 16, vy:-6 - Math.random() * 10, r:1.2 + Math.random() * 1.6, life:3 + Math.random() * 3, col:'#fff2a0'});
    else amb.push({x:-5, y:HZ + Math.random() * (H - HZ) * .7, vx:60 + Math.random() * 80, vy:-4 + Math.random() * 8, r:.8 + Math.random() * 1.6, life:8, col:'#f3dcae'});
  }
  for (const a of amb){ a.x += (a.vx + Math.sin(t * 2 + a.r * 9) * 8) * dt; a.y += a.vy * dt; a.life -= dt; }
  amb = amb.filter(a => a.life > 0 && a.y > -10 && a.y < H + 10 && a.x > -10 && a.x < W + 10);
}
function drawAmb(){
  for (const a of amb){
    cx.globalAlpha = Math.min(1, a.life) * (theme().amb === 'dust' ? .5 : .8);
    cx.fillStyle = a.col; cx.beginPath(); cx.arc(a.x, a.y, a.r, 0, 7); cx.fill();
  }
  cx.globalAlpha = 1;
}

function drawFinish(){
  if (!finish) return;
  const n = 12, w = PW / n;
  for (let r = 0; r < 2; r++)
    for (let i = 0; i < n; i++) quad(i * w, finish.y + r * 14, (i + 1) * w, finish.y + (r + 1) * 14, (i + r) % 2 ? '#111' : '#fff');
}

function drawMarkers(){
  for (const h of hazards){
    const x = h.type === 'shell' ? h.tx : h.x;
    const p = proj(x, SQY), rx = h.r * p.s;
    const k = h.type === 'shell' ? h.pr : 1 - h.t / h.T;
    cx.fillStyle = `rgba(255,50,30,${.15 + .35 * k})`;
    cx.beginPath(); cx.ellipse(p.X, p.Y, rx, rx * .4, 0, 0, 7); cx.fill();
    cx.strokeStyle = '#ff3b2b'; cx.lineWidth = 2.5;
    cx.beginPath(); cx.ellipse(p.X, p.Y, rx, rx * .4, 0, 0, 7); cx.stroke();
    cx.beginPath(); cx.ellipse(p.X, p.Y, rx * k, rx * .4 * k, 0, 0, 7); cx.stroke();
  }
}

function drawShell(h){
  const p = proj(h.x, h.y), s = p.s;
  const lift = Math.sin(Math.PI * Math.min(1, h.pr)) * 90 * s + 20 * s;
  shadow(p.X, p.Y, 8 * s, .3);
  cx.fillStyle = '#ff7a33'; cx.globalAlpha = .45;
  cx.beginPath(); cx.arc(p.X, p.Y - lift, 11 * s, 0, 7); cx.fill(); cx.globalAlpha = 1;
  cx.fillStyle = '#222'; cx.beginPath(); cx.arc(p.X, p.Y - lift, 6.5 * s, 0, 7); cx.fill();
}

function drawProp(p){
  const T = TH || theme();
  const q = proj(p.x, p.y), s = q.s * p.size, X = q.X, Y = q.Y;
  if (Y < HZ - 2) return;
  switch (p.kind){
    case 'cactus':
      shadow(X, Y, 12 * s, .2);
      cx.fillStyle = '#4f8a3a'; cx.strokeStyle = '#2f5a24'; cx.lineWidth = 1.5 * s;
      rr(X - 5*s, Y - 40*s, 10*s, 40*s, 5*s); cx.fill(); cx.stroke();
      rr(X - 15*s, Y - 30*s, 7*s, 16*s, 3.5*s); cx.fill(); cx.stroke();
      rr(X + 8*s, Y - 36*s, 7*s, 18*s, 3.5*s); cx.fill(); cx.stroke();
      cx.fillRect(X - 12*s, Y - 17*s, 8*s, 5*s); cx.fillRect(X + 4*s, Y - 21*s, 8*s, 5*s);
      break;
    case 'rock': case 'snowrock': case 'lavarock':
      shadow(X, Y, 16 * s, .22);
      cx.fillStyle = p.kind === 'lavarock' ? '#2a2322' : (p.kind === 'snowrock' ? '#7d8796' : '#a88a66');
      cx.beginPath(); cx.moveTo(X - 16*s, Y); cx.lineTo(X - 12*s, Y - 13*s); cx.lineTo(X - 2*s, Y - 19*s); cx.lineTo(X + 11*s, Y - 14*s); cx.lineTo(X + 16*s, Y); cx.closePath(); cx.fill();
      if (p.kind === 'snowrock'){ cx.fillStyle = '#f6f9fc'; cx.beginPath(); cx.moveTo(X - 12*s, Y - 13*s); cx.lineTo(X - 2*s, Y - 19*s); cx.lineTo(X + 11*s, Y - 14*s); cx.lineTo(X + 4*s, Y - 11*s); cx.lineTo(X - 6*s, Y - 12*s); cx.fill(); }
      if (p.kind === 'lavarock'){ cx.strokeStyle = `rgba(255,${120 + 60 * Math.sin(t * 4 + p.hue * 9)},40,.95)`; cx.lineWidth = 2 * s;
        cx.beginPath(); cx.moveTo(X - 9*s, Y - 3*s); cx.lineTo(X - 3*s, Y - 11*s); cx.lineTo(X + 5*s, Y - 8*s); cx.lineTo(X + 9*s, Y - 13*s); cx.stroke(); }
      break;
    case 'barrel':
      shadow(X, Y, 9 * s, .25);
      cx.fillStyle = '#7a8a3a'; rr(X - 7*s, Y - 20*s, 14*s, 20*s, 3*s); cx.fill();
      cx.fillStyle = '#56622a'; cx.fillRect(X - 7*s, Y - 14*s, 14*s, 2*s); cx.fillRect(X - 7*s, Y - 7*s, 14*s, 2*s);
      break;
    case 'sandbag':
      shadow(X, Y, 24 * s, .2);
      cx.fillStyle = '#c9b07a'; cx.strokeStyle = '#8d7748'; cx.lineWidth = 1.2 * s;
      for (const [dx, dy] of [[-14,0],[0,0],[14,0],[-7,-8],[7,-8]]){ cx.beginPath(); cx.ellipse(X + dx*s, Y - 4*s + dy*s, 8*s, 4.5*s, 0, 0, 7); cx.fill(); cx.stroke(); }
      break;
    case 'flower': {
      const cols = ['#ff6b8a','#ffd23f','#ffffff','#b07cff','#ff8f3f'];
      cx.strokeStyle = '#3f7a2e'; cx.lineWidth = 1.5 * s;
      cx.beginPath(); cx.moveTo(X, Y); cx.lineTo(X, Y - 14*s); cx.stroke();
      cx.fillStyle = cols[Math.floor(p.hue * cols.length)];
      for (let k = 0; k < 5; k++){ const a = k * 1.2566 + t * .5; cx.beginPath(); cx.arc(X + Math.cos(a) * 4*s, Y - 14*s + Math.sin(a) * 4*s, 3.2*s, 0, 7); cx.fill(); }
      cx.fillStyle = '#7a4a10'; cx.beginPath(); cx.arc(X, Y - 14*s, 2.4*s, 0, 7); cx.fill();
      break; }
    case 'hive':
      shadow(X, Y, 14 * s, .22);
      cx.fillStyle = T.trunk; cx.fillRect(X - 2*s, Y - 34*s, 4*s, 34*s);
      cx.fillStyle = '#e8a91c'; cx.strokeStyle = '#7a4a05'; cx.lineWidth = 1.5 * s;
      cx.beginPath(); cx.ellipse(X, Y - 26*s, 9*s, 12*s, 0, 0, 7); cx.fill(); cx.stroke();
      for (const d of [-5, 0, 5]){ cx.beginPath(); cx.moveTo(X - 8*s, Y - 26*s + d*s); cx.lineTo(X + 8*s, Y - 26*s + d*s); cx.stroke(); }
      cx.fillStyle = '#2a1500'; cx.beginPath(); cx.arc(X, Y - 21*s, 2*s, 0, 7); cx.fill();
      break;
    case 'pine':
      shadow(X, Y, 14 * s, .2);
      cx.fillStyle = T.trunk; cx.fillRect(X - 2.5*s, Y - 10*s, 5*s, 10*s);
      for (let k = 0; k < 3; k++){
        const yb = Y - 8*s - k * 13*s, w = (17 - k * 4) * s;
        cx.fillStyle = T.tree; cx.beginPath(); cx.moveTo(X - w, yb); cx.lineTo(X, yb - 20*s); cx.lineTo(X + w, yb); cx.fill();
        cx.fillStyle = '#f2f6fb'; cx.beginPath(); cx.moveTo(X - w*.45, yb - 11*s); cx.lineTo(X, yb - 20*s); cx.lineTo(X + w*.45, yb - 11*s); cx.fill();
      }
      break;
    case 'deadtree':
      shadow(X, Y, 10 * s, .25);
      cx.strokeStyle = '#140f0e'; cx.lineCap = 'round';
      cx.lineWidth = 4 * s; cx.beginPath(); cx.moveTo(X, Y); cx.lineTo(X, Y - 34*s); cx.stroke();
      cx.lineWidth = 2.2 * s; cx.beginPath();
      cx.moveTo(X, Y - 22*s); cx.lineTo(X - 12*s, Y - 34*s); cx.moveTo(X, Y - 28*s); cx.lineTo(X + 11*s, Y - 40*s);
      cx.moveTo(X - 7*s, Y - 29*s); cx.lineTo(X - 9*s, Y - 40*s); cx.stroke();
      break;
    default: // tree
      shadow(X, Y, 20 * s, .22);
      cx.fillStyle = T.trunk; cx.fillRect(X - 3*s, Y - 22*s, 6*s, 22*s);
      cx.fillStyle = T.tree;
      cx.beginPath(); cx.arc(X, Y - 36*s, 18*s, 0, 7); cx.arc(X - 11*s, Y - 26*s, 12*s, 0, 7); cx.arc(X + 11*s, Y - 26*s, 12*s, 0, 7); cx.fill();
      cx.fillStyle = T.tree2; cx.beginPath(); cx.arc(X - 5*s, Y - 41*s, 9*s, 0, 7); cx.fill();
  }
}

function drawGate(g){
  const a = g.used ? Math.max(0, 1 - g.fade * 2.5) : 1;
  const m = PW / 2;
  [[g.L, 0, m], [g.R, m, PW]].forEach(([s, x0, x1]) => {
    const pl = proj(x0 + 6, g.y), pr = proj(x1 - 6, g.y);
    const sz = pl.s, h = 78 * sz, w = pr.X - pl.X, top = pl.Y - h;
    const col = gateCol(s);
    const gr = cx.createLinearGradient(0, top, 0, pl.Y);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,.05)');
    cx.globalAlpha = a * .55; cx.fillStyle = gr; rr(pl.X, top, w, h, 8*sz); cx.fill();
    cx.globalAlpha = a * .25; cx.fillStyle = '#fff';
    const sh = ((t * 120) % (w + 60)) - 30;
    cx.save(); rr(pl.X, top, w, h, 8*sz); cx.clip();
    cx.beginPath(); cx.moveTo(pl.X + sh, top); cx.lineTo(pl.X + sh + 18*sz, top); cx.lineTo(pl.X + sh - 10*sz, pl.Y); cx.lineTo(pl.X + sh - 28*sz, pl.Y); cx.fill();
    cx.restore();
    cx.globalAlpha = a; cx.lineWidth = 3.5 * sz; cx.strokeStyle = col; rr(pl.X, top, w, h, 8*sz); cx.stroke();
    cx.fillStyle = C.ink;
    cx.fillRect(pl.X - 3*sz, top - 6*sz, 6*sz, h + 6*sz);
    cx.fillRect(pr.X - 3*sz, top - 6*sz, 6*sz, h + 6*sz);
    const sc = 1 + (s.pulse || 0) * 2;
    label(gateLabel(s), pl.X + w/2, top + h/2, (s.k === 'type' ? 17 : 30) * sz * sc);
  });
  cx.globalAlpha = 1;
}

function drawEnemy(e, P, skinO){
  if (e.boss) return drawBoss(e, P);
  const p = P || proj(e.x, e.y), s = p.s, r = e.r * s;
  const flash = e.hit > 0;
  shadow(p.X, p.Y, r * 1.05);
  const skin = skinO || (TH || theme()).skin;
  const fly = skin === 'bee';
  const bob = fly ? (8 + Math.sin(t * 6 + e.wob) * 4) * s : Math.abs(Math.sin(t * 9 + e.wob)) * 4 * s;
  const cy = p.Y - r - bob;
  const X = p.X;
  const eyes = (ey, er, col = '#fff', pup = '#111', angry = true) => {
    cx.fillStyle = col;
    cx.beginPath(); cx.arc(X - r*.33, ey, er, 0, 7); cx.arc(X + r*.33, ey, er, 0, 7); cx.fill();
    if (pup){ cx.fillStyle = pup; cx.beginPath(); cx.arc(X - r*.31, ey + er*.3, er*.5, 0, 7); cx.arc(X + r*.31, ey + er*.3, er*.5, 0, 7); cx.fill(); }
    if (angry){ cx.strokeStyle = '#111'; cx.lineWidth = Math.max(1.5, r*.09);
      cx.beginPath(); cx.moveTo(X - r*.6, ey - er*1.6); cx.lineTo(X - r*.14, ey - er*.9); cx.moveTo(X + r*.6, ey - er*1.6); cx.lineTo(X + r*.14, ey - er*.9); cx.stroke(); }
  };
  if (skin === 'beetle'){
    // skalbagge: ben, skal med mittlinje, huvud mot betraktaren
    const shell = flash ? '#fff' : hexMix(e.col, '#5a3a1a', .35);
    cx.strokeStyle = '#2a1a0c'; cx.lineWidth = Math.max(1.2, r*.09);
    for (let k = 0; k < 3; k++) for (const d of [-1, 1]){
      const a2 = Math.sin(t * 18 + k * 2 + e.wob + (d > 0 ? 1.5 : 0)) * .25;
      const ly = cy - r*.35 + k * r*.38;
      cx.beginPath(); cx.moveTo(X + d*r*.6, ly); cx.lineTo(X + d*r*1.15, ly - r*.1 + a2*r); cx.lineTo(X + d*r*1.3, ly + r*.25 + a2*r); cx.stroke();
    }
    cx.fillStyle = shell; cx.strokeStyle = 'rgba(0,0,0,.5)'; cx.lineWidth = 2*s;
    cx.beginPath(); cx.ellipse(X, cy - r*.1, r*.85, r*.95, 0, 0, 7); cx.fill(); cx.stroke();
    cx.fillStyle = 'rgba(255,255,255,.28)'; cx.beginPath(); cx.ellipse(X - r*.3, cy - r*.45, r*.22, r*.35, -.3, 0, 7); cx.fill();
    cx.strokeStyle = 'rgba(0,0,0,.45)'; cx.lineWidth = 1.6*s; cx.beginPath(); cx.moveTo(X, cy - r*1.02); cx.lineTo(X, cy + r*.55); cx.stroke();
    cx.fillStyle = flash ? '#fff' : '#2a1a0c'; cx.beginPath(); cx.ellipse(X, cy + r*.7, r*.55, r*.38, 0, 0, 7); cx.fill();
    cx.strokeStyle = '#2a1a0c'; cx.lineWidth = Math.max(1.5, r*.1);
    cx.beginPath(); cx.moveTo(X - r*.3, cy + r*.95); cx.quadraticCurveTo(X - r*.5, cy + r*1.25, X - r*.15, cy + r*1.3);
    cx.moveTo(X + r*.3, cy + r*.95); cx.quadraticCurveTo(X + r*.5, cy + r*1.25, X + r*.15, cy + r*1.3); cx.stroke();
    eyes(cy + r*.62, r*.13, '#ffd34a', null, false);
  } else if (skin === 'bee'){
    // geting/bi: vingar, ränder, gadd
    const body = flash ? '#fff' : hexMix('#ffcf2e', e.col, .35);
    const flap = Math.sin(t * 40 + e.wob) * .5;
    cx.fillStyle = 'rgba(230,245,255,.75)'; cx.strokeStyle = 'rgba(80,100,120,.5)'; cx.lineWidth = 1*s;
    for (const d of [-1, 1]){ cx.beginPath(); cx.ellipse(X + d*r*.75, cy - r*.75, r*.6, r*.28, d*(.5 + flap), 0, 7); cx.fill(); cx.stroke(); }
    cx.fillStyle = body; cx.strokeStyle = 'rgba(0,0,0,.5)'; cx.lineWidth = 2*s;
    cx.beginPath(); cx.arc(X, cy, r, 0, 7); cx.fill(); cx.stroke();
    cx.save(); cx.beginPath(); cx.arc(X, cy, r, 0, 7); cx.clip();
    cx.fillStyle = '#1c1a14'; for (const k of [-.35, .2, .72]) cx.fillRect(X - r, cy + k*r, r*2, r*.22);
    cx.restore();
    cx.fillStyle = '#1c1a14'; cx.beginPath(); cx.moveTo(X - r*.18, cy + r*.92); cx.lineTo(X, cy + r*1.35); cx.lineTo(X + r*.18, cy + r*.92); cx.fill();
    cx.strokeStyle = '#1c1a14'; cx.lineWidth = Math.max(1.2, r*.07);
    for (const d of [-1, 1]){ cx.beginPath(); cx.moveTo(X + d*r*.25, cy - r*.9); cx.lineTo(X + d*r*.45, cy - r*1.3); cx.stroke();
      cx.beginPath(); cx.arc(X + d*r*.45, cy - r*1.3, r*.08, 0, 7); cx.fill(); }
    eyes(cy - r*.42, r*.2);
  } else if (skin === 'yeti'){
    // snömonster: lurvig päls, blått ansikte, tänder
    const fur = flash ? '#fff' : hexMix('#eef4fb', e.col, .3);
    cx.fillStyle = fur; cx.strokeStyle = 'rgba(40,60,90,.45)'; cx.lineWidth = 1.5*s;
    cx.beginPath();
    for (let k = 0; k <= 16; k++){ const a2 = k / 16 * Math.PI * 2, rr2 = r * (k % 2 ? .92 : 1.08); cx.lineTo(X + Math.cos(a2) * rr2, cy + Math.sin(a2) * rr2); }
    cx.closePath(); cx.fill(); cx.stroke();
    for (const d of [-1, 1]){ cx.beginPath(); cx.ellipse(X + d*r*.95, cy + r*.25 + Math.sin(t * 9 + e.wob + d) * r*.1, r*.25, r*.4, d*.3, 0, 7); cx.fill(); cx.stroke(); }
    cx.fillStyle = flash ? '#fff' : '#6f9fc9'; cx.beginPath(); cx.ellipse(X, cy - r*.05, r*.62, r*.5, 0, 0, 7); cx.fill();
    eyes(cy - r*.2, r*.16, '#fff', '#111', true);
    cx.fillStyle = '#2a3346'; cx.beginPath(); cx.ellipse(X, cy + r*.25, r*.3, r*.13, 0, 0, Math.PI); cx.fill();
    cx.fillStyle = '#fff'; cx.fillRect(X - r*.2, cy + r*.25, r*.1, r*.1); cx.fillRect(X + r*.1, cy + r*.25, r*.1, r*.1);
  } else {
    // magmagolem: kantig sten med glödande sprickor
    const glow = hexMix('#ff7a2a', e.col, .35);
    cx.fillStyle = flash ? '#fff' : '#3a2e2b'; cx.strokeStyle = '#120d0c'; cx.lineWidth = 2*s;
    cx.beginPath();
    const pts = [[-.95,.2],[-.75,-.65],[-.2,-1],[.45,-.9],[.95,-.35],[.9,.45],[.4,.95],[-.45,.9]];
    pts.forEach(([a2, b2], k) => k ? cx.lineTo(X + a2*r, cy + b2*r) : cx.moveTo(X + a2*r, cy + b2*r));
    cx.closePath(); cx.fill(); cx.stroke();
    const pulse = .65 + .35 * Math.sin(t * 5 + e.wob);
    cx.globalAlpha = pulse; cx.strokeStyle = glow; cx.lineWidth = Math.max(1.5, r*.11);
    cx.beginPath(); cx.moveTo(X - r*.7, cy + r*.1); cx.lineTo(X - r*.3, cy + r*.35); cx.lineTo(X - r*.1, cy + r*.8);
    cx.moveTo(X + r*.75, cy - r*.2); cx.lineTo(X + r*.35, cy + r*.3); cx.lineTo(X + r*.45, cy + r*.75);
    cx.moveTo(X - r*.1, cy - r*.95); cx.lineTo(X + r*.05, cy - r*.6); cx.stroke();
    cx.globalAlpha = 1;
    cx.fillStyle = glow; cx.beginPath(); cx.arc(X - r*.32, cy - r*.25, r*.15, 0, 7); cx.arc(X + r*.32, cy - r*.25, r*.15, 0, 7); cx.fill();
    cx.fillStyle = '#fff3c0'; cx.beginPath(); cx.arc(X - r*.32, cy - r*.25, r*.06, 0, 7); cx.arc(X + r*.32, cy - r*.25, r*.06, 0, 7); cx.fill();
    cx.strokeStyle = '#120d0c'; cx.lineWidth = Math.max(1.5, r*.1);
    cx.beginPath(); cx.moveTo(X - r*.6, cy - r*.55); cx.lineTo(X - r*.12, cy - r*.38); cx.moveTo(X + r*.6, cy - r*.55); cx.lineTo(X + r*.12, cy - r*.38); cx.stroke();
  }
  if (e.armored){
    cx.fillStyle = '#4b525c'; cx.strokeStyle = '#22262c'; cx.lineWidth = 1.5*s;
    cx.beginPath(); cx.arc(p.X, cy - r*.15, r * 1.02, Math.PI * 1.08, Math.PI * 1.92); cx.lineTo(p.X + r*.8, cy - r*.4); cx.lineTo(p.X - r*.8, cy - r*.4); cx.closePath(); cx.fill(); cx.stroke();
  }
  if (e.type === 'brute'){
    cx.fillStyle = '#f2e6c9';
    for (const d of [-1, 1]){ cx.beginPath(); cx.moveTo(p.X + d*r*.55, cy - r*.75); cx.lineTo(p.X + d*r*.95, cy - r*1.35); cx.lineTo(p.X + d*r*.25, cy - r*.92); cx.fill(); }
  }
  if (e.type === 'runner'){
    cx.strokeStyle = 'rgba(255,255,255,.6)'; cx.lineWidth = 2*s;
    for (const d of [-.4, 0, .4]){ cx.beginPath(); cx.moveTo(p.X + d*r, cy - r*1.2); cx.lineTo(p.X + d*r, cy - r*1.9); cx.stroke(); }
  }
  if (e.split){
    cx.strokeStyle = 'rgba(0,0,0,.5)'; cx.lineWidth = 2*s;
    cx.beginPath(); cx.moveTo(p.X, cy - r); cx.lineTo(p.X - r*.12, cy - r*.5); cx.lineTo(p.X + r*.1, cy - r*.1); cx.lineTo(p.X, cy + r); cx.stroke();
  }
  if (!e.noLabel) label(fmtN(Math.ceil(e.hp)), p.X, cy + r*.42, Math.max(10, r * .62));
}

function drawBoss(e, P){
  const p = P || proj(e.x, e.y), s = p.s, r = e.r * s, flash = e.hit > 0;
  let cyMid;
  if (e.kind === 'heli'){
    const lift = 70 * s + Math.sin(t * 3) * 5 * s;
    shadow(p.X, p.Y, r * 1.2, .3);
    const y = p.Y - lift;
    cx.fillStyle = flash ? '#fff' : '#3f5a3a'; cx.strokeStyle = '#141a12'; cx.lineWidth = 2.5*s;
    cx.fillRect(p.X - 5*s, y - 70*s, 10*s, 50*s);
    cx.beginPath(); cx.ellipse(p.X, y, r * 1.1, r * .75, 0, 0, 7); cx.fill(); cx.stroke();
    cx.fillStyle = '#9fd6ff'; cx.beginPath(); cx.ellipse(p.X, y + r*.25, r * .55, r * .35, 0, 0, 7); cx.fill();
    cx.strokeStyle = 'rgba(30,30,30,.75)'; cx.lineWidth = 4*s;
    const a = t * 25, R = r * 2.1;
    for (const k of [0, Math.PI/2]){
      cx.beginPath(); cx.moveTo(p.X - Math.cos(a+k)*R, y - r*.8 - Math.sin(a+k)*R*.3); cx.lineTo(p.X + Math.cos(a+k)*R, y - r*.8 + Math.sin(a+k)*R*.3); cx.stroke();
    }
    cyMid = y;
  } else if (e.kind === 'hive'){
    shadow(p.X, p.Y, r * 1.1, .3);
    const y = p.Y - r - 4*s;
    const g = cx.createRadialGradient(p.X - r*.3, y - r*.4, r*.1, p.X, y, r);
    g.addColorStop(0, '#ffe08a'); g.addColorStop(1, flash ? '#fff' : '#c77d12');
    cx.fillStyle = g; cx.strokeStyle = '#4a2c05'; cx.lineWidth = 3*s;
    cx.beginPath(); cx.arc(p.X, y, r, 0, 7); cx.fill(); cx.stroke();
    cx.strokeStyle = 'rgba(74,44,5,.6)'; cx.lineWidth = 4*s;
    for (let i = -2; i <= 2; i++){ cx.beginPath(); cx.ellipse(p.X, y + i * r * .32, r * Math.sqrt(1 - (i*.32)**2) * .98, r * .08, 0, 0, Math.PI); cx.stroke(); }
    cx.fillStyle = '#2a1500'; cx.beginPath(); cx.arc(p.X, y + r*.35, r*.22, 0, 7); cx.fill();
    cyMid = y;
  } else {
    const big = e.kind === 'titan' ? 1.15 : 1;
    const w = r * 2.1 * big, h = r * 1.5 * big, y0 = p.Y - h - 4*s;
    shadow(p.X, p.Y, w * .6, .3);
    cx.fillStyle = '#2b2f36'; rr(p.X - w/2 - 5*s, y0 + 4*s, 12*s, h, 4*s); cx.fill(); rr(p.X + w/2 - 7*s, y0 + 4*s, 12*s, h, 4*s); cx.fill();
    cx.fillStyle = flash ? '#fff' : (e.kind === 'titan' ? '#8a2b2b' : '#6b7a3a'); cx.strokeStyle = '#1b1e14'; cx.lineWidth = 2.5*s;
    rr(p.X - w/2, y0, w, h, 8*s); cx.fill(); cx.stroke();
    cx.fillStyle = flash ? '#fff' : (e.kind === 'titan' ? '#6e2020' : '#56632d');
    cx.beginPath(); cx.arc(p.X, y0 + h*.45, r*.55*big, 0, 7); cx.fill(); cx.stroke();
    cx.fillStyle = '#1b1e14';
    if (e.kind === 'titan'){ cx.fillRect(p.X - 14*s, y0 + h*.45, 7*s, h*.75); cx.fillRect(p.X + 7*s, y0 + h*.45, 7*s, h*.75); }
    else cx.fillRect(p.X - 4*s, y0 + h*.45, 8*s, h*.75);
    cyMid = y0 + h * .45;
  }
  if (e.shield > 0){
    cx.globalAlpha = .35 + .15 * Math.sin(t * 12);
    cx.fillStyle = '#8fe9ff'; cx.strokeStyle = '#d8f8ff'; cx.lineWidth = 3;
    cx.beginPath(); cx.arc(p.X, cyMid, r * 1.6, 0, 7); cx.fill(); cx.stroke();
    cx.globalAlpha = 1;
  }
}

function drawLife(){
  const p = proj(lifeItem.x, lifeItem.y), s = p.s;
  const h = (34 + Math.sin(t * 4) * 6) * s, X = p.X, Y = p.Y - h, k = 16 * s * (1 + .08 * Math.sin(t * 8));
  shadow(X, p.Y, 12 * s, .25);
  const g = cx.createRadialGradient(X, Y, 2, X, Y, k * 2.4);
  g.addColorStop(0, 'rgba(255,120,150,.55)'); g.addColorStop(1, 'rgba(255,120,150,0)');
  cx.fillStyle = g; cx.beginPath(); cx.arc(X, Y, k * 2.4, 0, 7); cx.fill();
  cx.fillStyle = '#ff3d6a'; cx.strokeStyle = '#fff'; cx.lineWidth = 2.5 * s;
  cx.beginPath(); cx.moveTo(X, Y + k * .9);
  cx.bezierCurveTo(X - k * 1.6, Y - k * .1, X - k * .8, Y - k * 1.3, X, Y - k * .45);
  cx.bezierCurveTo(X + k * .8, Y - k * 1.3, X + k * 1.6, Y - k * .1, X, Y + k * .9);
  cx.fill(); cx.stroke();
}
function drawBossBar(){
  if (!boss || boss.y < 0) return;
  const x = 18, w = W - 36, y = 64;
  label(boss.name + (boss.shield > 0 ? ' (sköld)' : '') + (boss.y < BOSSY && !boss.charging ? '' : boss.charging ? ' anfaller!' : `  ${Math.ceil(boss.timer)} s`), W/2, y, 15, boss.timer < 10 ? C.bad : '#fff');
  cx.fillStyle = 'rgba(0,0,0,.6)'; rr(x, y + 12, w, 12, 6); cx.fill();
  cx.fillStyle = C.bad; rr(x + 2, y + 14, (w - 4) * Math.max(0, boss.hp / boss.max), 8, 4); cx.fill();
}

const SPOTS = [];
for (let i = 0; i < 90; i++){ const a = i * 2.39996, r = 4.3 * Math.sqrt(i); SPOTS.push({dx:Math.cos(a)*r, dy:Math.sin(a)*r*.9, i}); }

function drawSquad(){
  const n = Math.min(Math.max(squad.n, 0), 90);
  const list = SPOTS.slice(0, n).sort((a, b) => a.dy - b.dy);
  const run = t * 16;
  for (const sp of list){
    const p = proj(squad.x + sp.dx, SQY + sp.dy), s = p.s;
    const ph = Math.sin(run + sp.i);
    shadow(p.X, p.Y, 5.5*s, .3);
    cx.fillStyle = '#2a2f3a';
    cx.fillRect(p.X - 3*s, p.Y - 6*s + ph*1.5*s, 2.4*s, 6*s - ph*1.5*s);
    cx.fillRect(p.X + .6*s, p.Y - 6*s - ph*1.5*s, 2.4*s, 6*s + ph*1.5*s);
    cx.fillStyle = C.friend; rr(p.X - 4.5*s, p.Y - 15*s, 9*s, 10*s, 3*s); cx.fill();
    cx.fillStyle = '#222'; cx.fillRect(p.X + 2.5*s, p.Y - 19*s, 2*s, 9*s);
    cx.fillStyle = C.skin; cx.beginPath(); cx.arc(p.X, p.Y - 18*s, 3.4*s, 0, 7); cx.fill();
    cx.fillStyle = C.friend2; cx.beginPath(); cx.arc(p.X, p.Y - 19*s, 4*s, Math.PI, 0); cx.fill();
    if (flashT > 0 && sp.i < 12){ cx.fillStyle = TYPES[squad.type].col; cx.beginPath(); cx.arc(p.X + 3.5*s, p.Y - 21*s, 3*s, 0, 7); cx.fill(); }
  }
  if (state === 'menu') return;
  const cr = clusterR(), p = proj(squad.x, SQY - cr), s = p.s;
  const txt = `${Math.max(0, squad.n)}/${capN()}`;
  cx.font = `${18*s}px ${FONT}`;
  const w = cx.measureText(txt).width + 22*s, h = 26*s, y = p.Y - 40*s;
  cx.fillStyle = squad.n >= capN() ? C.gold : C.friend; cx.strokeStyle = '#fff'; cx.lineWidth = 3*s;
  rr(p.X - w/2, y - h, w, h, 10*s); cx.fill(); cx.stroke();
  cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText(txt, p.X, y - h/2 + 1*s);
  label(TYPES[squad.type].name, p.X, y - h - 10*s, 11*s);
}

function drawBullets(){
  cx.lineCap = 'round';
  for (const b of bullets){
    const a = proj(b.x, b.y), c = proj(b.x - b.vx * .02, b.y + b.len);
    const l1 = 18 * a.s, l2 = 18 * c.s;
    cx.globalAlpha = .35; cx.strokeStyle = b.col; cx.lineWidth = b.r * a.s * 3.2;
    cx.beginPath(); cx.moveTo(a.X, a.Y - l1); cx.lineTo(c.X, c.Y - l2); cx.stroke();
    cx.globalAlpha = 1; cx.strokeStyle = b.rocket ? b.col : '#fff'; cx.lineWidth = b.r * a.s * 1.3;
    cx.beginPath(); cx.moveTo(a.X, a.Y - l1); cx.lineTo(c.X, c.Y - l2); cx.stroke();
  }
}

function draw(){
  cx.save();
  if (shake > 0){ const k = 10 * shake; cx.translate((Math.random() - .5) * k, (Math.random() - .5) * k); }
  drawWorld();
  drawFinish();
  drawMarkers();
  const items = [];
  for (const p of props) items.push({y:p.y, f:() => drawProp(p)});
  for (const g of gates) items.push({y:g.y, f:() => drawGate(g)});
  for (const e of enemies) items.push({y:e.y, f:() => drawEnemy(e)});
  for (const h of hazards) if (h.type === 'shell') items.push({y:h.y, f:() => drawShell(h)});
  if (lifeItem && lifeItem.y !== null) items.push({y:lifeItem.y, f:drawLife});
  items.push({y:SQY, f:drawSquad});
  items.sort((a, b) => a.y - b.y).forEach(i => i.f());
  drawBullets();
  for (const r of rings){
    cx.globalAlpha = Math.max(0, r.life * 2.5); cx.strokeStyle = '#fff3c4'; cx.lineWidth = 4;
    cx.beginPath(); cx.ellipse(r.X, r.Y, r.r, r.r * .6, 0, 0, 7); cx.stroke();
  }
  for (const p of parts){ cx.globalAlpha = Math.max(0, p.life * 1.8); cx.fillStyle = p.col; cx.beginPath(); cx.arc(p.X, p.Y, p.size, 0, 7); cx.fill(); }
  cx.globalAlpha = 1;
  for (const x of texts){
    cx.globalAlpha = Math.max(0, Math.min(1, x.life * 1.5));
    label(x.s, x.X, x.Y, x.size * (1 + Math.max(0, .2 - x.age) * 2.5), x.col, 'rgba(0,0,0,.6)');
  }
  cx.globalAlpha = 1;
  cx.restore();
  if (state === 'play') drawBossBar();
  if (glow){
    const g = cx.createRadialGradient(W/2, H/2, Math.min(W, H) * .35, W/2, H/2, Math.max(W, H) * .75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, glow.col);
    cx.globalAlpha = glow.life * 1.4; cx.fillStyle = g; cx.fillRect(0, 0, W, H); cx.globalAlpha = 1;
  }
  drawAmb();
  const v = cx.createRadialGradient(W/2, H*.6, Math.min(W, H) * .45, W/2, H*.6, Math.max(W, H) * .8);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.28)');
  cx.fillStyle = v; cx.fillRect(0, 0, W, H);
}

// ---------- skärmar ----------
function show(id, on){ $(id).hidden = !on; const c = on && $(id).querySelector('.card'); if (c) c.scrollTop = 0; }
function hideAll(){ ['menu','paused','fail','shop','hud','perk','bestiary'].forEach(id => show(id, false)); }

function startLevel(){
  hideAll(); setupLevel(); state = 'play'; show('hud', true);
}
let lastResult = null;
function complete(){
  state = 'done';
  const comp = 15 + L * 5, surv = Math.floor(Math.max(0, squad.n) * .3), bossB = cfg.boss ? 25 * L : 0;
  save.coins += comp + surv + bossB; st('coins', comp + surv + bossB); st('levels', 1);
  save.level = L + 1;
  if (cfg.boss && save.lives < maxLives()){ save.lives = maxLives(); addText(W/2, H*.4 + 44, 'Liven påfyllda!', '#ff6b8a', 20, 1.4); }
  persist();
  lastResult = {won:true, L, rows:[['Fällda fiender', earn.kills], ['Full trupp', earn.over], ['Klarad nivå', comp], ['Överlevande', surv], ['Boss', bossB]].filter(r => r[1] > 0)};
  const p = proj(squad.x, SQY);
  addText(W/2, H*.4, 'Nivå klar!', C.gold, 38, 1.4);
  burst(p.X, p.Y - 30, C.gold, 40, 1.6);
  hazards = []; enemies = [];
  setTimeout(() => openShop(), 1300);
}
const TYPE_NAMES = {grunt:'Vanliga', runner:'Löpare', brute:'Bjässar', armor:'Pansrade', split:'Delare'};
const totalKills = k => Object.values(k).reduce((a, b) => a + b, 0);
const topKill = k => { const e = Object.entries(k).sort((a, b) => b[1] - a[1])[0]; return e ? `${TYPE_NAMES[e[0]] || e[0]} (${fmtN(e[1])})` : '–'; };
const STAT_ROWS = [
  ['Nivåer klarade', s => fmtN(s.levels), 'levels'], ['Skada utdelad', s => fmtN(s.dmg), 'dmg'], ['Mynt intjänade', s => fmtN(s.coins), 'coins'],
  ['Soldater rekryterade', s => fmtN(s.recruit), 'recruit'], ['Soldater förlorade', s => fmtN(s.lost), 'lost'],
  ['Fiender fällda', s => fmtN(totalKills(s.kills)), 'kills'], ['Mest fällda', s => topKill(s.kills)],
  ['Bossar fällda', s => fmtN(s.bosses), 'bosses'], ['Största trupp', s => fmtN(s.maxN), 'maxN']
];
function statsHtml(cols){
  return `<tr><td></td>${cols.map(c => `<th>${c[0]}</th>`).join('')}</tr>` +
    STAT_ROWS.map(r => `<tr><td>${r[0]}</td>${cols.map(c => `<td class="${c[2] && c[2](r) ? 'rec' : ''}">${r[1](c[1])}</td>`).join('')}</tr>`).join('');
}
function heartsHtml(){
  const m = Math.max(maxLives(), save.lives);
  return Array.from({length:m}, (_, i) => `<span class="heart ${i < save.lives ? '' : 'off'}">♥</span>`).join('');
}
let runOver = false, deathL = 1;
function fail(){
  state = 'fail';
  squad.n = 0;
  save.lives--;
  deathL = L;
  lastResult = {won:false, L, rows:[['Fällda fiender', earn.kills], ['Full trupp', earn.over]].filter(r => r[1] > 0)};
  const why = bossWipe ? 'Bossen nådde truppen. ' : '';
  if (save.lives > 0){
    runOver = false;
    $('failTitle').textContent = 'Truppen föll';
    $('failLives').innerHTML = heartsHtml();
    $('failInfo').textContent = why + `Nivå ${L}. Du har ${save.lives} ${save.lives === 1 ? 'liv' : 'liv'} kvar och behåller mynt och uppgraderingar.`;
    $('failStats').innerHTML = statsHtml([['Försöket', save.att], ['Omgången', save.run]]);
    $('toShop').textContent = 'Till förrådet';
    save.att = freshStats();
  } else {
    runOver = true;
    meta.runs++;
    const b = meta.best, r = save.run;
    const isRec = row => row[2] && row[2] !== 'kills' && r[row[2]] > (b[row[2]] || 0) || (row[2] === 'kills' && totalKills(r.kills) > (b.killsN || 0));
    const recFlags = STAT_ROWS.map(isRec);
    for (const k of ['levels','dmg','coins','recruit','lost','bosses','maxN']) b[k] = Math.max(b[k] || 0, r[k]);
    b.killsN = Math.max(b.killsN || 0, totalKills(r.kills));
    meta.bestLevel = Math.max(meta.bestLevel, L);
    const bestView = Object.assign({}, b, {kills: meta.allKills});
    $('failTitle').textContent = 'Omgången är slut';
    $('failLives').innerHTML = '';
    $('failInfo').textContent = why + `Alla liv är slut. Du kom till nivå ${L}${L >= meta.bestLevel ? ', ditt bästa hittills' : ` (rekord: nivå ${meta.bestLevel})`}.`;
    $('failStats').innerHTML = statsHtml([['Omgången', r, row => recFlags[STAT_ROWS.indexOf(row)]], ['Rekord', Object.assign({}, bestView, {kills: Object.fromEntries(Object.entries(meta.allKills))})]]);
    // rekordkolumnen visar fällda fiender som bästa omgång, mest fällda som totalt
    $('failStats').querySelectorAll('tr')[6].lastElementChild.textContent = fmtN(b.killsN);
    $('toShop').textContent = 'Välj förmåga';
  }
  persist();
  show('hud', false); show('fail', true); $('toShop').focus();
}

// ---------- förmågor ----------
let offers = [], pickIdx = -1;
function rollOffers(Ld){
  const q0 = Math.max(0, Math.min(1, (Ld - 1) / 29));
  const held = meta.perks.map(p => p.id);
  let pool = Object.keys(PERKS).filter(k => !held.includes(k) && (!PERKS[k].minL || Ld >= PERKS[k].minL));
  offers = [];
  while (offers.length < 3 && pool.length){
    const tot = pool.reduce((a, k) => a + (PERKS[k].w || 1), 0);
    let r = Math.random() * tot, id = pool[0];
    for (const k of pool){ r -= PERKS[k].w || 1; if (r <= 0){ id = k; break; } }
    pool = pool.filter(k => k !== id);
    const q = Math.max(0, Math.min(1, q0 + (Math.random() - .5) * .2));
    const P = PERKS[id];
    let v = P.roll(q);
    if (!P.fixed && typeof v === 'number') v = id === 'cash' ? Math.round(v * (.9 + Math.random() * .2) / 10) * 10 : +(v * (.9 + Math.random() * .2)).toFixed(3);
    offers.push({id, v, r: q < .2 ? 0 : q < .45 ? 1 : q < .75 ? 2 : 3});
  }
}
const perkHtml = (p, attrs = '') => `<button class="perkc r${p.r}" ${attrs}><span class="rar">${RARITY[p.r]}</span><b>${PERKS[p.id].name}</b><small>${PERKS[p.id].desc(p.v)}</small></button>`;
function openPerk(){
  hideAll(); state = 'perk';
  rollOffers(deathL); pickIdx = -1;
  $('perkInfo').textContent = `Du kom till nivå ${deathL}. Högre nivå ger starkare förmågor. Du kan bära tre, och en förmåga kan bara ersättas, inte tas bort.`;
  renderPerk();
  show('perk', true);
}
function renderPerk(){
  $('perkOffers').innerHTML = offers.map((p, i) => perkHtml(p, `data-pick="${i}" class-on="${i === pickIdx}"`).replace(`class="perkc`, `class="perkc${i === pickIdx ? ' on' : ''}`)).join('');
  const full = meta.perks.length >= 3;
  $('perkSlotsTitle').textContent = full ? (pickIdx >= 0 ? 'Välj vilken förmåga som ska ersättas' : 'Dina förmågor (3 av 3)') : `Dina förmågor (${meta.perks.length} av 3)`;
  $('perkSlots').innerHTML = meta.perks.length ? meta.perks.map((p, j) =>
    `<div class="row"><div class="info"><b>${PERKS[p.id].name}</b><small>${PERKS[p.id].desc(p.v)}</small></div>${full && pickIdx >= 0 ? `<button class="buy" data-rep="${j}">Ersätt</button>` : ''}</div>`).join('')
    : '<p class="perkline">Inga ännu.</p>';
}
$('perk').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.pick !== undefined){
    pickIdx = +b.dataset.pick;
    if (meta.perks.length < 3){ meta.perks.push(offers[pickIdx]); newRun(); }
    else renderPerk();
  } else if (b.dataset.rep !== undefined && pickIdx >= 0){
    meta.perks[+b.dataset.rep] = offers[pickIdx]; newRun();
  }
});
$('perkSkip').onclick = () => newRun();
function newRun(){
  save = fresh();
  save.coins = perkVal('cash');
  const ars = meta.perks.find(p => p.id === 'arsenal');
  if (ars && !save.weps.includes(ars.v)){ save.weps.push(ars.v); save.equip = ars.v; }
  save.lives = maxLives();
  persist();
  lastResult = null;
  openShop();
  $('shopTitle').textContent = 'Ny omgång';
}
function perksLine(){
  if (!meta.perks.length) return '';
  return `<p class="perkline"><b>Förmågor:</b> ${meta.perks.map(p => `${PERKS[p.id].name} (${PERKS[p.id].desc(p.v)})`).join('. ')}</p>`;
}

function coinHtml(n){ return `<span class="coin"></span>${n}`; }
function openShop(){
  hideAll(); state = 'shop';
  if (lastResult){
    $('shopTitle').textContent = lastResult.won ? `Nivå ${lastResult.L} klar` : 'Förrådet';
    $('earn').hidden = !lastResult.rows.length;
    $('earn').innerHTML = lastResult.rows.map(r => `<div><span>${r[0]}</span><b>+${r[1]}</b></div>`).join('');
  } else { $('shopTitle').textContent = 'Förrådet'; $('earn').hidden = true; }
  renderShop();
  const nextL = save.level;
  $('next').textContent = (lastResult && !lastResult.won ? 'Försök nivå ' : 'Starta nivå ') + nextL + (nextL % 5 === 0 ? ' (boss)' : '');
  show('shop', true);
}
function renderShop(){
  $('shopCoins').textContent = save.coins;
  $('shopPerks').innerHTML = perksLine() + `<p class="perkline"><b>Liv:</b> ${'♥'.repeat(Math.max(0, save.lives))}</p>`;
  $('ups').innerHTML = Object.keys(UPS).map(k => {
    const u = UPS[k], i = save.up[k], top = upSteps(k), maxed = i >= top;
    const cost = maxed ? 0 : priceUp(k);
    const pips = top > 15 ? '' : `<div class="pips">${Array.from({length:top}, (_, j) => `<i class="${j < i ? 'on' : ''}"></i>`).join('')}</div>`;
    return `<div class="row"><div class="info"><b>${u.name}</b><small>${maxed ? u.show(i) + ' (max)' : u.next(i)}</small>${pips}</div>` +
      (maxed ? `<button class="buy max" disabled>Max</button>` : `<button class="buy" data-up="${k}" ${save.coins < cost ? 'disabled' : ''} aria-label="Köp ${u.name} för ${cost} mynt">${coinHtml(cost)}</button>`) + `</div>`;
  }).join('');
  $('weps').innerHTML = ORDER.map(k => {
    const T = TYPES[k], owned = save.weps.includes(k);
    let btn;
    if (!owned) btn = `<button class="buy" data-wep="${k}" ${save.coins < priceWep(k) ? 'disabled' : ''} aria-label="Köp ${T.name} för ${priceWep(k)} mynt">${coinHtml(priceWep(k))}</button>`;
    else if (save.equip === k) btn = `<button class="buy sel" disabled style="opacity:1">Vald</button>`;
    else btn = `<button class="buy" data-equip="${k}" style="background:var(--panel2);color:var(--ink)">Välj</button>`;
    return `<div class="row"><div class="info"><b>${T.name}</b><small>${T.desc}${owned && save.equip !== k ? '. Kan dyka upp i gula portar' : ''}</small></div>${btn}</div>`;
  }).join('');
}
$('shop').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.up){
    const k = b.dataset.up, c = priceUp(k);
    if (save.coins >= c && save.up[k] < upSteps(k)){ save.coins -= c; save.up[k]++; persist(); renderShop(); }
  } else if (b.dataset.wep){
    const k = b.dataset.wep, c = priceWep(k);
    if (save.coins >= c){ save.coins -= c; save.weps.push(k); save.equip = k; persist(); renderShop(); }
  } else if (b.dataset.equip){ save.equip = b.dataset.equip; persist(); renderShop(); }
});

function openMenu(){
  hideAll(); state = 'menu'; show('menu', true);
  const progressed = save.level > 1 || save.coins > 0;
  $('play').textContent = progressed ? `Fortsätt (nivå ${save.level})` : 'Spela';
  $('resetBtn').hidden = !progressed;
  $('resetBtn').textContent = 'Börja om från nivå 1 (förmågorna finns kvar)';
  resetArmed = false;
  $('menuPerks').innerHTML = perksLine();
  squad = {x:PW/2, tx:PW/2, n:12, type:'gevar'}; L = save.level; cfg = levelCfg(L);
}
let resetArmed = false;
$('resetBtn').onclick = () => {
  if (!resetArmed){ resetArmed = true; $('resetBtn').textContent = 'Tryck igen för att radera allt'; return; }
  newRun(); openMenu();
};
// ---------- bestiarium ----------
const SKINS = ['beetle','bee','yeti','magma'];
const BEAST_NAMES = {
  beetle:{grunt:'Sandbagge', runner:'Ökenlöpare', brute:'Hornbagge', armor:'Pansarbagge', split:'Klyvbagge'},
  bee:   {grunt:'Geting', runner:'Pilgeting', brute:'Bålgeting', armor:'Plåtgeting', split:'Svärmgeting'},
  yeti:  {grunt:'Snöyeti', runner:'Snöstormare', brute:'Bergsyeti', armor:'Isyeti', split:'Tvillingyeti'},
  magma: {grunt:'Magmagolem', runner:'Glödgnista', brute:'Lavajätte', armor:'Basaltgolem', split:'Klyvgolem'}
};
const SKIN_LORE = {
  beetle:'Gräver upp sig ur sanden längs Ökenfronten.',
  bee:'Svärmar från bikuporna på ängen och flyger strax ovanför marken.',
  yeti:'Lurviga varelser som vaktar Bergspasset.',
  magma:'Smält sten som fått liv i Vulkanens glöd.'
};
const TYPE_ABIL = {
  grunt:'Går mot truppen och styr långsamt åt ditt håll. Missad kostar soldater.',
  runner:'Mer än dubbelt så snabb men har knappt hälften så mycket liv. Svår att hinna skjuta.',
  brute:'Långsam men tål drygt tre gånger så mycket som en vanlig. Tar många soldater om den når fram.',
  armor:'Pansaret halverar all skada utom från raketer.',
  split:'Delar sig i två mindre och snabbare kopior när den fälls.'
};
const BOSS_ABIL = {
  tank:'Kör efter truppen i sidled och skjuter granater. Röda ringar visar var de landar.',
  hive:'Släpper ut småkryp i omgångar och skyddar sig med en sköld som stoppar alla skott.',
  heli:'Svischar fram och tillbaka över vägen och fäller bomber. Marken blir röd innan de smäller.',
  titan:'Har granater, bomber och sköld på en gång. Det svåraste bossen kan.'
};
const BOSS_COMMON = 'Alla bossar blir rasande under halva livet och anfaller om de inte fällts inom 45 sekunder.';
function firstPossible(c, from){
  for (let l = Math.max(1, from); l < 200; l++) if (chapterOf(l) % THEMES.length === c) return l;
  return from;
}
let bestReturn = 'menu', bestPortraits = [];
function openBestiary(from){
  bestReturn = from;
  hideAll(); state = 'bestiary';
  const total = SKINS.length * Object.keys(ETYPES).length + BOSSES.length;
  const seen = Object.keys(meta.seen).length;
  $('bestProg').textContent = `${seen} av ${total} upptäckta`;
  $('bestBar').style.width = (seen / total * 100) + '%';
  bestPortraits = [];
  let html = '';
  SKINS.forEach((skin, c) => {
    const th = THEMES[c], B = BOSSES[c];
    html += `<h3>Kapitel ${c + 1}: ${th.name}</h3>`;
    for (const type of Object.keys(ETYPES)){
      const key = `${skin}:${type}`, info = meta.seen[key], id = 'bp' + bestPortraits.length;
      bestPortraits.push({id, skin, type, seen:!!info});
      html += info
        ? `<div class="beast"><canvas id="${id}" width="144" height="144"></canvas><div class="info"><b>${BEAST_NAMES[skin][type]}</b><div class="meta">Först mött på nivå ${info.lv}. Fällda: ${fmtN(info.k)}</div><small>${TYPE_ABIL[type]} ${SKIN_LORE[skin]}</small></div></div>`
        : `<div class="beast unseen"><canvas id="${id}" width="144" height="144"></canvas><div class="info"><b>???</b><div class="meta">Inte mött ännu</div><small>Kan dyka upp från nivå ${firstPossible(c, ETYPES[type].from || 1)}.</small></div></div>`;
    }
    const key = 'boss:' + B.kind, info = meta.seen[key], id = 'bp' + bestPortraits.length;
    bestPortraits.push({id, boss:B.kind, seen:!!info});
    html += info
      ? `<div class="beast boss"><canvas id="${id}" width="144" height="144"></canvas><div class="info"><b>${B.name}<span class="tag">Boss</span></b><div class="meta">Först mött på nivå ${info.lv}. Fälld: ${fmtN(info.k)} ${info.k === 1 ? 'gång' : 'gånger'}</div><small>${BOSS_ABIL[B.kind]} ${BOSS_COMMON}</small></div></div>`
      : `<div class="beast boss unseen"><canvas id="${id}" width="144" height="144"></canvas><div class="info"><b>???<span class="tag">Boss</span></b><div class="meta">Inte mött ännu</div><small>Väntar på nivå ${(c + 1) * 5}.</small></div></div>`;
  });
  $('bestList').innerHTML = html;
  show('bestiary', true);
  $('bestClose').focus({preventScroll:true});
}
function drawPortraits(){
  const main = cx;
  for (const b of bestPortraits){
    const c = document.getElementById(b.id); if (!c) continue;
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    cx = g;
    try {
      if (b.boss){
        const e = {boss:true, kind:b.boss, r:b.boss === 'heli' ? 38 : 46, hit:0, shield:0, x:0, y:0};
        const sc = b.boss === 'heli' ? .9 : 1;
        drawBoss(e, {X:72, Y:b.boss === 'heli' ? 128 : 118, s:sc});
      } else {
        const T = ETYPES[b.type];
        const e = {r:15 * T.r, hp:1, type:b.type, col:T.col, armored:!!T.armored, split:!!T.split, hit:0, wob:b.id.length, noLabel:true};
        const sc = 2.1 / Math.max(1, T.r * .95);
        drawEnemy(e, {X:72, Y:b.skin === 'bee' ? 122 : 112, s:sc}, b.skin);
      }
    } catch(err) {}
    cx = main;
    if (!b.seen){
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = isDark() ? '#3a4157' : '#5b5f6b'; g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-over';
    }
  }
}
$('bestMenu').onclick = () => openBestiary('menu');
$('bestShop').onclick = () => openBestiary('shop');
$('bestClose').onclick = () => {
  if (bestReturn === 'shop'){ hideAll(); state = 'shop'; renderShop(); show('shop', true); }
  else openMenu();
};

$('play').onclick = () => {
  if (save.level === 1 && save.coins === 0 && !meta.perks.length) { lastResult = null; startLevel(); }
  else { lastResult = null; openShop(); }
};
$('next').onclick = startLevel;
$('toShop').onclick = () => runOver ? openPerk() : openShop();
function pause(){ if (state !== 'play') return; state = 'paused'; persist(); show('paused', true); $('resume').focus(); }
function resume(){ if (state !== 'paused') return; state = 'play'; show('paused', false); }
$('pause').onclick = pause;
$('resume').onclick = resume;
$('quit').onclick = () => { show('paused', false); state = 'play'; fail(); };
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ---------- styrning ----------
let drag = null;
cv.addEventListener('pointerdown', e => { drag = {x:e.clientX, tx:squad.tx}; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => {
  if (!drag || state !== 'play') return;
  squad.tx = drag.tx + (e.clientX - drag.x) / proj(PW/2, SQY).s * 1.25;
});
const endDrag = () => drag = null;
cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
const keys = {};
const setDir = () => keyDir = ((keys.ArrowRight || keys.d) ? 1 : 0) - ((keys.ArrowLeft || keys.a) ? 1 : 0);
addEventListener('keydown', e => {
  keys[e.key] = true; setDir();
  if (e.key === 'Escape' || e.key === 'p') state === 'play' ? pause() : resume();
  if (e.key.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.key] = false; setDir(); });

// ---------- loop ----------
let last = performance.now();
function loop(now){
  const dt = Math.min(.033, (now - last) / 1000); last = now;
  stepAmb(dt);
  if (state === 'play') update(dt);
  else if (state === 'done'){ t += dt; dist += speed * dt * .8; moveProps(dt); for (const b of bullets) b.y += b.vy * dt; stepFx(dt); }
  else if (state === 'bestiary'){ t += dt; dist += 70 * dt; moveProps(dt); drawPortraits(); }
  else if (state === 'menu' || state === 'shop'){ t += dt; speed = 90; dist += 70 * dt; moveProps(dt); flashT = 0; if (texts) stepFx(dt); }
  draw();
  requestAnimationFrame(loop);
}
resize(); theme();
bullets = []; enemies = []; gates = []; hazards = []; parts = []; rings = []; texts = [];
openMenu();
$('play').focus();
requestAnimationFrame(loop);
})();
