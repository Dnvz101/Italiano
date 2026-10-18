'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { useCourse } from '@/lib/nav';
import { OBJECTS, say, type Noun } from '@/lib/objects';
import SayIt from '../SayIt';
import { langPt } from '@/lib/level';

type Pred = { bbox: [number, number, number, number]; class: string; score: number };

// o detector (~5 MB) é baixado uma vez e fica na memória enquanto o app está aberto
let modelPromise: Promise<any> | null = null;
function loadModel() {
  modelPromise ||= (async () => {
    const tf = await import('@tensorflow/tfjs');
    await tf.ready();
    const coco = await import('@tensorflow-models/coco-ssd');
    const modelUrl = process.env.NEXT_PUBLIC_COCO_MODEL_URL || undefined;
    return coco.load(modelUrl ? { modelUrl } : { base: 'lite_mobilenet_v2' });
  })().catch((e) => {
    modelPromise = null;
    throw e;
  });
  return modelPromise;
}

const TOTAL = Object.keys(OBJECTS).length;
const foundKey = (uid: string, lang: string) => `ascolto-found:${uid}:${lang}`;

/** Realidade aumentada: aponte a câmera e veja o nome das coisas no idioma, com o artigo colorido pelo gênero. */
export default function Explore() {
  const s = useStore();
  const { lang, course, go, speak } = useCourse();
  const video = useRef<HTMLVideoElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const running = useRef(false);
  const frozenRef = useRef(false);

  const [status, setStatus] = useState<'idle' | 'loading' | 'live' | 'error'>('idle');
  const [err, setErr] = useState('');
  const [preds, setPreds] = useState<Pred[]>([]);
  const [frozen, setFrozen] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [found, setFound] = useState<Record<string, string>>({});
  const [toast, setToast] = useState('');
  const [, force] = useState(0);
  const toastT = useRef<any>(null);

  useEffect(() => {
    try {
      setFound(JSON.parse(localStorage.getItem(foundKey(s.userId, lang)) || '{}') || {});
    } catch {}
  }, [s.userId, lang]);

  const noun = (cls: string): Noun | null => (OBJECTS[cls] ? (OBJECTS[cls] as any)[lang] || null : null);

  const discover = useCallback(
    (cls: string) => {
      setFound((f) => {
        if (f[cls]) return f;
        const nf = { ...f, [cls]: new Date().toISOString() };
        try {
          localStorage.setItem(foundKey(s.userId, lang), JSON.stringify(nf));
        } catch {}
        const n = noun(cls);
        if (n) {
          clearTimeout(toastT.current);
          setToast(`🎉 Nova descoberta: ${say(n)}! (${Object.keys(nf).length}/${TOTAL})`);
          toastT.current = setTimeout(() => setToast(''), 2600);
          speak(say(n));
        }
        if (Object.keys(f).length === 0) s.markDay();
        return nf;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.userId, lang, speak]
  );

  const stop = useCallback(() => {
    running.current = false;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  // reposiciona as etiquetas quando a tela gira ou muda de tamanho
  useEffect(() => {
    const f = () => force((x) => x + 1);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);

  const start = async () => {
    setErr('');
    setStatus('loading');
    try {
      const [model, st] = await Promise.all([
        loadModel(),
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        }),
      ]);
      stream.current = st;
      const v = video.current!;
      v.srcObject = st;
      v.muted = true;
      v.setAttribute('playsinline', '');
      await v.play();
      setStatus('live');
      running.current = true;
      const seen: Record<string, number> = {};
      const loop = async () => {
        if (!running.current) return;
        if (!frozenRef.current && !document.hidden && v.readyState >= 2) {
          try {
            const ps: Pred[] = (await model.detect(v, 8, 0.5)).filter((p: Pred) => OBJECTS[p.class]);
            setPreds(ps);
            // só conta como descoberta se aparecer firme em alguns quadros seguidos
            for (const p of ps) {
              seen[p.class] = p.score > 0.62 ? (seen[p.class] || 0) + 1 : 0;
              if (seen[p.class] === 3) discover(p.class);
            }
          } catch {}
        }
        setTimeout(() => requestAnimationFrame(loop), 120);
      };
      loop();
    } catch (e: any) {
      stop();
      setStatus('error');
      setErr(
        e?.name === 'NotAllowedError'
          ? 'Permita o uso da câmera para este site (no cadeado ao lado do endereço) e tente de novo.'
          : e?.name === 'NotFoundError'
            ? 'Não encontrei câmera neste aparelho.'
            : 'Não consegui abrir a câmera ou carregar o detector. Confira a internet e tente de novo.'
      );
    }
  };

  const toggleFreeze = () => {
    const v = video.current;
    const nf = !frozen;
    frozenRef.current = nf;
    setFrozen(nf);
    if (v) nf ? v.pause() : v.play().catch(() => {});
  };

  // posição das etiquetas: o vídeo é "cover", então converte coordenadas do vídeo para a tela
  const box = (b: Pred['bbox']) => {
    const v = video.current;
    const el = stage.current;
    if (!v || !el || !v.videoWidth) return null;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const sc = Math.max(cw / v.videoWidth, ch / v.videoHeight);
    const ox = (cw - v.videoWidth * sc) / 2;
    const oy = (ch - v.videoHeight * sc) / 2;
    return { left: ox + b[0] * sc, top: oy + b[1] * sc, width: b[2] * sc, height: b[3] * sc, cw, ch };
  };

  // etiquetas: no topo de cada caixa; se duas se encostarem, a de baixo desce um pouco
  const layout = (ps: Pred[]) => {
    const out: { p: Pred; n: Noun; b: NonNullable<ReturnType<typeof box>>; lx: number; ly: number; w: number }[] = [];
    for (const p of [...ps].sort((a, b) => a.bbox[1] - b.bbox[1])) {
      const n = noun(p.class);
      const b = box(p.bbox);
      if (!n || !b) continue;
      const w = (n[0].length + n[1].length + 1) * 9.5 + 28;
      const lx = Math.min(Math.max(b.left + b.width / 2, w / 2 + 6), b.cw - w / 2 - 6);
      let ly = Math.min(Math.max(b.top + 8, 8), b.ch - 96);
      for (let k = 0; k < 6; k++) {
        const hit = out.find((o) => Math.abs(o.lx - lx) < (o.w + w) / 2 && Math.abs(o.ly - ly) < 38);
        if (!hit) break;
        ly = hit.ly + 40;
      }
      out.push({ p, n, b, lx, ly, w });
    }
    return out;
  };

  const pick = (cls: string) => {
    const n = noun(cls);
    if (!n) return;
    setSel(cls);
    speak(say(n));
  };

  const selN = sel ? noun(sel) : null;
  const count = Object.keys(found).length;

  return (
    <>
      <nav className="crumbs" aria-label="Você está em">
        <button onClick={() => go('home')}>Início</button>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Explorar</span>
      </nav>
      <h2>📷 Explorar com a câmera</h2>

      <div className={`ar-stage ${status}`} ref={stage}>
        <video ref={video} className="ar-video" muted playsInline aria-label="Imagem da câmera" />
        {status === 'live' &&
          layout(preds).map(({ p, n, b, lx, ly }, i) => {
            return (
              <div key={p.class + i}>
                <div className={`ar-box g-${n[2]}`} style={{ left: b.left, top: b.top, width: b.width, height: b.height }} />
                <button
                  className={`ar-tag g-${n[2]} ${sel === p.class ? 'on' : ''}`}
                  style={{ left: lx, top: ly }}
                  onClick={() => pick(p.class)}
                >
                  <i>{n[0]}</i>
                  {n[0].endsWith("'") ? '' : ' '}
                  {n[1]}
                </button>
              </div>
            );
          })}
        {status !== 'live' && (
          <div className="ar-intro">
            {status === 'loading' ? (
              <>
                <div className="ar-spin" aria-hidden="true" />
                <p>Abrindo a câmera e carregando o detector…</p>
                <p className="mut">Na primeira vez baixa uns 5 MB.</p>
              </>
            ) : (
              <>
                <p className="ar-big">Aponte a câmera para as coisas da sua casa</p>
                <p className="mut">
                  Xícara, cadeira, celular, gato, banana… O nome aparece em {langPt(lang)} em cima de cada coisa. Toque
                  no nome para ouvir e repetir.
                </p>
                <button className="btn" onClick={start}>
                  📷 Abrir a câmera
                </button>
                {err && <p className="err">{err}</p>}
              </>
            )}
          </div>
        )}
        {status === 'live' && (
          <div className="ar-bar">
            <button className="ar-btn" onClick={toggleFreeze}>
              {frozen ? '▶️ Continuar' : '⏸️ Congelar'}
            </button>
            <span className="ar-count">
              {count}/{TOTAL}
            </span>
          </div>
        )}
        {toast && (
          <div className="ar-toast" role="status">
            {toast}
          </div>
        )}
      </div>

      <div className="ar-legend mut">
        {lang === 'de' ? (
          <>
            <span className="g-m">der</span> masculino · <span className="g-f">die</span> feminino ·{' '}
            <span className="g-n">das</span> neutro
          </>
        ) : (
          <>
            <span className="g-m">il / lo / l'</span> masculino · <span className="g-f">la / l'</span> feminino ·{' '}
            <span className="g-p">i / gli / le</span> plural
          </>
        )}
      </div>

      {selN && sel && (
        <div className="card ar-sel pop" key={sel}>
          <div className="ar-word">
            <span className={`g-${selN[2]}`}>{selN[0]}</span>
            {selN[0].endsWith("'") ? '' : ' '}
            {selN[1]}
          </div>
          <div className="mut">{OBJECTS[sel].pt}</div>
          <SayIt
            key={sel + lang}
            text={say(selN)}
            accept={[selN[1], say(selN)]}
            onScore={() => {}}
          />
          <button
            className="btn ghost sm"
            style={{ marginTop: 10 }}
            onClick={async () => {
              await s.addPhrase(lang, say(selN), OBJECTS[sel].pt, 'Explorar com a câmera');
              alert('Virou card na aba Frases!');
            }}
          >
            ➕ Virar card
          </button>
        </div>
      )}

      <div className="card">
        <h3>
          🏆 Sua coleção: {count} de {TOTAL}
        </h3>
        <div className="prog">
          <i style={{ transform: `scaleX(${count / TOTAL})` }} />
        </div>
        {count ? (
          <div className="ar-found">
            {Object.keys(found)
              .filter((c) => noun(c))
              .map((c) => {
                const n = noun(c)!;
                return (
                  <button key={c} className={`ar-chip g-${n[2]}`} onClick={() => pick(c)}>
                    <i>{n[0]}</i>
                    {n[0].endsWith("'") ? '' : ' '}
                    {n[1]}
                  </button>
                );
              })}
          </div>
        ) : (
          <p className="mut" style={{ marginBottom: 0 }}>
            Cada coisa nova que a câmera reconhece entra aqui. Quem da família descobre mais?
          </p>
        )}
      </div>
    </>
  );
}
