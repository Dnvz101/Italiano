'use client';
import type { Card } from '@/lib/types';
import Spk from './Spk';

export default function CardList({ title, cards }: { title: string; cards: Card[] }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {cards.map((c, i) => (
        <div key={i} className="vc">
          <Spk text={c[0]} />
          <div>
            <div className="it">{c[0]}</div>
            <div className="mut">{c[1]}</div>
            {c[2] && (
              <div style={{ fontSize: 14, marginTop: 4 }}>
                <i>{c[2]}</i> <Spk text={c[2]} />
                <br />
                <span className="mut">{c[3]}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
