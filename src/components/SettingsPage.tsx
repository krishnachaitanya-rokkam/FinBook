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

  const fieldClass = 'block w-full min-w-0 max-w-full box-border mt-1.5 rounded-lg border px-3 py-2.5 text-base outline-none';

  const sectionHeader = (icon: React.ReactNode, title: string, description: string, iconClass: string) => (
    <div className="flex items-start gap-3 mb-5 min-w-0 w-full">
      <div className={`h-10 w-10 rounded-xl ${iconClass} flex items-center justify-center shrink-0`}>{icon}</div>
      <div className="min-w-0 flex-1 pt-0.5 overflow-hidden">
        <h2 className="font-bold leading-5 whitespace-normal break-words">{title}</h2>
        <p className="text-xs text-slate-500 mt-1 leading-4 whitespace-normal break-words [overflow-wrap:anywhere] max-w-full">{description}</p>
      </div>
    </div>
  );

  return <div className="w-full min-w-0 max-w-full space-y-4 sm:space-y-5 overflow-hidden">
    <div className="min-w-0 max-w-full">
      <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>
      <p className="text-sm text-slate-500 mt-1 leading-5 whitespace-normal break-words [overflow-wrap:anywhere]">Manage your FinBook preferences and data.</p>
    </div>

    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 w-full min-w-0 max-w-full overflow-hidden">
      {sectionHeader(<User className="h-5 w-5"/>, 'Profile', 'Your FinBook account', 'bg-indigo-50 text-indigo-600')}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 w-full">
        <label className="block w-full min-w-0 text-sm font-medium">Name
          <input value={name} onChange={e=>setName(e.target.value)} className={`${fieldClass} focus:ring-2 focus:ring-indigo-200`} />
        </label>
        <label className="block w-full min-w-0 text-sm font-medium">Email
          <input value={email} disabled className={`${fieldClass} bg-slate-50 text-slate-500`} />
        </label>
      </div>
    </section>

    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 w-full min-w-0 max-w-full overflow-hidden">
      {sectionHeader(<SlidersHorizontal className="h-5 w-5"/>, 'Financial Preferences', 'Defaults used across FinBook', 'bg-violet-50 text-violet-600')}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 w-full">
        <label className="block w-full min-w-0 text-sm font-medium">Currency
          <select value={currency} onChange={e=>setCurrency(e.target.value)} className={`${fieldClass} bg-white`}><option>INR (₹)</option><option>USD ($)</option><option>EUR (€)</option><option>GBP (£)</option></select>
        </label>
        <label className="block w-full min-w-0 text-sm font-medium">Financial year
          <select value={fy} onChange={e=>setFy(e.target.value)} className={`${fieldClass} bg-white`}><option>April – March</option><option>January – December</option></select>
        </label>
      </div>
      <button onClick={savePreferences} className="mt-5 w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold"><Save className="h-4 w-4"/>{saved ? 'Saved' : 'Save preferences'}</button>
    </section>

    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 w-full min-w-0 max-w-full overflow-hidden">
      {sectionHeader(<Tags className="h-5 w-5"/>, 'Categories', 'Manage custom categories from the transaction workflow.', 'bg-amber-50 text-amber-600')}
      <p className="text-sm text-slate-600 leading-5 whitespace-normal break-words [overflow-wrap:anywhere]">Built-in categories remain available, including Investments. Custom category management can be expanded here later.</p>
    </section>

    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 w-full min-w-0 max-w-full overflow-hidden">
      {sectionHeader(<Cloud className="h-5 w-5"/>, 'Cloud & Sync', 'Your transactions and portfolio are synced with your account.', 'bg-emerald-50 text-emerald-600')}
      <div className="flex items-start gap-2 text-sm min-w-0"><span className="h-2.5 w-2.5 mt-1 rounded-full bg-emerald-500 shrink-0"/><span className="whitespace-normal break-words [overflow-wrap:anywhere]">Cloud sync enabled</span></div>
    </section>

    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 w-full min-w-0 max-w-full overflow-hidden">
      {sectionHeader(<Database className="h-5 w-5"/>, 'Data & Backup', 'Export or permanently clear your FinBook data.', 'bg-sky-50 text-sky-600')}
      <div className="flex flex-col sm:flex-row gap-2 w-full min-w-0">
        <button onClick={onExportData} className="w-full sm:w-auto min-w-0 flex items-center justify-center gap-2 border rounded-lg px-4 py-2.5 text-sm font-semibold"><Download className="h-4 w-4 shrink-0"/>Export CSV</button>
        <button onClick={onClearData} className="w-full sm:w-auto min-w-0 flex items-center justify-center gap-2 rounded-lg border border-red-200 text-red-600 px-4 py-2.5 text-sm font-semibold"><Trash2 className="h-4 w-4 shrink-0"/>Clear financial data</button>
      </div>
    </section>

    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 w-full min-w-0 max-w-full overflow-hidden">
      {sectionHeader(<Palette className="h-5 w-5"/>, 'Appearance', 'FinBook currently uses the default light theme. Dark mode can be added later.', 'bg-slate-100 text-slate-600')}
    </section>
  </div>;
}
