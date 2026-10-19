'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStore } from '@/lib/store';
import { useApp } from '@/lib/nav';
import { LANGS } from '@/lib/langs';
import {
  costUsd,
  mergeLimits,
  mergePrices,
  planActive,
  PLAN_NAMES,
  type Limits,
  type Plan,
  type Prices,
} from '@/lib/plan';

type U = {
  id: string;
  email: string;
  name: string;
  household: string;
  created_at: string;
  last_sign_in_at: string | null;
  last_day: string | null;
  days_30: number;
  weeks: Record<string, number>;
  songs: number;
  phrases: number;
  plan: Plan['plan'];
  until: string | null;
  note: string;
};
type Use = { user_id: string; day: string; kind: string; model: string; calls: number; input_tokens: number; output_tokens: number; cost_usd: number | null };

const KINDS: Record<string, string> = {
  chat: '💬 Conversa',
  stt: '🎙️ Pronúncia (Gemini)',
  translate: '🌐 Tradução de letras',
  'full-lesson': '🎓 Aula completa',
  'analyze-song': '🎵 Análise de música',
  'music-profile': '🎧 Perfil musical',
};
const TABS = [
  ['geral', '📊 Geral'],
  ['users', '👥 Usuários'],
  ['ia', '🤖 Gastos IA'],
  ['limits', '☕ Planos'],
] as const;
type Tab = (typeof TABS)[number][0];

const dayStr = (d: Date) => d.toLocaleDateString('sv');
const ago = (n: number) => dayStr(new Date(Date.now() - n * 86400000));
const usd = (v: number) => (v < 0.01 && v > 0 ? '< US$ 0,01' : 'US$ ' + v.toFixed(2).replace('.', ','));
const yen = (v: number) => '¥' + Math.round(v).toLocaleString('ja-JP');
const br = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');

