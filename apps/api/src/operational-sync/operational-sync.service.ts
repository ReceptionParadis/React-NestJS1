import { BadRequestException, ConflictException, ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

const JOURNAL_NAMESPACE = 'activity-journal';
const DIRECTION_REPORT_NAMESPACE='direction-daily-reports';
const CANONICAL_HOTEL_SLUG='hotel-paradis-lourdes';
const SHARED_STORE_MIGRATION_MARKER='_system-shared-store-canonical-1.0.0';
type JournalEntry={id:string;at:string;actorId?:string;actor:string;role:string;service:string;namespace:string;source:string;action:string};
type Group360Like={id?:string;name?:string;commercialValidated?:boolean;validatedAt?:string;audit?:Array<{action?:string}>};
type JsonRecord=Record<string,unknown>;

const DEFAULT_STORES: Record<string, Prisma.InputJsonValue> = {
  tasks: [],
  'general-instructions': [],
  'meeting-rooms': [],
  'client-complaints': [],
  'night-route-notes': [],
  'reception-cash-day': [],
  'meal-orders': [],
  'group-controls': [],
  'manual-arrivals-departures': [],
  [JOURNAL_NAMESPACE]: [],
  [DIRECTION_REPORT_NAMESPACE]: [],
  'administration-settings': { users: [], rooms: [], categories: [] },
  // Stores historiques conservés pour compatibilité des anciennes données.
  'operations-center': { loans: [], equipment: [] },
  'loans-equipment': { loans: [], equipment: [] },
  'function-sheets': [],
  'group-360': [],
  'group-wakeups': [],
  'maintenance-interventions': [],
  'individual-requests': [],
};

const PRODUCTION_RESET_MARKER = '_system-production-baseline-1.0.0';
const PRODUCTION_RESET_PAYLOADS: Record<string, Prisma.InputJsonValue> = {
  'group-360': [],
  'group-wakeups': [],
  'meeting-rooms': [],
  'function-sheets': [],
  'individual-requests': [],
  'night-route-notes': [],
  'maintenance-interventions': [],
  tasks: [],
  'general-instructions': [],
  'operations-center': { loans: [], equipment: [] },
  'loans-equipment': { loans: [], equipment: [] },
};

const JOURNAL_META:Record<string,{service:string;source:string}>={
  'group-controls':{service:'Réception',source:'Contrôles Groupe'},
  'manual-arrivals-departures':{service:'Réception',source:'Arrivées / Départs'},
  'group-360':{service:'Réception',source:'Groupe 360°'},
  'group-wakeups':{service:'Réception',source:'Réveils groupes'},
  'individual-requests':{service:'Réception',source:'Demandes clients'},
  'client-complaints':{service:'Réception',source:'Plaintes clients'},
  'night-route-notes':{service:'Réception',source:'Feuille de route veilleur'},
  'reception-cash-day':{service:'Réception',source:'Caisse journalière'},
  'meal-orders':{service:'Réception',source:'Paniers repas & PDJ Box'},
  'function-sheets':{service:'Réception',source:'Fiche de fonction'},
  'meeting-rooms':{service:'Réception',source:'Salles de réunion'},
  'operations-center':{service:'Réception',source:'Centre des opérations'},
  'loans-equipment':{service:'Réception',source:'Prêts & matériel'},
  tasks:{service:'Réception',source:'Tâches'},
  'general-instructions':{service:'Réception',source:'Main courante'},
  'maintenance-interventions':{service:'Maintenance',source:'Maintenance'},
  'administration-settings':{service:'Direction',source:'Administration'},
};

@Injectable()
export class OperationalSyncService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}
  async onModuleInit() {
    await this.resetHotelParadisProductionDataOnce();
    await this.migrateAllOperationalStoresToCanonicalHotelOnce();
    const hotelId=await this.resolveHotelId();
    await this.ensureDefaultStores(hotelId);
  }

  async get(hotelId: string | undefined, namespace: string, userId?: string) {
    if(namespace===DIRECTION_REPORT_NAMESPACE)await this.assertDirection(userId);
    const resolvedHotelId = await this.resolveHotelId(hotelId, userId);
    const existing = await this.prisma.operationalStore.findUnique({where:{hotelId_namespace:{hotelId:resolvedHotelId,namespace}},include:{updatedBy:{select:{id:true,firstName:true,lastName:true,role:{select:{name:true}}}}}});
    if (existing) return existing;
    const defaultPayload = DEFAULT_STORES[namespace];
    if (defaultPayload === undefined) return null;
    return this.prisma.operationalStore.create({data:{hotelId:resolvedHotelId,namespace,payload:defaultPayload,updatedById:userId},include:{updatedBy:{select:{id:true,firstName:true,lastName:true,role:{select:{name:true}}}}}});
  }

  async save(input:{hotelId?:string;namespace:string;payload:Prisma.InputJsonValue;updatedById?:string;expectedVersion?:number}) {
    if(input.namespace===JOURNAL_NAMESPACE)throw new BadRequestException('Le Journal Live est en lecture seule.');
    if(input.namespace===DIRECTION_REPORT_NAMESPACE)throw new BadRequestException('Les rapports Direction sont générés automatiquement et sont en lecture seule.');
    const hotelId=await this.resolveHotelId(input.hotelId,input.updatedById);
    const current=await this.prisma.operationalStore.findUnique({where:{hotelId_namespace:{hotelId,namespace:input.namespace}}});
    if(current&&input.expectedVersion!==undefined&&current.version!==input.expectedVersion)throw new ConflictException({message:'Ces données ont été modifiées par un autre utilisateur.',currentVersion:current.version,updatedAt:current.updatedAt});
    const saved=await this.prisma.operationalStore.upsert({where:{hotelId_namespace:{hotelId,namespace:input.namespace}},create:{hotelId,namespace:input.namespace,payload:input.payload,updatedById:input.updatedById},update:{payload:input.payload,updatedById:input.updatedById,version:{increment:1}},include:{updatedBy:{select:{id:true,firstName:true,lastName:true,role:{select:{name:true}}}}}});
    if(!input.namespace.startsWith('_system-')){
      if(input.namespace==='group-360'){
        const previous=Array.isArray(current?.payload)?current?.payload as unknown as Group360Like[]:[];
        const next=Array.isArray(input.payload)?input.payload as unknown as Group360Like[]:[];
        const nextIds=new Set(next.map(group=>String(group.id||'')).filter(Boolean));
        const removed=previous.filter(group=>group.id&&!nextIds.has(String(group.id)));
        if(removed.length){
          await this.cascadeDeletedGroups(hotelId,removed.map(group=>String(group.id)),input.updatedById);
          for(const group of removed)await this.appendJournal(hotelId,input.namespace,input.updatedById,`Fiche Groupe 360° supprimée · ${group.name||'Groupe'}`);
        }
        const previousById=new Map(previous.map(group=>[String(group.id||''),group]));
        for(const group of next){
          const before=previousById.get(String(group.id||''));
          if(!group.commercialValidated||before?.commercialValidated)continue;
          const validations=(group.audit||[]).filter(item=>String(item.action||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes('valid')).length;
          const action=`Fiche Groupe 360° ${validations>1?'revalidée':'validée'} · ${group.name||'Groupe'}`;
          await this.appendJournal(hotelId,input.namespace,input.updatedById,action);
        }
      }else await this.appendJournal(hotelId,input.namespace,input.updatedById);
    }
    return saved;
  }

  async list(hotelId?:string,userId?:string){const resolvedHotelId=await this.resolveHotelId(hotelId,userId);await this.ensureDefaultStores(resolvedHotelId,userId);return this.prisma.operationalStore.findMany({where:{hotelId:resolvedHotelId,namespace:{not:DIRECTION_REPORT_NAMESPACE}},select:{namespace:true,version:true,updatedAt:true,updatedById:true},orderBy:{updatedAt:'desc'}})}

  async diagnostic(hotelId?:string,userId?:string){const startedAt=Date.now(),resolvedHotelId=await this.resolveHotelId(hotelId,userId);await this.ensureDefaultStores(resolvedHotelId,userId);const[hotel,user,stores,databaseProbe]=await Promise.all([this.prisma.hotel.findUnique({where:{id:resolvedHotelId},select:{id:true,name:true,slug:true}}),userId?this.prisma.user.findUnique({where:{id:userId},select:{id:true,firstName:true,lastName:true,email:true,hotelId:true,role:{select:{name:true}}}}):null,this.prisma.operationalStore.findMany({where:{hotelId:resolvedHotelId,namespace:{not:{startsWith:'_system-'}}},select:{namespace:true,version:true,updatedAt:true,updatedById:true},orderBy:{namespace:'asc'}}),this.prisma.$queryRaw<Array<{now:Date}>>`SELECT NOW() as now`]);return{status:'ok',checkedAt:new Date().toISOString(),responseTimeMs:Date.now()-startedAt,database:{connected:true,serverTime:databaseProbe[0]?.now??null},hotel,user,canonicalHotel:true,operationalStore:{available:true,namespaces:stores}}}

  private asRecord(value:unknown):JsonRecord|null{return value&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:null}
  private mergePayload(base:unknown,incoming:unknown):unknown{
    if(Array.isArray(base)&&Array.isArray(incoming)){
      const result:unknown[]=[];
      const positions=new Map<string,number>();
      const add=(value:unknown)=>{
        const record=this.asRecord(value);
        const key=record?.id?`id:${String(record.id)}`:`json:${JSON.stringify(value)}`;
        const position=positions.get(key);
        if(position===undefined){positions.set(key,result.length);result.push(value)}else result[position]=value;
      };
      base.forEach(add);incoming.forEach(add);return result;
    }
    if(this.asRecord(base)&&this.asRecord(incoming))return{...this.asRecord(base),...this.asRecord(incoming)};
    return incoming??base;
  }

  private async migrateAllOperationalStoresToCanonicalHotelOnce(){
    const hotel=await this.prisma.hotel.findUnique({where:{slug:CANONICAL_HOTEL_SLUG},select:{id:true}});
    if(!hotel)return;
    const marker=await this.prisma.operationalStore.findUnique({where:{hotelId_namespace:{hotelId:hotel.id,namespace:SHARED_STORE_MIGRATION_MARKER}},select:{id:true}});
    if(marker)return;
    for(const namespace of Object.keys(DEFAULT_STORES)){
      if(namespace===DIRECTION_REPORT_NAMESPACE)continue;
      const stores=await this.prisma.operationalStore.findMany({where:{namespace},select:{payload:true,updatedAt:true},orderBy:{updatedAt:'asc'}});
      let merged:unknown=DEFAULT_STORES[namespace];
      for(const store of stores)merged=this.mergePayload(merged,store.payload);
      await this.prisma.operationalStore.upsert({where:{hotelId_namespace:{hotelId:hotel.id,namespace}},create:{hotelId:hotel.id,namespace,payload:merged as Prisma.InputJsonValue},update:{payload:merged as Prisma.InputJsonValue,version:{increment:1}}});
    }
    await this.prisma.operationalStore.create({data:{hotelId:hotel.id,namespace:SHARED_STORE_MIGRATION_MARKER,payload:{migratedAt:new Date().toISOString(),reason:'Unification des données HospiCore entre tous les comptes'}}});
  }

  private async cascadeDeletedGroups(hotelId:string,groupIds:string[],userId?:string){
    const removed=new Set(groupIds);
    const filterArray=(payload:unknown,keys:string[])=>Array.isArray(payload)?payload.filter(item=>{const record=this.asRecord(item);if(!record)return true;return !keys.some(key=>removed.has(String(record[key]||'')))}):payload;
    await this.mutateLinkedStore(hotelId,'group-wakeups',payload=>filterArray(payload,['groupId']),userId);
    await this.mutateLinkedStore(hotelId,'meeting-rooms',payload=>filterArray(payload,['groupId']),userId);
    await this.mutateLinkedStore(hotelId,'meal-orders',payload=>filterArray(payload,['sourceGroupId','groupId']),userId);
    await this.mutateLinkedStore(hotelId,'night-route-notes',payload=>filterArray(payload,['groupId']),userId);
    await this.mutateLinkedStore(hotelId,'function-sheets',payload=>{
      if(!Array.isArray(payload))return payload;
      let changed=false;
      const now=new Date().toISOString();
      const next=payload.map(value=>{
        const sheet=this.asRecord(value);if(!sheet)return value;
        const lines=Array.isArray(sheet.lines)?sheet.lines:[];
        const cleaned=lines.filter(line=>{const record=this.asRecord(line);return !record||!removed.has(String(record.groupId||''))});
        if(cleaned.length===lines.length)return value;
        changed=true;
        return{...sheet,lines:cleaned,status:'Prête à imprimer',lockedBy:'',lockedAt:'',validatedForPrintBy:'HospiCore · synchronisation',validatedForPrintAt:new Date().toLocaleString('fr-FR'),sourceFingerprint:'',lastSourceSyncAt:now};
      });
      return changed?next:payload;
    },userId);
  }

  private async mutateLinkedStore(hotelId:string,namespace:string,transform:(payload:unknown)=>unknown,userId?:string){
    for(let attempt=0;attempt<6;attempt++){
      const store=await this.prisma.operationalStore.findUnique({where:{hotelId_namespace:{hotelId,namespace}}});
      if(!store)return;
      const next=transform(store.payload);
      if(JSON.stringify(next)===JSON.stringify(store.payload))return;
      const updated=await this.prisma.operationalStore.updateMany({where:{id:store.id,version:store.version},data:{payload:next as Prisma.InputJsonValue,updatedById:userId,version:{increment:1}}});
      if(updated.count===1)return;
    }
    console.error(`[HospiCore] Synchronisation liée impossible pour ${namespace} après plusieurs écritures concurrentes.`);
  }

  private async appendJournal(hotelId:string,namespace:string,userId?:string,customAction?:string){
    const meta=JOURNAL_META[namespace]||{service:'Direction',source:namespace};
    const user=userId?await this.prisma.user.findUnique({where:{id:userId},select:{id:true,firstName:true,lastName:true,role:{select:{name:true}}}}):null;
    const actor=user?`${user.firstName} ${user.lastName}`.trim():'HospiCore';
    const role=user?.role?.name||'Système';
    const service=this.serviceFromRole(role,meta.service);
    const entry:JournalEntry={id:`${Date.now()}-${Math.random().toString(36).slice(2,9)}`,at:new Date().toISOString(),actorId:user?.id,actor,role,service,namespace,source:meta.source,action:customAction||`Mise à jour · ${meta.source}`};
    for(let attempt=0;attempt<6;attempt++){
      const store=await this.prisma.operationalStore.findUnique({where:{hotelId_namespace:{hotelId,namespace:JOURNAL_NAMESPACE}}});
      if(!store){
        try{await this.prisma.operationalStore.create({data:{hotelId,namespace:JOURNAL_NAMESPACE,payload:[entry] as any,updatedById:userId}});return}catch{continue}
      }
      const entries:Array<JournalEntry>=Array.isArray(store.payload)?store.payload as unknown as JournalEntry[]:[];
      const updated=await this.prisma.operationalStore.updateMany({where:{id:store.id,version:store.version},data:{payload:[entry,...entries] as any,updatedById:userId,version:{increment:1}}});
      if(updated.count===1)return;
    }
    console.error(`[HospiCore] Journal Live: impossible d'ajouter l'événement ${entry.id} après plusieurs écritures concurrentes.`);
  }

  private serviceFromRole(role:string,fallback:string){const r=role.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(r.includes('direction')||r.includes('directeur')||r.includes('admin'))return'Direction';if(r.includes('commercial')||r.includes('vente'))return'Commercial';if(r.includes('maintenance')||r.includes('technique')||r.includes('technicien'))return'Maintenance';if(r.includes('reception')||r.includes('front'))return'Réception';return fallback}
  private async assertDirection(userId?:string){if(!userId)throw new ForbiddenException('Accès réservé à la Direction.');const user=await this.prisma.user.findUnique({where:{id:userId},select:{role:{select:{name:true}}}});const r=String(user?.role?.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(!(r.includes('direction')||r.includes('directeur')||r.includes('admin')))throw new ForbiddenException('Accès réservé à la Direction.')}
  private async ensureDefaultStores(hotelId:string,userId?:string){await this.prisma.$transaction(Object.entries(DEFAULT_STORES).filter(([namespace])=>namespace!==DIRECTION_REPORT_NAMESPACE).map(([namespace,payload])=>this.prisma.operationalStore.upsert({where:{hotelId_namespace:{hotelId,namespace}},create:{hotelId,namespace,payload,updatedById:userId},update:{}})))}
  private async resetHotelParadisProductionDataOnce(){const hotel=await this.prisma.hotel.findUnique({where:{slug:CANONICAL_HOTEL_SLUG},select:{id:true}});if(!hotel)return;const marker=await this.prisma.operationalStore.findUnique({where:{hotelId_namespace:{hotelId:hotel.id,namespace:PRODUCTION_RESET_MARKER}},select:{id:true}});if(marker)return;const operations=Object.entries(PRODUCTION_RESET_PAYLOADS).map(([namespace,payload])=>this.prisma.operationalStore.upsert({where:{hotelId_namespace:{hotelId:hotel.id,namespace}},create:{hotelId:hotel.id,namespace,payload},update:{payload,updatedById:null,version:{increment:1}}}));operations.push(this.prisma.operationalStore.create({data:{hotelId:hotel.id,namespace:PRODUCTION_RESET_MARKER,payload:{resetAt:new Date().toISOString(),release:'1.0.0',reason:'Initialisation production Hôtel Paradis'}}}));await this.prisma.$transaction(operations)}
  private async resolveHotelId(_hotelId?:string,_userId?:string){const hotel=await this.prisma.hotel.findUnique({where:{slug:CANONICAL_HOTEL_SLUG},select:{id:true}});if(hotel)return hotel.id;throw new BadRequestException('Hôtel Paradis introuvable dans PostgreSQL.')}
}
