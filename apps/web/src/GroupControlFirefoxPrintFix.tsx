import { useEffect } from 'react';

/**
 * Firefox can return `null` from window.open when `noopener`/`noreferrer` are
 * passed in the feature string. The group-control print flows need the returned
 * WindowProxy in order to write the printable document before triggering
 * window.print().
 *
 * This route-scoped bridge keeps the existing print code intact while removing
 * only those two feature flags for blank printable windows. Once the child
 * window exists, its opener is detached immediately.
 */
export function GroupControlFirefoxPrintFix(){
 useEffect(()=>{
  const originalOpen=window.open.bind(window);
  const patchedOpen:typeof window.open=((url?:string|URL,target?:string,features?:string)=>{
   const blank=url===undefined||url===null||String(url)==='';
   const featureText=String(features||'');
   const isGroupPrintWindow=blank&&target==='_blank'&&/(^|,)(noopener|noreferrer)(,|$)/i.test(featureText);
   if(!isGroupPrintWindow)return originalOpen(url as string|URL|undefined,target,features);
   const safeFeatures=featureText
    .split(',')
    .map(value=>value.trim())
    .filter(value=>value&&!/^noopener$/i.test(value)&&!/^noreferrer$/i.test(value))
    .join(',');
   const child=originalOpen(url as string|URL|undefined,target,safeFeatures||undefined);
   if(child){try{child.opener=null}catch{/* browser may expose opener as readonly */}}
   return child;
  }) as typeof window.open;
  window.open=patchedOpen;
  return()=>{window.open=originalOpen as typeof window.open};
 },[]);
 return null;
}
