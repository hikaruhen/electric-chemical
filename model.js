export const MODES={cell:'鋅銅電池',water:'電解水',copper:'電解硫酸銅',plate:'電鍍',batteries:'生活電池'};
export const CELL_SOLUTIONS=['ZnSO4','CuSO4','water'];
export const GEOMETRY={length:160,paintBottom:161,insertedY:290,removedY:130,minY:105,maxY:300};
export const GAS_TRAVEL_TIME=3;
export function cellSolutions(s){return Array.isArray(s.solutions)?s.solutions:(s.solution==='water'?['water','water']:['ZnSO4','CuSO4']);}
export function cellLocalExtents(s){return Array.isArray(s.localExtent)?s.localExtent:[0,0];}
export function electrodeSpec(s){return s.mode==='water'?{length:100,paintBottom:101,insertedY:350,removedY:60,minY:35,maxY:360}:GEOMETRY;}
export function liquidY(s){return s.mode==='cell'?332:323;}
export function electrodeGeometry(s,i){const spec=electrodeSpec(s),top=s.electrodeY[i],bottom=top+spec.paintBottom,surface=s.mode==='water'?207+s.collectedGas[i]*7:liquidY(s);return {top,bottom,surface,wetDepth:Math.max(0,bottom-surface),immersed:bottom>surface,gap:surface-bottom};}
export function setElectrodeY(s,i,y){const spec=electrodeSpec(s);let top=Math.max(spec.minY,Math.min(spec.maxY,y));const surface=electrodeGeometry(s,i).surface,gap=surface-(top+spec.paintBottom);if(gap>=0&&gap<18)top=surface-spec.paintBottom-18;s.electrodeY[i]=top;}
export function toggleElectrode(s,i){const spec=electrodeSpec(s);setElectrodeY(s,i,electrodeGeometry(s,i).immersed?spec.removedY:spec.insertedY);}
export function initial(mode='cell') {return {mode,playing:false,speed:1,time:0,extent:0,localExtent:[0,0],electrodeY:mode==='water'?[350,350]:[290,290],transportTime:0,gasPackets:[],gasBubbles:[],collectedGas:[0,0],nextGasGroup:1,gasTests:[null,null],wires:[['n','l'],['p','r']],observationPolarity:[-1,1],bridge:true,electrodes:mode==='cell'?['Zn','Cu']:mode==='plate'?['Fe','Cu']:['C','C'],solution:mode==='water'?'NaOH':mode==='cell'?'paired':'CuSO4',solutions:mode==='cell'?['ZnSO4','CuSO4']:null,power:true,view:'electron',message:''};}
export function polarity(s) {return [0,1].map(i=>{const w=s.wires.find(w=>w.includes(i?'r':'l'));return w?.includes('n')?-1:w?.includes('p')?1:0;});}
export function cellChemistry(s) {
 const [e0,e1]=s.electrodes,[sol0,sol1]=cellSolutions(s),locExt=cellLocalExtents(s);
 const localSides=[e0==='Zn'&&sol0==='CuSO4',e1==='Zn'&&sol1==='CuSO4'];
 const localEqual=Math.abs(locExt[0]-locExt[1])<1e-6;
 const symmetric=e0===e1&&sol0===sol1&&(!(localSides[0]&&localSides[1])||localEqual);
 if(e0==='Zn'&&sol0==='ZnSO4'&&e1==='Cu'&&sol1==='CuSO4')return {category:'G1',znSide:0,cuSide:1,signs:[-1,1],localSides,galvanicKnown:true,symmetricZero:false,reason:''};
 if(e0==='Cu'&&sol0==='CuSO4'&&e1==='Zn'&&sol1==='ZnSO4')return {category:'G1',znSide:1,cuSide:0,signs:[1,-1],localSides,galvanicKnown:true,symmetricZero:false,reason:''};
 if((e0==='Zn'&&sol0==='CuSO4'&&e1==='Cu'&&sol1==='CuSO4')||(e0==='Cu'&&sol0==='CuSO4'&&e1==='Zn'&&sol1==='CuSO4')){
  const sideName=localSides[0]?'左':'右';
  return {category:'M1',znSide:null,cuSide:null,signs:[0,0],localSides,galvanicKnown:false,symmetricZero:false,reason:`兩杯皆為硫酸銅：${sideName}杯鋅片直接與 Cu²⁺ 置換（僅示範杯內置換）；外電路與局部置換競爭，外電流未推算。`};
 }
 if(localSides[0]||localSides[1]){
  if(symmetric)return {category:'L1',znSide:null,cuSide:null,signs:[0,0],localSides,galvanicKnown:false,symmetricZero:true,reason:'雙杯皆為鋅片浸於硫酸銅：兩杯各自直接置換（不需外電路或鹽橋）；兩側狀態對稱，理想淨外電流為 0。'};
  if(localSides[0]&&localSides[1])return {category:'L1',znSide:null,cuSide:null,signs:[0,0],localSides,galvanicKnown:false,symmetricZero:false,reason:'雙杯皆為鋅片浸於硫酸銅：兩杯置換進度（濃度與表面析銅）已不同而不再對稱，外電路電流未在本模型推算。'};
  const sideName=localSides[0]?'左':'右';
  return {category:'L1',znSide:null,cuSide:null,signs:[0,0],localSides,galvanicKnown:false,symmetricZero:false,reason:`${sideName}杯鋅片直接與硫酸銅置換（僅示範杯內置換，不需外電路或鹽橋）；兩杯不對稱，外電路電流未在本模型推算。`};
 }
 if(symmetric){
  const waterNote=sol0==='water'?'且純水導電性極低':'';
  return {category:'Z0',znSide:null,cuSide:null,signs:[0,0],localSides,galvanicKnown:false,symmetricZero:true,reason:`兩側電極與溶液完全相同${waterNote}：理想對稱半電池，淨外電路電動勢為 0。`};
 }
 if(e0===e1){
  const hasCu=sol0==='CuSO4'||sol1==='CuSO4',hasWater=sol0==='water'||sol1==='water';
  const mech=hasCu&&e0==='Cu'?'可能涉及銅離子濃度電池等進階機制':'可能涉及濃度／活性差等進階機制';
  const waterNote=hasWater?'，且純水初期導電性極低':'';
  return {category:'C1',znSide:null,cuSide:null,signs:[0,0],localSides,galvanicKnown:false,symmetricZero:false,reason:`兩側為相同金屬但溶液不同（${mech}${waterNote}），外電路電流未在本模型推算。`};
 }
 const znInWater=(e0==='Zn'&&sol0==='water'&&e1==='Cu'&&sol1==='CuSO4')||(e1==='Zn'&&sol1==='water'&&e0==='Cu'&&sol0==='CuSO4');
 if(znInWater)return {category:'U1',znSide:null,cuSide:null,signs:[0,0],localSides,galvanicKnown:false,symmetricZero:false,reason:'鋅杯為純水而非教材硫酸鋅半電池：純水初期導電性極低，本教學尺度未推算微弱或暫態外電路電流。'};
 if(sol0==='water'||sol1==='water')return {category:'U1',znSide:null,cuSide:null,signs:[0,0],localSides,galvanicKnown:false,symmetricZero:false,reason:'含純水或缺少可還原的 Cu²⁺：純水導電性極低且非教材鋅銅電池條件，外電路電流未在本模型推算。'};
 return {category:'U1',znSide:null,cuSide:null,signs:[0,0],localSides,galvanicKnown:false,symmetricZero:false,reason:'銅杯缺少可還原的 Cu²⁺：非教材鋅銅電池標準配對，外電路電流未在本模型推算。'};
}
export function conditions(s) {
 if(s.mode==='batteries')return '選一種電池，試著分類與回收。';
 if(s.mode==='cell'){
  const chem=cellChemistry(s);
  if(!chem.galvanicKnown)return chem.reason;
  if(s.wires.length!==2||polarity(s).includes(0))return '外電路未接通：點選兩個接點，或從接點拖曳接線。';
  if(![0,1].every(i=>electrodeGeometry(s,i).immersed))return '電極未浸入溶液：把電極向下拖回液面內。';
  if(!s.bridge)return '缺少鹽橋：離子無法維持兩杯溶液電中性，持續電流停止。';
  if(s.extent>=1)return '銅離子已達本模型的耗盡界線；後續副反應未建模。請重設。';
  return '';
 }
 if(s.wires.length!==2||polarity(s).includes(0))return '外電路未接通：點選兩個接點，或從接點拖曳接線。';
 if(![0,1].every(i=>electrodeGeometry(s,i).immersed))return '電極未浸入溶液：把電極向下拖回液面內。';
 if(!s.power)return '直流電源已關閉：沒有持續的電解反應。';
 if(s.mode==='water'){
  if(s.solution!=='NaOH')return '純水導電性極低：在本觀察尺度不顯示可測產氣，加入氫氧化鈉助導電。';
  if(s.electrodes.some(e=>e!=='C'))return '本電解水模型限定惰性碳電極；其他電極的副反應未建模。';
 }else{
  if(s.solution!=='CuSO4')return '缺少硫酸銅溶液：沒有本模型所需的銅離子，不推算其他反應。';
  const signs=polarity(s);const an=s.electrodes[signs.indexOf(1)];
  if(!['Cu','C'].includes(an))return '正極不是本模型支援的銅或碳；鐵的溶解等副反應未建模，請改接。';
 }
 if(s.extent>=1)return s.mode!=='water'&&s.electrodes[polarity(s).indexOf(1)]==='C'?'銅離子已達本模型的耗盡界線；後續副反應未建模。請重設。':'本次示意觀察已完成，請重設再試。';
 return '';
}
export function snapshot(s) {
 const connected=polarity(s),reason=conditions(s),cell=s.mode==='cell',water=s.mode==='water';
 const chem=cell?cellChemistry(s):null;
 const signs=cell?chem.signs:connected.every(Boolean)?connected:s.observationPolarity||[-1,1];
 const an=cell?(chem.znSide??-1):signs.indexOf(1),cat=cell?(chem.cuSide??-1):signs.indexOf(-1);
 const cuAn=!cell&&!water&&s.electrodes[an]==='Cu';
 const [solL,solR]=cell?cellSolutions(s):[null,null];
 const locExt=cell?cellLocalExtents(s):[0,0];
 const local=[0,1].map(side=>{
  const enabled=cell&&chem.localSides[side],ext=enabled?locExt[side]:0,mol=ext*.005;
  const immersed=electrodeGeometry(s,side).immersed,depleted=enabled&&ext>=1,ready=enabled&&immersed&&!depleted;
  return {enabled,immersed,depleted,ready,active:ready&&s.playing,extent:ext,mol,znDissolvedMass:-mol*65.38,cuDepositedMass:mol*63.546,netMass:mol*(63.546-65.38),concentration:enabled?.1*(1-ext):null};
 });
 const circuitClosed=s.wires.length===2&&!connected.includes(0)&&electrodeGeometry(s,0).immersed&&electrodeGeometry(s,1).immersed&&(cell?s.bridge:s.power);
 let meterMode=null,needleX2=null;
 if(cell){
  if(!circuitClosed||chem.symmetricZero){meterMode='zero';needleX2=410;}
  else if(chem.galvanicKnown){
   if(!reason&&(s.playing||s.time>0)){meterMode='deflected';needleX2=connected[chem.znSide]<0?436:384;}
   else{meterMode='zero';needleX2=410;}
  }else{meterMode='unknown';needleX2=null;}
 }
 // One extent is 0.005 mol Cu for the cell, 0.03 mol Cu for CuSO4 baths.
 const mol=s.extent*(cell?.005:.03),cuMass=mol*63.546;
 const masses=cell?(chem.galvanicKnown?[0,1].map(i=>i===chem.znSide?-mol*65.38:cuMass):[0,0]):water?[0,0]:signs.map(p=>p<0?cuMass:cuAn?-cuMass:0);
 const concentration=cell?(chem.galvanicKnown?.1*(1-s.extent):null):water?null:cuAn?.2:.2*(1-s.extent);
 const gas=water?signs.map((p,i)=>({name:p<0?'H₂':'O₂',volume:s.collectedGas[i]})):signs.map(p=>({name:p>0&&!cuAn&&!cell?'O₂':'',volume:0}));
 const half=cell?(chem.galvanicKnown?[0,1].map(i=>i===chem.znSide?'Zn → Zn²⁺ + 2e⁻':'Cu²⁺ + 2e⁻ → Cu'):['','']):water?signs.map(p=>p<0?'2H₂O + 2e⁻ → H₂ + 2OH⁻':'4OH⁻ → O₂ + 2H₂O + 4e⁻'):signs.map(p=>p<0?'Cu²⁺ + 2e⁻ → Cu':cuAn?'Cu → Cu²⁺ + 2e⁻':'2H₂O → O₂ + 4H⁺ + 4e⁻');
 const chemistryKnown=cell?chem.galvanicKnown:water?s.solution==='NaOH'&&s.electrodes.every(e=>e==='C'):s.solution==='CuSO4'&&['C','Cu'].includes(s.electrodes[an]);
 const localActive=local.map(l=>l.active),hasLocal=local.some(l=>l.enabled);
 return {reason,valid:!reason,active:!reason&&s.playing,chemistryKnown,signs,an,cat,znSide:cell?chem.znSide:null,cuSide:cell?chem.cuSide:null,category:cell?chem.category:null,symmetricZero:cell?chem.symmetricZero:false,circuitClosed,meterMode,needleX2,local,localActive,hasLocal,anyActive:(!reason&&s.playing)||localActive.some(Boolean),cuAn,masses,concentration,gas,half,progress:s.extent,cell,water,solutions:cell?[solL,solR]:null,inFlight:s.gasPackets.some(p=>!p.delivered)||s.gasBubbles.some(b=>s.transportTime-b.born<GAS_TRAVEL_TIME)};
}
export function tick(s,dt) {
 const q=snapshot(s);if(!s.playing)return q;
 const delta=Math.min(dt,.1)*s.speed;
 if(q.active||q.inFlight)s.transportTime+=delta;
 if(q.active){const before=s.extent;s.extent=Math.min(1,s.extent+delta/60);s.time+=60*(s.extent-before);
  if(q.water){s.gasPackets.push({born:s.transportTime,oxygen:10*(s.extent-before),cat:q.cat,delivered:false});
   while(s.time>=s.nextGasGroup*.75){for(let side=0;side<2;side++){const count=q.signs[side]<0?2:1;for(let n=0;n<count;n++)s.gasBubbles.push({id:`gas-${s.nextGasGroup}-${side}-${n}`,born:s.transportTime+n*.18,side,offset:0,originY:Math.max(liquidY(s)+3,Math.min(electrodeGeometry(s,side).bottom-7,s.electrodeY[side]+112))});}s.nextGasGroup++;}
  }
  else if(!q.cell&&!q.cuAn){while(s.time>=s.nextGasGroup*.9){s.gasBubbles.push({id:`oxygen-${s.nextGasGroup}`,born:s.transportTime,side:q.an,offset:0,purpose:'oxygen',originY:Math.min(electrodeGeometry(s,q.an).bottom-7,s.electrodeY[q.an]+112)});s.nextGasGroup++;}}
 }else if(q.cell&&q.localActive.some(Boolean)){
  if(!Array.isArray(s.localExtent))s.localExtent=[0,0];
  let maxAdv=0;
  for(let side=0;side<2;side++){
   if(!q.localActive[side])continue;
   const before=s.localExtent[side];
   s.localExtent[side]=Math.min(1,before+delta/60);
   maxAdv=Math.max(maxAdv,s.localExtent[side]-before);
  }
  s.time+=60*maxAdv;
 }
 for(const p of s.gasPackets)if(!p.delivered&&s.transportTime-p.born>=GAS_TRAVEL_TIME){s.collectedGas[p.cat]+=2*p.oxygen;s.collectedGas[1-p.cat]+=p.oxygen;p.delivered=true;}
 return snapshot(s);
}
export function freshObservation(s,message='改裝後重新觀察：已清空先前產物與示意時間，請按「▶ 播放」開始。') {s.playing=false;s.time=0;s.extent=0;s.localExtent=[0,0];s.transportTime=0;s.gasPackets=[];s.gasBubbles=[];s.collectedGas=[0,0];s.nextGasGroup=1;s.gasTests=[null,null];s.message=message;}
export function testCollectedGas(s,side){const q=snapshot(s);if(s.mode!=='water'||!q.chemistryKnown||![0,1].includes(side))return {ok:false,text:'條件不符，沒有可檢驗的氣體。'};const gas=q.gas[side];if(gas.volume<.1)return {ok:false,text:'尚未收集足量氣體：至少需要 0.10 mL 示意量，請先讓反應進行。'};return {ok:true,name:gas.name,volume:gas.volume,text:gas.name==='H₂'?'氫氣 H₂：虛擬檢驗出現爆鳴現象，顯示氫氣可燃。':'氧氣 O₂：虛擬檢驗顯示助燃，火焰更旺。'};}
export function connect(s,a,b){if(a===b)return false;const source=x=>['n','p'].includes(x);if(source(a)===source(b))return false;if(s.wires.some(w=>w.includes(a)||w.includes(b)))return false;s.wires.push([a,b]);const after=polarity(s);if(after.every(Boolean)){if(s.mode!=='cell'&&s.observationPolarity&&after.some((v,i)=>v!==s.observationPolarity[i]))freshObservation(s);s.observationPolarity=[...after];}return true;}

