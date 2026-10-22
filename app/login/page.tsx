'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function Login() {
  const sb = useMemo(() => (typeof window === 'undefined' ? (null as any) : createClient()), []);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'quick' | 'email' | 'code'>('quick');
  const [name, setName] = useState('');
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

  // Teste sem cadastro: conta anônima do Supabase (dá para salvar com e-mail depois, em Configurações)
  const quick = async () => {
    const n = name.trim();
    if (!n) return setMsg('Digite seu nome (é assim que o app vai te chamar).');
    setBusy(true);
    setMsg('');
    const { error } = await sb.auth.signInAnonymously({ options: { data: { name: n } } });
    setBusy(false);
    if (error)
      return setMsg(
        /anonymous/i.test(error.message)
          ? 'A entrada sem cadastro está desligada no momento. Use o seu e-mail.'
          : error.message.includes('rate')
            ? 'Muitas tentativas. Espere alguns minutos.'
            : error.message
      );
    window.location.href = '/';
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
          {step === 'quick' ? (
            <>
              <label>Como você se chama?</label>
              <input
                autoComplete="given-name"
                enterKeyHint="go"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && quick()}
                placeholder="Seu nome"
                maxLength={40}
              />
              <div style={{ marginTop: 12 }}>
                <button className="btn" onClick={quick} disabled={busy}>
                  {busy ? 'Entrando…' : 'Começar agora, sem cadastro'}
                </button>
              </div>
              <p className="mut">Você testa tudo na hora. Se gostar, salva a conta com o seu e-mail depois, sem perder nada.</p>
              <p className="mut" style={{ marginBottom: 0 }}>
                Já tem conta?{' '}
                <a href="#" onClick={(e) => (e.preventDefault(), setMsg(''), setStep('email'))}>
                  Entrar com e-mail
                </a>
              </p>
            </>
          ) : step === 'email' ? (
            <>
              <label>Seu e-mail</label>
              <input
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="send"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="voce@email.com"
              />
              <div style={{ marginTop: 12 }}>
                <button className="btn" onClick={send} disabled={busy}>
                  {busy ? 'Enviando…' : 'Receber link de acesso'}
                </button>
              </div>
              <p className="mut" style={{ marginBottom: 0 }}>
                Sem senha: mandamos um link de acesso para o seu e-mail. Primeira vez? A conta é criada automaticamente.{' '}
                <a href="#" onClick={(e) => (e.preventDefault(), setMsg(''), setStep('quick'))}>
                  Voltar
                </a>
              </p>
            </>
          ) : (
            <>
              <p style={{ marginTop: 0 }}>
                Enviamos um e-mail para <b>{email}</b>. <b>Toque no link do e-mail neste mesmo aparelho</b> para entrar.
              </p>
              <p className="mut">Se o e-mail trouxer um código, você também pode digitar aqui:</p>
              <label>Código do e-mail</label>
              <input
                className="otp"
                inputMode="numeric"
                enterKeyHint="go"
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
                Não chegou? Olhe o spam.{' '}
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
