'use client';
import { useEffect, useState } from 'react';
import { useStore, OLD_KEY, importedKey } from '@/lib/store';
import { useApp } from '@/lib/nav';
import { langPt } from '@/lib/langs';

export default function ImportLocal() {
  const s = useStore();
  const { closeImport, go } = useApp();
  const [profiles, setProfiles] = useState<{ name: string; summary: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(OLD_KEY) || 'null');
      setProfiles(
        (raw?.profiles || []).map((p: any) => {
          const cs = p.c || { it: p };
          const parts = Object.entries(cs)
            .map(([l, c]: any) => {
              const n = Object.keys(c?.srs || {}).length;
              return n ? `${langPt(l)}: ${n} cards` : '';
            })
            .filter(Boolean);
          return { name: p.name, summary: parts.join(' · ') || 'sem progresso' };
        })
      );
    } catch {}
  }, []);

  const done = () => {
    try {
      localStorage.setItem(importedKey(s.userId), '1');
    } catch {}
    closeImport();
    go('home');
  };

  const pick = async (i: number) => {
    setBusy(true);
    try {
      await s.importLocal(i);
      alert('Progresso importado para a sua conta!');
    } catch (e: any) {
      alert('Erro ao importar: ' + e.message);
    }
    setBusy(false);
    done();
  };

  return (
    <>
      <h2 style={{ marginTop: 24 }}>Encontramos progresso neste aparelho</h2>
      <p className="mut">
        Este celular tem dados da versão sem login. Qual destes perfis é <b>você</b>? O progresso dele vai para a sua conta
        (e as letras, para a sua família).
      </p>
      {profiles.map((p, i) => (
        <button key={i} className="langcard" onClick={() => pick(i)} disabled={busy}>
          <span className="flag">👤</span>
          <span className="t">
            <b>{p.name}</b>
            <span className="mut">{p.summary}</span>
          </span>
          <span className="go">›</span>
        </button>
      ))}
      <button className="btn ghost" onClick={done} disabled={busy}>
        Não importar
      </button>
      {busy && (
        <p className="mut" style={{ textAlign: 'center' }}>
          Importando…
        </p>
      )}
      <div className="card" style={{ marginTop: 16 }}>
        <p className="mut" style={{ marginTop: 0 }}>
          Vai estudar na família de outra pessoa? Entre nela <b>antes</b> de importar, para as letras irem para o lugar
          certo. Depois volte aqui por ⚙️ → Importar de novo.
        </p>
        <button
          className="btn ghost sm"
          onClick={() => {
            closeImport();
            go('settings');
          }}
          disabled={busy}
        >
          Entrar numa família primeiro
        </button>
      </div>
      <p className="mut">Cada pessoa importa o próprio perfil entrando com a conta dela neste mesmo aparelho.</p>
    </>
  );
}
