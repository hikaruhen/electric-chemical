import test from 'node:test';
import assert from 'node:assert/strict';
import {initial,snapshot,tick,connect,polarity,freshObservation,testCollectedGas,electrodeGeometry,setElectrodeY,toggleElectrode,microParticles,CELL_SOLUTIONS,cellSolutions} from '../model.js';
import {BATTERY_REACTIONS,batteryReaction} from '../battery-structure.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const run=(s,seconds)=>{for(let i=0;i<seconds*10;i++)tick(s,.1);};
test('all lab modes default paused with zero progress until playing, and freshObservation resets to paused',()=>{for(const mode of ['cell','water','copper','plate']){const s=initial(mode);assert.equal(s.playing,false);assert.equal(snapshot(s).active,false);const before=JSON.stringify(s);run(s,5);assert.equal(JSON.stringify(s),before);s.playing=true;run(s,2);assert.ok(s.time>0&&s.extent>0);freshObservation(s);assert.equal(s.playing,false);const afterReset=JSON.stringify(s);run(s,2);assert.equal(JSON.stringify(s),afterReset);}});
test('independent Zn/Cu stoichiometry, concentration and masses',()=>{const s=initial();s.extent=.4;const q=snapshot(s);near(q.masses[0],-.002*65.38);near(q.masses[1],.002*63.546);near(q.concentration,.06);});
test('all materials: removed geometry has clear gap, immersion is derived from painted bottom',()=>{for(const mode of ['cell','water','copper','plate'])for(let side=0;side<2;side++){const s=initial(mode);s.playing=true;assert.ok(electrodeGeometry(s,side).immersed);assert.equal(snapshot(s).active,true);toggleElectrode(s,side);const g=electrodeGeometry(s,side);assert.ok(g.gap>=18);assert.equal(g.immersed,false);assert.equal(snapshot(s).active,false);setElectrodeY(s,side,g.surface-162);assert.ok(electrodeGeometry(s,side).gap>=18);toggleElectrode(s,side);assert.equal(electrodeGeometry(s,side).immersed,true);}});
test('wires, salt bridge, material and geometry are necessary, with no false progress',()=>{for(const setup of [s=>s.bridge=false,s=>s.wires.pop(),s=>setElectrodeY(s,0,130),s=>s.electrodes[1]='Zn']){const s=initial();s.playing=true;setup(s);assert.equal(snapshot(s).active,false);tick(s,.1);near(s.extent,0);}});
test('pause freezes model and transport; speed scales progress',()=>{const s=initial('water');s.playing=true;run(s,2);s.playing=false;const before=JSON.stringify(s);run(s,2);assert.equal(JSON.stringify(s),before);s.playing=true;s.speed=4;const time=s.time;tick(s,.1);near(s.time-time,.4);});
test('water collection lags formation; all gas arrives at 20:10 after reaction',()=>{const s=initial('water');s.playing=true;run(s,2);near(snapshot(s).gas[0].volume,0);assert.ok(s.gasBubbles.length>0);run(s,63);const q=snapshot(s);near(q.gas[0].volume,20);near(q.gas[1].volume,10);assert.equal(q.inFlight,false);assert.equal(q.active,false);});
test('cutting power stops formation but pre-existing bubbles finish collecting',()=>{const s=initial('water');s.playing=true;run(s,4);s.power=false;const time=s.time,packets=s.gasPackets.length,gas=s.collectedGas[0];run(s,4);near(s.time,time);assert.equal(s.gasPackets.length,packets);assert.ok(s.collectedGas[0]>gas);near(s.collectedGas[0],s.collectedGas[1]*2);});
test('manual polarity reversal clears old collection and tests; new H2 follows cathode',()=>{const s=initial('water');s.playing=true;run(s,5);s.gasTests[0]=testCollectedGas(s,0);assert.match(s.gasTests[0].text,/氫氣.*爆鳴/);s.wires=[];connect(s,'n','r');connect(s,'p','l');assert.equal(s.playing,false);assert.deepEqual(polarity(s),[1,-1]);assert.deepEqual(s.collectedGas,[0,0]);assert.deepEqual(s.gasTests,[null,null]);assert.equal(testCollectedGas(s,0).ok,false);s.playing=true;run(s,5);assert.match(testCollectedGas(s,0).text,/氧氣/);assert.match(testCollectedGas(s,1).text,/氫氣/);s.solution='water';assert.equal(testCollectedGas(s,0).ok,false);});
test('copper vs carbon anode independently conserves Cu and changes bath concentration',()=>{const s=initial('copper');s.extent=.5;let q=snapshot(s);near(q.concentration,.1);near(q.masses[0],.015*63.546);near(q.masses[1],0);s.electrodes[1]='Cu';q=snapshot(s);near(q.concentration,.2);near(q.masses[0]+q.masses[1],0);assert.equal(q.gas[1].name,'');});
test('disconnect preserves mass / concentration; iron anode is unsupported',()=>{const s=initial('plate');s.playing=true;s.extent=.3;const before=snapshot(s);s.wires=[];tick(s,.1);assert.deepEqual(snapshot(s).masses,before.masses);near(snapshot(s).concentration,.2);freshObservation(s);assert.equal(s.playing,false);connect(s,'n','r');connect(s,'p','l');assert.match(snapshot(s).reason,/副反應未建模/);});
test('same Cu ion reaches the interface and becomes Cu without a spatial jump',()=>{const s=initial();s.extent=.24999;const a=microParticles(s).find(p=>p.id==='copper-0');s.extent=.25001;const b=microParticles(s).find(p=>p.id==='copper-0');assert.equal(a.species,'Cu²⁺');assert.equal(b.species,'Cu');assert.ok(Math.hypot(b.x-a.x,b.y-a.y)<.02);});
test('spectators remain, including OH-/Na+ at completed water run and reverse polarity',()=>{for(const reverse of [false,true]){const s=initial('water');if(reverse){s.wires=[];connect(s,'n','r');connect(s,'p','l');}s.playing=true;run(s,64);const p=microParticles(s).filter(p=>p.opacity>.1);assert.ok(p.some(p=>p.species==='Na⁺'));assert.ok(p.some(p=>p.species==='OH⁻'));assert.ok(!p.some(p=>p.species==='Na'));}const s=initial('copper');s.extent=1;assert.ok(microParticles(s).some(p=>p.species==='SO₄²⁻'));});
function sum(terms){const result={charge:0};for(const t of terms){const [raw,z]=t.formula.split('^');const charge=z?(z.startsWith('2')?2:1)*(z.endsWith('-')?-1:1):0;result.charge+=charge*t.count;if(raw==='e')continue;for(const m of raw.matchAll(/([A-Z][a-z]?)(\d*)/g))result[m[1]]=(result[m[1]]||0)+Number(m[2]||1)*t.count;}return result;}
test('all displayed battery half and overall reactions balance atoms and charge',()=>{for(const r of BATTERY_REACTIONS)for(const eq of Object.values(r))assert.deepEqual(sum(eq.left),sum(eq.right));for(const [key,eq] of Object.entries(batteryReaction(2,'charge'))){assert.deepEqual(sum(eq.left),sum(eq.right));assert.deepEqual(eq.left,BATTERY_REACTIONS[2][key].right);}});
test('cell 3x3 independent beaker solutions: true per-cup species, honest reasons, zero false progress, pause/preserve',()=>{
 for(const solL of CELL_SOLUTIONS){
  for(const solR of CELL_SOLUTIONS){
   const s=initial('cell');
   s.solutions=[solL,solR];
   s.playing=true;
   const q=snapshot(s);
   const isStd=solL==='ZnSO4'&&solR==='CuSO4';
   assert.equal(q.chemistryKnown,isStd,`chemistryKnown ${solL}/${solR}`);
   assert.equal(q.valid,isStd,`valid ${solL}/${solR}`);
   assert.equal(q.active,isStd,`active ${solL}/${solR}`);
   const mp=microParticles(s);
   const leftSp=new Set(mp.filter(p=>p.x<410).map(p=>p.species));
   const rightSp=new Set(mp.filter(p=>p.x>410).map(p=>p.species));
   for(const [sol,sp] of [[solL,leftSp],[solR,rightSp]]){
    if(sol==='CuSO4'){assert.ok(sp.has('Cu²⁺')&&sp.has('SO₄²⁻')&&!sp.has('Zn²⁺'),`CuSO4 species ${[...sp]}`);}
    else if(sol==='ZnSO4'){assert.ok(sp.has('Zn²⁺')&&sp.has('SO₄²⁻')&&!sp.has('Cu²⁺'),`ZnSO4 species ${[...sp]}`);}
    else{assert.equal(sp.size,0,`water must have zero solute ions, got ${[...sp]}`);}
   }
   run(s,2);
   if(isStd){assert.ok(s.time>0&&s.extent>0);}
   else{
    near(s.time,0);near(s.extent,0);
    assert.ok(q.reason.length>0);
    assert.doesNotMatch(q.reason,/沒有任何反應/);
    if(solL==='CuSO4')assert.match(q.reason,/置換/);
   }
  }
 }
 // Independent cup change, fresh pause vs same-cup preservation, reset
 const s=initial('cell');
 assert.deepEqual(cellSolutions(s),['ZnSO4','CuSO4']);
 assert.equal(s.playing,false);
 s.playing=true;run(s,2);
 const tBefore=s.time,eBefore=s.extent;
 // Same solution keeps progress & play state
 assert.equal(s.solutions[0],'ZnSO4');
 assert.equal(s.time,tBefore);assert.equal(s.extent,eBefore);assert.equal(s.playing,true);
 // Changing only left cup preserves right cup, electrodes, wires, bridge; fresh clears & pauses
 s.solutions[0]='water';freshObservation(s);
 assert.deepEqual(s.solutions,['water','CuSO4']);
 assert.deepEqual(s.electrodes,['Zn','Cu']);
 assert.equal(s.bridge,true);assert.equal(s.wires.length,2);
 assert.equal(s.playing,false);near(s.time,0);near(s.extent,0);
 // Reset restores default pair & paused
 const r=initial('cell');
 assert.deepEqual(r.solutions,['ZnSO4','CuSO4']);assert.equal(r.playing,false);
});
