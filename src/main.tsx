import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import FinBookApp from './FinBookApp';
import { RecurringBillsPage, RecurringItem } from './components/RecurringBillsPage';
import { CalendarClock, X } from 'lucide-react';
import './index.css';

const STORAGE_KEY = 'finbook-recurring-bills-v1';

function RecurringBillsLauncher() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<RecurringItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch {}
  }, []);

  const persist = (next: RecurringItem[]) => {
    setItems(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  return <>
    <button onClick={() => setOpen(true)} aria-label="Open Recurring and Bills" className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-800">
      <CalendarClock className="h-4 w-4" /><span className="hidden sm:inline">Recurring & Bills</span><span className="sm:hidden">Recurring</span>
    </button>
    {open && <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-50">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">FinBook Planning</p><h1 className="text-lg font-bold">Recurring & Bills</h1></div>
        <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
      </div>
      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-7"><RecurringBillsPage items={items} onSave={item => persist(items.some(i => i.id === item.id) ? items.map(i => i.id === item.id ? item : i) : [item, ...items])} onDelete={id => persist(items.filter(i => i.id !== id))} /></main>
    </div>}
  </>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FinBookApp />
    <RecurringBillsLauncher />
  </React.StrictMode>
);
