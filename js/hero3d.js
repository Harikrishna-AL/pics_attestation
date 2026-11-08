/* PICS — 3D hero.
   A degree certificate in front of the PICS sun. On load the three stamps of
   the attestation chain land on it (MEA → Embassy → MOFA). Drag turns it a
   full 360°, the pointer tilts it, and scrolling sets the sun into the
   destinations band. Presentation only: if WebGL is unavailable or the visitor
   prefers reduced motion, the flat SVG hero stays as it is. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const hero = document.querySelector('.hero');
const art = hero && hero.querySelector('.hero-art');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection && navigator.connection.saveData;

if (art && !reduceMotion && !saveData && hasWebGL()) {
  init().catch(() => { /* keep the flat hero */ });
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

/* ---------- palette, from css/theme.css ---------- */
const C = {
  ink: '#1b1431', ink2: '#4a4360', ink3: '#6e6884',
  paper: '#fffdf8', rule: '#dcd8e4', blue: '#0a86c8', blueDeep: '#0a6aa3',
  violet: '#5b3a96', mark: '#f6bd45', red: '#b3261e'
};
const F = {
  display: '"Bricolage Grotesque", system-ui, sans-serif',
  text: '"Atkinson Hyperlegible Next", system-ui, sans-serif',
  mono: '"Atkinson Hyperlegible Mono", ui-monospace, monospace'
};

