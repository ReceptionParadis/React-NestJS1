import { useEffect } from 'react';

const ROOT_ID='hospicore-meal-orders-print-root';
const STYLE_ID='hospicore-meal-orders-print-style';

function cleanup(){
 document.getElementById(ROOT_ID)?.remove();
 document.getElementById(STYLE_ID)?.remove();
 document.documentElement.classList.remove('hospicore-meal-orders-printing');
 document.body.classList.remove('hospicore-meal-orders-printing');
}

function prepare(){
 cleanup();
 const source=document.querySelector<HTMLElement>('.meal-print-root');
 if(!source)return false;
 const vouchers=source.querySelectorAll('.meal-voucher');
 if(!vouchers.length)return false;
 const clone=source.cloneNode(true) as HTMLElement;
 clone.id=ROOT_ID;
 clone.removeAttribute('aria-hidden');
 document.body.appendChild(clone);
 const style=document.createElement('style');
 style.id=STYLE_ID;
 style.textContent=`
 #${ROOT_ID}{display:none}
 @media print{
  @page{size:A4 portrait;margin:10mm}
  html.hospicore-meal-orders-printing,html.hospicore-meal-orders-printing body{margin:0!important;padding:0!important;background:#fff!important;width:auto!important;min-height:0!important;overflow:visible!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  body.hospicore-meal-orders-printing>*:not(#${ROOT_ID}){display:none!important}
  body.hospicore-meal-orders-printing #${ROOT_ID}{display:block!important;position:static!important;width:100%!important;margin:0!important;padding:0!important;background:#fff!important;visibility:visible!important;opacity:1!important;overflow:visible!important}
  body.hospicore-meal-orders-printing #${ROOT_ID},body.hospicore-meal-orders-printing #${ROOT_ID} *{visibility:visible!important}
  body.hospicore-meal-orders-printing #${ROOT_ID} .meal-print-page{display:block!important;width:100%!important;height:auto!important;break-after:auto!important}
  body.hospicore-meal-orders-printing #${ROOT_ID} .meal-voucher{display:flex!important;visibility:visible!important;opacity:1!important}
 }
 `;
 document.head.appendChild(style);
 document.documentElement.classList.add('hospicore-meal-orders-printing');
 document.body.classList.add('hospicore-meal-orders-printing');
 return true;
}

export function MealOrdersPrintBridge(){
 useEffect(()=>{
  const nativePrint=window.print.bind(window);
  let timer:number|null=null;
  const after=()=>{if(timer)window.clearTimeout(timer);timer=null;cleanup()};
  const wrapped=()=>{
   if(!location.pathname.startsWith('/reception/paniers-repas-pdj')){nativePrint();return}
   if(!prepare()){nativePrint();return}
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
    nativePrint();
    timer=window.setTimeout(cleanup,10000);
   }));
  };
  window.addEventListener('afterprint',after);
  window.print=wrapped;
  return()=>{
   window.removeEventListener('afterprint',after);
   if(timer)window.clearTimeout(timer);
   cleanup();
   if(window.print===wrapped)window.print=nativePrint;
  };
 },[]);
 return null;
}
