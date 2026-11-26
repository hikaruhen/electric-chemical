import {MODES,initial,snapshot,tick,polarity,freshObservation,connect,testCollectedGas,GEOMETRY,electrodeSpec,electrodeGeometry,setElectrodeY,toggleElectrode,microParticles,GAS_TRAVEL_TIME,cellSolutions} from './model.js?v=2.5.0';
import {batteryStructure,BATTERY_PARTS,updateLeadVisuals} from './battery-structure.js?v=2.5.0';
const $=s=>document.querySelector(s), svg=$('#scene'), stage=$('#scene-stage'), hitsHost=$('#scene-hits');
let state=initial(),pending=null,drag=null,popover=null,last=performance.now(),lastUI=0,batteryIndex=0,batteryPart='overview';
state.observationPolarity=[-1,1];
let batteryProcess='discharge',leadProgress=0,leadPlaying=false,sceneZoom=1;
const LEAD_DURATION=10,DRAG_SLOP_PX=10;
const saltViews=new WeakMap(),activePointers=new Set(),BRIDGE_REMOVED=-82,BRIDGE_MIN=-90,BRIDGE_THRESHOLD=-41;
function setSceneZoom(value){sceneZoom=Math.max(1,Math.min(3,value));$('#scene-viewport').style.setProperty('--scene-zoom',sceneZoom);$('#scene-viewport').classList.toggle('zoomed',sceneZoom>1);$('#zoom-level').textContent=Math.round(sceneZoom*100)+'%';$('#zoom-out').disabled=sceneZoom===1;$('#zoom-in').disabled=sceneZoom===3;if(sceneZoom===1){$('#scene-viewport').scrollLeft=0;$('#scene-viewport').scrollTop=0;}if(popover)closePopover({restoreFocus:false});requestAnimationFrame(syncHitHandles);}
$('#zoom-in').onclick=()=>setSceneZoom(sceneZoom+.5);$('#zoom-out').onclick=()=>setSceneZoom(sceneZoom-.5);$('#zoom-fit').onclick=()=>{setSceneZoom(1);if(matchMedia('(max-width:899px) and (orientation:landscape)').matches)$('#scene-viewport').scrollIntoView({block:'start'});};
setSceneZoom(1);
const material={Zn:'鋅片 Zn',Cu:'銅片 Cu',C:'碳棒 C',Fe:'鐵迴紋針 Fe'};
const color={Zn:'#a2afb0',Cu:'#b97443',C:'#424e4c',Fe:'#97a7a9'};
const intro={cell:['01 / 化學能 → 電能','讓鋅放出電子，看看鹽橋為什麼不可少。'],water:['02 / 電能 → 化學能','接上直流電源，在兩極收集不同的氣體。'],copper:['03 / 同一溶液，不同電極','換一種正極，比較產物、質量與藍色深淺。'],plate:['04 / 把金屬搬到物體上','讓迴紋針披上銅層，追蹤銅從哪裡來。'],batteries:['05 / 從實驗桌到生活','打開三種電池，點部位看看材料怎麼反應。']};
const reminders={cell:'電子只沿外導線由鋅流向銅；鹽橋由離子導電。鋅是負極／氧化端，銅是正極／還原端。',water:'負極還原產生氫氣，正極氧化產生氧氣。相同溫度、壓力下，氫氣體積是氧氣的 2 倍。',copper:'負極都析出銅；碳正極產生氧氣，銅正極則溶解補充銅離子。不要把兩種正極的產物混在一起。',plate:'被鍍物接負極，鍍層金屬接正極，電鍍液含該金屬離子。銅正極減少，被鍍物增加。'};
const eNames=['n','p','l','r'];
const electrodeOptions=(m,i)=>m==='cell'?['Zn','Cu']:m==='water'?['C','Cu']:m==='plate'?i===0?['Fe','C','Cu']:['Cu','C','Fe']:['C','Cu'];
const cellSolutionOptions=[['ZnSO4','硫酸鋅 ZnSO₄'],['CuSO4','硫酸銅 CuSO₄'],['water','純水']];
const cellSolLabel={ZnSO4:'硫酸鋅 ZnSO₄',CuSO4:'硫酸銅 CuSO₄',water:'純水'};
const cellSolFill={CuSO4:'url(#liquid)',ZnSO4:'#e2ece4',water:'#eef5f4'};
const solutionOptions=m=>m==='water'?[['NaOH','水＋NaOH（助導電）'],['water','純水（比較導電性）']]:[['CuSO4','硫酸銅水溶液'],['water','純水（沒有銅離子）']];
function el(tag,attrs={},content=''){return `<${tag} ${Object.entries(attrs).map(([k,v])=>`${k}="${v}"`).join(' ')}>${content}</${tag}>`;}
const text=(x,y,t,size=15,fill='#284e43',extra={})=>el('text',{x,y,'font-size':size,fill,...extra},t);
const fmt=n=>(n>=0?'+':'−')+Math.abs(n).toFixed(3);
function terminalPos(id){if(id==='n')return[310,95];if(id==='p')return[510,95];const side=id==='l'?0:1;return state.mode==='water'?[side?645:175,Math.max(45,state.electrodeY[side]-80)]:[side?570:250,state.electrodeY[side]-25];}
function wireD(a,b){const [x,y]=terminalPos(a),[u,v]=terminalPos(b);return `M ${x} ${y} Q ${x+(x<410?-120:120)} ${y+5} ${u} ${v}`;}
function galvanometerSvg(){
 const cx=410,cy=107,r=39;
 let ticks='';
 for(let deg=-50;deg<=50;deg+=10){
  const rad=deg*Math.PI/180,r0=deg===0?r-8:Math.abs(deg)%20===0?r-6.5:r-4;
  const x1=(cx+r0*Math.sin(rad)).toFixed(1),y1=(cy-r0*Math.cos(rad)).toFixed(1),x2=(cx+r*Math.sin(rad)).toFixed(1),y2=(cy-r*Math.cos(rad)).toFixed(1);
  ticks+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${deg===0?'#1f4d40':'#5c726b'}" stroke-width="${deg===0?2.1:Math.abs(deg)%20===0?1.4:1}"/>`;
 }
 return `<g id="galvanometer">`+
  el('rect',{x:290,y:48,width:240,height:76,rx:12,fill:'#334642',stroke:'#1e2d2a','stroke-width':2})+
  el('rect',{x:294,y:51,width:232,height:70,rx:9,fill:'none',stroke:'#556d67','stroke-width':1})+
  el('rect',{x:334,y:54,width:152,height:57,rx:7,fill:'url(#meter-glass)',stroke:'#1f2e2b','stroke-width':1.8})+
  `<path d="M380.1 81.9 A39 39 0 0 1 439.9 81.9" fill="none" stroke="#859a92" stroke-width="1.3"/>`+
  ticks+
  text(410,65,'0',9.5,'#1f4d40',{'text-anchor':'middle','font-weight':'700'})+
  text(410,95,'G',14,'#294d42',{'text-anchor':'middle','font-weight':'700',id:'meter-g'})+
  text(410,95,'— 未推算',13,'#8b4d12',{'text-anchor':'middle','font-weight':'700',id:'meter-unknown',visibility:'hidden'})+
  el('line',{id:'needle',x1:410,y1:107,x2:410,y2:68,stroke:'#c73b2b','stroke-width':2.5,'stroke-linecap':'round'})+
  el('circle',{cx:410,cy:107,r:4.3,fill:'#263733',stroke:'#c7d4ce','stroke-width':1.4})+
  `<polygon points="338,56 392,56 364,108 338,108" fill="#ffffff" fill-opacity="0.28" pointer-events="none"/>`+
  text(410,121,'檢流計',10.5,'#dceae3',{'text-anchor':'middle','letter-spacing':'1.5'})+
  `</g>`;
}
function makeScene(){
 const cell=state.mode==='cell',water=state.mode==='water';
 let h=`<defs><linearGradient id="liquid" x2="0" y2="1"><stop stop-color="#bce9ef"/><stop offset="1" stop-color="#61b7d1"/></linearGradient><linearGradient id="meter-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e8f0ea"/></linearGradient></defs>`;
 h+=el('rect',{x:45,y:485,width:730,height:10,rx:5,fill:'#d2dfcd'});
 if(cell){
  const sols=cellSolutions(state);
  for(const x of [130,450])h+=el('path',{d:`M${x} 300 V457 Q${x} 477 ${x+20} 477 H${x+200} Q${x+220} 477 ${x+220} 457 V300`,fill:'#fff','fill-opacity':'.5',stroke:'#9eb9b1','stroke-width':3,'pointer-events':'none'});
  for(let side=0;side<2;side++){
   const x=side?450:130,sol=sols[side],lbl=cellSolLabel[sol],liqId=side?'right-liquid':'left-liquid';
   h+=`<g id="solution-target-${side}" class="tappable" data-action="solution-${side}" tabindex="0" role="button" aria-haspopup="dialog" aria-label="${side?'右':'左'}杯溶液（${lbl}），點選更換${side?'右':'左'}杯溶液">`+
    el('rect',{x:x+3,y:332,width:214,height:140,rx:10,fill:'#eef5f4','pointer-events':'none'})+
    el('rect',{id:liqId,x:x+3,y:332,width:214,height:140,rx:10,fill:cellSolFill[sol],'data-solution':sol})+
    el('rect',{x:x+3,y:472,width:214,height:58,fill:'transparent'})+
    el('line',{x1:x,y1:332,x2:x+220,y2:332,stroke:'#71b2c2','stroke-width':2,'pointer-events':'none'})+
    el('rect',{x:x+24,y:492,width:172,height:36,rx:10,fill:'#edf4ee',stroke:'#bfd2c7','stroke-width':1.2})+
    text(x+110,515,lbl+' ▾',14.5,'#355b51',{'text-anchor':'middle'})+
    '</g>';
  }
 }else{
  const left=135,right=685;
  h+=el('path',{d:`M${left} 300 V458 Q${left} 478 ${left+20} 478 H${right-20} Q${right} 478 ${right} 458 V300`,fill:'#fff','fill-opacity':'.6',stroke:'#99b5ac','stroke-width':3,'pointer-events':'none'});
  const solLbl=water?(state.solution==='NaOH'?'水＋NaOH 助導電 · 水色示意':'純水 · 水色示意'):(state.solution==='water'?'純水（缺少銅離子）':'硫酸銅 CuSO₄');
  h+=`<g id="solution-target" class="tappable" data-action="solution" tabindex="0" role="button" aria-haspopup="dialog" aria-label="溶液條件，點選更換溶液">`+
   el('rect',{id:'right-liquid',x:left+3,y:323,width:right-left-6,height:150,rx:10,fill:water?'#c8e9f8':'url(#liquid)'})+
   el('line',{x1:left,y1:323,x2:right,y2:323,stroke:'#70abc4','stroke-width':2,'pointer-events':'none'})+
   el('rect',{x:280,y:494,width:260,height:32,rx:10,fill:'#edf4ee',stroke:'#bfd2c7','stroke-width':1.2})+
   text(410,515,solLbl+' ▾',14.5,'#355b51',{'text-anchor':'middle'})+
   '</g>';
 }
 if(cell){
  h+=`<g id="power-target" class="tappable" data-action="power" tabindex="0" role="button" aria-haspopup="dialog" aria-label="檢流計與外接導線，點選交換接法或拆線">${galvanometerSvg()}</g>`;
 }else{
  h+=`<g id="power-target" class="tappable" data-action="power" tabindex="0" role="button" aria-haspopup="dialog" aria-label="直流電源，點選開關電源、交換接法或拆線">`+
   el('rect',{x:290,y:48,width:240,height:76,rx:15,fill:'#254d46',stroke:'#749183','stroke-width':2})+
   text(410,78,state.power?'直流電源 ON ▾':'直流電源 OFF ▾',16.5,'#fff',{'text-anchor':'middle'})+
   text(410,107,'−                 ＋',23,'#e5f1dc',{'text-anchor':'middle'})+
   '</g>';
 }
 if(cell){
  h+=`<g id="salt-bridge" class="draggable" tabindex="0" role="button" aria-label="鹽橋，上下拖曳或按方向鍵上移出、下裝回" data-drag="bridge" transform="translate(0 ${state.bridge?0:BRIDGE_REMOVED})">`+
   el('path',{d:'M335 393 L335 286 Q335 254 370 254 L450 254 Q485 254 485 286 L485 393',stroke:'transparent','stroke-width':56,fill:'none'})+
   el('path',{d:'M335 393 L335 286 Q335 254 370 254 L450 254 Q485 254 485 286 L485 393',stroke:'#9abfb6','stroke-width':24,fill:'none'})+
   el('path',{d:'M335 393 L335 286 Q335 254 370 254 L450 254 Q485 254 485 286 L485 393',stroke:'#e5f2db','stroke-width':17,fill:'none'})+
   text(410,state.bridge?240:284,'鹽橋 KNO₃',15,'#56755b',{'text-anchor':'middle'})+'</g>';
 }
 if(water){
  for(let i=0;i<2;i++){
   const x=i?570:250;
   h+=`<defs><clipPath id="tube-inside-${i}"><path d="M${x-39} 430 V223 Q${x-39} 207 ${x} 207 Q${x+39} 207 ${x+39} 223 V430 Z"/></clipPath></defs>`;
   h+=el('path',{d:`M${x-43} 430 V223 Q${x-43} 203 ${x} 203 Q${x+43} 203 ${x+43} 223 V430`,fill:'#fcfefa',stroke:'#81aebc','stroke-width':2,'pointer-events':'none'});
   h+=el('rect',{id:`tube-water-${i}`,x:x-39,y:207,width:78,height:223,fill:'#bce5f8','clip-path':`url(#tube-inside-${i})`,'pointer-events':'none'});
   h+=el('line',{id:`tube-surface-${i}`,x1:x-39,y1:207,x2:x+39,y2:207,stroke:'#70abc4','stroke-width':2,'clip-path':`url(#tube-inside-${i})`,'pointer-events':'none'});
   h+=text(x,186,'',15,'#315951',{'text-anchor':'middle',id:`gas-label-${i}`});
   h+=text(x,486,'',11,'#658373',{'text-anchor':'middle'});
  }
  for(let i=0;i<2;i++)h+=el('path',{id:`gas-route-${i}`,d:gasRoute(i,410,207),stroke:'none',fill:'none'});
 }
 for(let i=0;i<2;i++){
  const x=i?570:250,mat=state.electrodes[i],length=electrodeSpec(state).length;
  if(water)h+=el('path',{id:`insulated-lead-${i}`,d:insulatedLead(i),stroke:'#536e65','stroke-width':4,fill:'none','pointer-events':'none'});
  h+=`<g class="draggable" id="electrode-${i}" tabindex="0" role="button" aria-haspopup="dialog" aria-label="${i?'右':'左'}電極（${material[mat]}），點選換材料，上下拖曳或按方向鍵上移出、下浸回" data-drag="${i}" transform="translate(${x} ${state.electrodeY[i]})">`;
  if(mat==='Fe'){
   h+=el('path',{id:`metal-${i}`,d:'M-12 10 V142 Q-12 155 0 155 Q18 155 18 142 V28 Q18 10 5 10 Q-2 10 -2 28 V134',stroke:color[mat],'stroke-width':9,fill:'none'})+
    el('path',{id:`deposit-${i}`,d:'M-12 48 V142 Q-12 155 0 155 Q18 155 18 142 V48',stroke:'#be7845','stroke-width':0,fill:'none'});
  }else{
   h+=el('rect',{id:`metal-${i}`,x:-15,y:0,width:30,height:length,rx:4,fill:color[mat],stroke:'#506761','stroke-width':1})+
    el('rect',{id:`deposit-${i}`,x:-18,y:45,width:36,height:length-45,rx:3,fill:'#c2824f',opacity:0})+
    el('line',{x1:-6,y1:8,x2:6,y2:8,stroke:mat==='C'?'#9eb0ac':'#2d4a44','stroke-width':1.5,opacity:.55,'pointer-events':'none'})+
    el('line',{x1:-6,y1:12,x2:6,y2:12,stroke:mat==='C'?'#9eb0ac':'#2d4a44','stroke-width':1.5,opacity:.55,'pointer-events':'none'});
  }
  // 80 SVG width hit box ensures >=44px rendered touch target even at 390/844 phone scale
  h+=el('rect',{x:-40,y:0,width:80,height:length,fill:'transparent'});
  if(!water)h+=el('line',{x1:0,y1:-25,x2:0,y2:0,stroke:'#536e65','stroke-width':5,'pointer-events':'none'});
  h+=text(0,32,mat,14,mat==='C'?'#fff':'#183c36',{'text-anchor':'middle'})+'</g>';
  h+=text(x,467,'',14,'#466c61',{'text-anchor':'middle',id:`material-label-${i}`})+text(x,235,'',16,'#234f43',{'text-anchor':'middle',id:`pole-${i}`});
 }
 h+='<g id="micro-particles" pointer-events="none"></g><g id="gas-bubbles" pointer-events="none"></g>';
 if(cell){
  h+='<path id="salt-route-left" d="M410 254 L370 254 Q335 254 335 286 L335 410" fill="none" stroke="none"/><path id="salt-route-right" d="M410 254 L450 254 Q485 254 485 286 L485 410" fill="none" stroke="none"/><g id="salt-particles" pointer-events="none"></g>';
  for(let i=0;i<2;i++){
   const nitrate=i%2,name=nitrate?'硝酸根離子':'鉀離子',species=nitrate?'NO₃⁻':'K⁺',ink=nitrate?'#b55408':'#2c6550',bg=nitrate?'#fff7ee':'#ffffff';
   h+=`<g id="salt-key-${i}" pointer-events="none"><path class="salt-ion-leader" fill="none" stroke="${ink}" stroke-width="1.2" stroke-dasharray="3 3"/><g class="salt-ion-caption"><rect x="0" y="-15" width="${nitrate?138:108}" height="30" rx="7" fill="${bg}" fill-opacity=".97" stroke="${ink}" stroke-width="1.3"/>${text(8,4,name+' <tspan font-size="15" font-weight="700">'+species+'</tspan>',14,ink)}</g></g>`;
  }
 }
 h+='<g id="wires"></g><g id="flow"></g><g id="terminals"></g>';svg.innerHTML=h;
 drawWires();updateDynamic();
}
function insulatedLead(i){const [tx,ty]=terminalPos(i?'r':'l'),x=i?570:250,g=electrodeGeometry(state,i);return g.immersed?`M${tx} ${ty} V460 H${x} V${g.top}`:`M${tx} ${ty} Q${tx} ${g.top} ${x} ${g.top}`;}
function gasRoute(side,originY,front){const x=side?552:268;return `M${x} ${originY} V${front+5}`;}
function terminalHitCenter(id){
 const [x,y]=terminalPos(id);
 const hx=(id==='l'&&y<150)?x-10:(id==='r'&&y<150)?x+10:id==='n'?x+8:id==='p'?x-8:x;
 const hy=Math.max(54,(id==='l'||id==='r')&&state.mode!=='water'?y-8:y);
 return [hx,hy];
}
function ensureHitHandles(){
 if(hitsHost.children.length)return;
 const defs=[
  ['hit-el-0',{drag:'0'}],['hit-el-1',{drag:'1'}],
  ['hit-bridge-top',{drag:'bridge'}],['hit-bridge-l',{drag:'bridge'}],['hit-bridge-r',{drag:'bridge'}],
  ['hit-term-n',{terminal:'n'}],['hit-term-p',{terminal:'p'}],['hit-term-l',{terminal:'l'}],['hit-term-r',{terminal:'r'}]
 ];
 for(const [id,ds] of defs){
  const d=document.createElement('div');d.id=id;d.className='hit-handle';
  if(ds.drag!==undefined)d.dataset.drag=ds.drag;
  if(ds.terminal!==undefined)d.dataset.terminal=ds.terminal;
  hitsHost.append(d);
 }
}
function placeHit(id,x,y,w,h,visible=true){
 const el=document.getElementById(id);if(!el)return;
 if(!visible){el.hidden=true;return;}
 const ctm=svg.getScreenCTM(),st=stage.getBoundingClientRect();
 if(!ctm||!st.width||!st.height){el.hidden=true;return;}
 const pt=(sx,sy)=>{const p=svg.createSVGPoint();p.x=sx;p.y=sy;return p.matrixTransform(ctm);};
 const a=pt(x,y),b=pt(x+w,y+h);
 const l=Math.max(0,a.x-st.left),t=Math.max(0,a.y-st.top),r=Math.min(st.width,b.x-st.left),bo=Math.min(st.height,b.y-st.top);
 el.hidden=false;
 el.style.left=l.toFixed(1)+'px';el.style.top=t.toFixed(1)+'px';
 el.style.width=Math.max(0,r-l).toFixed(1)+'px';el.style.height=Math.max(0,bo-t).toFixed(1)+'px';
}
function syncHitHandles(){
 if(state.mode==='batteries'){hitsHost.hidden=true;return;}
 hitsHost.hidden=false;ensureHitHandles();
 const spec=electrodeSpec(state),cell=state.mode==='cell';
 placeHit('hit-el-0',250-40,state.electrodeY[0],80,spec.length,true);
 placeHit('hit-el-1',570-40,state.electrodeY[1],80,spec.length,true);
 const bo=drag?.id==='bridge'?(drag.bridgeOffset??(state.bridge?0:BRIDGE_REMOVED)):(state.bridge?0:BRIDGE_REMOVED);
 placeHit('hit-bridge-top',312,224+bo,196,74,cell);
 placeHit('hit-bridge-l',311,274+bo,48,124,cell);
 placeHit('hit-bridge-r',461,274+bo,48,124,cell);
 for(const id of eNames){const [hx,hy]=terminalHitCenter(id);placeHit('hit-term-'+id,hx-39,hy-39,78,78,true);}
}
function drawWires(){
 $('#wires').innerHTML=state.wires.map(([a,b],i)=>el('path',{id:`wire-${i}`,class:'wire',d:wireD(a,b),stroke:a==='p'||b==='p'?'#b8734c':'#546e65','stroke-width':5,fill:'none','data-wire':i,tabindex:0,role:'button','aria-label':`導線 ${i+1}，點選拆除`})+el('path',{d:wireD(a,b),class:'wire',stroke:'transparent','stroke-width':60,fill:'none','data-wire':i})).join('');
 $('#terminals').innerHTML=eNames.map(id=>{
  const [x,y]=terminalPos(id),[hx,hy]=terminalHitCenter(id);
  return `<g class="terminal" id="terminal-${id}" data-terminal="${id}" tabindex="0" role="button" aria-label="${{n:'電源負端或檢流計左端',p:'電源正端或檢流計右端',l:'左電極',r:'右電極'}[id]}接點">`+
   el('circle',{cx:hx,cy:hy,r:39,fill:'transparent'})+
   el('circle',{cx:x,cy:y,r:10,fill:pending===id?'#efca60':'#fff',stroke:pending===id?'#a47d15':'#28765f','stroke-width':3})+
   el('circle',{cx:x,cy:y,r:3,fill:'#28765f'})+'</g>';
 }).join('');
 let h='';for(let i=0;i<12;i++)h+=`<g id="electron-${i}" pointer-events="none"><circle class="electron-dot" r="8" fill="#b24063" stroke="#fff" stroke-width="1.2"/>${text(0,3,'−',10,'white',{'text-anchor':'middle',class:'electron-minus'})}<path class="current-arrow" d="M-12 0 H10 M3 -6 L10 0 L3 6" fill="none" stroke="#a86b00" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></g>`;h+=text(410,142,'',15,'#9e3b5b',{'text-anchor':'middle',id:'flow-label'});$('#flow').innerHTML=h;
 $('#cancel').hidden=!pending;updateDynamic();syncHitHandles();
}
function updateDynamic(){
 if(state.mode==='batteries')return;const q=snapshot(state),phase=state.time*.38;
 for(let i=0;i<12;i++){const node=$(`#electron-${i}`),index=i<6?0:1,w=state.wires[index],path=$(`#wire-${index}`),current=state.view==='current';node.classList.toggle('is-current',current);node.style.visibility=q.valid&&state.view!=='none'&&path&&(!current||i%6<3)?'visible':'hidden';if(!path||!w)continue;const electrode=w.includes('l')?0:1,sign=q.signs[electrode];let forward=q.cell?electrode===q.cuSide:sign<0;if(!['n','p'].includes(w[0]))forward=!forward;if(current)forward=!forward;const t=((i%6)/(current?3:6)+phase)%1,len=path.getTotalLength(),distance=(forward?t:1-t)*len,p=path.getPointAtLength(distance),u=path.getPointAtLength(Math.max(0,distance-2)),v=path.getPointAtLength(Math.min(len,distance+2)),angle=Math.atan2(v.y-u.y,v.x-u.x)*180/Math.PI+(forward?0:180);node.setAttribute('transform',`translate(${p.x} ${p.y})`);node.dataset.direction=forward?'forward':'backward';node.querySelector('.current-arrow').setAttribute('transform',`rotate(${angle})`);}
 const stopTag=state.playing?'目前停止':'已暫停';
 let flowText='';
 if(state.view!=='none'){
  if(q.cell){
   if(q.chemistryKnown){
    const eDir=q.znSide===0?'左鋅 → 右銅':'右鋅 → 左銅',iDir=q.znSide===0?'右銅 → 左鋅':'左銅 → 右鋅';
    flowText=q.active?(state.view==='current'?`電流方向 I：${iDir}（非粒子）`:`外電路 e⁻：${eDir}`):(state.view==='current'?`電流方向 I：${iDir}（${stopTag}，方向說明）`:`外電路 e⁻：${eDir}（${stopTag}，方向說明）`);
   }else if(q.hasLocal){
    flowText=q.meterMode==='unknown'?'僅示範杯內置換；外電路電流未推算':q.symmetricZero?'對稱雙杯置換；理想淨外電流為 0':'僅示範杯內置換（外電路未接通）';
   }else if(q.symmetricZero){
    flowText=q.circuitClosed?'兩側條件對稱：理想淨外電流為 0':'外電路未接通';
   }else{
    flowText=q.meterMode==='unknown'?'外電路電流未在本模型推算':'外電路未接通（此組合外電流未推算）';
   }
  }else if(!q.chemistryKnown){
   flowText='條件不符：不推算外電路流向';
  }else{
   flowText=q.active?(state.view==='current'?'電流方向 I：與電子相反（非粒子）':'e⁻：電源負端 → 負極；正極 → 電源正端'):(state.view==='current'?`${stopTag}（方向說明：I 與 e⁻ 相反）`:`${stopTag}（方向說明：e⁻ 負端→負極）`);
  }
 }
 $('#flow-label').textContent=flowText;
 $('#flow-legend').innerHTML=state.view==='current'?'<i class="current-swatch">→</i>電流方向（非粒子）':'<i class="electron"></i>外電路電子';
 $('#sulfate-legend').hidden=q.water||(q.cell&&cellSolutions(state).every(v=>v==='water'));
 $('#nitrate-legend').hidden=!q.cell;
 $('#oh-legend').hidden=!q.water;
 if(q.cell){
  const galv=$('#galvanometer'),needle=$('#needle'),mg=$('#meter-g'),mu=$('#meter-unknown');
  if(galv)galv.dataset.meterMode=q.meterMode;
  if(q.meterMode==='unknown'){
   needle.setAttribute('visibility','hidden');
   mg?.setAttribute('visibility','hidden');
   mu?.setAttribute('visibility','visible');
  }else{
   needle.setAttribute('visibility','visible');
   needle.setAttribute('x2',String(q.needleX2));
   needle.setAttribute('y2',q.meterMode==='deflected'?'77':'68');
   mg?.setAttribute('visibility','visible');
   mu?.setAttribute('visibility','hidden');
  }
 }
 const wired=polarity(state);
 for(let i=0;i<2;i++){const g=electrodeGeometry(state,i),x=i?570:250;const group=$(`#electrode-${i}`);group.setAttribute('transform',`translate(${x} ${g.top})`);group.dataset.immersed=String(g.immersed);group.dataset.bottom=g.bottom;group.dataset.surface=g.surface;group.dataset.gap=g.gap;
 const pole=$(`#pole-${i}`);
 if(q.cell){pole.textContent=q.chemistryKnown?(q.signs[i]<0?'− 負極':'＋ 正極'):q.local[i].enabled?'杯內置換':q.symmetricZero?'對稱無極差':'未推算';}
 else{pole.textContent=!wired[i]?'未接線':q.signs[i]<0?'− 負極':'＋ 正極';}
 if(q.water&&g.top<110){pole.setAttribute('x',i?592:228);pole.setAttribute('text-anchor',i?'start':'end');pole.setAttribute('y',Math.max(118,g.top+52));}else{pole.setAttribute('x',x);pole.setAttribute('text-anchor','middle');pole.setAttribute('y',Math.max(36,g.top-43));}
 const deposit=$(`#deposit-${i}`);
 if(q.cell){
  const depExt=q.chemistryKnown&&i===q.cuSide?state.extent:q.local[i].enabled?q.local[i].extent:0;
  deposit.setAttribute('opacity',depExt>0?Math.min(.95,depExt*3):0);
 }else if(state.electrodes[i]==='Fe')deposit.setAttribute('stroke-width',q.masses[i]>0?Math.min(8,state.extent*12):0);
 else deposit.setAttribute('opacity',q.masses[i]>0?Math.min(.95,state.extent*3):0);
 $(`#material-label-${i}`).textContent=q.water?'':!g.immersed?material[state.electrodes[i]]+'（未浸入）':q.cell&&q.local[i].enabled?(q.local[i].extent>0||q.local[i].active?'鋅溶解・表面析銅':'鋅片 Zn · 待置換'):material[state.electrodes[i]]+(q.masses[i]>0?' · 銅析出':q.masses[i]<0?' · 溶解':'');
 if(q.water){$('#insulated-lead-'+i).setAttribute('d',insulatedLead(i));const front=207+q.gas[i].volume*7;$(`#tube-water-${i}`).setAttribute('y',front);$(`#tube-water-${i}`).setAttribute('height',430-front);$(`#tube-surface-${i}`).setAttribute('y1',front);$(`#tube-surface-${i}`).setAttribute('y2',front);$(`#gas-label-${i}`).textContent=q.chemistryKnown?`${q.gas[i].name==='H₂'?'氫氣 H₂':'氧氣 O₂'} ${q.gas[i].volume>0?((q.active||q.inFlight)&&state.playing?'集氣增加':'已有集氣'):'等待集氣'}`:'尚無氣體';}
 }
 if(q.cell){
  const sols=cellSolutions(state);
  for(let side=0;side<2;side++){
   const liq=$(side?'#right-liquid':'#left-liquid');if(!liq)continue;
   liq.setAttribute('fill',cellSolFill[sols[side]]);
   const op=q.chemistryKnown&&side===q.cuSide?Math.max(0,1-state.extent):q.local[side].enabled?Math.max(0,1-q.local[side].extent):1;
   liq.setAttribute('opacity',op);
   liq.dataset.solution=sols[side];
  }
 }else if(!q.water){
  const liquid=$('#right-liquid');
  if(liquid){liquid.setAttribute('opacity',state.solution==='water'?1:.18+.82*q.concentration/.2);liquid.setAttribute('fill',state.solution==='water'?'#e2ece4':'url(#liquid)');}
 }
 const particles=microParticles(state),host=$('#micro-particles'),aliveMicro=new Set();for(const p of particles){const id='micro-'+p.id;aliveMicro.add(id);let node=$('#'+id);if(!node){node=document.createElementNS('http://www.w3.org/2000/svg','g');node.id=id;node.innerHTML='<circle r="15" stroke-width="1.4"/>'+text(0,4,'',11.5,'#244c50',{'text-anchor':'middle','font-weight':'600'});host.append(node);}node.setAttribute('transform',`translate(${p.x} ${p.y})`);node.setAttribute('opacity',p.opacity);node.dataset.species=p.species;node.dataset.kind=p.kind;const isSulfate=p.species.includes('SO'),isOh=p.species==='OH⁻',label=node.querySelector('text'),circle=node.querySelector('circle');label.textContent=p.species;label.setAttribute('fill',p.kind==='metal'?'#4a280e':isSulfate?'#3b1d6e':isOh?'#574a1e':'#134454');circle.setAttribute('fill',p.kind==='metal'?'#c98d54':isSulfate?'#e6daf7':isOh?'#ece4c8':'#c1e7f3');circle.setAttribute('stroke',p.kind==='metal'?'#936137':isSulfate?'#6f42b5':isOh?'#8f7e43':'#1b7fa3');}
 for(const child of [...host.children])if(!aliveMicro.has(child.id))child.remove();
 if(q.cell)updateSaltFlow(q);
 const gasHost=$('#gas-bubbles'),alive=new Set();for(const b of state.gasBubbles){const age=state.transportTime-b.born;if(age<0||age>=GAS_TRAVEL_TIME)continue;alive.add(b.id);let node=$('#'+b.id);if(!node){node=document.createElementNS('http://www.w3.org/2000/svg','circle');node.id=b.id;node.setAttribute('r',3.5);node.setAttribute('fill','#fff');node.setAttribute('fill-opacity','.1');node.setAttribute('stroke','#5d9ab1');gasHost.append(node);}let x,y;if(q.water){const front=207+q.gas[b.side].volume*7;x=b.side?552:268;y=b.originY+(front+5-b.originY)*age/GAS_TRAVEL_TIME;}else{x=b.side?550:270;y=b.originY+(327-b.originY)*age/GAS_TRAVEL_TIME;}node.setAttribute('cx',x);node.setAttribute('cy',y);node.setAttribute('opacity',Math.min(1,age/.15,(GAS_TRAVEL_TIME-age)/.15));node.dataset.side=b.side;node.dataset.born=b.born;}
 for(const child of [...gasHost.children])if(!alive.has(child.id))child.remove();
}
function updateSaltFlow(q){
 let view=saltViews.get(state);if(!view||state.time<view.last){view={last:state.time,next:0,serial:0,ions:[]};saltViews.set(state,view);}view.last=state.time;
 if(q.active){while(state.time+1e-9>=view.next){const born=view.next;for(let side=0;side<2;side++)view.ions.push({id:view.serial++,side,born});view.next+=2.4;}view.ions=view.ions.slice(-16);}
 const host=$('#salt-particles'),alive=new Set(),anchors=[null,null],bridgeOffset=drag?.id==='bridge'?(drag.bridgeOffset??(state.bridge?0:BRIDGE_REMOVED)):state.bridge?0:BRIDGE_REMOVED;
 $('#salt-bridge text')?.setAttribute('y',bridgeOffset<-30?284:240);
 const znSide=q.znSide??0,cuSide=q.cuSide??1;
 for(const ion of view.ions){const id='salt-ion-'+ion.id,nitrate=ion.side===1,toLeft=nitrate?znSide===0:cuSide===0,age=Math.max(0,state.time-ion.born),t=Math.min(1,age/6),path=$(toLeft?'#salt-route-left':'#salt-route-right'),p=path.getPointAtLength(path.getTotalLength()*t),exited=p.y>=393,offset=exited?0:bridgeOffset,settle=1-Math.exp(-Math.max(0,age-6)/2),driftAge=Math.max(0,age-6),slot=Math.floor(ion.id/2)%8,targetX=(toLeft?280:495)+(slot%3)*22,targetY=353+Math.floor(slot/3)*35,x=p.x+(targetX-p.x+3*Math.sin(driftAge*.55+ion.id))*settle,y=p.y+offset+(targetY-p.y+3*Math.sin(driftAge*.45+ion.id*.85))*settle;
  alive.add(id);let node=$('#'+id);if(!node){node=document.createElementNS('http://www.w3.org/2000/svg','g');node.id=id;node.dataset.species=nitrate?'NO₃⁻':'K⁺';node.dataset.born=ion.born;node.setAttribute('aria-label',nitrate?'硝酸根離子 NO₃⁻ → 鋅杯':'鉀離子 K⁺ → 銅杯');node.innerHTML=`<circle r="7" fill="${nitrate?'#fde3c6':'#c1eadc'}" stroke="${nitrate?'#c46210':'#2c6550'}" stroke-width="1.6"/><text x="0" y="3" text-anchor="middle" font-size="${nitrate?9:10}" font-weight="600" fill="${nitrate?'#6e3204':'#1b4737'}">${nitrate?'NO₃⁻':'K⁺'}</text>`;host.append(node);}node.dataset.targetSide=String(toLeft?0:1);node.setAttribute('transform',`translate(${x} ${y})`);node.setAttribute('opacity',Math.max(0,Math.min(1,(19.2-age)/1.2)));node.dataset.stage=exited?'cup':'bridge';node.querySelector('circle').setAttribute('r',7+6*settle);node.querySelector('text').setAttribute('opacity',settle);if(!exited||!anchors[ion.side])anchors[ion.side]={x,y};
 }
 for(const n of [...host.children])if(!alive.has(n.id))n.remove();
 for(let side=0;side<2;side++){const n=$('#salt-key-'+side);if(!n)continue;n.style.visibility=q.chemistryKnown?'visible':'hidden';const nitrate=side===1,toLeft=nitrate?znSide===0:cuSide===0,boxW=nitrate?138:108,labelX=toLeft?341:465-boxW,labelY=Math.max(toLeft?264:226,(toLeft?334:290)+bridgeOffset),anchor=anchors[side]||{x:toLeft?335:485,y:300+bridgeOffset};n.dataset.targetSide=String(toLeft?0:1);n.querySelector('.salt-ion-caption').setAttribute('transform',`translate(${labelX} ${labelY})`);n.querySelector('.salt-ion-leader').setAttribute('d',`M${anchor.x} ${anchor.y} H${toLeft?350:470} V${labelY} H${toLeft?341:465}`);}
}
function updateReadings(){const q=snapshot(state),m=state.mode;if(m==='batteries')return;
 for(let i=0;i<2;i++)$(`#immerse-${i?'right':'left'}`).textContent=(electrodeGeometry(state,i).immersed?'移出':'浸回')+(i?'右':'左')+'電極';
 const bridgeIn=drag?.id==='bridge'?(drag.bridgeOffset??(state.bridge?0:BRIDGE_REMOVED))>BRIDGE_THRESHOLD:state.bridge;$('#bridge').textContent=bridgeIn?'移除鹽橋':'裝回鹽橋';
 const hasProgress=state.time>0||state.extent>0||state.transportTime>0||(state.localExtent?.some(v=>v>0));
 let status='',blocked=false;
 if(pending){status='已選接點。點另一個空接點完成接線，或按「取消接線」／Esc。';blocked=true;}
 else if(q.cell&&q.hasLocal){
  const enabledLoc=q.local.filter(l=>l.enabled),anyLocalActive=q.localActive.some(Boolean),anyReady=enabledLoc.some(l=>l.ready),allDepleted=enabledLoc.every(l=>l.depleted),allOut=enabledLoc.every(l=>!l.immersed);
  const extNote=q.meterMode==='unknown'?'外電流未推算':q.symmetricZero?'兩側對稱，理想淨外電流為 0':'外電路未接通';
  if(allDepleted){status=`杯內置換的銅離子已耗盡（教學示意上限）；${extNote}。請重設。`;blocked=true;}
  else if(allOut){status=`鋅片未浸入硫酸銅，杯內置換已暫停；${extNote}。`;blocked=true;}
  else if(anyLocalActive){status=`杯內直接置換中（鋅溶解・表面析銅，不需外電路或鹽橋）；${extNote}。`;}
  else if(anyReady){status=hasProgress?`已暫停（杯內置換保留進度；${extNote}）`:`已暫停（按「▶ 播放」開始杯內直接置換；${extNote}）`;}
 }else{
  status=(q.reason&&q.inFlight&&state.playing?q.reason+' 已生成氣泡繼續集氣。':q.reason)||(state.playing?'反應中':hasProgress?'已暫停':'已暫停（按「▶ 播放」開始）');
  blocked=!!q.reason;
 }
 $('#status').textContent=status;$('#status').classList.toggle('blocked',blocked);$('#clock').textContent=`示意時間 ${state.time.toFixed(1)} s`;$('#detail-clock').textContent=$('#clock').textContent;
 $('#notice').textContent=state.message;$('#play').textContent=state.playing?'Ⅱ 暫停':hasProgress?'▶ 繼續':'▶ 播放';
 const trendMass=n=>n>0?(q.active?'增加':'已增加'):n<0?(q.active?'減少':'已減少'):'尚無變化';
 if(q.cell&&q.hasLocal){
  const locCards=[0,1].map(side=>{
   const l=q.local[side],sideName=side?'右':'左';
   if(l.enabled)return [`${sideName}極（杯內置換淨重）`,fmt(l.netMass)+' g',`溶鋅 ${fmt(l.znDissolvedMass)} g · 析銅 ${fmt(l.cuDepositedMass)} g`];
   return [`${sideName}極變化`,q.meterMode==='unknown'?'—':'0.000 g',q.meterMode==='unknown'?'外電路未推算，不斷言不變':'外電路未接通'];
  });
  const bothLocal=q.local[0].enabled&&q.local[1].enabled,onlySide=q.local[0].enabled?0:1;
  const concCard=bothLocal?['左右杯 Cu²⁺ 濃度',`${q.local[0].concentration.toFixed(3)} / ${q.local[1].concentration.toFixed(3)} M`,'雙杯各自置換（各 50 mL、初始 0.100 M）']:[`${onlySide?'右':'左'}杯 Cu²⁺ 濃度`,q.local[onlySide].concentration.toFixed(3)+' M',`杯內置換示意（初始 0.100 M；${q.meterMode==='unknown'?'外電路未推算':'不需外電路或鹽橋'}）`];
  $('#readings').innerHTML=[...locCards,concCard].map(([a,b,c])=>`<div class="reading"><small>${a}</small><b>${b}</b><span>${c}</span></div>`).join('');
  $('#reactions').innerHTML=[0,1].map(side=>{
   const l=q.local[side],sideName=side?'右':'左';
   if(l.enabled)return `<div class="reaction"><strong>${sideName}杯 · 杯內直接置換${l.active?'':' · 目前停止'}</strong><code>Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s)</code></div>`;
   return `<div class="reaction"><strong>${sideName}杯 · ${q.meterMode==='unknown'?'外電路未推算':'無外電路反應'}</strong><code>${q.meterMode==='unknown'?'外電路機制未建模，不推算反應':'外電路未接通，無跨杯反應'}</code></div>`;
  }).join('');
  $('#cause').textContent=`鋅片浸於硫酸銅溶液會直接發生單置換：每消耗 1 mol Zn（65.38 g）與 1 mol Cu²⁺，同時在鋅表面析出 1 mol Cu（63.546 g），因此附著銅層時固體淨重微減 n×(63.546−65.38) g，且不需外導線或鹽橋。單杯以 50 mL、0.100 M（0.005 mol）為示意上限，速率為教學示意。${q.reason}`;
  const locTrend=[0,1].map(side=>{
   const l=q.local[side],sideName=side?'右':'左';
   if(l.enabled){const st=!l.immersed?'未浸入（已暫停）':l.depleted?'銅離子已耗盡':l.active?'鋅溶解・表面析銅':l.extent>0?'已溶解並析銅':'待置換';return `<div><span>${sideName}極（局部）</span><b>${st}</b></div>`;}
   return `<div><span>${sideName}極變化</span><b>${q.meterMode==='unknown'?'未推算':'外電路開路'}</b></div>`;
  }).join('');
  const blueTrend=bothLocal?`<div><span>左右杯藍色</span><b>${q.local.some(l=>l.active)?'變淡':q.local.some(l=>l.extent>0)?'已變淡':'尚無變化'}</b></div>`:`<div><span>${onlySide?'右':'左'}杯藍色（局部）</span><b>${q.local[onlySide].active?'變淡':q.local[onlySide].extent>0?'已變淡':'尚無變化'}</b></div>${q.meterMode==='unknown'?'<div><span>外電路通道</span><b>未推算</b></div>':''}`;
  $('#trends').innerHTML=locTrend+blueTrend;
 }else{
  const cuCupName=q.cuSide?'右':'左',znCupName=q.znSide?'右':'左';
  const readings=q.water?[['左管 '+q.gas[0].name,'≈ '+q.gas[0].volume.toFixed(2)+' mL','同溫同壓的示意體積'],['右管 '+q.gas[1].name,'≈ '+q.gas[1].volume.toFixed(2)+' mL','更改接法會清空舊氣體'],['生成體積比 H₂：O₂','2 : 1','同溫同壓；兩管讀值為近似值']]:[['左極質量變化',fmt(q.masses[0])+' g','相對本次觀察開始'],['右極質量變化',fmt(q.masses[1])+' g','相對本次觀察開始'],['Cu²⁺ 濃度',q.concentration!==null?q.concentration.toFixed(3)+' M':'—',q.cell?`${cuCupName}杯（初始 0.100 M）`:'溶液（初始 0.200 M）']];
  const supported=q.chemistryKnown;
  const fallbackNote=q.cell&&q.symmetricZero?'理想對稱半電池，淨外電流為 0':'未在本模型推算';
  $('#readings').innerHTML=readings.map(([a,b,c])=>`<div class="reading"><small>${a}</small><b>${supported?b:'—'}</b><span>${supported?c:fallbackNote}</span></div>`).join('');
  $('#reactions').innerHTML=q.half.map((r,i)=>`<div class="reaction"><strong>${i?'右':'左'}極 · ${q.cell?(supported?(i===q.znSide?'氧化（失電子）':'還原（得電子）'):(q.symmetricZero?'對稱零電動勢':'未推算')):q.signs[i]<0?'還原（得電子）':q.signs[i]>0?'氧化（失電子）':'未接線'}${q.reason?' · 目前停止':''}</strong><code>${supported?r:fallbackNote}</code></div>`).join('');
  $('#cause').textContent=q.reason?q.reason:q.cell?`鋅溶解成 Zn²⁺，銅離子得電子析出銅；${cuCupName}杯藍色漸淡。鹽橋陰離子 NO₃⁻ 往${znCupName}鋅杯、陽離子 K⁺ 往${cuCupName}銅杯移動，以維持電中性。`:q.water?'水分解為氫氣與氧氣；負極氣體可燃，正極氣體助燃。Na⁺ 只移動，不析出鈉；OH⁻ 在正極參與反應。':q.cuAn?'負極析出銅，正極溶出等莫耳銅離子；兩極銅的質量變化大小相同，溶液藍色大致不變。':'負極析出銅，碳正極發生水的氧化並產生氧氣；Cu²⁺ 被消耗，溶液藍色漸淡。碳棒視為理想惰性電極。';
  const unmodeledTag=q.cell&&q.symmetricZero?'對稱無淨變化':'未推算';
  const trend=q.water?`<div><span>負極 · 氫氣 H₂</span><b>${q.gas.some(g=>g.volume>0)?'已有集氣':'等待集氣'}</b></div><div><span>正極 · 氧氣 O₂</span><b>生成體積比 2 : 1</b></div>`:`<div><span>左極質量</span><b>${supported?trendMass(q.masses[0]):unmodeledTag}</b></div><div><span>右極質量</span><b>${supported?trendMass(q.masses[1]):unmodeledTag}</b></div><div><span>${q.cell&&supported?cuCupName+'杯藍色':'溶液藍色'}</span><b>${!supported?unmodeledTag:q.concentration<(q.cell?.1:.2)-1e-10?(q.active?'變淡':'已變淡'):'不變'}</b></div>`;
  $('#trends').innerHTML=trend;
 }
 $('#open-details').textContent=m==='water'?'讀值與氣體檢驗':'讀值與反應';$('#gas-tests').hidden=m!=='water';for(let i=0;i<2;i++)$(`#gas-result-${i}`).textContent=state.gasTests?.[i]?.text||'尚未檢驗';
}
function render(){
 const m=state.mode;$('#tabs').innerHTML=Object.entries(MODES).map(([id,name])=>`<button data-mode="${id}" role="tab" aria-selected="${m===id}">${name}</button>`).join('');$('#title').textContent=MODES[m];$('#eyebrow').textContent=intro[m][0];$('#subtitle').textContent=intro[m][1];$('#scene-name').textContent=MODES[m];$('#lab').hidden=m==='batteries';$('#battery-room').hidden=m!=='batteries';if(m==='batteries'){renderBattery();return;}
 for(let i=0;i<2;i++){const opts=electrodeOptions(m,i);const sel=$(i?'#right-electrode':'#left-electrode');sel.innerHTML=opts.map(v=>`<option value="${v}">${material[v]}</option>`).join('');sel.value=state.electrodes[i];$(`#immerse-${i?'right':'left'}`).textContent=(electrodeGeometry(state,i).immersed?'移出':'浸回')+(i?'右':'左')+'電極';}
 $('#cell-solutions-row').hidden=m!=='cell';$('#single-solution-row').hidden=m==='cell';
 if(m==='cell'){
  const sols=cellSolutions(state);
  for(let i=0;i<2;i++){const sel=$(i?'#right-solution':'#left-solution');sel.innerHTML=cellSolutionOptions.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');sel.value=sols[i];}
 }else{
  $('#solution').innerHTML=solutionOptions(m).map(([v,t])=>`<option value="${v}">${t}</option>`).join('');$('#solution').value=state.solution;
 }
 $('#bridge').hidden=m!=='cell';$('#bridge').textContent=state.bridge?'移除鹽橋':'裝回鹽橋';$('#power').hidden=m==='cell';$('#power').textContent=state.power?'關閉直流電源':'開啟直流電源';$('#speed').value=state.speed;$('#view').value=state.view;$('#setup-note').textContent='換電極、溶液或反接會開始新一輪觀察；拆線、移出電極與暫停則保留已有產物。';$('#reminder').textContent=reminders[m];
 makeScene();updateReadings();
}
function change(type,fn,{fresh=false}={}){pending=null;fn();if(fresh){freshObservation(state);saltViews.delete(state);}render();}
function doReverse(){
 if(state.wires.length!==2){state.message='先完成兩條導線，再交換接法；目前接線保持不變。';updateReadings();return;}
 change('reverse',()=>{state.wires=[['n',polarity(state)[0]<0?'r':'l'],['p',polarity(state)[0]<0?'l':'r']];state.observationPolarity=polarity(state);if(state.mode==='cell'){state.playing=false;}else{freshObservation(state);saltViews.delete(state);}});
}
// Non-modal HTML popover: freezes observation while open, preserves play intent on cancel/no-op
const popEl=$('#scene-popover'),popTitle=$('#popover-title'),popBody=$('#popover-body');
function closePopover({restoreFocus=false}={}){
 if(!popover)return;
 const sel=popover.triggerSelector;
 popover=null;
 popEl.hidden=true;popBody.innerHTML='';
 if(restoreFocus&&sel)$(sel)?.focus();
}
function openPopover(kind,triggerEl,fromKeyboard=false){
 if(state.mode==='batteries')return;
 if(popover?.kind===kind){closePopover({restoreFocus:fromKeyboard});return;}
 const triggerSelector=triggerEl?.id?'#'+triggerEl.id:null;
 let title='',items=[],note='';
 if(kind==='electrode-0'||kind==='electrode-1'){
  const side=kind==='electrode-1'?1:0;
  title=(side?'右':'左')+'電極材料';
  items=electrodeOptions(state.mode,side).map(v=>({
   label:material[v],current:state.electrodes[side]===v,
   run:()=>{if(state.electrodes[side]===v){closePopover({restoreFocus:fromKeyboard});return;}closePopover({restoreFocus:false});change('electrode',()=>{state.electrodes[side]=v;},{fresh:true});if(fromKeyboard)$(`#electrode-${side}`)?.focus();}
  }));
  note='上下拖曳或按 ↑／↓ 移出浸回';
 }else if(kind==='solution-0'||kind==='solution-1'){
  const side=kind==='solution-1'?1:0,cur=cellSolutions(state)[side];
  title=(side?'右':'左')+'杯溶液';
  items=cellSolutionOptions.map(([v,t])=>({
   label:t,current:cur===v,
   run:()=>{if(cur===v){closePopover({restoreFocus:fromKeyboard});return;}closePopover({restoreFocus:false});change('solution',()=>{const sols=[...cellSolutions(state)];sols[side]=v;state.solutions=sols;},{fresh:true});if(fromKeyboard)$(`#solution-target-${side}`)?.focus();}
  }));
 }else if(kind==='solution'){
  title='更換溶液';
  items=solutionOptions(state.mode).map(([v,t])=>({
   label:t,current:state.solution===v,
   run:()=>{if(state.solution===v){closePopover({restoreFocus:fromKeyboard});return;}closePopover({restoreFocus:false});change('solution',()=>{state.solution=v;},{fresh:true});if(fromKeyboard)$('#solution-target')?.focus();}
  }));
 }else if(kind==='power'){
  const wired2=state.wires.length===2,hasWire=state.wires.length>0;
  if(state.mode==='cell'){
   title='檢流計與導線';
   items=[
    {label:'交換兩線接法',disabled:!wired2,run:()=>{closePopover({restoreFocus:false});doReverse();if(fromKeyboard)$('#power-target')?.focus();}},
    {label:'拆下全部導線',disabled:!hasWire,run:()=>{closePopover({restoreFocus:false});change('wire',()=>{state.wires=[];});if(fromKeyboard)$('#power-target')?.focus();}}
   ];
  }else{
   title='直流電源與導線';
   items=[
    {label:state.power?'關閉直流電源':'開啟直流電源',run:()=>{closePopover({restoreFocus:false});change('power',()=>{state.power=!state.power;});if(fromKeyboard)$('#power-target')?.focus();}},
    {label:'交換兩線接法',disabled:!wired2,run:()=>{closePopover({restoreFocus:false});doReverse();if(fromKeyboard)$('#power-target')?.focus();}},
    {label:'拆下全部導線',disabled:!hasWire,run:()=>{closePopover({restoreFocus:false});change('wire',()=>{state.wires=[];});if(fromKeyboard)$('#power-target')?.focus();}}
   ];
  }
 }else return;
 popover={kind,triggerSelector};
 popTitle.textContent=title;popBody.innerHTML='';
 items.forEach(it=>{
  const b=document.createElement('button');b.type='button';
  if(it.disabled)b.disabled=true;
  if(it.current)b.setAttribute('aria-pressed','true');
  b.innerHTML=`<span>${it.label}</span>${it.current?'<span aria-hidden="true">✓</span>':''}`;
  b.onclick=it.run;popBody.append(b);
 });
 if(note){const p=document.createElement('p');p.className='popover-note';p.textContent=note;popBody.append(p);}
 popEl.hidden=false;
 // Position adjacent to trigger element and strictly clamp within viewport (works on 390/844 & 200% zoom)
 const vw=window.innerWidth,vh=window.innerHeight,pad=8;
 const pr=popEl.getBoundingClientRect(),tr=(triggerEl||svg).getBoundingClientRect();
 let left=kind==='electrode-0'?tr.right+10:kind==='electrode-1'?tr.left-pr.width-10:tr.left+(tr.width-pr.width)/2;
 let top=kind.startsWith('electrode-')?tr.top:kind==='power'?tr.bottom+8:tr.top-pr.height-8;
 if(left+pr.width>vw-pad)left=tr.left-pr.width-10;
 if(left<pad)left=tr.right+10;
 left=Math.max(pad,Math.min(vw-pr.width-pad,left));
 top=Math.max(pad,Math.min(vh-pr.height-pad,top));
 popEl.style.left=Math.round(left)+'px';popEl.style.top=Math.round(top)+'px';
 const firstBtn=popBody.querySelector('button:not(:disabled)')||$('#popover-close');
 firstBtn?.focus();
}
$('#popover-close').onclick=()=>closePopover({restoreFocus:true});
popEl.addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();closePopover({restoreFocus:true});return;}
 const btns=[...popEl.querySelectorAll('button:not(:disabled)')];if(!btns.length)return;
 const idx=btns.indexOf(document.activeElement);
 if(e.key==='ArrowDown'){e.preventDefault();btns[(idx+1)%btns.length].focus();}
 else if(e.key==='ArrowUp'){e.preventDefault();btns[(idx-1+btns.length)%btns.length].focus();}
 else if(e.key==='Home'){e.preventDefault();btns[0].focus();}
 else if(e.key==='End'){e.preventDefault();btns[btns.length-1].focus();}
});
document.addEventListener('pointerdown',e=>{
 if(!popover)return;
 if(popEl.contains(e.target))return;
 if(e.target.closest('#scene-stage [data-drag],#scene-stage [data-action],#scene-stage [data-terminal],#scene-stage [data-wire]'))return;
 closePopover({restoreFocus:false});
},true);

