import { ArrowLeft, CheckCircle2, CircleAlert } from 'lucide-react';
import { DailyGroupBoard } from './DailyGroupBoard';
import { useOperationalStore } from './useOperationalStore';

type StayoverException={room:string;reason:'Refus service'|'Ne pas déranger'};
type Group={
 id:string;
 name?:string;
 arrival?:string;
 departure?:string;
 arrivalTime?:string;
 rooms?:number;
 housekeepingArrivalStatus?:string;
 stayoverStatus?:string;
 stayoverExceptions?:StayoverException[];
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
 const stayoverGroups=groupsStore.data
  .filter(group=>String(group.arrival)<today&&String(group.departure)>today&&['Recouche OK','Recouche partielle'].includes(group.stayoverStatus||''))
  .sort((a,b)=>(a.name||'').localeCompare(b.name||'','fr'));

 return <div className="reception-daily-page">
  <header className="reception-daily-header">
   <a href="/"><ArrowLeft size={18}/>Dashboard</a>
   <p>HospiCore · Réception</p>
   <h1>Pilotage quotidien des groupes</h1>
   <span>Arrivées, départs, horaires, réveils, salles de réunion et suivi Housekeeping.</span>
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

  {stayoverGroups.length>0&&<section style={{margin:'0 0 18px',padding:'16px',border:'1px solid #ded5cc',borderRadius:'16px',background:'#f8f5f1'}}>
   <div style={{display:'flex',alignItems:'center',gap:'9px',marginBottom:'10px',color:'#6f1d2f'}}>
    <CheckCircle2 size={21}/>
    <strong>Suivi des recouches</strong>
    <span style={{marginLeft:'auto',fontWeight:800}}>{stayoverGroups.length}</span>
   </div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))',gap:'10px'}}>
    {stayoverGroups.map(group=>{
     const partial=group.stayoverStatus==='Recouche partielle';
     return <article key={group.id} style={{padding:'13px',border:`1px solid ${partial?'#edc887':'#b9ddc4'}`,borderRadius:'12px',background:'#fff'}}>
      <div style={{display:'flex',alignItems:'flex-start',gap:'10px'}}>
       {partial?<CircleAlert size={19} color="#9a641e"/>:<CheckCircle2 size={19} color="#276440"/>}
       <div style={{flex:1}}>
        <strong style={{display:'block'}}>{group.name||'Groupe sans nom'}</strong>
        <small style={{display:'block',marginTop:'3px',color:'#7e6c70'}}>{group.rooms||0} chambre(s)</small>
       </div>
       <span style={{padding:'6px 9px',borderRadius:'999px',background:partial?'#fff2dc':'#dff2e4',color:partial?'#8d5a18':'#276440',fontSize:'12px',fontWeight:800}}>{partial?'Recouche partielle':'Recouche OK'}</span>
      </div>
      {partial&&<div style={{marginTop:'10px',paddingTop:'9px',borderTop:'1px solid #eee5dc'}}>
       <strong style={{display:'block',marginBottom:'6px',fontSize:'12px',color:'#76545c'}}>Chambres non faites</strong>
       {(group.stayoverExceptions||[]).length?(group.stayoverExceptions||[]).map(item=><div key={`${item.room}-${item.reason}`} style={{display:'flex',justifyContent:'space-between',gap:'10px',padding:'5px 0',fontSize:'13px'}}><b>Chambre {item.room}</b><span style={{color:'#8a6269'}}>{item.reason}</span></div>):<small>Aucune chambre renseignée.</small>}
      </div>}
     </article>;
    })}
   </div>
  </section>}

  <DailyGroupBoard/>
 </div>;
}
