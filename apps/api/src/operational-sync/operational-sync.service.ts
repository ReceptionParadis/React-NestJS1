import { BadRequestException, ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

const JOURNAL_NAMESPACE = 'activity-journal';
type JournalEntry={id:string;at:string;actorId?:string;actor:string;role:string;service:string;namespace:string;source:string;action:string};

const DEFAULT_STORES: Record<string, Prisma.InputJsonValue> = {
  tasks: [],
  'general-instructions': [],
  'operations-center': { loans: [], equipment: [] },
  'loans-equipment': { loans: [], equipment: [] },
  'function-sheets': [],
  'meeting-rooms': [],
  'group-360': [],
  'maintenance-interventions': [],
  'individual-requests': [],
  'night-route-notes': [],
  'reception-cash-day': [],
  'meal-orders': [],
  [JOURNAL_NAMESPACE]: [],
  'administration-settings': { users: [], rooms: [], categories: [] },
};

const PRODUCTION_RESET_MARKER = '_system-production-baseline-1.0.0';
const PRODUCTION_RESET_PAYLOADS: Record<string, Prisma.InputJsonValue> = {
  'group-360': [],
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
  'group-360':{service:'Réception',source:'Groupe 360°'},
  'individual-requests':{service:'Réception',source:'Demandes clients'},
  'night-route-notes':{service:'Réception',source:'Feuille de route veilleur'},
  'reception-cash-day':{service:'Réception',source:'Caisse journalière'},
  'meal-orders':{service:'Réception',source:'Paniers repas & PDJ Box'},
  'function-sheets':{service:'Réception',source:'Fiche de fonction'},
  'meeting-rooms':{service:'Réception',source:'Salles de réunion'},
  'operations-center':{service:'Réception',source:'Centre des opérations'},
  'loans-equipment':{service:'Réception',source:'Prêts & matériel'},
  tasks:{service:'Réception',source:'Tâches'},
  'general-instructions':{service:'Réception',source:'Consignes'},
  'maintenance-interventions':{service:'Maintenance',source:'Maintenance'},
  'administration-settings':{service:'Direction',source:'Administration'},
};

@Injectable()
export class OperationalSyncService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() { await this.resetHotelParadisProductionDataOnce(); }

  async get(hotelId: string | undefined, namespace: string, userId?: string) {
    const resolvedHotelId = await this.resolveHotelId(hotelId, userId);
    const existing = await this.prisma.operationalStore.findUnique({where:{hotelId_namespace:{hotelId:resolvedHotelId,namespace}},include:{updatedBy:{select:{id:true,firstName:true,lastName:true,role:{select:{name:true}}}}}});
    if (existing) return existing;
    const defaultPayload = DEFAULT_STORES[namespace];
    if (defaultPayload === undefined) return null;
    return this.prisma.operationalStore.create({data:{hotelId:resolvedHotelId,namespace,payload:defaultPayload,updatedById:userId},include:{updatedBy:{select:{id:true,firstName:true,lastName:true,role:{select:{name:true}}}}}});
  }

  async save(input:{hotelId?:string;namespace:string;payload:Prisma.InputJsonValue;updatedById?:string;expectedVersion?:number}) {
    const hotelId=await this.resolveHotelId(input.hotelId,input.updatedById);
    const current=await this.prisma.operationalStore.findUnique({where:{hotelId_namespace:{hotelId,namespace:input.namespace}}});
    if(current&&input.expectedVersion!==undefined&&current.version!==input.expectedVersion)throw new ConflictException({message:'Ces données ont été modifiées par un autre utilisateur.',currentVersion:current.version,updatedAt:current.updatedAt});
    const saved=await this.prisma.operationalStore.upsert({where:{hotelId_namespace:{hotelId,namespace:input.namespace}},create:{hotelId,namespace:input.namespace,payload:input.payload,updatedById:input.updatedById},update:{payload:input.payload,updatedById:input.updatedById,version:{increment:1}},include:{updatedBy:{select:{id:true,firstName:true,lastName:true,role:{select:{name:true}}}}}});
    if(input.namespace!==JOURNAL_NAMESPACE&&!input.namespace.startsWith('_system-'))await this.appendJournal(hotelId,input.namespace,input.updatedById);
    return saved;
  }

  async list(hotelId?:string,userId?:string){const resolvedHotelId=await this.resolveHotelId(hotelId,userId);await this.ensureDefaultStores(resolvedHotelId,userId);return this.prisma.operationalStore.findMany({where:{hotelId:resolvedHotelId},select:{namespace:true,version:true,updatedAt:true,updatedById:true},orderBy:{updatedAt:'desc'}})}

  async diagnostic(hotelId?:string,userId?:string){const startedAt=Date.now(),resolvedHotelId=await this.resolveHotelId(hotelId,userId);await this.ensureDefaultStores(resolvedHotelId,userId);const[hotel,user,stores,databaseProbe]=await Promise.all([this.prisma.hotel.findUnique({where:{id:resolvedHotelId},select:{id:true,name:true,slug:true}}),userId?this.prisma.user.findUnique({where:{id:userId},select:{id:true,firstName:true,lastName:true,email:true,hotelId:true,role:{select:{name:true}}}}):null,this.prisma.operationalStore.findMany({where:{hotelId:resolvedHotelId,namespace:{not:{startsWith:'_system-'}}},select:{namespace:true,version:true,updatedAt:true,updatedById:true},orderBy:{namespace:'asc'}}),this.prisma.$queryRaw<Array<{now:Date}>>`SELECT NOW() as now`]);return{status:'ok',checkedAt:new Date().toISOString(),responseTimeMs:Date.now()-startedAt,database:{connected:true,serverTime:databaseProbe[0]?.now??null},hotel,user,operationalStore:{available:true,namespaces:stores}}}

  private async appendJournal(hotelId:string,namespace:string,userId?:string){
    const meta=JOURNAL_META[namespace]||{service:'Direction',source:namespace};
    const user=userId?await this.prisma.user.findUnique({where:{id:userId},select:{id:true,firstName:true,lastName:true,role:{select:{name:true}}}}):null;
    const actor=user?`${user.firstName} ${user.lastName}`.trim():'HospiCore';
    const role=user?.role?.name||'Système';
    const service=this.serviceFromRole(role,meta.service);
    const store=await this.prisma.operationalStore.findUnique({where:{hotelId_namespace:{hotelId,namespace:JOURNAL_NAMESPACE}}});
    const entries:Array<JournalEntry>=Array.isArray(store?.payload)?store!.payload as unknown as JournalEntry[]:[];
    const entry:JournalEntry={id:`${Date.now()}-${Math.random().toString(36).slice(2,9)}`,at:new Date().toISOString(),actorId:user?.id,actor,role,service,namespace,source:meta.source,action:`Mise à jour · ${meta.source}`};
    await this.prisma.operationalStore.upsert({where:{hotelId_namespace:{hotelId,namespace:JOURNAL_NAMESPACE}},create:{hotelId,namespace:JOURNAL_NAMESPACE,payload:[entry] as any,updatedById:userId},update:{payload:[entry,...entries] as any,updatedById:userId,version:{increment:1}}});
  }

  private serviceFromRole(role:string,fallback:string){const r=role.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(r.includes('direction')||r.includes('directeur')||r.includes('admin'))return'Direction';if(r.includes('commercial')||r.includes('vente'))return'Commercial';if(r.includes('maintenance')||r.includes('technique')||r.includes('technicien'))return'Maintenance';if(r.includes('reception')||r.includes('front'))return'Réception';return fallback}
  private async ensureDefaultStores(hotelId:string,userId?:string){await this.prisma.$transaction(Object.entries(DEFAULT_STORES).map(([namespace,payload])=>this.prisma.operationalStore.upsert({where:{hotelId_namespace:{hotelId,namespace}},create:{hotelId,namespace,payload,updatedById:userId},update:{}})))}
  private async resetHotelParadisProductionDataOnce(){const hotel=await this.prisma.hotel.findUnique({where:{slug:'hotel-paradis-lourdes'},select:{id:true}});if(!hotel)return;const marker=await this.prisma.operationalStore.findUnique({where:{hotelId_namespace:{hotelId:hotel.id,namespace:PRODUCTION_RESET_MARKER}},select:{id:true}});if(marker)return;const operations=Object.entries(PRODUCTION_RESET_PAYLOADS).map(([namespace,payload])=>this.prisma.operationalStore.upsert({where:{hotelId_namespace:{hotelId:hotel.id,namespace}},create:{hotelId:hotel.id,namespace,payload},update:{payload,updatedById:null,version:{increment:1}}}));operations.push(this.prisma.operationalStore.create({data:{hotelId:hotel.id,namespace:PRODUCTION_RESET_MARKER,payload:{resetAt:new Date().toISOString(),release:'1.0.0',reason:'Initialisation production Hôtel Paradis'}}}));await this.prisma.$transaction(operations)}
  private async resolveHotelId(hotelId?:string,userId?:string){if(hotelId)return hotelId;if(!userId)throw new BadRequestException('Hôtel et utilisateur absents.');const user=await this.prisma.user.findUnique({where:{id:userId},select:{hotelId:true}});if(!user)throw new BadRequestException('Utilisateur introuvable.');return user.hotelId}
}
