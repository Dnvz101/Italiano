'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useCourse } from '@/lib/nav';
import Spk from '../Spk';

export default function Mine() {
  const s = useStore();
  const { lang, course, phrases } = useCourse();
  const [text, setText] = useState('');
  const [meaning, setMeaning] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!text.trim() || !meaning.trim()) {
      alert('Preencha a frase e o significado.');
      return;
    }
    setBusy(true);
    await s.addPhrase(lang, text.trim(), meaning.trim(), note.trim());
    setText('');
    setMeaning('');
    setNote('');
    setBusy(false);
  };

  return (
    <>
      <h2>Minhas frases</h2>
      <div className="card">
        <p className="mut" style={{ marginTop: 0 }}>
          Anote frases e expressões que você pegou de ouvido (músicas, séries, conversas) ou que você mesmo montou com as
          estruturas da semana. Elas entram nos seus cards.
        </p>
        <label>Em {course.meta.name}</label>
        <input value={text} onChange={(e) => setText(e.target.value)} enterKeyHint="next" />
        <label>Significado</label>
        <input value={meaning} onChange={(e) => setMeaning(e.target.value)} enterKeyHint="next" />
        <label>Cena / contexto (onde ouviu, quem disse, qual emoção)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="ex.: personagem gritou quando derrubou o café"
        />
        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={add} disabled={busy}>
            Adicionar card
          </button>
        </div>
      </div>
      {phrases.length ? (
        <div className="card">
          {[...phrases].reverse().map((m) => (
            <div key={m.id} className="vc">
              <Spk text={m.text} />
              <div style={{ flex: 1 }}>
                <div className="it">{m.text}</div>
                <div className="mut">{m.meaning}</div>
                {m.note && (
                  <div className="mut" style={{ fontSize: 13 }}>
                    📝 {m.note}
                  </div>
                )}
              </div>
              <button className="del" onClick={() => confirm('Apagar esta frase?') && s.deletePhrase(m.id)}>
                apagar
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mut" style={{ textAlign: 'center' }}>
          Nenhuma frase ainda.
        </p>
      )}
    </>
  );
}
