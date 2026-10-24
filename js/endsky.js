// Fond animé de la routine du matin : nuit endormie → fin du monde → aube.
// Les couches et les valeurs des phases 2 à 4 sont reprises de
// design/prototypes/mode-matin.html (nébuleuse WebGL, étoiles, constellations,
// météores, éclairs, planète éclipsée, braises). La phase 1 (nuit endormie) s'y ajoute.
//
// Pilotage : set(awake, dawn, mode)
//   awake 0 = nuit endormie, 1 = fin du monde complète
//   dawn  0 = nuit, 1 = aube
//   mode  rythme lié à l'étape (MODES du prototype)
// Chaque valeur est lissée (exponentielle, ~4 s pour aller au bout) : aucun saut visible.

import { setThemeColor } from './theme.js';

const SMOOTH_TAU = 0.85; // s ; 1 - e^(-4/0.85) ≈ 99 % en 4 s
const BASE = '#05060A'; // fond de la nuit endormie

// Rythmes liés aux étapes (prototype).
const MODES = {
  calm: {}, shake: { shimmer: 1 }, swing: { sway: 1 }, sky: { breath: 1 }, pulse: { pulse: 1 },
  steam: { steam: 1 }, flow: { rain: 0.6, speed: 1.4 }, walk: { rain: 1, speed: 1.8 }, ring: { ring: 1 },
};
const PRM_ZERO = { speed: 1, sway: 0, breath: 0, shimmer: 0, pulse: 0, steam: 0, ring: 0, rain: 0 };

// Couleurs des étoiles : nuit endormie (blanc et gris-bleu très désaturés) / prototype (5 % de rouges).
const CALM_COLORS = ['236,238,243', '214,220,230', '190,198,214'];
const PROTO_COLORS = ['255,95,90', '255,170,140', '170,205,255', '235,242,255'];
const LEVELS = [0.35, 0.6, 0.88]; // niveaux d'opacité des étoiles (regroupées pour dessiner vite)
const TWINKLE_GROUPS = 6;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, g) => {
  const A = hex(a);
  const B = hex(b);
  return A.map((v, i) => Math.round(v + (B[i] - v) * g));
};

// ---------- Nébuleuse WebGL (shader du prototype, inchangé) ----------

