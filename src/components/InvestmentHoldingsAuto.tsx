import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Loader2, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { InvestmentHolding, PortfolioConfig } from '../services/portfolioService';
import { formatCurrency } from '../utils/formatters';

interface Props { config: PortfolioConfig; onSave: (config: PortfolioConfig) => Promise<void>; }
type AssetType = 'mutual-fund' | 'stock';
type Mode = 'existing' | 'purchase';
type Fund = { schemeCode: string; schemeName: string };
type Draft = { assetType: AssetType; name: string; schemeCode: string; units: string; investedAmount: string; currentPrice: string; navDate: string; goalId: string; mode: Mode; };
const emptyDraft: Draft = { assetType: 'mutual-fund', name: '', schemeCode: '', units: '', investedAmount: '', currentPrice: '', navDate: '', goalId: '', mode: 'existing' };
const makeId = (name: string) => `holding-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item'}-${Date.now()}`;

export const InvestmentHoldingsAuto: React.FC<Props> = ({ config, onSave }) => {
  const holdings = config.holdings || [];
  const investmentGoals = (config.goals || []).filter(goal => goal.scope === 'personal' && goal.type === 'investment');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [fundsLoading, setFundsLoading] = useState(false);
  const [fundsError, setFundsError] = useState('');
  const [fundQuery, setFundQuery] = useState('');
  const [fundOpen, setFundOpen] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const [navError, setNavError] = useState('');

  const totals = useMemo(() => holdings.reduce((acc, item) => ({ invested: acc.invested + (Number(item.investedAmount) || 0), current: acc.current + (Number(item.currentValue) || 0) }), { invested: 0, current: 0 }), [holdings]);
  const gain = totals.current - totals.invested;
  const filteredFunds = useMemo(() => {
    const q = fundQuery.trim().toLowerCase();
    return (q ? funds.filter(f => f.schemeName.toLowerCase().includes(q) || f.schemeCode.includes(q)) : funds).slice(0, 30);
  }, [funds, fundQuery]);

  useEffect(() => {
    if (!open || draft.assetType !== 'mutual-fund' || funds.length) return;
    let cancelled = false;
    setFundsLoading(true); setFundsError('');
    fetch('https://api.mfapi.in/mf').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => {
      if (!cancelled) setFunds(Array.isArray(data) ? data.map((f: any) => ({ schemeCode: String(f.schemeCode), schemeName: String(f.schemeName) })).filter((f: Fund) => f.schemeCode && f.schemeName) : []);
    }).catch(() => { if (!cancelled) setFundsError('Could not load the fund list. Tap to retry.'); }).finally(() => { if (!cancelled) setFundsLoading(false); });
    return () => { cancelled = true; };
  }, [open, draft.assetType, funds.length]);

  const loadNav = async (schemeCode: string, name?: string) => {
    if (!schemeCode) return;
    setNavLoading(true); setNavError('');
    try {
      const response = await fetch(`https://api.mfapi.in/mf/${encodeURIComponent(schemeCode)}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      const latest = Array.isArray(data?.data) ? data.data.find((row: any) => Number(row?.nav) > 0) : null;
      if (!latest) throw new Error();
      setDraft(d => ({ ...d, name: name || d.name, schemeCode, currentPrice: String(latest.nav), navDate: String(latest.date || '') }));
    } catch { setNavError('Could not fetch the latest NAV. You can enter it manually.'); }
    finally { setNavLoading(false); }
  };

  const selectFund = (fund: Fund) => { setFundOpen(false); setFundQuery(fund.schemeName); setDraft(d => ({ ...d, name: fund.schemeName, schemeCode: fund.schemeCode })); void loadNav(fund.schemeCode, fund.schemeName); };
  const openCreate = () => { setEditingId(null); setDraft(emptyDraft); setFundQuery(''); setFundOpen(false); setNavError(''); setOpen(true); };
  const openEdit = (item: InvestmentHolding) => { setEditingId(item.id); setDraft({ assetType: item.assetType, name: item.name, schemeCode: item.schemeCode || '', units: String(item.units), investedAmount: String(item.investedAmount), currentPrice: String(item.currentPrice), navDate: item.navDate || '', goalId: item.goalId || '', mode: 'existing' }); setFundQuery(item.name); setFundOpen(false); setNavError(''); setOpen(true); };
  const close = () => { setOpen(false); setEditingId(null); setDraft(emptyDraft); setFundQuery(''); setFundOpen(false); setNavError(''); };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = draft.name.trim(); const price = Number(draft.currentPrice); let units = Number(draft.units); const invested = Number(draft.investedAmount || 0);
    if (!name || !Number.isFinite(price) || price <= 0) return;
    if (draft.mode === 'purchase' && (!Number.isFinite(invested) || invested <= 0)) return;
    if (draft.mode === 'purchase') units = invested / price;
    if (!Number.isFinite(units) || units <= 0 || !Number.isFinite(invested) || invested < 0) return;
    const item: InvestmentHolding = { id: editingId || makeId(name), assetType: draft.assetType, name, ...(draft.schemeCode ? { schemeCode: draft.schemeCode } : {}), units, investedAmount: invested, currentPrice: price, currentValue: units * price, lastUpdatedAt: Date.now(), ...(draft.navDate ? { navDate: draft.navDate } : {}), source: draft.assetType === 'mutual-fund' && draft.schemeCode ? 'automatic' : 'manual', goalId: draft.goalId || undefined };
    const next = editingId ? holdings.map(existing => existing.id === editingId ? item : existing) : [...holdings, item];
    setSaving(true); try { await onSave({ ...config, holdings: next }); close(); } finally { setSaving(false); }
  };

  const refreshHolding = async (item: InvestmentHolding) => {
    if (item.assetType !== 'mutual-fund' || !item.schemeCode) return;
    setSaving(true);
    try {
      const response = await fetch(`https://api.mfapi.in/mf/${encodeURIComponent(item.schemeCode)}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      const latest = Array.isArray(data?.data) ? data.data.find((row: any) => Number(row?.nav) > 0) : null;
      if (!latest) throw new Error();
      const price = Number(latest.nav);
      await onSave({ ...config, holdings: holdings.map(existing => existing.id === item.id ? { ...existing, currentPrice: price, currentValue: existing.units * price, lastUpdatedAt: Date.now(), navDate: String(latest.date || ''), source: 'automatic' as const } : existing) });
    } catch { window.alert('Could not refresh this NAV right now. Please try again later.'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => { const item = holdings.find(entry => entry.id === id); if (!item || !window.confirm(`Remove ${item.name} from holdings?`)) return; await onSave({ ...config, holdings: holdings.filter(entry => entry.id !== id) }); };

  return <section className="mt-5 w-full space-y-5">
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Investment holdings</p><h3 className="mt-1 text-xl font-bold text-slate-900">Know what you actually own</h3><p className="mt-1 max-w-2xl text-sm text-slate-500">Select your mutual fund once. AHVIQ fetches the latest available NAV and calculates your current value from your units.</p></div><button type="button" onClick={openCreate} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700"><Plus className="h-4 w-4" /> Add holding</button></div>
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3"><div className="rounded-xl border border-white bg-white/80 p-3"><p className="text-[11px] text-slate-400">Current value</p><p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(totals.current)}</p></div><div className="rounded-xl border border-white bg-white/80 p-3"><p className="text-[11px] text-slate-400">Invested</p><p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(totals.invested)}</p></div><div className="rounded-xl border border-white bg-white/80 p-3"><p className="text-[11px] text-slate-400">Gain / Loss</p><p className={`mt-1 text-lg font-bold tabular-nums ${gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{gain >= 0 ? '+' : ''}{formatCurrency(gain)}</p></div></div>
    </div>

    {holdings.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-indigo-500"/><h4 className="mt-3 text-sm font-bold text-slate-900">No holdings added yet</h4><p className="mx-auto mt-1 max-w-md text-xs text-slate-500">Add each fund or stock once. Mutual-fund NAVs can then be refreshed automatically.</p><button type="button" onClick={openCreate} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white"><Plus className="h-4 w-4"/> Add existing investment</button></div> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{holdings.map(item => { const itemGain = item.currentValue - item.investedAmount; const pct = item.investedAmount > 0 ? (itemGain / item.investedAmount) * 100 : 0; return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${item.assetType === 'mutual-fund' ? 'bg-emerald-500' : 'bg-cyan-500'}`}/><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.assetType === 'mutual-fund' ? 'Mutual Fund' : 'Stock'}</p></div><h4 className="mt-1 truncate text-base font-bold text-slate-900">{item.name}</h4></div><div className="flex items-center gap-1"><button type="button" onClick={() => item.assetType === 'mutual-fund' ? void refreshHolding(item) : openEdit(item)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label={`Refresh ${item.name}`}><RefreshCw className="h-4 w-4"/></button><button type="button" onClick={() => openEdit(item)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label={`Edit ${item.name}`}><Pencil className="h-4 w-4"/></button><button type="button" onClick={() => remove(item.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete ${item.name}`}><Trash2 className="h-4 w-4"/></button></div></div><div className="mt-4 grid grid-cols-2 gap-3"><div><p className="text-[11px] text-slate-400">Units owned</p><p className="mt-0.5 text-sm font-bold text-slate-800 tabular-nums">{item.units.toLocaleString('en-IN', { maximumFractionDigits: 4 })}</p></div><div><p className="text-[11px] text-slate-400">Latest {item.assetType === 'mutual-fund' ? 'NAV' : 'price'}</p><p className="mt-0.5 text-sm font-bold text-slate-800 tabular-nums">{formatCurrency(item.currentPrice)}</p></div></div><div className="mt-4 rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] text-slate-400">Current value</p><p className="mt-0.5 text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(item.currentValue)}</p></div><div className="text-right"><p className={`text-sm font-bold ${itemGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{itemGain >= 0 ? '+' : ''}{formatCurrency(itemGain)}</p><p className={`text-[11px] font-semibold ${itemGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</p></div></div></div><div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400"><RefreshCw className="h-3 w-3"/> {item.assetType === 'mutual-fund' && item.navDate ? `NAV as of ${item.navDate}` : `Last value update: ${new Date(item.lastUpdatedAt).toLocaleDateString('en-IN')}`}</div></article>; })}</div>}

    {open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><div role="dialog" aria-modal="true" className="w-full max-w-2xl rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6 max-h-[92vh] overflow-y-auto"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Portfolio</p><h3 className="mt-1 text-xl font-bold text-slate-900">{editingId ? 'Edit holding' : 'Add investment holding'}</h3><p className="mt-1 text-xs text-slate-500">Mutual funds use the latest available NAV automatically.</p></div><button type="button" onClick={close} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5"/></button></div>
      <form onSubmit={save} className="mt-5 space-y-5">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-1"><button type="button" onClick={() => { setDraft(d => ({ ...d, assetType: 'mutual-fund', name: '', schemeCode: '', currentPrice: '', navDate: '' })); setFundQuery(''); }} className={`rounded-lg px-3 py-2.5 text-sm font-bold ${draft.assetType === 'mutual-fund' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Mutual Fund</button><button type="button" onClick={() => { setDraft(d => ({ ...d, assetType: 'stock', name: '', schemeCode: '', currentPrice: '', navDate: '' })); setFundOpen(false); }} className={`rounded-lg px-3 py-2.5 text-sm font-bold ${draft.assetType === 'stock' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Stock</button></div>
        {draft.assetType === 'mutual-fund' ? <div className="relative"><span className="text-xs font-semibold text-slate-600">Search & select fund <span className="text-rose-500">*</span></span><div className="relative mt-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input required value={fundQuery} onFocus={() => setFundOpen(true)} onChange={e => { setFundQuery(e.target.value); setFundOpen(true); if (draft.name !== e.target.value) setDraft(d => ({ ...d, name: e.target.value, schemeCode: '', currentPrice: '', navDate: '' })); }} placeholder="Search fund name..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-10 text-sm outline-none focus:border-indigo-500"/><ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400"/></div>{fundOpen && <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{fundsLoading ? <div className="flex items-center gap-2 p-3 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin"/>Loading mutual funds...</div> : fundsError ? <button type="button" onClick={() => { setFunds([]); setFundsError(''); }} className="w-full p-3 text-left text-xs text-rose-600">{fundsError}</button> : filteredFunds.length ? filteredFunds.map(fund => <button type="button" key={fund.schemeCode} onMouseDown={e => e.preventDefault()} onClick={() => selectFund(fund)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-indigo-50"><span className="block text-xs font-semibold text-slate-800">{fund.schemeName}</span><span className="mt-0.5 block text-[10px] text-slate-400">Scheme code: {fund.schemeCode}</span></button>) : <div className="p-3 text-xs text-slate-500">No matching funds found.</div>}</div>}</div> : <label className="block"><span className="text-xs font-semibold text-slate-600">Stock name / symbol <span className="text-rose-500">*</span></span><div className="relative mt-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input required value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="e.g. HDFC Bank / HDFCBANK" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500"/></div></label>}
        {draft.assetType === 'mutual-fund' && <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3"><div className="flex items-center justify-between gap-3"><div><span className="text-xs font-semibold text-slate-700">Latest NAV</span>{draft.navDate && <span className="ml-2 text-[10px] text-emerald-700">as of {draft.navDate}</span>}</div>{draft.schemeCode && <button type="button" disabled={navLoading} onClick={() => void loadNav(draft.schemeCode, draft.name)} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">{navLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : <RefreshCw className="h-3 w-3"/>} Refresh NAV</button>}</div><div className="mt-2 flex items-center gap-2"><input required type="number" min="0.0001" step="0.0001" value={draft.currentPrice} onChange={e => setDraft(d => ({ ...d, currentPrice: e.target.value }))} placeholder="Select a fund to fetch NAV" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"/><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600"/></div>{navLoading && <p className="mt-1 text-[10px] text-emerald-700">Fetching latest available NAV...</p>}{navError && <p className="mt-1 text-[10px] text-rose-600">{navError}</p>}<p className="mt-1 text-[10px] text-slate-500">NAV data is sourced from a free public service that mirrors AMFI's published data.</p></div>}
        {!editingId && <div><span className="text-xs font-semibold text-slate-600">Holding type</span><div className="mt-1 grid grid-cols-2 gap-2"><button type="button" onClick={() => setDraft(d => ({ ...d, mode: 'existing' }))} className={`rounded-xl border px-3 py-3 text-left ${draft.mode === 'existing' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}><span className="block text-sm font-bold text-slate-800">Existing holding</span><span className="mt-0.5 block text-[11px] text-slate-500">I already own this investment</span></button><button type="button" onClick={() => setDraft(d => ({ ...d, mode: 'purchase' }))} className={`rounded-xl border px-3 py-3 text-left ${draft.mode === 'purchase' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}><span className="block text-sm font-bold text-slate-800">New purchase</span><span className="mt-0.5 block text-[11px] text-slate-500">Calculate units from amount</span></button></div></div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{draft.mode === 'existing' || editingId ? <label className="block"><span className="text-xs font-semibold text-slate-600">Units owned *</span><input required type="number" min="0" step="0.0001" value={draft.units} onChange={e => setDraft(d => ({ ...d, units: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label> : <label className="block"><span className="text-xs font-semibold text-slate-600">Purchase amount *</span><input required type="number" min="0.01" step="0.01" inputMode="decimal" value={draft.investedAmount} onChange={e => setDraft(d => ({ ...d, investedAmount: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label>}<label className="block"><span className="text-xs font-semibold text-slate-600">Invested amount {draft.mode === 'existing' ? '(optional)' : ''}</span><input type="number" min="0" step="0.01" inputMode="decimal" value={draft.investedAmount} onChange={e => setDraft(d => ({ ...d, investedAmount: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label></div>
        {investmentGoals.length > 0 && <label className="block"><span className="text-xs font-semibold text-slate-600">Link to investment goal</span><select value={draft.goalId} onChange={e => setDraft(d => ({ ...d, goalId: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">No goal</option>{investmentGoals.map(goal => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></label>}
        {draft.assetType === 'stock' && <label className="block rounded-xl border border-amber-100 bg-amber-50/60 p-3"><span className="text-xs font-semibold text-slate-700">Latest market price</span><input required type="number" min="0.0001" step="0.0001" value={draft.currentPrice} onChange={e => setDraft(d => ({ ...d, currentPrice: e.target.value }))} placeholder="Enter current price" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"/><p className="mt-1 text-[10px] text-amber-700">Stock prices remain manual for now; mutual-fund NAV is automatic.</p></label>}
        <div className="flex justify-end gap-2"><button type="button" onClick={close} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button disabled={saving || navLoading} type="submit" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : editingId ? 'Save changes' : 'Save holding'}</button></div>
      </form></div></div>}
  </section>;
};
