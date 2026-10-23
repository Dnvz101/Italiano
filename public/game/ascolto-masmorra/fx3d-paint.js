/* Ascolto · Masmorra — mapa pintado (estilo "mapa-múndi" de jogo mobile) com efeitos em Three.js
 *
 * A arte é uma ilustração alta; o container rola na vertical (rolagem nativa).
 * Em cima da arte: um canvas WebGL (sticky, não rola) com
 *   água brilhando, cogumelos pulsando, vaga-lumes com parallax, névoa,
 *   névoa de exploração nas clareiras, anéis de toque, energia correndo pelo caminho,
 *   herói caminhando pelo caminho desenhado.
 * Os pinos (toque, número, ícone) são HTML por cima de tudo.
 *
 *   AscoltoPaint.mount(host, scroller, cfg)   // a cada renderMap (idempotente)
 *   AscoltoPaint.walk(fromId, toId, cb)
 *   AscoltoPaint.pause()
 * cfg = { paint:{w,h,water,glow,nodes,path}, rooms:[view...], at:id, hero:{idle,run,back}, accent }
 * Coordenadas: pixels da arte original (paint.w x paint.h). Valores dos efeitos em PV.
 */
(function (root) {
  'use strict';
  var T = root.THREE;
  var A = { supported: false, active: false, speed: 1 };
  root.AscoltoPaint = A;
  if (!T) return;

  var PV = { walkSpeed: 520, heroW: 118, follow: 4.5, fly: 46, shimmer: 1, glowPulse: 1.5, ringPeriod: 1.8, fogAlpha: .5 };
  var reduce = false;
  try { reduce = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

  var canvas, renderer, scene, camera, host = null, scroller = null, W = 0, H = 0, u = 1, D0 = 600;
  var clock = 0, last = 0, raf = 0, scroll = 0;
  var texSoft, texRing, texRune, texVig, tex = {};
  var water, glowL, vig, flash, fogs = [], heroM, heroSh, heroLight, parts, runnerPts;
  var S = { cfg: null, paint: null, rooms: {}, fx: {}, prev: null, mounted: false, walking: false, walk: null, at: null, arcs: {}, cum: [], total: 0, key: null, followTo: null, hx: 0, hy: 0, links: [] };
  var tws = [];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function tw(d, t, f, done) { var o = { t0: clock + d, t: Math.max(.0001, t), f: f, done: done }; tws.push(o); return o; }
  function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function cTex(c) { var t = new T.CanvasTexture(c); t.minFilter = T.LinearFilter; t.generateMipmaps = false; return t; }
  function hex(h) { var c = new T.Color(h || '#ffd166'); return [c.r, c.g, c.b]; }
  function loadTex(url, cb) {
    var e = tex[url];
    if (e) { if (e.ready) cb(e.t); else e.q.push(cb); return; }
    var t = new T.Texture(); t.minFilter = T.LinearFilter; t.magFilter = T.LinearFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
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
    c = mkCanvas(128, 128); g = c.getContext('2d'); g.strokeStyle = '#fff'; g.lineWidth = 5; g.shadowColor = '#fff'; g.shadowBlur = 8; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke(); texRing = cTex(c);
    c = mkCanvas(256, 256); g = c.getContext('2d'); g.translate(128, 128); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 6;
    g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 112, 0, 7); g.stroke(); g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 96, 0, 7); g.stroke();
    var i; for (i = 0; i < 24; i++) { g.save(); g.rotate(i / 24 * Math.PI * 2); g.fillRect(-2, -112, 4, i % 3 === 0 ? 20 : 9); g.restore(); }
    for (i = 0; i < 8; i++) { g.save(); g.rotate(i / 8 * Math.PI * 2 + .2); g.beginPath(); g.moveTo(0, -84); g.lineTo(7, -70); g.lineTo(-7, -70); g.closePath(); g.fill(); g.restore(); }
    texRune = cTex(c);
    c = mkCanvas(128, 128); g = c.getContext('2d'); r = g.createRadialGradient(64, 64, 36, 64, 64, 92); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); texVig = cTex(c);
  }
  function glowMesh(map, col, order, add) {
    var m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: map, color: col, transparent: true, depthTest: false, depthWrite: false, blending: add === false ? T.NormalBlending : T.AdditiveBlending, opacity: 0 }));
    m.renderOrder = order; scene.add(m); return m;
  }

  /* ---------- partículas (coordenadas da arte; k = parallax) ---------- */
  var PN = 240;
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
        p.on = true; p.x = o.x; p.y = o.y; p.k = o.k || 0; p.vx = o.vx || 0; p.vy = o.vy || 0; p.g = o.g || 0; p.drag = o.drag == null ? .6 : o.drag;
        p.life = 0; p.max = o.life || 1; p.s0 = o.s || 8; p.s1 = o.s1 || 0; p.c = o.c || [1, 1, 1]; p.a = o.a == null ? 1 : o.a; p.wob = o.wob || 0; p.ph = Math.random() * 6; return p;
      }
    }
  }
  function burst(x, y, n, o) {
    if (reduce) n = Math.ceil(n / 3);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = (o.sp || 300) * (.4 + Math.random() * .8);
      spawn({ x: x, y: y, vx: Math.cos(a) * sp, vy: -Math.sin(a) * sp, g: o.g == null ? 140 : o.g, drag: 1.6, life: (o.life || .9) * (.6 + Math.random() * .6), s: (o.s || 20) * (.6 + Math.random() * .8), c: o.c, a: o.a });
    }
  }
  function updParts(dt) {
    var a = parts.geometry.attributes, pos = a.position.array, col = a.color.array, sz = a.size.array, al = a.al.array;
    for (var i = 0; i < PN; i++) {
      var p = parts.pool[i];
      if (!p.on) { al[i] = 0; sz[i] = 0; continue; }
      p.life += dt; if (p.life >= p.max) { p.on = false; al[i] = 0; sz[i] = 0; continue; }
      var k = p.life / p.max; p.vy += p.g * dt; var d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d;
      p.x += (p.vx + (p.wob ? Math.sin(clock * 1.6 + p.ph) * p.wob : 0)) * dt; p.y += p.vy * dt;
      pos[i * 3] = p.x * u - W / 2; pos[i * 3 + 1] = H / 2 - (p.y * u - scroll * (1 + p.k)); pos[i * 3 + 2] = 20 + p.k * 100;
      col[i * 3] = p.c[0]; col[i * 3 + 1] = p.c[1]; col[i * 3 + 2] = p.c[2];
      sz[i] = (p.s0 + (p.s1 - p.s0) * k) * u * 3.4; al[i] = p.a * (k < .15 ? k / .15 : 1 - (k - .15) / .85);
    }
    a.position.needsUpdate = a.color.needsUpdate = a.size.needsUpdate = a.al.needsUpdate = true;
  }

  /* ---------- caminho ---------- */
  function buildPath(paint) {
    var pts = paint.path, cum = [0], i;
    for (i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    S.cum = cum; S.total = cum[cum.length - 1]; S.arcs = {};
    Object.keys(paint.nodes).forEach(function (id) {
      var n = paint.nodes[id], best = 0, bd = 1e18;
      for (i = 0; i < pts.length; i++) { var d = (pts[i][0] - n[0]) * (pts[i][0] - n[0]) + (pts[i][1] - n[1]) * (pts[i][1] - n[1]); if (d < bd) { bd = d; best = i; } }
      S.arcs[id] = cum[best];
    });
  }
  function pathAt(s) {
    var pts = S.paint.path, cum = S.cum, lo = 0, hi = cum.length - 1;
    s = clamp(s, 0, S.total);
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    var l = cum[hi] - cum[lo], k = l ? (s - cum[lo]) / l : 0;
    return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * k, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * k, pts[hi][0] - pts[lo][0], pts[hi][1] - pts[lo][1]];
  }
  function restOf(id) { var n = S.paint.nodes[id]; return [n[0] - 46, n[1] + 22]; } // pés do herói parado na clareira

  /* ---------- montagem ---------- */
  var WFS = [
    'uniform sampler2D mask; uniform float t; uniform float amp; varying vec2 vUv;',
    'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }',
    'float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1.,0.)),f.x), mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x), f.y); }',
    'void main(){',
    '  float m = texture2D(mask, vUv).r; if (m < .02) discard;',
    '  vec2 p = vec2(vUv.x * 22., vUv.y * 48.);',
    '  float a = n(p * vec2(1.0, 3.2) + vec2(t * .35, t * .12));',
    '  float b = n(p * vec2(1.7, 4.6) - vec2(t * .5, t * .2) + 7.3);',
    '  float streak = smoothstep(.66, .82, a * .6 + b * .4);',
    '  float glint = smoothstep(.86, .95, n(p * 3.0 + vec2(t * .9, -t * .4)));',
    '  float shade = (n(p * .7 + t * .1) - .5) * .12;',
    '  vec3 col = vec3(.6,.9,1.) * (streak * .5 + glint * .9) + vec3(.1,.25,.4) * max(shade, 0.);',
    '  gl_FragColor = vec4(col * m * amp, m * (streak * .5 + glint * .8) * amp);',
    '}'
  ].join('\n');
  var GFS = [
    'uniform sampler2D map; uniform float t; uniform float amp; varying vec2 vUv;',
    'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }',
    'void main(){',
    '  vec4 c = texture2D(map, vUv); if (c.a < .02) discard;',
    '  float ph = h(floor(vUv * vec2(70., 150.))) * 6.2831;',
    '  float p = .45 + .55 * (.5 + .5 * sin(t * 1.7 + ph));',
    '  gl_FragColor = vec4(c.rgb * c.a * p * amp, c.a * p);',
    '}'
  ].join('\n');
  var VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';

  function init() {
    if (renderer) return A.supported;
    try {
      canvas = document.createElement('canvas'); canvas.className = 'fx3d-paint'; canvas.setAttribute('aria-hidden', 'true');
      renderer = new T.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setClearColor(0x000000, 0); renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    } catch (e) { renderer = null; A.supported = false; return false; }
    scene = new T.Scene(); camera = new T.PerspectiveCamera(32, 1, 1, 3000); procTex();
    var q = function (fs, order) {
      return new T.Mesh(new T.PlaneGeometry(1, 1), new T.ShaderMaterial({ uniforms: { mask: { value: null }, map: { value: null }, t: { value: 0 }, amp: { value: 1 } }, vertexShader: VS, fragmentShader: fs, transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending }));
    };
    water = q(WFS); water.renderOrder = 1; water.visible = false; scene.add(water);
    glowL = q(GFS); glowL.renderOrder = 2; glowL.visible = false; scene.add(glowL);
    for (var i = 0; i < 6; i++) { var f = glowMesh(texSoft, new T.Color(.35 + Math.random() * .1, .55, .7), 3); f.userData = { ph: Math.random() * 6, y: Math.random(), k: .1 + Math.random() * .2, s: .7 + Math.random() * .8 }; fogs.push(f); }
    parts = mkPoints(PN, 9); parts.pool = []; for (i = 0; i < PN; i++) parts.pool.push({ on: false });
    runnerPts = mkPoints(120, 6);
    heroSh = glowMesh(texSoft, new T.Color(0, 0, 0), 7, false); heroLight = glowMesh(texSoft, new T.Color(1, .8, .45), 3);
    var hg = new T.PlaneGeometry(1, 1); hg.translate(0, .5, 0);
    heroM = new T.Mesh(hg, new T.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, side: T.DoubleSide })); heroM.renderOrder = 8; heroM.visible = false; scene.add(heroM);
    heroM.aspect = 1.25; heroM.url = null; heroM.flip = 1; heroM.sq = 0;
    vig = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: texVig, transparent: true, opacity: .55, depthTest: false, depthWrite: false })); vig.renderOrder = 11; scene.add(vig);
    flash = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: T.AdditiveBlending })); flash.renderOrder = 12; scene.add(flash);
    A.supported = true; return true;
  }

  function setPose(url) {
    if (!url || heroM.url === url) return; heroM.url = url;
    loadTex(url, function (t) { if (heroM.url !== url) return; heroM.material.map = t; heroM.material.needsUpdate = true; heroM.aspect = t.image.height / t.image.width; heroM.visible = true; });
  }
  function setPaintTex(paint) {
    if (S.texKey === paint.img) return; S.texKey = paint.img;
    water.visible = glowL.visible = false;
    loadTex(paint.water, function (t) { water.material.uniforms.mask.value = t; water.visible = true; });
    loadTex(paint.glow, function (t) { glowL.material.uniforms.map.value = t; glowL.visible = true; });
  }

  function resize() {
    var w = Math.max(50, scroller.clientWidth), h = Math.max(50, scroller.clientHeight);
    if (w === W && h === H) return false;
    W = w; H = h; u = W / S.paint.w;
    renderer.setSize(W, H, false); canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    camera.aspect = W / H; D0 = (H / 2) / Math.tan(32 * Math.PI / 360); camera.position.set(0, 0, D0); camera.updateProjectionMatrix();
    [parts, runnerPts].forEach(function (p) { p.material.uniforms.px.value = renderer.getPixelRatio(); p.material.uniforms.d0.value = D0; });
    vig.scale.set(W * 1.02, H * 1.02, 1); vig.position.z = 40; flash.scale.set(W * 2, H * 2, 1); flash.position.z = 60;
    scroller.style.setProperty('--u', u.toFixed(5));
    return true;
  }
  function WX(x) { return x * u - W / 2; }
  function WY(y, k) { return H / 2 - (y * u - scroll * (1 + (k || 0))); }

  /* ---------- estado das salas ---------- */
  var TYPE_GLOW = { monster: [.4, .6, 1], chest: [1, .8, .35], rest: [.45, 1, .55], boss: [.9, .35, .5], start: [.7, .85, 1] };
  function pulse(col, a, dur) { flash.material.color.set(col); tw(0, dur, function (p) { flash.material.opacity = a * (1 - p); }); }
  function buildRooms(cfg) {
    var prev = S.prev || {}; S.rooms = {}; S.links = [];
    cfg.rooms.forEach(function (r) { S.rooms[r.id] = r; });
    cfg.rooms.forEach(function (a) { a.links.forEach(function (bid) { if (bid < a.id) return; var b = S.rooms[bid]; S.links.push({ a: a.id, b: bid, open: !!(a.visited || b.visited) }); }); });
    Object.keys(S.rooms).forEach(function (id) {
      var r = S.rooms[id]; r.fx = S.fx[id];
      if (!r.fx) { r.fx = S.fx[id] = { glow: glowMesh(texSoft, new T.Color(1, 1, 1), 4), ring: glowMesh(texRing, new T.Color(1, .82, .4), 5), rune: glowMesh(texRune, new T.Color(1, .82, .4), 5), fog: glowMesh(texSoft, new T.Color(0, 0, 0), 4, false), fogA: r.known ? 0 : 1, ph: Math.random() * 6 }; }
    });
    if (S.mounted) Object.keys(S.rooms).forEach(function (id) {
      var r = S.rooms[id], p = prev[id], n = S.paint.nodes[id]; if (!p || !n) return;
      var col = r.type === 'boss' ? [.9, .45, 1] : [1, .85, .45];
      if (r.known && !p.known) burst(n[0], n[1], 22, { c: [.8, .95, 1], sp: 260, s: 18 });
      if (r.done && !p.done) burst(n[0], n[1] - 40, 26, { c: col, sp: 380, s: 20, g: 260, life: 1.1 });
      if (p.locked && !r.locked) { burst(n[0], n[1], 46, { c: [.9, .45, 1], sp: 520, s: 22 }); pulse(0xc06cff, .22, .6); }
    });
    S.prev = {}; Object.keys(S.rooms).forEach(function (id) { var r = S.rooms[id]; S.prev[id] = { known: r.known, done: r.done, locked: r.locked }; });
  }

  function updRooms(t, dt) {
    Object.keys(S.rooms).forEach(function (id) {
      var r = S.rooms[id], f = r.fx, n = S.paint.nodes[id]; if (!n) return;
      var x = WX(n[0]), y = WY(n[1]), cw = 200 * u, ch = 150 * u;
      f.fogA += ((r.known ? 0 : 1) - f.fogA) * Math.min(1, dt * 2.4);
      f.fog.position.set(x, y, 3); f.fog.scale.set(cw * 1.35, ch * 1.5, 1); f.fog.material.opacity = 0; f.fog.visible = false; /* sem névoa sobre os selos */
      var gc = TYPE_GLOW[r.type] || [1, 1, 1], on = r.known ? (r.done ? .16 : (r.visited ? .4 : .28)) : 0;
      if (r.current) on = .6; if (r.type === 'boss' && r.known) on = r.locked ? .4 + Math.sin(t * 2) * .12 : .75;
      f.glow.material.color.setRGB(gc[0], gc[1], gc[2]); f.glow.position.set(x, y, 2); f.glow.scale.set(cw * 1.7, ch * 1.9, 1);
      f.glow.material.opacity = 0; f.glow.visible = false; /* sem brilho em volta das salas */
      f.ring.visible = false;
      f.rune.visible = false;
    });
  }

  // energia correndo pelo caminho entre salas já visitadas e guia dourado até as vizinhas
  function updRunners(t) {
    var a = runnerPts.geometry.attributes, pos = a.position.array, col = a.color.array, sz = a.size.array, al = a.al.array, n = 0, ac = hex(S.cfg.accent), lan = [1, .82, .4];
    S.links.forEach(function (l, li) {
      var s0 = S.arcs[l.a], s1 = S.arcs[l.b]; if (s0 == null || s1 == null) return;
      if (s0 > s1) { var tmp = s0; s0 = s1; s1 = tmp; }
      var guide = l.a === S.at || l.b === S.at, cnt = l.open ? Math.max(2, Math.round((s1 - s0) / 260)) : (guide ? 2 : 0), len = s1 - s0;
      for (var k = 0; k < cnt && n < runnerPts.n; k++, n++) {
        var sp = guide ? 150 : 90, d = ((t * sp + k * len / cnt + li * 37) % len), q = pathAt(s0 + d);
        pos[n * 3] = WX(q[0]); pos[n * 3 + 1] = WY(q[1]); pos[n * 3 + 2] = 4;
        var c = guide ? lan : ac; col[n * 3] = c[0]; col[n * 3 + 1] = c[1]; col[n * 3 + 2] = c[2];
        sz[n] = (guide ? 22 : 15) * u * 3.4; al[n] = guide ? .95 : .65;
      }
    });
    for (; n < runnerPts.n; n++) { al[n] = 0; sz[n] = 0; }
    a.position.needsUpdate = a.color.needsUpdate = a.size.needsUpdate = a.al.needsUpdate = true;
  }

  var ambT = 0;
  function ambient(dt) {
    ambT += dt; var rate = reduce ? .3 : .12; if (ambT < rate) return; ambT = 0;
    var sx = Math.random() * W, sy = Math.random() * H, k = [-.3, 0, .35][(Math.random() * 3) | 0], c = Math.random() < .55 ? [.75, 1, .5] : (Math.random() < .5 ? [.5, .85, 1] : [1, .95, .6]);
    spawn({ x: sx / u, y: (sy + scroll * (1 + k)) / u, k: k, vx: (Math.random() - .5) * 16, vy: -(6 + Math.random() * 18), g: 0, drag: 0, life: 5 + Math.random() * 4, s: 8 + Math.random() * 9 + k * 10, c: c, wob: 28, a: .75 });
  }

  /* ---------- herói ---------- */
  function drawHero(t) {
    var w = PV.heroW * u, h = w * heroM.aspect, moving = !!S.walk;
    var hop = moving ? Math.abs(Math.sin(t * 15)) * 11 * u : 0, br = Math.sin(t * 2.2) * .02, sq = heroM.sq || 0;
    var x = WX(S.hx), y = WY(S.hy);
    heroM.position.set(x, y + hop, 10); heroM.scale.set(w * heroM.flip * (1 - br * .6 + sq * .1), h * (1 + br - sq * .08), 1); heroM.rotation.z = moving ? Math.sin(t * 15) * .06 : 0;
    heroSh.position.set(x, y - 1, 7); heroSh.scale.set(w * .9, w * .24, 1); heroSh.material.opacity = .5;
    heroLight.visible = false; /* sem aura em volta do herói */
  }

  function walk(fromId, toId, cb) {
    if (!A.active || reduce || S.walking || fromId === toId || S.arcs[fromId] == null || S.arcs[toId] == null) { cb(); return; }
    var sa = S.arcs[fromId], sb = S.arcs[toId], pts = [restOf(fromId)], dir = sb > sa ? 1 : -1, i, total;
    pts.push(pathAt(sa).slice(0, 2));
    var step = 40, n = Math.max(1, Math.floor(Math.abs(sb - sa) / step));
    for (i = 1; i <= n; i++) pts.push(pathAt(sa + (sb - sa) * i / n).slice(0, 2));
    pts.push(pathAt(sb).slice(0, 2)); pts.push(restOf(toId));
    var cum = [0]; for (i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); total = cum[cum.length - 1];
    var dur = clamp(total / PV.walkSpeed, .6, 2.4), dust = 0, hc = S.cfg.hero; S.walking = true; S.walk = true;
    tw(0, dur, function (p) {
      var e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2, d = e * total, j = 1; while (j < cum.length - 1 && cum[j] < d) j++;
      var k = (d - cum[j - 1]) / ((cum[j] - cum[j - 1]) || 1), x0 = pts[j - 1], x1 = pts[j], dx = x1[0] - x0[0], dy = x1[1] - x0[1];
      S.hx = x0[0] + dx * k; S.hy = x0[1] + dy * k;
      if (Math.abs(dy) > Math.abs(dx) * .9) { setPose(dy < 0 ? hc.back : hc.idle); heroM.flip = 1; } else { setPose(hc.run); heroM.flip = dx < 0 ? -1 : 1; }
      dust -= 1; if (dust < 0) { dust = 4; spawn({ x: S.hx, y: S.hy, k: 0, vx: (Math.random() - .5) * 60, vy: -30 - Math.random() * 30, g: 0, drag: 2, life: .5, s: 22, c: [.75, .75, .7], a: .5 }); }
      S.followTo = S.hy;
    }, function () {
      S.walk = null; S.walking = false; heroM.flip = 1; setPose(hc.idle); S.followTo = null;
      burst(S.hx, S.hy - 10, 8, { c: [.8, .9, 1], sp: 150, s: 14, life: .5 });
      tw(0, .16, function (p) { heroM.sq = Math.sin(p * Math.PI); }, function () { heroM.sq = 0; cb(); });
    });
  }

  /* ---------- laço ---------- */
  function frame(now) {
    raf = 0;
    if (!scroller || !canvas.isConnected || document.hidden || !scroller.offsetParent) { A.active = false; return; }
    raf = root.requestAnimationFrame(frame);
    var real = now / 1000, dt = Math.min(.05, real - (last || real)) * A.speed; last = real; clock += dt;
    resize();
    // segue o herói durante a caminhada
    if (S.followTo != null) {
      var maxS = scroller.scrollHeight - H, tgt = clamp(S.followTo * u - H * .58, 0, Math.max(0, maxS));
      scroller.scrollTop += (tgt - scroller.scrollTop) * Math.min(1, dt * PV.follow);
    }
    scroll = scroller.scrollTop;
    for (var i = tws.length - 1; i >= 0; i--) { var o = tws[i]; if (clock < o.t0) continue; var p = clamp((clock - o.t0) / o.t, 0, 1); o.f(p); if (p >= 1) { tws.splice(i, 1); if (o.done) o.done(); } }
    var t = reduce ? 0 : clock, imgH = S.paint.h * u;
    // camadas que acompanham a arte (rolam com ela)
    var cy = WY(S.paint.h / 2); [water, glowL].forEach(function (m) { m.position.set(0, cy, 1); m.scale.set(W, imgH, 1); m.material.uniforms.t.value = t; });
    water.material.uniforms.amp.value = PV.shimmer; glowL.material.uniforms.amp.value = PV.glowPulse * .5;
    // névoa à deriva com parallax
    fogs.forEach(function (f) {
      var d = f.userData, y = ((d.y * (S.paint.h + 800) + t * 8 * d.s) % (S.paint.h + 800)) - 400;
      f.position.set(Math.sin(t * .1 * d.s + d.ph) * W * .35, WY(y, d.k), -50); f.scale.set(W * 1.1 * d.s, H * .5 * d.s, 1); f.material.opacity = .09;
    });
    drawHero(t); updRooms(t, dt); updRunners(t); ambient(dt); updParts(dt);
    renderer.render(scene, camera);
  }

  /* ---------- API ---------- */
  A.mount = function (cvHost, scrollEl, cfg) {
    if (!init()) return false;
    if (S.walking) return true; // não interrompe a caminhada com um re-render
    host = cvHost; scroller = scrollEl; S.cfg = cfg; S.paint = cfg.paint; S.at = cfg.at;
    if (canvas.parentNode !== host) host.appendChild(canvas);
    buildPath(cfg.paint); setPaintTex(cfg.paint);
    W = 0; resize();
    S.walking = false; S.walk = null; S.followTo = null; tws.length = 0; heroM.flip = 1; heroM.sq = 0;
    buildRooms(cfg); S.mounted = true;
    setPose(cfg.hero.idle);
    var r = restOf(cfg.at); S.hx = r[0]; S.hy = r[1];
    // abre o mapa centrado no herói
    var maxS = scroller.scrollHeight - H; scroller.scrollTop = clamp(r[1] * u - H * .58, 0, Math.max(0, maxS)); scroll = scroller.scrollTop;
    A.active = true; if (!raf) { last = 0; raf = root.requestAnimationFrame(frame); }
    return true;
  };
  A.walk = walk;
  A.pause = function () { if (raf) { root.cancelAnimationFrame(raf); raf = 0; } A.active = false; };
  A.values = PV;
  root.addEventListener('visibilitychange', function () { if (!document.hidden && scroller && canvas && canvas.isConnected && !raf) { last = 0; raf = root.requestAnimationFrame(frame); } });
})(window);
