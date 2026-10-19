'use client';
import { PLAN_NAMES, planActive } from '@/lib/plan';
import { useEffect, useState } from 'react';
import { useStore, OLD_KEY, importedKey } from '@/lib/store';
import { useApp } from '@/lib/nav';
import { currentVoice, setVoicePref, useVoices } from '@/lib/voice';
import { APP_VERSION } from '@/lib/version';
import { LEVELS, userLevel } from '@/lib/level';

export default function Settings() {
  const s = useStore();
  const { course, lang, progress, go, speak } = useApp();
  const voices = useVoices(course?.meta.lang || 'xx');
  const [voiceUri, setVoiceUri] = useState('');
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [hasOld, setHasOld] = useState(false);

  useEffect(() => {
    if (course) setVoiceUri(currentVoice(course.meta.lang)?.voiceURI || '');
  }, [course, voices]);
  useEffect(() => {
    try {
      setHasOld(!!localStorage.getItem(OLD_KEY));
    } catch {}
  }, []);

  const join = async () => {
    if (!code.trim()) return;
    if (!confirm('Entrar nesta família? Você passa a ver as letras dela (seu progresso continua seu).')) return;
    setJoining(true);
    try {
      await s.joinHousehold(code);
      setCode('');
      alert('Pronto! Agora você faz parte desta família.');
    } catch (e: any) {
      alert(e.message);
    }
    setJoining(false);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(s.household?.invite_code || '');
      alert('Código copiado!');
    } catch {}
  };

  return (
    <>
      <button className="btn ghost sm" onClick={() => go('home')}>
        ← Voltar
      </button>
      <h2 style={{ marginTop: 12 }}>Configurações</h2>

      {s.isAdmin && (
        <button className="card admin-entry" onClick={() => go('admin')}>
          <b>🛠️ Painel administrativo</b>
          <span className="mut">Usuários, gastos com IA, planos e limites</span>
        </button>
      )}
      {s.limits.enabled && !s.isAdmin && (
        <div className="card">
          <h3>Seu plano: {PLAN_NAMES[planActive(s.plan) ? s.plan!.plan : 'free']}</h3>
          {planActive(s.plan) ? (
            <p className="mut" style={{ marginBottom: 0 }}>
              Tudo liberado{s.plan?.until ? ` até ${s.plan.until.split('-').reverse().join('/')}` : ''}. Obrigado pelo apoio! ☕
            </p>
          ) : (
            <>
              <p className="mut">
                Grátis: {s.limits.free_weeks} semanas por idioma, {s.limits.chat_per_day} mensagens de conversa por dia e{' '}
                {s.limits.own_songs} músicas suas. {s.limits.support_text}
              </p>
              {s.limits.support_url && (
                <a className="btn" href={s.limits.support_url} target="_blank" rel="noopener">
                  ☕ Apoiar{s.limits.price_jpy ? ` (¥${s.limits.price_jpy})` : ''}
                </a>
              )}
            </>
          )}
        </div>
      )}

      <div className="card">
        <h3>Seu perfil</h3>
        <label>Nome</label>
        <input defaultValue={s.profile.name} onBlur={(e) => e.target.value.trim() && s.setName(e.target.value.trim())} />
        <p className="mut" style={{ marginBottom: 0 }}>
          Conta: {s.email}
        </p>
      </div>

      <div className="card">
        <h3>👨‍👩‍👧 Família</h3>
        {s.household && (
          <>
            <label>Nome da família</label>
            <input
              defaultValue={s.household.name}
              onBlur={(e) => e.target.value.trim() && s.setHouseholdName(e.target.value.trim())}
            />
            <p className="mut">
              Quem está nela: <b>{s.members.map((m) => m.name || '…').join(', ')}</b>. As letras coladas aparecem para
              todos; cards, progresso e traduções digitadas são de cada um.
            </p>
            <label>Código de convite</label>
            <div className="row">
              <input readOnly value={s.household.invite_code} style={{ fontFamily: 'monospace', letterSpacing: 2 }} />
              <button className="btn ghost sm" style={{ flex: 'none' }} onClick={copyCode}>
                Copiar
              </button>
            </div>
            <p className="mut">Mande este código para quem vai estudar com você.</p>
          </>
        )}
        <label>Entrar em outra família</label>
        <div className="row">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="código recebido" autoCapitalize="characters" autoCorrect="off" spellCheck={false} enterKeyHint="go" />
          <button className="btn sm" style={{ flex: 'none' }} onClick={join} disabled={joining}>
            Entrar
          </button>
        </div>
      </div>

      {course && lang && (
        <div className="card">
          <h3>🎧 Perfil musical ({course.meta.name})</h3>
          <p className="mut" style={{ marginTop: 0 }}>
            {s.profile.settings.music?.[lang]?.sugg
              ? 'Seus estilos e artistas favoritos, e as músicas sugeridas a partir deles.'
              : 'Conte o que você gosta de ouvir e receba músicas sob medida.'}
          </p>
          <button className="btn ghost sm" onClick={() => go('taste')}>
            {s.profile.settings.music?.[lang]?.sugg ? 'Ver e editar' : 'Montar meu perfil'}
          </button>
        </div>
      )}

      {course && lang && progress && (
        <div className="card">
          <h3>🎯 Meu nível em {course.meta.name}</h3>
          <select
            value={s.profile.settings.level?.[lang] || 0}
            onChange={(e) => s.setSetting('level', { ...(s.profile.settings.level || {}), [lang]: +e.target.value })}
          >
            <option value={0}>Automático, pela trilha (agora: {LEVELS[userLevel(course, progress)]})</option>
            {[1, 2, 3, 4].map((l) => (
              <option key={l} value={l}>
                {LEVELS[l]}
              </option>
            ))}
          </select>
          <p className="mut" style={{ marginBottom: 0 }}>
            Usado para dizer se uma música sua está no seu nível. Se você já sabia um pouco antes do app, escolha aqui.
          </p>
        </div>
      )}

      {course && (
        <div className="card">
          <h3>Voz ({course.meta.name})</h3>
          {voices.length ? (
            <>
              <select
                value={voiceUri}
                onChange={(e) => {
                  setVoicePref(course.meta.lang, e.target.value);
                  setVoiceUri(e.target.value);
                  speak(course.meta.test);
                }}
              >
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name}
                  </option>
                ))}
              </select>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn ghost sm" onClick={() => speak(course.meta.test)}>
                  🔊 Testar voz
                </button>
              </div>
            </>
          ) : (
            <p className="mut">Nenhuma voz deste idioma encontrada neste navegador.</p>
          )}
          <p className="mut" style={{ marginBottom: 0 }}>
            As vozes vêm do aparelho (a escolha vale só para este celular). Se todas soarem robóticas, abra o app no Chrome
            ou Safari. No iPhone, dá para baixar vozes melhores em Ajustes → Acessibilidade → Conteúdo Falado → Vozes.
          </p>
        </div>
      )}

      {hasOld && (
        <div className="card">
          <h3>Progresso antigo deste aparelho</h3>
          <p className="mut" style={{ marginTop: 0 }}>
            Este celular ainda tem dados da versão sem login (v1–v8).
          </p>
          <button
            className="btn ghost sm"
            onClick={() => {
              try {
                localStorage.removeItem(importedKey(s.userId));
              } catch {}
              window.location.reload();
            }}
          >
            Importar de novo
          </button>
        </div>
      )}

      {course && lang && (
        <div className="card">
          <h3>Zerar {course.meta.name}</h3>
          <p className="mut">Apaga só o seu progresso neste idioma (frases e letras ficam).</p>
          <button
            className="btn ghost sm"
            style={{ color: 'var(--bad)' }}
            onClick={() => confirm('Tem certeza? Isso não pode ser desfeito.') && s.resetCourse(lang)}
          >
            Zerar
          </button>
        </div>
      )}

      <div className="card">
        <button className="btn ghost" onClick={() => s.signOut()}>
          Sair da conta
        </button>
      </div>
      <p className="mut" style={{ textAlign: 'center' }}>
        Ascolto em Família · versão {APP_VERSION}
      </p>
    </>
  );
}
