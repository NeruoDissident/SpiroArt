// ===== Theme + Assets =====
const Themes = {
  sunsetPlum: { name: 'Sunset Orange + Plum', accent: '#6d2d79', highlight: '#ff8c40' },
  cherryAmber: { name: 'Cherry + Amber', accent: '#d81b60', highlight: '#ffb300' },
  royalGold: { name: 'Royal Purple + Gold', accent: '#6a1b9a', highlight: '#ffb400' },
  mono: { name: 'Mono', accent: '#555555', highlight: '#dddddd' },
};

const Assets = {
  gearImg: null,
  gearReady: false,
  ringImg: null,
  ringReady: false,
};
(function preload(){
  const g = new Image();
  g.onload = () => { Assets.gearImg = g; Assets.gearReady = true; };
  g.onerror = () => { Assets.gearReady = false; };
  g.src = 'assets/svg/gear.svg';
  const r = new Image();
  r.onload = () => { Assets.ringImg = r; Assets.ringReady = true; };
  r.onerror = () => { Assets.ringReady = false; };
  r.src = 'assets/svg/ring.svg';
})();

// Convert #rrggbb to rgba(r,g,b,a)
function hexWithAlpha(hex, alpha){
  const v = hex.replace('#','');
  const r = parseInt(v.slice(0,2),16), g=parseInt(v.slice(2,4),16), b=parseInt(v.slice(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function currentStrokeColor(){
  let col = penColor.value;
  if (penCycle && penCycle.checked){
    // Use palette-based color cycling instead of hue shifting
    const palette = ColorPalettes[State.selectedPalette];
    if (palette && palette.colors.length > 0){
      const spd = parseFloat((cycleSpeed && cycleSpeed.value) || '1');
      const colorIndex = Math.floor((State.cyclePhase * spd * 0.1) % palette.colors.length);
      col = palette.colors[colorIndex];
    } else {
      // Fallback to hue cycling if no palette
      const base = hexToHsl(penColor.value);
      const spd = parseFloat((cycleSpeed && cycleSpeed.value) || '1');
      const h = (base.h + State.cyclePhase*spd) % 360;
      col = hslToHex(h, Math.min(95, base.s||85), Math.min(60, base.l||50));
    }
  }
  return col;
}

// Stroke a short segment with optional strong glow so it's clearly visible
function strokeSegmentWithGlow(ctx, p1, p2, color){
  const baseW = parseFloat(penWidth.value || '1.5');
  if (penGlow && penGlow.checked){
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = hexWithAlpha(color, 0.8);
    ctx.lineWidth = Math.max(4, baseW * 2.5);
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(12, baseW * 8);
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    ctx.restore();
  }
  // crisp core
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = color;
  ctx.lineWidth = baseW;
  ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  ctx.restore();
}

function hexToHsl(hex){
  let r = 0, g = 0, b = 0;
  const v = hex.replace('#','');
  r = parseInt(v.substring(0,2),16)/255; g=parseInt(v.substring(2,4),16)/255; b=parseInt(v.substring(4,6),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h=0,s=0,l=(max+min)/2;
  if (max!==min){
    const d = max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h = (g-b)/d + (g<b?6:0); break;
      case g: h = (b-r)/d + 2; break;
      case b: h = (r-g)/d + 4; break;
    }
    h*=60;
  }
  return {h, s:s*100, l:l*100};
}

// SpiroArt — interactive spirograph in a single file
// Mobile + desktop friendly, fullscreen and screenshot capable.

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

// Mobile haptic feedback helper
function hapticFeedback(type = 'light') {
  if ('vibrate' in navigator) {
    switch(type) {
      case 'light': navigator.vibrate(10); break;
      case 'medium': navigator.vibrate(20); break;
      case 'heavy': navigator.vibrate([10, 10, 20]); break;
      case 'success': navigator.vibrate([50, 50, 100]); break;
    }
  }
}

// Color Palettes - curated themes with 5-6 colors each
const ColorPalettes = {
  autumn: {
    name: 'Autumn',
    colors: ['#D2691E', '#CD853F', '#B22222', '#FF8C00', '#DAA520', '#8B4513']
  },
  cyberpunk: {
    name: 'Cyberpunk',
    colors: ['#FF00FF', '#00FFFF', '#FF1493', '#00FF00', '#FFD700', '#9400D3']
  },
  noir: {
    name: 'Noir',
    colors: ['#FFFFFF', '#C0C0C0', '#808080', '#404040', '#202020', '#000000']
  },
  pastel: {
    name: 'Pastel',
    colors: ['#FFB6C1', '#98FB98', '#87CEEB', '#DDA0DD', '#F0E68C', '#FFA07A']
  },
  neon: {
    name: 'Neon',
    colors: ['#39FF14', '#FF073A', '#FF6EC7', '#00E5FF', '#FFFF00', '#FF4500']
  },
  ocean: {
    name: 'Ocean',
    colors: ['#006994', '#13A3C4', '#5FB3D4', '#A2D5F2', '#07889B', '#66B2B2']
  },
  sunset: {
    name: 'Sunset',
    colors: ['#FF6B35', '#F7931E', '#FFD23F', '#EE4B6A', '#963484', '#592E83']
  }
};

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const octx = overlay.getContext('2d');

const panel = document.getElementById('panel');
const openPanelBtn = document.getElementById('btn-open-panel');
const closePanelBtn = document.getElementById('btn-close-panel');
const segs = $$('.segmented .seg');

const ringList = document.getElementById('ring-list');
const gearList = document.getElementById('gear-list');
const holeList = document.getElementById('hole-list');

const penColor = document.getElementById('pen-color');
const penWidth = document.getElementById('pen-width');
const speedInput = document.getElementById('draw-speed');
const themeSelect = document.getElementById('theme-select');
const penGlow = document.getElementById('pen-glow');
const penCycle = document.getElementById('pen-cycle');
const cycleSpeed = document.getElementById('cycle-speed');
const randomSpeedChk = document.getElementById('random-speed');
const themeCycleChk = document.getElementById('theme-cycle');
const autoShotChk = document.getElementById('auto-screenshot');

const paletteSelect = document.getElementById('palette-select');
const colorPaletteGrid = document.getElementById('color-palette-grid');

const btnDraw = document.getElementById('btn-draw');
const btnStop = document.getElementById('btn-stop');
const btnPreview = document.getElementById('btn-preview');
const btnClear = document.getElementById('btn-clear');
const btnRandom = document.getElementById('btn-random');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnScreenshot = document.getElementById('btn-screenshot');

const hint = document.getElementById('hint');

// Responsive canvas sizing
let AppReady = false;
function resizeCanvas(){
  // Get actual canvas container dimensions for responsive layout
  const container = document.querySelector('.canvas-wrap');
  const rect = container.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const dpr = window.devicePixelRatio || 1;
  
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  overlay.width = w * dpr;
  overlay.height = h * dpr;
  
  // Set canvas style to container size, but draw at high DPI
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  overlay.style.width = w + 'px';
  overlay.style.height = h + 'px';

  // The actual drawing context is now larger, so scale all drawing operations
  ctx.resetTransform();
  octx.resetTransform();
  ctx.scale(dpr, dpr);
  octx.scale(dpr, dpr);
  
  State.center = { x: w/2, y: h/2 };
  
  // After resizing, we just need to redraw the static elements.
  // The scaling is handled by the canvas context transform.
  if (AppReady) {
    redrawStatic();
  }
}
window.addEventListener('resize', resizeCanvas);
// Listen for orientation changes on mobile
window.addEventListener('orientationchange', () => {
  setTimeout(resizeCanvas, 100);
});

// Setup container observer after DOM is ready
let containerObserver;
// initial sizing and drawing are performed in init() below once State is ready

// Theme select
if (themeSelect){
  themeSelect.addEventListener('change', () => {
    const val = themeSelect.value;
    if (Themes[val]){ State.theme = val; drawOverlayFrame(); }
  });
}

// Manual input state
let isPointerDown = false;
let spaceHeld = false;
let lastAngle = null;
let usingGlobalPointerHandlers = false;
let gesturePivot = null; // set on pointerdown
let gestureDeltaAccum = 0; // radians awaiting application
let gestureRaf = 0;
// Visual guide for gestures
let showGestureGuide = false;
let gestureStartAngle = null;

function applyGestureDeltaFrame(){
  if (!isPointerDown && Math.abs(gestureDeltaAccum) < 1e-5){ gestureRaf = 0; return; }
  const delta = gestureDeltaAccum; gestureDeltaAccum = 0;
  if (delta !== 0){ manualStep(delta); }
  gestureRaf = requestAnimationFrame(applyGestureDeltaFrame);
}

// Data model for rings/gears/holes
const Rings = [
  { id: 'R96', R: 180 },
  { id: 'R84', R: 160 },
  { id: 'R72', R: 140 },
  { id: 'R60', R: 120 },
  { id: 'R48', R: 96 },
];

const Gears = [
  { id: 'G48', r: 90 },
  { id: 'G42', r: 78 },
  { id: 'G36', r: 66 },
  { id: 'G30', r: 54 },
  { id: 'G24', r: 42 },
  { id: 'G18', r: 32 },
];


function makeHoles(gear) {
  // Create a set of hole offsets as ratios of gear radius
  const ratios = [0.1, 0.2, 0.3, 0.42, 0.55, 0.68, 0.8, 0.92];
  return ratios.map((k, i) => ({ id: `${gear.id}-H${i+1}`, d: gear.r * k, k }));
}

// UI State
const State = {
  pattern: 'hypo', // 'hypo' or 'epi'
  ring: Rings[0],
  gear: Gears[2],
  hole: null,
  anim: null,
  t: 0,
  speed: 1,
  drawing: false,
  autoRandom: false,
  cyclePhase: 0, // time-based hue rotation
  center: { x: 0, y: 0 },
  steps: 0,
  theme: 'sunsetPlum',
  // Enhanced animation state for smooth easing
  gearSpinVelocity: 0,
  targetSpinSpeed: 0.5,
  lastOverlayTime: 0,
  // Color palette system
  selectedPalette: 'neon',
  selectedColorIndex: 0,
  // Input behavior
  controlMode: 'anywhere', // 'anywhere' | 'center'
  inputSensitivity: 1.0,   // 1:1 mapping
  anywhereGain: 1.0        // no extra gain; gesture delta maps directly
};
State.hole = makeHoles(State.gear)[4];

// Populate selectors
function chip({label, sub, active, thumb}){
  const el = document.createElement('button');
  el.className = 'chip';
  el.innerHTML = `${label}${sub ? `<div class="sub">${sub}</div>` : ''}`;
  if (thumb){ el.prepend(thumb); }
  if (active) el.classList.add('active');
  return el;
}

function populateRings(){
  ringList.innerHTML = '';
  Rings.forEach(r => {
    const c = chip({label: r.id, sub: `${r.R}px`, active: r.id === State.ring.id});
    c.addEventListener('click', () => { selectRing(r, c); });
    ringList.appendChild(c);
  });
}
function selectRing(r, el){
  State.ring = r;
  setActive(el, ringList);
  pop(el);
  redrawStatic();
}

function populateGears(){
  gearList.innerHTML = '';
  Gears.forEach(g => {
    const thumb = document.createElement('canvas'); thumb.width = 56; thumb.height = 32; thumb.style.width='100%'; thumb.style.height='auto'; thumb.style.display='block'; thumb.style.marginBottom='6px';
    drawGearThumb(thumb.getContext('2d'), g);
    const c = chip({label: g.id, sub: `${g.r}px`, active: g.id === State.gear.id, thumb});
    c.addEventListener('click', () => { selectGear(g, c); });
    gearList.appendChild(c);
  });
}
function selectGear(g, el){
  State.gear = g;
  setActive(el, gearList);
  pop(el);
  populateHoles();
  redrawStatic();
}

function populateHoles(){
  holeList.innerHTML = '';
  const holes = makeHoles(State.gear);
  holes.forEach((h, i) => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.innerHTML = `<div class="sub">${h.d}px</div>`;
    if (State.hole === h) btn.classList.add('active');
    btn.addEventListener('click', () => {
      State.hole = h;
      populateHoles();
      redrawStatic();
      btn.classList.add('pop');
      setTimeout(() => btn.classList.remove('pop'), 320);
    });
    holeList.appendChild(btn);
  });
}

function populateColorPalette(){
  colorPaletteGrid.innerHTML = '';
  const palette = ColorPalettes[State.selectedPalette];
  if (!palette) return;
  
  palette.colors.forEach((color, i) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = color;
    swatch.title = color;
    if (i === State.selectedColorIndex) swatch.classList.add('active');
    
    swatch.addEventListener('click', () => {
      State.selectedColorIndex = i;
      penColor.value = color;
      populateColorPalette();
      hapticFeedback('light');
      // Add pop animation
      swatch.classList.add('pop');
      setTimeout(() => swatch.classList.remove('pop'), 320);
    });
    
    colorPaletteGrid.appendChild(swatch);
  });
  redrawStatic();
}

function setActive(el, container){
  $$('.chip', container).forEach(n => n.classList.remove('active'));
  el.classList.add('active');
}
function pop(el){
  el.classList.remove('pop');
  void el.offsetWidth; // restart animation
  el.classList.add('pop');
}

// Pattern math
function pointAt(t){
  const R = State.ring.R;
  const r = State.gear.r;
  const d = State.hole?.d || (r*0.6);
  const k = r / R;
  let x, y;
  if (State.pattern === 'hypo'){
    // Hypotrochoid (rolling inside)
    const diff = R - r;
    const n = diff / r;
    x = diff * Math.cos(t) + d * Math.cos(n * t);
    y = diff * Math.sin(t) - d * Math.sin(n * t);
  } else {
    // Epitrochoid (rolling outside)
    const sum = R + r;
    const n = sum / r;
    x = sum * Math.cos(t) - d * Math.cos(n * t);
    y = sum * Math.sin(t) - d * Math.sin(n * t);
  }
  return { x: State.center.x + x, y: State.center.y + y };
}

// Static guide rendering (rings + gear outline)
function redrawStatic(){
  if(!AppReady) return;
  
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  State.center.x = width/2; State.center.y = height/2;

  // Background subtle grid glow
  drawBackdrop();

  // Ring and gear are drawn by drawOverlayFrame
  drawOverlayFrame();
}

function circle(x,y,r){
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.stroke();
}

function drawBackdrop(){
  const dpr = window.devicePixelRatio || 1;
  const viewW = canvas.width / dpr;
  const viewH = canvas.height / dpr;
  const g = ctx.createRadialGradient(State.center.x, State.center.y, 0, State.center.x, State.center.y, Math.max(viewW, viewH)*0.7);
  g.addColorStop(0, 'rgba(16,24,60,.25)');
  g.addColorStop(1, 'rgba(2,6,23,0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,viewW,viewH);
}

// --- Animated overlay (gear, hole, rotation) ---
function gearCenterAt(t){
  const R = State.ring.R, r = State.gear.r;
  if (State.pattern === 'hypo'){
    return { x: State.center.x + (R - r) * Math.cos(t), y: State.center.y + (R - r) * Math.sin(t) };
  } else {
    return { x: State.center.x + (R + r) * Math.cos(t), y: State.center.y + (R + r) * Math.sin(t) };
  }
}
function gearAngleAt(t){
  const R = State.ring.R, r = State.gear.r;
  if (State.pattern === 'hypo') return -((R - r)/r) * t; // inside roll
  return ((R + r)/r) * t; // outside roll
}

function drawOverlayFrame(timestamp = 0){
  const dpr = window.devicePixelRatio || 1;
  const viewW = overlay.width / dpr;
  const viewH = overlay.height / dpr;
  octx.clearRect(0,0,viewW,viewH);
  
  // Calculate smooth easing for gear spin
  if (State.lastOverlayTime === 0) State.lastOverlayTime = timestamp;
  const dt = Math.min(32, timestamp - State.lastOverlayTime);
  State.lastOverlayTime = timestamp;
  
  // Smooth velocity easing - accelerate/decelerate naturally
  const targetSpeed = State.drawing ? State.targetSpinSpeed * 2 : 0; // Stop when idle
  const easing = 0.12; // smooth acceleration factor
  State.gearSpinVelocity += (targetSpeed - State.gearSpinVelocity) * easing;
  
  // Apply micro-shadow to ring for depth
  octx.save();
  octx.translate(State.center.x + 1, State.center.y + 1);
  octx.fillStyle = 'rgba(0,0,0,0.08)';
  octx.beginPath(); octx.arc(0,0, State.ring.R*1.01, 0, Math.PI*2); octx.fill();
  octx.restore();

  // Render ring plate with subtle teeth and sheen
  if (Assets.ringReady){
    drawSVGRing(octx, State.center.x, State.center.y, State.ring.R);
  } else {
    drawRingPlate(octx, State.center.x, State.center.y, State.ring.R);
  }

  // Enhanced gear with smooth eased rotation
  const c = gearCenterAt(State.t);
  const baseAng = gearAngleAt(State.t);
  // Add smooth continuous spin overlay
  const smoothSpin = (timestamp * 0.001 * State.gearSpinVelocity) % (Math.PI * 2);
  const ang = baseAng + smoothSpin;
  
  // Use crisp procedural gear so holes align perfectly with geometry (no selected hole marker)
  drawGear(octx, c.x, c.y, State.gear.r, ang, makeHoles(State.gear), null);

  // Pen indicator shows actual ink point (stationary, not rotating with gear animation)
  const p = pointAt(State.t); // This is where ink actually comes from
  const col = currentStrokeColor();
  const pulse = 0.8 + 0.2 * Math.sin(timestamp * 0.003); // subtle pulse
  
  octx.save();
  octx.fillStyle = col;
  if (penGlow && penGlow.checked){
    octx.shadowColor = hexWithAlpha(col, 0.9 * pulse);
    octx.shadowBlur = 15 * pulse;
  }
  octx.beginPath(); octx.arc(p.x, p.y, 3.8 * pulse, 0, Math.PI*2); octx.fill();
  octx.restore();

  // Gesture guide: show a subtle pivot circle and direction when dragging anywhere
  if (showGestureGuide && gesturePivot){
    const guideCol = 'rgba(255,255,255,0.45)';
    const guideColSoft = 'rgba(255,255,255,0.18)';
    const r = 44; // visual radius
    octx.save();
    octx.translate(gesturePivot.x, gesturePivot.y);
    // outer soft ring
    octx.strokeStyle = guideColSoft;
    octx.lineWidth = 10;
    octx.beginPath(); octx.arc(0,0,r,0,Math.PI*2); octx.stroke();
    // inner crisp ring
    octx.strokeStyle = guideCol;
    octx.lineWidth = 2;
    octx.beginPath(); octx.arc(0,0,r,0,Math.PI*2); octx.stroke();
    // direction indicator based on lastAngle
    if (lastAngle != null){
      const a0 = gestureStartAngle ?? lastAngle;
      const a1 = lastAngle;
      const sweep = Math.max(-Math.PI*1.75, Math.min(Math.PI*1.75, a1 - a0));
      octx.strokeStyle = hexWithAlpha(col, 0.85);
      octx.lineWidth = 3;
      octx.beginPath();
      octx.arc(0,0,r, a0, a0 + sweep, sweep < 0);
      octx.stroke();
      // arrow head at current angle
      const ax = Math.cos(a1) * r, ay = Math.sin(a1) * r;
      octx.fillStyle = hexWithAlpha(col, 0.95);
      octx.beginPath();
      octx.moveTo(ax, ay);
      const ah = 10, aw = 6;
      const n = { x: Math.cos(a1 + Math.PI/2), y: Math.sin(a1 + Math.PI/2) };
      const t = { x: Math.cos(a1), y: Math.sin(a1) };
      octx.lineTo(ax - t.x*ah + n.x*aw, ay - t.y*ah + n.y*aw);
      octx.lineTo(ax - t.x*ah - n.x*aw, ay - t.y*ah - n.y*aw);
      octx.closePath();
      octx.fill();
    }
    octx.restore();
  }
}

function drawGear(ctxg, x, y, r, angle, holesAll = [], selectedHole = null){
  const teeth = Math.max(16, Math.round(r/3));
  const rimInner = r*0.78, rimOuter = r*1.02;
  ctxg.save();
  ctxg.translate(x,y); ctxg.rotate(angle);

  // Micro-shadow beneath gear for depth
  ctxg.save();
  ctxg.translate(r*0.02, r*0.02); // slight offset
  ctxg.fillStyle = 'rgba(0,0,0,0.15)';
  ctxg.beginPath(); ctxg.arc(0,0, rimOuter*0.98, 0, Math.PI*2); ctxg.fill();
  ctxg.restore();

  // Enhanced metallic body with sub-pixel lighting
  const bodyGrad = ctxg.createRadialGradient(-r*0.3,-r*0.3, r*0.1, 0,0, rimOuter);
  bodyGrad.addColorStop(0,'rgba(255,255,255,0.35)'); // brighter highlight
  bodyGrad.addColorStop(0.3,'rgba(255,255,255,0.18)');
  bodyGrad.addColorStop(0.7, hexWithAlpha(Themes[State.theme].accent, 0.08));
  bodyGrad.addColorStop(1, hexWithAlpha(Themes[State.theme].accent, 0.18));
  ctxg.fillStyle = bodyGrad;
  ctxg.strokeStyle = hexWithAlpha(Themes[State.theme].accent, 0.85);
  ctxg.lineWidth = Math.max(1, r*0.018);

  // Teeth path with enhanced chamfered edges and lighting
  ctxg.beginPath();
  for (let i=0;i<teeth;i++){
    const a0 = (i/teeth)*Math.PI*2;
    const a1 = ((i+0.32)/teeth)*Math.PI*2;
    const a2 = ((i+0.68)/teeth)*Math.PI*2;
    const a3 = ((i+1)/teeth)*Math.PI*2;
    if (i===0) ctxg.moveTo(Math.cos(a0)*rimInner, Math.sin(a0)*rimInner);
    ctxg.lineTo(Math.cos(a1)*rimOuter, Math.sin(a1)*rimOuter);
    ctxg.lineTo(Math.cos(a2)*rimOuter, Math.sin(a2)*rimOuter);
    ctxg.lineTo(Math.cos(a3)*rimInner, Math.sin(a3)*rimInner);
  }
  ctxg.closePath(); ctxg.fill(); ctxg.stroke();

  // Individual tooth highlights for 3D effect
  ctxg.save();
  ctxg.strokeStyle = 'rgba(255,255,255,0.25)';
  ctxg.lineWidth = Math.max(0.5, r*0.008);
  for (let i=0;i<teeth;i+=2){ // every other tooth for subtle variation
    const a1 = ((i+0.32)/teeth)*Math.PI*2;
    const a2 = ((i+0.68)/teeth)*Math.PI*2;
    ctxg.beginPath();
    ctxg.moveTo(Math.cos(a1)*rimOuter*0.98, Math.sin(a1)*rimOuter*0.98);
    ctxg.lineTo(Math.cos(a2)*rimOuter*0.98, Math.sin(a2)*rimOuter*0.98);
    ctxg.stroke();
  }
  ctxg.restore();

  // Enhanced rim highlights with multiple layers
  ctxg.save();
  ctxg.strokeStyle = 'rgba(255,255,255,0.45)';
  ctxg.lineWidth = Math.max(0.8, r*0.014);
  ctxg.beginPath(); ctxg.arc(0,0, rimInner*0.94, 0, Math.PI*2); ctxg.stroke();
  ctxg.strokeStyle = 'rgba(255,255,255,0.25)';
  ctxg.lineWidth = Math.max(0.5, r*0.008);
  ctxg.beginPath(); ctxg.arc(0,0, rimInner*1.01, 0, Math.PI*2); ctxg.stroke();
  ctxg.restore();

  // Center bore
  ctxg.beginPath(); ctxg.arc(0,0, r*0.18, 0, Math.PI*2);
  ctxg.strokeStyle = hexWithAlpha(Themes[State.theme].accent, 0.45); ctxg.lineWidth = 1; ctxg.stroke();

  // Punch real concentric hole arrays so visuals match selectable holes
  const holeOutlineColor = hexWithAlpha(Themes[State.theme].accent, 0.35);
  const holeRadius = Math.max(1.6, Math.min(3.5, r*0.035));
  holesAll.forEach(h => {
    const d = h.d;
    // Number of holes around this ring – scale with circumference
    const n = Math.max(10, Math.round((2*Math.PI*d) / (holeRadius*3.5)));
    // Cut holes
    ctxg.save();
    ctxg.globalCompositeOperation = 'destination-out';
    for (let i=0;i<n;i++){
      const a = (i/n)*Math.PI*2;
      const hx = Math.cos(a)*d, hy = Math.sin(a)*d;
      ctxg.beginPath(); ctxg.arc(hx, hy, holeRadius, 0, Math.PI*2); ctxg.fill();
    }
    ctxg.restore();
    // Draw faint outlines to make holes crisp
    ctxg.save();
    ctxg.strokeStyle = holeOutlineColor;
    ctxg.lineWidth = Math.max(0.5, r*0.006);
    for (let i=0;i<n;i++){
      const a = (i/n)*Math.PI*2;
      const hx = Math.cos(a)*d, hy = Math.sin(a)*d;
      ctxg.beginPath(); ctxg.arc(hx, hy, holeRadius, 0, Math.PI*2); ctxg.stroke();
    }
    ctxg.restore();
  });

  // Enhanced selected hole marker with realistic glow and depth
  if (selectedHole){
    const d = selectedHole.d;
    const hx = d; const hy = 0; // angle 0 in local gear space; rotation already applied
    ctxg.save();
    
    // Outer glow ring
    const glowGrad = ctxg.createRadialGradient(hx, hy, holeRadius*0.8, hx, hy, holeRadius*2.2);
    glowGrad.addColorStop(0, hexWithAlpha(Themes[State.theme].highlight, 0.6));
    glowGrad.addColorStop(0.5, hexWithAlpha(Themes[State.theme].highlight, 0.3));
    glowGrad.addColorStop(1, hexWithAlpha(Themes[State.theme].highlight, 0));
    ctxg.fillStyle = glowGrad;
    ctxg.beginPath(); ctxg.arc(hx, hy, holeRadius*2.2, 0, Math.PI*2); ctxg.fill();
    
    // Main marker with metallic gradient
    const markerGrad = ctxg.createRadialGradient(hx-holeRadius*0.3, hy-holeRadius*0.3, holeRadius*0.2, hx, hy, holeRadius*1.3);
    markerGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
    markerGrad.addColorStop(0.4, hexWithAlpha(Themes[State.theme].highlight, 0.95));
    markerGrad.addColorStop(1, hexWithAlpha(Themes[State.theme].accent, 0.8));
    ctxg.fillStyle = markerGrad;
    ctxg.shadowColor = hexWithAlpha(Themes[State.theme].highlight, 0.8); 
    ctxg.shadowBlur = 8;
    ctxg.beginPath(); ctxg.arc(hx, hy, holeRadius*1.3, 0, Math.PI*2); ctxg.fill();
    
    // Inner highlight
    ctxg.shadowBlur = 0;
    ctxg.fillStyle = 'rgba(255,255,255,0.7)';
    ctxg.beginPath(); ctxg.arc(hx-holeRadius*0.2, hy-holeRadius*0.2, holeRadius*0.4, 0, Math.PI*2); ctxg.fill();
    ctxg.restore();
  }

  // Subtle top-left sheen
  const sheen = ctxg.createRadialGradient(-r*0.4,-r*0.4, r*0.05, -r*0.4,-r*0.4, r*0.7);
  sheen.addColorStop(0,'rgba(255,255,255,0.12)');
  sheen.addColorStop(1,'rgba(255,255,255,0)');
  ctxg.fillStyle = sheen; ctxg.beginPath(); ctxg.arc(0,0, r*1.02, 0, Math.PI*2); ctxg.fill();

  ctxg.restore();
}

// Draw pre-rendered SVG gear image, scaled to radius r (approx mapping to rimInner~190px in asset)
function drawSVGGear(ctx, x, y, r, angle, selectedHole){
  const img = Assets.gearImg; if (!img) return;
  const baseR = 190; // matches rim radius used in SVG
  const scale = r / baseR;
  const w = img.naturalWidth || 512, h = img.naturalHeight || 512;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.drawImage(img, -w/2, -h/2, w, h);
  // Selected hole marker (draw over SVG)
  const d_canvas = (selectedHole && selectedHole.d) || r*0.6;
  // We are in scaled (SVG) space; convert canvas-space distance to SVG local units
  const d_svg = d_canvas / scale;
  const t = Themes[State.theme];
  ctx.fillStyle = hexWithAlpha(t.highlight, 0.95);
  ctx.shadowColor = hexWithAlpha(t.highlight, 0.5); ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(d_svg, 0, 3.2/scale, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawSVGRing(ctx, x, y, R){
  const img = Assets.ringImg; if (!img) return;
  // ring.svg should be designed with base radius ~ Rbase pixels to scale from
  const baseR = 240; // matches rim radius used in ring asset (defined by us)
  const scale = R / baseR;
  const w = img.naturalWidth || 512, h = img.naturalHeight || 512;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.drawImage(img, -w/2, -h/2, w, h);
  ctx.restore();
}

function drawRingPlate(ctxr, cx, cy, R){
  ctxr.save();
  ctxr.translate(cx, cy);
  // Base faint ring
  ctxr.beginPath();
  ctxr.arc(0,0,R,0,Math.PI*2);
  const t = Themes[State.theme];
  ctxr.strokeStyle = hexWithAlpha(t.accent, .18);
  ctxr.lineWidth = 1.25; ctxr.setLineDash([6,6]);
  ctxr.stroke();
  ctxr.setLineDash([]);

  // Toothed outer edge hint
  const teeth = Math.max(24, Math.round(R/3));
  const inner = R*0.97, outer = R*1.02;
  ctxr.beginPath();
  for (let i=0;i<teeth;i++){
    const a0 = (i/teeth)*Math.PI*2;
    const a1 = ((i+0.5)/teeth)*Math.PI*2;
    const a2 = ((i+1)/teeth)*Math.PI*2;
    if (i===0) ctxr.moveTo(Math.cos(a0)*inner, Math.sin(a0)*inner);
    ctxr.lineTo(Math.cos(a1)*outer, Math.sin(a1)*outer);
    ctxr.lineTo(Math.cos(a2)*inner, Math.sin(a2)*inner);
  }
  const ringGrad = ctxr.createRadialGradient(0,0, R*0.2, 0,0, outer);
  ringGrad.addColorStop(0,'rgba(255,255,255,0.06)');
  ringGrad.addColorStop(1, hexWithAlpha(t.accent, 0.06));
  ctxr.fillStyle = ringGrad;
  ctxr.strokeStyle = hexWithAlpha(t.accent, .28);
  ctxr.lineWidth = 0.9;
  ctxr.closePath(); ctxr.fill(); ctxr.stroke();

  // Inner ring highlight
  ctxr.beginPath(); ctxr.arc(0,0, R*0.92, 0, Math.PI*2);
  ctxr.strokeStyle = 'rgba(255,255,255,0.18)'; ctxr.lineWidth = 0.7; ctxr.stroke();
  ctxr.restore();
}

function drawGearThumb(c2d, gear){
  const size = c2d.canvas.width;
  const r = Math.min(size, size)*0.35;
  c2d.clearRect(0,0,size,size);
  c2d.save(); c2d.translate(size/2, size/2);
  // Always use the same procedural gear for exact parity with overlay
  const holes = makeHoles({ id: gear.id, r: r });
  drawGear(c2d, 0, 0, r, 0, holes, null);
  c2d.restore();
}

// Drawing engine
let raf = 0, prev = 0;
function tick(ts){
  if (!State.drawing){ return; }
  if (!prev) prev = ts;
  const dt = Math.min(32, ts - prev); prev = ts;
  // advance hue phase even if step is small
  State.cyclePhase += dt * 0.06; // ~60ms per unit; scaled by UI below

  const speed = parseFloat(speedInput.value || '1');
  const step = 0.02 * speed; // rad per frame slice
  const stepsThisFrame = Math.ceil((dt/16) * Math.max(1, speed));

  ctx.save();
  // base style
  let strokeCol = currentStrokeColor();
  ctx.lineWidth = parseFloat(penWidth.value || '1.5');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let { t } = State;
  let p = pointAt(t);
  // Draw per small segment so color cycling is visible
  for (let i=0;i<stepsThisFrame;i++){
    const tNext = t + step;
    const p2 = pointAt(tNext);
    if (penCycle && penCycle.checked){ strokeCol = currentStrokeColor(); }
    strokeSegmentWithGlow(ctx, p, p2, strokeCol);
    t = tNext; p = p2;
  }
  ctx.restore();

  State.t = t;
  if (t >= period()+0.1){
    // Completed one figure
    stopDraw(true); // internal stop, keep autoRandom as-is
    if (State.autoRandom){
      // Optionally cycle theme
      if (themeCycleChk && themeCycleChk.checked){
        const keys = Object.keys(Themes);
        const i = Math.max(0, keys.indexOf(State.theme));
        State.theme = keys[(i+1)%keys.length];
        themeSelect.value = State.theme;
      }
      // Optionally randomize draw speed
      if (randomSpeedChk && randomSpeedChk.checked){
        const s = (Math.random()*2.4 + 0.3).toFixed(1); // 0.3 - 2.7
        speedInput.value = s;
      }
      // Optionally take a screenshot of the finished figure
      if (autoShotChk && autoShotChk.checked){
        try{
          const link = document.createElement('a');
          link.download = `spiroart-${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        }catch(_){/* ignore */}
      }
      applyRandomConfig();
      startDraw();
    }
    return;
  }
  drawOverlayFrame();
  raf = requestAnimationFrame(tick);
}

// Exact period for (epi/hypo)trochoid when using radii R and r
function gcd(a,b){ return b?gcd(b,a%b):a; }
function period(){
  const R = Math.round(State.ring.R);
  const r = Math.round(State.gear.r);
  const g = Math.max(1, gcd(R, r));
  // Period of angle parameter t to close the curve
  return Math.PI * 2 * r / g;
}

function startDraw(){
  if (State.drawing) return;
  hint.style.display = 'none';
  State.t = 0; prev = 0; State.drawing = true;
  raf = requestAnimationFrame(tick);
}
function stopDraw(internal=false){
  State.drawing = false;
  if (raf) cancelAnimationFrame(raf);
  // Only disable autoRandom when user explicitly stops
  if (!internal) State.autoRandom = false;
}

// Controls
openPanelBtn.addEventListener('click', () => {
  const open = panel.classList.toggle('show');
  openPanelBtn.setAttribute('aria-expanded', String(open));
});
closePanelBtn.addEventListener('click', () => {
  panel.classList.remove('show');
  openPanelBtn.setAttribute('aria-expanded', 'false');
});

segs.forEach(seg => seg.addEventListener('click', () => {
  segs.forEach(s => s.setAttribute('aria-selected','false'));
  seg.setAttribute('aria-selected','true');
  State.pattern = seg.dataset.pattern;
  redrawStatic();
}));

btnDraw.addEventListener('click', () => startDraw());
btnStop.addEventListener('click', () => stopDraw(false));
btnPreview.addEventListener('click', () => previewOnce());
btnClear.addEventListener('click', () => { stopDraw(); ctx.clearRect(0,0,canvas.width,canvas.height); redrawStatic(); hint.style.display=''; });
// Helpers for random mode
function randInt(n){ return Math.floor(Math.random()*n); }
function hslToHex(h,s,l){
  s/=100; l/=100; const c=(1-Math.abs(2*l-1))*s; const x=c*(1-Math.abs(((h/60)%2)-1)); const m=l-c/2;
  let r=0,g=0,b=0; if (0<=h&&h<60){r=c;g=x;} else if (60<=h&&h<120){r=x;g=c;} else if (120<=h&&h<180){g=c;b=x;} else if (180<=h&&h<240){g=x;b=c;} else if (240<=h&&h<300){r=x;b=c;} else {r=c;b=x;}
  const toHex=v=>('0'+Math.round((v+m)*255).toString(16)).slice(-2);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function randomPenColor(){
  // Bright but not neon; avoid very light colors
  const h = Math.floor(Math.random()*360);
  const s = 80 + Math.floor(Math.random()*15); // 80-95
  const l = 48 + Math.floor(Math.random()*10); // 48-58
  return hslToHex(h,s,l);
}
function applyRandomConfig(){
  const ring = Rings[randInt(Rings.length)];
  const gear = Gears[randInt(Gears.length)];
  const hs = makeHoles(gear);
  const hole = hs[randInt(hs.length)];
  const pattern = Math.random()>.5?'hypo':'epi';
  State.pattern = pattern; State.ring = ring; State.gear = gear; State.hole = hole;
  // randomize pen color
  const col = randomPenColor(); penColor.value = col;
  // UI reflect
  populateRings(); populateGears(); populateHoles();
  segs.forEach(s=>s.setAttribute('aria-selected', s.dataset.pattern===pattern?'true':'false'));
  redrawStatic();
}

btnRandom.addEventListener('click', () => {
  State.autoRandom = true;
  applyRandomConfig();
  startDraw();
});

btnFullscreen.addEventListener('click', async () => {
  try{
    if (!document.fullscreenElement){ await document.documentElement.requestFullscreen(); }
    else { await document.exitFullscreen(); }
  }catch(err){ console.warn('Fullscreen failed', err); }
});

// Screenshot PNG
btnScreenshot.addEventListener('click', () => {
  // Export current canvas content
  const link = document.createElement('a');
  link.download = `spiroart-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// Export current drawing as SVG (vector)
function buildSVG(){
  const w = canvas.width; const h = canvas.height;
  const viewW = Math.round(w / (window.devicePixelRatio||1));
  const viewH = Math.round(h / (window.devicePixelRatio||1));
  const color = penColor.value;
  const width = parseFloat(penWidth.value || '2');
  // Build path from the pixels we can recompute deterministically using current State.t period
  const T = period();
  const step = 0.004;
  let d = '';
  for (let t=0; t<=T; t+=step){
    const p = pointAt(t);
    const x = p.x, y = p.y;
    if (t===0) d += `M${x.toFixed(2)},${y.toFixed(2)}`; else d += `L${x.toFixed(2)},${y.toFixed(2)}`;
  }
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n`+
    `<svg xmlns="http://www.w3.org/2000/svg" width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">`+
    `<g fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">`+
    `<path d="${d}"/></g></svg>`;
  return svg;
}

const btnExportSVG = document.getElementById('btn-export-svg');
btnExportSVG.addEventListener('click', () => {
  const svg = buildSVG();
  const blob = new Blob([svg], {type: 'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `spiroart-${Date.now()}.svg`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
});

// Color palette selector
paletteSelect.addEventListener('change', () => {
  State.selectedPalette = paletteSelect.value;
  State.selectedColorIndex = 0; // Reset to first color
  populateColorPalette();
  // Set pen color to first color of new palette
  const palette = ColorPalettes[State.selectedPalette];
  if (palette && palette.colors.length > 0) {
    penColor.value = palette.colors[0];
  }
});

speedInput.addEventListener('input', () => { /* affects tick */ });

// Touch to pan not necessary; canvas fills screen

// Initialize
function init(){
  populateRings();
  populateGears();
  populateHoles();
  populateColorPalette();
  // Set initial pen color from selected palette
  const palette = ColorPalettes[State.selectedPalette];
  if (palette && palette.colors.length > 0) {
    penColor.value = palette.colors[State.selectedColorIndex];
  }
  
  // Update hint text for mobile
  hint.innerHTML = 'Tap Configure to pick ring, gear, and hole. Use Random to explore.<br><small>📱 Pinch to zoom in browser</small>';
  
  // Simple resize handling - no complex observers needed
  
  resizeCanvas();
  AppReady = true;
  redrawStatic();
}

init();

// continuous overlay animation of gear even when not drawing (smooth)
;(function overlayLoop(timestamp){
  drawOverlayFrame(timestamp);
  requestAnimationFrame(overlayLoop);
})();

// Render an instant preview of the full curve
function previewOnce(){
  stopDraw();
  redrawStatic();
  hint.style.display = 'none';
  ctx.save();
  // dynamic color (cycling) for preview uses mid alpha
  let strokeCol = penColor.value;
  ctx.lineWidth = parseFloat(penWidth.value || '1.5');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const T = period();
  const step = 0.004; // finer step for smooth preview
  let t = 0; let p = pointAt(t);
  if (penCycle && penCycle.checked){
    // Per-segment stroke so color/glow changes are visible during preview
    for (; t <= T; t += step){
      const base = hexToHsl(penColor.value);
      const spd = parseFloat((cycleSpeed && cycleSpeed.value) || '1');
      // Use t*60 for hue variation across the curve in preview
      const h = (base.h + (t*60*spd)) % 360;
      const segCol = hslToHex(h, Math.min(95, base.s||85), Math.min(60, base.l||50));
      const p2 = pointAt(Math.min(T, t+step));
      strokeSegmentWithGlow(ctx, p, p2, segCol);
      p = p2;
    }
  } else {
    // Non-cycling: stroke per segment if glow enabled, otherwise single path
    if (penGlow && penGlow.checked){
      for (; t <= T; t += step){
        const p2 = pointAt(Math.min(T, t+step));
        strokeSegmentWithGlow(ctx, p, p2, strokeCol);
        p = p2;
      }
    } else {
      ctx.strokeStyle = hexWithAlpha(strokeCol, 0.9);
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      for (; t <= T; t += step){
        p = pointAt(t);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

// (duplicate helper removed; unified version at top)

// no applyStrokeStyle in reverted version

// ===== Manual drawing controls: click/drag or hold Space and drag =====
function beginManual(){
  if (State.drawing) stopDraw();
  hint.style.display = 'none';
  // Setup for manual drawing with glow/cycling support
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function getCanvasPoint(e){
  const rect = canvas.getBoundingClientRect();
  const clientX = (e.clientX ?? (e.touches && e.touches[0]?.clientX));
  const clientY = (e.clientY ?? (e.touches && e.touches[0]?.clientY));
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function getGestureAngle(e){
  if (State.controlMode === 'anywhere' && gesturePivot){
    const p = getCanvasPoint(e);
    return Math.atan2(p.y - gesturePivot.y, p.x - gesturePivot.x);
  }
  // Fallback: around canvas center
  const p = getCanvasPoint(e);
  return Math.atan2(p.y - State.center.y, p.x - State.center.x);
}

function computeAdaptiveGain(e){
  return 1; // strict 1:1 mapping
}

function manualStep(delta){
  if (!isFinite(delta) || delta === 0) return;
  // 1:1 mapping with gesture delta
  const maxChunk = 0.02; // rad
  const steps = Math.max(1, Math.ceil(Math.abs(delta)/maxChunk));
  const step = delta/steps;
  let prevP = pointAt(State.t);
  for (let i=0;i<steps;i++){
    State.t += step;
    State.cyclePhase += Math.abs(step) * 8;
    const p = pointAt(State.t);
    const strokeCol = currentStrokeColor();
    strokeSegmentWithGlow(ctx, prevP, p, strokeCol);
    prevP = p;
  }
}

function handleDragMove(e){
  if (!(isPointerDown || spaceHeld)) return;
  try { if (e.cancelable) e.preventDefault(); } catch(_){}
  const a = getGestureAngle(e);
  if (lastAngle == null){ lastAngle = a; return; }
  let delta = a - lastAngle;
  if (delta > Math.PI) delta -= 2*Math.PI;
  if (delta < -Math.PI) delta += 2*Math.PI;
  gestureDeltaAccum += delta; // accumulate; 1:1 mapping
  if (!gestureRaf) { gestureRaf = requestAnimationFrame(applyGestureDeltaFrame); }
  lastAngle = a;
}
function handleDragEnd(e){
  isPointerDown = false;
  lastAngle = null;
  gesturePivot = null;
  canvas.style.touchAction = 'auto';
  showGestureGuide = false;
  gestureStartAngle = null;
  if (usingGlobalPointerHandlers){
    window.removeEventListener('pointermove', handleDragMove, { capture: true });
    window.removeEventListener('pointerup', handleDragEnd, { capture: true });
    window.removeEventListener('pointercancel', handleDragEnd, { capture: true });
    usingGlobalPointerHandlers = false;
  }
  // let RAF drain remaining small deltas and stop next frame
}

canvas.addEventListener('pointerdown', (e) => {
  // If the configuration panel is open, close it so it doesn't block gestures on mobile
  if (panel && panel.classList.contains('show')){
    panel.classList.remove('show');
    if (openPanelBtn) openPanelBtn.setAttribute('aria-expanded','false');
  }

  isPointerDown = true;
  try { if (e.cancelable) e.preventDefault(); } catch(_){}
  // Disable native gestures while dragging
  canvas.style.touchAction = 'none';
  gesturePivot = getCanvasPoint(e); // rotate anywhere around local pivot
  lastAngle = getGestureAngle(e);
  gestureStartAngle = lastAngle;
  showGestureGuide = true;
  beginManual();
  // Route subsequent events to window so we keep control even if the pointer leaves the canvas
  if (!usingGlobalPointerHandlers){
    window.addEventListener('pointermove', handleDragMove, { passive: false, capture: true });
    window.addEventListener('pointerup', handleDragEnd, { passive: false, capture: true });
    window.addEventListener('pointercancel', handleDragEnd, { passive: false, capture: true });
    usingGlobalPointerHandlers = true;
  }
});

// Keep canvas move handler but disable when using global handlers to avoid double processing
canvas.addEventListener('pointermove', (e) => {
  if (usingGlobalPointerHandlers) return;
  handleDragMove(e);
});

function endPointer(e){
  handleDragEnd(e);
}

canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); if (!spaceHeld){ spaceHeld = true; beginManual(); } }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') { spaceHeld = false; lastAngle = null; }
});

// Trackpad/mouse wheel: rotate using vertical delta
canvas.addEventListener('wheel', (e) => {
  // Make wheel smooth and prevent page zoom/scroll on canvas region
  e.preventDefault();
  const scale = 0.0018; // tuned for trackpads
  const delta = -e.deltaY * scale;
  manualStep(delta);
}, { passive: false });