const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;uniform float uT,uDawn,uBreath,uPulse,uFlash,uRing;uniform vec2 uFP;uniform vec3 uPl;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
void main(){
  vec2 fc=gl_FragCoord.xy; vec2 uv=fc/uRes.y; float t=uT*.022;
  vec2 p=uv*1.5+vec2(0.,t*.3);
  vec2 q=vec2(fbm(p+vec2(0.,t)),fbm(p+vec2(5.2,1.3)-t*.7));
  vec2 r=vec2(fbm(p+3.4*q+vec2(1.7,9.2)+t*.5),fbm(p+3.4*q+vec2(8.3,2.8)-t*.4));
  float f=fbm(p+3.*r);
  vec3 night=mix(vec3(.003,.005,.02),vec3(.025,.09,.24),uDawn);
  vec3 blue=vec3(.09,.20,.55), violet=vec3(.33,.11,.48), blood=vec3(.62,.05,.09);
  float neb=smoothstep(.3,.86,f);
  vec3 nc=mix(blue,violet,clamp(length(q)*.9,0.,1.));
  nc=mix(nc,blood,smoothstep(.5,.85,r.x)*(.85-uDawn*.5));
  vec3 col=night+nc*neb*(1.05+.3*uDawn);
  col+=nc*pow(neb,3.)*1.1;
  col*=mix(1.,.45,smoothstep(.52,.82,fbm(p*2.3-r*1.6+t)));
  float fd=length(fc-uFP)/uRes.y;
  col+=vec3(.85,.6,1.)*uFlash*(neb*.9+.12)*exp(-fd*3.2)*1.5;
  col+=vec3(1.)*uFlash*exp(-fd*14.)*.35;
  vec2 d=fc-uPl.xy; float dist=length(d); float h=(dist-uPl.z)/uRes.y; float up=step(0.,h);
  vec3 hot=mix(vec3(1.,.17,.1),vec3(1.,.74,.45),uDawn);
  float limb=exp(-max(h,0.)*(15.-uBreath*4.))*(.6+.35*uPulse+.35*uDawn);
  col+=hot*limb*up;
  col+=hot*exp(-max(h,0.)*55.)*.8*up;
  float ang=atan(d.x,d.y);
  float rays=noise(vec2(ang*22.,t*5.))*noise(vec2(ang*9.+3.,-t*3.));
  rays=pow(rays,1.4)*exp(-max(h,0.)*2.6)*up*smoothstep(1.25,.1,abs(ang));
  col+=hot*rays*(.42+.45*uDawn+.6*uRing);
  col+=hot*.07*smoothstep(.55,0.,fc.y/uRes.y);
  vec2 top=uPl.xy+vec2(0.,uPl.z); float tb=length(fc-top)/uRes.y;
  col+=vec3(1.,.95,.88)*uRing*(exp(-tb*9.)*.9+exp(-abs(fc.y-top.y)/uRes.y*60.)*.25);
  vec2 vu=fc/uRes.xy; col*=mix(.5,1.,smoothstep(1.05,.3,length((vu-.5)*vec2(uRes.x/uRes.y,1.))*1.1));
  col+=(hash(fc+fract(uT*7.)*100.)-.5)*.03;
  gl_FragColor=vec4(col,1.);
}`;

function initGL(canvas) {
  try {
    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) return null;
    const shader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const pr = gl.createProgram();
    gl.attachShader(pr, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('link');
    gl.useProgram(pr);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {};
    ['uRes', 'uT', 'uDawn', 'uBreath', 'uPulse', 'uFlash', 'uRing', 'uFP', 'uPl'].forEach((n) => (u[n] = gl.getUniformLocation(pr, n)));
    return { gl, u };
  } catch {
    return null;
  }
}

// ---------- Fond complet ----------

export function createEndSky(el) {
  el.classList.add('endsky');
  el.innerHTML = '<canvas class="es-gl" aria-hidden="true"></canvas><canvas class="es-fx" aria-hidden="true"></canvas>';
  const glc = el.querySelector('.es-gl');
  const cv = el.querySelector('.es-fx');
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GLX = initGL(glc);
  setThemeColor(BASE);

  let W = 0, H = 0, GLS = 0.55;
  let pole = { x: 0, y: 0 }, rot = 0;
  let stars = [], buckets = { calm: [], proto: [] }, bright = [], veil = [], CONS = [], EMB = [];
  let METS = [], SPK = [], FL = [], WAVES = [], FLASHES = [], BOLTS = [];
  let nextMet = 1, nextBig = 9, nextBolt = 4, nextCalmMet = 6, lastBeat = -1, beatGlow = 0, shakeAmt = 0;
  let PLx = 0, PLy = 0, PLR = 1;
  let raf = 0, lastT = performance.now();

  // Pilotage lissé
  const target = { awake: 0, dawn: 0 };
  const cur = { awake: 0, dawn: 0 };
  let mode = 'calm';
  const PRM = { ...PRM_ZERO };
  const TGT = { ...PRM_ZERO };

  // Sprite flou pour le voile de la Voie lactée
  const blob = document.createElement('canvas');
  blob.width = blob.height = 128;
  {
    const b = blob.getContext('2d');
    const g = b.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(225,230,242,1)');
    g.addColorStop(1, 'rgba(225,230,242,0)');
    b.fillStyle = g;
    b.fillRect(0, 0, 128, 128);
  }

  const polar = (x, y) => {
    const dx = x - pole.x, dy = y - pole.y;
    const a = Math.atan2(dy, dx);
    return { r: Math.hypot(dx, dy), a, ca: Math.cos(a), sa: Math.sin(a) };
  };

  function build() {
    pole = { x: W * 0.5, y: -H * 0.45 };
    // Voie lactée : bande diagonale du haut-gauche vers le bas-centre.
    const bx0 = -W * 0.08, by0 = -H * 0.05, bx1 = W * 0.62, by1 = H * 1.05;
    const bdx = bx1 - bx0, bdy = by1 - by0, blen = Math.hypot(bdx, bdy);
    const nx = -bdy / blen, ny = bdx / blen;
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    const onBand = (spread) => {
      const t = Math.random(), off = gauss() * spread;
      return [bx0 + bdx * t + nx * off, by0 + bdy * t + ny * off];
    };

    const n = reduce ? 900 : Math.round(Math.max(1500, Math.min(2500, (W * H) / 150)));
    stars = [];
    for (let i = 0; i < n; i++) {
      const [x, y] = Math.random() < 0.38 ? onBand(W * 0.16) : [-W * 0.3 + Math.random() * W * 1.6, -H * 0.15 + Math.random() * H * 1.2];
      const q = Math.random();
      const isBright = Math.random() < 0.03;
      stars.push({
        ...polar(x, y),
        size: isBright ? 1.15 + Math.random() * 0.45 : 0.3 + Math.random() ** 4 * 1.3,
        level: isBright ? 2 : Math.floor(Math.random() * 3),
        group: Math.floor(Math.random() * TWINKLE_GROUPS),
        calm: Math.floor(Math.random() * CALM_COLORS.length),
        proto: q < 0.05 ? 0 : q < 0.09 ? 1 : q < 0.5 ? 2 : 3,
        s: Math.random(),
      });
    }
    // Regroupement par couleur / groupe de scintillement / niveau : un fillStyle par paquet.
    const pack = (key, colors) => {
      const out = [];
      for (let g = 0; g < TWINKLE_GROUPS; g++)
        for (let c = 0; c < colors.length; c++)
          for (let l = 0; l < LEVELS.length; l++) {
            const list = stars.filter((s) => s.size < 1.1 && s.group === g && s[key] === c && s.level === l);
            if (list.length) out.push({ g, color: colors[c], level: LEVELS[l], list });
          }
      return out;
    };
    buckets = { calm: pack('calm', CALM_COLORS), proto: pack('proto', PROTO_COLORS) };
    bright = stars.filter((s) => s.size >= 1.1);

    // Voile laiteux : taches floues le long de la bande (opacité faible).
    veil = Array.from({ length: 70 }, () => {
      const [x, y] = onBand(W * 0.1);
      return { ...polar(x, y), rad: 50 + Math.random() * 110, a: 0.006 + Math.random() * 0.012 }; // cumul ≤ 8 %
    });

    // Constellations (prototype)
    CONS = [];
    const G = reduce ? 6 : Math.max(8, Math.min(14, Math.round((W * H) / 52000)));
    for (let g = 0; g < G; g++) {
      const cx = W * (0.06 + Math.random() * 0.88), cy = H * (0.04 + Math.random() * 0.62);
      const k = 4 + Math.floor(Math.random() * 4), sc = Math.min(W, H) * (0.1 + Math.random() * 0.1);
      const pts = [];
      for (let j = 0; j < k; j++) pts.push({ x: cx + (Math.random() - 0.5) * sc * 2, y: cy + (Math.random() - 0.5) * sc * 1.4 });
      const order = [pts.shift()];
      while (pts.length) {
        const l = order[order.length - 1];
        let bi = 0, bd = 1e9;
        pts.forEach((p, i) => {
          const d = Math.hypot(p.x - l.x, p.y - l.y);
          if (d < bd) { bd = d; bi = i; }
        });
        order.push(pts.splice(bi, 1)[0]);
      }
      const cs = order.map((p) => ({ ...polar(p.x, p.y), size: 1.1 + Math.random() * 1.3, red: Math.random() < 0.14, ph: Math.random() * 6.28 }));
      const links = [];
      for (let j = 1; j < cs.length; j++) links.push([j - 1, j]);
      if (cs.length > 4 && Math.random() < 0.6) {
        const a = Math.floor(Math.random() * (cs.length - 3));
        links.push([a, a + 3]);
      }
      // Phase 2 : elles apparaissent une à une avec l'éveil.
      CONS.push({ stars: cs, links, period: 16 + Math.random() * 12, off: Math.random() * 30, th: ((g + 1) / (G + 1)) * 0.9 });
    }
    EMB = [];
    for (let i = 0; i < (reduce ? 40 : 150); i++) EMB.push(newEmber(true));
  }

  function newEmber(any) {
    const q = Math.random();
    return {
      x: Math.random() * W, y: any ? Math.random() * H : H + 10, vy: -(8 + Math.random() * 26), sw: Math.random() * 6.28,
      swA: 6 + Math.random() * 16, size: 0.5 + Math.random() * 1.7,
      c: q < 0.45 ? '255,110,60' : q < 0.8 ? '255,70,70' : '255,180,100', fl: 3 + Math.random() * 6, ph: Math.random() * 6.28,
    };
  }

  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth;
    H = innerHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (GLX) {
      GLS = W * H > 900000 ? 0.45 : 0.6; // shader à 45–60 % de la résolution
      glc.width = Math.max(2, Math.round(W * GLS));
      glc.height = Math.max(2, Math.round(H * GLS));
      GLX.gl.viewport(0, 0, glc.width, glc.height);
    }
    build();
  }

  function spawnMeteor(big) {
    const ang = Math.PI * 0.62 + (Math.random() - 0.5) * 0.28; // vers le bas-gauche
    const sp = big ? 340 + Math.random() * 80 : 520 + Math.random() * 420;
    const x = W * (0.25 + Math.random() * 1.0), y = -30 - Math.random() * H * 0.15;
    METS.push({
      x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, t: 0, big,
      life: big ? 0.9 + Math.random() * 0.7 : 0.45 + Math.random() * 0.9, len: big ? 220 : 60 + Math.random() * 120, w: big ? 3.2 : 1 + Math.random() * 1.1,
    });
  }

  // Phase 1 : étoile filante fine et blanche, sans explosion.
  function spawnCalmMeteor() {
    const ang = Math.PI * 0.62 + (Math.random() - 0.5) * 0.3;
    const sp = 620 + Math.random() * 200;
    METS.push({
      x: W * (0.3 + Math.random() * 0.8), y: H * Math.random() * 0.3, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      t: 0, calm: true, life: 0.5 + Math.random() * 0.3, len: 70 + Math.random() * 50, w: 0.8,
    });
  }

  function burst(x, y, vx, vy, n, power) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (20 + Math.random() ** 0.6 * 160) * power, q = Math.random();
      SPK.push({
        x, y, vx: Math.cos(a) * sp + vx * 0.18, vy: Math.sin(a) * sp + vy * 0.18, t: 0, life: 0.9 + Math.random() * 1.7,
        c: q < 0.45 ? '255,90,70' : q < 0.7 ? '255,170,110' : q < 0.88 ? '235,242,255' : '150,200,255', w: 0.6 + Math.random() * 1.2,
      });
    }
  }

  const flashAt = (x, y, amp) => FLASHES.push({ x, y, t: 0, amp });
  const flashCurve = (t) => (t < 0.07 ? 1 : t < 0.13 ? 0.2 : t < 0.22 ? 0.85 : t < 0.27 ? 0.3 : Math.exp(-(t - 0.27) * 5) * 0.55);

  function makeBolt(x1, y1, x2, y2) {
    let pts = [[x1, y1], [x2, y2]], disp = Math.hypot(x2 - x1, y2 - y1) * 0.28;
    for (let k = 0; k < 6; k++) {
      const np = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const [a, b] = [pts[i], pts[i + 1]];
        np.push(a);
        np.push([(a[0] + b[0]) / 2 + (Math.random() - 0.5) * disp, (a[1] + b[1]) / 2 + (Math.random() - 0.5) * disp]);
      }
      np.push(pts[pts.length - 1]);
      pts = np;
      disp *= 0.55;
    }
    return pts;
  }

  // Météores, gros météores et éclairs : ils arrivent avec l'éveil et se raréfient avec l'aube.
  const stormLevel = () => cur.awake * (1 - smoothstep(0.4, 0.85, cur.dawn));

  function updateStorm(rt, dt) {
    const storm = stormLevel();
    if (!reduce && cur.awake > 0.7 && storm > 0.02 && rt > nextBolt) {
      nextBolt = rt + (5 + Math.random() * 9) / storm;
      const x = W * (0.1 + Math.random() * 0.8), y = H * (0.05 + Math.random() * 0.45), L = 80 + Math.random() * 170, a = Math.random() * Math.PI * 2;
      const main = makeBolt(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L * 0.6);
      const br = main[Math.floor(main.length * (0.3 + Math.random() * 0.4))];
      const a2 = a + (Math.random() - 0.5) * 1.6;
      BOLTS.push({ paths: [main, makeBolt(br[0], br[1], br[0] + Math.cos(a2) * L * 0.45, br[1] + Math.sin(a2) * L * 0.35)], t: 0 });
      flashAt(x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.3, 0.9);
    }
    for (let i = FLASHES.length - 1; i >= 0; i--) {
      FLASHES[i].t += dt;
      if (FLASHES[i].t > 1.2) FLASHES.splice(i, 1);
    }
  }

  function drawBolts(dt) {
    for (let i = BOLTS.length - 1; i >= 0; i--) {
      const b = BOLTS[i];
      b.t += dt;
      if (b.t > 0.6) { BOLTS.splice(i, 1); continue; }
      const a = flashCurve(b.t);
      if (a < 0.05) continue;
      b.paths.forEach((pts, k) => {
        const w = k ? 0.6 : 1;
        [[7 * w, `rgba(170,140,255,${0.12 * a})`], [3 * w, `rgba(210,190,255,${0.35 * a})`], [1.1 * w, `rgba(255,255,255,${0.95 * a})`]].forEach(([lw, st]) => {
          ctx.lineWidth = lw;
          ctx.strokeStyle = st;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
          ctx.stroke();
        });
      });
    }
  }

  function drawFx(rt, dt) {
    const motion = reduce ? 0.15 : 1;
    const k = 1 - Math.exp(-dt / SMOOTH_TAU);
    cur.awake += (target.awake - cur.awake) * k;
    cur.dawn += (target.dawn - cur.dawn) * k;
    for (const key in PRM) PRM[key] += (TGT[key] - PRM[key]) * Math.min(1, dt * 0.9);
    const awake = cur.awake, dawn = cur.dawn;
    shakeAmt *= Math.pow(0.02, dt);
    updateStorm(rt, dt);

    ctx.save();
    if (shakeAmt > 0.05 && !reduce) ctx.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
    ctx.globalCompositeOperation = 'source-over';
    if (GLX) {
      ctx.clearRect(-20, -20, W + 40, H + 40);
      glc.style.opacity = awake.toFixed(3); // la nébuleuse apparaît avec l'éveil
    } else {
      // Sans WebGL : dégradé du prototype, fondu depuis le noir de la nuit endormie.
      const top = mix('#010208', '#08214f', dawn), mid = mix('#050715', '#123c85', dawn), low = mix('#1a0610', '#3a5fa8', dawn);
      const base = hex(BASE), m = (c) => c.map((v, i) => Math.round(base[i] + (v - base[i]) * awake));
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, `rgb(${m(top)})`);
      g.addColorStop(0.62, `rgb(${m(mid)})`);
      g.addColorStop(1, `rgb(${m(low)})`);
      ctx.fillStyle = g;
      ctx.fillRect(-10, -10, W + 20, H + 20);
    }

    // Rotation du ciel autour du pôle : très lente la nuit, celle du prototype ensuite.
    rot += dt * (0.0015 + (0.0045 * PRM.speed - 0.0015) * awake) * motion;
    const sway = Math.sin((rt * Math.PI * 2) / 2.4) * 0.012 * PRM.sway * motion;
    const R = rot + sway, cR = Math.cos(R), sR = Math.sin(R);
    const px_ = (s) => pole.x + (s.ca * cR - s.sa * sR) * s.r;
    const py_ = (s) => pole.y + (s.sa * cR + s.ca * sR) * s.r;

    ctx.globalCompositeOperation = 'lighter';
    if (PRM.pulse > 0.5) {
      const b = Math.floor(rt);
      if (b !== lastBeat) { lastBeat = b; beatGlow = 1; }
    }
    beatGlow *= Math.pow(0.1, dt);

    // Voile laiteux de la Voie lactée (s'efface quand la nébuleuse arrive).
    const veilK = 1 - awake;
    if (veilK > 0.01) {
      for (const v of veil) {
        const x = px_(v), y = py_(v);
        if (x < -v.rad || x > W + v.rad || y < -v.rad || y > H + v.rad) continue;
        ctx.globalAlpha = v.a * veilK;
        ctx.drawImage(blob, x - v.rad, y - v.rad, v.rad * 2, v.rad * 2);
      }
      ctx.globalAlpha = 1;
    }

    // Étoiles de champ : couleurs de la nuit endormie, puis celles du prototype.
    const groupAlpha = Array.from({ length: TWINKLE_GROUPS }, (_, g) => {
      const period = 3 + g; // scintillement lent, 3 à 8 s
      return 0.6 + 0.4 * Math.sin((rt * Math.PI * 2) / period + g * 1.7) * motion;
    });
    const shimmer = PRM.shimmer > 0.01 ? PRM.shimmer * motion : 0;
    const drawPack = (packs, weight) => {
      if (weight < 0.01) return;
      for (const b of packs) {
        ctx.fillStyle = `rgba(${b.color},${(b.level * groupAlpha[b.g] * weight).toFixed(3)})`;
        for (const s of b.list) {
          const x = px_(s);
          let y = py_(s);
          if (shimmer) y += Math.sin(rt * Math.PI * 2 * 2.2 + s.s * 12) * 1.2 * shimmer;
          if (x < -3 || x > W + 3 || y < -3 || y > H + 3) continue;
          ctx.fillRect(x, y, s.size, s.size);
        }
      }
    };
    drawPack(buckets.calm, 1 - awake);
    drawPack(buckets.proto, awake);
    for (const s of bright) {
      const x = px_(s), y = py_(s);
      if (x < -3 || x > W + 3 || y < -3 || y > H + 3) continue;
      const a = LEVELS[s.level] * groupAlpha[s.group];
      const color = awake < 0.5 ? CALM_COLORS[s.calm] : PROTO_COLORS[s.proto];
      ctx.fillStyle = `rgba(${color},${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, s.size * 0.7, 0, 6.283);
      ctx.fill();
    }

    // Constellations : apparaissent une à une avec l'éveil, restent tracées et s'adoucissent à l'aube.
    const rk = PRM.ring;
    const hold = smoothstep(0.4, 0.7, dawn);
    const soften = 1 - 0.45 * smoothstep(0.4, 1, dawn);
    for (const C of CONS) {
      const vis = clamp01((awake - C.th) / 0.08);
      if (vis <= 0) continue;
      const u = ((rt + C.off) % C.period) / C.period;
      let draw, alpha;
      if (rk > 0.5) { draw = 1; alpha = 0.5 * (1 - rk * 0.6); }
      else if (u < 0.18) { draw = u / 0.18; alpha = 1; }
      else if (u < 0.72) { draw = 1; alpha = 1; }
      else if (u < 0.9) { draw = 1; alpha = 1 - (u - 0.72) / 0.18; }
      else { draw = 0; alpha = 0; }
      draw += (1 - draw) * hold;
      alpha = (alpha + (1 - alpha) * hold) * soften * vis;
      const P = C.stars.map((s) => [px_(s), py_(s)]);
      const nL = C.links.length, prog = draw * nL;
      ctx.lineWidth = 0.7;
      for (let i = 0; i < nL; i++) {
        const f = Math.max(0, Math.min(1, prog - i));
        if (f <= 0 || alpha <= 0) continue;
        const [a, b] = C.links[i], A = P[a], B = P[b];
        ctx.strokeStyle = `rgba(175,208,255,${0.38 * alpha})`;
        ctx.beginPath();
        ctx.moveTo(A[0], A[1]);
        ctx.lineTo(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f);
        ctx.stroke();
      }
      C.stars.forEach((s, j) => {
        const [x, y] = P[j], on = 0.55 + 0.45 * alpha, tw = 0.75 + 0.25 * Math.sin(rt * 1.3 + s.ph);
        const col = s.red ? '255,96,90' : '230,240,255', rr = s.size * (1.9 + 1 * alpha);
        const hg = ctx.createRadialGradient(x, y, 0, x, y, rr * 2.2);
        hg.addColorStop(0, `rgba(${col},${0.5 * on * tw * vis})`);
        hg.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = hg;
        ctx.fillRect(x - rr * 2.2, y - rr * 2.2, rr * 4.4, rr * 4.4);
        ctx.fillStyle = `rgba(${col},${0.95 * tw * vis})`;
        ctx.beginPath();
        ctx.arc(x, y, s.size * 0.8, 0, 6.283);
        ctx.fill();
      });
    }

    // Météores
    const storm = stormLevel();
    if (!reduce) {
      if (awake < 0.05 && rt > nextCalmMet) {
        nextCalmMet = rt + 25 + Math.random() * 15; // nuit endormie : une toutes les 25 à 40 s
        spawnCalmMeteor();
      }
      if (storm > 0.02) {
        const rate = (1 + PRM.rain * 2.2) * storm;
        if (rt > nextMet) {
          nextMet = rt + (0.9 + Math.random() * 2.6) / rate;
          spawnMeteor(false);
        }
        if (awake > 0.7 && rt > nextBig) {
          nextBig = rt + (16 + Math.random() * 14) / storm;
          spawnMeteor(true);
        }
      } else {
        nextMet = Math.max(nextMet, rt + 1);
        nextBig = Math.max(nextBig, rt + 6);
      }
    }
    for (let i = METS.length - 1; i >= 0; i--) {
      const m = METS[i];
      m.t += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      const sp = Math.hypot(m.vx, m.vy), ux = m.vx / sp, uy = m.vy / sp;
      const fade = Math.min(1, m.t * 6) * (1 - Math.max(0, (m.t - m.life * 0.8) / (m.life * 0.2)));
      const tx = m.x - ux * m.len, ty = m.y - uy * m.len;
      const lg = ctx.createLinearGradient(m.x, m.y, tx, ty);
      if (m.calm) {
        lg.addColorStop(0, `rgba(255,255,255,${0.75 * fade})`);
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = lg;
        ctx.lineWidth = m.w;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        if (m.t >= m.life) METS.splice(i, 1);
        continue;
      }
      lg.addColorStop(0, `rgba(255,240,225,${0.95 * fade})`);
      lg.addColorStop(0.15, `rgba(255,140,80,${0.7 * fade})`);
      lg.addColorStop(1, 'rgba(200,30,40,0)');
      ctx.strokeStyle = lg;
      ctx.lineWidth = m.w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.strokeStyle = `rgba(140,190,255,${0.18 * fade})`;
      ctx.lineWidth = m.w * 0.6;
      ctx.beginPath();
      ctx.moveTo(m.x - uy * 1.5, m.y + ux * 1.5);
      ctx.lineTo(tx - uy * 1.5, ty + ux * 1.5);
      ctx.stroke();
      const hr = m.big ? 22 : 8, hg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, hr);
      hg.addColorStop(0, `rgba(255,250,240,${fade})`);
      hg.addColorStop(0.35, `rgba(255,120,70,${0.45 * fade})`);
      hg.addColorStop(1, 'rgba(255,60,40,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(m.x - hr, m.y - hr, hr * 2, hr * 2);
      if (m.t >= m.life) {
        if (m.big) {
          burst(m.x, m.y, m.vx, m.vy, 70, 1.25);
          FL.push({ x: m.x, y: m.y, t: 0, big: 1 });
          WAVES.push({ x: m.x, y: m.y, t: 0 });
          shakeAmt = 5;
          flashAt(m.x, m.y, 1.3);
        } else if (Math.random() < 0.35) {
          burst(m.x, m.y, m.vx, m.vy, 10 + Math.floor(Math.random() * 10), 0.45);
          FL.push({ x: m.x, y: m.y, t: 0, big: 0 });
        }
        METS.splice(i, 1);
      }
    }
    // Flashs et ondes de choc
    for (let i = FL.length - 1; i >= 0; i--) {
      const f = FL[i];
      f.t += dt;
      const life = f.big ? 1.1 : 0.5;
      if (f.t > life) { FL.splice(i, 1); continue; }
      const kk = f.t / life, a = 1 - kk, Rr = (f.big ? 140 : 40) * (0.2 + kk);
      const fg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, Rr);
      fg.addColorStop(0, `rgba(255,245,235,${0.7 * a * a})`);
      fg.addColorStop(0.35, `rgba(255,110,70,${0.25 * a})`);
      fg.addColorStop(1, 'rgba(255,60,40,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(f.x - Rr, f.y - Rr, Rr * 2, Rr * 2);
      if (f.big && f.t < 0.18) {
        ctx.fillStyle = `rgba(255,200,180,${0.1 * (1 - f.t / 0.18)})`;
        ctx.fillRect(-10, -10, W + 20, H + 20);
      }
    }
    for (let i = WAVES.length - 1; i >= 0; i--) {
      const w = WAVES[i];
      w.t += dt;
      const life = 1.8;
      if (w.t > life) { WAVES.splice(i, 1); continue; }
      const kk = w.t / life, Rr = 20 + Math.pow(kk, 0.6) * Math.max(W, H) * 0.55, a = 1 - kk;
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = `rgba(255,90,80,${0.35 * a})`;
      ctx.beginPath();
      ctx.arc(w.x, w.y, Rr, 0, 6.283);
      ctx.stroke();
      ctx.strokeStyle = `rgba(190,220,255,${0.28 * a})`;
      ctx.beginPath();
      ctx.arc(w.x, w.y, Rr * 0.97, 0, 6.283);
      ctx.stroke();
    }
    for (let i = SPK.length - 1; i >= 0; i--) {
      const p = SPK[i];
      p.t += dt;
      if (p.t > p.life) { SPK.splice(i, 1); continue; }
      const d = Math.pow(0.2, dt);
      p.vx *= d;
      p.vy *= d;
      p.vy += 18 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const a = 1 - p.t / p.life;
      ctx.strokeStyle = `rgba(${p.c},${a})`;
      ctx.lineWidth = p.w;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.06, p.y - p.vy * 0.06);
      ctx.stroke();
    }

    drawBolts(dt);

    // Planète éclipsée : elle monte depuis sous l'écran avec l'éveil (ease-out).
    const rise = 1 - Math.pow(1 - awake, 3);
    const PR = Math.max(W, H) * 0.62 * (1 + PRM.breath * 0.025 * -Math.cos(((rt % 8) / 8) * Math.PI * 2) * motion);
    const px = W * 0.5, py = H + PR * 0.78 + (1 - rise) * PR * 0.35;
    PLx = px; PLy = py; PLR = PR;
    if (awake > 0.002) {
      const hot = mix('#ff3a2e', '#ffc27a', dawn).join(','), cold = '140,195,255';
      const coronaA = 0.32 + 0.18 * beatGlow * PRM.pulse + 0.12 * Math.sin(rt * 0.7) + dawn * 0.25;
      if (!GLX) {
        const cg = ctx.createRadialGradient(px, py, PR * 0.96, px, py, PR * 1.45);
        cg.addColorStop(0, `rgba(${hot},${coronaA * awake})`);
        cg.addColorStop(0.25, `rgba(${hot},${coronaA * 0.35 * awake})`);
        cg.addColorStop(1, `rgba(${hot},0)`);
        ctx.fillStyle = cg;
        ctx.fillRect(0, 0, W, H);
        ctx.lineWidth = 1;
        for (let j = 0; j < 28; j++) {
          const a = -Math.PI / 2 + (j / 27 - 0.5) * 1.5, fl = 0.5 + 0.5 * Math.sin(rt * (0.6 + (j % 5) * 0.13) + j * 1.7);
          const L = PR * (0.04 + 0.1 * fl), x1 = px + Math.cos(a) * PR, y1 = py + Math.sin(a) * PR;
          ctx.strokeStyle = `rgba(${hot},${0.22 * fl * awake})`;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(px + Math.cos(a) * (PR + L), py + Math.sin(a) * (PR + L));
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      const dg = ctx.createRadialGradient(px, py - PR * 0.3, PR * 0.2, px, py, PR);
      dg.addColorStop(0, `rgb(${mix('#000000', '#05112e', dawn)})`);
      dg.addColorStop(1, `rgb(${mix('#040208', '#0b1c45', dawn)})`);
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.arc(px, py, PR, 0, 6.283);
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = `rgba(${hot},${0.75 * awake})`;
      ctx.beginPath();
      ctx.arc(px, py, PR, -Math.PI * 0.95, -Math.PI * 0.05);
      ctx.stroke();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = `rgba(${cold},${0.55 * awake})`;
      ctx.beginPath();
      ctx.arc(px, py, PR - 2.5, -Math.PI * 0.9, -Math.PI * 0.1);
      ctx.stroke();
      // Éclat « bague de diamant » sur l'écran Départ
      if (rk > 0.05) {
        const x = px, y = py - PR, s = 40 + 120 * rk;
        const bg = ctx.createRadialGradient(x, y, 0, x, y, s);
        bg.addColorStop(0, `rgba(255,250,240,${0.9 * rk})`);
        bg.addColorStop(0.25, `rgba(255,200,150,${0.35 * rk})`);
        bg.addColorStop(1, 'rgba(255,160,100,0)');
        ctx.fillStyle = bg;
        ctx.fillRect(x - s, y - s, s * 2, s * 2);
        ctx.strokeStyle = `rgba(255,240,230,${0.5 * rk})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - s * 1.6, y);
        ctx.lineTo(x + s * 1.6, y);
        ctx.stroke();
      }
    }

    // Braises : apparaissent depuis le bas avec l'éveil, s'éteignent à l'aube.
    const emberCount = Math.floor(EMB.length * awake);
    const emberFade = (1 - dawn * 0.5) * (1 - smoothstep(0.55, 1, dawn));
    for (let i = 0; i < EMB.length; i++) {
      const e = EMB[i];
      e.y += e.vy * dt * (1 + PRM.steam * 1.6) * motion;
      e.sw += dt * 0.8;
      if (e.y < -10) Object.assign(e, newEmber(false));
      if (i >= emberCount || emberFade <= 0.01) continue;
      let x = e.x + Math.sin(e.sw) * e.swA;
      if (PRM.shimmer > 0.01) x += Math.sin(rt * 14 + e.ph) * 1.2 * PRM.shimmer;
      const hgt = 1 - e.y / H, f = 0.5 + 0.5 * Math.sin(rt * e.fl + e.ph);
      const a = Math.max(0, (0.15 + 0.75 * (1 - hgt)) * f * emberFade);
      ctx.fillStyle = `rgba(${e.c},${a})`;
      ctx.beginPath();
      ctx.arc(x, e.y, e.size, 0, 6.283);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  function glDraw(rt) {
    if (!GLX || cur.awake < 0.002) return;
    const { gl, u } = GLX;
    let fa = 0, fx = -9999, fy = -9999;
    FLASHES.forEach((f) => {
      const v = f.amp * flashCurve(f.t);
      if (v > fa) { fa = v; fx = f.x; fy = f.y; }
    });
    const s = GLS;
    gl.uniform2f(u.uRes, glc.width, glc.height);
    gl.uniform1f(u.uT, rt % 2000);
    gl.uniform1f(u.uDawn, cur.dawn);
    gl.uniform1f(u.uBreath, PRM.breath * -Math.cos(((rt % 8) / 8) * Math.PI * 2));
    gl.uniform1f(u.uPulse, beatGlow * PRM.pulse);
    gl.uniform1f(u.uFlash, fa);
    gl.uniform1f(u.uRing, PRM.ring);
    gl.uniform2f(u.uFP, fx * s, (H - fy) * s);
    gl.uniform3f(u.uPl, PLx * s, (H - PLy) * s, PLR * s);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    glc.style.transform = shakeAmt > 0.05 && !reduce ? `translate(${(Math.random() - 0.5) * shakeAmt}px,${(Math.random() - 0.5) * shakeAmt}px)` : '';
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    const rt = now / 1000;
    drawFx(rt, dt);
    glDraw(rt);
    raf = requestAnimationFrame(loop);
  }

  addEventListener('resize', resize);
  resize();
  raf = requestAnimationFrame(loop);

  return {
    // instant : saute directement à l'état (réouverture de la routine en cours).
    set(awake, dawn, nextMode = 'calm', { instant = false } = {}) {
      target.awake = clamp01(awake);
      target.dawn = clamp01(dawn);
      if (nextMode !== mode) {
        mode = nextMode;
        Object.assign(TGT, PRM_ZERO, MODES[mode] || {});
      }
      if (instant) {
        cur.awake = target.awake;
        cur.dawn = target.dawn;
        Object.assign(PRM, TGT);
      }
    },
    destroy() {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
      GLX?.gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
