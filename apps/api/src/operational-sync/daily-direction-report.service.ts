import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type JournalEntry={id?:string;at?:string;actor?:string;service?:string;source?:string;action?:string;priority?:string};
type Group={id?:string;name?:string;arrival?:string;departure?:string;pax?:number;status?:string;arrivalTime?:string;departureTime?:string};
type Maintenance={id?:string;title?:string;priority?:string;status?:string;blocked?:boolean;room?:string;zone?:string};
type Task={id?:string;title?:string;priority?:string;status?:string;service?:string;dueAt?:string};
type Complaint={id?:string;client?:string;room?:string;category?:string;description?:string;status?:string;createdAt?:string;createdBy?:string};
type Report={id:string;date:string;generatedAt:string;recipientIds:string[];recipientNames:string[];metrics:Record<string,number>;important:string[];tomorrow:string[];complaints:Array<{client:string;room?:string;category:string;description:string;status:string}>};

const REPORT_NAMESPACE='direction-daily-reports';
function parisParts(date=new Date()){const parts=new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(date);const get=(type:string)=>parts.find(p=>p.type===type)?.value||'';return{date:`${get('year')}-${get('month')}-${get('day')}`,hour:Number(get('hour')),minute:Number(get('minute'))}}
function addDays(value:string,n:number){const d=new Date(`${value}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function dayOf(value?:string){if(!value)return'';const t=Date.parse(value);if(!Number.isFinite(t))return String(value).slice(0,10);return parisParts(new Date(t)).date}
function roleIsDirection(value:string){const r=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return r.includes('direction')||r.includes('directeur')||r.includes('admin')}

@Injectable()
export class DailyDirectionReportService implements OnModuleInit,OnModuleDestroy{
 private timer?:NodeJS.Timeout;
 constructor(private readonly prisma:PrismaService){}
 async onModuleInit(){await this.checkAndGenerate();this.timer=setInterval(()=>void this.checkAndGenerate(),60_000)}
 onModuleDestroy(){if(this.timer)clearInterval(this.timer)}
 private async store<T>(hotelId:string,namespace:string,fallback:T):Promise<T>{const row=await this.prisma.operationalStore.findUnique({where:{hotelId_namespace:{hotelId,namespace}}});return (row?.payload??fallback) as T}
 private async checkAndGenerate(){try{const now=parisParts(),target=now.hour>23||(now.hour===23&&now.minute>=45)?now.date:addDays(now.date,-1);const hotels=await this.prisma.hotel.findMany({select:{id:true}});for(const hotel of hotels)await this.generateIfMissing(hotel.id,target)}catch(error){console.error('[HospiCore] Rapport Direction:',error)}}
 private async generateIfMissing(hotelId:string,date:string){const reportStore=await this.prisma.operationalStore.findUnique({where:{hotelId_namespace:{hotelId,namespace:REPORT_NAMESPACE}}});const reports:Array<Report>=Array.isArray(reportStore?.payload)?reportStore!.payload as unknown as Report[]:[];if(reports.some(r=>r.date===date))return;
  const tomorrow=addDays(date,1);
  const [journal,groups,maintenance,tasks,complaints,directionUsers]=await Promise.all([
   this.store<JournalEntry[]>(hotelId,'activity-journal',[]),this.store<Group[]>(hotelId,'group-360',[]),this.store<Maintenance[]>(hotelId,'maintenance-interventions',[]),this.store<Task[]>(hotelId,'tasks',[]),this.store<Complaint[]>(hotelId,'client-complaints',[]),this.prisma.user.findMany({where:{hotelId,status:'ACTIVE'},select:{id:true,firstName:true,lastName:true,role:{select:{name:true}}}})
  ]);
  const recipients=directionUsers.filter(u=>roleIsDirection(u.role.name));
  const journalToday=journal.filter(e=>dayOf(e.at)===date),complaintsToday=complaints.filter(c=>dayOf(c.createdAt)===date),arrivalsTomorrow=groups.filter(g=>g.arrival===tomorrow),departuresTomorrow=groups.filter(g=>g.departure===tomorrow),maintenanceOpen=maintenance.filter(m=>m.status!=='Terminée'),urgentMaintenance=maintenanceOpen.filter(m=>m.priority==='Urgente'||m.blocked),openTasks=tasks.filter(t=>t.status!=='Terminée'),urgentTasks=openTasks.filter(t=>String(t.priority||'').toLowerCase().includes('urgent')||String(t.priority||'').toLowerCase().includes('haute'));
  const important:string[]=[];
  if(complaintsToday.length)important.push(`${complaintsToday.length} plainte(s) client enregistrée(s) aujourd’hui.`);
  if(urgentMaintenance.length)important.push(`${urgentMaintenance.length} intervention(s) maintenance urgente(s) ou bloquée(s) encore ouverte(s).`);
  if(urgentTasks.length)important.push(`${urgentTasks.length} tâche(s) prioritaire(s) encore active(s).`);
  const criticalJournal=journalToday.filter(e=>String(e.priority||'').toLowerCase().includes('urgent')||String(e.priority||'').toLowerCase().includes('critique'));
  criticalJournal.slice(0,8).forEach(e=>important.push(`${e.service||'HospiCore'} · ${e.action||e.source||'Événement important'}`));
  if(!important.length)important.push('Aucun incident majeur signalé dans HospiCore sur la journée.');
  const attention:string[]=[];
  arrivalsTomorrow.sort((a,b)=>(a.arrivalTime||'99:99').localeCompare(b.arrivalTime||'99:99')).forEach(g=>attention.push(`Arrivée ${g.arrivalTime||'heure à confirmer'} · ${g.name||'Groupe'} · ${g.pax||0} pax.`));
  departuresTomorrow.sort((a,b)=>(a.departureTime||'99:99').localeCompare(b.departureTime||'99:99')).forEach(g=>attention.push(`Départ ${g.departureTime||'heure à confirmer'} · ${g.name||'Groupe'} · ${g.pax||0} pax.`));
  urgentMaintenance.slice(0,8).forEach(m=>attention.push(`Maintenance : ${m.title||'Intervention'}${m.room?` · chambre ${m.room}`:m.zone?` · ${m.zone}`:''}.`));
  urgentTasks.slice(0,8).forEach(t=>attention.push(`Tâche à suivre : ${t.title||'Tâche'} · ${t.service||'service à préciser'}.`));
  if(!attention.length)attention.push('Aucun point d’attention majeur identifié automatiquement pour demain.');
  const report:Report={id:`report-${date}`,date,generatedAt:new Date().toISOString(),recipientIds:recipients.map(r=>r.id),recipientNames:recipients.map(r=>`${r.firstName} ${r.lastName}`.trim()),metrics:{events:journalToday.length,complaints:complaintsToday.length,maintenanceOpen:maintenanceOpen.length,urgentMaintenance:urgentMaintenance.length,tasksOpen:openTasks.length,arrivalsTomorrow:arrivalsTomorrow.length,departuresTomorrow:departuresTomorrow.length},important,tomorrow:attention,complaints:complaintsToday.map(c=>({client:c.client||'Client non renseigné',room:c.room,category:c.category||'Autre',description:c.description||'',status:c.status||'Ouverte'}))};
  const next=[report,...reports].slice(0,730);
  await this.prisma.operationalStore.upsert({where:{hotelId_namespace:{hotelId,namespace:REPORT_NAMESPACE}},create:{hotelId,namespace:REPORT_NAMESPACE,payload:next as any},update:{payload:next as any,version:{increment:1}}});
 }
}
