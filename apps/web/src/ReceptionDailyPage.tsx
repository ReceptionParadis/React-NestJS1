import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { DailyGroupBoard } from './DailyGroupBoard';
import { useOperationalStore } from './useOperationalStore';

type Group={
 id:string;
 name?:string;
 arrival?:string;
 arrivalTime?:string;
 rooms?:number;
 housekeepingArrivalStatus?:string;
};

function todayIso(){
 const d=new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function ReceptionDailyPage(){
 const groupsStore=useOperationalStore<Group[]>('group-360',[]);
 const today=todayIso();
 const readyGroups=groupsStore.data
  .filter(group=>group.arrival===today&&group.housekeepingArrivalStatus==='Chambres prêtes à donner')
  .sort((a,b)=>(a.arrivalTime||'99:99').localeCompare(b.arrivalTime||'99:99'));

 return <div className="reception-daily-page">
  <header className="reception-daily-header">
   <a href="/"><ArrowLeft size={18}/>Dashboard</a>
   <p>HospiCore · Réception</p>
   <h1>Pilotage quotidien des groupes</h1>
   <span>Arrivées, départs, horaires, réveils et salles de réunion.</span>
  </header>

  {readyGroups.length>0&&<section style={{margin:'0 0 18px',padding:'16px',border:'1px solid #b9ddc4',borderRadius:'16px',background:'#edf8f0'}}>
   <div style={{display:'flex',alignItems:'center',gap:'9px',marginBottom:'10px',color:'#276440'}}>
    <CheckCircle2 size={21}/>
    <strong>Chambres prêtes à donner</strong>
    <span style={{marginLeft:'auto',fontWeight:800}}>{readyGroups.length}</span>
   </div>
   <div style={{display:'grid',gap:'8px'}}>
    {readyGroups.map(group=><article key={group.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'11px 13px',borderRadius:'11px',background:'#fff'}}>
     <div style={{flex:1}}>
      <strong style={{display:'block'}}>{group.name||'Groupe sans nom'}</strong>
      <small style={{color:'#6f7d73'}}>{group.rooms||0} chambre(s) · arrivée {group.arrivalTime||'à confirmer'}</small>
     </div>
     <span style={{padding:'6px 9px',borderRadius:'999px',background:'#dff2e4',color:'#276440',fontSize:'12px',fontWeight:800}}>Prêtes</span>
    </article>)}
   </div>
  </section>}

  <DailyGroupBoard/>
 </div>;
}
