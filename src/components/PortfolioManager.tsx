import React, { useMemo, useState } from 'react';
import { CircleDollarSign, Pencil, Plus, Settings2, Trash2, X } from 'lucide-react';
import { PortfolioConfig, PortfolioField } from '../services/portfolioService';
import { formatCurrency } from '../utils/formatters';

interface PortfolioManagerProps {
  config: PortfolioConfig;
  onSave: (config: PortfolioConfig) => Promise<void>;
}

const DEFAULT_PALETTE = ['#4f46e5', '#0891b2', '#0d9488', '#16a34a', '#d97706', '#db2777', '#7c3aed', '#64748b'];
const emptyDraft = { label: '', amount: '' };

function makeId(label: string) {
  const slug = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug || 'asset'}-${Date.now()}`;
}

export const PortfolioManager: React.FC<PortfolioManagerProps> = ({ config, onSave }) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const total = useMemo(() => config.fields.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [config.fields]);

  const openEdit = (field: PortfolioField) => {
    setEditingId(field.id);
    setDraft({ label: field.label, amount: String(field.amount) });
    setIsConfigOpen(true);
  };

  const closeEditor = () => {
    setIsConfigOpen(false);
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const saveField = async (event: React.FormEvent) => {
    event.preventDefault();
    const label = draft.label.trim();
    const amount = Number(draft.amount);
    if (!label || !Number.isFinite(amount) || amount < 0) return;
    const nextFields = editingId
      ? config.fields.map((field) => field.id === editingId ? { ...field, label, amount } : field)
      : [...config.fields, { id: makeId(label), label, amount, color: DEFAULT_PALETTE[config.fields.length % DEFAULT_PALETTE.length] }];
    setSaving(true);
    try { await onSave({ ...config, fields: nextFields }); closeEditor(); } finally { setSaving(false); }
  };

  const removeField = async (id: string) => {
    const field = config.fields.find((item) => item.id === id);
    if (!field || !window.confirm(`Remove ${field.label} from your portfolio?`)) return;
    setSaving(true);
    try { await onSave({ ...config, fields: config.fields.filter((item) => item.id !== id) }); } finally { setSaving(false); }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Portfolio</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Your Investment Portfolio</h2>
            <p className="mt-1 text-sm text-slate-500">Track the current value of your investments and savings in one place.</p>
          </div>
          <button type="button" onClick={() => setIsConfigOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition">
            <Settings2 className="h-4 w-4" /> Configure fields
          </button>
        </div>
        <div className="mt-6 rounded-xl border border-white/80 bg-white/80 p-5">
          <p className="text-xs font-medium text-slate-500">Total Portfolio Value</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{formatCurrency(total)}</p>
          <p className="mt-1 text-xs text-slate-400">Across {config.fields.length} configured field{config.fields.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      {config.fields.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <CircleDollarSign className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-900">No portfolio fields yet</h3>
          <p className="mt-1 text-xs text-slate-500">Add PPF, Mutual Funds, Stocks or any custom field you track.</p>
          <button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft); setIsConfigOpen(true); }} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"><Plus className="h-4 w-4" /> Add field</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {config.fields.map((field) => (
            <div key={field.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${field.color}18`, color: field.color }}><CircleDollarSign className="h-5 w-5" /></div>
                  <div className="min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{field.label}</p><p className="text-xs text-slate-400">Current value</p></div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => openEdit(field)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Edit ${field.label}`} title="Edit field"><Pencil className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => removeField(field.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${field.label}`} title="Remove field"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <p className="mt-6 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{formatCurrency(field.amount)}</p>
            </div>
          ))}
        </div>
      )}

      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div><h3 className="text-base font-bold text-slate-900">{editingId ? 'Edit portfolio field' : 'Configure portfolio'}</h3><p className="mt-0.5 text-xs text-slate-500">Add, rename, remove and update any amount field.</p></div>
              <button type="button" onClick={closeEditor} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={saveField} className="p-5 space-y-4">
              <div><label className="text-xs font-semibold text-slate-700">Field name</label><input autoFocus value={draft.label} onChange={(e) => setDraft((current) => ({ ...current, label: e.target.value }))} placeholder="e.g. PPF, Stocks, Real Estate" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></div>
              <div><label className="text-xs font-semibold text-slate-700">Current amount</label><input type="number" min="0" step="0.01" value={draft.amount} onChange={(e) => setDraft((current) => ({ ...current, amount: e.target.value }))} placeholder="0" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button type="button" onClick={closeEditor} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add field'}</button>
              </div>
            </form>
            {!editingId && config.fields.length > 0 && <div className="border-t border-slate-100 px-5 py-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Existing fields</p><div className="flex flex-wrap gap-2">{config.fields.map((field) => <button key={field.id} type="button" onClick={() => openEdit(field)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">{field.label}</button>)}</div></div>}
          </div>
        </div>
      )}
    </section>
  );
};
