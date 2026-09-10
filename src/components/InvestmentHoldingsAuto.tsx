import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, ChevronDown, Loader2, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { InvestmentHolding, PortfolioConfig, PortfolioField, getEffectivePortfolioFields, getHoldingAssetType } from '../services/portfolioService';
import { formatCurrency } from '../utils/formatters';

interface Props { config: PortfolioConfig; onSave: (config: PortfolioConfig) => Promise<void>; }
type AssetType = 'mutual-fund' | 'stock';
type Mode = 'existing' | 'purchase';
type Fund = { schemeCode: string; schemeName: string };
type Draft = { assetType: AssetType; name: string; schemeCode: string; units: string; investedAmount: string; currentPrice: string; navDate: string; goalId: string; mode: Mode };

const EMPTY: Draft = { assetType: 'mutual-fund', name: '', schemeCode: '', units: '', investedAmount: '', currentPrice: '', navDate: '', goalId: '', mode: 'existing' };
const COLORS = ['#4f46e5', '#0891b2', '#0d9488', '#16a34a', '#d97706', '#db2777', '#7c3aed', '#64748b'];
const idFor = (prefix: string, value: string) => `${prefix}-${value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') || 'item'}-${Date.now()}`;

export const InvestmentHoldingsAuto: React.FC<Props> = ({ config, onSave }) => {
  const holdings = config.holdings || [];
  const fields = useMemo(() => getEffectivePortfolioFields(config), [config.fields, config.holdings]);
  const customFields = config.fields || [];
  const mutualFunds = useMemo(() => holdings.filter(h => h.assetType === 'mutual-fund'), [holdings]);
  const stocks = useMemo(() => holdings.filter(h => h.assetType === 'stock'), [holdings]);
  const otherInvestments = useMemo(() => fields.filter(f => !getHoldingAssetType(f)), [fields]);
  const goals = (config.goals || []).filter(g => g.scope === 'personal' && g.type === 'investment');
  const totals = useMemo(() => holdings.reduce((a, h) => ({ invested: a.invested + (Number(h.investedAmount) || 0), current: a.current + (Number(h.currentValue) || 0) }), { invested: 0, current: 0 }), [holdings]);
  const portfolioTotal = useMemo(() => fields.reduce((s, f) => s + (Number(f.amount) || 0), 0), [fields]);
  const gain = totals.current - totals.invested;
  const gainPct = totals.invested ? (gain / totals.invested) * 100 : 0;
  const mfTotal = mutualFunds.reduce((s, h) => s + (Number(h.currentValue) || 0), 0);
  const stockTotal = stocks.reduce((s, h) => s + (Number(h.currentValue) || 0), 0);

  const [holdingOpen, setHoldingOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editingHoldingId, setEditingHoldingId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [categoryDraft, setCategoryDraft] = useState({ label: '', amount: '' });
  const [saving, setSaving] = useState(false);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [fundsLoading, setFundsLoading] = useState(false);
  const [fundQuery, setFundQuery] = useState('');
  const [fundOpen, setFundOpen] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const [navError, setNavError] = useState('');

  const filteredFunds = useMemo(() => {
    const q = fundQuery.trim().toLowerCase();
    return (q ? funds.filter(f => f.schemeName.toLowerCase().includes(q) || f.schemeCode.includes(q)) : funds).slice(0, 25);
  }, [funds, fundQuery]);

  useEffect(() => {
    if (!holdingOpen || draft.assetType !== 'mutual-fund' || funds.length) return;
    let cancelled = false;
    setFundsLoading(true);
    fetch('https://api.mfapi.in/mf')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { if (!cancelled) setFunds(Array.isArray(data) ? data.map((f: any) => ({ schemeCode: String(f.schemeCode || ''), schemeName: String(f.schemeName || '') })).filter((f: Fund) => f.schemeCode && f.schemeName) : []); })
      .catch(() => { if (!cancelled) setFunds([]); })
      .finally(() => { if (!cancelled) setFundsLoading(false); });
    return () => { cancelled = true; };
  }, [holdingOpen, draft.assetType, funds.length]);

  const loadNav = async (schemeCode: string, name?: string) => {
    if (!schemeCode) return;
    setNavLoading(true); setNavError('');
    try {
      const r = await fetch(`https://api.mfapi.in/mf/${encodeURIComponent(schemeCode)}`);
      if (!r.ok) throw new Error();
      const data = await r.json();
      const latest = Array.isArray(data?.data) ? data.data.find((x: any) => Number(x?.nav) > 0) : null;
      if (!latest) throw new Error();
      setDraft(d => ({ ...d, name: name || d.name, schemeCode, currentPrice: String(latest.nav), navDate: String(latest.date || '') }));
    } catch { setNavError('Latest NAV could not be loaded. You can enter it manually.'); }
    finally { setNavLoading(false); }
  };

  const closeHolding = () => { setHoldingOpen(false); setEditingHoldingId(null); setDraft(EMPTY); setFundQuery(''); setFundOpen(false); setNavError(''); };
  const openCreateHolding = (assetType: AssetType) => { setEditingHoldingId(null); setDraft({ ...EMPTY, assetType }); setFundQuery(''); setFundOpen(false); setNavError(''); setHoldingOpen(true); };
  const openEditHolding = (h: InvestmentHolding) => { setEditingHoldingId(h.id); setDraft({ assetType: h.assetType, name: h.name, schemeCode: h.schemeCode || '', units: String(h.units), investedAmount: String(h.investedAmount), currentPrice: String(h.currentPrice), navDate: h.navDate || '', goalId: h.goalId || '', mode: 'existing' }); setFundQuery(h.name); setFundOpen(false); setNavError(''); setHoldingOpen(true); };

  const saveHolding = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = draft.name.trim();
    const price = Number(draft.currentPrice);
    const invested = Number(draft.investedAmount || 0);
    let units = Number(draft.units);
    if (!name || !Number.isFinite(price) || price <= 0) return;
    if (draft.mode === 'purchase') { if (!Number.isFinite(invested) || invested <= 0) return; units = invested / price; }
    if (!Number.isFinite(units) || units <= 0 || !Number.isFinite(invested) || invested < 0) return;
    const item: InvestmentHolding = { id: editingHoldingId || idFor('holding', name), assetType: draft.assetType, name, ...(draft.schemeCode ? { schemeCode: draft.schemeCode } : {}), units, investedAmount: invested, currentPrice: price, currentValue: units * price, lastUpdatedAt: Date.now(), ...(draft.navDate ? { navDate: draft.navDate } : {}), source: draft.assetType === 'mutual-fund' && draft.schemeCode ? 'automatic' : 'manual', goalId: draft.goalId || undefined };
    setSaving(true);
    try { await onSave({ ...config, holdings: editingHoldingId ? holdings.map(h => h.id === editingHoldingId ? item : h) : [...holdings, item] }); closeHolding(); }
    finally { setSaving(false); }
  };

  const refreshHolding = async (h: InvestmentHolding) => {
    if (h.assetType !== 'mutual-fund' || !h.schemeCode) { openEditHolding(h); return; }
    setSaving(true);
    try {
      const r = await fetch(`https://api.mfapi.in/mf/${encodeURIComponent(h.schemeCode)}`);
      if (!r.ok) throw new Error();
      const data = await r.json();
      const latest = Array.isArray(data?.data) ? data.data.find((x: any) => Number(x?.nav) > 0) : null;
      if (!latest) throw new Error();
      const price = Number(latest.nav);
      await onSave({ ...config, holdings: holdings.map(x => x.id === h.id ? { ...x, currentPrice: price, currentValue: x.units * price, lastUpdatedAt: Date.now(), navDate: String(latest.date || ''), source: 'automatic' as const } : x) });
    } catch { window.alert('Could not refresh this NAV right now.'); }
    finally { setSaving(false); }
  };

  const removeHolding = async (id: string) => {
    const h = holdings.find(x => x.id === id);
    if (!h || !window.confirm(`Remove ${h.name} from holdings?`)) return;
    setSaving(true); try { await onSave({ ...config, holdings: holdings.filter(x => x.id !== id) }); } finally { setSaving(false); }
  };

  const openCategoryCreate = () => { setEditingCategoryId(null); setCategoryDraft({ label: '', amount: '' }); setCategoryOpen(true); };
  const openCategoryEdit = (f: PortfolioField) => { setEditingCategoryId(f.id); setCategoryDraft({ label: f.label, amount: String(f.amount) }); setCategoryOpen(true); };
  const closeCategory = () => { setCategoryOpen(false); setEditingCategoryId(null); setCategoryDraft({ label: '', amount: '' }); };
  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    const label = categoryDraft.label.trim();
    const amount = Number(categoryDraft.amount);
    if (!label || !Number.isFinite(amount) || amount < 0) return;
    const next: PortfolioField[] = editingCategoryId
      ? customFields.map(f => f.id === editingCategoryId ? { ...f, label, amount } : f)
      : [...customFields, { id: idFor('asset', label), label, amount, color: COLORS[customFields.length % COLORS.length] }];
    setSaving(true); try { await onSave({ ...config, fields: next }); closeCategory(); } finally { setSaving(false); }
  };
  const removeCategory = async (id: string) => {
    const f = customFields.find(x => x.id === id);
    if (!f || !window.confirm(`Remove ${f.label} from investments?`)) return;
    setSaving(true); try { await onSave({ ...config, fields: customFields.filter(x => x.id !== id) }); } finally { setSaving(false); }
  };

  return <>
    <style>{`.ahviq-investments-dashboard ~ *:not(.fixed) { display:none !important; }`}</style>
    <section className="ahviq-investments-dashboard mt-5 w-full space-y-6">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 p-4 sm:p-5 shadow-sm">
        <div className="grid grid-cols-1 items-center lg:grid-cols-[1.4fr_1fr_1fr]">
          <div className="flex items-center gap-3 lg:border-r lg:border-indigo-100 lg:pr-6"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600"><BarChart3 className="h-6 w-6" /></div><div><p className="text-xs text-slate-500">Total Investments</p><p className="mt-0.5 text-2xl font-bold text-slate-900 tabular-nums">{formatCurrency(portfolioTotal)}</p><p className={`text-xs font-bold ${gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%)</p></div></div>
          <div className="mt-4 flex items-center gap-3 lg:mt-0 lg:border-r lg:border-indigo-100 lg:px-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 text-xl">↗</div><div><p className="text-xs text-slate-500">Total Gain/Loss</p><p className={`text-lg font-bold tabular-nums ${gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{gain >= 0 ? '+' : ''}{formatCurrency(gain)}</p></div></div>
          <div className="mt-4 lg:mt-0 lg:pl-6"><p className="text-xs text-slate-500">Asset Allocation</p><p className="text-sm font-semibold text-indigo-600">{fields.length} categories tracked</p></div>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-900">Other Investments</h3><p className="text-xs text-slate-500">Long-term, tax-saving and manually tracked investments</p></div><button type="button" onClick={openCategoryCreate} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /> Add category</button></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {otherInvestments.map(f => <article key={f.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${f.color}18`, color: f.color }}><ShieldCheck className="h-5 w-5" /></div><div><h4 className="text-sm font-bold text-slate-900">{f.label}</h4><p className="text-xs text-slate-400">{portfolioTotal ? Math.round((f.amount / portfolioTotal) * 100) : 0}% of total</p></div></div><div className="flex items-center gap-1"><button type="button" onClick={() => openCategoryEdit(f)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void removeCategory(f.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button></div></div><p className="mt-5 text-2xl font-bold text-slate-900 tabular-nums">{formatCurrency(f.amount)}</p></article>)}
        </div>
      </section>

      <AssetSection title="Mutual Funds" assetType="mutual-fund" total={mfTotal} portfolioTotal={portfolioTotal} items={mutualFunds} onAdd={() => openCreateHolding('mutual-fund')} onEdit={openEditHolding} onRefresh={refreshHolding} onDelete={removeHolding} />
      <AssetSection title="Stocks" assetType="stock" total={stockTotal} portfolioTotal={portfolioTotal} items={stocks} onAdd={() => openCreateHolding('stock')} onEdit={openEditHolding} onRefresh={refreshHolding} onDelete={removeHolding} />
    </section>

    {holdingOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4" role="dialog" aria-modal="true" onMouseDown={e => { if (e.target === e.currentTarget) closeHolding(); }}><form onSubmit={saveHolding} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><div><h3 className="text-lg font-bold text-slate-900">{editingHoldingId ? 'Edit holding' : `Add ${draft.assetType === 'mutual-fund' ? 'mutual fund' : 'stock'}`}</h3><p className="text-xs text-slate-500">Track units, invested amount and current value.</p></div><button type="button" onClick={closeHolding} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setDraft(d => ({ ...d, assetType: 'mutual-fund' }))} className={`rounded-lg px-3 py-2 text-xs font-semibold ${draft.assetType === 'mutual-fund' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Mutual Fund</button><button type="button" onClick={() => { setDraft(d => ({ ...d, assetType: 'stock', schemeCode: '', currentPrice: '', navDate: '' })); setFundOpen(false); }} className={`rounded-lg px-3 py-2 text-xs font-semibold ${draft.assetType === 'stock' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Stock</button></div>
      {draft.assetType === 'mutual-fund' ? <div className="relative mt-4"><span className="text-xs font-semibold text-slate-600">Search mutual fund</span><div className="mt-1 flex items-center rounded-xl border border-slate-200 px-3"><Search className="h-4 w-4 text-slate-400" /><input value={fundQuery} onFocus={() => setFundOpen(true)} onChange={e => { setFundQuery(e.target.value); setFundOpen(true); setDraft(d => ({ ...d, name: e.target.value, schemeCode: '', currentPrice: '', navDate: '' })); }} className="w-full border-0 px-2 py-2.5 text-sm outline-none" placeholder="Search fund name or scheme code" />{fundsLoading && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}<ChevronDown className="h-4 w-4 text-slate-400" /></div>{fundOpen && <div className="absolute left-0 right-0 top-full z-[110] mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{filteredFunds.length ? filteredFunds.map(f => <button type="button" key={f.schemeCode} onMouseDown={e => e.preventDefault()} onClick={() => { setFundOpen(false); setFundQuery(f.schemeName); setDraft(d => ({ ...d, name: f.schemeName, schemeCode: f.schemeCode })); void loadNav(f.schemeCode, f.schemeName); }} className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-indigo-50"><span className="block font-semibold text-slate-800">{f.schemeName}</span><span className="text-slate-400">{f.schemeCode}</span></button>) : <p className="p-3 text-xs text-slate-400">Type a fund name to search.</p>}</div>}</div> : <label className="mt-4 block text-xs font-semibold text-slate-600">Stock name / symbol<input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="e.g. HDFCBANK" /></label>}
      {draft.assetType === 'mutual-fund' && <p className="mt-2 text-[11px] text-slate-400">{draft.schemeCode ? `Scheme code: ${draft.schemeCode}` : 'Select a fund to fetch its latest NAV.'}</p>}{navError && <p className="mt-2 text-xs text-amber-600">{navError}</p>}
      <div className="mt-4 grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-slate-600">Units</label><input type="number" min="0" step="0.0001" value={draft.units} onChange={e => setDraft(d => ({ ...d, units: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div><div><label className="text-xs font-semibold text-slate-600">Current {draft.assetType === 'mutual-fund' ? 'NAV' : 'price'}</label><div className="relative"><input type="number" min="0" step="0.0001" value={draft.currentPrice} onChange={e => setDraft(d => ({ ...d, currentPrice: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />{navLoading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-indigo-500" />}</div></div></div>
      <div className="mt-3 grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-slate-600">Invested amount</label><input type="number" min="0" step="0.01" value={draft.investedAmount} onChange={e => setDraft(d => ({ ...d, investedAmount: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div><div><label className="text-xs font-semibold text-slate-600">NAV / price date</label><input value={draft.navDate} onChange={e => setDraft(d => ({ ...d, navDate: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="DD-MM-YYYY" /></div></div>
      {!editingHoldingId && <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setDraft(d => ({ ...d, mode: 'existing' }))} className={`rounded-lg px-3 py-2 text-xs font-semibold ${draft.mode === 'existing' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Enter units</button><button type="button" onClick={() => setDraft(d => ({ ...d, mode: 'purchase' }))} className={`rounded-lg px-3 py-2 text-xs font-semibold ${draft.mode === 'purchase' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Enter purchase amount</button></div>}
      {goals.length > 0 && <label className="mt-4 block text-xs font-semibold text-slate-600">Link to investment goal<select value={draft.goalId} onChange={e => setDraft(d => ({ ...d, goalId: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">No goal</option>{goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>}
      <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={closeHolding} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" disabled={saving || navLoading} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save holding</button></div></form></div>}

    {categoryOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4" role="dialog" aria-modal="true" onMouseDown={e => { if (e.target === e.currentTarget) closeCategory(); }}><form onSubmit={saveCategory} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><div><h3 className="text-lg font-bold text-slate-900">{editingCategoryId ? 'Edit investment category' : 'Add investment category'}</h3><p className="text-xs text-slate-500">PPF, NPS, bonds, gold or any future category.</p></div><button type="button" onClick={closeCategory} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><label className="mt-5 block text-xs font-semibold text-slate-600">Category name<input required value={categoryDraft.label} onChange={e => setCategoryDraft(d => ({ ...d, label: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="e.g. PPF" /></label><label className="mt-3 block text-xs font-semibold text-slate-600">Current value<input required type="number" min="0" step="0.01" value={categoryDraft.amount} onChange={e => setCategoryDraft(d => ({ ...d, amount: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="0" /></label><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={closeCategory} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save category'}</button></div></form></div>}
  </>;
};

interface AssetSectionProps { title: string; assetType: AssetType; total: number; portfolioTotal: number; items: InvestmentHolding[]; onAdd: () => void; onEdit: (item: InvestmentHolding) => void; onRefresh: (item: InvestmentHolding) => Promise<void>; onDelete: (id: string) => Promise<void>; }

const AssetSection: React.FC<AssetSectionProps> = ({ title, assetType, total, portfolioTotal, items, onAdd, onEdit, onRefresh, onDelete }) => (
  <section className={`rounded-2xl border p-4 sm:p-5 ${assetType === 'mutual-fund' ? 'border-emerald-100 bg-gradient-to-b from-emerald-50/50 to-white' : 'border-blue-100 bg-gradient-to-b from-blue-50/40 to-white'}`}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="text-lg font-bold text-slate-900">{title}</h3><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Live</span></div><p className="mt-1 text-xs text-slate-500">{items.length} {items.length === 1 ? 'holding' : 'holdings'} · {formatCurrency(total)} · {portfolioTotal ? ((total / portfolioTotal) * 100).toFixed(1) : '0.0'}% of total investments</p><p className="mt-0.5 text-[10px] text-slate-400">Calculated from your linked holdings</p></div><button type="button" onClick={onAdd} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"><Plus className="h-4 w-4" />Add {assetType === 'mutual-fund' ? 'mutual fund' : 'stock'}</button></div>
    {items.length ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map(item => <HoldingCard key={item.id} item={item} onEdit={onEdit} onRefresh={onRefresh} onDelete={onDelete} />)}</div> : <button type="button" onClick={onAdd} className="w-full rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 hover:border-indigo-300 hover:text-indigo-600">No {title.toLowerCase()} linked yet. Add one.</button>}
  </section>
);

const HoldingCard: React.FC<{ item: InvestmentHolding; onEdit: (item: InvestmentHolding) => void; onRefresh: (item: InvestmentHolding) => Promise<void>; onDelete: (id: string) => Promise<void> }> = ({ item, onEdit, onRefresh, onDelete }) => {
  const gain = (Number(item.currentValue) || 0) - (Number(item.investedAmount) || 0);
  const pct = item.investedAmount > 0 ? (gain / item.investedAmount) * 100 : 0;
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.assetType === 'mutual-fund' ? 'Mutual Fund' : 'Stock'}</p><h4 className="mt-1 truncate text-sm font-bold text-slate-900">{item.name}</h4></div><div className="flex items-center gap-1"><button type="button" onClick={() => void onRefresh(item)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><RefreshCw className="h-3.5 w-3.5" /></button><button type="button" onClick={() => onEdit(item)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void onDelete(item.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button></div></div><div className="mt-4 grid grid-cols-2 gap-3"><div><p className="text-[10px] text-slate-400">Units owned</p><p className="text-sm font-bold tabular-nums">{Number(item.units).toLocaleString('en-IN', { maximumFractionDigits: 4 })}</p></div><div><p className="text-[10px] text-slate-400">Latest {item.assetType === 'mutual-fund' ? 'NAV' : 'price'}</p><p className="text-sm font-bold tabular-nums">{formatCurrency(item.currentPrice)}</p></div></div><div className="mt-3 rounded-xl bg-slate-50 p-3"><div className="flex items-end justify-between"><div><p className="text-[10px] text-slate-400">Current value</p><p className="text-lg font-bold tabular-nums">{formatCurrency(item.currentValue)}</p></div><div className="text-right"><p className={`text-sm font-bold ${gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{gain >= 0 ? '+' : ''}{formatCurrency(gain)}</p><p className={`text-[10px] font-semibold ${gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</p></div></div></div><p className="mt-3 text-[10px] text-slate-400">{item.assetType === 'mutual-fund' && item.navDate ? `NAV as of ${item.navDate}` : `Last update: ${new Date(item.lastUpdatedAt).toLocaleDateString('en-IN')}`}</p></article>;
};