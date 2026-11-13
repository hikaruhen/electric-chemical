export const MODES={cell:'鋅銅電池',water:'電解水',copper:'電解硫酸銅',plate:'電鍍',batteries:'生活電池'};
export const GEOMETRY={length:160,paintBottom:161,insertedY:290,removedY:130,minY:105,maxY:300};
export const GAS_TRAVEL_TIME=3;
export function electrodeSpec(s){return s.mode==='water'?{length:100,paintBottom:101,insertedY:350,removedY:60,minY:35,maxY:360}:GEOMETRY;}
export function liquidY(s){return s.mode==='cell'?332:323;}
export function electrodeGeometry(s,i){const spec=electrodeSpec(s),top=s.electrodeY[i],bottom=top+spec.paintBottom,surface=s.mode==='water'?207+s.collectedGas[i]*7:liquidY(s);return {top,bottom,surface,wetDepth:Math.max(0,bottom-surface),immersed:bottom>surface,gap:surface-bottom};}
export function setElectrodeY(s,i,y){const spec=electrodeSpec(s);let top=Math.max(spec.minY,Math.min(spec.maxY,y));const surface=electrodeGeometry(s,i).surface,gap=surface-(top+spec.paintBottom);if(gap>=0&&gap<18)top=surface-spec.paintBottom-18;s.electrodeY[i]=top;}
export function toggleElectrode(s,i){const spec=electrodeSpec(s);setElectrodeY(s,i,electrodeGeometry(s,i).immersed?spec.removedY:spec.insertedY);}
export function initial(mode='cell') {return {mode,playing:true,speed:1,time:0,extent:0,electrodeY:mode==='water'?[350,350]:[290,290],transportTime:0,gasPackets:[],gasBubbles:[],collectedGas:[0,0],nextGasGroup:1,gasTests:[null,null],wires:[['n','l'],['p','r']],observationPolarity:[-1,1],bridge:true,electrodes:mode==='cell'?['Zn','Cu']:mode==='plate'?['Fe','Cu']:['C','C'],solution:mode==='water'?'NaOH':mode==='cell'?'paired':'CuSO4',power:true,view:'electron',prediction:null,challenge:{armed:false,broken:false,done:false},message:''};}
export function polarity(s) {return [0,1].map(i=>{const w=s.wires.find(w=>w.includes(i?'r':'l'));return w?.includes('n')?-1:w?.includes('p')?1:0;});}
export function conditions(s) {
 if(s.mode==='batteries')return '選一種電池，試著分類與回收。';
 if(s.wires.length!==2||polarity(s).includes(0))return '外電路未接通：點選兩個接點，或從接點拖曳接線。';
 if(![0,1].every(i=>electrodeGeometry(s,i).immersed))return '電極未浸入溶液：把電極向下拖回液面內。';
 if(s.mode==='cell'){
  if(!s.bridge)return '缺少鹽橋：離子無法維持兩杯溶液電中性，持續電流停止。';
  if(s.solution!=='paired')return '本模型需左杯硫酸鋅、右杯硫酸銅；未指定的反應不推算。';
  if(s.electrodes[0]!=='Zn'||s.electrodes[1]!=='Cu')return s.electrodes[0]===s.electrodes[1]?'相同金屬不構成本教材的鋅銅電池。':'電極與指定溶液不匹配；本教材模型不推算這個反應。';
 }else{
  if(!s.power)return '直流電源已關閉：沒有持續的電解反應。';
  if(s.mode==='water'){
   if(s.solution!=='NaOH')return '純水導電性極低：在本觀察尺度不顯示可測產氣，加入氫氧化鈉助導電。';
   if(s.electrodes.some(e=>e!=='C'))return '本電解水模型限定惰性碳電極；其他電極的副反應未建模。';
  }else{
   if(s.solution!=='CuSO4')return '缺少硫酸銅溶液：沒有本模型所需的銅離子，不推算其他反應。';
   const signs=polarity(s);const an=s.electrodes[signs.indexOf(1)];
   if(!['Cu','C'].includes(an))return '正極不是本模型支援的銅或碳；鐵的溶解等副反應未建模，請改接。';
  }
 }
 if(s.extent>=1)return s.mode!=='water'&&(s.mode==='cell'||s.electrodes[polarity(s).indexOf(1)]==='C')?'銅離子已達本模型的耗盡界線；後續副反應未建模。請重設。':'本次示意觀察已完成，請重設再試。';
 return '';
}
export function snapshot(s) {
 const connected=polarity(s),reason=conditions(s),signs=s.mode==='cell'?[-1,1]:connected.every(Boolean)?connected:s.observationPolarity||[-1,1],an=signs.indexOf(1),cat=signs.indexOf(-1);
 const cell=s.mode==='cell',water=s.mode==='water',cuAn=!cell&&!water&&s.electrodes[an]==='Cu';
 // One extent is 0.005 mol Cu for the cell, 0.03 mol Cu for CuSO4 baths.
 const mol=s.extent*(cell?.005:.03),cuMass=mol*63.546;
 const masses=cell?[-mol*65.38,cuMass]:water?[0,0]:signs.map(p=>p<0?cuMass:cuAn?-cuMass:0);
 const concentration=cell?.1*(1-s.extent):water?null:cuAn?.2:.2*(1-s.extent);
 const gas=water?signs.map((p,i)=>({name:p<0?'H₂':'O₂',volume:s.collectedGas[i]})):signs.map(p=>({name:p>0&&!cuAn&&!cell?'O₂':'',volume:0}));
 let half=cell?['Zn → Zn²⁺ + 2e⁻','Cu²⁺ + 2e⁻ → Cu']:water?signs.map(p=>p<0?'2H₂O + 2e⁻ → H₂ + 2OH⁻':'4OH⁻ → O₂ + 2H₂O + 4e⁻'):signs.map(p=>p<0?'Cu²⁺ + 2e⁻ → Cu':cuAn?'Cu → Cu²⁺ + 2e⁻':'2H₂O → O₂ + 4H⁺ + 4e⁻');
 const chemistryKnown=cell?s.solution==='paired'&&s.electrodes[0]==='Zn'&&s.electrodes[1]==='Cu':water?s.solution==='NaOH'&&s.electrodes.every(e=>e==='C'):s.solution==='CuSO4'&&['C','Cu'].includes(s.electrodes[an]);
 return {reason,valid:!reason,active:!reason&&s.playing,chemistryKnown,signs,an,cat,cuAn,masses,concentration,gas,half,progress:s.extent,cell,water,inFlight:s.gasPackets.some(p=>!p.delivered)||s.gasBubbles.some(b=>s.transportTime-b.born<GAS_TRAVEL_TIME)};
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
 }
 for(const p of s.gasPackets)if(!p.delivered&&s.transportTime-p.born>=GAS_TRAVEL_TIME){s.collectedGas[p.cat]+=2*p.oxygen;s.collectedGas[1-p.cat]+=p.oxygen;p.delivered=true;}
 return snapshot(s);
}
export function freshObservation(s,message='改裝後重新觀察：已清空先前產物與示意時間。') {s.time=0;s.extent=0;s.transportTime=0;s.gasPackets=[];s.gasBubbles=[];s.collectedGas=[0,0];s.nextGasGroup=1;s.gasTests=[null,null];s.message=message;}
export function testCollectedGas(s,side){const q=snapshot(s);if(s.mode!=='water'||!q.chemistryKnown||![0,1].includes(side))return {ok:false,text:'條件不符，沒有可檢驗的氣體。'};const gas=q.gas[side];if(gas.volume<.1)return {ok:false,text:'尚未收集足量氣體：至少需要 0.10 mL 示意量，請先讓反應進行。'};return {ok:true,name:gas.name,volume:gas.volume,text:gas.name==='H₂'?'氫氣 H₂：虛擬檢驗出現爆鳴現象，顯示氫氣可燃。':'氧氣 O₂：虛擬檢驗顯示助燃，火焰更旺。'};}
export function connect(s,a,b){if(a===b)return false;const source=x=>['n','p'].includes(x);if(source(a)===source(b))return false;if(s.wires.some(w=>w.includes(a)||w.includes(b)))return false;s.wires.push([a,b]);const after=polarity(s);if(after.every(Boolean)){if(s.mode!=='cell'&&s.observationPolarity&&after.some((v,i)=>v!==s.observationPolarity[i]))freshObservation(s);s.observationPolarity=[...after];}return true;}