/** Painel do dono do app: só aparece para o e-mail cadastrado em public.admins (o banco confere). */
export default function Admin() {
  const s = useStore();
  const { go } = useApp();
  const sb = useMemo(() => createClient(), []);
  const [tab, setTabState] = useState<Tab>('geral');
  const [users, setUsers] = useState<U[] | null>(null);
  const [usage, setUsage] = useState<Use[]>([]);
  const [days, setDays] = useState(30);
  const [limits, setLimits] = useState<Limits>(s.limits);
  const [prices, setPrices] = useState<Prices>(mergePrices(null));
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    try {
      const t = localStorage.getItem('ascolto-admin-tab') as Tab | null;
      if (t && TABS.some(([k]) => k === t)) setTabState(t);
    } catch {}
  }, []);
  const setTab = (t: Tab) => {
    setTabState(t);
    try {
      localStorage.setItem('ascolto-admin-tab', t);
    } catch {}
  };

  const load = useCallback(async () => {
    setErr('');
    const [u, a, c] = await Promise.all([
      sb.rpc('admin_users'),
      sb.rpc('admin_usage', { p_days: Math.max(days, 31) }),
      sb.from('app_config').select('key,value'),
    ]);
    const e = u.error || a.error || c.error;
    if (e) {
      setErr(
        /admin_users|function|schema cache|does not exist/i.test(e.message)
          ? 'O painel ainda não foi instalado no banco: rode supabase/migrations/0004_admin_planos.sql no SQL Editor do Supabase.'
          : e.message
      );
      return;
    }
    setUsers((u.data as U[]) || []);
    setUsage(((a.data as Use[]) || []).map((r) => ({ ...r, calls: +r.calls, input_tokens: +r.input_tokens, output_tokens: +r.output_tokens })));
    const cfg = Object.fromEntries(((c.data as any[]) || []).map((r) => [r.key, r.value]));
    setLimits(mergeLimits(cfg.limits));
    setPrices(mergePrices(cfg.prices));
  }, [sb, days]);

  useEffect(() => {
    load();
  }, [load]);

  const cost = useCallback((r: Use) => costUsd(r, prices), [prices]);
  const since = ago(days - 1);
  const inRange = usage.filter((r) => r.day >= since);
  const monthStart = dayStr(new Date()).slice(0, 8) + '01';
  const month = usage.filter((r) => r.day >= monthStart);
  const sum = (rows: Use[]) => rows.reduce((t, r) => t + cost(r), 0);
  const group = (rows: Use[], key: (r: Use) => string) => {
    const m = new Map<string, { calls: number; usd: number }>();
    rows.forEach((r) => {
      const k = key(r);
      const g = m.get(k) || { calls: 0, usd: 0 };
      g.calls += r.calls;
      g.usd += cost(r);
      m.set(k, g);
    });
    return [...m.entries()].sort((a, b) => b[1].usd - a[1].usd || b[1].calls - a[1].calls);
  };

  if (!s.isAdmin) return null;

  const head = (
    <>
      <button className="btn ghost sm" onClick={() => go('settings')}>
        ← Voltar
      </button>
      <h2 style={{ marginTop: 12 }}>🛠️ Painel</h2>
      <div className="seg adm-tabs" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
    </>
  );
  if (err)
    return (
      <>
        {head}
        <p className="err">{err}</p>
        <button className="btn ghost sm" onClick={load}>
          Tentar de novo
        </button>
      </>
    );
  if (!users)
    return (
      <>
        {head}
        <p className="mut">Carregando…</p>
      </>
    );

  const byUser = new Map(group(inRange, (r) => r.user_id));
  const paid = users.filter((u) => planActive(u));
  const active7 = users.filter((u) => u.last_day && u.last_day >= ago(6)).length;
  const active30 = users.filter((u) => u.last_day && u.last_day >= ago(29)).length;
  const newMonth = users.filter((u) => u.created_at.slice(0, 10) >= monthStart).length;
  const monthUsd = sum(month);
  const revenue = paid.length * (limits.price_jpy || 0);
  const costJpy = monthUsd * prices.usd_jpy;
  const langCount = Object.keys(LANGS).map((l) => [l, users.filter((u) => u.weeks && u.weeks[l] != null).length] as const);
  const kpi = (label: string, value: string | number, sub?: string) => (
    <div className="stat adm-kpi">
      <b>{value}</b>
      <span>{label}</span>
      {sub && <small className="mut">{sub}</small>}
    </div>
  );
  const bars = (rows: [string, { calls: number; usd: number }][], label: (k: string) => string) => {
    const max = Math.max(...rows.map(([, g]) => g.usd), 0.000001);
    return rows.map(([k, g]) => (
      <div key={k} className="adm-bar">
        <div className="adm-bar-t">
          <span>{label(k)}</span>
          <span className="mut">
            {g.calls} · {usd(g.usd)}
          </span>
        </div>
        <i style={{ transform: `scaleX(${g.usd / max})` }} />
      </div>
    ));
  };

  return (
    <>
      {head}

      {tab === 'geral' && (
        <>
          <div className="stats adm-stats">
            {kpi('usuários', users.length, `${newMonth} novos no mês`)}
            {kpi('ativos 7 dias', active7, `${active30} em 30 dias`)}
            {kpi('apoiadores', paid.length, limits.enabled ? 'limites ligados' : 'limites desligados')}
          </div>
          <div className="card">
            <h3>Este mês</h3>
            <div className="adm-line">
              <span>Gasto com IA</span>
              <b>
                {usd(monthUsd)} · {yen(costJpy)}
              </b>
            </div>
            <div className="adm-line">
              <span>Por usuário ativo (30 dias)</span>
              <b>{active30 ? yen(costJpy / active30) : '—'}</b>
            </div>
            <div className="adm-line">
              <span>Receita estimada ({paid.length} × ¥{limits.price_jpy})</span>
              <b>{yen(revenue)}</b>
            </div>
            <div className="adm-line total">
              <span>Sobra estimada (sem taxas da loja/pagamento e da Vercel)</span>
              <b className={revenue - costJpy < 0 ? 'neg' : ''}>{yen(revenue - costJpy)}</b>
            </div>
            <p className="mut" style={{ marginBottom: 0 }}>
              Custos estimados pelos tokens × preço de cada modelo (edite os preços em 🤖 Gastos IA).
            </p>
          </div>
          <div className="card">
            <h3>Idiomas</h3>
            {langCount.map(([l, n]) => (
              <div key={l} className="adm-line">
                <span>{LANGS[l].native}</span>
                <b>{n}</b>
              </div>
            ))}
          </div>
          <div className="card">
            <h3>Uso da IA no mês</h3>
            {month.length ? bars(group(month, (r) => r.kind), (k) => KINDS[k] || k) : <p className="mut">Nada ainda.</p>}
          </div>
          <button className="btn ghost sm" onClick={load}>
            ↻ Atualizar
          </button>
        </>
      )}

      {tab === 'users' && (
        <>
          <input placeholder="Buscar por nome, e-mail ou família…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} />
          {users
            .filter((u) => !q || `${u.name} ${u.email} ${u.household}`.toLowerCase().includes(q.toLowerCase()))
            .map((u) => (
              <UserRow key={u.id} u={u} usd={byUser.get(u.id)?.usd || 0} calls={byUser.get(u.id)?.calls || 0} fx={prices.usd_jpy} sb={sb} onSaved={load} />
            ))}
        </>
      )}

      {tab === 'ia' && (
        <>
          <div className="seg">
            {[7, 30, 90].map((d) => (
              <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>
                {d} dias
              </button>
            ))}
          </div>
          <div className="stats adm-stats">
            {kpi('gasto', usd(sum(inRange)), yen(sum(inRange) * prices.usd_jpy))}
            {kpi('chamadas', inRange.reduce((t, r) => t + r.calls, 0))}
            {kpi('média/dia', yen((sum(inRange) * prices.usd_jpy) / days))}
          </div>
          <div className="card">
            <h3>Por dia</h3>
            <div className="adm-days" role="img" aria-label="Gasto por dia">
              {Array.from({ length: days }, (_, i) => ago(days - 1 - i)).map((d, _, all) => {
                const v = sum(inRange.filter((r) => r.day === d));
                const max = Math.max(...all.map((x) => sum(inRange.filter((r) => r.day === x))), 0.000001);
                return <i key={d} title={`${br(d)}: ${usd(v)}`} style={{ height: `${Math.max(2, (v / max) * 100)}%` }} />;
              })}
            </div>
          </div>
          <div className="card">
            <h3>Por tipo</h3>
            {bars(group(inRange, (r) => r.kind), (k) => KINDS[k] || k)}
          </div>
          <div className="card">
            <h3>Por modelo</h3>
            {bars(group(inRange, (r) => r.model || '?'), (k) => k)}
          </div>
          <div className="card">
            <h3>Quem mais usa</h3>
            {bars(group(inRange, (r) => r.user_id).slice(0, 10), (k) => {
              const u = users.find((x) => x.id === k);
              return u ? u.name || u.email : k.slice(0, 8);
            })}
          </div>
          <PricesForm prices={prices} sb={sb} onSaved={load} />
        </>
      )}

      {tab === 'limits' && <LimitsForm limits={limits} sb={sb} onSaved={load} />}
    </>
  );
}

