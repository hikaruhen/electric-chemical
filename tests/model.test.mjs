import test from 'node:test';
import assert from 'node:assert/strict';
import {initial,snapshot,tick,connect,polarity,freshObservation,testCollectedGas,electrodeGeometry,setElectrodeY,toggleElectrode,microParticles,CELL_SOLUTIONS,cellSolutions,cellChemistry} from '../model.js';
import {BATTERY_REACTIONS,batteryReaction} from '../battery-structure.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const run=(s,seconds)=>{for(let i=0;i<seconds*10;i++)tick(s,.1);};
test('all lab modes default paused with zero progress until playing, and freshObservation resets to paused',()=>{for(const mode of ['cell','water','copper','plate']){const s=initial(mode);assert.equal(s.playing,false);assert.equal(snapshot(s).active,false);const before=JSON.stringify(s);run(s,5);assert.equal(JSON.stringify(s),before);s.playing=true;run(s,2);assert.ok(s.time>0&&s.extent>0);freshObservation(s);assert.equal(s.playing,false);const afterReset=JSON.stringify(s);run(s,2);assert.equal(JSON.stringify(s),afterReset);}});
test('independent Zn/Cu stoichiometry, concentration and masses',()=>{const s=initial();s.extent=.4;const q=snapshot(s);near(q.masses[0],-.002*65.38);near(q.masses[1],.002*63.546);near(q.concentration,.06);});
test('all materials: removed geometry has clear gap, immersion is derived from painted bottom',()=>{for(const mode of ['cell','water','copper','plate'])for(let side=0;side<2;side++){const s=initial(mode);s.playing=true;assert.ok(electrodeGeometry(s,side).immersed);assert.equal(snapshot(s).active,true);toggleElectrode(s,side);const g=electrodeGeometry(s,side);assert.ok(g.gap>=18);assert.equal(g.immersed,false);assert.equal(snapshot(s).active,false);setElectrodeY(s,side,g.surface-162);assert.ok(electrodeGeometry(s,side).gap>=18);toggleElectrode(s,side);assert.equal(electrodeGeometry(s,side).immersed,true);}});
test('wires, salt bridge, material and geometry are necessary for external galvanic progress, with no false external extent',()=>{for(const setup of [s=>s.bridge=false,s=>s.wires.pop(),s=>setElectrodeY(s,0,130),s=>s.electrodes[1]='Zn']){const s=initial();s.playing=true;setup(s);assert.equal(snapshot(s).active,false);tick(s,.1);near(s.extent,0);}});
test('pause freezes model and transport; speed scales progress',()=>{const s=initial('water');s.playing=true;run(s,2);s.playing=false;const before=JSON.stringify(s);run(s,2);assert.equal(JSON.stringify(s),before);s.playing=true;s.speed=4;const time=s.time;tick(s,.1);near(s.time-time,.4);});
test('water collection lags formation; all gas arrives at 20:10 after reaction',()=>{const s=initial('water');s.playing=true;run(s,2);near(snapshot(s).gas[0].volume,0);assert.ok(s.gasBubbles.length>0);run(s,63);const q=snapshot(s);near(q.gas[0].volume,20);near(q.gas[1].volume,10);assert.equal(q.inFlight,false);assert.equal(q.active,false);});
test('cutting power stops formation but pre-existing bubbles finish collecting',()=>{const s=initial('water');s.playing=true;run(s,4);s.power=false;const time=s.time,packets=s.gasPackets.length,gas=s.collectedGas[0];run(s,4);near(s.time,time);assert.equal(s.gasPackets.length,packets);assert.ok(s.collectedGas[0]>gas);near(s.collectedGas[0],s.collectedGas[1]*2);});
test('manual polarity reversal clears old collection and tests; new H2 follows cathode',()=>{const s=initial('water');s.playing=true;run(s,5);s.gasTests[0]=testCollectedGas(s,0);assert.match(s.gasTests[0].text,/氫氣.*爆鳴/);s.wires=[];connect(s,'n','r');connect(s,'p','l');assert.equal(s.playing,false);assert.deepEqual(polarity(s),[1,-1]);assert.deepEqual(s.collectedGas,[0,0]);assert.deepEqual(s.gasTests,[null,null]);assert.equal(testCollectedGas(s,0).ok,false);s.playing=true;run(s,5);assert.match(testCollectedGas(s,0).text,/氧氣/);assert.match(testCollectedGas(s,1).text,/氫氣/);s.solution='water';assert.equal(testCollectedGas(s,0).ok,false);});
test('copper vs carbon anode independently conserves Cu and changes bath concentration',()=>{const s=initial('copper');s.extent=.5;let q=snapshot(s);near(q.concentration,.1);near(q.masses[0],.015*63.546);near(q.masses[1],0);s.electrodes[1]='Cu';q=snapshot(s);near(q.concentration,.2);near(q.masses[0]+q.masses[1],0);assert.equal(q.gas[1].name,'');});
test('disconnect preserves mass / concentration; iron anode is unsupported',()=>{const s=initial('plate');s.playing=true;s.extent=.3;const before=snapshot(s);s.wires=[];tick(s,.1);assert.deepEqual(snapshot(s).masses,before.masses);near(snapshot(s).concentration,.2);freshObservation(s);assert.equal(s.playing,false);connect(s,'n','r');connect(s,'p','l');assert.match(snapshot(s).reason,/副反應未建模/);});
test('same Cu ion reaches the interface and becomes Cu without a spatial jump',()=>{for(const mirrored of [false,true]){const s=initial();if(mirrored){s.electrodes=['Cu','Zn'];s.solutions=['CuSO4','ZnSO4'];}s.extent=.24999;const a=microParticles(s).find(p=>p.id==='copper-0');s.extent=.25001;const b=microParticles(s).find(p=>p.id==='copper-0');assert.equal(a.species,'Cu²⁺');assert.equal(b.species,'Cu');assert.ok(Math.hypot(b.x-a.x,b.y-a.y)<.02);}});
test('spectators remain, including OH-/Na+ at completed water run and reverse polarity',()=>{for(const reverse of [false,true]){const s=initial('water');if(reverse){s.wires=[];connect(s,'n','r');connect(s,'p','l');}s.playing=true;run(s,64);const p=microParticles(s).filter(p=>p.opacity>.1);assert.ok(p.some(p=>p.species==='Na⁺'));assert.ok(p.some(p=>p.species==='OH⁻'));assert.ok(!p.some(p=>p.species==='Na'));}const s=initial('copper');s.extent=1;assert.ok(microParticles(s).some(p=>p.species==='SO₄²⁻'));});
function sum(terms){const result={charge:0};for(const t of terms){const [raw,z]=t.formula.split('^');const charge=z?(z.startsWith('2')?2:1)*(z.endsWith('-')?-1:1):0;result.charge+=charge*t.count;if(raw==='e')continue;for(const m of raw.matchAll(/([A-Z][a-z]?)(\d*)/g))result[m[1]]=(result[m[1]]||0)+Number(m[2]||1)*t.count;}return result;}
test('all displayed battery half and overall reactions balance atoms and charge',()=>{for(const r of BATTERY_REACTIONS)for(const eq of Object.values(r))assert.deepEqual(sum(eq.left),sum(eq.right));for(const [key,eq] of Object.entries(batteryReaction(2,'charge'))){assert.deepEqual(sum(eq.left),sum(eq.right));assert.deepEqual(eq.left,BATTERY_REACTIONS[2][key].right);}});
test('cell 3x3 independent beaker solutions: true per-cup species, honest reasons, external vs local separation, pause/preserve',()=>{
 for(const solL of CELL_SOLUTIONS){
  for(const solR of CELL_SOLUTIONS){
   const s=initial('cell');
   s.solutions=[solL,solR];
   s.playing=true;
   const q=snapshot(s);
   const isStd=solL==='ZnSO4'&&solR==='CuSO4';
   const isLocalL=solL==='CuSO4';
   assert.equal(q.chemistryKnown,isStd,`chemistryKnown ${solL}/${solR}`);
   assert.equal(q.valid,isStd,`valid ${solL}/${solR}`);
   assert.equal(q.active,isStd,`active ${solL}/${solR}`);
   assert.equal(q.local[0].enabled,isLocalL,`local0 ${solL}/${solR}`);
   assert.equal(q.local[1].enabled,false,`local1 ${solL}/${solR}`);
   const mp=microParticles(s);
   const leftSp=new Set(mp.filter(p=>p.x<410).map(p=>p.species));
   const rightSp=new Set(mp.filter(p=>p.x>410).map(p=>p.species));
   for(const [sol,sp] of [[solL,leftSp],[solR,rightSp]]){
    if(sol==='CuSO4'){assert.ok(sp.has('Cu²⁺')&&sp.has('SO₄²⁻')&&!sp.has('Zn²⁺'),`CuSO4 initial species ${[...sp]}`);}
    else if(sol==='ZnSO4'){assert.ok(sp.has('Zn²⁺')&&sp.has('SO₄²⁻')&&!sp.has('Cu²⁺'),`ZnSO4 species ${[...sp]}`);}
    else{assert.equal(sp.size,0,`water must have zero solute ions, got ${[...sp]}`);}
   }
   run(s,2);
   if(isStd){assert.ok(s.time>0&&s.extent>0);near(s.localExtent[0],0);near(s.localExtent[1],0);}
   else if(isLocalL){
    near(s.extent,0);
    assert.ok(s.localExtent[0]>0&&s.time>0);
    near(s.localExtent[1],0);
    assert.equal(snapshot(s).meterMode,'unknown');
    assert.match(q.reason,/置換/);
   }else{
    near(s.time,0);near(s.extent,0);near(s.localExtent[0],0);near(s.localExtent[1],0);
    assert.ok(q.reason.length>0);
    assert.doesNotMatch(q.reason,/沒有任何反應/);
    assert.equal(q.meterMode,'unknown');
   }
  }
 }
 // Independent cup change, fresh pause vs same-cup preservation, reset
 const s=initial('cell');
 assert.deepEqual(cellSolutions(s),['ZnSO4','CuSO4']);
 assert.equal(s.playing,false);
 s.playing=true;run(s,2);
 const tBefore=s.time,eBefore=s.extent;
 assert.equal(s.solutions[0],'ZnSO4');
 assert.equal(s.time,tBefore);assert.equal(s.extent,eBefore);assert.equal(s.playing,true);
 s.solutions[0]='water';freshObservation(s);
 assert.deepEqual(s.solutions,['water','CuSO4']);
 assert.deepEqual(s.electrodes,['Zn','Cu']);
 assert.equal(s.bridge,true);assert.equal(s.wires.length,2);
 assert.equal(s.playing,false);near(s.time,0);near(s.extent,0);assert.deepEqual(s.localExtent,[0,0]);
 const r=initial('cell');
 assert.deepEqual(r.solutions,['ZnSO4','CuSO4']);assert.equal(r.playing,false);
});
test('all 36 cell material x solution combinations classify accurately (G1=2, M1=2, L1=9, C1=8, Z0=5, U1=10)',()=>{
 const counts={G1:0,M1:0,L1:0,C1:0,Z0:0,U1:0};
 const metals=['Zn','Cu'];
 for(const e0 of metals)for(const e1 of metals)for(const sol0 of CELL_SOLUTIONS)for(const sol1 of CELL_SOLUTIONS){
  const s=initial('cell');
  s.electrodes=[e0,e1];s.solutions=[sol0,sol1];
  const chem=cellChemistry(s);
  counts[chem.category]++;
  assert.deepEqual(chem.localSides,[e0==='Zn'&&sol0==='CuSO4',e1==='Zn'&&sol1==='CuSO4']);
  if(chem.category==='G1'){
   assert.equal(chem.galvanicKnown,true);
   assert.equal(chem.znSide,e0==='Zn'?0:1);
   assert.equal(chem.cuSide,e0==='Cu'?0:1);
   assert.equal(chem.signs[chem.znSide],-1);
   assert.equal(chem.signs[chem.cuSide],1);
   assert.equal(chem.reason,'');
  }else{
   assert.equal(chem.galvanicKnown,false);
   assert.equal(chem.znSide,null);
   assert.equal(chem.cuSide,null);
   assert.ok(chem.reason.length>0);
   assert.doesNotMatch(chem.reason,/沒有任何反應|絕不可能/);
   if(chem.category==='C1')assert.match(chem.reason,/濃度/);
   if(chem.category==='Z0')assert.equal(chem.symmetricZero,true);
  }
 }
 assert.deepEqual(counts,{G1:2,M1:2,L1:9,C1:8,Z0:5,U1:10});
});
test('576-condition cell matrix (36 combos x 2 wires x 2 bridge x 4 immersions) plus 0/1-wire, pause and depletion',()=>{
 const metals=['Zn','Cu'];
 const wireSets=[[['n','l'],['p','r']],[['n','r'],['p','l']]];
 const immSets=[[true,true],[true,false],[false,true],[false,false]];
 let checked=0;
 for(const e0 of metals)for(const e1 of metals)for(const sol0 of CELL_SOLUTIONS)for(const sol1 of CELL_SOLUTIONS){
  for(const wires of wireSets)for(const bridge of [true,false])for(const [im0,im1] of immSets){
   const s=initial('cell');
   s.electrodes=[e0,e1];s.solutions=[sol0,sol1];
   s.wires=wires.map(w=>[...w]);s.bridge=bridge;
   if(!im0)toggleElectrode(s,0);
   if(!im1)toggleElectrode(s,1);
   s.playing=true;
   const q=snapshot(s);
   const closed=bridge&&im0&&im1;
   if(q.category==='G1'){
    assert.equal(q.valid,closed);
    assert.equal(q.active,closed);
    if(closed){
     assert.equal(q.meterMode,'deflected');
     const expectedX2=polarity(s)[q.znSide]<0?436:384;
     assert.equal(q.needleX2,expectedX2);
    }else{
     assert.equal(q.meterMode,'zero');
     assert.equal(q.needleX2,410);
    }
   }else{
    assert.equal(q.valid,false);
    assert.equal(q.active,false);
    if(!closed||q.symmetricZero){
     assert.equal(q.meterMode,'zero',`expected zero when open or symmetric: ${e0}/${sol0} ${e1}/${sol1}`);
     assert.equal(q.needleX2,410);
    }else{
     assert.equal(q.meterMode,'unknown',`expected unknown (never fake 0) when closed asymmetric: ${e0}/${sol0} ${e1}/${sol1}`);
     assert.equal(q.needleX2,null);
    }
    assert.equal(q.localActive[0],(e0==='Zn'&&sol0==='CuSO4')&&im0);
    assert.equal(q.localActive[1],(e1==='Zn'&&sol1==='CuSO4')&&im1);
   }
   tick(s,.1);
   if(q.category!=='G1')near(s.extent,0);
   checked++;
  }
 }
 assert.equal(checked,576);
 // 0-wire and 1-wire force meterMode=zero even on M1/C1/U1/asymmetric L1, while local displacement continues
 for(const wires of [[],[['n','l']]]){
  const s=initial('cell');
  s.electrodes=['Zn','Cu'];s.solutions=['CuSO4','CuSO4']; // M1
  s.wires=wires;s.playing=true;
  const q=snapshot(s);
  assert.equal(q.meterMode,'zero');assert.equal(q.needleX2,410);
  assert.equal(q.localActive[0],true);assert.equal(q.localActive[1],false);
  run(s,2);near(s.extent,0);assert.ok(s.localExtent[0]>0);
 }
 // Pause freeze & depletion boundary for both G1 and local
 const g=initial('cell');g.electrodes=['Cu','Zn'];g.solutions=['CuSO4','ZnSO4'];
 g.playing=true;run(g,65);
 near(g.extent,1);assert.equal(snapshot(g).active,false);assert.equal(snapshot(g).meterMode,'zero');
 const loc=initial('cell');loc.electrodes=['Zn','Cu'];loc.solutions=['CuSO4','ZnSO4'];loc.wires=[];loc.bridge=false;
 loc.playing=true;run(loc,65);
 near(loc.localExtent[0],1);assert.equal(snapshot(loc).local[0].depleted,true);assert.equal(snapshot(loc).localActive[0],false);
});
test('standard and mirrored G1 full role derivation, 4 needle cases (436/384/384/436), wire reversal keeps redox',()=>{
 const cases=[
  {mirrored:false,reversed:false,znSide:0,cuSide:1,x2:436},
  {mirrored:false,reversed:true,znSide:0,cuSide:1,x2:384},
  {mirrored:true,reversed:false,znSide:1,cuSide:0,x2:384},
  {mirrored:true,reversed:true,znSide:1,cuSide:0,x2:436}
 ];
 for(const c of cases){
  const s=initial('cell');
  if(c.mirrored){s.electrodes=['Cu','Zn'];s.solutions=['CuSO4','ZnSO4'];}
  if(c.reversed){s.wires=[['n','r'],['p','l']];}
  // Default paused at t=0 -> needle at center 410
  assert.equal(snapshot(s).meterMode,'zero');
  s.playing=true;run(s,24);
  const q=snapshot(s);
  assert.equal(q.category,'G1');
  assert.equal(q.znSide,c.znSide);
  assert.equal(q.cuSide,c.cuSide);
  assert.equal(q.signs[c.znSide],-1);
  assert.equal(q.signs[c.cuSide],1);
  assert.equal(q.needleX2,c.x2);
  near(q.masses[c.znSide],-s.extent*.005*65.38);
  near(q.masses[c.cuSide],s.extent*.005*63.546);
  assert.match(q.half[c.znSide],/Zn → Zn²⁺/);
  assert.match(q.half[c.cuSide],/Cu²⁺ \+ 2e⁻ → Cu/);
  const mp=microParticles(s);
  const znP=mp.filter(p=>p.id.startsWith('zinc-')||p.id==='initial-zn-0');
  const cuP=mp.filter(p=>p.id.startsWith('copper-'));
  assert.ok(znP.length>=2&&znP.every(p=>c.znSide===0?p.x<410:p.x>410),'Zn2+ must stay in Zn cup');
  assert.ok(cuP.length===4&&cuP.every(p=>c.cuSide===0?p.x<410:p.x>410),'Cu2+/Cu must stay in Cu cup');
 }
});
test('local Zn+CuSO4 single and dual-cup conservation, independent immersion, zero wire/bridge, pause & fresh reset',()=>{
 // Dual cup (Zn/CuSO4, Zn/CuSO4) with no wires and no salt bridge
 const s=initial('cell');
 s.electrodes=['Zn','Zn'];s.solutions=['CuSO4','CuSO4'];
 s.wires=[];s.bridge=false;
 assert.equal(s.playing,false);
 run(s,3);near(s.localExtent[0],0);near(s.localExtent[1],0);
 s.playing=true;run(s,12);
 const q1=snapshot(s);
 near(s.extent,0);
 near(q1.local[0].extent,.2);near(q1.local[1].extent,.2);
 near(q1.local[0].mol,.001);
 near(q1.local[0].znDissolvedMass,-.001*65.38);
 near(q1.local[0].cuDepositedMass,.001*63.546);
 near(q1.local[0].netMass,.001*(63.546-65.38));
 assert.ok(q1.local[0].netMass<0,'solid net mass slightly decreases when Cu coats dissolving Zn');
 near(q1.local[0].concentration,.08);
 // Lift left electrode: ONLY left stops, right keeps advancing
 toggleElectrode(s,0);
 const leftFrozen=s.localExtent[0];
 run(s,12);
 near(s.localExtent[0],leftFrozen);
 near(s.localExtent[1],.4);
 // Pause freezes right cup too
 s.playing=false;const rightFrozen=s.localExtent[1];
 run(s,5);near(s.localExtent[1],rightFrozen);
 // Complete right cup depletion: spectators & products remain
 s.playing=true;run(s,50);
 near(s.localExtent[1],1);near(snapshot(s).local[1].concentration,0);
 const mp=microParticles(s).filter(p=>p.x>410);
 assert.equal(mp.filter(p=>p.species==='SO₄²⁻').length,3);
 assert.equal(mp.filter(p=>p.species==='Cu'&&p.kind==='metal').length,4);
 assert.equal(mp.filter(p=>p.species==='Zn²⁺'&&p.kind==='product').length,4);
 // freshObservation clears localExtent and pauses
 freshObservation(s);
 assert.equal(s.playing,false);near(s.time,0);near(s.extent,0);assert.deepEqual(s.localExtent,[0,0]);
});
test('stateful dual-cup Zn/CuSO4 loses symmetricZero after asymmetric immersion history (never secretly syncs)',()=>{
 const s=initial('cell');
 s.electrodes=['Zn','Zn'];s.solutions=['CuSO4','CuSO4'];
 // Initially equal localExtent -> symmetricZero=true, meterMode=zero
 assert.equal(snapshot(s).symmetricZero,true);
 assert.equal(snapshot(s).meterMode,'zero');
 assert.equal(snapshot(s).needleX2,410);
 // Lift left electrode, let right cup advance alone
 toggleElectrode(s,0);
 s.playing=true;run(s,12);
 near(s.localExtent[0],0);near(s.localExtent[1],.2);
 assert.equal(snapshot(s).meterMode,'zero'); // open circuit while left is lifted
 // Re-immerse left electrode with wires & bridge intact: cups now differ in [Cu2+] & Cu coating!
 toggleElectrode(s,0);
 const qAfter=snapshot(s);
 assert.equal(qAfter.circuitClosed,true);
 assert.equal(qAfter.symmetricZero,false);
 assert.equal(qAfter.meterMode,'unknown');
 assert.equal(qAfter.needleX2,null);
 // Continue running: both cups advance independently without syncing
 run(s,6);
 near(s.localExtent[0],.1);near(s.localExtent[1],.3);
 assert.equal(snapshot(s).meterMode,'unknown');
});
