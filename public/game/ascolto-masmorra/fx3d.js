/* Ascolto · Masmorra — cena de batalha em Three.js
 *
 * Só desenha a CENA (fundo em camadas, personagens, partículas, golpes).
 * Textos, barras de vida e botões continuam em HTML por cima.
 * Quem usa: AscoltoFX.mount(stageEl, cfg) a cada render. É idempotente: a cena
 * persiste entre renders, e cada resultado só anima uma vez (cfg.evKey).
 *
 * cfg = {
 *   scene:  'sala-id'          // muda => entrada nova
 *   kind:   'monster'|'boss'|'chest',
 *   bg:     url,
 *   fx:     'boss'|'fire'|null  // aura do monstro
 *   hero:   {idle, attack, hurt},
 *   foe:    url|null            // null => mantém o desenho HTML
 *   word:   'texto'             // letras que sobem quando o monstro cai
 *   evKey:  null | 'id'         // id do resultado (só na fase de resultado)
 *   res:    {correct, crit, down, opened, trap, dmg, heroDown, won}
 * }
 *
 * Valores de efeito (para portar ao Godot) estão em FXV, no topo.
 */
(function (root) {
  'use strict';
  var T = root.THREE;
  var FX = { supported: false, active: false, speed: 1 };
  root.AscoltoFX = FX;
  if (!T) return;

  /* ---- números dos efeitos (um lugar só) ---- */
  var FXV = {
    dash: 0.17, back: 0.40, hitStop: 0.07, slowCrit: 0.32, slowScale: 0.28,
    shake: 7, shakeCrit: 13, shakeHurt: 9, zoomCrit: 0.09,
    flash: 0.2, dissolve: 0.95, bossDissolve: 1.35,
    fov: 32, parallax: 7
  };
  var reduce = false;
  try { reduce = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

  var canvas, renderer, scene, camera, W = 0, H = 0, D0 = 600, stageEl = null;
  var clock = 0, last = 0, ts = 1, stopUntil = 0, slowUntil = 0, slowScale = FXV.slowScale, raf = 0;
  var shakeAmp = 0, zoom = 0, flashA = 0, flashCol = new T.Color(1, 1, 1), vigA = 0;
  var tex = {}, tws = [], dyn = [], S = { scene: null, ev: null, foeUrl: null, foeDown: false, opened: false, kind: 'monster' };
  var hero, foe, bg, fogA, fogB, shHero, shFoe, aura, glowFoe, overlay, vig, parts, ghosts = [];
  var texSoft, texRing, texRays, texSlash;

  /* ---------- utilidades ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  var ease = {
    out: function (p) { return 1 - Math.pow(1 - p, 3); },
    io: function (p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; },
    back: function (p) { var c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
    bounce: function (p) {
      var n = 7.5625, d = 2.75;
      if (p < 1 / d) return n * p * p;
      if (p < 2 / d) return n * (p -= 1.5 / d) * p + .75;
      if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + .9375;
      return n * (p -= 2.625 / d) * p + .984375;
    },
    lin: function (p) { return p; }
  };
  function tw(d, t, f, e, done) { var o = { t0: clock + d, t: Math.max(.0001, t), f: f, e: e || ease.lin, done: done, on: false }; tws.push(o); return o; }
  function at(d, fn) { return tw(d, .0001, function () {}, null, fn); }

  function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function canvasTex(c) { var t = new T.CanvasTexture(c); t.minFilter = T.LinearFilter; t.generateMipmaps = false; return t; }

  function makeProcTex() {
    var c = mkCanvas(128, 128), g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); texSoft = canvasTex(c);

    c = mkCanvas(128, 128); g = c.getContext('2d');
    g.strokeStyle = '#fff'; g.lineWidth = 7; g.shadowColor = '#fff'; g.shadowBlur = 10;
    g.beginPath(); g.arc(64, 64, 50, 0, 7); g.stroke(); texRing = canvasTex(c);

    c = mkCanvas(256, 256); g = c.getContext('2d'); g.translate(128, 128);
    for (var i = 0; i < 14; i++) {
      var a = i / 14 * Math.PI * 2, w = .09 + (i % 3) * .03;
      var gr = g.createLinearGradient(0, 0, Math.cos(a) * 128, Math.sin(a) * 128);
      gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0);
      g.lineTo(Math.cos(a - w) * 128, Math.sin(a - w) * 128); g.lineTo(Math.cos(a + w) * 128, Math.sin(a + w) * 128); g.fill();
    }
    texRays = canvasTex(c);

    c = mkCanvas(256, 128); g = c.getContext('2d');
    var grd = g.createLinearGradient(0, 0, 256, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(.55, 'rgba(255,255,255,.85)'); grd.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = grd; g.beginPath(); g.moveTo(0, 118);
    g.quadraticCurveTo(128, -30, 256, 70); g.quadraticCurveTo(140, 20, 0, 118); g.fill();
    texSlash = canvasTex(c);
  }

  function loadTex(url, cb) {
    var e = tex[url];
    if (e) { if (e.ready) cb(e.t); else e.q.push(cb); return e.t; }
    var t = new T.Texture(); t.minFilter = T.LinearFilter; t.generateMipmaps = false;
    e = tex[url] = { t: t, ready: false, q: [cb] };
    var img = new Image();
    img.onload = function () { t.image = img; t.needsUpdate = true; e.ready = true; e.q.forEach(function (f) { f(t); }); e.q = []; };
    img.onerror = function () { e.q = []; };
    img.src = url;
    return t;
  }

  /* ---------- sprite com shader (flash, dissolver, brilho) ---------- */
  var VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
  var FS = [
    'uniform sampler2D map; uniform float flash; uniform vec3 flashCol; uniform float dis; uniform vec3 edgeCol; uniform float alpha; uniform vec3 tint; uniform vec3 add;',
    'varying vec2 vUv;',
    'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }',
    'float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1.,0.)),f.x), mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x), f.y); }',
    'void main(){',
    '  vec4 c = texture2D(map, vUv);',
    '  c.rgb *= tint;',
    '  float m = (n(vUv*8.)*.6 + n(vUv*19.)*.4)*.82 + vUv.y*.18;',
    '  if (dis > 0.0) { if (m < dis) discard; float e = 1.0 - smoothstep(dis, dis+.10, m); c.rgb = mix(c.rgb, edgeCol*1.8, e); c.a *= (1.0 - e*.15); }',
    '  c.rgb = mix(c.rgb, flashCol, flash) + add * c.a;',
    '  gl_FragColor = vec4(c.rgb, c.a * alpha);',
    '}'
  ].join('\n');

  function Ent(z, order) {
    var g = new T.PlaneGeometry(1, 1); g.translate(0, .5, 0);
    this.mat = new T.ShaderMaterial({
      uniforms: {
        map: { value: null }, flash: { value: 0 }, flashCol: { value: new T.Color(1, 1, 1) }, dis: { value: 0 },
        edgeCol: { value: new T.Color(1, .6, .2) }, alpha: { value: 1 }, tint: { value: new T.Color(1, 1, 1) }, add: { value: new T.Color(0, 0, 0) }
      },
      vertexShader: VS, fragmentShader: FS, transparent: true, depthTest: false, depthWrite: false
    });
    this.m = new T.Mesh(g, this.mat); this.m.renderOrder = order; this.m.visible = false;
    this.z = z; this.bx = 0; this.by = 0; this.w = 60; this.h = 60; this.aspect = 1;
    this.ox = 0; this.oy = 0; this.sx = 1; this.sy = 1; this.rot = 0; this.idle = true; this.ph = Math.random() * 6;
    this.url = null; this.fit = 'box'; this.flip = 1;
    scene.add(this.m);
  }
  Ent.prototype.set = function (url, self) {
    if (!url) { this.m.visible = false; this.url = null; return; }
    if (this.url === url && this.mat.uniforms.map.value) return;
    this.url = url; var me = this;
    var t = loadTex(url, function (tt) {
      if (me.url !== url) return;
      me.mat.uniforms.map.value = tt; me.aspect = tt.image.height / tt.image.width; me.ready = true; me.m.visible = true; me.refit();
    });
    if (tex[url].ready) { this.mat.uniforms.map.value = t; this.aspect = t.image.height / t.image.width; this.ready = true; this.m.visible = true; this.refit(); }
  };
  Ent.prototype.refit = function () {
    // this.box = {w,h} de layout; mantém a proporção do desenho dentro da caixa
    var b = this.box || { w: 60, h: 60 };
    if (this.fit === 'width') { this.w = b.w; this.h = b.w * this.aspect; }
    else { var k = Math.min(b.w, b.h / this.aspect); this.w = k; this.h = k * this.aspect; }
  };
  Ent.prototype.apply = function (t) {
    var u = this.mat.uniforms, b = Math.sin(t * 2.2 + this.ph), idle = this.idle ? 1 : 0;
    var br = this.breath ? b * this.breath * idle : 0;
    this.m.position.set(this.bx + this.ox, this.by + this.oy + (this.bob ? Math.abs(b) * this.bob * idle : 0), this.z);
    this.m.scale.set(this.w * this.sx * this.flip * (1 - br * .6), this.h * this.sy * (1 + br), 1);
    this.m.rotation.z = this.rot;
  };

  /* ---------- partículas ---------- */
  var PN = 260;
  function makeParts() {
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(PN * 3), 3));
    geo.setAttribute('color', new T.BufferAttribute(new Float32Array(PN * 3), 3));
    geo.setAttribute('size', new T.BufferAttribute(new Float32Array(PN), 1));
    geo.setAttribute('al', new T.BufferAttribute(new Float32Array(PN), 1));
    var mat = new T.ShaderMaterial({
      uniforms: { map: { value: texSoft }, px: { value: 1 } },
      vertexShader: 'attribute float size; attribute float al; attribute vec3 color; varying float vA; varying vec3 vC; uniform float px; void main(){ vA = al; vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * px * (' + D0.toFixed(1) + ' / -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D map; varying float vA; varying vec3 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC * t.a, t.a * vA); }',
      transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending
    });
    parts = new T.Points(geo, mat); parts.frustumCulled = false; parts.renderOrder = 12; scene.add(parts);
    parts.pool = []; for (var i = 0; i < PN; i++) parts.pool.push({ on: false });
  }
  function spawn(o) {
    for (var i = 0; i < PN; i++) {
      var p = parts.pool[i];
      if (!p.on) {
        p.on = true; p.x = o.x; p.y = o.y; p.z = o.z || 20; p.vx = o.vx || 0; p.vy = o.vy || 0; p.g = o.g || 0; p.drag = o.drag == null ? .6 : o.drag;
        p.life = 0; p.max = o.life || 1; p.s0 = o.s || 8; p.s1 = o.s1 == null ? 0 : o.s1; p.c = o.c || [1, 1, 1]; p.a = o.a == null ? 1 : o.a; p.wob = o.wob || 0; p.ph = Math.random() * 6;
        return p;
      }
    }
  }
  function burst(x, y, n, o) {
    if (reduce) n = Math.ceil(n / 3);
    for (var i = 0; i < n; i++) {
      var a = (o.arc0 == null ? 0 : o.arc0) + Math.random() * (o.arc == null ? Math.PI * 2 : o.arc), sp = (o.sp || 120) * (.4 + Math.random() * .8);
      spawn({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.g == null ? -160 : o.g, drag: o.drag == null ? 1.4 : o.drag, life: (o.life || .7) * (.6 + Math.random() * .6), s: (o.s || 9) * (.6 + Math.random() * .8), c: o.c, a: o.a });
    }
  }
  function updParts(dt) {
    var pos = parts.geometry.attributes.position.array, col = parts.geometry.attributes.color.array, sz = parts.geometry.attributes.size.array, al = parts.geometry.attributes.al.array;
    for (var i = 0; i < PN; i++) {
      var p = parts.pool[i];
      if (!p.on) { al[i] = 0; sz[i] = 0; continue; }
      p.life += dt; if (p.life >= p.max) { p.on = false; al[i] = 0; sz[i] = 0; continue; }
      var k = p.life / p.max;
      p.vy += p.g * dt; var d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d;
      p.x += (p.vx + (p.wob ? Math.sin(clock * 2 + p.ph) * p.wob : 0)) * dt; p.y += p.vy * dt;
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      col[i * 3] = p.c[0]; col[i * 3 + 1] = p.c[1]; col[i * 3 + 2] = p.c[2];
      sz[i] = p.s0 + (p.s1 - p.s0) * k;
      al[i] = p.a * (k < .12 ? k / .12 : 1 - (k - .12) / .88);
    }
    var g = parts.geometry.attributes; g.position.needsUpdate = g.color.needsUpdate = g.size.needsUpdate = g.al.needsUpdate = true;
  }

  /* ---------- mesh genérico aditivo / texto ---------- */
  function glow(map, color, order, add) {
    var m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: map, color: color, transparent: true, depthTest: false, depthWrite: false, blending: add === false ? T.NormalBlending : T.AdditiveBlending, opacity: 0 }));
    m.renderOrder = order; m.visible = false; scene.add(m); return m;
  }
  var liveTexts = [];
  // cancela animações pendentes E remove os textos já criados (senão ficam congelados na cena)
  function clearTweens() { tws.length = 0; liveTexts.slice().forEach(function (m) { m.kill(); }); }
  // texto em textura do tamanho exato da medida (nada é cortado); w/h em px do palco na escala 1
  function textMesh(str, color, px, stroke) {
    var font = '800 ' + px + 'px Montserrat, Poppins, "Hiragino Sans", "Noto Sans JP", sans-serif', pad = 14;
    var mg = mkCanvas(4, 4).getContext('2d'); mg.font = font;
    var cw = Math.ceil(mg.measureText(str).width) + pad * 2, ch = Math.ceil(px * 1.4);
    var c = mkCanvas(cw, ch), g = c.getContext('2d');
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = 9; g.strokeStyle = stroke || 'rgba(10,20,30,.95)'; g.strokeText(str, cw / 2, ch / 2 + 2); g.fillStyle = color; g.fillText(str, cw / 2, ch / 2 + 2);
    var t = canvasTex(c), k = .5;
    var m = new T.Mesh(new T.PlaneGeometry(cw * k, ch * k), new T.MeshBasicMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false }));
    m.renderOrder = 18; scene.add(m); m.userData.w = cw * k; m.userData.h = ch * k; liveTexts.push(m);
    m.kill = function () { var i = liveTexts.indexOf(m); if (i >= 0) liveTexts.splice(i, 1); scene.remove(m); t.dispose(); m.material.dispose(); m.geometry.dispose(); };
    return m;
  }
  // limite seguro do palco: abaixo do balão da palavra, acima das barras, dentro das laterais
  function safeBox() {
    var top = H / 2 - 8, bub = stageEl && stageEl.querySelector('.bubble');
    if (bub) { var sr = stageEl.getBoundingClientRect(), br = bub.getBoundingClientRect(); top = H / 2 - (br.bottom - sr.top) - 6; }
    return { l: -W / 2 + 6, r: W / 2 - 6, t: top, b: -H / 2 + 44 };
  }
  var RISE = 26;
  // um único bloco de dano: número + (se crítico) "CRÍTICO!" empilhado acima, sempre dentro do palco
  function damagePop(x, y, num, col, crit, delay) {
    var n = textMesh(num, col, 52), lab = crit ? textMesh('CRÍTICO!', '#ffb13b', 34) : null, sN = crit ? 1.1 : .9, sL = .95;
    var wN = n.userData.w * sN, hN = n.userData.h * sN, wL = lab ? lab.userData.w * sL : 0, hL = lab ? lab.userData.h * sL : 0;
    var half = Math.max(wN, wL) / 2, box = safeBox();
    x = clamp(x, box.l + half, box.r - half);
    var gap = lab ? 2 : 0, total = hN + (lab ? hL + gap : 0);
    // y = centro do número; o bloco (com a subida da animação) precisa caber entre box.b e box.t
    var yMaxNum = box.t - RISE - (lab ? hL + gap : 0) - hN / 2, yMinNum = box.b + hN / 2;
    y = clamp(y, yMinNum, Math.max(yMinNum, yMaxNum));
    [n, lab].forEach(function (m) { if (m) { m.scale.setScalar(.01); m.material.opacity = 0; m.position.z = 0; m.renderOrder = 19; } });
    tw(delay || 0, 1.05, function (p) {
      var rise = RISE * ease.out(p), pop = p < .18 ? ease.back(p / .18) : 1, op = p < .7 ? 1 : 1 - (p - .7) / .3;
      n.scale.setScalar(sN * pop); n.position.set(x, y + rise, 0); n.material.opacity = op;
      if (lab) { lab.scale.setScalar(sL * pop); lab.position.set(x, y + rise + hN / 2 + gap + hL / 2, 0); lab.material.opacity = op; }
    }, null, function () { n.kill(); if (lab) lab.kill(); });
  }
  // letras da palavra que o monstro "vira": poucas, saem de dentro do corpo, sobem pouco e ficam atrás do número
  function letterFx(word, x, y, w, down) {
    var first = String(word || '').replace(/[^\p{L}\p{N}\s]/gu, '').trim().split(/\s+/).sort(function (a, b) { return b.length - a.length; })[0] || '';
    var chars = Array.from(first).slice(0, 8), box = safeBox();
    chars.forEach(function (ch, i) {
      var m = textMesh(ch, '#ffe9a8', 64, 'rgba(60,30,0,.9)'), half = m.userData.w * .55 / 2;
      var sx0 = clamp(x + (i - (chars.length - 1) / 2) * w * .16, box.l + half, box.r - half), sy0 = y + w * .12, dx = (Math.random() - .5) * 24, rot = (Math.random() - .5) * .6;
      var ymax = box.t - 6;
      m.scale.setScalar(.01); m.material.opacity = 0; m.renderOrder = 17;
      tw(.85 + i * .06, 1.2, function (p) {
        m.position.set(sx0 + dx * p, Math.min(sy0 + 30 * ease.out(p), ymax), 0); m.rotation.z = rot * p;
        m.scale.setScalar(.55 * (p < .15 ? ease.back(p / .15) : 1));
        m.material.opacity = (p < .6 ? 1 : 1 - (p - .6) / .4) * .9;
      }, null, function () { m.kill(); });
    });
  }

  /* ---------- montagem da cena ---------- */
  function init() {
    if (renderer) return FX.supported;
    try {
      canvas = document.createElement('canvas'); canvas.className = 'fx3d'; canvas.setAttribute('aria-hidden', 'true');
      renderer = new T.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    } catch (e) { renderer = null; FX.supported = false; return false; }
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(FXV.fov, 1, 1, 3000);
    makeProcTex();

    bg = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false }));
    bg.renderOrder = 0; bg.visible = false; scene.add(bg);
    fogA = glow(texSoft, new T.Color(.45, .6, .7), 1); fogB = glow(texSoft, new T.Color(.55, .5, .7), 1);
    shHero = glow(texSoft, new T.Color(0, 0, 0), 2, false); shFoe = glow(texSoft, new T.Color(0, 0, 0), 2, false);
    aura = glow(texSoft, new T.Color(1, .4, 1), 3); glowFoe = glow(texSoft, new T.Color(1, .9, .6), 11);
    foe = new Ent(0, 5); hero = new Ent(0, 6);
    foe.breath = .02; foe.bob = 2.5; hero.breath = .018; hero.bob = 0;
    for (var i = 0; i < 3; i++) { var gh = new Ent(-1, 4); gh.mat.uniforms.tint.value.setRGB(.4, .9, 1); gh.mat.uniforms.alpha.value = 0; ghosts.push(gh); }
    makeParts();
    rays = glow(texRays, new T.Color(1, .85, .45), 10); ring = glow(texRing, new T.Color(1, .95, .7), 11);
    slash = new T.Mesh(new T.PlaneGeometry(1, 1), new T.ShaderMaterial({
      uniforms: { map: { value: texSlash }, reveal: { value: 0 }, fade: { value: 0 }, col: { value: new T.Color(.7, 1, .95) } },
      vertexShader: VS, transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending,
      fragmentShader: 'uniform sampler2D map; uniform float reveal; uniform float fade; uniform vec3 col; varying vec2 vUv; void main(){ vec4 t = texture2D(map, vUv); float head = step(vUv.x, reveal); float tail = clamp((vUv.x - (reveal - .65)) / .65, 0.0, 1.0); gl_FragColor = vec4(col * (1.0 + t.a), t.a * head * tail * fade); }'
    }));
    slash.renderOrder = 13; slash.visible = false; scene.add(slash);
    overlay = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: T.AdditiveBlending }));
    overlay.renderOrder = 20; scene.add(overlay);
    vig = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: 0xff2040, map: vigTex(), transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
    vig.renderOrder = 21; scene.add(vig);
    FX.supported = true;
    return true;
  }
  var rays, ring, slash;
  function vigTex() {
    var c = mkCanvas(128, 128), g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 20, 64, 64, 90);
    r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    return canvasTex(c);
  }

  function resize() {
    var r = stageEl.getBoundingClientRect(), w = Math.max(50, Math.round(r.width)), h = Math.max(50, Math.round(r.height));
    if (w === W && h === H) return;
    W = w; H = h;
    renderer.setSize(W, H, false); canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    camera.aspect = W / H; D0 = (H / 2) / Math.tan(FXV.fov * Math.PI / 360); camera.position.set(0, 0, D0); camera.updateProjectionMatrix();
    parts.material.uniforms.px.value = renderer.getPixelRatio();
    overlay.scale.set(W * 2, H * 2, 1); vig.scale.set(W * 1.02, H * 1.02, 1); vig.position.z = 0;
  }

  // posições dos personagens vêm do layout HTML (nome = linha dos pés)
  function measure() {
    var sr = stageEl.getBoundingClientRect(), out = {};
    ['hero', 'foe'].forEach(function (k) {
      var f = stageEl.querySelector('.f-' + k), n = f && f.querySelector('.f-name');
      if (!f || !n) return;
      var fr = f.getBoundingClientRect(), nr = n.getBoundingClientRect();
      var a = k === 'hero' ? f.querySelector('.himg') : f.querySelector('.f-art .spr, .f-art');
      var ar = a ? a.getBoundingClientRect() : fr;
      out[k] = { x: fr.left + fr.width / 2 - sr.left - W / 2, y: H / 2 - (nr.top - sr.top) + 3, w: ar.width, h: ar.height };
    });
    return out;
  }

  function layout() {
    var m = measure(), boss = S.kind === 'boss', kS = boss ? 1.28 : (S.kind === 'chest' ? 1.0 : 1.2);
    if (m.hero) { hero.bx = m.hero.x; hero.by = m.hero.y; hero.box = { w: m.hero.w || 84, h: 999 }; hero.fit = 'width'; hero.refit(); }
    if (m.foe) { foe.bx = m.foe.x; foe.by = m.foe.y; foe.box = { w: (m.foe.w || 72) * kS, h: (m.foe.h || 72) * kS }; foe.refit(); }
    var d = D0 + 260; bg.position.set(0, 0, -260);
    var cover = Math.max(W / H, 1.5), sc = (d / D0) * 1.12; // sobra para o parallax
    var bh = H * sc, bw = bh * (bg.aspect || 1.5);
    if (bw < W * sc) { bw = W * sc; bh = bw / (bg.aspect || 1.5); }
    bg.scale.set(bw, bh, 1);
    fogA.scale.set(W * 1.3, H * .7, 1); fogB.scale.set(W * 1.1, H * .6, 1);
    fogA.position.set(0, -H * .22, -120); fogB.position.set(0, -H * .12, -60);
    shHero.position.set(hero.bx, hero.by + 1, 0); shFoe.position.set(foe.bx, foe.by + 1, 0);
    shHero.scale.set(hero.w * .85, hero.w * .22, 1); shFoe.scale.set(foe.w * .95, foe.w * .24, 1);
    aura.position.set(foe.bx, foe.by + foe.h * .5, -2); aura.scale.set(foe.w * 2.1, foe.w * 2.1, 1);
    glowFoe.position.set(foe.bx, foe.by + foe.h * .5, 30);
  }

  function setBg(url, kind) {
    if (S.bgUrl === url) return;
    S.bgUrl = url;
    loadTex(url, function (t) {
      if (S.bgUrl !== url) return;
      bg.material.map = t; bg.material.needsUpdate = true; bg.aspect = t.image.width / t.image.height; bg.visible = true; layout();
    });
  }

  /* ---------- coreografia ---------- */
  function shake(a) { if (!reduce) shakeAmp = Math.max(shakeAmp, a); }
  function pulseFlash(col, a, dur) { flashCol.set(col); flashA = a; tw(0, dur, function (p) { flashA = a * (1 - p); }); }
  function stop(sec) { if (!reduce) stopUntil = Math.max(stopUntil, last + sec); }
  function slow(sec, sc) { if (!reduce) { slowUntil = Math.max(slowUntil, last + sec); slowScale = sc || FXV.slowScale; } }
  function foeCenter() { return { x: foe.bx, y: foe.by + foe.h * .5 }; }

  function hitFoe(crit, dmg) {
    var c = foeCenter(), col = crit ? [1, .85, .35] : [.55, 1, .9];
    foe.mat.uniforms.flashCol.value.setRGB(1, 1, 1);
    tw(0, FXV.flash, function (p) { foe.mat.uniforms.flash.value = 1 - p; }, ease.out);
    tw(0, .45, function (p) { var k = Math.sin(p * Math.PI); foe.ox = k * (crit ? 22 : 12); foe.sx = 1 - k * .14; foe.sy = 1 + k * .1; foe.rot = k * .16; }, null, function () { foe.ox = foe.rot = 0; foe.sx = foe.sy = 1; });
    glowFoe.visible = true; glowFoe.material.color.setRGB(col[0], col[1], col[2]); glowFoe.position.x = c.x; glowFoe.position.y = c.y;
    var gs = foe.w * (crit ? 2.6 : 1.8);
    tw(0, .3, function (p) { glowFoe.material.opacity = (1 - p) * .95; glowFoe.scale.set(gs * (.4 + p), gs * (.4 + p), 1); }, ease.out, function () { glowFoe.visible = false; });
    burst(c.x, c.y, crit ? 38 : 16, { c: col, sp: crit ? 230 : 150, s: crit ? 11 : 8, life: .65 });
    shake(crit ? FXV.shakeCrit : FXV.shake); stop(FXV.hitStop);
    if (crit) {
      slow(FXV.slowCrit, FXV.slowScale); pulseFlash(0xffd45a, .32, .28);
      ring.visible = true; ring.material.color.setRGB(1, .9, .5);
      tw(0, .5, function (p) { ring.position.set(c.x, c.y, 35); var s = foe.w * (.6 + p * 2.6); ring.scale.set(s, s, 1); ring.material.opacity = (1 - p) * .9; }, ease.out, function () { ring.visible = false; });
      if (!reduce) tw(0, .6, function (p) { zoom = FXV.zoomCrit * Math.sin(p * Math.PI) * (1 - p * .3); }, null, function () { zoom = 0; });
    }
    damagePop(c.x, c.y + foe.h * .3, '−' + (dmg || 1), crit ? '#ffd45a' : '#ffffff', crit, 0);
  }

  function doSlash(crit) {
    var c = foeCenter(), s = foe.w * (crit ? 2.5 : 2.0);
    slash.visible = true; slash.position.set(c.x - 6, c.y + 6, 36); slash.scale.set(s, s * .5, 1); slash.rotation.z = -.5;
    slash.material.uniforms.col.value.setRGB(crit ? 1 : .6, crit ? .85 : 1, crit ? .4 : .95);
    tw(0, .26, function (p) { slash.material.uniforms.reveal.value = 1.05 * p; slash.material.uniforms.fade.value = p < .6 ? 1 : 1 - (p - .6) / .4; }, ease.out, function () { slash.visible = false; });
  }

  function ghostTrail(x0, x1, y, dur) {
    ghosts.forEach(function (g, i) {
      g.set(hero.url); g.fit = 'width'; g.box = hero.box; g.aspect = hero.aspect; g.refit(); g.idle = false;
      tw(i * dur * .22, .3, function (p) { g.bx = x0 + (x1 - x0) * clamp(p * .6 + i * .12, 0, 1) * .85; g.by = y; g.mat.uniforms.alpha.value = .4 * (1 - p); g.m.visible = true; g.apply(0); }, null, function () { g.mat.uniforms.alpha.value = 0; g.m.visible = false; });
    });
  }

  function playAttack(res) {
    var crit = !!res.crit, x0 = hero.bx, x1 = foe.bx - (foe.w * .5 + hero.w * .35);
    hero.set(S.cfg.hero.attack); hero.idle = false;
    if (reduce) { at(.05, function () { hitFoe(crit, 1); doSlash(crit); }); at(.5, function () { hero.set(S.cfg.hero.idle); hero.idle = true; }); return; }
    ghostTrail(x0, x1, hero.by, FXV.dash);
    tw(0, FXV.dash, function (p) { hero.ox = (x1 - x0) * p; hero.rot = -.12 * p; hero.sx = 1 + .1 * p; hero.sy = 1 - .06 * p; }, ease.out);
    at(FXV.dash, function () { doSlash(crit); hitFoe(crit, 1); });
    tw(FXV.dash + .14, FXV.back, function (p) { hero.ox = (x1 - x0) * (1 - p); hero.rot = -.12 * (1 - p); hero.sx = 1 + .1 * (1 - p); hero.sy = 1 - .06 * (1 - p); }, ease.io, function () {
      hero.ox = hero.rot = 0; hero.sx = hero.sy = 1; hero.set(S.cfg.hero.idle); hero.idle = true;
    });
  }

  function playHurt(res) {
    var dmg = res.dmg || 1, hx = hero.bx, c = { x: hero.bx, y: hero.by + hero.h * .55 };
    hero.set(S.cfg.hero.hurt); hero.idle = false;
    var lunge = reduce ? 0 : 1, fx0 = foe.ox;
    if (lunge) tw(0, .2, function (p) { foe.ox = -(hero.bx < foe.bx ? (foe.bx - hero.bx) * .55 : 0) * p; foe.sx = 1 + .12 * p; foe.sy = 1 - .08 * p; }, ease.out);
    at(lunge ? .2 : .02, function () {
      hero.mat.uniforms.flashCol.value.setRGB(1, .15, .2);
      tw(0, .3, function (p) { hero.mat.uniforms.flash.value = .55 * (1 - p); });
      tw(0, .5, function (p) { var k = Math.sin(p * Math.PI); hero.ox = -k * 16; hero.rot = k * .22; hero.sy = 1 - k * .07; }, null, function () { hero.ox = hero.rot = 0; hero.sy = 1; });
      burst(c.x, c.y, 14, { c: [1, .3, .35], sp: 120, s: 8, life: .55 });
      shake(FXV.shakeHurt); stop(.06); vigA = .75; tw(0, .6, function (p) { vigA = .75 * (1 - p); });
      damagePop(c.x + hero.w * .7, hero.by + hero.h * .8, '−' + dmg, '#ff5a6c', false, 0);
    });
    if (lunge) tw(.42, .38, function (p) { foe.ox = foe.ox * (1 - p); foe.sx = 1 + .12 * (1 - p); foe.sy = 1 - .08 * (1 - p); }, ease.io, function () { foe.ox = 0; foe.sx = foe.sy = 1; });
    if (res.heroDown) {
      tw(.5, .7, function (p) { hero.rot = .22 * (1 - p) - 1.25 * p; hero.oy = -hero.h * .12 * p; hero.mat.uniforms.alpha.value = 1 - .35 * p; }, ease.out, function () { hero.idle = false; });
    } else {
      at(.8, function () { hero.set(S.cfg.hero.idle); hero.idle = true; });
    }
  }

  function dissolveFoe(boss, word) {
    var c = foeCenter(), dur = boss ? FXV.bossDissolve : FXV.dissolve, col = S.cfg.fx === 'fire' ? [1, .45, .15] : (S.cfg.fx === 'boss' ? [.9, .4, 1] : [.6, 1, .8]);
    foe.idle = false; foe.mat.uniforms.edgeCol.value.setRGB(col[0], col[1], col[2]);
    var delay = reduce ? 0 : .38;
    if (reduce) { tw(0, .5, function (p) { foe.mat.uniforms.alpha.value = 1 - p; }, null, function () { foe.m.visible = false; }); return; }
    tw(delay, dur, function (p) {
      foe.mat.uniforms.dis.value = p * 1.02; shFoe.material.opacity = .5 * (1 - p); aura.material.opacity *= (1 - p);
      if (Math.random() < .8) burst(foe.bx + (Math.random() - .5) * foe.w * .8, foe.by + p * foe.h * .9, 1, { c: col, sp: 40, g: 70, s: 9, life: .9, arc0: Math.PI * .25, arc: Math.PI * .5 });
    }, ease.io, function () { foe.m.visible = false; S.foeDown = true; });
    at(delay, function () { letterFx(word, c.x, foe.by, foe.w, true); });
    if (boss) { at(delay + dur * .6, function () { pulseFlash(0xffffff, .35, .5); shake(FXV.shake * .8); }); }
  }

  function playChestOpen() {
    var c = foeCenter();
    foe.idle = false; S.opened = true;
    tw(0, .5, function (p) { foe.ox = Math.sin(p * 38) * 4 * (1 - p); foe.sy = 1 + .12 * Math.sin(p * Math.PI); }, null, function () { foe.ox = 0; foe.sy = 1; });
    at(.38, function () {
      pulseFlash(0xffe38a, .28, .5); shake(FXV.shake * .6);
      rays.visible = true;
      tw(0, 1.5, function (p) { rays.position.set(c.x, c.y + 4, 8); var s = foe.w * (1.2 + 2.6 * ease.out(Math.min(1, p * 1.4))); rays.scale.set(s, s, 1); rays.rotation.z = p * 1.2; rays.material.opacity = p < .2 ? p / .2 : Math.max(0, 1 - (p - .2) / .8) * .95; }, null, function () { rays.visible = false; });
      burst(c.x, c.y + 10, 46, { c: [1, .85, .35], sp: 190, g: -120, s: 10, life: 1.1, arc0: 0, arc: Math.PI });
      burst(c.x, c.y + 10, 20, { c: [1, 1, .85], sp: 90, g: 20, s: 7, life: 1.3 });
      glowFoe.visible = true; glowFoe.material.color.setRGB(1, .88, .45); glowFoe.position.set(c.x, c.y + 6, 30);
      var gs = foe.w * 3;
      tw(0, .9, function (p) { glowFoe.material.opacity = (1 - p) * .8; glowFoe.scale.set(gs * (.5 + p * .6), gs * (.5 + p * .6), 1); }, ease.out, function () { glowFoe.visible = false; });
    });
    at(.1, function () { hero.set(S.cfg.hero.attack); hero.idle = false; });
    at(.75, function () { hero.set(S.cfg.hero.idle); hero.idle = true; });
  }

  function playTrap() {
    foe.idle = false;
    tw(0, .5, function (p) { foe.ox = Math.sin(p * 44) * 5 * (1 - p); }, null, function () { foe.ox = 0; foe.idle = true; });
    playHurt({ dmg: S.cfg.res.dmg, heroDown: S.cfg.res.heroDown });
  }

  function playEvent(cfg) {
    var res = cfg.res || {}, boss = cfg.kind === 'boss';
    if (cfg.kind === 'chest') { if (res.correct) playChestOpen(); else playTrap(); return; }
    if (res.correct) {
      playAttack(res);
      if (res.down) dissolveFoe(boss, cfg.word);
    } else playHurt(res);
    if (res.won && !reduce) at(1.9, function () {
      hero.set(S.cfg.hero.idle);
      burst(hero.bx, hero.by + hero.h, 40, { c: [1, .85, .4], sp: 180, g: -140, s: 9, life: 1.3, arc0: Math.PI * .15, arc: Math.PI * .7 });
      tw(0, .7, function (p) { hero.oy = Math.sin(p * Math.PI) * 14; }, null, function () { hero.oy = 0; });
    });
  }

  // estado final de um resultado já visto (re-render depois da animação)
  function settle(cfg) {
    var res = cfg.res || {};
    hero.ox = hero.rot = hero.oy = 0; hero.sx = hero.sy = 1; hero.idle = true; hero.mat.uniforms.flash.value = 0; hero.mat.uniforms.alpha.value = 1;
    foe.ox = foe.rot = 0; foe.sx = foe.sy = 1; foe.mat.uniforms.flash.value = 0;
    hero.set(!res.correct && cfg.kind !== 'chest' || (cfg.kind === 'chest' && res.trap) ? cfg.hero.hurt : cfg.hero.idle);
    if (res.heroDown) { hero.rot = -1.25; hero.oy = -hero.h * .12; hero.mat.uniforms.alpha.value = .65; hero.idle = false; }
    if (res.down) { foe.m.visible = false; foe.mat.uniforms.dis.value = 1; shFoe.material.opacity = 0; aura.material.opacity = 0; }
  }

  function enterScene(cfg) {
    // entrada nova: monstro cai com quique, herói desliza
    clearTweens(); ghosts.forEach(function (g) { g.m.visible = false; });
    S.foeDown = false; S.opened = false;
    foe.mat.uniforms.dis.value = 0; foe.mat.uniforms.alpha.value = 1; foe.mat.uniforms.flash.value = 0; foe.idle = true; foe.ox = foe.oy = foe.rot = 0; foe.sx = foe.sy = 1;
    hero.mat.uniforms.alpha.value = 1; hero.mat.uniforms.flash.value = 0; hero.ox = hero.oy = hero.rot = 0; hero.sx = hero.sy = 1; hero.idle = true;
    shFoe.material.opacity = .55; shHero.material.opacity = .5;
    var ac = cfg.fx === 'boss' ? [.85, .35, 1] : cfg.fx === 'fire' ? [1, .5, .2] : null;
    if (ac) aura.material.color.setRGB(ac[0], ac[1], ac[2]);
    aura.visible = !!ac; S.auraOn = !!ac;
    if (reduce) return;
    if (cfg.kind === 'chest') {
      tw(0, .5, function (p) { var k = ease.back(p); foe.sx = foe.sy = .3 + .7 * k; foe.mat.uniforms.alpha.value = clamp(p * 3, 0, 1); }, null, function () { foe.sx = foe.sy = 1; });
    } else {
      tw(0, .55, function (p) { foe.oy = (1 - ease.bounce(p)) * (H * .55); foe.mat.uniforms.alpha.value = clamp(p * 4, 0, 1); }, null, function () { foe.oy = 0; });
      at(.5, function () { shake(3); burst(foe.bx, foe.by, 10, { c: [.8, .8, .8], sp: 70, g: -20, s: 10, life: .6, arc0: 0, arc: Math.PI, a: .5 }); });
    }
    tw(0, .6, function (p) { hero.ox = -30 * (1 - ease.out(p)); hero.mat.uniforms.alpha.value = clamp(p * 3, 0, 1); }, null, function () { hero.ox = 0; });
  }

  /* ---------- ambiente ---------- */
  var ambT = 0;
  function ambient(dt) {
    ambT += dt;
    var rate = reduce ? .08 : (S.kind === 'chest' ? .12 : .09);
    if (ambT > rate) {
      ambT = 0;
      var x = (Math.random() - .5) * W, y = -H * .35 + Math.random() * H * .6, k = S.kind;
      if (S.cfg && S.cfg.fx === 'fire' && foe.m.visible) spawn({ x: foe.bx + (Math.random() - .5) * foe.w * .7, y: foe.by + foe.h * .25, vx: 0, vy: 26 + Math.random() * 34, g: 4, drag: .2, life: 1.3, s: 7, c: [1, .5, .15], wob: 8, a: .85 });
      else if (S.cfg && S.cfg.fx === 'boss' && foe.m.visible) spawn({ x: foe.bx + (Math.random() - .5) * foe.w, y: foe.by + Math.random() * foe.h * .7, vx: 0, vy: 16 + Math.random() * 20, g: 0, drag: .1, life: 1.6, s: 8, c: [.9, .4, 1], wob: 10, a: .7 });
      spawn({ x: x, y: y, z: -40 + Math.random() * 120, vx: (Math.random() - .5) * 6, vy: 4 + Math.random() * 10, g: 0, drag: 0, life: 4 + Math.random() * 3, s: 4 + Math.random() * 4, c: k === 'chest' ? [1, .85, .4] : (Math.random() < .5 ? [.6, 1, .85] : [1, .92, .55]), wob: 9, a: .55 });
    }
  }

  /* ---------- laço ---------- */
  function frame(now) {
    raf = 0;
    if (!stageEl || !canvas.isConnected || document.hidden) { FX.active = false; return; }
    raf = root.requestAnimationFrame(frame);
    var real = now / 1000, dt = Math.min(.05, real - (last || real)); last = real;
    var target = real < stopUntil ? 0 : (real < slowUntil ? slowScale : 1);
    ts += (target - ts) * Math.min(1, dt * (target < ts ? 40 : 7)); if (Math.abs(target - ts) < .01) ts = target;
    var gdt = dt * ts * FX.speed; clock += gdt;

    for (var i = tws.length - 1; i >= 0; i--) {
      var o = tws[i];
      if (clock < o.t0) continue;
      var p = clamp((clock - o.t0) / o.t, 0, 1);
      o.f(o.e(p), p); o.on = true;
      if (p >= 1) { tws.splice(i, 1); if (o.done) o.done(); }
    }

    var t = clock;
    // câmera: parallax suave + tremor + zoom
    var sw = reduce ? 0 : FXV.parallax;
    var sx = 0, sy = 0; if (shakeAmp > .05) { sx = (Math.random() - .5) * 2 * shakeAmp; sy = (Math.random() - .5) * 2 * shakeAmp; shakeAmp *= Math.pow(.0009, dt); } else shakeAmp = 0;
    camera.position.set(Math.sin(t * .35) * sw + sx, Math.cos(t * .27) * sw * .35 + sy, D0 * (1 - zoom));
    camera.lookAt(sx * .3, sy * .3, 0);

    // luz da tocha (tremeluz) e névoa
    var fl = reduce ? 1 : 1 + Math.sin(t * 9) * .02 + Math.sin(t * 23) * .015;
    var cb = (S.kind === 'boss' ? .86 : .92) * fl + flashA * .2; bg.material.color.setRGB(cb, cb * .98, cb * 1.02);
    fogA.visible = fogB.visible = true; fogA.material.opacity = .13; fogB.material.opacity = .1;
    fogA.position.x = Math.sin(t * .12) * W * .18; fogB.position.x = Math.cos(t * .09) * W * .22;
    if (S.auraOn && !S.foeDown && foe.m.visible) { aura.visible = true; aura.material.opacity = .32 + Math.sin(t * 2.4) * .1; } else if (S.foeDown) aura.visible = false;
    shHero.material.opacity = .5 * (hero.mat.uniforms.alpha.value); shHero.visible = true; shFoe.visible = foe.m.visible || shFoe.material.opacity > 0.01;
    shHero.material.color.setRGB(0, 0, 0); shFoe.material.color.setRGB(0, 0, 0);

    foe.apply(t); hero.apply(t);
    shFoe.position.x = foe.bx + foe.ox * .5; shHero.position.x = hero.bx + hero.ox * .7;
    // brilho rápido na borda enquanto o golpe aterrissa
    overlay.material.color.copy(flashCol); overlay.material.opacity = flashA; overlay.position.set(camera.position.x * .0, 0, 60);
    vig.material.opacity = vigA * .85; vig.position.set(0, 0, 61);
    ambient(gdt); updParts(gdt);
    renderer.render(scene, camera);
  }

  /* ---------- API ---------- */
  FX.mount = function (el, cfg) {
    if (!init()) return false;
    stageEl = el; S.cfg = cfg; S.kind = cfg.kind;
    if (canvas.parentNode !== el) el.insertBefore(canvas, el.firstChild);
    el.classList.add('gl');
    resize(); setBg(cfg.bg, cfg.kind);
    var newScene = S.scene !== cfg.scene;
    // hero
    hero.fit = 'width';
    if (newScene || !hero.url) hero.set(cfg.hero.idle);
    foe.flip = cfg.foeFlip ? -1 : 1;
    if (cfg.foe) { foe.set(cfg.foe); } else { foe.set(null); }
    if (cfg.foe && S.foeUrl !== cfg.foe) { S.foeUrl = cfg.foe; if (!newScene) { /* troca de monstro dentro da sala não acontece */ } }
    layout();
    if (newScene) {
      S.scene = cfg.scene; S.ev = null; enterScene(cfg);
      if (cfg.evKey) { S.ev = cfg.evKey; settle(cfg); }
    } else if (cfg.evKey && S.ev !== cfg.evKey) {
      S.ev = cfg.evKey; playEvent(cfg);
    } else if (!cfg.evKey && S.ev) {
      // nova pergunta na mesma sala: volta ao estado de espera
      S.ev = null; clearTweens(); ghosts.forEach(function (g) { g.m.visible = false; });
      hero.set(cfg.hero.idle); hero.idle = true; hero.ox = hero.oy = hero.rot = 0; hero.sx = hero.sy = 1; hero.mat.uniforms.alpha.value = 1; hero.mat.uniforms.flash.value = 0;
      foe.ox = foe.rot = 0; foe.sx = foe.sy = 1; foe.idle = true;
    } else if (cfg.evKey && S.ev === cfg.evKey && !tws.length) {
      settle(cfg);
    }
    // sem arte: mantém o desenho HTML desse lutador
    el.classList.toggle('gl-nofoe', !cfg.foe);
    FX.active = true;
    if (!raf) { last = 0; raf = root.requestAnimationFrame(frame); }
    return true;
  };
  FX.pause = function () { if (raf) { root.cancelAnimationFrame(raf); raf = 0; } FX.active = false; };
  FX.resize = function () { if (stageEl && renderer) { W = 0; resize(); layout(); } };
  FX.values = FXV;
  FX.dbg = function () { return { texts: liveTexts.length, hero: [hero.w, hero.h, hero.aspect, hero.m.scale.x, hero.m.scale.y], g: ghosts.map(function (g) { return [g.w, g.h, g.aspect, g.m.scale.x, g.m.scale.y, g.bx, g.by]; }), hb: [hero.bx, hero.by] }; };
  root.addEventListener('resize', function () { FX.resize(); });
  root.addEventListener('visibilitychange', function () { if (!document.hidden && stageEl && canvas && canvas.isConnected && !raf) { last = 0; raf = root.requestAnimationFrame(frame); } });
})(window);
