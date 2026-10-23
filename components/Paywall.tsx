'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { access } from '@/lib/plan';

export function useAccess() {
  const s = useStore();
  return access(s.limits, s.plan, s.isAdmin);
}

/** Aviso de conteúdo do plano apoiador, com o botão do "pague um café". */
export default function Paywall({ title, text, onClose }: { title: string; text?: string; onClose?: () => void }) {
  const s = useStore();
  const L = s.limits;
  if (access(s.limits, s.plan, s.isAdmin).tester) return <TesterAsk title={title} text={text} onClose={onClose} />;
  return (
    <div className="card paywall" role="note">
      {onClose && (
        <button className="pw-x" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      )}
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

/** Conta de teste: pedir a liberação (sem custo). O pedido aparece no painel do admin. */
export function TesterAsk({ title, text, onClose }: { title: string; text?: string; onClose?: () => void }) {
  const s = useStore();
  const [busy, setBusy] = useState(false);
  const asked = !!s.requestedAt;
  return (
    <div className="card paywall tester-ask" role="note">
      {onClose && (
        <button className="pw-x" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      )}
      <div className="pw-lock" aria-hidden="true">
        🧪
      </div>
      <h3>{title}</h3>
      {text && <p className="mut">{text}</p>}
      <p>
        Você está usando uma <b>conta de teste</b>. Para liberar tudo, é só pedir a mudança para conta normal:{' '}
        <b>não tem custo nenhum</b>.
      </p>
      {asked ? (
        <p className="prep-ok" style={{ marginBottom: 0 }}>
          ✅ Pedido enviado! Assim que a conta for liberada, tudo abre aqui sozinho.
        </p>
      ) : (
        <button
          className="btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await s.requestUpgrade();
            setBusy(false);
          }}
        >
          {busy ? 'Enviando…' : '🙋 Pedir liberação (grátis)'}
        </button>
      )}
      {s.isAnon && (
        <p className="mut pw-foot">Dica: salve sua conta com e-mail em Configurações para não perder o progresso.</p>
      )}
    </div>
  );
}
