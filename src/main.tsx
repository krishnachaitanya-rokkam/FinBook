import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Brain } from 'lucide-react';
import FinBookApp from './FinBookApp';
import { IntelligencePage } from './components/IntelligencePage';
import './index.css';

function IntelligenceLauncher(){
  const [open,setOpen]=useState(false);
  return <>
    <button onClick={()=>setOpen(true)} aria-label="Open FinBook Intelligence" className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-700">
      <Brain className="h-4 w-4"/><span>Intelligence</span>
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
