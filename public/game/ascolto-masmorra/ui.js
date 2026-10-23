/*
  Ascolto Masmorra: TELA (DOM, voz, armazenamento local)
  Só aqui existe HTML, voz e localStorage. Ao migrar para Next.js, estas
  partes viram componentes React + um "adaptador" de armazenamento
  (trocar load()/save() por leitura/gravação no Supabase).
*/
(function () {
  'use strict';

  var D = window.ASCOLTO_DATA;
  if (!D || !window.AscoltoEngine) {
    var be = document.getElementById('boot-error');
    if (be) be.hidden = false;
    return;
  }
  var E = window.AscoltoEngine.create(D);
  var $ = function (id) { return document.getElementById(id); };

  var LANGS = D.languages, LANG_BY = {};
  LANGS.forEach(function (l) { LANG_BY[l.id] = l; });
  var RAR = {};
  D.rarities.forEach(function (r) { RAR[r.id] = r; });
  var GENDER = { m: 'masculino', f: 'feminino', n: 'neutro' };
  var GEAR_N = D.gear.length;

  /* ---------- armazenamento (adaptador) ---------- */

  var KEY = 'ascolto-masmorra-v2';
  var storeOk = true;

  function load() {
    try {
      var s = window.localStorage.getItem(KEY);
      if (s) {
        var o = JSON.parse(s);
        if (o && o.v === 1 && o.langs) return o;
      }
    } catch (e) { storeOk = false; }
    return E.newState();
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { storeOk = false; }
  }

  var state = load();
  if (!state.lang || !LANG_BY[state.lang]) state.lang = 'it';

  // protótipo: o cabeçalho (vidas, turno, idioma) fica escondido; use ?hud=1 na URL para vê-lo
  try { if (!/[?&]hud=1/.test(location.search)) document.body.classList.add('no-hud'); } catch (e) { document.body.classList.add('no-hud'); }
  var ui = {
    tab: 'map', filter: 'all', flipped: {}, picked: null, monPt: false, slot: null,
    speak: { phase: 'idle', heard: '', msg: '', noMic: false }, endSeen: null,
    qKey: '', t0: Date.now(), equipKey: ''
  };

  /* ---------- helpers ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function capFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  // Nome no idioma: artigo colorido pelo gênero (it/de) ou kanji com leitura (ja)
  function nameHtml(e, lang, cap) {
    var n = e.names[lang];
    if (lang === 'ja') {
      return n.kanji
        ? '<ruby class="ja">' + esc(n.kanji) + '<rt>' + esc(n.kana) + '</rt></ruby>'
        : '<span class="ja">' + esc(n.kana) + '</span>';
    }
    var sp = /['’]$/.test(n.article) ? '' : ' ';
    var art = cap ? capFirst(n.article) : n.article;
    return '<span class="art g-' + n.gender + '" title="' + GENDER[n.gender] + '">' + esc(art) + '</span>' + sp +
      '<span class="w">' + esc(n.word) + '</span>';
  }
  function romajiHtml(e, lang) {
    return lang === 'ja' ? '<span class="romaji">' + esc(e.names.ja.romaji) + '</span>' : '';
  }
  function kanaLine(e, lang) {
    if (lang !== 'ja') return '';
    var n = e.names.ja;
    return '<span class="romaji">' + (n.kanji ? esc(n.kana) + ' · ' : '') + esc(n.romaji) + '</span>';
  }
  function rubyize(s) {
    return esc(s).replace(/([一-鿿々]+)《([^》]+)》/g, '<ruby>$1<rt>$2</rt></ruby>');
  }

  var toastTimer = null;
  function toast(msg) {
    if (!msg) return;
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  function curRun() { return E.langState(state, state.lang).run; }

  /* ---------- voz: ouvir (síntese) e falar (reconhecimento) ---------- */

  var synth = ('speechSynthesis' in window) ? window.speechSynthesis : null;
  function voicesFor(lang) {
    if (!synth) return [];
    var p = LANG_BY[lang].tag.slice(0, 2).toLowerCase();
    return synth.getVoices().filter(function (v) {
      return (v.lang || '').toLowerCase().replace('_', '-').indexOf(p) === 0;
    });
  }
  function audioOk(lang) {
    if (!synth) return false;
    if (!synth.getVoices().length) return true; // vozes ainda carregando
    return voicesFor(lang).length > 0;
  }
  function say(text, lang) {
    if (!synth || !text) return;
    try {
      synth.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = LANG_BY[lang].tag;
      var v = voicesFor(lang);
      if (v.length) u.voice = v[0];
      u.rate = 0.85;
      synth.speak(u);
    } catch (e) { /* sem voz: segue o jogo */ }
  }
  function sayItem(id) {
    var it = E.itemById(id);
    if (it && E.isUnlocked(state, state.lang, id)) say(E.speakText(it, state.lang), state.lang);
  }
  function syncEnv() { E.env.audio = audioOk(state.lang); }
  if (synth) {
    try { synth.onvoiceschanged = function () { syncEnv(); }; } catch (e) { /* ok */ }
  }

  var SRClass = window.SpeechRecognition || window.webkitSpeechRecognition || null;

  function resetSpeak() { ui.speak = { phase: 'idle', heard: '', msg: '', noMic: ui.speak.noMic }; }

  function startListening() {
    var lang = state.lang, run = curRun();
    var item = E.itemById(run.enc.q.itemId);
    if (!SRClass) { ui.speak.noMic = true; ui.speak.msg = 'Este aparelho não tem reconhecimento de voz. Fale em voz alta e confira a resposta.'; renderQuiz(); return; }
    var rec, done = false;
    function fail(msg, noMic) {
      if (done) return;
      done = true;
      ui.speak.phase = 'idle';
      ui.speak.msg = msg;
      if (noMic) ui.speak.noMic = true;
      renderQuiz();
    }
    try {
      rec = new SRClass();
      rec.lang = LANG_BY[lang].tag;
      rec.interimResults = false;
      rec.maxAlternatives = 3;
      rec.continuous = false;
      rec.onresult = function (ev) {
        if (done) return;
        done = true;
        var alts = [], r = ev.results[0];
        for (var i = 0; i < r.length; i++) alts.push(r[i].transcript);
        ui.speak.heard = alts[0] || '';
        var ok = E.matchSpoken(item, lang, alts);
        doAnswer(ok, ok ? 3 : 1, false);
      };
      rec.onerror = function (ev) {
        var c = ev && ev.error;
        if (c === 'no-speech' || c === 'aborted') fail('Não ouvi nada. Tente de novo.', false);
        else fail('O microfone não está liberado aqui. Fale em voz alta, toque em "Ver resposta" e confira você mesmo.', true);
      };
      rec.onend = function () { fail('Não ouvi nada. Tente de novo.', false); };
      ui.speak.phase = 'listening';
      ui.speak.msg = '';
      renderQuiz();
      rec.start();
    } catch (e) {
      fail('O microfone não está liberado aqui. Fale em voz alta, toque em "Ver resposta" e confira você mesmo.', true);
    }
  }

  /* ---------- arte: herói e ícones (sprites) ---------- */

  // sprite se houver, senão o emoji de reserva
  function ico(o) {
    return o && o.img ? '<img class="spr" src="' + esc(o.img) + '" alt="" draggable="false">' : esc((o && o.emoji) || '');
  }

  // O herói é um sprite completo: a evolução aparece no brilho dele, na faixa de peças e na cena de equipar.
  // O herói evolui: quanto mais peças equipadas, mais o sprite fica completo (8 estágios, 0 a 7 peças).
  // Sem peças, usa as poses do herói (ataque, dano, vitória). Com peças, o mesmo estágio faz todas as poses (a animação vem do CSS).
  function heroSrc(pose, run) {
    var g = run ? Object.keys(run.gear).length : 0;
    if (g <= 0) return D.art.hero[pose] || D.art.hero.idle;
    return D.art.heroStages[Math.min(g, D.art.heroStages.length - 1)];
  }
  function heroImg(pose, w, run, cls) {
    var g = run ? Object.keys(run.gear).length : 0;
    return '<img class="himg ' + (cls || '') + '" src="' + heroSrc(pose, run) + '" width="' + w + '" alt="Seu herói, o Escriba, com ' + g + ' peças equipadas" draggable="false" style="filter:drop-shadow(0 3px 4px rgba(0,0,0,.5))">';
  }

  function slotsHtml(gv, interactive) {
    var n = gv.filter(function (s) { return s.equipped; }).length;
    return '<div class="slots" role="list" aria-label="Equipamento: ' + n + ' de ' + gv.length + '">' + gv.map(function (s) {
      return '<button class="slot' + (s.equipped ? ' on rar-' + s.rarity : '') + '" role="listitem" ' +
        (interactive ? 'data-slot="' + s.slot + '"' : 'tabindex="-1"') +
        ' aria-label="' + esc(s.label) + ': ' + (s.equipped ? 'equipado' : 'vazio') + '">' +
        (s.equipped ? ico(s) : '<span class="ghost">' + ico(s) + '</span>') + '</button>';
    }).join('') + '<span class="slots-n">' + n + '/' + gv.length + '</span></div>';
  }

  /* ---------- história no topo ---------- */

  function storyText(sv, lang) {
    return '<span class="sent">' + sv.tokens.map(function (tk) {
      if (tk.t === 'txt') return esc(tk.v);
      var it = E.itemById(tk.id);
      if (!it) return '';
      if (!tk.tl) return esc((tk.art ? tk.art + ' ' : '') + it.pt);
      var cap = /^[A-ZÀ-Ý]/.test(tk.art);
      return '<button class="mixw" data-w="' + tk.id + '">' + nameHtml(it, lang, cap) + '</button>';
    }).join('') + '</span>';
  }

  function storyCard(sv, run, lang, mini) {
    var pct = Math.round(sv.mix * 100);
    return '<section class="story' + (mini ? ' mini' + (ui.loreOpen ? ' open' : '') : '') + '" aria-label="História" style="--rbg:url(' + sv.region.bg + ')">' + (mini ? '<button class="st-toggle" data-act="storytoggle" aria-expanded="' + !!ui.loreOpen + '">' + (ui.loreOpen ? 'recolher ▴' : 'ler tudo ▾') + '</button>' : '') +
      '<div class="st-portrait">' + heroImg('idle', 78, run, 'idle') + '</div>' +
      '<div class="st-body"><div class="st-top">' + esc(sv.region.emoji) + ' ' + esc(sv.chapter) + '</div>' +
      '<h2 class="st-title">' + esc(sv.title) + '</h2>' +
      '<p class="st-text">' + storyText(sv, lang) + '</p>' +
      '<div class="st-mix" title="Palavras da história que o roteiro já liberou"><span class="bar"><i style="width:' + pct + '%"></i></span><span>' + sv.inLang + ' de ' + sv.ofLang + ' palavras da história já em ' + esc(LANG_BY[lang].label) + '</span></div>' +
      '</div></section>';
  }

  /* ---------- curso: simulação de semana/dia e regiões ---------- */

  function renderSim() {
    var lang = state.lang, sm = E.sim(state), plan = E.dayPlan(state, lang), sum = E.summary(state, lang);
    var wv = E.weeksView(state, lang), open = !!ui.simOpen;
    var h = '<div class="sim' + (open ? ' open' : '') + '"><button class="sim-bar" data-act="simtoggle" aria-expanded="' + open + '">' +
      '<span class="sim-t">🧪 Roteiro <em>simulação</em></span>' +
      '<span class="sim-s">Semana <b>' + sm.week + '</b> · Dia <b>' + sm.day + '</b> · 🔓 ' + sum.total + '</span><span class="sim-c" aria-hidden="true">' + (open ? '▴' : '▾') + '</span></button>';
    if (open) {
      h += '<div class="sim-row"><span class="sim-l">Semana</span><div class="seg" role="group" aria-label="Semana atual">' +
        wv.filter(function (w) { return !w.soon; }).map(function (w) {
          return '<button class="sb' + (w.id === sm.week ? ' on' : '') + '" data-simweek="' + w.id + '" aria-pressed="' + (w.id === sm.week) + '">' + w.id + '</button>';
        }).join('') + '</div></div>' +
        '<div class="sim-row"><span class="sim-l">Dia</span><div class="seg" role="group" aria-label="Dia do roteiro">' +
        plan.map(function (d) {
          return '<button class="sb' + (d.day === sm.day ? ' on' : '') + (d.items.length ? ' rel' : '') + '" data-simday="' + d.day + '" aria-pressed="' + (d.day === sm.day) + '">' + d.day + '</button>';
        }).join('') + '</div></div>' +
        '<p class="sim-note">' + (plan[sm.day - 1].items.length ? '📅 Chegam hoje: ' + esc(plan[sm.day - 1].items.join(', ')) + '. ' : '📅 Hoje não chega palavra nova. ') +
        '🔓 ' + sum.total + ' liberadas' + (sum.upcoming ? ' · 🔒 ' + sum.upcoming + ' chegam nos próximos dias' : '') + '.</p>';
    }
    $('simBox').innerHTML = h + '</div>';
    // seletor de dia fixo dentro do mapa pintado
    var pd = $('paintDay');
    if (pd) {
      var cur = plan[sm.day - 1], nw = cur.items.length;
      pd.innerHTML = '<div class="pd-top"><b>Dia</b><div class="pd-seg" role="group" aria-label="Dia do roteiro">' + plan.map(function (d) {
        return '<button class="pd-b' + (d.day === sm.day ? ' on' : '') + (d.items.length ? ' rel' : '') + '" data-simday="' + d.day + '" aria-pressed="' + (d.day === sm.day) + '">' + d.day + '</button>';
      }).join('') + '</div></div>' +
        '<div class="pd-note">Mude o dia para encontrar mais palavras</div>';
    }
  }

  function renderRegions() {
    var lang = state.lang, wv = E.weeksView(state, lang), run = curRun();
    var cur = wv.filter(function (w) { return w.id === run.week; })[0];
    var h = '<div class="rgns" role="group" aria-label="Regiões da masmorra">' + wv.map(function (w) {
      return '<button class="rgn' + (w.id === run.week ? ' on' : '') + (w.open ? '' : ' shut') + (w.soon ? ' soon' : '') + '" data-region="' + w.id + '"' + (w.open ? '' : ' aria-disabled="true"') + ' style="--ac:' + w.accent + ';--rbg:url(' + w.bg + ')">' +
        (w.open ? w.emoji : '🔒') + ' <span>' + (w.soon ? 'Em breve' : 'Sem ' + w.id) + '</span>' + (w.parked ? ' <i class="dot" title="masmorra em andamento"></i>' : '') + '</button>';
    }).join('') + '</div>';
    if (cur && cur.song) {
      var pct = cur.total ? Math.round(cur.unlocked * 100 / cur.total) : 0, full = cur.unlocked >= cur.total;
      h += '<div class="ach' + (full ? ' full' : '') + '"><div class="ach-n"><b>' + cur.unlocked + '</b><span>/' + cur.total + '</span></div>' +
        '<div class="ach-b"><div class="ach-t">' + (full ? '🏆 ' : '♪ ') + esc(cur.song.title) + '</div>' +
        '<div class="ach-bar"><i style="width:' + pct + '%"></i></div><div class="ach-s">' + (full ? 'Todas as palavras da música!' : 'palavras da música liberadas') + '</div></div></div>';
    }
    $('regionBox').innerHTML = h;
  }

  function renderTeach() {
    var el = $('teach'), lang = state.lang, L = E.langState(state, lang);
    if (L.coreDone) { el.hidden = true; return; }
    var intro = E.introView(), words = E.coreView();
    el.innerHTML = '<div class="equip-card teach" style="--rc:var(--lantern)">' +
      '<div class="teach-head"><img class="narr" src="' + D.art.narrator + '" alt="Ascolto, a coruja" width="72"><div><div class="eq-kicker">Prólogo · ' + esc(D.story.title) + '</div>' +
      '<h2 class="teach-t">' + esc(intro.title) + '</h2></div></div>' +
      '<p class="st-text sm teach-p">' + esc(intro.text) + '</p>' +
      '<div class="core-grid">' + words.map(function (it) {
        return '<button class="core" data-say="' + it.id + '" aria-label="Ouvir ' + esc(it.pt) + '"><span class="core-e">' + ico(it) + '</span>' +
          '<span class="core-n">' + nameHtml(it, lang) + '</span><span class="core-p">' + esc(it.pt) + ' ' + romajiHtml(it, lang) + '</span></button>';
      }).join('') + '</div>' +
      '<p class="eq-count">Toque numa palavra para ouvir. Estas cinco ficam sempre com você.</p>' +
      '<button class="btn" data-act="teachok">Guardar na mochila e subir</button></div>';
    el.hidden = false;
  }

  /* ---------- HUD, abas ---------- */

  function renderHud() {
    var lang = state.lang, run = curRun(), sum = E.summary(state, lang);
    $('langs').innerHTML = LANGS.map(function (l) {
      return '<button class="lang' + (l.id === lang ? ' on' : '') + '" data-lang="' + l.id + '" aria-pressed="' + (l.id === lang) + '"' +
        (l.id === 'ja' ? ' lang="ja"' : '') + '>' + esc(l.label) + '</button>';
    }).join('');
    var hearts = '';
    for (var i = 0; i < run.maxHp; i++) hearts += '<span class="h' + (i < run.hp ? '' : ' off') + '">♥</span>';
    $('stats').innerHTML =
      '<div class="hearts" role="img" aria-label="Vida: ' + run.hp + ' de ' + run.maxHp + '">' + hearts + '</div>' +
      '<div class="chips"><span>Turno ' + run.turn + '</span><span>⚔ ' + E.gearCount(state, lang) + '/' + GEAR_N + '</span><span>📚 ' + sum.owned + '/' + sum.total + '</span>' +
      (sum.due ? '<span class="rv">↻ ' + sum.due + '</span>' : '') + '</div>';
  }

  function renderTabs() {
    var sum = E.summary(state, state.lang);
    $('tabs-in').innerHTML =
      '<button class="tab' + (ui.tab === 'map' ? ' on' : '') + '" data-tab="map"><span class="ti">🗺️</span>Mapa</button>' +
      '<button class="tab' + (ui.tab === 'inv' ? ' on' : '') + '" data-tab="inv"><span class="ti">🎒</span>Inventário' +
      (sum.due ? '<span class="badge">↻ ' + sum.due + '</span>' : '') + '</button>';
  }

  /* ---------- tela 1: mapa ---------- */

  function roomIcon(v) {
    if (!v.known) return '?';
    if (v.locked) return '🔒';
    if (v.type === 'start') return '🚪';
    if (v.type === 'rest') return '🏕️';
    if (v.type === 'chest') return '🧰';
    var m = E.monsterById(v.monster);
    return v.done ? '🪦' : (m ? m.emoji : '👹');
  }

  // sprite da sala (baú, fogueira, criatura) ou, na falta, o emoji
  function roomImgSrc(v) {
    var src = null;
    if (v.known && !v.locked) {
      if (v.type === 'rest') src = D.art.rest;
      else if (v.type === 'chest') src = D.art.chests[Math.min(2, E.roomById(v.id).tier)];
      else if ((v.type === 'monster' || v.type === 'boss') && !v.done) { var m = E.monsterById(v.monster); src = m && m.img; }
    }
    return src;
  }
  function roomGlyph(v) {
    var src = roomImgSrc(v);
    if (src) {
      var sz = v.type === 'boss' ? 50 : 40;
      return '<image class="rimg' + (v.type === 'boss' ? ' boss' : '') + '" href="' + src + '" x="' + (v.x - sz / 2) + '" y="' + (v.y - sz / 2 + 1) + '" width="' + sz + '" height="' + sz + '" preserveAspectRatio="xMidYMid meet"/>';
    }
    return '<text class="ico' + (v.known ? '' : ' q') + '" x="' + v.x + '" y="' + (v.y + 1) + '">' + roomIcon(v) + '</text>';
  }

  function renderMap() {
    var lang = state.lang, L = E.langState(state, lang), run = L.run;
    var view = E.mapView(state, lang), byId = {};
    view.forEach(function (v) { byId[v.id] = v; });

    renderSim();
    renderRegions();
    var paintMode = !!E.weekById(run.week).region.paint;
    $('screen-map').classList.toggle('paint-mode', paintMode);
    $('storyBox').innerHTML = storyCard(E.storyView(state, lang), run, lang, paintMode);
    $('slotsBox').innerHTML = slotsHtml(E.gearView(state, lang), true);

    var cor = '';
    view.forEach(function (a) {
      a.links.forEach(function (bid) {
        if (bid < a.id) return;
        var b = byId[bid], my = (a.y + b.y) / 2;
        var d = (a.x === b.x) ? 'M' + a.x + ' ' + a.y + ' V' + b.y : 'M' + a.x + ' ' + a.y + ' V' + my + ' H' + b.x + ' V' + b.y;
        cor += '<path class="cor' + ((a.visited || b.visited) ? ' open' : '') + '" d="' + d + '"/>';
      });
    });
    $('corridors').innerHTML = cor;

    var rooms = '';
    view.forEach(function (v) {
      var cls = 'room t-' + v.type + (v.known ? ' seen' : ' unk') + (v.visited ? ' visited' : '') +
        (v.current ? ' cur' : '') + (v.reach ? ' reach' : '') + (v.done ? ' done' : '') + (v.locked ? ' locked' : '');
      var x = v.x - v.w / 2, y = v.y - v.h / 2;
      var label = 'Sala ' + v.id + (v.known ? '' : ', inexplorada') + (v.reach ? ', toque para ir' : '');
      rooms += '<g class="' + cls + '" data-room="' + v.id + '" role="button" aria-label="' + label + '">' +
        '<rect x="' + x + '" y="' + y + '" width="' + v.w + '" height="' + v.h + '" rx="8"/>' +
        roomGlyph(v) +
        '<text class="num" x="' + (x + 7) + '" y="' + (y + 13) + '">' + v.id + '</text>' +
        (v.done && v.type !== 'start' ? '<text class="ok" x="' + (x + v.w - 8) + '" y="' + (y + 14) + '">✓</text>' : '') +
        '</g>';
    });
    $('rooms').innerHTML = rooms;

    var cur = byId[run.at];
    var regM = E.weekById(run.week).region, paintOn = !!regM.paint;
    var oldWrap = document.querySelector('#screen-map .map-wrap'); if (oldWrap) oldWrap.hidden = paintOn;
    $('paintWrap').hidden = !paintOn;
    if (paintOn) { if (window.AscoltoMap) window.AscoltoMap.pause(); renderPaint(view, run, regM); }
    else { if (window.AscoltoPaint) window.AscoltoPaint.pause(); mountMapFx(view, run); }
    var pm = document.querySelector('#player image'); if (pm) pm.setAttribute('href', heroSrc('idle', run));
    $('player').setAttribute('style', 'transform:translate(' + (cur.x - cur.w / 2 + 16) + 'px,' + (cur.y + cur.h / 2 - 8) + 'px)');

    var note, over = run.status !== 'active';
    var sum = E.summary(state, lang);
    if (over) {
      note = run.status === 'won' ? 'Região concluída! Você recuperou ' + E.weekById(run.week).region.page + '.' : 'Você caiu nesta masmorra. As palavras que ganhou ficam com você.';
    } else {
      var here = byId[run.at];
      if ((here.type === 'chest' || here.type === 'monster') && !here.done) note = 'Toque na sua sala para enfrentar o desafio de novo.';
      else note = '';
      if (sum.due) note += ' ↻ ' + sum.due + (sum.due === 1 ? ' palavra está' : ' palavras estão') + ' no ponto de revisão.';
    }
    var hint = $('paintHint');
    if (hint) {
      // só aparece quando não há nada novo a aprender hoje E ainda existe dia com palavras; some ao trocar de dia até jogar de novo
      var smH = E.sim(state), planH = E.dayPlan(state, lang), nextD = null;
      for (var di = smH.day; di < planH.length; di++) { if (planH[di].items.length) { nextD = planH[di].day; break; } }
      var muted = ui.hintMute != null && run.turn <= ui.hintMute;
      var showH = !over && sum.fresh === 0 && nextD != null && !muted;
      hint.hidden = !showH;
      if (!showH) ui.hintOpen = false;
      ui.hintText = 'Você já aprendeu todas as palavras liberadas. Avance o dia para encontrar mais: chegam palavras no dia ' + nextD + '.';
      hint.innerHTML = '<button class="ph-btn" data-act="hint" aria-label="Dica" aria-expanded="' + !!ui.hintOpen + '">💡</button>' +
        (ui.hintOpen ? '<div class="ph-pop" role="status">' + esc(ui.hintText) + '</div>' : '');
    }
    if (!audioOk(lang)) note += ' Sem voz de áudio em ' + LANG_BY[lang].label + ' neste aparelho: desafios de ouvir ficam desligados.';
    if (!storeOk) note += ' O navegador bloqueou o salvamento: o progresso vale só nesta visita.';
    $('mapNote').textContent = note.trim();
    $('newRun').hidden = !over;
  }

  /* mapa pintado: arte ilustrada que rola; pinos em HTML; efeitos em Three.js por cima */
  function pinHtml(v, P) {
    var n = P.nodes[v.id]; if (!n) return '';
    var cls = 'pin t-' + v.type + (v.known ? ' seen' : ' unk') + (v.visited ? ' visited' : '') + (v.current ? ' cur' : '') + (v.reach ? ' reach' : '') + (v.done ? ' done' : '') + (v.locked ? ' locked' : '');
    var src = roomImgSrc(v), label = 'Sala ' + v.id + (v.known ? '' : ', inexplorada') + (v.reach ? ', toque para ir' : '');
    var inner = src ? '<img class="pin-ico" src="' + esc(src) + '" alt="" draggable="false">' : '<span class="pin-glyph">' + roomIcon(v) + '</span>';
    return '<button class="' + cls + '" data-room="' + v.id + '" style="left:' + (n[0] / P.w * 100).toFixed(3) + '%;top:' + (n[1] / P.h * 100).toFixed(3) + '%" aria-label="' + label + '">' +
      '<span class="seal"></span>' + inner + '<span class="pin-num">' + v.id + '</span>' + (v.done && v.type !== 'start' ? '<span class="pin-ok">✓</span>' : '') + '</button>';
  }
  function renderPaint(view, run, reg) {
    var P = reg.paint, sc = $('paintScroll'), inner = $('paintInner'), at = null, g = Object.keys(run.gear || {}).length;
    view.forEach(function (v) { if (v.id === run.at) at = v; });
    if (inner.getAttribute('data-img') !== P.img) {
      inner.setAttribute('data-img', P.img); inner.style.aspectRatio = P.w + ' / ' + P.h; $('paintImg').src = P.img;
      $('paintDeco').innerHTML = (P.deco || []).map(function (d) { return '<img class="deco" src="' + esc(d.img) + '" alt="" draggable="false" style="left:' + (d.x / P.w * 100).toFixed(3) + '%;top:' + (d.y / P.h * 100).toFixed(3) + '%;width:calc(var(--u)*' + (d.w || 150) + 'px)">'; }).join('');
    }
    $('paintPins').innerHTML = view.map(function (v) { return pinHtml(v, P); }).join('');
    var u = (sc.clientWidth || 360) / P.w; sc.style.setProperty('--u', u.toFixed(5));
    var n = P.nodes[run.at], hero = $('paintHero');
    hero.src = heroSrc('idle', run); hero.style.left = ((n[0] - 46) / P.w * 100).toFixed(3) + '%'; hero.style.top = ((n[1] + 22) / P.h * 100).toFixed(3) + '%';
    var ok = false, fx = window.AscoltoPaint;
    if (fx) {
      try {
        ok = fx.mount($('paintCv'), sc, { paint: P, rooms: view, at: run.at, accent: reg.accent,
          hero: { idle: heroSrc('idle', run), run: heroSrc('run', run), back: g > 0 ? heroSrc('idle', run) : 'assets/hero/costas.png' } });
      } catch (e) { ok = false; if (window.console) console.warn('fx3d-paint', e); }
    }
    $('paintWrap').classList.toggle('gl', !!ok);
    if (!ok) sc.scrollTop = Math.max(0, n[1] * u - sc.clientHeight * .58);
  }

  /* mapa 3D (Three.js): o SVG fica por cima só para toque e ícones */
  function mountMapFx(view, run) {
    var m = window.AscoltoMap, wrapEl = document.querySelector('#screen-map .map-wrap');
    if (!m || !wrapEl) return;
    var reg = E.weekById(run.week).region, g = run.gear ? Object.keys(run.gear).length : 0;
    try {
      m.mount(wrapEl, $('map'), {
        rooms: view, at: run.at, bg: reg.bg, accent: reg.accent, mood: (reg.bg.match(/([a-z]+)\.jpg/) || [])[1],
        hero: { idle: heroSrc('idle', run), run: heroSrc('run', run), back: g > 0 ? heroSrc('idle', run) : 'assets/hero/costas.png' }
      });
    } catch (e) { if (window.console) console.warn('fx3d-map', e); }
  }

  /* ---------- tela 2: desafio ---------- */

  function pips(total, now) {
    var s = '';
    for (var i = 0; i < total; i++) s += '<span class="pip' + (i < now ? ' on' : '') + '"></span>';
    return s;
  }

  function fbar(cls, now, max, label) {
    var pct = max ? Math.round(Math.max(0, now) / max * 100) : 0;
    return '<div class="fbar ' + cls + '" role="img" aria-label="' + esc(label) + ': ' + now + ' de ' + max + '"><i style="width:' + pct + '%"></i><span>' + now + '/' + max + '</span></div>';
  }

  function waveHtml() {
    var s = '<span class="wave" aria-hidden="true">';
    for (var i = 0; i < 16; i++) s += '<i></i>';
    return s + '</span>';
  }

  function renderQuiz() {
    var lang = state.lang, L = E.langState(state, lang), run = L.run, enc = run.enc;
    var q = enc.q, item = E.itemById(q.itemId), room = E.roomById(enc.room), rs = run.rooms[enc.room];
    var res = enc.phase === 'result' ? enc.result : null;
    var key = run.id + ':' + run.turn + ':' + q.itemId;
    if (enc.phase === 'ask' && ui.qKey !== key) { ui.qKey = key; ui.t0 = Date.now(); }
    var chest = enc.kind === 'chest', boss = enc.kind === 'boss';
    var mon = chest ? null : E.monsterById(rs.monster);
    var sv = E.storyView(state, lang), LL = LANG_BY[lang];
    var h = '<div class="quiz' + (res ? ' res' : '') + '">';

    // lore sempre à vista (herói e peças)
    h += '<section class="lore-mini' + (ui.loreOpen ? ' open' : '') + '" data-act="loretoggle">' + slotsHtml(E.gearView(state, lang), false) +
      '<div class="lm-top"><span>' + esc(sv.chapter) + ' · ' + esc(sv.title) + '</span><i class="lm-more" aria-hidden="true">' + (ui.loreOpen ? 'recolher ▴' : 'ler tudo ▾') + '</i></div>' +
      '<p class="st-text sm">' + storyText(sv, lang) + '</p></section>';

    // balão da palavra
    var bub;
    if (q.type === 'sentence') {
      bub = '<button class="bub-say" data-act="say" aria-label="Ouvir a frase">🔊</button><div class="bub-body"><div class="bub-word sm">Diga a frase!</div>' + waveHtml() + '</div>';
    } else if (q.type === 'meaning') {
      bub = '<button class="bub-say" data-act="say" aria-label="Ouvir a palavra">🔊</button><div class="bub-body"><div class="bub-word">' + nameHtml(item, lang) + '</div>' +
        (lang === 'ja' ? '<div class="bub-sub">' + kanaLine(item, lang) + '</div>' : '') + waveHtml() + '</div>';
    } else if (q.type === 'listen') {
      bub = '<button class="bub-say" data-act="say" aria-label="Ouvir de novo">🔊</button><div class="bub-body"><div class="bub-word sm">Ouça com atenção</div>' + waveHtml() + '</div>';
    } else {
      bub = '<div class="bub-body"><div class="bub-word"><span class="bub-ic">' + ico(item) + '</span> ' + esc(item.pt) + '</div><div class="bub-sub">diga em ' + esc(LL.label) + '</div></div>';
    }

    // cena de batalha
    var heroPose = res ? (res.correct ? 'attack' : 'hurt') : 'idle';
    var foeCls = res ? (chest ? (res.correct ? ' pop' : ' shake') : (res.correct ? ' hit' : ' lunge')) : '';
    var foeSprite = chest ? ico({ img: D.art.chests[Math.min(2, room.tier)], emoji: '🧰' }) : ico(mon);
    var foeName = chest ? 'Baú selado' : mon.pt;
    var foeBar = chest ? fbar('foe', res && res.correct ? 0 : 1, 1, 'Selo do baú') : fbar('foe', rs.hp, room.hp, 'Vida da criatura');
    h += '<section class="stage k-' + (chest ? 'chest' : (boss ? 'boss' : 'monster')) + '" aria-label="Batalha">' +
      '<div class="bubble">' + bub + '</div>' +
      '<div class="fighter f-hero' + (res ? (res.correct ? ' atk' : ' dmg') : '') + '">' + heroImg(heroPose, 100, run) +
      '<div class="f-name">Escriba</div>' + fbar('hero', run.hp, run.maxHp, 'Sua vida') + '</div>' +
      '<div class="fighter f-foe' + (!chest && mon && mon.flip ? ' f-flip' : '') + foeCls + (mon && mon.fx ? ' fx-' + mon.fx : '') + '"><div class="f-art">' + foeSprite + '</div>' +
      '<div class="f-name">' + esc(foeName) + '</div>' + foeBar + '</div>' +
      (!res ? '<button class="ghost-sm flee" data-act="flee">' + (chest ? 'Sair' : 'Fugir') + '</button>' : '') +
      '</section>';

    // painel da pergunta
    var chip = q.type === 'sentence' ? 'Duelo de frases' : q.type === 'listen' ? 'Desafio de áudio' : (q.type === 'speak' ? 'Desafio de fala' : (boss ? 'Desafio do chefe' : (chest ? 'Selo do baú' : 'Desafio de vocabulário')));
    var title, sub = chest ? 'Escolha a opção correta para quebrar o selo.' : 'Escolha a opção correta para continuar o combate.';
    if (q.type === 'sentence') { title = 'Diga a frase em voz alta'; sub = res ? 'Veja como você foi.' : 'Fale com clareza: a nota decide o golpe.'; }
    else if (q.type === 'meaning') title = 'Qual é o significado de “' + nameHtml(item, lang) + '”?';
    else if (q.type === 'listen') title = 'Qual palavra você ouviu?';
    else { title = 'Diga em voz alta em ' + esc(LL.label); sub = 'Fale e confira a resposta.'; }

    h += '<section class="qcard"><span class="chip-q">' + ico(E.itemById('espada')) + ' ' + chip + '</span>';
    if (q.practice && !res) h += '<p class="prac">Prática extra: não muda o agendamento.</p>';
    h += '<h3 class="q-title">' + title + '</h3><p class="q-sub2">' + sub + '</p>';
    if (q.type === 'meaning' && !res) {
      h += '<button class="replay" data-act="say"><span class="rp-ic">🔊</span><span class="rp-tx"><b>Ouvir novamente</b><small>Pronúncia ' + (lang === 'ja' ? 'japonesa' : (lang === 'de' ? 'alemã' : 'italiana')) + '</small></span></button>';
    }

    if (q.type === 'sentence') {
      h += sentenceHtml(q, res, lang);
    } else if (q.type === 'meaning' || q.type === 'listen') {
      h += '<div class="opts grid2">';
      q.options.forEach(function (id, i) {
        var it = E.itemById(id), cls = 'opt';
        if (res) { if (i === q.correct) cls += ' ok'; else if (i === ui.picked) cls += ' bad'; else cls += ' dim'; }
        h += '<button class="' + cls + '" data-act="opt" data-i="' + i + '"' + (res ? ' disabled' : '') + '>' +
          '<span class="o-ic">' + ico(it) + '</span>' +
          '<span class="o-tx"><b>' + esc(it.pt) + '</b>' + (res ? '<small>' + nameHtml(it, lang) + '</small>' : '') + '</span>' +
          '<span class="o-radio" aria-hidden="true">' + (res && i === q.correct ? '✔' : (res && i === ui.picked ? '✖' : '')) + '</span></button>';
      });
      h += '</div>';
    } else if (!res) {
      var sp = ui.speak;
      h += '<div class="speak">';
      if (sp.msg) h += '<p class="sp-msg">' + esc(sp.msg) + '</p>';
      if (sp.phase === 'revealed') {
        var pv = E.preview(state, lang, item.id);
        h += '<div class="reveal-word">' + nameHtml(item, lang) + '</div><div class="q-sub">' + kanaLine(item, lang) + '</div>' +
          '<div class="q-say"><button class="say" data-act="say">🔊 Ouvir o modelo</button></div>' +
          '<p class="sp-ask">Como foi?</p><div class="grades">' +
          ['Errei', 'Difícil', 'Bom', 'Fácil'].map(function (lb, i) {
            return '<button class="gbtn g' + (i + 1) + '" data-act="grade" data-g="' + (i + 1) + '"><b>' + lb + '</b><small>' + pv[i] + '</small></button>';
          }).join('') + '</div>';
      } else if (sp.phase === 'listening') {
        h += '<div class="listening"><span class="rec"></span>Ouvindo… fale agora</div>';
      } else {
        if (SRClass && !sp.noMic) h += '<button class="btn" data-act="listen">🎤 Falar</button>';
        h += '<button class="btn ghost" data-act="reveal">Ver resposta e conferir</button>';
      }
      h += '</div>';
    }

    if (res) {
      h += '<div class="result ' + (res.correct ? 'good' : 'badr') + '">' + resultHtml(enc, item, L, res) + '</div>' +
        (q.type === 'sentence' ? '' : '<div class="reveal rar-' + item.rarity + '"><span class="rv-emoji">' + ico(item) + '</span>' +
        '<div class="rv-body"><div class="rv-name">' + nameHtml(item, lang) + '</div>' +
        '<div class="rv-pt">' + esc(item.pt) + ' ' + romajiHtml(item, lang) + '</div></div>' +
        '<button class="say sm" data-act="say" aria-label="Ouvir">🔊</button></div>') +
        '<button class="btn go" data-act="continue">' + ico(E.itemById('espada')) + ' ' + continueLabel(run, enc, rs, res) + '</button>';
    }

    h += '</section></div>';
    $('screen-quiz').innerHTML = h;
    mountFx({ enc: enc, q: q, res: res, run: run, room: room, mon: mon, chest: chest, boss: boss, item: item, lang: lang });
  }

  /* cena 3D (Three.js): só desenha o palco; textos, barras e botões continuam em HTML */
  var BG_BY_KIND = { monster: 'assets/bg/dungeon.jpg', boss: 'assets/bg/secreta.jpg', chest: 'assets/bg/bau.jpg' };
  function mountFx(c) {
    var fx = window.AscoltoFX, stage = $('screen-quiz').querySelector('.stage');
    if (!stage) return;
    var kind = c.chest ? 'chest' : (c.boss ? 'boss' : 'monster'), r = c.res;
    var rgB = E.weekById(c.run.week).region.battle, bgUrl = (rgB && rgB[kind]) || BG_BY_KIND[kind];
    if (rgB && rgB[kind]) stage.style.backgroundImage = 'linear-gradient(180deg, rgba(11, 29, 43, .08), rgba(11, 29, 43, .5)), url(' + rgB[kind] + ')';
    if (!fx) return;
    var word = c.q.type === 'sentence' ? (c.q.line.text || '') : (function () { var n = c.item.names[c.lang]; return c.lang === 'ja' ? (n.kanji || n.kana) : n.word; })();
    var foeUrl = c.chest ? D.art.chests[Math.min(2, c.room.tier)] : (c.mon && c.mon.img) || null;
    try {
      fx.mount(stage, {
        scene: c.run.id + ':' + c.enc.room, kind: kind, bg: bgUrl, fx: c.mon && c.mon.fx || null,
        hero: { idle: heroSrc('idle', c.run), attack: heroSrc('attack', c.run), hurt: heroSrc('hurt', c.run) },
        foe: foeUrl, foeFlip: !c.chest && !!(c.mon && c.mon.flip), word: word,
        evKey: r ? c.run.id + ':' + c.run.turn + ':r' : null,
        res: r ? { correct: !!r.correct, crit: !!(r.crit || r.grade === 4), down: !!r.monsterDown, opened: !!r.chestOpened, trap: !!r.trap, dmg: r.dmgToHero, heroDown: !!r.heroDown, won: !!r.bossDown } : null
      });
    } catch (e) { if (window.console) console.warn('fx3d', e); }
  }

  /* ---------- duelo de frases (chefe) ---------- */

  // palavras da frase; as que o avaliador marcou como pouco claras ficam em laranja
  function lineHtml(line, lang, bad) {
    var sep = lang === 'ja' ? '' : ' ';
    return line.tok.map(function (k, i) {
      var c = 'sw' + (k.id ? ' voc' : '') + (bad && bad.indexOf(i) >= 0 ? ' unclear' : '');
      return '<span class="' + c + '">' + esc(k.t) + '</span>';
    }).join(sep);
  }

  function sentenceHtml(q, res, lang) {
    var line = q.line, sp = ui.speak, h = '';
    h += '<div class="bsent' + (res ? ' done' : '') + '"><div class="bsent-text" lang="' + LANG_BY[lang].tag + '">' + lineHtml(line, lang, res ? res.bad : null) + '</div>';
    if (res) h += '<div class="bsent-pt">' + esc(line.pt) + '</div>';
    else h += '<div class="bsent-pt hid">A tradução aparece depois que você falar.</div>';
    h += '</div>';
    if (res) {
      var lbl = res.score >= 90 ? 'Excelente!' : (res.score >= 80 ? 'Muito bom!' : (res.correct ? 'Bom!' : 'Vamos de novo'));
      h += '<div class="score ' + (res.correct ? 'ok' : 'no') + '"><b>' + res.score + '%</b><span>' + lbl + (res.crit ? ' · golpe crítico' : '') + '</span></div>';
      if (res.heard) h += '<p class="heard">O app entendeu: <i>“' + esc(res.heard) + '”</i>' + (res.bad.length ? '. Palavras em laranja não saíram claras: ouça de novo prestando atenção nelas.' : '.') + '</p>';
      return h;
    }
    h += '<div class="speak">';
    if (sp.msg) h += '<p class="sp-msg">' + esc(sp.msg) + '</p>';
    if (sp.phase === 'listening') {
      h += '<div class="listening"><span class="rec"></span>Ouvindo… diga a frase</div>';
    } else {
      h += '<button class="btn ghost" data-act="say">🔊 Ouvir a frase</button>';
      if (hasMic()) h += '<button class="btn" data-act="sentmic">🎤 Falar a frase</button>';
      if (!window.AscoltoEvaluator) {
        h += '<p class="fsim-note">Modo teste: simule a nota do avaliador (no app, quem dá a nota é o seu avaliador de fala).</p><div class="fsim-row">' +
          '<button class="btn sm" data-act="sentsim" data-s="93">Falei bem · 93%</button>' +
          '<button class="btn sm ghost" data-act="sentsim" data-s="70">Mais ou menos · 70%</button>' +
          '<button class="btn sm ghost" data-act="sentsim" data-s="35">Errei · 35%</button></div>';
      }
    }
    return h + '</div>';
  }

  // Avaliador de fala. No app real, defina window.AscoltoEvaluator(lang, frase, palavras) -> Promise<{score, heard, bad}>
  // (score 0-100, heard = texto entendido, bad = índices das palavras pouco claras).
  function hasMic() { return !!(window.AscoltoEvaluator || (SRClass && !ui.speak.noMic)); }

  function finishSentence(ev) {
    var res = E.gradeSentence(state, state.lang, ev);
    if (!res) return;
    ui.speak.phase = 'idle'; ui.speak.msg = '';
    save(); render();
  }

  function startSentence() {
    var lang = state.lang, line = curRun().enc.q.line;
    if (window.AscoltoEvaluator) {
      ui.speak.phase = 'listening'; ui.speak.msg = ''; renderQuiz();
      Promise.resolve(window.AscoltoEvaluator(lang, line.text, line.tok.map(function (k) { return k.t; })))
        .then(function (ev) { finishSentence(ev || { score: 0, bad: [] }); })
        .catch(function () { ui.speak.phase = 'idle'; ui.speak.msg = 'Não consegui avaliar. Tente de novo.'; renderQuiz(); });
      return;
    }
    if (!SRClass) { ui.speak.noMic = true; renderQuiz(); return; }
    var rec, done = false;
    function fail(msg, noMic) {
      if (done) return; done = true;
      ui.speak.phase = 'idle'; ui.speak.msg = msg; if (noMic) ui.speak.noMic = true; renderQuiz();
    }
    try {
      rec = new SRClass();
      rec.lang = LANG_BY[lang].tag; rec.interimResults = false; rec.maxAlternatives = 3; rec.continuous = false;
      rec.onresult = function (ev) {
        if (done) return; done = true;
        var alts = [], r = ev.results[0];
        for (var i = 0; i < r.length; i++) alts.push(r[i].transcript);
        finishSentence(E.scoreSpoken(lang, line, alts));
      };
      rec.onerror = function (ev) {
        var c = ev && ev.error;
        if (c === 'no-speech' || c === 'aborted') fail('Não ouvi nada. Tente de novo.', false);
        else fail('O microfone não está liberado aqui.', true);
      };
      rec.onend = function () { fail('Não ouvi nada. Tente de novo.', false); };
      ui.speak.phase = 'listening'; ui.speak.msg = ''; renderQuiz();
      rec.start();
    } catch (e) { fail('O microfone não está liberado aqui.', true); }
  }

  // nota simulada: palavras do curso pouco claras conforme a nota
  function simulateSentence(score) {
    var line = curRun().enc.q.line, idx = [];
    line.tok.forEach(function (k, i) { if (k.id) idx.push(i); });
    var n = score >= 90 ? 0 : (score >= 60 ? 1 : Math.max(1, Math.ceil(idx.length / 2)));
    var bad = [];
    for (var j = 0; j < n && idx.length; j++) bad.push(idx.splice(Math.floor(Math.random() * idx.length), 1)[0]);
    var heard = line.tok.filter(function (k, i) { return bad.indexOf(i) < 0; }).map(function (k) { return k.t; }).join(state.lang === 'ja' ? '' : ' ');
    finishSentence({ score: score, heard: heard, bad: bad });
  }

  function continueLabel(run, enc, rs, res) {
    if (run.status === 'won' || run.status === 'lost') return 'Ver resultado';
    if (res && res.loot) return 'Equipar a peça';
    if ((enc.kind === 'monster' || enc.kind === 'boss') && !rs.done) return 'Próximo turno';
    return 'Voltar ao mapa';
  }

  function resultHtml(enc, item, L, r) {
    if (r.sentence) {
      var s = '<p class="fb">' + (r.correct ? '⚔️ ' + (r.bossDown ? 'Golpe final!' : (r.crit ? 'Golpe crítico!' : 'Golpe certeiro!')) : '✖ A frase não saiu clara') + '</p>';
      if (r.correct) s += r.bossDown ? '<p>📜 O guardião cai: ' + esc(E.weekById(curRun().week).region.page) + ' se solta do Livro!</p>' : '<p>O chefe perde 1 de vida.</p>';
      else s += '<p>O chefe te acerta: −' + r.dmgToHero + ' ♥. Tente a mesma frase de novo.</p>' + (r.heroDown ? '<p>Sua vida acabou…</p>' : '');
      if (r.loot) s += '<p>🎁 Peça encontrada: <b class="rt-' + r.loot.rarity + '">' + esc(r.loot.name) + '</b></p>';
      if (r.bad.length) s += '<p class="srs">↻ As palavras em laranja voltam logo nas revisões.</p>';
      return s;
    }
    var t = '', gradeTxt = ['', 'Errei', 'Difícil', 'Bom', 'Fácil'][r.grade];
    if (r.correct) {
      t += '<p class="fb">✔ ' + (r.grade === 4 ? 'Fácil!' : (r.grade === 2 ? 'Acertou, com esforço' : 'Acertou!')) + '</p>';
      if (r.isNew) {
        var mt = E.wordMeta(state.lang, item.id);
        t += '<p>📚 Palavra nova no grimório (<b class="rt-' + item.rarity + '">' + RAR[item.rarity].label + '</b>)</p>';
      }
      if (r.chestOpened) t += '<p>🧰 O selo se parte: o baú abre!</p>';
      else if (r.bossDown) t += '<p>📜 O guardião cai: ' + esc(E.weekById(curRun().week).region.page) + ' se solta do Livro!</p>';
      else if (r.monsterDown) t += '<p>⚔️ A criatura se desfaz em letras soltas!</p>';
      else t += '<p>⚔️ Golpe certeiro: a criatura perde 1 de vida.</p>';
      if (r.loot) t += '<p>🎁 Peça encontrada: <b class="rt-' + r.loot.rarity + '">' + esc(r.loot.name) + '</b></p>';
    } else {
      t += '<p class="fb">✖ Não foi dessa vez</p>';
      t += r.trap ? '<p>🪤 O selo queima: −' + r.dmgToHero + ' ♥.</p>' : '<p>A criatura te acerta: −' + r.dmgToHero + ' ♥.</p>';
      if (r.heroDown) t += '<p>Sua vida acabou…</p>';
    }
    if (r.practice) t += '<p class="srs">Prática extra: o agendamento não mudou.</p>';
    else if (r.next) t += '<p class="srs">↻ ' + gradeTxt + ': esta palavra volta em <b>' + esc(r.next) + '</b>.</p>';
    return t;
  }

  function doAnswer(correct, grade, auto) {
    var lang = state.lang;
    var res = E.answer(state, lang, correct, grade, auto);
    if (!res) return;
    save();
    render();
    var it = E.itemById(res.itemId);
    if (it) say(E.speakText(it, lang), lang);
  }

  /* ---------- tela 3: inventário ---------- */

  function slotCell(s) {
    return '<div class="pcell"><button class="pslot' + (s.equipped ? ' on rar-' + s.rarity : '') + (ui.slot === s.slot ? ' sel' : '') + '" data-slot="' + s.slot + '" aria-label="' + esc(s.label) + ': ' + (s.equipped ? 'equipado' : 'vazio') + '">' +
      (s.equipped ? ico(s) : '<span class="ghost">' + ico(s) + '</span>') + '</button><span class="pl">' + esc(s.label) + '</span></div>';
  }

  function slotDetail(gv, lang) {
    if (!ui.slot) return '<p class="tip-hint">Toque numa peça para ver o nome, a tradução e a história dela.</p>';
    var s = gv.filter(function (x) { return x.slot === ui.slot; })[0];
    if (!s) return '';
    if (!s.equipped) {
      return '<div class="tip empty"><div class="tip-name">' + ico(s) + ' ' + esc(s.label) + ': vazio</div>' +
        '<p class="tip-fl">Esta peça está guardada por ' + (s.guard === 'chest' ? 'um baú selado' : 'uma criatura') + ' na masmorra.</p></div>';
    }
    var it = s.item && E.isUnlocked(state, lang, s.item) ? E.itemById(s.item) : null;
    return '<div class="tip rar-' + s.rarity + '"><div class="tip-top"><span class="tip-emoji">' + ico(s) + '</span>' +
      '<div class="tip-main"><div class="tip-name">' + (it ? nameHtml(it, lang) : esc(s.name)) + '</div>' +
      '<div class="tip-sub">' + (it ? esc(s.name) + ' · ' : '') + '<b class="rt-' + s.rarity + '">' + RAR[s.rarity].label + '</b> · ' + esc(s.label) + (it ? ' ' + romajiHtml(it, lang) : '') + '</div></div>' +
      (it ? '<button class="say sm" data-say="' + it.id + '" aria-label="Ouvir">🔊</button>' : '') + '</div>' +
      '<p class="tip-fl">“' + esc(s.flavor) + '”</p>' +
      (it ? '<div class="trows">' + LANGS.filter(function (l) { return l.id !== lang && E.isUnlocked(state, l.id, it.id); }).map(function (l) {
        return '<div class="trow"><span class="tag">' + l.short + '</span><span class="tname">' + nameHtml(it, l.id) + '</span>' + romajiHtml(it, l.id) + '</div>';
      }).join('') + '</div>' : '') + '</div>';
  }

  function renderInv() {
    var lang = state.lang, L = E.langState(state, lang), run = L.run, sum = E.summary(state, lang);
    var gv = E.gearView(state, lang), n = gv.filter(function (s) { return s.equipped; }).length;
    var by = {}; gv.forEach(function (s) { by[s.slot] = s; });

    var h = '<div class="inv-head"><h2>Herói</h2><p class="inv-sub">' + n + ' de ' + gv.length + ' peças equipadas nesta masmorra</p></div>' +
      '<div class="paper"><div class="pcol">' + ['head', 'hands', 'feet'].map(function (k) { return slotCell(by[k]); }).join('') + '</div>' +
      '<div class="paper-hero">' + heroImg('idle', 124, run, 'idle') + slotCell(by.weapon) + '</div>' +
      '<div class="pcol">' + ['cloak', 'body', 'shield'].map(function (k) { return slotCell(by[k]); }).join('') + '</div></div>' +
      '<div id="slotTip">' + slotDetail(gv, lang) + '</div>';

    var chips = [['all', 'Todas']].concat(D.rarities.map(function (r) { return [r.id, r.label]; })).concat([['due', '↻ Agora']]);
    h += '<div class="inv-head words"><h2>Grimório de palavras</h2>' +
      '<p class="inv-sub">' + sum.owned + ' de ' + sum.total + ' liberadas · ↻ ' + sum.due + ' para rever agora · novas hoje: ' + (20 - sum.newLeft) + '/20' + (sum.upcoming ? ' · 🔒 ' + sum.upcoming + ' chegam nos próximos dias' : '') + '</p></div>' +
      '<div class="gleg" aria-label="Cores dos artigos">' +
      (lang === 'ja' ? '<span>Kanji com leitura em kana acima</span>' :
        '<span class="g-m">masculino</span><span class="g-f">feminino</span>' + (lang === 'de' ? '<span class="g-n">neutro</span>' : '')) + '</div>' +
      '<div class="chips-row" role="group" aria-label="Filtrar">' +
      chips.map(function (c) {
        return '<button class="fchip' + (ui.filter === c[0] ? ' on' : '') + '" data-filter="' + c[0] + '">' + c[1] + '</button>';
      }).join('') + '</div><div class="grid">';

    var list = D.items.filter(function (x) { return E.isUnlocked(state, lang, x.id); }).sort(function (a, b) { return RAR[a.rarity].rank - RAR[b.rarity].rank; });
    var shown = 0;
    list.forEach(function (it) {
      var info = E.cardInfo(state, lang, it.id);
      if (ui.filter === 'due') { if (!L.cards[it.id] || !info.isDue) return; }
      else if (ui.filter !== 'all' && it.rarity !== ui.filter) return;
      shown++;
      var rar = RAR[it.rarity], pipsTxt = '';
      for (var i = 0; i < rar.rank; i++) pipsTxt += '◆';
      var o = L.owned[it.id];
      if (!o) {
        h += '<div class="card locked rar-' + it.rarity + '" aria-label="Palavra ainda não encontrada, raridade ' + rar.label + '"><div class="card-in"><div class="face front">' +
          '<div class="c-top"><span class="rar-tag">' + rar.label + '</span><span class="pips-d" aria-hidden="true">' + pipsTxt + '</span></div>' +
          '<div class="c-emoji sil" aria-hidden="true">' + ico(it) + '</div><div class="c-name">???</div>' +
          '<div class="c-foot"><span>Não encontrada</span></div></div></div></div>';
        return;
      }
      var stars = '';
      for (var s = 0; s < 3; s++) stars += s < info.stars ? '★' : '☆';
      var others = LANGS.filter(function (l) { return l.id !== lang && E.isUnlocked(state, l.id, it.id); });
      var mt = E.wordMeta(lang, it.id);
      var src = mt ? (mt.core ? 'Vocabulário do jogo' : 'Semana ' + mt.week + ' · dia ' + mt.day + ' · ' + mt.srcLabel) : '';
      var back = '<div class="b-pt">' + esc(it.pt) + '</div>' + (src ? '<div class="b-src">📍 ' + esc(src) + '</div>' : '') + others.map(function (l) {
        return '<div class="trow"><span class="tag">' + l.short + '</span><span class="tname">' + nameHtml(it, l.id) + '</span>' + romajiHtml(it, l.id) + '</div>';
      }).join('') + '<div class="b-srs">' + esc(info.stLabel) + (info.ivl ? ' · intervalo ' + info.ivl + ' d' : '') + ' · volta ' + esc(info.dueLabel) + '</div>';
      var fl = ui.flipped[it.id] ? ' flipped' : '';
      h += '<div class="card rar-' + it.rarity + fl + '" role="button" tabindex="0" aria-pressed="' + (!!ui.flipped[it.id]) + '" data-card="' + it.id + '">' +
        '<div class="card-in">' +
        '<div class="face front"><div class="c-top"><span class="rar-tag">' + rar.label + '</span><span class="pips-d" aria-hidden="true">' + pipsTxt + '</span></div>' +
        '<div class="c-emoji">' + ico(it) + '</div><div class="c-name">' + nameHtml(it, lang) + '</div>' +
        '<div class="c-foot"><span class="due' + (info.isDue ? ' now' : '') + '">↻ ' + esc(info.dueLabel) + '</span><span class="stars" aria-label="Domínio ' + info.stars + ' de 3">' + stars + '</span>' +
        '<button class="say sm" data-say="' + it.id + '" aria-label="Ouvir">🔊</button></div></div>' +
        '<div class="face back"><div class="c-top"><span class="rar-tag">' + rar.label + '</span><span class="c-emoji-sm">' + ico(it) + '</span></div>' + back + '</div>' +
        '</div></div>';
    });
    h += '</div>';
    if (!shown) h += '<p class="empty">Nenhuma palavra aqui ainda. ' + (ui.filter === 'due' ? 'Quando uma palavra chegar na hora de rever, ela aparece nesta lista.' : 'Abra baús e vença criaturas para encontrar as palavras liberadas.') + '</p>';
    $('screen-inv').innerHTML = h;
  }

  /* ---------- cena de equipar ---------- */

  function renderEquip() {
    var el = $('equip'), run = curRun();
    var loot = run.pendingLoot;
    if (!loot || run.enc) { el.hidden = true; return; }
    var lang = state.lang, it = loot.item && E.isUnlocked(state, lang, loot.item) ? E.itemById(loot.item) : null;
    var w = loot.slot === 'weapon', rar = RAR[loot.rarity];
    var g = D.gear.filter(function (x) { return x.slot === loot.slot; })[0];
    el.innerHTML = '<div class="equip-card' + (w ? ' legend' : '') + ' rar-' + loot.rarity + '">' +
      '<div class="eq-kicker">' + (w ? 'A espada lendária!' : 'Equipamento encontrado') + '</div>' +
      '<div class="eq-stage">' + heroImg('win', 130, run) + '<img class="fx-flash" src="' + D.art.fx.luz + '" alt="" aria-hidden="true"><img class="fly" src="' + (loot.img || '') + '" alt="" aria-hidden="true"></div>' +
      '<div class="eq-piece"><span class="eq-emoji">' + ico(loot) + '</span><div class="eq-info"><div class="eq-name">' + (it ? nameHtml(it, lang) : esc(loot.name)) + '</div>' +
      '<div class="eq-sub">' + (it ? esc(loot.name) + ' · ' : '') + '<b class="rt-' + loot.rarity + '">' + rar.label + '</b> · ' + esc(g.label) + (it ? ' ' + romajiHtml(it, lang) : '') + '</div></div>' +
      (it ? '<button class="say sm" data-act="eqsay" aria-label="Ouvir">🔊</button>' : '') + '</div>' +
      '<p class="eq-flavor">“' + esc(loot.flavor) + '”</p>' +
      '<p class="eq-count">Equipado ' + loot.count + '/' + GEAR_N + '</p>' +
      (loot.bossOpened ? '<p class="eq-open">🔓 A porta do chefe está aberta.</p>' : '') +
      (w ? '<p class="eq-open">Respire fundo. O guardião do andar espera no fim do corredor.</p>' : '') +
      '<button class="btn" data-act="equipok">' + (w ? 'Preparar-me para o chefe' : 'Continuar') + '</button></div>';
    el.hidden = false;
    var key = run.id + ':' + loot.slot;
    if (ui.equipKey !== key) { ui.equipKey = key; if (it) say(E.speakText(it, lang), lang); }
  }

  /* ---------- fim de masmorra ---------- */

  function renderEnd() {
    var lang = state.lang, run = curRun(), el = $('end');
    var over = run.status !== 'active' && !run.enc && !run.pendingLoot;
    if (!over || ui.endSeen === run.id) { el.hidden = true; return; }
    var won = run.status === 'won', sum = E.summary(state, lang);
    var gained = run.gained.map(function (id) { return ico(E.itemById(id)); }).join(' ');
    var sv = E.storyView(state, lang);
    el.innerHTML = '<div class="end-card"><div class="end-art">' + (won ? heroImg('win', 104, run, 'idle') : heroImg('lose', 112, run, 'lost')) + '<img class="end-owl" src="' + (won ? D.art.mascot.happy : D.art.mascot.worried) + '" alt="" width="64" aria-hidden="true">' + '</div>' +
      '<h2>' + (won ? 'Masmorra concluída!' : 'Você caiu…') + '</h2>' +
      '<p class="end-story">' + storyText(sv, lang) + '</p>' +
      '<dl class="end-stats"><div><dt>Palavras novas</dt><dd>' + run.gained.length + '</dd></div>' +
      '<div><dt>Acertos</dt><dd>' + run.right + '</dd></div><div><dt>Erros</dt><dd>' + run.wrong + '</dd></div>' +
      '<div><dt>Grimório</dt><dd>' + sum.owned + '/' + sum.total + '</dd></div></dl>' +
      (gained ? '<p class="end-loot" aria-label="Palavras desta masmorra">' + gained + '</p>' : '') +
      (won ? '<p class="end-hint">Avance o dia do roteiro para liberar mais palavras. Elas entram na história e nos desafios.</p>' : '') +
      '<button class="btn" data-act="newrun">Nova masmorra</button>' +
      '<button class="btn ghost" data-act="endinv">Ver inventário</button></div>';
    el.hidden = false;
  }

  /* ---------- render geral ---------- */

  function show(id, on) { $(id).hidden = !on; }

  function render() {
    var lang = state.lang, L = E.langState(state, lang);
    syncEnv();
    var had = !!L.run;
    E.ensureRun(state, lang);
    if (!had) save();
    var run = L.run, inQuiz = !!run.enc;
    document.documentElement.style.setProperty('--accent', E.weekById(run.week).region.accent);
    document.body.classList.toggle('in-quiz', inQuiz);
    var screen = inQuiz ? 'quiz' : ui.tab;
    renderHud();
    show('screen-map', screen === 'map');
    show('screen-quiz', screen === 'quiz');
    show('screen-inv', screen === 'inv');
    if (screen !== 'quiz' && window.AscoltoFX) window.AscoltoFX.pause();
    if (screen !== 'map' && window.AscoltoMap) window.AscoltoMap.pause();
    if (screen !== 'map' && window.AscoltoPaint) window.AscoltoPaint.pause();
    if (screen === 'map') renderMap();
    else if (screen === 'quiz') renderQuiz();
    else renderInv();
    renderTabs();
    renderEquip();
    renderTeach();
    renderEnd();
  }

  function autoplay() {
    var run = curRun();
    if (run.enc && run.enc.phase === 'ask' && run.enc.q.type === 'listen') sayItem(run.enc.q.itemId);
  }

  /* ---------- eventos ---------- */

  $('langs').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-lang]');
    if (!b || b.getAttribute('data-lang') === state.lang) return;
    state.lang = b.getAttribute('data-lang');
    ui.filter = 'all'; ui.flipped = {}; ui.picked = null; ui.monPt = false; ui.slot = null; resetSpeak();
    save(); render(); window.scrollTo(0, 0);
  });

  $('tabs-in').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-tab]');
    if (!b) return;
    ui.tab = b.getAttribute('data-tab');
    render(); window.scrollTo(0, 0);
  });

  function onRoomClick(ev) {
    var g = ev.target.closest('[data-room]');
    if (!g) return;
    var lang = state.lang;
    syncEnv();
    var id = parseInt(g.getAttribute('data-room'), 10);
    if (ui.walking) return;
    var chk = E.canMove(state, lang, id), from = E.langState(state, lang).run.at;
    if (chk.ok && id !== from) { askRoom(id, from); return; }
    startRoom(id, chk, from);
  }

  // Caixa de confirmação antes de entrar na sala: diz o que vamos aprender.
  var ROOM_ASK = {
    monster: ['⚔️', 'Batalha', 'Vamos enfrentar um monstro. Cada acerto é um golpe.'],
    chest: ['🧰', 'Baú', 'Vamos abrir um baú. O cadeado pede o nome certo.'],
    rest: ['🔥', 'Descanso', 'Um lugar tranquilo para respirar e recuperar a vida.'],
    boss: ['👑', 'Chefe', 'Vamos duelar dizendo frases em voz alta.'],
    start: ['🚪', 'Entrada', 'Voltar ao começo da Torre.']
  };
  function askRoom(id, from) {
    var lang = state.lang, room = E.roomById(id), wk = E.weekById(E.langState(state, lang).run.week);
    var t = ROOM_ASK[room.type] || ROOM_ASK.monster, beat = (wk.beats && wk.beats[String(id)]) || null;
    var unl = E.unlocked(state, lang), pool = ((wk.wordsByLang && wk.wordsByLang[lang]) || wk.words).map(function (w) { return w.item; })
      .filter(function (i) { return unl[i]; });
    var pick = [];
    if (room.type !== 'rest' && room.type !== 'start' && pool.length) {
      for (var k = 0; k < Math.min(3, pool.length); k++) pick.push(pool[(id * 3 + k) % pool.length]);
    }
    var el = $('roomAsk');
    el.innerHTML = '<div class="equip-card ask" style="--rc:var(--lantern)">' +
      '<div class="eq-kicker">' + t[0] + ' ' + esc(t[1]) + '</div>' +
      '<h2 class="teach-t">' + esc(beat ? beat.title : t[1]) + '</h2>' +
      '<p class="st-text sm">' + esc(t[2]) + '</p>' +
      (pick.length ? '<p class="ask-l">Vamos aprender:</p><div class="ask-w">' + pick.map(function (i) {
        var it = E.itemById(i); return '<span class="ask-chip">' + ico(it) + '<span>' + nameHtml(it, lang) + '</span></span>';
      }).join('') + '</div>' : '') +
      '<div class="ask-b"><button class="btn ghost" data-act="askno">Voltar</button><button class="btn" data-act="askyes">Entrar</button></div></div>';
    el.hidden = false; ui.ask = { id: id, from: from };
  }
  function closeAsk() { $('roomAsk').hidden = true; ui.ask = null; }
  $('roomAsk').addEventListener('click', function (ev) {
    if (ev.target.closest('[data-act="askyes"]')) {
      var a = ui.ask; closeAsk(); if (a) { syncEnv(); startRoom(a.id, E.canMove(state, state.lang, a.id), a.from); }
    } else if (ev.target.closest('[data-act="askno"]') || ev.target === this) closeAsk();
  });

  function startRoom(id, chk, from) {
    if (chk.ok && id !== from && window.AscoltoMap && window.AscoltoMap.active && $('paintWrap').hidden) {
      ui.walking = true;
      window.AscoltoMap.walk(from, id, function () { ui.walking = false; goRoom(id); });
      return;
    }
    if (chk.ok && id !== from && window.AscoltoPaint && window.AscoltoPaint.active && !$('paintWrap').hidden) {
      ui.walking = true;
      var doneW = false, go = function () { if (doneW) return; doneW = true; ui.walking = false; goRoom(id); };
      setTimeout(go, 4000); // seguro: nunca deixa o toque travado
      window.AscoltoPaint.walk(from, id, go);
      return;
    }
    goRoom(id);
  }
  $('rooms').addEventListener('click', onRoomClick);
  $('paintPins').addEventListener('click', onRoomClick);

  function goRoom(id) {
    var lang = state.lang;
    var r = E.moveTo(state, lang, id);
    if (!r.ok) { toast(r.msg); return; }
    ui.picked = null; ui.monPt = false; resetSpeak();
    save(); render();
    r.events.forEach(function (e) {
      if (e.type === 'rest') toast(e.healed ? '🏕️ Você descansou: +' + e.healed + ' ♥' : '🏕️ Você descansou, mas já estava com a vida cheia.');
    });
    autoplay();
  }

  // palavras da história no idioma estudado: toque mostra o significado
  document.addEventListener('click', function (ev) {
    var w = ev.target.closest && ev.target.closest('.mixw');
    if (!w) return;
    var id = w.getAttribute('data-w'), it = E.itemById(id);
    if (it && E.isUnlocked(state, state.lang, id)) { toast(E.speakText(it, state.lang) + ' = ' + it.pt); say(E.speakText(it, state.lang), state.lang); }
  });

  // toque numa peça equipada abre o inventário já nela
  function onSlotClick(ev, inInventory) {
    var b = ev.target.closest('[data-slot]');
    if (!b) return false;
    ui.slot = b.getAttribute('data-slot');
    if (inInventory) {
      var gv = E.gearView(state, state.lang);
      $('slotTip').innerHTML = slotDetail(gv, state.lang);
      var all = $('screen-inv').querySelectorAll('.pslot');
      for (var i = 0; i < all.length; i++) all[i].classList.toggle('sel', all[i].getAttribute('data-slot') === ui.slot);
    } else { ui.tab = 'inv'; render(); window.scrollTo(0, 0); }
    return true;
  }
  $('slotsBox').addEventListener('click', function (ev) { onSlotClick(ev, false); });
  $('storyBox').addEventListener('click', function (ev) {
    if (ev.target.closest('.mixw')) return;
    if (!ev.target.closest('.story.mini')) return;
    ui.loreOpen = !ui.loreOpen; renderMap();
  });

  $('newRun').addEventListener('click', function () { newRun(); });

  function newRun() {
    E.startRun(state, state.lang, curRun().week);
    ui.tab = 'map'; ui.picked = null; ui.slot = null; resetSpeak();
    save(); render(); window.scrollTo(0, 0);
  }

  $('paintHint').addEventListener('click', function (ev) {
    if (!ev.target.closest('[data-act="hint"],.ph-pop')) return;
    ui.hintOpen = !ui.hintOpen;
    var pop = $('paintHint').querySelector('.ph-pop'), b = $('paintHint').querySelector('.ph-btn');
    if (ui.hintOpen && !pop) { var d = document.createElement('div'); d.className = 'ph-pop'; d.setAttribute('role', 'status'); d.textContent = ui.hintText || ''; $('paintHint').appendChild(d); }
    else if (!ui.hintOpen && pop) pop.remove();
    b.setAttribute('aria-expanded', !!ui.hintOpen);
  });
  $('paintDay').addEventListener('click', function (ev) { onSimClick(ev); });
  $('simBox').addEventListener('click', function (ev) { onSimClick(ev); });
  function onSimClick(ev) {
    var tg = ev.target.closest('[data-act="simtoggle"]');
    if (tg) { ui.simOpen = !ui.simOpen; renderSim(); return; }
    var b = ev.target.closest('[data-simweek],[data-simday]');
    if (!b) return;
    var sm = E.sim(state);
    if (b.hasAttribute('data-simweek')) E.setSim(state, parseInt(b.getAttribute('data-simweek'), 10), 1);
    else E.setSim(state, null, parseInt(b.getAttribute('data-simday'), 10));
    ui.filter = 'all'; ui.flipped = {}; ui.slot = null; ui.hintMute = curRun().turn; ui.hintOpen = false;
    save(); render();
  }

  $('regionBox').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-region]');
    if (!b) return;
    var r = E.switchRegion(state, state.lang, parseInt(b.getAttribute('data-region'), 10));
    if (!r.ok) { toast(r.msg); return; }
    ui.slot = null; save(); render(); window.scrollTo(0, 0);
  });

  $('teach').addEventListener('click', function (ev) {
    var sb = ev.target.closest('[data-say]');
    if (sb) { say(E.speakText(E.itemById(sb.getAttribute('data-say')), state.lang), state.lang); return; }
    if (ev.target.closest('[data-act="teachok"]')) { E.teach(state, state.lang); save(); render(); window.scrollTo(0, 0); }
  });

  $('end').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-act]');
    if (!b) return;
    var run = curRun();
    if (b.getAttribute('data-act') === 'newrun') newRun();
    else if (b.getAttribute('data-act') === 'endinv') { ui.endSeen = run.id; ui.tab = 'inv'; render(); window.scrollTo(0, 0); }
  });

  $('equip').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act'), run = curRun();
    if (act === 'eqsay' && run.pendingLoot) sayItem(run.pendingLoot.item);
    else if (act === 'equipok') { E.takeLoot(state, state.lang); save(); render(); window.scrollTo(0, 0); }
  });

  $('screen-quiz').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act'), lang = state.lang;
    var run = curRun(), enc = run.enc;
    if (!enc) return;
    if (act === 'loretoggle') { if (ev.target.closest('.mixw')) return; ui.loreOpen = !ui.loreOpen; renderQuiz(); return; }
    if (act === 'opt') {
      if (enc.phase !== 'ask') return;
      var i = parseInt(b.getAttribute('data-i'), 10), ok = i === enc.q.correct;
      ui.picked = i;
      doAnswer(ok, ok ? E.autoGrade(enc.q.type, (Date.now() - ui.t0) / 1000) : 1, true);
    } else if (act === 'say') {
      if (enc.q.type === 'sentence') say(enc.q.line.text, lang); else sayItem(enc.q.itemId);
    } else if (act === 'sentmic') {
      if (enc.phase === 'ask') startSentence();
    } else if (act === 'sentsim') {
      if (enc.phase === 'ask') simulateSentence(parseInt(b.getAttribute('data-s'), 10));
    } else if (act === 'montoggle') {
      ui.monPt = !ui.monPt; renderQuiz();
    } else if (act === 'flee') {
      if (E.flee(state, lang)) { ui.picked = null; ui.monPt = false; resetSpeak(); save(); render(); }
    } else if (act === 'continue') {
      syncEnv();
      var r = E.advance(state, lang);
      ui.loreOpen = false;
      ui.picked = null; resetSpeak(); save();
      if (r.next === 'end') ui.endSeen = null;
      render(); window.scrollTo(0, 0);
      if (r.next === 'question') autoplay();
    } else if (act === 'listen') {
      startListening();
    } else if (act === 'reveal') {
      ui.speak.phase = 'revealed'; ui.speak.msg = ''; renderQuiz();
      sayItem(enc.q.itemId);
    } else if (act === 'grade') {
      var g = parseInt(b.getAttribute('data-g'), 10);
      doAnswer(g >= 2, g, false);
    }
  });

  function toggleCard(el) {
    var id = el.getAttribute('data-card');
    ui.flipped[id] = !ui.flipped[id];
    el.classList.toggle('flipped', !!ui.flipped[id]);
    el.setAttribute('aria-pressed', String(!!ui.flipped[id]));
  }

  $('screen-inv').addEventListener('click', function (ev) {
    var sb = ev.target.closest('[data-say]');
    if (sb) { ev.stopPropagation(); sayItem(sb.getAttribute('data-say')); return; }
    if (onSlotClick(ev, true)) return;
    var f = ev.target.closest('[data-filter]');
    if (f) { ui.filter = f.getAttribute('data-filter'); renderInv(); return; }
    var c = ev.target.closest('[data-card]');
    if (c) toggleCard(c);
    else if (ev.target.closest('.card.locked')) toast('Palavra liberada, mas ainda não encontrada. Abra baús e vença criaturas.');
  });
  $('screen-inv').addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    var c = ev.target.closest && ev.target.closest('[data-card]');
    if (c && ev.target === c) { ev.preventDefault(); toggleCard(c); }
  });

  render();
  autoplay();
})();