const clamp=x=>Math.max(0,Math.min(1,x));
export function microParticles(s){
 const q=snapshot(s),p=s.extent,t=s.time,out=[];
 const add=(id,species,x,y,kind='spectator',opacity=1)=>out.push({id,species,x,y,kind,opacity});
 // In cell mode, each beaker always reflects its true selected solution (CuSO4 / ZnSO4 / water) and independent local displacement
 if(q.cell&&!q.chemistryKnown){
  const sols=cellSolutions(s);
  for(let side=0;side<2;side++){
   const sol=sols[side];
   if(sol==='water')continue;
   const so4X=side?530:300,catX=side?650:170;
   for(let i=0;i<3;i++)add(`sulfate-${side}-${i}`,'SO₄²⁻',so4X+4*Math.sin(t*.22+i*1.7),355+i*35+2*Math.cos(t*.25+i));
   if(q.local[side].enabled){
    const lp=q.local[side].extent,elX=side?570:250,edge=elX+(side?18:-18);
    for(let i=0;i<4;i++){const end=(i+1)/4,progress=clamp(lp/end),metal=lp>=end;const y=metal?s.electrodeY[side]+63+i*32:353+i*32;add(`local-cu-${side}-${i}`,metal?'Cu':'Cu²⁺',metal?edge:catX+(edge-catX)*progress,y,metal?'metal':'reactant');}
    for(let i=0;i<4;i++){const age=lp-(i+1)/4;if(age<0)continue;const progress=clamp(age/.18),znX=side?587+46*progress:233-46*progress;add(`local-zn-${side}-${i}`,'Zn²⁺',znX,365+i*28,'product',clamp(age/.015));}
   }else if(sol==='CuSO4'){for(let i=0;i<4;i++)add(`cup-cu-${side}-${i}`,'Cu²⁺',catX,353+i*32);}
   else if(sol==='ZnSO4'){add(`cup-zn-${side}-0`,'Zn²⁺',side?642:164,376);add(`cup-zn-${side}-1`,'Zn²⁺',side?642:164,418);}
  }
  return out;
 }
 if(!q.chemistryKnown)return out;
 // Spectators never wrap, respawn or disappear when a reaction completes.
 if(q.water){for(let i=0;i<4;i++){const x=q.cat===0?170:650;add('na-'+i,'Na⁺',x+4*Math.sin(t*.31+i),351+i*31+2*Math.cos(t*.27+i));const ox=q.an===0?170:650;add('background-oh-'+i,'OH⁻',ox+4*Math.sin(t*.28+i),351+i*31+2*Math.cos(t*.24+i),'electrolyte');}
  for(let i=0;i<16;i++){const birth=(i-1)*.05,age=(p-birth)/.12;if(age<0)continue;const progress=clamp(age),start=q.cat===0?274:546,end=q.an===0?274:546,level=365+i%3*31;let x,y;if(progress<.25){x=start;y=level+(455-level)*progress*4;}else if(progress<.75){x=start+(end-start)*(progress-.25)*2;y=455;}else{x=end;y=455+(level-455)*(progress-.75)*4;}add('oh-'+i,'OH⁻',x,y,'reactant',1-clamp((progress-.88)/.12));}
 }else{
  const sides=q.cell?[0,1]:[0];for(const side of sides)for(let i=0;i<3;i++){const base=q.cell?(side?530:300):(q.an===0?205:615);add(`sulfate-${side}-${i}`,'SO₄²⁻',base+4*Math.sin(t*.22+i*1.7),355+i*35+2*Math.cos(t*.25+i));}
  const cat=q.cell?q.cuSide:q.cat,x=cat?570:250,edge=x+(cat?18:-18),start=cat?650:170;
  for(let i=0;i<4;i++){const end=(i+1)/4,progress=clamp(p/end),metal=p>=end;const y=metal?s.electrodeY[cat]+63+i*32:353+i*32;add('copper-'+i,metal?'Cu':'Cu²⁺',metal?edge:start+(edge-start)*progress,y,metal?'metal':'reactant');}
  if(q.cell){
   const zn=q.znSide,initZnX=zn?656:164;
   add('initial-zn-0','Zn²⁺',initZnX+4*Math.sin(t*.2),390);
   for(let i=0;i<4;i++){const age=p-(i+1)/4;if(age<0)continue;const progress=clamp(age/.18),znX=zn?587+38*progress:233-38*progress;add('zinc-'+i,'Zn²⁺',znX,353+i*32,'product',clamp(age/.015));}
  }else{for(let i=0;i<4;i++){const age=p-(i+1)/4;if(age<0)continue;const progress=clamp(age/.18),an=q.an,startX=an?551:269,endX=an?480:340;add((q.cuAn?'anode-cu-':'acid-')+i,q.cuAn?'Cu²⁺':'2H⁺',startX+(endX-startX)*progress,353+i*32,'product',clamp(age/.015));}}
 }
 return out;
}