function UserRow({ u, usd: spent, calls, fx, sb, onSaved }: { u: U; usd: number; calls: number; fx: number; sb: any; onSaved: () => void }) {
  const [plan, setPlan] = useState(u.plan);
  const [until, setUntil] = useState(u.until || '');
  const [note, setNote] = useState(u.note);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const { error } = await sb.rpc('admin_set_plan', { p_user: u.id, p_plan: plan, p_until: until || null, p_note: note });
    setBusy(false);
    if (error) return alert(error.message);
    onSaved();
  };
  const active = planActive(u);
  return (
    <details className="card adm-user">
      <summary>
        <span className="adm-u-t">
          <b>{u.name || '(sem nome)'}</b>
          <span className="mut">{u.email}</span>
        </span>
        <span className={`adm-plan ${active ? 'on' : ''}`}>{PLAN_NAMES[active ? u.plan : 'free']}</span>
      </summary>
      <div className="adm-grid">
        <span className="mut">Família</span>
        <span>{u.household || '—'}</span>
        <span className="mut">Entrou em</span>
        <span>{br(u.created_at)}</span>
        <span className="mut">Último estudo</span>
        <span>
          {br(u.last_day)} · {u.days_30} dias no mês
        </span>
        <span className="mut">Trilhas</span>
        <span>
          {Object.entries(u.weeks || {})
            .map(([l, n]) => `${LANGS[l]?.native || l}: semana ${n}`)
            .join(' · ') || '—'}
        </span>
        <span className="mut">Músicas · frases</span>
        <span>
          {u.songs} · {u.phrases}
        </span>
        <span className="mut">IA no período</span>
        <span>
          {calls} chamadas · {'¥' + Math.round(spent * fx).toLocaleString('ja-JP')}
        </span>
      </div>
      <div className="adm-edit">
        <label>Plano</label>
        <select value={plan} onChange={(e) => setPlan(e.target.value as Plan['plan'])}>
          <option value="free">Grátis</option>
          <option value="apoiador">Apoiador ☕</option>
          <option value="vip">Família / VIP</option>
        </select>
        <label>Válido até (vazio = sem data)</label>
        <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
        <label>Anotação (só você vê)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex.: pagou via PayPay em 10/11" />
        <button className="btn sm" onClick={save} disabled={busy} style={{ marginTop: 10 }}>
          {busy ? 'Salvando…' : 'Salvar plano'}
        </button>
      </div>
    </details>
  );
}