async function init() {
  // Canvas textures need the real faces, not fallbacks
  if (document.fonts && document.fonts.load) {
    await Promise.race([
      Promise.all([
        document.fonts.load('800 40px "Bricolage Grotesque"'),
        document.fonts.load('400 20px "Atkinson Hyperlegible Next"'),
        document.fonts.load('500 20px "Atkinson Hyperlegible Mono"')
      ]),
      new Promise(r => setTimeout(r, 1500))
    ]);
  }

  const stage = document.createElement('div');
  stage.className = 'hero-3d';
  // Positioned inline too: the canvas must never be able to size its parent,
  // even if a stale stylesheet is cached
  stage.style.position = 'absolute';
  stage.style.overflow = 'hidden';
  if (getComputedStyle(art).position === 'static') art.style.position = 'relative';
  const hint = document.createElement('span');
  hint.className = 'hero-3d-hint';
  hint.innerHTML = '<i class="bi bi-arrow-repeat" aria-hidden="true"></i>Drag to turn the certificate';
  art.appendChild(stage);
  art.appendChild(hint);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  stage.appendChild(renderer.domElement);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 11);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6f2f9, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-3, 4, 6);
  scene.add(key);

  /* ---- the sun: a disc cut by water lines, in three depth layers ---- */
  const sun = new THREE.Group();
  const sunBands = sunTextures();
  sunBands.forEach((tex, i) => {
    tex.anisotropy = maxAniso;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 5.2),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    );
    m.position.z = i * 0.35;        // lower bands sit nearer: parallax depth
    m.renderOrder = i;
    sun.add(m);
  });
  scene.add(sun);

  /* ---- the certificate ---- */
  const W = 2.3, H = W * 1.414, D = 0.035;
  const front = tex(certFront()), back = tex(certBack());
  const edge = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.95 });
  const doc = new THREE.Group();
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [
    edge, edge, edge, edge,
    new THREE.MeshStandardMaterial({ map: front, roughness: 0.92 }),
    new THREE.MeshStandardMaterial({ map: back, roughness: 0.92 })
  ]);
  doc.add(sheet);

  const stampSpecs = [
    { lines: ['MINISTRY OF EXTERNAL AFFAIRS', 'NEW DELHI'], mid: 'MEA', color: C.violet, x: -0.56, y: -0.62, r: 0.38, rot: 0.22 },
    { lines: ['EMBASSY OF THE U.A.E.', 'NEW DELHI'], mid: 'ATTESTED', color: C.blueDeep, x: 0.52, y: -0.58, r: 0.37, rot: -0.3 },
    { lines: ['MINISTRY OF FOREIGN AFFAIRS', 'U.A.E.'], mid: 'MOFA', color: C.red, x: 0.02, y: -1.02, r: 0.33, rot: 0.08 }
  ];
  const stamps = stampSpecs.map((s, i) => {
    const t = tex(stampCanvas(s));
    const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s.r * 2, s.r * 2), mat);
    m.position.set(s.x, s.y, D / 2 + 0.002 + i * 0.001);
    m.rotation.z = s.rot;
    m.visible = false;
    doc.add(m);
    return { mesh: m, at: 1.35 + i * 0.6, done: false };
  });
  scene.add(doc);

  /* ---- layout: the canvas spills past the column; place objects by aspect ---- */
  let aspect = 1, docBase = new THREE.Vector3(), sunBase = new THREE.Vector3(), docScale = 1;
  function layout() {
    const r = stage.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    // half-height of the view at z=0
    const vh = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const vw = vh * aspect;
    const wide = window.innerWidth >= 992;
    docScale = Math.min(1, (vh * 2 * 0.78) / H, (vw * 2 * (wide ? 0.5 : 0.7)) / W);
    doc.scale.setScalar(docScale);
    docBase.set(wide ? -vw * 0.18 : -vw * 0.12, wide ? 0.05 : 0.1, 0.6);
    sunBase.set(wide ? vw * 0.32 : vw * 0.42, wide ? -vh * 0.1 : -vh * 0.18, -2.2);
    const sunScale = Math.min(1.25, (vh * 2 * 0.95) / 5.2 * (wide ? 1.15 : 1));
    sun.scale.setScalar(sunScale);
  }
  layout();
  new ResizeObserver(layout).observe(stage);

  /* ---- input: pointer tilt, drag to turn ---- */
  const pointer = { x: 0, y: 0 };
  let spin = 0, spinVel = 0, dragging = false, lastX = 0, lastT = 0, touched = false;
  const canvas = renderer.domElement;
  window.addEventListener('pointermove', e => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    spin += dx * 0.012;
    spinVel = (dx * 0.012) / Math.max(8, now - lastT) * 16;
    lastX = e.clientX; lastT = now;
  }, { passive: true });
  canvas.addEventListener('pointerdown', e => {
    dragging = true; touched = true;
    lastX = e.clientX; lastT = performance.now(); spinVel = 0;
    canvas.setPointerCapture(e.pointerId);
    stage.classList.add('is-grabbing');
    hint.classList.remove('is-on');
  });
  const release = () => { dragging = false; stage.classList.remove('is-grabbing'); };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  /* ---- scroll: hero progress 0..1 ---- */
  let scrollP = 0;
  // 0 while the art sits mid-screen (or lower), 1 once it has scrolled a
  // full screen past that: works whether the art is beside or below the copy
  const onScroll = () => {
    const r = art.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    scrollP = Math.min(1, Math.max(0, (vh * 0.5 - (r.top + r.height / 2)) / vh));
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- loop, paused when the hero is off-screen or the tab is hidden ---- */
  // The entrance and stamps start the first time the art is properly in view
  let visible = false, started = false, raf = 0, last = performance.now(), t = 0;
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && en.intersectionRatio >= 0.35) started = true;
    kick();
  }, { threshold: [0, 0.35] }).observe(art);
  document.addEventListener('visibilitychange', kick);
  function kick() {
    if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  const tilt = { x: 0, y: 0 };
  let bump = 0;
  hero.classList.add('has-3d');

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; if (started) t += dt;

    // entrance: rise from below, settle
    const enter = easeOutCubic(Math.min(1, t / 1.2));

    // stamps land one by one
    stamps.forEach(s => {
      const k = (t - s.at) / 0.32;
      if (k < 0) return;
      s.mesh.visible = true;
      const e = Math.min(1, k);
      s.mesh.scale.setScalar(1 + (1 - easeOutCubic(e)) * 0.9);
      s.mesh.material.opacity = 0.92 * Math.min(1, e * 1.6);
      if (e >= 1 && !s.done) { s.done = true; bump = 1; }
    });
    if (!touched && t > 3.2) hint.classList.add('is-on');
    bump *= Math.pow(0.0008, dt);

    // drag inertia, then settle on the nearest face
    if (!dragging) {
      spin += spinVel;
      spinVel *= Math.pow(0.04, dt);
      if (Math.abs(spinVel) < 0.002) {
        const target = Math.round(spin / Math.PI) * Math.PI;
        spin += (target - spin) * Math.min(1, dt * 3);
      }
    }

    tilt.x += ((pointer.y * 0.14) - tilt.x) * Math.min(1, dt * 4);
    tilt.y += ((pointer.x * 0.22) - tilt.y) * Math.min(1, dt * 4);
    const bob = Math.sin(t * 1.1) * 0.05;

    doc.position.set(
      docBase.x,
      docBase.y + bob - (1 - enter) * 2.2 + scrollP * 1.1,
      docBase.z - bump * 0.12
    );
    doc.rotation.set(
      -0.08 + tilt.x + (1 - enter) * 0.9 + scrollP * 0.55,
      -0.32 + tilt.y + spin + (1 - enter) * -0.6,
      -0.05 + (1 - enter) * 0.15
    );

    sun.position.set(
      sunBase.x - tilt.y * 0.6,
      sunBase.y + tilt.x * 0.4 - scrollP * 2.4 - (1 - enter) * 0.6,
      sunBase.z
    );
    sun.children.forEach((m, i) => { m.position.x = -tilt.y * 0.25 * i; });

    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  kick();

  function tex(canvas) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    return t;
  }
}

