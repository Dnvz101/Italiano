/* Ascolto · Masmorra — mapa em Three.js
 *
 * Desenha só a CENA do mapa (fundo com parallax, névoa, corredores de pedra com
 * energia correndo, salas, brilhos, névoa de exploração, herói caminhando, partículas).
 * O SVG com as salas continua por cima: é ele que recebe o toque e mostra ícones.
 *
 *   AscoltoMap.mount(wrapEl, svgEl, cfg)   // a cada renderMap (idempotente)
 *   AscoltoMap.walk(fromId, toId, cb)      // herói anda até a sala e chama cb
 *   AscoltoMap.pause()
 *
 * cfg = { rooms:[{id,x,y,w,h,type,known,visited,current,reach,done,locked}],
 *         bg, mood:'floresta'|'cidade'|'vulcao', accent:'#hex',
 *         hero:{idle,run,back}, at:id }
 * Coordenadas = viewBox do SVG (360 x 480). Valores dos efeitos em MV (para o Godot).
 */
(function (root) {
  'use strict';
  var T = root.THREE;
  var M = { supported: false, active: false, speed: 1 };
  root.AscoltoMap = M;
  if (!T) return;

  var MV = { walkSpeed: 230, heroW: 40, sway: 7, fogAlpha: .75, runner: 2, glow: .55, ringPeriod: 1.7, vb: [360, 480] };
  var reduce = false;
  try { reduce = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

  var canvas, renderer, scene, camera, W = 0, H = 0, D0 = 600, wrap = null, svg = null;
  var sc = 1, ox = 0, oy = 0; // viewBox -> pixels
  var clock = 0, last = 0, raf = 0;
  var texSoft, texRing, texRays, texRune, texVig, tex = {};
  var bg, fogA, fogB, vig, flash, statics, staticTex, staticCv;
  var hero, heroSh, heroLight, parts, runnerPts;
  var S = { fx: {}, cfg: null, prev: null, rooms: {}, mood: null, bgUrl: null, walking: false, walk: null, runners: [], links: [], at: null, accent: '#ffd166' };
  var tws = [];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function tw(d, t, f, done) { var o = { t0: clock + d, t: Math.max(.0001, t), f: f, done: done }; tws.push(o); return o; }
  function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function cTex(c) { var t = new T.CanvasTexture(c); t.minFilter = T.LinearFilter; t.generateMipmaps = false; return t; }
  function hex(h) { var c = new T.Color(h || '#ffd166'); return [c.r, c.g, c.b]; }

  function loadTex(url, cb) {
    var e = tex[url];
    if (e) { if (e.ready) cb(e.t); else e.q.push(cb); return; }
    var t = new T.Texture(); t.minFilter = T.LinearFilter; t.generateMipmaps = false;
    e = tex[url] = { t: t, ready: false, q: [cb] };
    var img = new Image();
    img.onload = function () { t.image = img; t.needsUpdate = true; e.ready = true; e.q.forEach(function (f) { f(t); }); e.q = []; };
    img.onerror = function () { e.q = []; };
    img.src = url;
  }

  function procTex() {
    var c = mkCanvas(128, 128), g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); texSoft = cTex(c);
    c = mkCanvas(128, 128); g = c.getContext('2d'); g.strokeStyle = '#fff'; g.lineWidth = 5; g.shadowColor = '#fff'; g.shadowBlur = 8;
    g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke(); texRing = cTex(c);
    c = mkCanvas(256, 256); g = c.getContext('2d'); g.translate(128, 128);
    for (var i = 0; i < 12; i++) {
      var a = i / 12 * Math.PI * 2, w = .07 + (i % 3) * .03, gr = g.createLinearGradient(0, 0, Math.cos(a) * 128, Math.sin(a) * 128);
      gr.addColorStop(0, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0);
      g.lineTo(Math.cos(a - w) * 128, Math.sin(a - w) * 128); g.lineTo(Math.cos(a + w) * 128, Math.sin(a + w) * 128); g.fill();
    }
    texRays = cTex(c);
    // anel de runas
    c = mkCanvas(256, 256); g = c.getContext('2d'); g.translate(128, 128); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 6;
    g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 112, 0, 7); g.stroke(); g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 96, 0, 7); g.stroke();
    for (i = 0; i < 24; i++) { g.save(); g.rotate(i / 24 * Math.PI * 2); g.fillRect(-2, -112, 4, i % 3 === 0 ? 20 : 9); g.restore(); }
    for (i = 0; i < 8; i++) { g.save(); g.rotate(i / 8 * Math.PI * 2 + .2); g.beginPath(); g.moveTo(0, -84); g.lineTo(7, -70); g.lineTo(-7, -70); g.closePath(); g.fill(); g.restore(); }
    texRune = cTex(c);
    c = mkCanvas(128, 128); g = c.getContext('2d'); r = g.createRadialGradient(64, 64, 34, 64, 64, 92);
    r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); texVig = cTex(c);
  }

  function glow(map, col, order, add) {
    var m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: map, color: col, transparent: true, depthTest: false, depthWrite: false, blending: add === false ? T.NormalBlending : T.AdditiveBlending, opacity: 0 }));
    m.renderOrder = order; scene.add(m); return m;
  }

  /* ---------- partículas ---------- */
  var PN = 220;
  function mkPoints(n, order) {
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('color', new T.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('size', new T.BufferAttribute(new Float32Array(n), 1));
    geo.setAttribute('al', new T.BufferAttribute(new Float32Array(n), 1));
    var mat = new T.ShaderMaterial({
      uniforms: { map: { value: texSoft }, px: { value: 1 }, d0: { value: 600 } },
      vertexShader: 'attribute float size; attribute float al; attribute vec3 color; varying float vA; varying vec3 vC; uniform float px; uniform float d0; void main(){ vA = al; vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * px * (d0 / -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D map; varying float vA; varying vec3 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC * t.a, t.a * vA); }',
      transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending
    });
    var p = new T.Points(geo, mat); p.frustumCulled = false; p.renderOrder = order; scene.add(p); p.n = n; return p;
  }
  function spawn(o) {
    for (var i = 0; i < PN; i++) {
      var p = parts.pool[i];
      if (!p.on) {
        p.on = true; p.x = o.x; p.y = o.y; p.z = o.z == null ? 20 : o.z; p.vx = o.vx || 0; p.vy = o.vy || 0; p.g = o.g || 0; p.drag = o.drag == null ? .6 : o.drag;
        p.life = 0; p.max = o.life || 1; p.s0 = o.s || 8; p.s1 = o.s1 || 0; p.c = o.c || [1, 1, 1]; p.a = o.a == null ? 1 : o.a; p.wob = o.wob || 0; p.ph = Math.random() * 6; return p;
      }
    }
  }
  function burst(x, y, n, o) {
    if (reduce) n = Math.ceil(n / 3);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = (o.sp || 90) * (.4 + Math.random() * .8);
      spawn({ x: x, y: y, z: 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.g == null ? -30 : o.g, drag: 1.5, life: (o.life || .8) * (.6 + Math.random() * .6), s: (o.s || 7) * (.6 + Math.random() * .8), c: o.c, a: o.a });
    }
  }
  function updParts(dt) {
    var a = parts.geometry.attributes, pos = a.position.array, col = a.color.array, sz = a.size.array, al = a.al.array;
    for (var i = 0; i < PN; i++) {
      var p = parts.pool[i];
      if (!p.on) { al[i] = 0; sz[i] = 0; continue; }
      p.life += dt; if (p.life >= p.max) { p.on = false; al[i] = 0; sz[i] = 0; continue; }
      var k = p.life / p.max; p.vy += p.g * dt; var d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d;
      p.x += (p.vx + (p.wob ? Math.sin(clock * 1.7 + p.ph) * p.wob : 0)) * dt; p.y += p.vy * dt;
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      col[i * 3] = p.c[0]; col[i * 3 + 1] = p.c[1]; col[i * 3 + 2] = p.c[2];
      sz[i] = p.s0 + (p.s1 - p.s0) * k; al[i] = p.a * (k < .15 ? k / .15 : 1 - (k - .15) / .85);
    }
    a.position.needsUpdate = a.color.needsUpdate = a.size.needsUpdate = a.al.needsUpdate = true;
  }

  /* ---------- geometria do mapa (coordenadas do SVG) ---------- */
  function P(vx, vy) { return { x: vx * sc + ox - W / 2, y: H / 2 - (vy * sc + oy) }; }
  function roomById(id) { return S.rooms[id]; }
  function corridor(a, b) { // igual ao desenho do SVG: V, H, V
    var my = (a.y + b.y) / 2;
    return a.x === b.x ? [[a.x, a.y], [b.x, b.y]] : [[a.x, a.y], [a.x, my], [b.x, my], [b.x, b.y]];
  }
  function polyLen(pl) { var L = 0; for (var i = 1; i < pl.length; i++) L += Math.abs(pl[i][0] - pl[i - 1][0]) + Math.abs(pl[i][1] - pl[i - 1][1]); return L; }
  function polyAt(pl, d) {
    for (var i = 1; i < pl.length; i++) {
      var l = Math.abs(pl[i][0] - pl[i - 1][0]) + Math.abs(pl[i][1] - pl[i - 1][1]);
      if (d <= l || i === pl.length - 1) { var k = l ? clamp(d / l, 0, 1) : 0; return [pl[i - 1][0] + (pl[i][0] - pl[i - 1][0]) * k, pl[i - 1][1] + (pl[i][1] - pl[i - 1][1]) * k, pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]]; }
      d -= l;
    }
    return [pl[0][0], pl[0][1], 0, 0];
  }
  function rest(r) { return [r.x - r.w / 2 + 17, r.y + r.h / 2 - 3]; } // pés do herói parado na sala

  /* ---------- camada estática: corredores de pedra + placas das salas ---------- */
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function drawStatic() {
    var K = 3, cw = MV.vb[0] * K, ch = MV.vb[1] * K;
    if (!staticCv) { staticCv = mkCanvas(cw, ch); staticTex = cTex(staticCv); }
    var g = staticCv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch); g.scale(K, K);
    var acc = S.accent, byId = S.rooms;
    g.lineCap = 'round'; g.lineJoin = 'round';
    // corredores
    S.links.forEach(function (l) {
      var pl = l.pl; g.beginPath(); pl.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); });
      g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 10; g.strokeStyle = '#06101a'; g.lineWidth = 17; g.stroke(); g.shadowBlur = 0;
      g.strokeStyle = l.open ? '#344f66' : '#1a2b3b'; g.lineWidth = 12; g.stroke();
      g.strokeStyle = l.open ? '#4d6e8a' : '#223648'; g.lineWidth = 8; g.stroke();
      g.strokeStyle = l.open ? '#2a4258' : '#162637'; g.lineWidth = 5; g.setLineDash([2, 5]); g.stroke(); g.setLineDash([]);
      if (l.open) { g.shadowColor = acc; g.shadowBlur = 9; g.strokeStyle = acc; g.globalAlpha = .55; g.lineWidth = 1.4; g.stroke(); g.globalAlpha = 1; g.shadowBlur = 0; }
    });
    // placas das salas
    Object.keys(byId).forEach(function (id) {
      var r = byId[id], x = r.x - r.w / 2, y = r.y - r.h / 2;
      if (!r.known) {
        g.setLineDash([4, 4]); g.strokeStyle = 'rgba(111,138,162,.45)'; g.lineWidth = 2; rr(g, x, y, r.w, r.h, 8); g.fillStyle = 'rgba(8,18,28,.72)'; g.fill(); g.stroke(); g.setLineDash([]); return;
      }
      g.shadowColor = 'rgba(0,0,0,.65)'; g.shadowBlur = 12; g.shadowOffsetY = 4;
      var gr = g.createLinearGradient(0, y, 0, y + r.h);
      if (r.type === 'boss') { gr.addColorStop(0, '#2a1a3d'); gr.addColorStop(1, '#120c20'); }
      else { gr.addColorStop(0, r.visited ? '#1f3a52' : '#173048'); gr.addColorStop(1, r.visited ? '#10253a' : '#0c1c2c'); }
      g.fillStyle = gr; rr(g, x, y, r.w, r.h, 9); g.fill(); g.shadowBlur = 0; g.shadowOffsetY = 0;
      // brilho interno de pedra
      g.save(); rr(g, x, y, r.w, r.h, 9); g.clip();
      var hl = g.createLinearGradient(0, y, 0, y + r.h * .55); hl.addColorStop(0, 'rgba(255,255,255,.09)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = hl; g.fillRect(x, y, r.w, r.h * .55);
      for (var i = 0; i < 9; i++) { var px = x + ((i * 53 + r.id * 17) % r.w), py = y + ((i * 31 + r.id * 11) % r.h); g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(px, py, 3, 2); }
      g.restore();
      var bc = r.type === 'boss' ? '#c06cff' : (r.visited ? '#7f9bb4' : '#4a6580');
      if (r.locked) { g.setLineDash([3, 4]); }
      g.strokeStyle = bc; g.lineWidth = r.type === 'boss' ? 2.6 : 2; rr(g, x, y, r.w, r.h, 9); g.stroke(); g.setLineDash([]);
      g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 1; rr(g, x + 3, y + 3, r.w - 6, r.h - 6, 6); g.stroke();
      g.fillStyle = bc; [[x + 5, y + r.h - 5], [x + r.w - 5, y + r.h - 5], [x + r.w - 5, y + 5]].forEach(function (c) { g.beginPath(); g.arc(c[0], c[1], 1.4, 0, 7); g.fill(); });
    });
    staticTex.needsUpdate = true;
  }

  /* ---------- montagem ---------- */
  function init() {
    if (renderer) return M.supported;
    try {
      canvas = document.createElement('canvas'); canvas.className = 'fx3d-map'; canvas.setAttribute('aria-hidden', 'true');
      renderer = new T.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setClearColor(0x000000, 0); renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    } catch (e) { renderer = null; M.supported = false; return false; }
    scene = new T.Scene(); camera = new T.PerspectiveCamera(32, 1, 1, 3000);
    procTex();
    bg = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: 0x9aa6b4, depthTest: false, depthWrite: false })); bg.renderOrder = 0; bg.visible = false; scene.add(bg);
    fogA = glow(texSoft, new T.Color(.45, .6, .75), 1); fogB = glow(texSoft, new T.Color(.6, .5, .75), 1);
    staticTex = null;
    statics = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false })); statics.renderOrder = 2; scene.add(statics);
    parts = mkPoints(PN, 9); parts.pool = []; for (var i = 0; i < PN; i++) parts.pool.push({ on: false });
    runnerPts = mkPoints(60, 6);
    heroSh = glow(texSoft, new T.Color(0, 0, 0), 7, false); heroLight = glow(texSoft, new T.Color(1, .8, .45), 3);
    var hg = new T.PlaneGeometry(1, 1); hg.translate(0, .5, 0);
    hero = new T.Mesh(hg, new T.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, side: T.DoubleSide })); hero.renderOrder = 8; hero.visible = false; scene.add(hero);
    hero.aspect = 1.25; hero.url = null; hero.flip = 1; hero.oy = 0; hero.sq = 0;
    vig = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: texVig, transparent: true, opacity: .8, depthTest: false, depthWrite: false })); vig.renderOrder = 11; scene.add(vig);
    flash = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: T.AdditiveBlending })); flash.renderOrder = 12; scene.add(flash);
    M.supported = true; return true;
  }

  function setPose(url) {
    if (!url || hero.url === url) return; hero.url = url;
    loadTex(url, function (t) { if (hero.url !== url) return; hero.material.map = t; hero.material.needsUpdate = true; hero.aspect = t.image.height / t.image.width; hero.visible = true; });
  }
  function setBg(url) {
    if (S.bgUrl === url) return; S.bgUrl = url;
    loadTex(url, function (t) { if (S.bgUrl !== url) return; bg.material.map = t; bg.material.needsUpdate = true; bg.aspect = t.image.width / t.image.height; bg.visible = true; layoutStatic(); });
  }

  function resize() {
    var r = wrap.getBoundingClientRect(), w = Math.max(50, Math.round(r.width)), h = Math.max(50, Math.round(r.height));
    var sr = svg.getBoundingClientRect();
    var nsc = Math.min(sr.width / MV.vb[0], sr.height / MV.vb[1]), nox = (sr.left - r.left) + (sr.width - MV.vb[0] * nsc) / 2, noy = (sr.top - r.top) + (sr.height - MV.vb[1] * nsc) / 2;
    var same = (w === W && h === H && Math.abs(nsc - sc) < 1e-4 && Math.abs(nox - ox) < .01 && Math.abs(noy - oy) < .01);
    W = w; H = h; sc = nsc; ox = nox; oy = noy;
    if (same) return false;
    renderer.setSize(W, H, false); canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    camera.aspect = W / H; D0 = (H / 2) / Math.tan(32 * Math.PI / 360); camera.position.set(0, 0, D0); camera.updateProjectionMatrix();
    [parts, runnerPts].forEach(function (p) { p.material.uniforms.px.value = renderer.getPixelRatio(); p.material.uniforms.d0.value = D0; });
    vig.scale.set(W * 1.02, H * 1.02, 1); vig.position.z = 40; flash.scale.set(W * 2, H * 2, 1); flash.position.z = 60;
    return true;
  }

  function layoutStatic() {
    var c = P(MV.vb[0] / 2, MV.vb[1] / 2);
    statics.position.set(c.x, c.y, 0); statics.scale.set(MV.vb[0] * sc, MV.vb[1] * sc, 1);
    var d = D0 + 300, k = (d / D0) * 1.16, asp = bg.aspect || 1.5, bh = H * k, bw = bh * asp;
    if (bw < W * k) { bw = W * k; bh = bw / asp; }
    bg.scale.set(bw, bh, 1); bg.position.set(0, 0, -300);
    fogA.scale.set(W * 1.4, H * .5, 1); fogB.scale.set(W * 1.2, H * .45, 1); fogA.position.z = -150; fogB.position.z = -80;
  }

  /* ---------- estado das salas e efeitos dinâmicos ---------- */
  function buildRooms(cfg) {
    var old = S.rooms, prev = S.prev || {};
    S.rooms = {}; S.links = [];
    cfg.rooms.forEach(function (r) { S.rooms[r.id] = r; });
    cfg.rooms.forEach(function (a) {
      a.links.forEach(function (bid) {
        if (bid < a.id) return; var b = S.rooms[bid];
        S.links.push({ a: a.id, b: bid, pl: corridor(a, b), open: !!(a.visited || b.visited), len: polyLen(corridor(a, b)) });
      });
    });
    // objetos por sala (brilho, névoa, anel)
    Object.keys(S.rooms).forEach(function (id) {
      var r = S.rooms[id];
      r.fx = S.fx[id];
      if (!r.fx) {
        r.fx = S.fx[id] = { glow: glow(texSoft, new T.Color(1, 1, 1), 3), ring: glow(texRing, new T.Color(1, .82, .4), 5), rune: glow(texRune, new T.Color(1, .82, .4), 5), fog: glow(texSoft, new T.Color(0, 0, 0), 4, false), fogA: S.firstMount ? 0 : 0, ph: Math.random() * 6 };
        r.fx.fogA = r.known ? 0 : 1;
      }
    });
    // transições (só depois da primeira montagem)
    if (S.mounted) {
      Object.keys(S.rooms).forEach(function (id) {
        var r = S.rooms[id], p = prev[id]; if (!p) return;
        var c = P(r.x, r.y), col = r.type === 'boss' ? [.85, .45, 1] : [1, .85, .45];
        if (r.known && !p.known) { burst(c.x, c.y, 18, { c: [.8, .95, 1], sp: 70, s: 7 }); }
        if (r.done && !p.done) { burst(c.x, c.y, 22, { c: col, sp: 110, s: 8, g: -60, life: 1 }); }
        if (p.locked && !r.locked) { burst(c.x, c.y, 40, { c: [.9, .45, 1], sp: 160, s: 9 }); pulse(0xc06cff, .25, .6); }
      });
    }
    S.prev = {}; Object.keys(S.rooms).forEach(function (id) { var r = S.rooms[id]; S.prev[id] = { known: r.known, done: r.done, locked: r.locked }; });
  }
  function pulse(col, a, dur) { flash.material.color.set(col); tw(0, dur, function (p) { flash.material.opacity = a * (1 - p); }); }

  function mood(m) {
    if (S.mood === m) return; S.mood = m;
  }

  var ambT = 0;
  function ambient(dt) {
    ambT += dt; var rate = reduce ? .22 : .1; if (ambT < rate) return; ambT = 0;
    var x = (Math.random() - .5) * W, y = (Math.random() - .5) * H, m = S.mood, ac = hex(S.accent);
    if (m === 'vulcao') {
      spawn({ x: x, y: -H / 2 - 5, z: Math.random() * 100 - 40, vx: (Math.random() - .5) * 10, vy: 22 + Math.random() * 34, g: 4, drag: .05, life: 5 + Math.random() * 3, s: 3 + Math.random() * 4, c: Math.random() < .7 ? [1, .45, .15] : [1, .75, .3], wob: 9, a: .8 });
      if (Math.random() < .3) spawn({ x: x, y: H / 2 + 5, z: -60, vx: 6, vy: -14, g: 0, drag: 0, life: 6, s: 3, c: [.5, .45, .45], wob: 6, a: .35 });
    } else if (m === 'cidade') {
      spawn({ x: x, y: y, z: Math.random() * 120 - 60, vx: (Math.random() - .5) * 5, vy: 5 + Math.random() * 9, g: 0, drag: 0, life: 5 + Math.random() * 4, s: 3 + Math.random() * 4, c: Math.random() < .6 ? [1, .85, .5] : [1, .95, .8], wob: 8, a: .6 });
    } else {
      spawn({ x: x, y: y, z: Math.random() * 120 - 60, vx: (Math.random() - .5) * 6, vy: 3 + Math.random() * 8, g: 0, drag: 0, life: 5 + Math.random() * 4, s: 3 + Math.random() * 4.5, c: Math.random() < .5 ? [.6, 1, .75] : [.7, .85, 1], wob: 11, a: .65 });
      if (Math.random() < .12) spawn({ x: x, y: H / 2 + 5, z: 30, vx: (Math.random() - .5) * 20, vy: -18 - Math.random() * 12, g: 0, drag: 0, life: 6, s: 4, c: [.55, .85, .5], wob: 14, a: .5 });
    }
  }

  // energia correndo pelos corredores abertos
  function updRunners(t) {
    var a = runnerPts.geometry.attributes, pos = a.position.array, col = a.color.array, sz = a.size.array, al = a.al.array, n = 0, cur = S.at;
    var ac = hex(S.accent), lan = [1, .82, .4];
    S.links.forEach(function (l, li) {
      var guide = l.a === cur || l.b === cur, cnt = l.open ? MV.runner : 0; if (guide && !l.open) cnt = 1;
      for (var k = 0; k < cnt && n < runnerPts.n; k++, n++) {
        var sp = guide ? 34 : 20, d = ((t * sp + k * l.len / cnt + li * 13) % l.len), pt = polyAt(l.pl, d), w = P(pt[0], pt[1]);
        pos[n * 3] = w.x; pos[n * 3 + 1] = w.y; pos[n * 3 + 2] = 4;
        var c = guide ? lan : ac; col[n * 3] = c[0]; col[n * 3 + 1] = c[1]; col[n * 3 + 2] = c[2];
        sz[n] = guide ? 8 : 5.5; al[n] = guide ? .95 : .7;
      }
    });
    for (; n < runnerPts.n; n++) { al[n] = 0; sz[n] = 0; }
    a.position.needsUpdate = a.color.needsUpdate = a.size.needsUpdate = a.al.needsUpdate = true;
  }

  var TYPE_GLOW = { monster: [1, .35, .4], chest: [1, .8, .35], rest: [1, .6, .25], boss: [.85, .35, 1], start: [.5, 1, .8] };
  function updRooms(t, dt) {
    Object.keys(S.rooms).forEach(function (id) {
      var r = S.rooms[id], f = r.fx, c = P(r.x, r.y), pw = r.w * sc, ph = r.h * sc;
      // névoa de exploração
      var tgt = r.known ? 0 : 1; f.fogA += (tgt - f.fogA) * Math.min(1, dt * 2.4);
      f.fog.position.set(c.x, c.y, 3); f.fog.scale.set(pw * 1.7, ph * 1.9, 1); f.fog.material.opacity = f.fogA * MV.fogAlpha; f.fog.visible = f.fogA > .01;
      // brilho da sala
      var gc = TYPE_GLOW[r.type] || [1, 1, 1], on = r.known ? (r.done ? .18 : (r.visited ? .42 : .3)) : 0;
      if (r.current) on = .65; if (r.type === 'boss' && r.known) on = r.locked ? .4 + Math.sin(t * 2) * .12 : .75;
      f.glow.material.color.setRGB(gc[0], gc[1], gc[2]); f.glow.position.set(c.x, c.y, 2); f.glow.scale.set(pw * 1.6, ph * 1.9, 1);
      f.glow.material.opacity = on * MV.glow * (r.known ? 1 + Math.sin(t * 2.3 + f.ph) * .12 : 0); f.glow.visible = f.glow.material.opacity > .01;
      // anel de alcance (toque para ir)
      var show = r.reach && !S.walking;
      if (show) { var k = ((t / MV.ringPeriod) + f.ph) % 1; f.ring.visible = true; f.ring.position.set(c.x, c.y, 5); var s = Math.max(pw, ph) * (.9 + k * .75); f.ring.scale.set(s * 1.25, s * .95, 1); f.ring.material.opacity = (1 - k) * .75; }
      else f.ring.visible = false;
      // runas da sala atual
      if (r.current) { f.rune.visible = true; f.rune.position.set(c.x, c.y, 5); var rs = Math.max(pw, ph) * 1.25; f.rune.scale.set(rs, rs * .8, 1); f.rune.rotation.z = t * .35; f.rune.material.opacity = .45 + Math.sin(t * 2) * .1; }
      else f.rune.visible = false;
    });
  }

  /* ---------- herói ---------- */
  var hState = { x: 0, y: 0 };
  function placeHero() {
    var cur = S.rooms[S.at]; if (!cur) return;
    var p = rest(cur); hState.x = p[0]; hState.y = p[1];
  }
  function drawHero(t) {
    var w = MV.heroW * sc, h = w * hero.aspect, wp = P(hState.x, hState.y), moving = !!S.walk;
    var br = Math.sin(t * 2.2) * .02, hop = moving ? Math.abs(Math.sin(t * 16)) * 3.2 * sc : 0, sq = hero.sq || 0;
    hero.position.set(wp.x, wp.y + hop + (hero.oy || 0), 10);
    hero.scale.set(w * hero.flip * (1 - br * .6 + sq * .1), h * (1 + br - sq * .08), 1);
    hero.rotation.z = moving ? Math.sin(t * 16) * .06 : 0;
    heroSh.position.set(wp.x, wp.y - 1, 7); heroSh.scale.set(w * (1 - hop / (14 * sc) * .3) * .95, w * .24, 1); heroSh.material.opacity = .5;
    heroLight.position.set(wp.x, wp.y + h * .4, 3); var hs = w * 3.4 * (1 + Math.sin(t * 7) * .02); heroLight.scale.set(hs, hs, 1); heroLight.material.opacity = .32;
  }

  function walk(fromId, toId, cb) {
    if (!M.active || reduce || S.walking || fromId === toId || !S.rooms[fromId] || !S.rooms[toId]) { cb(); return; }
    var a = S.rooms[fromId], b = S.rooms[toId];
    var l = null; S.links.forEach(function (k) { if ((k.a === fromId && k.b === toId) || (k.a === toId && k.b === fromId)) l = k; });
    if (!l) { cb(); return; }
    var pl = l.a === fromId ? l.pl.slice() : l.pl.slice().reverse();
    // dos pés na sala de origem, pelo corredor, até os pés na sala de destino
    var ra = rest(a), rb = rest(b), pts = [[ra[0], ra[1]]];
    pl.forEach(function (p, i) { if (i > 0 && i < pl.length - 1) pts.push([p[0], p[1] + 12]); });
    pts.splice(1, 0, [pl[0][0], pl[0][1] + 12]); pts.push([pl[pl.length - 1][0], pl[pl.length - 1][1] + 12]); pts.push([rb[0], rb[1]]);
    var len = polyLen(pts), dur = clamp(len / MV.walkSpeed, .45, 1.1);
    S.walking = true; S.walk = { pts: pts }; var dust = 0;
    var urlRun = S.cfg.hero.run, urlBack = S.cfg.hero.back, urlIdle = S.cfg.hero.idle;
    tw(0, dur, function (p) {
      var e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2, d = e * len, q = polyAt(pts, d);
      hState.x = q[0]; hState.y = q[1];
      if (Math.abs(q[3]) > Math.abs(q[2]) * 1.2) { setPose(q[3] < 0 ? urlBack : urlIdle); hero.flip = 1; } else { setPose(urlRun); hero.flip = q[2] < 0 ? -1 : 1; }
      dust -= 1; if (dust < 0) { dust = 4; var w = P(q[0], q[1]); spawn({ x: w.x, y: w.y, z: 12, vx: (Math.random() - .5) * 14, vy: 8 + Math.random() * 8, g: 0, drag: 2, life: .5, s: 6, c: [.75, .75, .7], a: .55 }); }
    }, function () {
      S.walk = null; S.walking = false; hero.flip = 1; setPose(urlIdle);
      var w = P(hState.x, hState.y); burst(w.x, w.y + 6, 8, { c: [.8, .9, 1], sp: 40, s: 5, life: .5 });
      tw(0, .16, function (p) { hero.sq = Math.sin(p * Math.PI); }, function () { hero.sq = 0; cb(); });
    });
  }

  /* ---------- laço ---------- */
  function frame(now) {
    raf = 0;
    if (!wrap || !canvas.isConnected || document.hidden || !wrap.offsetParent) { M.active = false; return; }
    raf = root.requestAnimationFrame(frame);
    var real = now / 1000, dt = Math.min(.05, real - (last || real)) * M.speed; last = real; clock += dt;
    if (resize()) { layoutStatic(); }
    for (var i = tws.length - 1; i >= 0; i--) { var o = tws[i]; if (clock < o.t0) continue; var p = clamp((clock - o.t0) / o.t, 0, 1); o.f(p); if (p >= 1) { tws.splice(i, 1); if (o.done) o.done(); } }
    var t = clock, sw = reduce ? 0 : MV.sway;
    // parallax: só as camadas de fundo se movem (z=0 fica 1:1 com o SVG)
    bg.position.x = Math.sin(t * .3) * sw; bg.position.y = Math.cos(t * .23) * sw * .5;
    var fl = reduce ? 1 : 1 + Math.sin(t * 8) * .02 + Math.sin(t * 19) * .015;
    var base = .62 * fl; bg.material.color.setRGB(base * .95, base, base * 1.06);
    fogA.position.set(Math.sin(t * .13) * W * .2, -H * .28, -150); fogB.position.set(Math.cos(t * .1) * W * .25, H * .22, -80);
    fogA.material.opacity = .14; fogB.material.opacity = .11;
    var ac = hex(S.accent); fogA.material.color.setRGB(ac[0] * .6 + .2, ac[1] * .6 + .2, ac[2] * .6 + .2);
    drawHero(t); updRooms(t, dt); updRunners(t); ambient(dt); updParts(dt);
    renderer.render(scene, camera);
  }

  /* ---------- API ---------- */
  M.mount = function (wrapEl, svgEl, cfg) {
    if (!init()) return false;
    wrap = wrapEl; svg = svgEl; S.cfg = cfg; S.at = cfg.at; S.accent = cfg.accent || '#ffd166';
    if (canvas.parentNode !== wrap) wrap.insertBefore(canvas, wrap.firstChild);
    wrap.classList.add('gl');
    resize();
    S.walking = false; S.walk = null; tws.length = 0; hero.flip = 1; hero.sq = 0;
    buildRooms(cfg); S.mounted = true;
    mood(cfg.mood); setBg(cfg.bg); setPose(cfg.hero.idle); placeHero();
    if (!statics.material.map && staticTex) statics.material.map = staticTex;
    drawStatic(); if (!statics.material.map) { statics.material.map = staticTex; statics.material.needsUpdate = true; }
    layoutStatic();
    M.active = true; if (!raf) { last = 0; raf = root.requestAnimationFrame(frame); }
    return true;
  };
  M.walk = walk;
  M.pause = function () { if (raf) { root.cancelAnimationFrame(raf); raf = 0; } M.active = false; };
  M.values = MV;
  root.addEventListener('resize', function () { if (wrap && renderer) { W = 0; } });
  root.addEventListener('visibilitychange', function () { if (!document.hidden && wrap && canvas && canvas.isConnected && !raf) { last = 0; raf = root.requestAnimationFrame(frame); } });
})(window);
