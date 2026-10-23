/*
  Ascolto Masmorra: REGRAS DO JOGO (sem tela)
  ---------------------------------------------------------------
  Lógica pura: não mexe em DOM, voz ou armazenamento. Recebe os dados
  (data.js) e um objeto "state" simples (JSON) e devolve resultados.
  Para levar ao Next.js: importe este arquivo no servidor ou no cliente,
  guarde "state" numa linha do Supabase (jsonb) e pronto.

    var E = AscoltoEngine.create(DATA);
    var state = E.newState();
    E.startRun(state, 'it');
    E.moveTo(state, 'it', 2);          // entra numa sala (pode abrir um desafio)
    E.answer(state, 'it', true, 3);    // resolve a pergunta (nota 1 a 4, como no Anki)
    E.advance(state, 'it');            // próximo turno ou volta ao mapa

  Curso: o jogo só usa palavras LIBERADAS pelo roteiro. A liberação depende da semana e do dia
  (state.sim = {week, day}; no protótipo o jogador simula, no app vem do progresso real do curso):
    E.setSim(state, 2, 3);            // semana 2, dia 3 do roteiro
    E.isUnlocked(state, 'it', 'lua'); // a palavra já foi liberada?
  Palavras fixas do jogo (chave, baú, poção, espada, mochila) são ensinadas antes da 1ª masmorra (E.teach).

  Repetição espaçada: agendador no estilo Anki (SM-2): passos de aprendizado
  em minutos, depois intervalos em dias com fator de facilidade por palavra.
  Notas: 1 Errei, 2 Difícil, 3 Bom, 4 Fácil.
*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AscoltoEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MIN = 60000, DAY = 86400000;

  function create(D, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random;
    var now = opts.now || function () { return Date.now(); };
    var env = { audio: true }; // a tela avisa se o aparelho tem voz para o idioma
    var C = D.config, S = C.srs;

    var itemsById = {}, monstersById = {}, roomsById = {}, gearBySlot = {};
    D.items.forEach(function (i) { itemsById[i.id] = i; });
    D.monsters.forEach(function (m) { monstersById[m.id] = m; });
    D.dungeon.rooms.forEach(function (r) { roomsById[r.id] = r; });
    D.gear.forEach(function (g) { gearBySlot[g.slot] = g; });
    var bossRoom = D.dungeon.rooms.filter(function (r) { return r.type === 'boss'; })[0];
    var CO = D.course, weeksById = {}, srcInfo = CO.sources;
    CO.weeks.forEach(function (w) { weeksById[w.id] = w; });
    var coreIds = CO.core.words;

    function rand(n) { return Math.floor(rng() * n); }
    function shuffle(a) {
      a = a.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = rand(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    }
    function pickW(list, wf) {
      var tot = 0;
      var ws = list.map(function (x) { var w = wf(x); tot += w; return w; });
      var r = rng() * tot;
      for (var i = 0; i < list.length; i++) { r -= ws[i]; if (r < 0) return list[i]; }
      return list[list.length - 1];
    }

    /* ---------- agendador estilo Anki ---------- */

    function fmtSpan(ms) {
      if (ms <= 30000) return 'agora';
      var m = ms / MIN;
      if (m < 60) return Math.max(1, Math.round(m)) + ' min';
      var h = m / 60;
      if (h < 24) return Math.round(h) + ' h';
      var d = h / 24;
      if (d < 30) return Math.round(d) + ' d';
      if (d < 365) { var mo = Math.round(d / 30); return mo + (mo === 1 ? ' mês' : ' meses'); }
      return (Math.round(d / 36.5) / 10) + ' a';
    }

    function graduate(c, ivl, t) {
      c.st = 'review'; c.step = 0; c.ivl = ivl; c.due = t + ivl * DAY;
    }

    // nota: 1 errei, 2 difícil, 3 bom, 4 fácil. Devolve um cartão novo (não altera o original).
    function schedule(card, grade, t) {
      var c = {
        st: card.st || 'new', step: card.step || 0, ease: card.ease || S.startEase,
        ivl: card.ivl || 0, due: card.due || t, reps: (card.reps || 0) + 1, lapses: card.lapses || 0, last: t
      };
      var steps;
      if (c.st === 'new' || c.st === 'learn') {
        steps = S.learnSteps;
        if (grade === 1) { c.st = 'learn'; c.step = 0; c.due = t + steps[0] * MIN; }
        else if (grade === 2) {
          c.st = 'learn';
          var d = (c.step === 0 && steps.length > 1) ? (steps[0] + steps[1]) / 2 : steps[Math.min(c.step, steps.length - 1)];
          c.due = t + d * MIN;
        } else if (grade === 3) {
          var nx = c.step + 1;
          if (nx < steps.length) { c.st = 'learn'; c.step = nx; c.due = t + steps[nx] * MIN; }
          else graduate(c, S.gradIvl, t);
        } else graduate(c, S.easyIvl, t);
      } else if (c.st === 'review') {
        if (grade === 1) {
          c.lapses++;
          c.ease = Math.max(S.minEase, c.ease - 0.2);
          c.st = 'relearn'; c.step = 0;
          c.ivl = Math.max(1, Math.round(c.ivl * S.lapseNewIvl));
          c.due = t + S.lapseSteps[0] * MIN;
        } else {
          var base = c.ivl, n;
          if (grade === 2) { n = Math.max(base + 1, base * S.hardFactor); c.ease = Math.max(S.minEase, c.ease - 0.15); }
          else if (grade === 3) { n = Math.max(base + 1, base * c.ease); }
          else { n = Math.max(base + 1, base * c.ease * S.easyBonus); c.ease += 0.15; }
          c.ivl = Math.min(S.maxIvl, Math.max(1, Math.round(n)));
          c.due = t + c.ivl * DAY;
        }
      } else { // relearn
        steps = S.lapseSteps;
        if (grade === 1) { c.step = 0; c.due = t + steps[0] * MIN; }
        else if (grade === 2) { c.due = t + steps[Math.min(c.step, steps.length - 1)] * MIN; }
        else {
          var nr = c.step + 1;
          if (nr < steps.length) { c.step = nr; c.due = t + steps[nr] * MIN; }
          else { c.st = 'review'; c.step = 0; c.ivl = Math.max(1, c.ivl); c.due = t + c.ivl * DAY; }
        }
      }
      return c;
    }

    function dayKey(t) { var d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

    /* ---------- estado ---------- */

    function newState() { return { v: 1, lang: null, sim: { week: 1, day: 1 }, langs: {} }; }

    function simOf(state) {
      if (!state.sim) state.sim = { week: 1, day: 1 };
      var sm = state.sim;
      sm.week = Math.max(1, Math.min(CO.betaWeeks || CO.weeks.length, Math.round(sm.week) || 1));
      sm.day = Math.max(1, Math.min(CO.days, Math.round(sm.day) || 1));
      return sm;
    }

    // palavras de uma semana (por idioma, se a semana tiver lista própria)
    function wordsOf(week, lang) {
      return (week.wordsByLang && week.wordsByLang[lang]) || week.words;
    }
    function wordDay(w) { return w.day || (srcInfo[w.src] ? srcInfo[w.src].day : 1); }

    // tudo o que o aluno já viu neste idioma: vocabulário fixo (depois da mochila) + semanas passadas + semana atual até o dia
    function unlockedSet(state, lang) {
      var L = langState(state, lang), sm = simOf(state), set = {};
      if (L.coreDone) coreIds.forEach(function (id) { set[id] = true; });
      CO.weeks.forEach(function (w) {
        if (w.id > sm.week) return;
        wordsOf(w, lang).forEach(function (x) {
          if (w.id < sm.week || wordDay(x) <= sm.day) set[x.item] = true;
        });
      });
      return set;
    }
    function isUnlocked(state, lang, id) { return !!unlockedSet(state, lang)[id]; }

    // de onde veio a palavra: { core } ou { week, day, src, srcLabel }
    function wordMeta(lang, id) {
      if (coreIds.indexOf(id) >= 0) return { core: true, srcLabel: CO.core.title };
      for (var i = 0; i < CO.weeks.length; i++) {
        var ws = wordsOf(CO.weeks[i], lang);
        for (var j = 0; j < ws.length; j++) {
          if (ws[j].item === id) return { week: CO.weeks[i].id, day: wordDay(ws[j]), src: ws[j].src, srcLabel: (srcInfo[ws[j].src] || {}).label || '' };
        }
      }
      return null;
    }

    function langState(state, lang) {
      if (!state.langs) state.langs = {};
      var L = state.langs[lang];
      if (!L) L = state.langs[lang] = { owned: {}, stats: {}, cards: {}, today: { d: '', n: 0 }, runsDone: 0, wins: 0, run: null, parked: {}, coreDone: false };
      if (!L.parked) L.parked = {};
      if (!L.cards) { // migra do formato antigo (fila "review") para cartões
        L.cards = {};
        var t = now();
        Object.keys(L.review || {}).forEach(function (id) {
          L.cards[id] = { st: 'learn', step: 0, ease: S.startEase, ivl: 0, due: t, reps: 1, lapses: 1, last: t };
        });
        Object.keys(L.owned || {}).forEach(function (id) {
          if (!L.cards[id]) L.cards[id] = { st: 'learn', step: 1, ease: S.startEase, ivl: 0, due: t, reps: 1, lapses: 0, last: t };
        });
        delete L.review;
      }
      if (!L.today) L.today = { d: '', n: 0 };
      if (L.run && L.run.v !== 3) L.run = null; // masmorra antiga: começa uma nova
      Object.keys(L.parked).forEach(function (k) { if (!L.parked[k] || L.parked[k].v !== 3) delete L.parked[k]; });
      return L;
    }

    // Cada semana do curso abre uma região da masmorra (mesmo mapa, tema, monstros e lore próprios).
    function startRun(state, lang, week) {
      var L = langState(state, lang), sm = simOf(state);
      week = Math.max(1, Math.min(sm.week, week || sm.week));
      var W = weeksById[week];
      var rooms = {};
      D.dungeon.rooms.forEach(function (r) {
        var rs = { done: false };
        if (r.type === 'monster' || r.type === 'boss') {
          var pool = r.role === 'boss' ? [W.monsters.boss] : (W.monsters[r.role] || W.monsters.minion);
          rs.monster = pool[rand(pool.length)];
          rs.hp = r.hp;
        }
        rooms[r.id] = rs;
      });
      L.run = {
        v: 3, week: week,
        id: now() + '-' + rand(1e6),
        n: L.runsDone + 1,
        status: 'active',
        hp: C.maxHp, maxHp: C.maxHp,
        turn: 0,
        at: D.dungeon.start,
        visited: [D.dungeon.start],
        rooms: rooms,
        gear: {},
        pendingLoot: null,
        asked: [], gained: [],
        right: 0, wrong: 0,
        lastType: null, lastItem: null,
        enc: null
      };
      return L.run;
    }

    function gearCount(run) { return Object.keys(run.gear).length; }

    // Garante uma masmorra válida para a semana simulada (se a semana voltar, a região fecha).
    function ensureRun(state, lang) {
      var L = langState(state, lang), sm = simOf(state);
      if (L.run && L.run.week > sm.week) {
        if (L.run.status === 'active') L.parked[L.run.week] = L.run;
        L.run = null;
      }
      if (!L.run) {
        var p = L.parked[sm.week];
        if (p && p.status === 'active') { L.run = p; delete L.parked[sm.week]; }
        else startRun(state, lang, sm.week);
      }
      return L.run;
    }

    // Troca de região (semana aberta). A masmorra em andamento fica guardada.
    function switchRegion(state, lang, week) {
      var L = langState(state, lang), sm = simOf(state);
      if (!weeksById[week]) return { ok: false, msg: 'Essa região não existe.' };
      if (CO.betaWeeks && week > CO.betaWeeks) return { ok: false, msg: 'Em breve: esta semana ainda está sendo criada.' };
      if (week > sm.week) return { ok: false, msg: 'Essa região ainda não abriu.' };
      ensureRun(state, lang);
      if (L.run.week === week) return { ok: true };
      if (L.run.enc) return { ok: false, msg: 'Termine o desafio primeiro.' };
      if (L.run.status === 'active') L.parked[L.run.week] = L.run;
      var p = L.parked[week];
      if (p && p.status === 'active') { L.run = p; delete L.parked[week]; }
      else startRun(state, lang, week);
      return { ok: true };
    }

    function setSim(state, week, day) {
      var sm = simOf(state), prev = sm.week;
      if (week != null) sm.week = week;
      if (day != null) sm.day = day;
      simOf(state);
      Object.keys(state.langs).forEach(function (l) {
        ensureRun(state, l);
        var run = state.langs[l].run;
        // semana nova abre a região nova (a masmorra anterior fica guardada)
        if (sm.week > prev && run && !run.enc && run.week < sm.week) switchRegion(state, l, sm.week);
      });
      return state.sim;
    }

    // Mochila do Escriba: ensina o vocabulário fixo antes da primeira masmorra.
    function teach(state, lang) {
      var L = langState(state, lang), t = now();
      coreIds.forEach(function (id) {
        if (!L.owned[id]) L.owned[id] = { n: 1, first: t };
        if (!L.cards[id]) L.cards[id] = schedule({ st: 'new' }, 1, t);
      });
      L.coreDone = true;
      return true;
    }

    function weeksView(state, lang) {
      var sm = simOf(state), L = langState(state, lang);
      return CO.weeks.map(function (w) {
        var ws = wordsOf(w, lang), un = 0;
        ws.forEach(function (x) { if (w.id < sm.week || (w.id === sm.week && wordDay(x) <= sm.day)) un++; });
        var song = (w.song && w.song[lang]) || null;
        return {
          id: w.id, name: w.region.name, emoji: w.region.emoji, bg: w.region.bg, floor: w.region.floor, accent: w.region.accent,
          song: song, soon: !!CO.betaWeeks && w.id > CO.betaWeeks, open: w.id <= sm.week, current: w.id === sm.week,
          total: ws.length, unlocked: un, active: !!(L.run && L.run.week === w.id),
          parked: !!L.parked[w.id]
        };
      });
    }

    // o que o roteiro libera em cada dia da semana atual (para a tela mostrar de onde vêm as palavras)
    function dayPlan(state, lang) {
      var sm = simOf(state), W = weeksById[sm.week], out = [];
      for (var d = 1; d <= CO.days; d++) {
        var labels = {};
        wordsOf(W, lang).forEach(function (x) { if (wordDay(x) === d) labels[(srcInfo[x.src] || {}).label || x.src] = (labels[(srcInfo[x.src] || {}).label || x.src] || 0) + 1; });
        out.push({ day: d, items: Object.keys(labels).map(function (k) { return k + ' (' + labels[k] + ')'; }) });
      }
      return out;
    }

    /* ---------- mapa ---------- */

    function needsEncounter(run, room) {
      var rs = run.rooms[room.id];
      return !rs.done && (room.type === 'chest' || room.type === 'monster' || room.type === 'boss');
    }

    function isLocked(run, room) {
      return !!(room.requires && room.requires.gear > gearCount(run) && !run.rooms[room.id].done);
    }

    // Regiões com mapa pintado podem trazer as ligações na ordem do caminho desenhado (region.paint.links)
    function linksOf(run, room) {
      var w = weeksById[run.week], pl = w && w.region && w.region.paint && w.region.paint.links;
      return (pl && pl[room.id]) || room.links;
    }

    function mapView(state, lang) {
      var run = langState(state, lang).run;
      var visited = {}, known = {};
      run.visited.forEach(function (id) {
        visited[id] = true; known[id] = true;
        linksOf(run, roomsById[id]).forEach(function (n) { known[n] = true; });
      });
      var cur = roomsById[run.at];
      return D.dungeon.rooms.map(function (r) {
        var rs = run.rooms[r.id];
        var reach = !run.enc && run.status === 'active' &&
          (linksOf(run, cur).indexOf(r.id) >= 0 || (r.id === run.at && needsEncounter(run, r)));
        return {
          id: r.id, type: r.type, x: r.x, y: r.y, w: r.w || 76, h: r.h || 56, links: linksOf(run, r),
          visited: !!visited[r.id], known: !!known[r.id], current: r.id === run.at,
          done: !!rs.done, reach: reach, locked: isLocked(run, r), monster: rs.monster || null,
          loot: r.loot || null
        };
      });
    }

    function canMove(state, lang, roomId) {
      var run = langState(state, lang).run;
      if (!langState(state, lang).coreDone) return { ok: false, msg: 'Abra a mochila primeiro: aprenda as 5 palavras do jogo.' };
      if (!run || run.status !== 'active') return { ok: false, msg: 'A masmorra terminou. Comece uma nova.' };
      if (run.enc) return { ok: false, msg: 'Termine o desafio primeiro.' };
      var room = roomsById[roomId];
      if (!room) return { ok: false, msg: '' };
      var cur = roomsById[run.at];
      if (roomId !== run.at && linksOf(run, cur).indexOf(roomId) < 0) return { ok: false, msg: 'Essa sala não está ligada à sua.' };
      if (isLocked(run, room)) {
        return { ok: false, msg: 'Porta do chefe trancada: equipe ' + room.requires.gear + ' peças (' + gearCount(run) + '/' + room.requires.gear + ').' };
      }
      if (roomId === run.at && !needsEncounter(run, room)) return { ok: false, msg: '' };
      return { ok: true };
    }

    function moveTo(state, lang, roomId) {
      var chk = canMove(state, lang, roomId);
      if (!chk.ok) return chk;
      var L = langState(state, lang), run = L.run;
      var room = roomsById[roomId], rs = run.rooms[roomId], events = [];
      var from = run.at;
      if (roomId !== run.at) {
        run.at = roomId;
        run.turn++;
        if (run.visited.indexOf(roomId) < 0) run.visited.push(roomId);
      }
      if (room.type === 'rest' && !rs.done) {
        rs.done = true;
        var heal = Math.min(C.restHeal, run.maxHp - run.hp);
        run.hp += heal;
        events.push({ type: 'rest', healed: heal });
      }
      if (needsEncounter(run, room)) {
        run.enc = { room: roomId, kind: room.type, from: from, phase: 'ask', q: null, result: null };
        run.enc.q = makeQuestion(L, run, room, lang, unlockedSet(state, lang));
        events.push({ type: 'encounter', kind: room.type });
      }
      return { ok: true, events: events };
    }

    /* ---------- perguntas (fila no estilo Anki) ---------- */

    function pickNew(L, tier, unl, week) {
      var fresh = D.items.filter(function (i) { return unl[i.id] && !L.cards[i.id]; });
      if (!fresh.length) return null;
      // o loot da região são as palavras da própria música: prioriza as da semana da região
      var mine = fresh.filter(function (i) { var m = metaCache(i.id); return m && m.week === week; });
      if (mine.length) fresh = mine;
      var table = C.loot[String(tier)] || C.loot['0'];
      var rars = Object.keys(table).filter(function (r) { return fresh.some(function (i) { return i.rarity === r; }); });
      var pool = fresh;
      if (rars.length) {
        var rar = pickW(rars, function (r) { return table[r]; });
        pool = fresh.filter(function (i) { return i.rarity === rar; });
      }
      return pool[rand(pool.length)];
    }

    // Ordem: aprendizado vencido, revisões vencidas, palavras novas (limite diário),
    // aprendizado "adiantado" (até aheadMin), e por fim prática extra sem mexer no agendamento.
    var curLang = null;
    function metaCache(id) { return wordMeta(curLang, id); }

    function pickCard(L, run, tier, unl) {
      var t = now();
      var day = dayKey(t);
      if (L.today.d !== day) L.today = { d: day, n: 0 };
      var learn = [], rev = [], ahead = [];
      Object.keys(L.cards).forEach(function (id) {
        if (!itemsById[id] || !unl[id] || id === run.lastItem) return;
        var c = L.cards[id];
        if (c.st === 'learn' || c.st === 'relearn') {
          if (c.due <= t) learn.push(id);
          else if (c.due <= t + S.aheadMin * MIN) ahead.push(id);
        } else if (c.st === 'review' && c.due <= t) rev.push(id);
      });
      function byDue(a, b) { return L.cards[a].due - L.cards[b].due; }
      learn.sort(byDue); rev.sort(byDue); ahead.sort(byDue);
      var newLeft = S.newPerDay - L.today.n;
      if (learn.length) return { item: itemsById[learn[0]], practice: false, fresh: false };
      if (rev.length && (newLeft <= 0 || rng() < S.reviewShare)) return { item: itemsById[rev[0]], practice: false, fresh: false };
      if (newLeft > 0) {
        var nw = pickNew(L, tier, unl, run.week);
        if (nw) { L.today.n++; return { item: nw, practice: false, fresh: true }; }
      }
      if (ahead.length) return { item: itemsById[ahead[0]], practice: false, fresh: false };
      if (rev.length) return { item: itemsById[rev[0]], practice: false, fresh: false };
      var all = Object.keys(L.cards).filter(function (id) { return itemsById[id] && unl[id] && id !== run.lastItem; }).sort(byDue).slice(0, 8);
      if (all.length) return { item: itemsById[all[rand(all.length)]], practice: true, fresh: false };
      var any = Object.keys(unl).filter(function (id) { return itemsById[id]; });
      return { item: itemsById[any[rand(any.length)]], practice: true, fresh: false };
    }

    function pickType(run) {
      var types = Object.keys(C.challengeWeights).filter(function (t) { return t !== 'listen' || env.audio; });
      var cand = types.filter(function (t) { return t !== run.lastType; });
      if (!cand.length) cand = types;
      var t = pickW(cand, function (k) { return C.challengeWeights[k]; });
      run.lastType = t;
      return t;
    }

    /* ---------- chefe: duelo de frases (o aluno fala, um avaliador dá a nota) ---------- */

    // "Il lupo@lobo vede la luna@lua." -> palavras (t) e, nas palavras do curso, o id (id)
    function parseLine(raw, lang) {
      var toks = String(raw.t).split(' ').map(function (p) {
        var m = /^(.*?)@([a-z-]+)(.*)$/.exec(p);
        return m ? { t: m[1] + m[3], w: m[1], id: m[2] } : { t: p, w: p, id: null };
      });
      var ids = [];
      toks.forEach(function (k) { if (k.id && ids.indexOf(k.id) < 0) ids.push(k.id); });
      return { pt: raw.pt, tok: toks, ids: ids, text: toks.map(function (k) { return k.t; }).join(lang === 'ja' ? '' : ' ') };
    }

    function bossLines(lang, week, unl) {
      var W = weeksById[week], src = W && W.boss && W.boss.lines && W.boss.lines[lang];
      if (!src) return [];
      return src.map(function (r) { return parseLine(r, lang); }).filter(function (ln) {
        return ln.ids.length && ln.ids.every(function (id) { return itemsById[id] && unl[id]; });
      });
    }

    function makeSentence(run, room, lang, unl) {
      var avail = bossLines(lang, run.week, unl);
      if (!avail.length) return null;
      var rs = run.rooms[room.id];
      var idx = Math.max(0, (room.hp || 1) - rs.hp) % avail.length; // errou: repete a mesma frase
      return { type: 'sentence', itemId: avail[idx].ids[0], line: avail[idx], practice: false, fresh: false };
    }

    function makeQuestion(L, run, room, lang, unl) {
      curLang = lang;
      if (room.type === 'boss') {
        var sq = makeSentence(run, room, lang, unl);
        if (sq) { run.lastItem = sq.itemId; return sq; }
      }
      var pick = pickCard(L, run, room.tier, unl);
      var item = pick.item;
      run.asked.push(item.id);
      run.lastItem = item.id;
      var type = pickType(run);
      var q = { type: type, itemId: item.id, practice: !!pick.practice, fresh: !!pick.fresh };
      if (type === 'meaning' || type === 'listen') {
        var others = shuffle(D.items.filter(function (x) { return unl[x.id] && x.id !== item.id && x.pt !== item.pt; })).slice(0, 3);
        var opts2 = shuffle([item].concat(others)).map(function (x) { return x.id; });
        q.options = opts2;
        q.correct = opts2.indexOf(item.id);
      }
      return q;
    }

    /* ---------- equipamento ---------- */

    function grantLoot(L, run, room, res) {
      var g = room.loot && gearBySlot[room.loot];
      if (!g || run.gear[g.slot]) return;
      var before = gearCount(run);
      run.gear[g.slot] = { item: g.item, rarity: g.rarity, room: room.id };
      // peças de equipamento são só em português (não ensinam palavra); a espada usa a palavra fixa do jogo
      res.loot = { slot: g.slot, item: g.item || null, img: g.img || null, name: g.name, rarity: g.rarity, emoji: g.emoji, flavor: g.flavor, count: gearCount(run) };
      var need = bossRoom && bossRoom.requires ? bossRoom.requires.gear : 0;
      res.loot.bossOpened = !!need && before < need && gearCount(run) >= need;
      run.pendingLoot = res.loot;
    }

    function takeLoot(state, lang) {
      var run = langState(state, lang).run;
      if (!run || !run.pendingLoot) return null;
      var l = run.pendingLoot;
      run.pendingLoot = null;
      return l;
    }

    function gearView(state, lang) {
      var run = langState(state, lang).run;
      return D.gear.map(function (g) {
        var eq = run.gear[g.slot];
        var room = D.dungeon.rooms.filter(function (r) { return r.loot === g.slot; })[0];
        return {
          slot: g.slot, label: g.label, name: g.name, img: g.img || null, emoji: g.emoji, rarity: g.rarity, item: g.item || null, flavor: g.flavor,
          equipped: !!eq, room: room ? room.id : null, guard: room ? room.type : null
        };
      });
    }

    /* ---------- resposta ---------- */

    // grade: 1..4 (Anki). auto=true: nota calculada pelo tempo de resposta; palavra nova não vira "Fácil".
    function answer(state, lang, correct, grade, auto) {
      var L = langState(state, lang), run = L.run, enc = run && run.enc;
      if (!enc || enc.phase !== 'ask') return null;
      if (enc.q.type === 'sentence') {
        var bad = [];
        if (!correct) enc.q.line.tok.forEach(function (k, i) { if (k.id) bad.push(i); });
        return gradeSentence(state, lang, { score: correct ? (grade === 4 ? 95 : 80) : 30, heard: '', bad: bad });
      }
      var item = itemsById[enc.q.itemId];
      var room = roomsById[enc.room], rs = run.rooms[enc.room];
      var g = correct ? ((grade >= 2 && grade <= 4) ? grade : 3) : 1;
      var ok = g >= 2;
      var t = now();
      var card = L.cards[item.id];
      var wasNew = !card;
      if (auto && wasNew && g === 4) g = 3;
      var res = {
        correct: ok, grade: g, itemId: item.id, isNew: false, fresh: wasNew, practice: !!enc.q.practice, next: null,
        monsterDown: false, bossDown: false, chestOpened: false, trap: false,
        dmgToHero: 0, heroDown: false, loot: null
      };
      run.turn++;
      var st = L.stats[item.id] || (L.stats[item.id] = { right: 0, wrong: 0, streak: 0 });

      if (!enc.q.practice) {
        var nc = schedule(card || { st: 'new' }, g, t);
        L.cards[item.id] = nc;
        res.next = fmtSpan(nc.due - t);
      }

      if (ok) {
        st.right++; st.streak++; run.right++;
        if (!L.owned[item.id]) {
          L.owned[item.id] = { n: 1, first: t };
          res.isNew = true;
          run.gained.push(item.id);
        } else {
          L.owned[item.id].n++;
        }
        if (enc.kind === 'chest') {
          rs.done = true; res.chestOpened = true;
        } else {
          rs.hp--;
          if (rs.hp <= 0) {
            rs.done = true; res.monsterDown = true;
            if (room.type === 'boss') {
              res.bossDown = true; run.status = 'won'; L.wins++; L.runsDone++;
            }
          }
        }
        if (rs.done) grantLoot(L, run, room, res);
      } else {
        st.wrong++; st.streak = 0; run.wrong++;
        var dmg = enc.kind === 'chest' ? C.trapDmg : (room.dmg || C.monsterDmg);
        if (enc.kind === 'chest') res.trap = true;
        run.hp = Math.max(0, run.hp - dmg);
        res.dmgToHero = dmg;
        if (run.hp <= 0) { res.heroDown = true; run.status = 'lost'; L.runsDone++; }
      }
      enc.phase = 'result';
      enc.result = res;
      return res;
    }

    // ev = { score: 0-100, heard: texto entendido, bad: [índices das palavras que não saíram claras] }
    // É o mesmo formato que o avaliador de fala do app devolve.
    function gradeSentence(state, lang, ev) {
      var L = langState(state, lang), run = L.run, enc = run && run.enc;
      if (!enc || enc.phase !== 'ask' || !enc.q || enc.q.type !== 'sentence') return null;
      var B = C.boss || { hit: 60, crit: 85 };
      var line = enc.q.line, room = roomsById[enc.room], rs = run.rooms[enc.room];
      var score = Math.max(0, Math.min(100, Math.round(Number(ev && ev.score) || 0)));
      var bad = ((ev && ev.bad) || []).filter(function (i) { return line.tok[i] && line.tok[i].id; });
      var ok = score >= B.hit, crit = score >= B.crit;
      var t = now();
      var badIds = {};
      bad.forEach(function (i) { badIds[line.tok[i].id] = 1; });
      line.ids.forEach(function (id) {
        var st = L.stats[id] || (L.stats[id] = { right: 0, wrong: 0, streak: 0 });
        var card = L.cards[id];
        if (badIds[id] || !ok) {
          st.wrong++; st.streak = 0;
          L.cards[id] = schedule(card || { st: 'new' }, 1, t); // palavra que não saiu clara volta logo
        } else {
          st.right++; st.streak++;
          if (card) L.cards[id] = schedule(card, crit ? 4 : 3, t);
        }
      });
      var res = {
        correct: ok, grade: ok ? (crit ? 4 : 3) : 1, itemId: line.ids[0], isNew: false, fresh: false, practice: false, next: null,
        monsterDown: false, bossDown: false, chestOpened: false, trap: false, dmgToHero: 0, heroDown: false, loot: null,
        sentence: true, score: score, crit: crit, heard: String((ev && ev.heard) || ''), bad: bad, pt: line.pt
      };
      run.turn++;
      if (ok) {
        run.right++;
        rs.hp--;
        if (rs.hp <= 0) { rs.done = true; res.monsterDown = true; res.bossDown = true; run.status = 'won'; L.wins++; L.runsDone++; }
        if (rs.done) grantLoot(L, run, room, res);
      } else {
        run.wrong++;
        var dmg = room.dmg || C.monsterDmg;
        run.hp = Math.max(0, run.hp - dmg);
        res.dmgToHero = dmg;
        if (run.hp <= 0) { res.heroDown = true; run.status = 'lost'; L.runsDone++; }
      }
      enc.phase = 'result';
      enc.result = res;
      return res;
    }

    // Avaliação local simples (reconhecimento do navegador): compara o que foi dito com a frase.
    // No app real, troque por o avaliador de IA: ele só precisa devolver { score, heard, bad }.
    function scoreSpoken(lang, line, transcripts) {
      var list = (transcripts || []).filter(Boolean), best = { score: 0, heard: list[0] || '', bad: [] };
      list.forEach(function (tr) {
        var heardAll = lang === 'ja' ? normJa(tr) : normLatin(tr);
        var words = lang === 'ja' ? [] : String(tr).split(/\s+/).map(normLatin).filter(Boolean);
        var bad = [], okN = 0;
        line.tok.forEach(function (k, i) {
          var x = lang === 'ja' ? normJa(k.w) : normLatin(k.w), hit = false;
          if (!x) { okN++; return; }
          if (lang === 'ja') {
            hit = heardAll.indexOf(x) >= 0;
            if (!hit && k.id && itemsById[k.id]) hit = matchSpoken(itemsById[k.id], lang, [tr]);
          } else {
            var tol = x.length <= 3 ? 0 : (x.length <= 6 ? 1 : 2);
            hit = heardAll.indexOf(x) >= 0 || words.some(function (w) { return lev(w, x) <= tol; });
          }
          if (hit) okN++; else bad.push(i);
        });
        var sc = Math.round(100 * okN / line.tok.length);
        if (lang === 'ja') {
          var tgt = normJa(line.tok.map(function (k) { return k.w; }).join(''));
          if (tgt) sc = Math.max(sc, Math.round(100 * (1 - lev(heardAll, tgt) / Math.max(tgt.length, heardAll.length, 1))));
        }
        if (sc >= best.score) best = { score: sc, heard: tr, bad: bad };
      });
      return best;
    }

    function advance(state, lang) {
      var L = langState(state, lang), run = L.run, enc = run && run.enc;
      if (!enc || enc.phase !== 'result') return { next: 'none' };
      if (run.status !== 'active') { run.enc = null; return { next: 'end' }; }
      var rs = run.rooms[enc.room];
      if ((enc.kind === 'monster' || enc.kind === 'boss') && !rs.done) {
        enc.phase = 'ask';
        enc.result = null;
        enc.q = makeQuestion(L, run, roomsById[enc.room], lang, unlockedSet(state, lang));
        return { next: 'question' };
      }
      run.enc = null;
      return { next: 'map' };
    }

    function flee(state, lang) {
      var L = langState(state, lang), run = L.run, enc = run && run.enc;
      if (!enc || enc.phase !== 'ask') return false;
      if (enc.kind !== 'chest') { run.at = enc.from; run.turn++; }
      run.enc = null;
      return true;
    }

    /* ---------- cartões: informações para a tela ---------- */

    function cardInfo(state, lang, id) {
      var L = langState(state, lang), c = L.cards[id], t = now();
      if (!c) return { st: 'new', stLabel: 'Nova', ivl: 0, dueLabel: '', isDue: false, stars: 0 };
      var isDue = c.due <= t + 30000;
      var stars = 0;
      if (c.st === 'review') stars = c.ivl >= 21 ? 3 : 2;
      else if (c.st === 'relearn' || c.step >= 1) stars = 1;
      var labels = { new: 'Nova', learn: 'Aprendendo', review: 'Revisão', relearn: 'Reaprendendo' };
      return {
        st: c.st, stLabel: labels[c.st], ivl: c.ivl, ease: c.ease, lapses: c.lapses,
        isDue: isDue, dueLabel: isDue ? 'agora' : 'em ' + fmtSpan(c.due - t), stars: stars
      };
    }

    // rótulos dos 4 botões (Errei, Difícil, Bom, Fácil) para a palavra
    function preview(state, lang, id) {
      var L = langState(state, lang), t = now();
      var base = L.cards[id] || { st: 'new' };
      return [1, 2, 3, 4].map(function (g) { var n = schedule(base, g, t); return fmtSpan(n.due - t); });
    }

    // nota automática pelo tempo de resposta (acerto rápido = Fácil, acerto lento = Difícil)
    function autoGrade(type, seconds) {
      var T = S.timing;
      var easy = type === 'listen' ? T.easyListen : T.easyMeaning;
      var hard = type === 'listen' ? T.hardListen : T.hardMeaning;
      return seconds < easy ? 4 : (seconds > hard ? 2 : 3);
    }

    function summary(state, lang) {
      var L = langState(state, lang), t = now(), unl = unlockedSet(state, lang);
      var learning = 0, review = 0, due = 0, mature = 0, owned = 0, fresh = 0, upcoming = 0, sm = simOf(state);
      Object.keys(unl).forEach(function (id) { if (!L.cards[id]) fresh++; if (L.owned[id]) owned++; });
      wordsOf(weeksById[sm.week], lang).forEach(function (x) { if (wordDay(x) > sm.day) upcoming++; });
      Object.keys(L.cards).forEach(function (id) {
        if (!unl[id]) return;
        var c = L.cards[id];
        if (c.st === 'review') { review++; if (c.ivl >= 21) mature++; } else learning++;
        if (c.due <= t + 30000) due++;
      });
      var day = dayKey(t);
      var usedNew = L.today.d === day ? L.today.n : 0;
      return {
        owned: owned, total: Object.keys(unl).length, fresh: fresh, upcoming: upcoming,
        learning: learning, review: review, mature: mature, due: due,
        newLeft: Math.max(0, S.newPerDay - usedNew)
      };
    }

    /* ---------- história: mistura de idiomas ---------- */

    function storyKey(run) {
      if (run.status === 'won') return 'win';
      if (run.status === 'lost') return 'lose';
      return String(run.at);
    }

    function tokenize(s, unl) {
      var out = [], re = /\{([^|}]*)\|([a-z0-9-]+)\}/g, last = 0, m;
      while ((m = re.exec(s))) {
        if (m.index > last) out.push({ t: 'txt', v: s.slice(last, m.index) });
        out.push({ t: 'w', id: m[2], art: m[1], tl: !!unl[m[2]] });
        last = re.lastIndex;
      }
      if (last < s.length) out.push({ t: 'txt', v: s.slice(last) });
      return out;
    }

    // Trecho da história da região: as palavras marcadas aparecem em português até serem liberadas.
    function storyView(state, lang) {
      var L = langState(state, lang), run = L.run, unl = unlockedSet(state, lang);
      var W = weeksById[run.week], key = storyKey(run);
      var beat = key === 'lose' ? D.story.lose : W.beats[key];
      var tot = 0, on = 0;
      Object.keys(W.beats).forEach(function (k) {
        tokenize(W.beats[k].text, unl).forEach(function (tk) { if (tk.t === 'w') { tot++; if (tk.tl) on++; } });
      });
      return {
        key: key, week: W.id, region: W.region, chapter: W.region.floor + ' · ' + W.region.name, title: beat.title,
        tokens: tokenize(beat.text, unl), mix: tot ? on / tot : 0, inLang: on, ofLang: tot, run: run.n
      };
    }

    function introView() {
      return { title: D.story.intro.title, text: D.story.intro.text };
    }

    // palavras fixas do jogo para a tela da mochila
    function coreView() { return coreIds.map(function (id) { return itemsById[id]; }); }

    /* ---------- apoio ---------- */

    function speakText(entry, lang) {
      var n = entry.names[lang];
      if (lang === 'ja') return n.kana;
      return n.article + (/['’]$/.test(n.article) ? '' : ' ') + n.word;
    }

    function normLatin(s) {
      return String(s || '').toLowerCase().replace(/ß/g, 'ss').normalize('NFD')
        .replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
    }
    function normJa(s) {
      return String(s || '').normalize('NFKC')
        .replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); })
        .replace(/[^ぁ-ゖー一-鿿]/g, '');
    }
    function lev(a, b) {
      var m = a.length, n = b.length, i, j;
      if (!m) return n;
      if (!n) return m;
      var prev = [], cur = [];
      for (j = 0; j <= n; j++) prev[j] = j;
      for (i = 1; i <= m; i++) {
        cur[0] = i;
        for (j = 1; j <= n; j++) {
          cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        var t = prev; prev = cur; cur = t;
      }
      return prev[n];
    }

    // Confere o que o reconhecimento de voz entendeu (lista de alternativas).
    function matchSpoken(item, lang, transcripts) {
      var n = item.names[lang];
      if (lang === 'ja') {
        var k = normJa(n.kana), kj = n.kanji ? normJa(n.kanji) : '';
        return transcripts.some(function (t) {
          var x = normJa(t);
          return !!x && (x.indexOf(k) >= 0 || (!!kj && x.indexOf(kj) >= 0));
        });
      }
      var target = normLatin(n.word), art = normLatin(n.article);
      var tol = target.length <= 3 ? 0 : (target.length <= 6 ? 1 : 2);
      return transcripts.some(function (t) {
        var full = normLatin(t);
        if (!full) return false;
        var vs = [full];
        if (art && full.indexOf(art) === 0 && full.length > art.length + 1) vs.push(full.slice(art.length));
        return vs.some(function (v) { return lev(v, target) <= tol; }) || lev(full, art + target) <= tol;
      });
    }

    return {
      env: env,
      newState: newState, langState: langState, startRun: startRun, ensureRun: ensureRun, switchRegion: switchRegion,
      sim: simOf, setSim: setSim, teach: teach, weeksView: weeksView, dayPlan: dayPlan, coreView: coreView, introView: introView,
      isUnlocked: isUnlocked, unlocked: unlockedSet, wordMeta: wordMeta, weekById: function (id) { return weeksById[id]; },
      mapView: mapView, canMove: canMove, moveTo: moveTo,
      answer: answer, advance: advance, flee: flee, takeLoot: takeLoot,
      gearView: gearView, gearCount: function (state, lang) { return gearCount(langState(state, lang).run); },
      storyView: storyView, cardInfo: cardInfo, preview: preview, autoGrade: autoGrade,
      summary: summary, speakText: speakText, matchSpoken: matchSpoken, gradeSentence: gradeSentence, scoreSpoken: scoreSpoken, schedule: schedule, fmtSpan: fmtSpan,
      itemById: function (id) { return itemsById[id]; },
      monsterById: function (id) { return monstersById[id]; },
      roomById: function (id) { return roomsById[id]; },
      bossRoom: bossRoom
    };
  }

  return { create: create };
});
