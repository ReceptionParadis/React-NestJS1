import { useEffect, useMemo, useRef } from 'react';
import { useOperationalStore } from './useOperationalStore';

type MealCell={pax?:number;time?:string;water?:boolean;wine?:boolean};
type MealDay={date:string;breakfast?:MealCell;lunch?:MealCell;packedLunch?:MealCell;dinner?:MealCell;packedDinner?:MealCell;pdjBox?:MealCell;lodging?:MealCell};
type Audit={actor?:string;action?:string};
type Group={id:string;name?:string;commercial?:string;createdBy?:string;validatedBy?:string;nationality?:string;language?:string;arrival?:string;arrivalTime?:string;departure?:string;departureTime?:string;stayType?:string;breakfastType?:string;housekeepingType?:string;dietary?:string;allergies?:string;rooming?:boolean;depositReceived?:boolean;paymentStatus?:string;amountDue?:number;debtor?:string;status?:string;commercialNotes?:string;commercialValidated?:boolean;audit?:Audit[];mealDays?:MealDay[];leaderFirstName?:string;leaderLastName?:string;leaderPhone?:string;leaderEmail?:string;leader?:string;phone?:string;luggageArrival?:string;luggageDeparture?:string};
type FunctionLine={id:string;groupId:string;commercial:string;groupName:string;nationality:string;stayType:string;groupStatus:string;remarks:string;leaderFirstName:string;leaderLastName:string;leaderPhone:string;leaderEmail:string;arrivalDate:string;arrivalTime:string;arrivalService:string;departureDate:string;departureTime:string;lastService:string;roomingReceived:boolean;luggageArrival:string;luggageDeparture:string;paymentStatus:string;amountDue:number;debtor:string;depositReceived:boolean;breakfastType:string;mealSummary:string;dietary:string;roomService:string;earlyCheckIn:string;lateCheckOut:string;lineStatus:'À relire'|'Validée';validatedBy:string;validatedAt:string;departureConfirmed:boolean};
type WeeklySheet={id:string;weekStart:string;weekEnd:string;status:'Préparation'|'Prête à imprimer'|'Diffusée'|'Clôturée';lines:FunctionLine[];validatedForPrintBy:string;validatedForPrintAt:string;lockedBy:string;lockedAt:string;sourceFingerprint?:string;lastSourceSyncAt?:string;lastDistributedAt?:string;lastDistributedBy?:string;distributionCount?:number};

