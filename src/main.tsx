import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Brain, Sparkles } from 'lucide-react';
import FinBookApp from './FinBookApp';
import { IntelligencePage } from './components/IntelligencePage';
import './index.css';

function IntelligenceLauncher(){
  const [open,setOpen]=useState(false);
  return <>
    <button onClick={()=>setOpen(true)} aria-label="Open FinBook Intelligence" className="fixed right-4 top-4 z-[9999] inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-xl ring-1 ring-indigo-100 transition hover:bg-indigo-50 sm:right-6 sm:top-5">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white"><Brain className="h-4 w-4"/></span>
      <span>FinBook Intelligence</span>
      <Sparkles className="h-4 w-4 text-indigo-500"/>
    </button>
    {open&&<IntelligencePage onClose={()=>setOpen(false)}/>} 
  </>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FinBookApp />
    <IntelligenceLauncher />
  </React.StrictMode>
);
