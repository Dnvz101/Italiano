'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function Login() {
  const sb = useMemo(() => createClient(), []);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (new URLSearchParams(location.search).get('erro')) setMsg('O link expirou ou já foi usado. Peça um novo código.');
  }, []);

  const send = async () => {
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return setMsg('Digite um e-mail válido.');
    setBusy(true);
    setMsg('');
    const { error } = await sb.auth.signInWithOtp({
      email: e,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) return setMsg(error.message.includes('rate') ? 'Muitas tentativas. Espere alguns minutos.' : error.message);
    setEmail(e);
    setStep('code');
  };

  const verify = async () => {
    setBusy(true);
    setMsg('');
    const { error } = await sb.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) return setMsg('Código inválido ou expirado.');
    window.location.href = '/';
  };

  return (
    <main>
      <div className="login">
        <h1>
          Ascolto <span>em Família</span>
        </h1>
        <p className="mut">Aprenda idiomas com música, pelo método natural.</p>
        <div className="card">
          {step === 'email' ? (
            <>
              <label>Seu e-mail</label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="voce@email.com"
              />
              <div style={{ marginTop: 12 }}>
                <button className="btn" onClick={send} disabled={busy}>
                  {busy ? 'Enviando…' : 'Receber código de acesso'}
                </button>
              </div>
              <p className="mut" style={{ marginBottom: 0 }}>
                Sem senha: mandamos um código para o seu e-mail. Primeira vez? A conta é criada automaticamente.
              </p>
            </>
          ) : (
            <>
              <p style={{ marginTop: 0 }}>
                Enviamos um código para <b>{email}</b>.
              </p>
              <label>Código do e-mail</label>
              <input
                className="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && verify()}
                maxLength={10}
              />
              <div style={{ marginTop: 12 }}>
                <button className="btn" onClick={verify} disabled={busy || code.length < 6}>
                  {busy ? 'Entrando…' : 'Entrar'}
                </button>
              </div>
              <p className="mut" style={{ marginBottom: 0 }}>
                Também dá para tocar no link do e-mail.{' '}
                <a href="#" onClick={(e) => (e.preventDefault(), setStep('email'), setCode(''))}>
                  Usar outro e-mail
                </a>
              </p>
            </>
          )}
          {msg && (
            <p style={{ color: 'var(--bad)', marginBottom: 0 }} role="alert">
              {msg}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
