import { Home } from 'lucide-react';

export function CommandCenterButton(){
 if(window.location.pathname==='/'||window.location.pathname==='/login')return null;
 return <button className="global-command-center-button no-print" onClick={()=>location.assign('/')} title="Retour au Centre de Commandement"><Home size={18}/><span>Centre de Commandement</span></button>;
}
