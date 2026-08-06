import { ArrowLeft } from 'lucide-react';
import { DailyGroupBoard } from './DailyGroupBoard';

export function ReceptionDailyPage(){
 return <div className="reception-daily-page"><header className="reception-daily-header"><a href="/"><ArrowLeft size={18}/>Dashboard</a><p>HospiCore · Réception</p><h1>Pilotage quotidien des groupes</h1><span>Arrivées, départs, horaires, réveils et salles de réunion.</span></header><DailyGroupBoard/></div>;
}
