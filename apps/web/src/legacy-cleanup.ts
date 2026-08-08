const LEGACY_LOCAL_KEYS=[
 'hospicore.admin.users.v1',
 'hospicore.admin.rooms.v1',
 'hospicore.admin.categories.v1',
 'hospicore.tasks.v1',
 'hospicore.instructions.v1',
 'hospicore.interservice',
 'hospicore.main-courante',
 'operations.loans',
 'instructions',
];

export function cleanupLegacyLocalData(){
 try{
  for(const key of LEGACY_LOCAL_KEYS)localStorage.removeItem(key);
 }catch{
  // Le stockage local peut être indisponible en navigation privée stricte.
 }
}
