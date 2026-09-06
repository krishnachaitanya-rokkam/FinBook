import { useEffect, useMemo, useState } from 'react';
import { Users, UserPlus, Copy, Check, ShieldCheck, Wallet, TrendingUp, X, LogOut } from 'lucide-react';
import { collection, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { firebaseAuth, firestore } from '../services/firebase';
import { subscribeToUserData } from '../services/firestoreData';
import { subscribeToPortfolio } from '../services/portfolioService';

interface FamilyPageProps { userName: string; email: string; }
type Role = 'owner' | 'member' | 'viewer';
type FamilyMember = { name: string; email: string; role: Role; joinedAt: number };
type FamilyDoc = { name: string; ownerId: string; memberIds: string[]; members: Record<string, FamilyMember>; createdAt: number };
type FamilySummary = { name: string; email: string; income: number; spending: number; savings: number; netWorth: number; updatedAt: number };

const familyLinkDoc = (uid:string) => doc(firestore, 'users', uid, 'family', 'link');
const familyDoc = (id:string) => doc(firestore, 'families', id);
const summariesCollection = (id:string) => collection(firestore, 'families', id, 'summaries');
const inviteDoc = (code:string) => doc(firestore, 'familyInvites', code);
const makeId = (prefix:string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
const makeCode = () => Math.random().toString(36).slice(2,8).toUpperCase();
const money = (value:number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

export function FamilyPage({userName,email}:FamilyPageProps){
  const uid = firebaseAuth.currentUser?.uid || '';
  const [familyId,setFamilyId] = useState('');
  const [family,setFamily] = useState<FamilyDoc|null>(null);
  const [summaries,setSummaries] = useState<FamilySummary[]>([]);
  const [inviteEmail,setInviteEmail] = useState('');
  const [inviteCode,setInviteCode] = useState('');
  const [joinCode,setJoinCode] = useState('');
  const [familyName,setFamilyName] = useState('Our Family');
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [copied,setCopied] = useState(false);
  const [personal,setPersonal] = useState({income:0,spending:0,netWorth:0});

  useEffect(()=>{
    if(!uid) return;
    return onSnapshot(familyLinkDoc(uid),snap=>setFamilyId(String(snap.data()?.familyId||'')));
  },[uid]);

  useEffect(()=>{
    if(!familyId){setFamily(null);setSummaries([]);return;}
    const unsubFamily=onSnapshot(familyDoc(familyId),snap=>setFamily(snap.exists() ? snap.data() as FamilyDoc : null));
    const unsubSummaries=onSnapshot(summariesCollection(familyId),snap=>setSummaries(snap.docs.map(d=>d.data() as FamilySummary)));
    return ()=>{unsubFamily();unsubSummaries();};
  },[familyId]);

  useEffect(()=>{
    if(!uid) return;
    let stopData=()=>{}; let stopPortfolio=()=>{};
    stopData=subscribeToUserData(uid,data=>{
      const now=new Date(); const key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      const income=data.incomes.filter(i=>i.date.startsWith(key)).reduce((s,i)=>s+i.amount,0);
      const spending=data.expenses.filter(e=>e.date.startsWith(key)).reduce((s,e)=>s+e.amount,0);
      setPersonal(p=>({...p,income,spending}));
      if(familyId){void setDoc(doc(firestore,'families',familyId,'summaries',uid),{name:userName,email,income,spending,savings:income-spending,netWorth:p.netWorth,updatedAt:Date.now()},{merge:true});}
    });
    stopPortfolio=subscribeToPortfolio(uid,data=>{
      const portfolioAssets=data.fields.reduce((s,f)=>s+(Number(f.amount)||0),0);
      const netWorth=(data.netWorthItems||[]).reduce((s,item)=>s+(item.kind==='liability'?-Number(item.amount):Number(item.amount)),0) || portfolioAssets;
      setPersonal(p=>({...p,netWorth}));
      if(familyId){void setDoc(doc(firestore,'families',familyId,'summaries',uid),{name:userName,email,income:personal.income,spending:personal.spending,savings:personal.income-personal.spending,netWorth,updatedAt:Date.now()},{merge:true});}
    });
    return ()=>{stopData();stopPortfolio();};
  },[uid,familyId,userName,email]);

  const familyTotals=useMemo(()=>summaries.reduce((a,s)=>({income:a.income+s.income,spending:a.spending+s.spending,savings:a.savings+s.savings,netWorth:a.netWorth+s.netWorth}),{income:0,spending:0,savings:0,netWorth:0}),[summaries]);
  const currentRole=family?.members?.[uid]?.role || 'member';

  const createFamily=async()=>{
    if(!uid)return; setBusy(true);setMessage('');
    const id=makeId('fam'); const cleanName=familyName.trim()||'Our Family';
    const member:FamilyMember={name:userName,email,role:'owner',joinedAt:Date.now()};
    try{
      await setDoc(familyDoc(id),{name:cleanName,ownerId:uid,memberIds:[uid],members:{[uid]:member},createdAt:Date.now()});
      await setDoc(familyLinkDoc(uid),{familyId:id,role:'owner',updatedAt:Date.now()});
      setMessage('Family created. You can now invite a member.');
    }catch(error:any){setMessage(error?.message||'Could not create family.');}finally{setBusy(false);}
  };

  const invite=async()=>{
    const target=inviteEmail.trim().toLowerCase();
    if(!familyId||!family||currentRole!=='owner'){setMessage('Only the family owner can invite members.');return;}
    if(!target||!target.includes('@')){setMessage('Enter a valid email address.');return;}
    if(family.members && Object.values(family.members).some(m=>m.email.toLowerCase()===target)){setMessage('That email is already in the family.');return;}
    setBusy(true);setMessage('');
    const code=makeCode();
    try{
      await setDoc(inviteDoc(code),{familyId,ownerId:uid,inviteeEmail:target,role:'member',status:'pending',createdAt:Date.now(),expiresAt:Date.now()+7*24*60*60*1000});
      setInviteCode(code);setMessage('Invite created. Share this code with your family member.');setInviteEmail('');
    }catch(error:any){setMessage(error?.message||'Could not create invite.');}finally{setBusy(false);}
  };

  const joinFamily=async()=>{
    const code=joinCode.trim().toUpperCase();
    if(!uid||!code){setMessage('Enter the invite code.');return;}
    setBusy(true);setMessage('');
    try{
      const inviteSnap=await getDoc(inviteDoc(code));
      if(!inviteSnap.exists())throw new Error('Invite code not found.');
      const inviteData=inviteSnap.data();
      if(inviteData.status!=='pending')throw new Error('This invite has already been used.');
      if(Number(inviteData.expiresAt||0)<Date.now())throw new Error('This invite has expired.');
      if(String(inviteData.inviteeEmail||'').toLowerCase()!==(email||'').toLowerCase())throw new Error('This invite was created for a different email address.');
      const targetId=String(inviteData.familyId); const target=await getDoc(familyDoc(targetId));
      if(!target.exists())throw new Error('Family no longer exists.');
      const data=target.data() as FamilyDoc;
      if(data.memberIds.includes(uid))throw new Error('You are already in this family.');
      const member:FamilyMember={name:userName,email,role:'member',joinedAt:Date.now()};
      await updateDoc(familyDoc(targetId),{memberIds:[...data.memberIds,uid],members:{...data.members,[uid]:member}});
      await setDoc(familyLinkDoc(uid),{familyId:targetId,role:'member',updatedAt:Date.now()});
      await updateDoc(inviteDoc(code),{status:'accepted',acceptedBy:uid,acceptedAt:Date.now()});
      setJoinCode('');setMessage(`Joined ${data.name}.`);
    }catch(error:any){setMessage(error?.message||'Could not join family.');}finally{setBusy(false);}
  };

  const leaveFamily=async()=>{
    if(!familyId||!family||currentRole==='owner'){setMessage('The family owner must transfer ownership before leaving.');return;}
    if(!confirm(`Leave ${family.name}? Your personal transactions will remain private.`))return;
    setBusy(true);
    try{
      const remaining=family.memberIds.filter(id=>id!==uid);
      const members={...family.members}; delete members[uid];
      await updateDoc(familyDoc(familyId),{memberIds:remaining,members});
      await setDoc(familyLinkDoc(uid),{familyId:'',role:'',updatedAt:Date.now()});
      setMessage('You left the family.');
    }catch(error:any){setMessage(error?.message||'Could not leave family.');}finally{setBusy(false);}
  };

  const copyCode=async()=>{if(!inviteCode)return;try{await navigator.clipboard.writeText(inviteCode);setCopied(true);window.setTimeout(()=>setCopied(false),1800);}catch{setMessage(`Invite code: ${inviteCode}`);}};

  if(!familyId){
    return <section className="bg-white rounded-2xl border p-4 sm:p-5 overflow-hidden">
      <div className="flex items-start gap-3 mb-5"><div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Users className="h-5 w-5"/></div><div><h2 className="font-bold">Family</h2><p className="text-xs text-slate-500 mt-1">Create a shared household view without exposing personal transactions.</p></div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-slate-50 p-4"><p className="font-semibold">Start a family</p><p className="text-xs text-slate-500 mt-1">You remain the owner and decide who joins.</p><input value={familyName} onChange={e=>setFamilyName(e.target.value)} className="mt-3 w-full rounded-lg border bg-white px-3 py-2.5 text-sm" placeholder="Family name"/><button disabled={busy} onClick={()=>void createFamily()} className="mt-3 w-full rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{busy?'Creating…':'Create family'}</button></div>
        <div className="rounded-xl border p-4"><p className="font-semibold">Join a family</p><p className="text-xs text-slate-500 mt-1">Use the code shared with your account email.</p><input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))} className="mt-3 w-full rounded-lg border px-3 py-2.5 text-sm tracking-[0.2em] uppercase" placeholder="ABC123"/><button disabled={busy} onClick={()=>void joinFamily()} className="mt-3 w-full rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{busy?'Joining…':'Join family'}</button></div>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800"><ShieldCheck className="h-4 w-4 mt-0.5 shrink-0"/><span>AHVIQ shares household summaries, not your private transaction list. Your personal records stay under your own account.</span></div>
      {message&&<p className="mt-3 text-xs text-slate-600">{message}</p>}
    </section>;
  }

  return <section className="bg-white rounded-2xl border p-4 sm:p-5 overflow-hidden">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"><div className="flex items-start gap-3"><div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Users className="h-5 w-5"/></div><div><h2 className="font-bold">{family?.name||'Family'}</h2><p className="text-xs text-slate-500 mt-1">Shared household view · {currentRole}</p></div></div><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{family?.memberIds.length||0} members</span>{currentRole!=='owner'&&<button disabled={busy} onClick={()=>void leaveFamily()} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold text-slate-600"><LogOut className="h-3.5 w-3.5"/>Leave</button>}</div></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Family income</p><p className="text-lg font-bold mt-1">{money(familyTotals.income)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Family spending</p><p className="text-lg font-bold mt-1">{money(familyTotals.spending)}</p></div><div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Family savings</p><p className="text-lg font-bold mt-1 text-emerald-700">{money(familyTotals.savings)}</p></div><div className="rounded-xl bg-indigo-50 p-3"><p className="text-xs text-indigo-700">Combined net worth</p><p className="text-lg font-bold mt-1 text-indigo-700">{money(familyTotals.netWorth)}</p></div></div>
    <div className="mt-5"><p className="text-sm font-bold">Family members</p><div className="mt-2 space-y-2">{family&&Object.entries(family.members||{}).map(([id,member])=><div key={id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5"><div className="flex items-center gap-3 min-w-0"><div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold shrink-0">{member.name?.charAt(0)?.toUpperCase()||'?'}</div><div className="min-w-0"><p className="text-sm font-semibold truncate">{member.name}{id===uid?' (You)':''}</p><p className="text-xs text-slate-500 truncate">{member.email}</p></div></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold capitalize">{member.role}</span></div>)}</div></div>
    {currentRole==='owner'&&<div className="mt-5 rounded-xl border bg-slate-50 p-4"><div className="flex items-start gap-3"><UserPlus className="h-5 w-5 text-indigo-600 mt-0.5"/><div className="min-w-0 flex-1"><p className="font-semibold text-sm">Invite a family member</p><p className="text-xs text-slate-500 mt-1">Invite codes are tied to the member's email and expire in 7 days.</p><div className="flex flex-col sm:flex-row gap-2 mt-3"><input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} type="email" className="flex-1 min-w-0 rounded-lg border bg-white px-3 py-2.5 text-sm" placeholder="partner@email.com"/><button disabled={busy} onClick={()=>void invite()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"><UserPlus className="h-4 w-4"/>Generate invite</button></div>{inviteCode&&<div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg bg-white border p-3"><div className="flex-1"><p className="text-[11px] uppercase tracking-wide text-slate-400">Invite code</p><p className="font-bold tracking-[0.25em] text-lg">{inviteCode}</p></div><button onClick={()=>void copyCode()} className="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold">{copied?<><Check className="h-4 w-4"/>Copied</>:<><Copy className="h-4 w-4"/>Copy code</>}</button></div>}</div></div></div>}
    <div className="mt-5 flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800"><ShieldCheck className="h-4 w-4 mt-0.5 shrink-0"/><span>Only shared monthly totals are visible to family members. Individual transactions, income entries and portfolio details remain private.</span></div>
    {message&&<p className="mt-3 text-xs text-slate-600">{message}</p>}
  </section>;
}