function LimitsForm({ limits, sb, onSaved }: { limits: Limits; sb: any; onSaved: () => void }) {
  const [v, setV] = useState(limits);
  const [busy, setBusy] = useState(false);
  useEffect(() => setV(limits), [limits]);
  const num = (k: keyof Limits) => (
    <input type="number" min={0} inputMode="numeric" value={v[k] as number} onChange={(e) => setV({ ...v, [k]: Math.max(0, +e.target.value || 0) })} />
  );
  const save = async () => {
    setBusy(true);
    const { error } = await sb.rpc('admin_set_config', { p_key: 'limits', p_value: v });
    setBusy(false);
    if (error) return alert(error.message);
    alert('Salvo! Quem abrir o app agora já vê as regras novas.');
    onSaved();
  };
  return (
    <div className="card adm-form">
      <h3>Plano grátis</h3>
      <label className="switch">
        <input type="checkbox" checked={v.enabled} onChange={(e) => setV({ ...v, enabled: e.target.checked })} /> Ligar os limites
      </label>
      <p className="mut" style={{ marginTop: 0 }}>
        Desligado, todo mundo usa tudo (como hoje). Você e quem estiver como Apoiador ou VIP nunca têm limite.
      </p>
      <label>Semanas liberadas por idioma</label>
      {num('free_weeks')}
      <label>Mensagens de conversa por dia</label>
      {num('chat_per_day')}
      <label>Músicas próprias (favoritas)</label>
      {num('own_songs')}
      <label>Valor do apoio (¥, só para mostrar e calcular a receita)</label>
      {num('price_jpy')}
      <label>Link do &quot;pague um café&quot; (Ko-fi, Buy Me a Coffee, PayPay…)</label>
      <input value={v.support_url} onChange={(e) => setV({ ...v, support_url: e.target.value.trim() })} placeholder="https://…" />
      <label>Texto do convite</label>
      <textarea rows={3} value={v.support_text} onChange={(e) => setV({ ...v, support_text: e.target.value })} />
      <button className="btn" onClick={save} disabled={busy} style={{ marginTop: 12 }}>
        {busy ? 'Salvando…' : 'Salvar'}
      </button>
    </div>
  );
}

function PricesForm({ prices, sb, onSaved }: { prices: Prices; sb: any; onSaved: () => void }) {
  const [v, setV] = useState(prices);
  useEffect(() => setV(prices), [prices]);
  const save = async () => {
    const { error } = await sb.rpc('admin_set_config', { p_key: 'prices', p_value: v });
    if (error) return alert(error.message);
    onSaved();
  };
  return (
    <details className="card adm-form">
      <summary>
        <b>Preços usados na estimativa</b>
      </summary>
      <p className="mut">
        US$ por milhão de tokens [entrada, saída]. O nome vale para qualquer modelo que o contenha (o mais específico ganha).
        Confira na sua fatura da Anthropic e do Google e ajuste.
      </p>
      {Object.entries(v.models).map(([k, [a, b]]) => (
        <div key={k} className="row adm-price">
          <span>{k}</span>
          <input type="number" step="0.01" value={a} onChange={(e) => setV({ ...v, models: { ...v.models, [k]: [+e.target.value, b] } })} />
          <input type="number" step="0.01" value={b} onChange={(e) => setV({ ...v, models: { ...v.models, [k]: [a, +e.target.value] } })} />
        </div>
      ))}
      <label>Cotação do dólar (¥)</label>
      <input type="number" value={v.usd_jpy} onChange={(e) => setV({ ...v, usd_jpy: +e.target.value || 150 })} />
      <button className="btn sm" onClick={save} style={{ marginTop: 10 }}>
        Salvar preços
      </button>
    </details>
  );
}
