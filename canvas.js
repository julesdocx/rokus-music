const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let W, H, rects = [];
const COLORS = [
  '#FF2D55','#FF6B00','#FFD500','#00E676','#00E5FF',
  '#651FFF','#D500F9','#FF1744','#F50057','#AEEA00',
  '#1DE9B6','#00B0FF','#FF9100','#76FF03','#E040FB',
  '#FF4081','#18FFFF','#B2FF59','#FFAB40','#EA80FC',
  '#FF5252','#69F0AE','#40C4FF','#FFD740','#FF6D00'
];

// --- LIGHTWEIGHT PERLIN 3D NOISE ENGINE ---
const Permutation = new Uint8Array(256);
for (let i = 0; i < 256; i++) Permutation[i] = Math.floor(Math.random() * 256);
const p = new Uint8Array(512);
for (let i = 0; i < 512; i++) p[i] = Permutation[i & 255];

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(t, a, b) { return a + t * (b - a); }
function grad3D(hash, x, y, z) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

function noise3D(x, y, z) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
  const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;

  return lerp(w, lerp(v, lerp(u, grad3D(p[AA], x, y, z), grad3D(p[BA], x - 1, y, z)),
                         lerp(u, grad3D(p[AB], x, y - 1, z), grad3D(p[BB], x - 1, y - 1, z))),
                 lerp(v, lerp(u, grad3D(p[AA + 1], x, y, z - 1), grad3D(p[BA + 1], x - 1, y, z - 1)),
                         lerp(u, grad3D(p[AB + 1], x, y - 1, z - 1), grad3D(p[BB + 1], x - 1, y - 1, z - 1))));
}
// --- END NOISE ENGINE ---

// High resolution grid variables
const gap = 6;            // Dropped from 24 to 6 for a massive resolution upgrade (16x more dots)
const scaleFactor = 0.0012; // Compensated coordinate scale so shapes remain massive and grand
const xScale = scaleFactor;
const yScale = scaleFactor;
let timeOffset = 0;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * devicePixelRatio);
  canvas.height = Math.round(H * devicePixelRatio);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  buildRects();
}

function buildRects() {
  rects = [];
  const heights = [];
  let total = 0;
  while (total < H + 30) {
    const h = 1.5 + Math.random() * 3.5;
    heights.push(h);
    total += h;
  }

  const fatCount = 10;
  const fatSet = new Set();
  while (fatSet.size < Math.min(fatCount, heights.length)) {
    fatSet.add(Math.floor(Math.random() * heights.length));
  }
  for (const idx of fatSet) heights[idx] = 14 + Math.random() * 18;

  const pool = [];
  while (pool.length < heights.length) pool.push(...shuffle(COLORS));
  const colors = shuffle(pool.slice(0, heights.length));

  let y = 0;
  for (let idx = 0; idx < heights.length; idx++) {
    const h = heights[idx];
    rects.push({ y, h, color: colors[idx] });
    y += h;
  }
}

function draw() {
  // 1. Draw original background stripes
  ctx.clearRect(0, 0, W, H);
  for (const rect of rects) {
    ctx.fillStyle = rect.color;
    ctx.fillRect(0, rect.y, W, rect.h);
  }

  // 2. Ultra-slow speed adjustment
  timeOffset += 0.003; 

  // 3. Render the dynamic High-Res solid white pattern
  ctx.fillStyle = '#FFFFFF';
  
  for (let x = gap / 2; x < W; x += gap) {
    for (let y = gap / 2; y < H; y += gap) {
      
      // Compute 3D noise field
      let noiseVal = noise3D(x * xScale, y * yScale, timeOffset);
      
      // Normalize to [0, 1]
      noiseVal = (noiseVal + 1) * 0.9;

      // --- SELF EATING REPETITION MODIFIER ---
      if (noiseVal > 0.62) {
        const thresholdWindow = 1.32;
        if (noiseVal < thresholdWindow) {
          // Hollows out gracefully
          noiseVal = (thresholdWindow - noiseVal) / (thresholdWindow - 0.62);
        } else {
          noiseVal = 0;
        }
      }

      // Diameter scales elegantly to match the crisp high-res grid
      const diameter = noiseVal * gap * 3.25;

      if (diameter > 0.4) {
        ctx.beginPath();
        ctx.arc(x, y, diameter / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  requestAnimationFrame(draw);
}

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(draw);