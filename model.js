export const MODES={cell:'鋅銅電池',water:'電解水',copper:'電解硫酸銅',plate:'電鍍',batteries:'生活電池'};
export function initial(mode='cell') {return {mode,playing:true,speed:1,time:0,extent:0,gasTests:[null,null],wires:[['n','l'],['p','r']],observationPolarity:[-1,1],bridge:true,immersed:[true,true],electrodes:mode==='cell'?['Zn','Cu']:mode==='plate'?['Fe','Cu']:['C','C'],solution:mode==='water'?'NaOH':mode==='cell'?'paired':'CuSO4',power:true,view:'electron',prediction:null,challenge:{armed:false,broken:false,done:false},message:''};}
export function polarity(s) {return [0,1].map(i=>{const w=s.wires.find(w=>w.includes(i?'r':'l'));return w?.includes('n')?-1:w?.includes('p')?1:0;});}
export function conditions(s) {
 if(s.mode==='batteries')return '選一種電池，試著分類與回收。';
 if(s.wires.length!==2||polarity(s).includes(0))return '外電路未接通：點選兩個接點，或從接點拖曳接線。';
 if(!s.immersed.every(Boolean))return '電極未浸入溶液：把電極向下拖回液面內。';
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
 const gas=water?signs.map(p=>p<0?{name:'H₂',volume:20*s.extent}:{name:'O₂',volume:10*s.extent}):signs.map(p=>({name:p>0&&!cuAn&&!cell?'O₂':'',volume:p>0&&!cuAn&&!cell?10*s.extent:0}));
 let half=cell?['Zn → Zn²⁺ + 2e⁻','Cu²⁺ + 2e⁻ → Cu']:water?signs.map(p=>p<0?'2H₂O + 2e⁻ → H₂ + 2OH⁻':'4OH⁻ → O₂ + 2H₂O + 4e⁻'):signs.map(p=>p<0?'Cu²⁺ + 2e⁻ → Cu':cuAn?'Cu → Cu²⁺ + 2e⁻':'2H₂O → O₂ + 4H⁺ + 4e⁻');
 const chemistryKnown=cell?s.solution==='paired'&&s.electrodes[0]==='Zn'&&s.electrodes[1]==='Cu':water?s.solution==='NaOH'&&s.electrodes.every(e=>e==='C'):s.solution==='CuSO4'&&['C','Cu'].includes(s.electrodes[an]);
 return {reason,valid:!reason,active:!reason&&s.playing,chemistryKnown,signs,an,cat,cuAn,masses,concentration,gas,half,progress:s.extent,cell,water};
}
export function tick(s,dt) {if(snapshot(s).active){const delta=Math.min(dt,.1)*s.speed;s.time+=delta;s.extent=Math.min(1,s.extent+delta/60);}return snapshot(s);}
export function freshObservation(s,message='改裝後重新觀察：已清空先前產物與示意時間。') {s.time=0;s.extent=0;s.gasTests=[null,null];s.message=message;}
export function testCollectedGas(s,side){const q=snapshot(s);if(s.mode!=='water'||!q.chemistryKnown||![0,1].includes(side))return {ok:false,text:'條件不符，沒有可檢驗的氣體。'};const gas=q.gas[side];if(gas.volume<.1)return {ok:false,text:'尚未收集足量氣體：至少需要 0.10 mL 示意量，請先讓反應進行。'};return {ok:true,name:gas.name,volume:gas.volume,text:gas.name==='H₂'?'氫氣 H₂：虛擬檢驗出現爆鳴現象，顯示氫氣可燃。':'氧氣 O₂：虛擬檢驗顯示助燃，火焰更旺。'};}
export function connect(s,a,b){if(a===b)return false;const source=x=>['n','p'].includes(x);if(source(a)===source(b))return false;if(s.wires.some(w=>w.includes(a)||w.includes(b)))return false;s.wires.push([a,b]);const after=polarity(s);if(after.every(Boolean)){if(s.mode!=='cell'&&s.observationPolarity&&after.some((v,i)=>v!==s.observationPolarity[i]))freshObservation(s);s.observationPolarity=[...after];}return true;}