function shortDate(v:string){return v?new Date(`${v}T12:00:00`).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}):'—'}
function creatorOf(g:Group){return g.createdBy||g.audit?.find(a=>a.action?.includes('créée'))?.actor||g.audit?.[0]?.actor||g.validatedBy||g.commercial||'Non attribué'}
function leaderOf(g:Group){const legacy=String(g.leader||'').trim().split(/\s+/);return{first:g.leaderFirstName||legacy.shift()||'',last:g.leaderLastName||legacy.join(' '),phone:g.leaderPhone||g.phone||'',email:g.leaderEmail||''}}
function firstService(g:Group){const d=g.mealDays?.[0];if(d?.dinner?.pax)return'Dîner';if(d?.packedDinner?.pax)return'Panier soir';if(d?.lunch?.pax)return'Déjeuner';return'Logement'}
function lastService(g:Group){const d=g.mealDays?.at(-1);if(d?.breakfast?.pax)return'PDJ';if(d?.pdjBox?.pax)return'PDJ Box';if(d?.packedLunch?.pax)return'Panier midi';if(d?.lunch?.pax)return'Déjeuner';if(d?.packedDinner?.pax)return'Panier soir';if(d?.dinner?.pax)return'Dîner';return'Logement'}
function before(time:string,limit:string){return Boolean(time&&time<limit)}
function after(time:string,limit:string){return Boolean(time&&time>limit)}
function mealSummary(g:Group){const rows:string[]=[];(g.mealDays||[]).forEach(day=>([['PDJ',day.breakfast],['PDJ Box',day.pdjBox],['Déj.',day.lunch],['Dîner',day.dinner],['Panier midi',day.packedLunch],['Panier soir',day.packedDinner]] as Array<[string,MealCell|undefined]>).forEach(([name,meal])=>{if(!meal?.pax)return;const extras=[meal.water?'Eau':'',meal.wine?'Vin':''].filter(Boolean).join('+');rows.push(`${shortDate(day.date)} ${name} ${meal.pax}${meal.time?` à ${meal.time}`:''}${extras?` · ${extras}`:''}`)}));return rows.join(' · ')||'RAS'}
function groupToLine(g:Group,prior?:FunctionLine):FunctionLine{const deposit=Boolean(g.depositReceived||g.paymentStatus==='Payé'),leader=leaderOf(g);return{id:prior?.id||crypto.randomUUID(),groupId:g.id,commercial:creatorOf(g),groupName:g.name||'',nationality:g.nationality||g.language||'',stayType:g.stayType||'',groupStatus:deposit?'Confirmé':g.status||'Préparation',remarks:g.commercialNotes||'',leaderFirstName:leader.first,leaderLastName:leader.last,leaderPhone:leader.phone,leaderEmail:leader.email,arrivalDate:g.arrival||'',arrivalTime:g.arrivalTime||'',arrivalService:firstService(g),departureDate:g.departure||'',departureTime:g.departureTime||'',lastService:lastService(g),roomingReceived:Boolean(g.rooming),luggageArrival:g.luggageArrival||'',luggageDeparture:g.luggageDeparture||'',paymentStatus:g.paymentStatus||'',amountDue:Number(g.amountDue||0),debtor:g.debtor||'',depositReceived:deposit,breakfastType:g.breakfastType||'Standard',mealSummary:mealSummary(g),dietary:g.dietary||g.allergies||'',roomService:g.housekeepingType||'Standard',earlyCheckIn:before(g.arrivalTime||'','16:00')?`Oui · ${g.arrivalTime}`:'Non',lateCheckOut:after(g.departureTime||'','09:00')?`Oui · ${g.departureTime}`:'Non',lineStatus:'À relire',validatedBy:'',validatedAt:'',departureConfirmed:Boolean(prior?.departureConfirmed)}}
function relevant(groups:Group[],sheet:WeeklySheet){const existing=new Set((sheet.lines||[]).map(line=>line.groupId));return groups.filter(g=>(g.commercialValidated||existing.has(g.id))&&String(g.arrival||'')<=sheet.weekEnd&&String(g.departure||'')>=sheet.weekStart).sort((a,b)=>String(a.id).localeCompare(String(b.id)))}
function groupProjection(g:Group){return{id:g.id,name:g.name,commercialValidated:g.commercialValidated,nationality:g.nationality,language:g.language,arrival:g.arrival,arrivalTime:g.arrivalTime,departure:g.departure,departureTime:g.departureTime,stayType:g.stayType,breakfastType:g.breakfastType,housekeepingType:g.housekeepingType,dietary:g.dietary,allergies:g.allergies,rooming:g.rooming,depositReceived:g.depositReceived,paymentStatus:g.paymentStatus,amountDue:g.amountDue,debtor:g.debtor,status:g.status,commercialNotes:g.commercialNotes,leaderFirstName:g.leaderFirstName,leaderLastName:g.leaderLastName,leaderPhone:g.leaderPhone,leaderEmail:g.leaderEmail,luggageArrival:g.luggageArrival,luggageDeparture:g.luggageDeparture,mealDays:g.mealDays}}
function fingerprint(groups:Group[],sheet:WeeklySheet){return JSON.stringify(relevant(groups,sheet).map(groupProjection))}

export function FunctionSheetSourceSync(){
 const groups=useOperationalStore<Group[]>('group-360',[]),sheets=useOperationalStore<WeeklySheet[]>('function-sheets',[]),saving=useRef(false);
 const signature=useMemo(()=>JSON.stringify(groups.data.map(groupProjection)),[groups.data]);
 useEffect(()=>{
  if(saving.current||groups.state==='loading'||sheets.state==='loading'||groups.state==='saving'||sheets.state==='saving')return;
  let changed=false;
  const now=new Date().toISOString();
  const next=sheets.data.map(sheet=>{
   const fp=fingerprint(groups.data,sheet);
   if(sheet.sourceFingerprint===fp)return sheet;
   changed=true;
   const old=new Map((sheet.lines||[]).map(line=>[line.groupId,line]));
   const lines=relevant(groups.data,sheet).map(group=>groupToLine(group,old.get(group.id))).sort((a,b)=>`${a.arrivalDate||'9999-12-31'}T${a.arrivalTime||'23:59'}`.localeCompare(`${b.arrivalDate||'9999-12-31'}T${b.arrivalTime||'23:59'}`)||a.groupName.localeCompare(b.groupName,'fr',{sensitivity:'base'}));
   return{...sheet,lines,status:'Préparation' as const,validatedForPrintBy:'',validatedForPrintAt:'',lockedBy:'',lockedAt:'',sourceFingerprint:fp,lastSourceSyncAt:now};
  });
  if(!changed)return;
  saving.current=true;void sheets.save(next).finally(()=>{saving.current=false});
 },[signature,sheets.data,groups.state,sheets.state]);
 return null;
}