const clamp=x=>Math.max(0,Math.min(1,x));
export function microParticles(s){
 const q=snapshot(s),p=s.extent,t=s.time,out=[];
 if(!q.chemistryKnown)return out;
 const add=(id,species,x,y,kind='spectator',opacity=1)=>out.push({id,species,x,y,kind,opacity});
 // Spectators never wrap, respawn or disappear when a reaction completes.
 if(q.water){for(let i=0;i<4;i++){const x=q.cat===0?170:650;add('na-'+i,'Na⁺',x+4*Math.sin(t*.31+i),351+i*31+2*Math.cos(t*.27+i));const ox=q.an===0?170:650;add('background-oh-'+i,'OH⁻',ox+4*Math.sin(t*.28+i),351+i*31+2*Math.cos(t*.24+i),'electrolyte');}
  for(let i=0;i<16;i++){const birth=(i-1)*.05,age=(p-birth)/.12;if(age<0)continue;const progress=clamp(age),start=q.cat===0?274:546,end=q.an===0?274:546,level=365+i%3*31;let x,y;if(progress<.25){x=start;y=level+(455-level)*progress*4;}else if(progress<.75){x=start+(end-start)*(progress-.25)*2;y=455;}else{x=end;y=455+(level-455)*(progress-.75)*4;}add('oh-'+i,'OH⁻',x,y,'reactant',1-clamp((progress-.88)/.12));}
 }else{
  const sides=q.cell?[0,1]:[0];for(const side of sides)for(let i=0;i<3;i++){const base=q.cell?(side?530:300):(q.an===0?205:615);add(`sulfate-${side}-${i}`,'SO₄²⁻',base+4*Math.sin(t*.22+i*1.7),355+i*35+2*Math.cos(t*.25+i));}
  const cat=q.cell?1:q.cat,x=cat?570:250,edge=x+(cat?18:-18),start=cat?650:170;
  for(let i=0;i<4;i++){const end=(i+1)/4,progress=clamp(p/end),metal=p>=end;const y=metal?s.electrodeY[cat]+63+i*32:353+i*32;add('copper-'+i,metal?'Cu':'Cu²⁺',metal?edge:start+(edge-start)*progress,y,metal?'metal':'reactant');}
  if(q.cell){add('initial-zn-0','Zn²⁺',164+4*Math.sin(t*.2),390);
   for(let i=0;i<4;i++){const age=p-(i+1)/4;if(age<0)continue;const progress=clamp(age/.18);add('zinc-'+i,'Zn²⁺',233-38*progress,353+i*32,'product',clamp(age/.015));}
  }else{for(let i=0;i<4;i++){const age=p-(i+1)/4;if(age<0)continue;const progress=clamp(age/.18),an=q.an,startX=an?551:269,endX=an?480:340;add((q.cuAn?'anode-cu-':'acid-')+i,q.cuAn?'Cu²⁺':'2H⁺',startX+(endX-startX)*progress,353+i*32,'product',clamp(age/.015));}}
 }
 return out;
}