function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }

/* ---------- textures ---------- */

// The logo sun, split into three layers: disc top + upper bands, middle, lowest
function sunTextures() {
  const S = 1024, R = S / 2;
  // water lines from the SVG mark (viewBox 600), scaled
  const k = S / 600;
  const cuts = [[307, 329], [363, 381], [416, 432], [467, 481]];
  const layers = [[0, 363], [363, 467], [467, 600]];
  return layers.map(([from, to]) => {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    g.save();
    g.beginPath(); g.rect(0, from * k, S, (to - from) * k); g.clip();
    g.beginPath(); g.arc(R, R, R - 2, 0, Math.PI * 2); g.fillStyle = C.blue; g.fill();
    g.globalCompositeOperation = 'destination-out';
    cuts.forEach(([a, b]) => {
      g.beginPath();
      g.moveTo(-20 * k, a * k);
      g.quadraticCurveTo(R, (a + 26) * k, S + 20 * k, a * k);
      g.lineTo(S + 20 * k, b * k);
      g.quadraticCurveTo(R, (b + 6) * k, -20 * k, b * k);
      g.closePath(); g.fill();
    });
    g.restore();
    return new THREE.CanvasTexture(c);
  }).map(t => { t.colorSpace = THREE.SRGBColorSpace; return t; });
}

function paperCanvas() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1448;
  const g = c.getContext('2d');
  g.fillStyle = C.paper; g.fillRect(0, 0, c.width, c.height);
  // faint paper grain
  const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 7;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return { c, g };
}

function certFront() {
  const { c, g } = paperCanvas();
  const w = c.width, h = c.height;
  // double frame
  g.strokeStyle = C.violet; g.lineWidth = 6; g.strokeRect(46, 46, w - 92, h - 92);
  g.strokeStyle = C.ink; g.lineWidth = 2; g.strokeRect(66, 66, w - 132, h - 132);
  // watermark: the PICS sun, very faint
  g.save(); g.globalAlpha = 0.06; g.fillStyle = C.blue;
  g.beginPath(); g.arc(w / 2, 640, 300, 0, Math.PI * 2); g.fill(); g.restore();

  g.textAlign = 'center'; g.fillStyle = C.ink3;
  g.font = `500 26px ${F.mono}`;
  spaced(g, 'REPUBLIC OF INDIA', w / 2, 170, 6);
  g.fillStyle = C.ink;
  g.font = `800 92px ${F.display}`;
  g.fillText('Degree', w / 2, 300);
  g.fillText('Certificate', w / 2, 392);
  g.fillStyle = C.mark; g.fillRect(w / 2 - 90, 428, 180, 8);

  g.fillStyle = C.ink2; g.font = `400 32px ${F.text}`;
  g.fillText('This is to certify that', w / 2, 520);
  line(g, w / 2 - 270, 590, 540, C.ink);
  g.fillText('has been conferred the degree of', w / 2, 670);
  g.fillStyle = C.ink; g.font = `700 46px ${F.display}`;
  g.fillText('Bachelor of Technology', w / 2, 742);
  g.fillStyle = C.ink2; g.font = `400 30px ${F.text}`;
  g.fillText('with all the rights and privileges thereto.', w / 2, 800);

  // signature lines
  g.textAlign = 'left';
  line(g, 130, 1270, 250, C.ink3); line(g, w - 380, 1270, 250, C.ink3);
  g.fillStyle = C.ink3; g.font = `500 20px ${F.mono}`;
  g.fillText('REGISTRAR', 130, 1305);
  g.fillText('VICE-CHANCELLOR', w - 380, 1305);
  g.textAlign = 'center';
  g.fillText('REF · PICS / KOCHI', w / 2, 1360);
  return c;
}

