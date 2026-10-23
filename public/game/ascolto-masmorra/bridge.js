/*
  Ponte com o app Ascolto.
  Avaliador de fala do chefe: se o navegador não tem reconhecimento de voz (ex.: Firefox, alguns Androids),
  grava a frase e usa o avaliador do app (/api/transcribe, o mesmo do Shadowing).
  Onde o navegador reconhece voz, o jogo usa o reconhecimento dele (mais rápido e sem custo).
*/
(function () {
  var hasSR = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  var canRec = !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  if (hasSR || !canRec) return;

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  }
  function lev(a, b) {
    var m = a.length, n = b.length, i, j, prev = [], cur = [];
    if (!m) return n; if (!n) return m;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function score(words, heard) {
    var hw = String(heard).split(/\s+/).map(norm).filter(Boolean), all = norm(heard), bad = [], ok = 0;
    words.forEach(function (w, i) {
      var x = norm(w);
      if (!x) { ok++; return; }
      var tol = x.length <= 3 ? 0 : x.length <= 6 ? 1 : 2;
      if (all.indexOf(x) >= 0 || hw.some(function (h) { return lev(h, x) <= tol; })) ok++;
      else bad.push(i);
    });
    return { score: Math.round((100 * ok) / Math.max(1, words.length)), heard: heard, bad: bad };
  }
  function b64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1] || ''); };
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  window.AscoltoEvaluator = function (lang, text, words) {
    var ms = Math.max(2500, Math.min(8000, 1800 + words.length * 550));
    return navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      return new Promise(function (resolve, reject) {
        var chunks = [], rec;
        try { rec = new MediaRecorder(stream); } catch (e) { stream.getTracks().forEach(function (t) { t.stop(); }); reject(e); return; }
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          var blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
          b64(blob)
            .then(function (audio) {
              return fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ lang: lang, audio: audio, mime: (rec.mimeType || 'audio/webm').split(';')[0] }),
              });
            })
            .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'erro'); return d; }); })
            .then(function (d) { resolve(score(words, d.text || '')); })
            .catch(reject);
        };
        rec.start();
        setTimeout(function () { try { rec.stop(); } catch (e) { /* já parou */ } }, ms);
      });
    });
  };
})();