const modeStates=new Map();
function switchMode(m,{reset=false}={}){closePopover({restoreFocus:false});cancelDrag();state.playing=false;leadPlaying=false;modeStates.set(state.mode,state);state=reset?initial(m):(modeStates.get(m)||initial(m));state.playing=false;if(!state.observationPolarity)state.observationPolarity=[-1,1];pending=null;drag=null;render();}
$('#tabs').addEventListener('click',e=>{if(e.target.dataset.mode)switchMode(e.target.dataset.mode);});
$('#reset').onclick=()=>{closePopover({restoreFocus:false});cancelDrag();if(state.mode==='batteries'){batteryIndex=0;batteryPart='overview';batteryProcess='discharge';leadProgress=0;leadPlaying=false;renderBattery();}else switchMode(state.mode,{reset:true});};
$('#play').onclick=()=>{closePopover({restoreFocus:false});state.playing=!state.playing;updateDynamic();updateReadings();};
$('#gas-tests').onclick=e=>{const button=e.target.closest('[data-gas-test]');if(button){const side=Number(button.dataset.gasTest);state.gasTests[side]=testCollectedGas(state,side);updateReadings();}};
$('#speed').onchange=e=>{state.speed=Number(e.target.value);};$('#view').onchange=e=>{state.view=e.target.value;updateDynamic();};
$('#power').onclick=()=>change('power',()=>state.power=!state.power);
$('#bridge').onclick=()=>change('bridge',()=>state.bridge=!state.bridge);
for(let i=0;i<2;i++){$(i?'#right-electrode':'#left-electrode').onchange=e=>change('electrode',()=>{state.electrodes[i]=e.target.value;},{fresh:true});$(`#immerse-${i?'right':'left'}`).onclick=()=>change('immerse',()=>toggleElectrode(state,i));}
for(let i=0;i<2;i++){$(i?'#right-solution':'#left-solution').onchange=e=>{const sols=[...cellSolutions(state)];if(sols[i]===e.target.value)return;change('solution',()=>{sols[i]=e.target.value;state.solutions=sols;},{fresh:true});};}
$('#solution').onchange=e=>{if(state.solution===e.target.value)return;change('solution',()=>state.solution=e.target.value,{fresh:true});};
$('#unwire').onclick=()=>change('wire',()=>{state.wires=[];});
$('#reverse').onclick=doReverse;
function cancel(){pending=null;drawWires();updateReadings();}$('#cancel').onclick=cancel;
function pickTerminal(id){if(!pending){if(state.wires.some(w=>w.includes(id))){state.message='這個接點已有導線；先點導線拆下再接。';}else pending=id;}else if(pending===id){pending=null;}else{if(connect(state,pending,id)){state.message='接線完成。';pending=null;}else{state.message='需連接一個電源／檢流計端與一個空電極端；無效接法未變動原導線。';}}drawWires();updateReadings();}
function point(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());}
function cancelDrag(){
 if(!drag){if(pending){pending=null;drawWires();updateReadings();}return;}
 const d=drag;drag=null;
 try{if(d.captured&&d.captureTarget?.hasPointerCapture(d.pointerId))d.captureTarget.releasePointerCapture(d.pointerId);}catch{}
 if(d.kind==='body'){if(d.id==='bridge')state.bridge=d.startBridge;else state.electrodeY[Number(d.id)]=d.startY;}
 $('#pending-line')?.remove();pending=null;
 makeScene();updateReadings();
}
// Track active pointers globally so a 2nd finger landing anywhere cleanly cancels active drag
window.addEventListener('pointerdown',e=>{activePointers.add(e.pointerId);if(activePointers.size>=2&&drag)cancelDrag();},true);
window.addEventListener('pointerup',e=>{activePointers.delete(e.pointerId);},true);
window.addEventListener('pointercancel',e=>{activePointers.delete(e.pointerId);},true);
stage.addEventListener('touchstart',e=>{if(e.touches.length>=2&&drag)cancelDrag();},{passive:true});
// Unified pointer pipeline on #scene-stage: real HTML .hit-handle boxes honor CSS touch-action:pinch-zoom at compositor level before gesture start
stage.addEventListener('pointerdown',e=>{
 if(e.button>0)return;
 activePointers.add(e.pointerId);
 if(activePointers.size>=2||!e.isPrimary){cancelDrag();return;}
 const terminal=e.target.closest('[data-terminal]'),body=e.target.closest('[data-drag]'),wire=e.target.closest('[data-wire]'),action=e.target.closest('[data-action]');
 if(!terminal&&!body&&!wire&&!action)return;
 if(terminal){
  if(e.pointerType==='mouse')e.preventDefault();
  const capEl=terminal;
  drag={kind:'terminal',id:terminal.dataset.terminal,pointerId:e.pointerId,captureTarget:capEl,startClient:{x:e.clientX,y:e.clientY},startSvg:point(e),moved:false,captured:false};
  try{capEl.setPointerCapture(e.pointerId);drag.captured=true;}catch{}
 }else if(body){
  if(e.pointerType==='mouse')e.preventDefault();
  const id=body.dataset.drag,capEl=body,triggerEl=id==='bridge'?$('#salt-bridge'):$(`#electrode-${id}`);
  drag={kind:'body',id,triggerEl,pointerId:e.pointerId,captureTarget:capEl,startClient:{x:e.clientX,y:e.clientY},startSvg:point(e),moved:false,captured:false,startY:id==='bridge'?0:state.electrodeY[Number(id)],startBridge:state.bridge,bridgeOffset:state.bridge?0:BRIDGE_REMOVED};
  try{capEl.setPointerCapture(e.pointerId);drag.captured=true;}catch{}
 }else if(wire){
  drag={kind:'wire',index:Number(wire.dataset.wire),pointerId:e.pointerId,startClient:{x:e.clientX,y:e.clientY},moved:false,captured:false};
 }else if(action){
  drag={kind:'action',action:action.dataset.action,triggerEl:action,pointerId:e.pointerId,startClient:{x:e.clientX,y:e.clientY},moved:false,captured:false};
 }
});
stage.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.pointerId)return;
 const distPx=Math.hypot(e.clientX-drag.startClient.x,e.clientY-drag.startClient.y);
 if(!drag.moved){
  if(distPx<DRAG_SLOP_PX)return;
  drag.moved=true;
  if(popover)closePopover({restoreFocus:false});
 }
 if(drag.kind==='wire'||drag.kind==='action')return;
 const p=point(e);
 if(drag.kind==='terminal'){
  let line=$('#pending-line');
  if(!line){line=document.createElementNS('http://www.w3.org/2000/svg','path');line.id='pending-line';line.setAttribute('stroke','#c99727');line.setAttribute('stroke-width',4);line.setAttribute('fill','none');line.setAttribute('pointer-events','none');svg.append(line);}
  const [x,y]=terminalPos(drag.id);line.setAttribute('d',`M${x} ${y} L${p.x} ${p.y}`);
 }else if(drag.kind==='body'){
  const dy=p.y-drag.startSvg.y;
  if(drag.id==='bridge'){
   drag.bridgeOffset=Math.max(BRIDGE_MIN,Math.min(10,(drag.startBridge?0:BRIDGE_REMOVED)+dy));
   $('#salt-bridge')?.setAttribute('transform',`translate(0 ${drag.bridgeOffset})`);
   updateDynamic();updateReadings();syncHitHandles();
  }else{
   setElectrodeY(state,Number(drag.id),drag.startY+dy);drawWires();updateReadings();
  }
 }
});
stage.addEventListener('pointerup',e=>{
 activePointers.delete(e.pointerId);
 if(!drag||e.pointerId!==drag.pointerId)return;
 const d=drag;drag=null;$('#pending-line')?.remove();
 try{if(d.captured&&d.captureTarget?.hasPointerCapture(e.pointerId))d.captureTarget.releasePointerCapture(e.pointerId);}catch{}
 if(d.kind==='wire'){if(!d.moved){closePopover({restoreFocus:false});change('wire',()=>state.wires.splice(d.index,1));}return;}
 if(d.kind==='action'){if(!d.moved)openPopover(d.action,d.triggerEl,false);return;}
 if(d.kind==='terminal'){
  if(d.moved){
   const p=point(e),target=eNames.find(id=>{const [x,y]=terminalPos(id);return Math.hypot(x-p.x,y-p.y)<30;});
   if(target&&target!==d.id){pending=d.id;pickTerminal(target);}else{state.message='未落在接點，原接線保留。';drawWires();updateReadings();}
  }else{closePopover({restoreFocus:false});pickTerminal(d.id);}
  return;
 }
 if(d.id==='bridge'){
  if(d.moved){state.bridge=d.bridgeOffset>BRIDGE_THRESHOLD;render();}
  else{closePopover({restoreFocus:false});state.message='鹽橋：直接上下拖曳可移出或裝回（鍵盤 ↑ 移出、↓ 裝回）。';$('#salt-bridge')?.focus();updateReadings();}
 }else{
  if(d.moved){render();}
  else{openPopover('electrode-'+d.id,d.triggerEl,false);}
 }
});
const onPointerAbort=e=>{activePointers.delete(e.pointerId);if(drag&&e.pointerId===drag.pointerId)cancelDrag();};
stage.addEventListener('pointercancel',onPointerAbort);
stage.addEventListener('lostpointercapture',onPointerAbort);
window.addEventListener('resize',()=>{if(drag)cancelDrag();if(popover)closePopover({restoreFocus:false});syncHitHandles();});
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>syncHitHandles()).observe(svg);
svg.addEventListener('keydown',e=>{
 const t=e.target.closest('[data-terminal]'),w=e.target.closest('[data-wire]'),b=e.target.closest('[data-drag]'),a=e.target.closest('[data-action]');
 if(b&&(e.key==='ArrowUp'||e.key==='ArrowDown')){
  e.preventDefault();closePopover({restoreFocus:false});
  const id=b.dataset.drag,up=e.key==='ArrowUp';
  if(id==='bridge'){if(state.bridge===up)change('bridge',()=>{state.bridge=!up;});$('#salt-bridge')?.focus();}
  else{const i=Number(id),spec=electrodeSpec(state);change('immerse',()=>{setElectrodeY(state,i,up?spec.removedY:spec.insertedY);});$(`#electrode-${i}`)?.focus();}
  return;
 }
 if(!['Enter',' '].includes(e.key))return;
 e.preventDefault();
 if(t){closePopover({restoreFocus:false});pickTerminal(t.dataset.terminal);}
 else if(w){closePopover({restoreFocus:false});change('wire',()=>state.wires.splice(Number(w.dataset.wire),1));}
 else if(b){
  if(b.dataset.drag==='bridge'){state.message='鹽橋：直接上下拖曳或按鍵盤 ↑ 移出、↓ 裝回。';updateReadings();}
  else openPopover('electrode-'+b.dataset.drag,b,true);
 }else if(a){openPopover(a.dataset.action,a,true);}
});
document.addEventListener('keydown',e=>{
 if(e.key!=='Escape')return;
 if(popover){e.preventDefault();closePopover({restoreFocus:true});return;}
 if(!document.querySelector('dialog[open]'))cancelDrag();
});
$('#guide-content').innerHTML=`<h3>先玩，再問為什麼</h3><p>每個實驗載入時皆已備好預設裝置並先暫停，按「▶ 播放」即開始反應。途中可隨時「Ⅱ 暫停」，再直接操作裝置來比較。</p><ul><li>電極與鹽橋：直接上下拖曳本體即可移出或浸入（不需切換模式），接線保留；鍵盤聚焦後可按 ↑ 移出、↓ 浸回。點選電極開啟材料選單；點選溶液或直流電源／檢流計開啟對應選單；右側「更多條件」收合提供備援清單。</li><li>接線：點一個空接點再點另一端，或從接點直接拖到另一接點；點導線即可拆除。落空不刪原線，多指、Esc 或「取消接線」可安全取消。</li><li>換電極、溶液與電解反接會清空本輪產物及時間並回到暫停（鋅銅反接保留產物並暫停）。拆線、電源開關、移出、暫停或關閉未改條件的選單皆保留已有進度與原本播放意願；切換實驗保留進度並先暫停；「重設」回復預設裝置並待播放。</li></ul><h3>模型的範圍</h3><p>這是教材條件下的理想化趨勢模型，時間、粒子密度、氣泡數、鍍層厚度、檢流計偏轉皆為示意；鹽橋離子持續分批示意，最多保留16個，舊批次在杯內淡出而非跳回橋內。硫酸根（SO₄²⁻，紫系）與硝酸根（NO₃⁻，橙系）以不同色系搭配完整化學式區分。傳統電流箭頭只表示方向，不是物質；箭頭速度與密度不代表真實電流大小，亦非實驗速率或實物精密讀值。無實際電壓、電阻、電流及溫度求解。電子只出現在外電路；溶液內移動的是離子。暫停時所有動態凍結，條件缺少時停止新反應；非反應離子保留，已形成的氣泡繼續收集。</p><table><tr><th>裝置</th><th>定量關係與停止界線</th></tr><tr><td>鋅銅電池</td><td>各 50 mL、0.1 M 硫酸鹽；KNO₃ 鹽橋。標準與左右鏡像皆依化學角色派生（外線反接只改檢流計偏轉，不逆轉氧化還原）。每反應 1 mol Zn 消耗 1 mol Cu²⁺，n(e⁻)=2n(Cu)，最多 0.005 mol。若鋅片直接浸於硫酸銅，則在該杯獨立發生單置換（不需導線或鹽橋；固體淨重變化為 n×(63.546−65.38) g，速率僅教學示意）；其餘未建模外電路機制於檢流計顯示「— 未推算」，不假造為 0。</td></tr><tr><td>電解水</td><td>水＋NaOH、碳電極；鹼性半反應。相同溫壓，H₂ : O₂＝2 : 1。60 示意秒生成 20/10 mL；氣泡經 3 示意秒運送後收集，非水耗盡。</td></tr><tr><td>硫酸銅／電鍍</td><td>150 mL、0.2 M。60 示意秒對應 0.03 mol Cu；以銅正極補回同量銅離子，碳正極則消耗銅離子並產生氧氣。碳正極氧氣刻度僅示意。莫耳質量 Cu 63.546、Zn 65.38 g/mol。</td></tr></table><p>忽略過電位、極化、擴散限制、溶液體積改變、電極接觸電阻及副反應。純水非完全不導電，但在這個觀察尺度不顯示可測產氣。碳棒視為不消耗的惰性電極；電鍍以已清潔鐵物件理想附著，未模擬表面處理與鐵正極腐蝕。銅離子耗盡後不延伸假造反應。反接鐵物件為正極時，因副反應未建模，停止並提示。</p><h3>教材對照</h3><p>指定《02-114 國中自然3下（理化）備課 CH1》：印刷頁 19–23 鋅銅電池；24–25 電池構造；26–28 電解水；29–31 電解硫酸銅；32–33 電鍍。生活電池只做教材內的定性比較，鉛蓄單格展示 5 片交錯並聯極板（負極板多一片，讓正極板兩面都對著負極板）與 H⁺／SO₄²⁻ 放充電定性動畫，預設暫停、按播放開始、達終態即停止並可重置動畫，不預測市售產品性能。</p><h3>虛擬操作與實驗</h3><p>可點選左右收集氣體做虛擬檢驗，依當輪產物及收集量顯示性質；不提供實際點火操作。實際實驗需教師指導；硫酸銅與電鍍廢液須集中處理，不能倒進水槽。廢電池應交回收管道，不能投入一般垃圾。</p>`;
$('#help').onclick=()=>{closePopover({restoreFocus:false});$('#guide').showModal();};$('#close-help').onclick=()=>$('#guide').close();
$('#open-details').onclick=()=>{closePopover({restoreFocus:false});$('#details-dialog').showModal();};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
function syncFullscreen(){const on=!!document.fullscreenElement;$('#project').setAttribute('aria-pressed',String(on));$('#project').textContent=on?'⛶ 離開全螢幕':'⛶ 全螢幕';}
$('#project').onclick=async()=>{if(document.fullscreenElement){await document.exitFullscreen();return;}try{if(!document.documentElement.requestFullscreen)throw new Error('unsupported');await document.documentElement.requestFullscreen();try{if(!screen.orientation?.lock)throw new Error('unsupported');await screen.orientation.lock('landscape');$('#orientation-hint').textContent='';}catch{$('#orientation-hint').textContent='請將平板橫放；可照常操作。';}}catch{$('#orientation-hint').textContent='此瀏覽器未開啟全螢幕，請將平板橫放操作。';}syncFullscreen();};
document.addEventListener('fullscreenchange',syncFullscreen);
const batteries=[{name:'碳鋅電池',hint:'鋅筒在外，碳棒居中。'},{name:'鹼性電池',hint:'鋅粉在內，二氧化錳在外。'},{name:'鉛蓄電池',hint:'5 片正、負極板交錯並聯，浸在硫酸液中。'}];
function syncLeadControls(){const playBtn=$('#lead-play');if(playBtn){playBtn.textContent=leadProgress>=1?'▶ 已達終態':leadPlaying?'Ⅱ 暫停':leadProgress>0?'▶ 繼續':'▶ 播放';playBtn.disabled=leadProgress>=1;}}
function updateBatteryPartSelection(){const desc=(BATTERY_PARTS[batteryIndex][batteryPart]||BATTERY_PARTS[batteryIndex].overview);const note=$('#battery-part-note');if(note)note.innerHTML=`<strong>${desc[0]}</strong>　${desc[1]}`;$('#battery-room').querySelectorAll('[data-part]').forEach(el=>el.classList.toggle('part-selected',el.dataset.part===batteryPart));}
function renderBattery(){const b=batteries[batteryIndex];$('#battery-room').innerHTML=`<div class="battery-layout"><div class="battery-menu" aria-label="選擇電池">${batteries.map((b,i)=>`<button data-battery="${i}" class="${i===batteryIndex?'selected':''}" aria-pressed="${i===batteryIndex}">${b.name}</button>`).join('')}</div><section class="canvas-card battery-detail${batteryIndex===2?' lead-detail':''}"><div class="battery-heading"><div><h2>${b.name}</h2><p>${b.hint}</p></div><div class="battery-controls">${batteryIndex===2?`<button data-process="discharge" aria-pressed="${batteryProcess==='discharge'}">放電</button><button data-process="charge" aria-pressed="${batteryProcess==='charge'}">充電</button><button id="lead-play" data-lead-action="toggle">${leadPlaying?'Ⅱ 暫停':leadProgress>0?'▶ 繼續':'▶ 播放'}</button><button id="lead-replay" data-lead-action="replay">↺ 重置動畫</button>`:'<span class="tag">一次電池 · 只放電</span>'}</div></div>${batteryStructure(batteryIndex,batteryProcess,batteryPart)}</section></div>`;if(batteryIndex===2){updateLeadVisuals($('#battery-room'),batteryProcess,leadProgress,leadPlaying);syncLeadControls();}}
$('#battery-room').onclick=e=>{const target=e.target.closest('[data-battery],[data-process],[data-lead-action],[data-part]');if(!target)return;if(target.dataset.battery!==undefined){batteryIndex=Number(target.dataset.battery);batteryPart='overview';batteryProcess='discharge';leadProgress=0;leadPlaying=false;renderBattery();}else if(target.dataset.process){batteryProcess=target.dataset.process;leadProgress=0;leadPlaying=false;renderBattery();}else if(target.dataset.leadAction==='toggle'){if(leadProgress<1){leadPlaying=!leadPlaying;updateLeadVisuals($('#battery-room'),batteryProcess,leadProgress,leadPlaying);syncLeadControls();}}else if(target.dataset.leadAction==='replay'){leadProgress=0;leadPlaying=false;updateLeadVisuals($('#battery-room'),batteryProcess,leadProgress,leadPlaying);syncLeadControls();}else{batteryPart=target.dataset.part;if(batteryIndex===2)updateBatteryPartSelection();else renderBattery();}};
$('#battery-room').onkeydown=e=>{if(['Enter',' '].includes(e.key)&&e.target.dataset.part){e.preventDefault();batteryPart=e.target.dataset.part;if(batteryIndex===2)updateBatteryPartSelection();else renderBattery();}};
function frame(now){const dt=Math.min(.1,(now-last)/1000);last=now;if(state.mode!=='batteries'){if(!drag&&!popover&&!document.querySelector('dialog[open]'))tick(state,dt);updateDynamic();if(now-lastUI>150){updateReadings();lastUI=now;}}else if(batteryIndex===2&&!document.querySelector('dialog[open]')){if(leadPlaying&&leadProgress<1){leadProgress=Math.min(1,leadProgress+dt/LEAD_DURATION);if(leadProgress>=1){leadPlaying=false;syncLeadControls();}updateLeadVisuals($('#battery-room'),batteryProcess,leadProgress,leadPlaying);}}requestAnimationFrame(frame);}
render();requestAnimationFrame(frame);
const phoneLandscape=matchMedia('(max-width:899px) and (orientation:landscape)');
const focusPhoneOverview=()=>{if(phoneLandscape.matches&&sceneZoom===1&&state.mode!=='batteries')requestAnimationFrame(()=>$('#scene-viewport').scrollIntoView({block:'start'}));};
phoneLandscape.addEventListener('change',focusPhoneOverview);window.addEventListener('load',focusPhoneOverview,{once:true});
