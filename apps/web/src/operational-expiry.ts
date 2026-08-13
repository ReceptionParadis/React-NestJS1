export function operationalItemExpired(date:string,time:string,now=new Date()){
 if(!date)return false;
 const match=time.match(/^(\d{1,2}):(\d{2})/);
 if(!match)return date<localDateKey(now);
 const at=new Date(`${date}T${String(match[1]).padStart(2,'0')}:${match[2]}:00`);
 return Number.isFinite(at.getTime())&&at.getTime()<now.getTime();
}

export function localDateKey(date=new Date()){
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