function certBack() {
  const { c, g } = paperCanvas();
  const w = c.width;
  g.strokeStyle = C.rule; g.lineWidth = 2; g.strokeRect(66, 66, w - 132, c.height - 132);
  g.textAlign = 'left';
  g.fillStyle = C.blueDeep; g.font = `500 24px ${F.mono}`;
  spaced(g, 'ATTESTATION RECORD', 130, 180, 5, 'left');
  g.fillStyle = C.ink; g.font = `800 76px ${F.display}`;
  g.fillText('Handled', 130, 290);
  g.fillText('by PICS.', 130, 372);

  const rows = [
    ['India', 'MEA · New Delhi'],
    ['India', 'U.A.E. Embassy'],
    ['Destination', 'MOFA · U.A.E.'],
    ['Your door', 'Scan, then courier']
  ];
  rows.forEach(([where, what], i) => {
    const y = 520 + i * 170;
    g.fillStyle = C.blue; g.beginPath(); g.arc(150, y - 12, 13, 0, Math.PI * 2); g.fill();
    if (i < rows.length - 1) { g.fillStyle = C.ink; g.fillRect(148, y + 10, 4, 136); }
    g.fillStyle = C.blueDeep; g.font = `500 22px ${F.mono}`;
    spaced(g, where.toUpperCase(), 196, y - 26, 3, 'left');
    g.fillStyle = C.ink; g.font = `700 44px ${F.display}`;
    g.fillText(what, 196, y + 24);
  });
  g.fillStyle = C.ink3; g.font = `500 22px ${F.mono}`;
  g.fillText('picsattestation.in', 130, 1330);
  return c;
}

function stampCanvas(s) {
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const cx = S / 2;
  g.strokeStyle = g.fillStyle = s.color;
  g.lineWidth = 12; g.beginPath(); g.arc(cx, cx, 236, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.arc(cx, cx, 170, 0, Math.PI * 2); g.stroke();
  // ring text
  g.font = `700 34px ${F.mono}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  ringText(g, s.lines[0], cx, cx, 203, -Math.PI / 2);
  ringText(g, s.lines[1], cx, cx, 203, Math.PI / 2, true);
  // centre
  g.font = `800 ${s.mid.length > 5 ? 50 : 76}px ${F.display}`;
  g.fillText(s.mid, cx, cx - 6);
  g.font = `500 26px ${F.mono}`;
  g.fillText('★ ★ ★', cx, cx + 62);
  // worn ink: knock out speckles
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 1400; i++) {
    g.globalAlpha = Math.random() * 0.7;
    g.beginPath();
    g.arc(Math.random() * S, Math.random() * S, Math.random() * 3.2, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

function ringText(g, text, cx, cy, r, center, bottom) {
  const chars = [...text];
  const step = 0.105;
  const total = step * (chars.length - 1);
  chars.forEach((ch, i) => {
    const a = bottom ? center + total / 2 - i * step : center - total / 2 + i * step;
    g.save();
    g.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    g.rotate(bottom ? a - Math.PI / 2 : a + Math.PI / 2);
    g.fillText(ch, 0, 0);
    g.restore();
  });
}

function spaced(g, text, x, y, px, align = 'center') {
  if ('letterSpacing' in g) { g.letterSpacing = px + 'px'; g.textAlign = align; g.fillText(text, x, y); g.letterSpacing = '0px'; return; }
  g.textAlign = align; g.fillText(text, x, y);
}

function line(g, x, y, w, color) { g.fillStyle = color; g.fillRect(x, y, w, 2); }
