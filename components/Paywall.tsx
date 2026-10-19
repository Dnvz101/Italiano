'use client';
import { useStore } from '@/lib/store';
import { access } from '@/lib/plan';

export function useAccess() {
  const s = useStore();
  return access(s.limits, s.plan, s.isAdmin);
}

/** Aviso de conteúdo do plano apoiador, com o botão do "pague um café". */
export default function Paywall({ title, text }: { title: string; text?: string }) {
  const s = useStore();
  const L = s.limits;
  return (
    <div className="card paywall" role="note">
      <div className="pw-lock" aria-hidden="true">
        🔒
      </div>
      <h3>{title}</h3>
      {text && <p className="mut">{text}</p>}
      <p>{L.support_text}</p>
      {L.support_url ? (
        <a className="btn" href={L.support_url} target="_blank" rel="noopener">
          ☕ Apoiar{L.price_jpy ? ` (¥${L.price_jpy})` : ''}
        </a>
      ) : null}
      <p className="mut pw-foot">Já apoiou? A liberação aparece aqui depois que o pagamento for confirmado.</p>
    </div>
  );
}
