import { useState } from 'react';
import { User, SlidersHorizontal, Tags, Database, Palette, Cloud, Save, Download, Trash2 } from 'lucide-react';

interface SettingsPageProps {
  userName: string;
  email: string;
  onClearData: () => Promise<void>;
  onExportData: () => void;
}

export function SettingsPage({ userName, email, onClearData, onExportData }: SettingsPageProps) {
  const [name, setName] = useState(userName);
  const [currency, setCurrency] = useState('INR (₹)');
  const [fy, setFy] = useState('April – March');
  const [saved, setSaved] = useState(false);

  const savePreferences = () => {
    localStorage.setItem('finbook-settings', JSON.stringify({ name, currency, financialYear: fy }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return <div className="space-y-5">
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-sm text-slate-500 mt-1">Manage your FinBook preferences and data.</p>
    </div>

    <section className="bg-white rounded-2xl border p-5">
      <div className="flex items-center gap-3 mb-5"><div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><User className="h-5 w-5"/></div><div><h2 className="font-bold">Profile</h2><p className="text-xs text-slate-500">Your FinBook account</p></div></div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm font-medium">Name<input value={name} onChange={e=>setName(e.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-200"/></label>
        <label className="text-sm font-medium">Email<input value={email} disabled className="mt-1.5 w-full rounded-lg border px-3 py-2.5 bg-slate-50 text-slate-500"/></label>
      </div>
    </section>

    <section className="bg-white rounded-2xl border p-5">
      <div className="flex items-center gap-3 mb-5"><div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><SlidersHorizontal className="h-5 w-5"/></div><div><h2 className="font-bold">Financial Preferences</h2><p className="text-xs text-slate-500">Defaults used across FinBook</p></div></div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm font-medium">Currency<select value={currency} onChange={e=>setCurrency(e.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 bg-white"><option>INR (₹)</option><option>USD ($)</option><option>EUR (€)</option><option>GBP (£)</option></select></label>
        <label className="text-sm font-medium">Financial year<select value={fy} onChange={e=>setFy(e.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 bg-white"><option>April – March</option><option>January – December</option></select></label>
      </div>
      <button onClick={savePreferences} className="mt-5 flex items-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold"><Save className="h-4 w-4"/>{saved ? 'Saved' : 'Save preferences'}</button>
    </section>

    <section className="bg-white rounded-2xl border p-5">
      <div className="flex items-center gap-3 mb-4"><div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Tags className="h-5 w-5"/></div><div><h2 className="font-bold">Categories</h2><p className="text-xs text-slate-500">Manage custom categories from the transaction workflow.</p></div></div>
      <p className="text-sm text-slate-600">Built-in categories remain available, including Investments. Custom category management can be expanded here later.</p>
    </section>

    <section className="bg-white rounded-2xl border p-5">
      <div className="flex items-center gap-3 mb-4"><div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Cloud className="h-5 w-5"/></div><div><h2 className="font-bold">Cloud & Sync</h2><p className="text-xs text-slate-500">Your transactions and portfolio are synced with your account.</p></div></div>
      <div className="flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500"/> Cloud sync enabled</div>
    </section>

    <section className="bg-white rounded-2xl border p-5">
      <div className="flex items-center gap-3 mb-4"><div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center"><Database className="h-5 w-5"/></div><div><h2 className="font-bold">Data & Backup</h2><p className="text-xs text-slate-500">Export or permanently clear your FinBook data.</p></div></div>
      <div className="flex flex-wrap gap-2"><button onClick={onExportData} className="flex items-center gap-2 border rounded-lg px-4 py-2.5 text-sm font-semibold"><Download className="h-4 w-4"/>Export CSV</button><button onClick={onClearData} className="flex items-center gap-2 rounded-lg border border-red-200 text-red-600 px-4 py-2.5 text-sm font-semibold"><Trash2 className="h-4 w-4"/>Clear financial data</button></div>
    </section>

    <section className="bg-white rounded-2xl border p-5">
      <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"><Palette className="h-5 w-5"/></div><div><h2 className="font-bold">Appearance</h2><p className="text-xs text-slate-500">FinBook currently uses the default light theme. Dark mode can be added later.</p></div></div>
    </section>
  </div>;
}
