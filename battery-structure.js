const E=(...terms)=>terms.map(([formula,count=1])=>({formula,count}));
const reaction=(left,right)=>({left,right});
export const BATTERY_REACTIONS=[
 {negative:reaction(E(['Zn']),E(['Zn^2+'],['e^-',2])),positive:reaction(E(['MnO2',2],['NH4^+',2],['e^-',2]),E(['Mn2O3'],['NH3',2],['H2O'])),overall:reaction(E(['Zn'],['MnO2',2],['NH4Cl',2]),E(['ZnCl2'],['Mn2O3'],['NH3',2],['H2O']))},
 {negative:reaction(E(['Zn'],['OH^-',2]),E(['ZnO'],['H2O'],['e^-',2])),positive:reaction(E(['MnO2',2],['H2O'],['e^-',2]),E(['Mn2O3'],['OH^-',2])),overall:reaction(E(['Zn'],['MnO2',2]),E(['ZnO'],['Mn2O3']))},
 {negative:reaction(E(['Pb'],['SO4^2-']),E(['PbSO4'],['e^-',2])),positive:reaction(E(['PbO2'],['H^+',4],['SO4^2-'],['e^-',2]),E(['PbSO4'],['H2O',2])),overall:reaction(E(['Pb'],['PbO2'],['H2SO4',2]),E(['PbSO4',2],['H2O',2]))}
];
const sub='₀₁₂₃₄₅₆₇₈₉',sup={'1':'¹','2':'²','3':'³','4':'⁴','+':'⁺','-':'⁻'};
function formula(raw){const [base,charge]=raw.split('^');return base.replace(/\d/g,n=>sub[n])+(charge?[...charge].map(c=>sup[c]||c).join(''):'');}
export function formatReaction(r){const side=terms=>terms.map(t=>(t.count===1?'':t.count)+formula(t.formula)).join(' + ');return side(r.left)+' → '+side(r.right);}
export function batteryReaction(index,process){const source=BATTERY_REACTIONS[index];return Object.fromEntries(Object.entries(source).map(([key,r])=>[key,index===2&&process==='charge'?reaction(r.right,r.left):r]));}
const txt=(x,y,value,size=18,anchor='start',fill='#284e43',extra='')=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}"${extra?' '+extra:''}>${value}</text>`;
export const BATTERY_PARTS=[
 {overview:['碳鋅電池','鋅筒是負極；中央碳棒只負責導電，正極反應物是周圍的二氧化錳。'],zinc:['鋅筒（負極）','外層鋅筒失去電子，生成鋅離子；同時也是盛裝內容物的容器。'],carbon:['碳棒（集流）','連到正端，收集與傳遞電子；碳不是本簡化反應中的正極反應物。'],mix:['二氧化錳＋碳粉','包圍中央碳棒，二氧化錳得到電子而還原；碳粉幫助導電。'],paste:['酸性電解質糊','含氯化銨、氯化鋅及少量水，分布在糊狀混合物與隔紙內，讓離子移動。'],separator:['多孔隔紙','分開鋅筒與正極混合物，防止直接短路；離子仍可通過。'],seal:['封口與絕緣','封住電解質，並使正端碳棒與負端鋅筒彼此絕緣。']},
 {overview:['鹼性電池','鋅粉在中央，二氧化錳在外圈；中央金屬棒連負端，鋼殼連正端。'],zinc:['中央鋅粉膠（負極）','鋅粉分散在含氫氧化鉀的膠內，失去電子，依教材簡化式形成氧化鋅。'],collector:['金屬集電棒（負端）','插入中央鋅粉膠，向下連到負端底蓋；不是碳棒，也不是反應物。'],mix:['外圈二氧化錳（正極）','二氧化錳與導電碳粉壓在鋼殼內側，得到電子而還原。'],paste:['氫氧化鉀 KOH','鹼性電解質分布於鋅粉膠、隔膜及正極混合物；不是一個獨立大空槽。'],separator:['環狀多孔隔膜','位在中央鋅粉與外圈二氧化錳之間，防短路但讓離子通過。'],steel:['鋼殼（正極集流）','包住外圈正極材料，連接上方正端；與負端底蓋由絕緣封口隔開。']},
 {overview:['鉛蓄電池（單格約 2 V）','5 片正、負極板交錯並聯（負極板多一片，讓正極板兩面都對著負極板），以隔板隔開浸在硫酸液中；實物汽車電瓶常由 6 個單格串聯組成約 12 V。'],negative:['鉛負極板 Pb（3 片並聯）','放電時與 SO₄²⁻ 反應生成硫酸鉛並放出電子；充電時得電子恢復為鉛並釋出 SO₄²⁻。'],positive:['二氧化鉛正極板 PbO₂（2 片並聯）','放電時與 H⁺、SO₄²⁻ 反應生成硫酸鉛與水；充電時氧化恢復二氧化鉛，並釋出 H⁺ 與 SO₄²⁻。'],paste:['硫酸電解液 H₂SO₄','含 H⁺ 與紫色 SO₄²⁻。放電時兩極皆消耗 SO₄²⁻、正極消耗 H⁺，酸濃度下降；充電時兩極釋出離子，酸濃度回升。'],separator:['多孔絕緣隔板（4 片）','夾在每對相鄰正、負極板之間，防止短路，仍讓電解液離子通過。'],bus:['同極匯流排與端子','3 片鉛負板接至左負匯流排、2 片二氧化鉛正板接至右正匯流排，彼此絕緣不短路。充電時外接直流充電器須正接正、負接負。']}
];
function part(key,content,selected,label,callout=false){return `<g data-part="${key}" role="button" tabindex="0" aria-label="${callout?'':'剖面部位：'}${label}" class="battery-part ${selected===key?'part-selected':''}">${content}</g>`;}
function callout(key,label,x,y,row,selected){return `<path d="M${x} ${y} H420 V${row-7} H472" fill="none" stroke="#91aaa0" stroke-width="1.5" pointer-events="none" aria-hidden="true"/>`+part(key,`<rect x="470" y="${row-30}" width="365" height="60" rx="8" fill="${selected===key?'#e0edd5':'#f2f6f0'}"/>`+txt(485,row-3,label,18),selected,label,true);}
function cylindrical(index,selected){let h='';const alkaline=index===1;
 h+=txt(230,38,alkaline?'鹼性電池剖面':'碳鋅電池剖面',23,'middle')+txt(230,70,'＋ 正端',17,'middle');
 h+=part(alkaline?'steel':'seal','<rect x="205" y="83" width="50" height="27" rx="5" fill="#91a49e"/><rect x="110" y="110" width="240" height="340" rx="24" fill="#d8e3da" stroke="#315f51" stroke-width="3"/>',selected,alkaline?'鋼殼':'外殼與封口');
 if(!alkaline){h+=part('zinc','<path d="M120 141 V431 H340 V141" fill="#a3b4b0" stroke="#7e9690" stroke-width="10"/>',selected,'鋅筒');h+=part('separator','<rect x="133" y="143" width="194" height="273" rx="9" fill="#faf2d3" stroke="#baae82" stroke-width="2"/>',selected,'隔紙');h+=part('mix','<rect x="144" y="150" width="172" height="254" rx="6" fill="#82705c"/>',selected,'二氧化錳與碳粉');h+=part('paste','<path d="M161 185 Q195 199 171 227 Q155 242 163 268 M290 306 Q269 325 289 351" stroke="#cfc3a0" stroke-width="9" fill="none"/>',selected,'含電解質的糊狀物');h+=part('carbon','<rect x="220" y="105" width="20" height="289" rx="4" fill="#34443d"/>',selected,'中央碳棒');h+=part('seal','<path d="M123 119 H220 V143 H123 Z M240 119 H337 V143 H240 Z" fill="#d7b991"/>',selected,'絕緣封口');
 const c=[['carbon','中央碳棒：正極集流',230,175],['mix','二氧化錳＋碳粉：正極材料',305,207],['paste','氯化銨／氯化鋅電解質糊',170,242],['separator','多孔隔紙',138,292],['zinc','外層鋅筒：負極',121,355],['seal','絕緣封口',285,130]];c.forEach(([k,l,x,y],i)=>h+=callout(k,l,x,y,143+i*62,selected));
 }else{h+=part('steel','<path d="M121 135 V426 H339 V135" fill="#a5b6ad" stroke="#6a867b" stroke-width="10"/>',selected,'正極鋼殼');h+=part('mix','<rect x="132" y="143" width="196" height="270" rx="10" fill="#796b5c"/>',selected,'外圈二氧化錳');h+=part('separator','<rect x="172" y="149" width="116" height="259" rx="10" fill="#fbf3d7" stroke="#baae82" stroke-width="3"/>',selected,'多孔隔膜');h+=part('zinc','<rect x="181" y="157" width="98" height="241" rx="8" fill="#b7c8b8"/>'+Array.from({length:28},(_,i)=>`<circle cx="${190+i%4*25}" cy="${174+Math.floor(i/4)*33}" r="4" fill="#6e8d79"/>`).join(''),selected,'中央鋅粉膠');h+=part('paste','<path d="M194 230 Q205 245 194 256 M264 305 Q252 320 264 333" fill="none" stroke="#d8edbb" stroke-width="10"/>',selected,'KOH 電解質');h+=part('collector','<rect x="225" y="183" width="10" height="258" rx="3" fill="#b58c51"/><rect x="172" y="438" width="116" height="12" rx="3" fill="#859c95"/>',selected,'負極集電棒');h+='<path d="M141 422 H219 V438 H141 Z M241 422 H319 V438 H241 Z" fill="#d9bc96"/>';
 const c=[['steel','外層鋼殼：連正端',338,167],['mix','外圈二氧化錳：正極材料',311,211],['separator','多孔隔膜：包住中央鋅粉',285,260],['zinc','中央鋅粉膠：負極材料',196,305],['collector','金屬集電棒：連負端',230,362],['paste','氫氧化鉀 KOH：鹼性電解質',267,331]];c.forEach(([k,l,x,y],i)=>h+=callout(k,l,x,y,143+i*62,selected));}
 h+=txt(230,484,'− 負端',17,'middle');return h;
}
const LEAD_PLATES=[{x:124,pos:false},{x:178,pos:true},{x:232,pos:false},{x:286,pos:true},{x:340,pos:false}];
const LEAD_SEPS=[151,205,259,313];
const LEAD_SO4_L=[{id:'lead-so4-l-0',y:164,delay:0},{id:'lead-so4-l-1',y:214,delay:.22},{id:'lead-so4-l-2',y:264,delay:.42}];
const LEAD_SO4_R=[{id:'lead-so4-r-0',y:156,delay:.06},{id:'lead-so4-r-1',y:248,delay:.34}];
const LEAD_H=[{id:'lead-h-0',y:110,delay:0},{id:'lead-h-1',y:202,delay:.20},{id:'lead-h-2',y:294,delay:.42}];
function leadIonNode(id,species,fill,stroke,ink,r=21,fs=14.5){return `<g id="${id}" data-species="${species}" pointer-events="none"><circle r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.8"/>${txt(0,5,species,fs,'middle',ink,'font-weight="700"')}</g>`;}
function lead(selected,charging){
 let h='';
 h+=txt(236,32,'鉛蓄電池 · 單格約 2 V（5 片交錯並聯）',17.5,'middle','#1c473e','font-weight="700"');
 h+=txt(645,32,'局部反應放大窗（一對極板定性示意）',16.5,'middle','#1c473e','font-weight="700"');
 // External circuit: left battery post (124,116) <-> device terminals (186,82) & (320,82) <-> right battery post (382,116)
 h+=`<path id="lead-wire-l" d="M124 116 V82 H186" fill="none" stroke="#536e65" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
 h+=`<path id="lead-wire-r" d="M320 82 H382 V116" fill="none" stroke="#a65f38" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
 if(charging){
  h+=`<g id="lead-charger"><rect x="184" y="45" width="138" height="56" rx="10" fill="#204a43" stroke="#6f9184" stroke-width="2"/>`+
   txt(253,66,'直流充電器',15,'middle','#fff','font-weight="700"')+
   txt(253,89,'正接正 · 負接負',14,'middle','#d3ebe0','font-weight="600"')+
   `<g id="charger-term-n" data-terminal="charger-n"><circle cx="186" cy="82" r="12" fill="#46655e" stroke="#e4f2eb" stroke-width="2"/>${txt(186,88,'−',18,'middle','#fff','font-weight="700"')}</g>`+
   `<g id="charger-term-p" data-terminal="charger-p"><circle cx="320" cy="82" r="12" fill="#b45c32" stroke="#fde6d8" stroke-width="2"/>${txt(320,88,'＋',17,'middle','#fff','font-weight="700"')}</g>`+
   '</g>';
 }else{
  h+=`<g id="lead-load"><rect x="184" y="45" width="138" height="56" rx="10" fill="#f7faf4" stroke="#759486" stroke-width="2"/>`+
   `<circle id="lead-bulb-glow" cx="218" cy="73" r="15" fill="#f7cf63" opacity="0"/>`+
   `<circle id="lead-bulb-core" cx="218" cy="73" r="9.5" fill="#edf2ee" stroke="#7d8f88" stroke-width="2"/>`+
   `<path d="M214 75 Q218 68 222 75" fill="none" stroke="#b97810" stroke-width="1.6"/>`+
   txt(272,70,'外部負載',15,'middle','#244c42','font-weight="700"')+
   txt(272,89,'放電供電',14,'middle','#58746b')+
   `<circle cx="186" cy="82" r="5.5" fill="#fff" stroke="#536e65" stroke-width="2.5"/><circle cx="320" cy="82" r="5.5" fill="#fff" stroke="#a65f38" stroke-width="2.5"/></g>`;
 }
 // External electrons (travel strictly between battery posts and charger/load terminals, never inside electrolyte)
 h+='<g id="lead-ext-electrons" pointer-events="none">';
 for(let i=0;i<6;i++)h+=`<g id="lead-e-${i}" data-species="e⁻"><circle r="7" fill="#b24063" stroke="#fff" stroke-width="1.2"/>${txt(0,3.5,'−',10,'middle','#fff','font-weight="700"')}</g>`;
 h+='</g>';
 h+=txt(253,121,charging?'e⁻：負端→負極；正極→正端':'e⁻：負極 → 外部負載 → 正極',14.2,'middle','#9e3b5b','font-weight="700"');
 // Cell tank & electrolyte
 h+='<rect x="76" y="182" width="320" height="226" rx="14" fill="#fbfdf9" stroke="#688d80" stroke-width="3"/>';
 h+=part('paste','<path id="lead-electrolyte" d="M80 216 H392 V398 Q392 404 386 404 H86 Q80 404 80 398 Z" fill="#cbeaf2" opacity="0.88"/>',selected,'硫酸電解液');
 // Positive busbar (lower tier, connects positive plates x=178, 286 to right + terminal x=382)
 const posBus=`<rect x="172" y="156" width="214" height="8" rx="4" fill="#8f5335"/><rect x="377" y="116" width="10" height="48" rx="4" fill="#8f5335"/><rect x="174" y="160" width="8" height="36" rx="2" fill="#8f5335"/><rect x="282" y="160" width="8" height="36" rx="2" fill="#8f5335"/><circle cx="382" cy="116" r="8" fill="#fff" stroke="#8f5335" stroke-width="3"/>`;
 // Negative busbar (upper tier, connects negative plates x=124, 232, 340 to left - terminal x=124) with white insulated gaps over positive busbar
 const negBus=`<rect x="224" y="151" width="16" height="18" rx="3" fill="#fbfdf9"/><rect x="332" y="151" width="16" height="18" rx="3" fill="#fbfdf9"/><rect x="118" y="135" width="228" height="8" rx="4" fill="#597976"/><rect x="119" y="116" width="10" height="27" rx="4" fill="#597976"/><rect x="120" y="139" width="8" height="57" rx="2" fill="#597976"/><rect x="228" y="139" width="8" height="57" rx="2" fill="#597976"/><rect x="336" y="139" width="8" height="57" rx="2" fill="#597976"/><circle cx="124" cy="116" r="8" fill="#fff" stroke="#597976" stroke-width="3"/>`;
 h+=part('bus',posBus+negBus+txt(100,121,'−',20,'middle','#284e43','font-weight="700"')+txt(406,121,'＋',20,'middle','#8f5335','font-weight="700"')+txt(62,144,'− 匯流',13,'middle','#4a6865','font-weight="600"')+txt(414,165,'＋ 匯流',13,'middle','#8f5335','font-weight="600"'),selected,'同極匯流排與端子');
 // 5 alternating plates
 const negPlates=[],posPlates=[];
 LEAD_PLATES.forEach((pl,idx)=>{
  const rect=`<rect x="${pl.x-15}" y="194" width="30" height="194" rx="5" fill="${pl.pos?'#995c3c':'#86a09d'}" stroke="#4f7268" stroke-width="1.6"/>`+
   `<rect id="lead-coat-${idx}" x="${pl.x-12}" y="224" width="24" height="158" rx="3" fill="#ece5c9" stroke="#b9ab7c" stroke-width="1.4" opacity="${charging?1:0}"/>`+
   txt(pl.x,214,pl.pos?'PbO₂':'Pb',pl.pos?12:13,'middle',pl.pos?'#fff':'#163733','font-weight="700"');
  (pl.pos?posPlates:negPlates).push(rect);
 });
 h+=part('negative',negPlates.join(''),selected,'鉛負極板（3 片並聯）');
 h+=part('positive',posPlates.join(''),selected,'二氧化鉛正極板（2 片並聯）');
 // 4 separators between every adjacent pair
 h+=part('separator',LEAD_SEPS.map(sx=>`<rect x="${sx-4.5}" y="198" width="9" height="194" rx="3" fill="#fff8df" stroke="#b9ac80" stroke-width="1.5"/>`).join(''),selected,'多孔絕緣隔板（4 片）');
 // Zoom callout frame linking adjacent Pb (232) | sep (259) | PbO2 (286) to right window
 h+='<rect x="213" y="250" width="92" height="110" rx="6" fill="none" stroke="#146451" stroke-width="2" stroke-dasharray="5 4" pointer-events="none"/>';
 h+='<path d="M305 305 H462" fill="none" stroke="#146451" stroke-width="1.8" stroke-dasharray="5 4" pointer-events="none"/>';
 // Compact clickable part strip under cell
 const pills=[['negative','負極 Pb',36,76],['positive','正極 PbO₂',118,88],['separator','隔板',212,56],['paste','硫酸液',274,70],['bus','同極匯流排',350,94]];
 pills.forEach(([k,lbl,px,pw])=>{h+=part(k,`<rect x="${px}" y="422" width="${pw}" height="38" rx="8" fill="${selected===k?'#dcecd2':'#f1f5ef'}" stroke="${selected===k?'#146451':'#c6d5cb'}" stroke-width="1.5"/>`+txt(px+pw/2,446,lbl,14,'middle','#21483f','font-weight="600"'),selected,lbl,true);});

 // RIGHT HALF: Local Reaction Zoom-In Window (x=462..832, y=46..412)
 h+='<rect x="462" y="46" width="370" height="366" rx="14" fill="#fafdf9" stroke="#146451" stroke-width="2"/>';
 h+=txt(512,74,'− 負極 Pb',15,'middle','#284e43','font-weight="700"')+txt(647,74,'多孔隔板',14,'middle','#7a6e42','font-weight="600"')+txt(776,74,'＋ 正極 PbO₂',15,'middle','#8a4a2b','font-weight="700"');
 h+='<rect id="lead-zoom-electrolyte" x="468" y="88" width="358" height="264" rx="8" fill="#cbeaf2" opacity="0.88"/>';
 // Left zoomed Pb plate & PbSO4 surface crust
 h+='<rect x="476" y="98" width="54" height="220" rx="6" fill="#86a09d" stroke="#4f7268" stroke-width="2"/>';
 h+=txt(500,124,'Pb',15,'middle','#163733','font-weight="700"');
 h+=`<rect id="lead-zoom-coat-l" x="508" y="132" width="${charging?22:0}" height="180" rx="3" fill="#ece5c9" stroke="#b9ab7c" stroke-width="1.6"/>`;
 h+=`<text id="lead-zoom-label-l" x="504" y="228" font-size="13" text-anchor="middle" fill="#4f431c" font-weight="700" opacity="${charging?1:0}">PbSO₄</text>`;
 // Center zoomed porous separator
 h+='<rect x="641" y="98" width="12" height="220" rx="4" fill="#fff8df" stroke="#b9ac80" stroke-width="1.8" stroke-dasharray="5 3"/>';
 // Right zoomed PbO2 plate & PbSO4 surface crust
 h+='<rect x="764" y="98" width="54" height="220" rx="6" fill="#995c3c" stroke="#5f3b26" stroke-width="2"/>';
 h+=txt(792,124,'PbO₂',14,'middle','#fff','font-weight="700"');
 h+=`<rect id="lead-zoom-coat-r" x="${charging?764:786}" y="132" width="${charging?22:0}" height="180" rx="3" fill="#ece5c9" stroke="#b9ab7c" stroke-width="1.6"/>`;
 h+=`<text id="lead-zoom-label-r" x="789" y="228" font-size="13" text-anchor="middle" fill="#4f431c" font-weight="700" opacity="${charging?1:0}">PbSO₄</text>`;
 // Spectators (stay in electrolyte so solution never empties, placed in dedicated non-overlapping lanes)
 h+='<g id="lead-zoom-spectators" pointer-events="none">';
 h+=`<g id="lead-bg-so4" data-species="SO₄²⁻" transform="translate(586 114)" opacity="0.9"><circle r="21" fill="#e6daf7" stroke="#6f42b5" stroke-width="1.8"/>${txt(0,5,'SO₄²⁻',14.5,'middle','#3b1d6e','font-weight="700"')}</g>`;
 h+=`<g id="lead-bg-h" data-species="H⁺" transform="translate(586 310)" opacity="0.9"><circle r="16.5" fill="#cdeeff" stroke="#157aa7" stroke-width="1.8"/>${txt(0,5,'H⁺',15,'middle','#0f4c6b','font-weight="700"')}</g>`;
 h+='</g>';
 // Animated reactive ions: purple SO4^2- on BOTH sides + blue H+ on positive side (non-overlapping vertical lanes)
 h+='<g id="lead-zoom-ions" pointer-events="none">';
 LEAD_SO4_L.forEach(o=>h+=leadIonNode(o.id,'SO₄²⁻','#e6daf7','#6f42b5','#3b1d6e',21,14.5));
 LEAD_SO4_R.forEach(o=>h+=leadIonNode(o.id,'SO₄²⁻','#e6daf7','#6f42b5','#3b1d6e',21,14.5));
 LEAD_H.forEach(o=>h+=leadIonNode(o.id,'H⁺','#cdeeff','#157aa7','#0f4c6b',16.5,15));
 h+='</g>';
 // Concise H2O hint below positive plate (replaces water circles so ions are never occluded)
 h+=txt(820,342,charging?'正極消耗 H₂O ↓':'正極生成 H₂O ↑',14.5,'end','#1d5b76','id="lead-h2o-note" font-weight="700"');
 // Zoom window bottom status captions
 h+=txt(647,376,charging?'充電進行中 · 兩極釋出 SO₄²⁻，正極釋出 H⁺':'放電進行中 · 兩極消耗 SO₄²⁻，正極消耗 H⁺ 生成 H₂O',14.5,'middle','#1c4a3e','id="lead-stage-text" font-weight="700"');
 h+=txt(647,400,charging?'硫酸濃度 ↑ · 恢復 Pb／PbO₂（定性示意）':'硫酸濃度 ↓ · 兩極生成 PbSO₄（定性示意）',14.2,'middle','#4f6c62','id="lead-conc-text"');
 // Compact ion legend below zoom window (consistent purple SO4^2- language)
 h+='<g pointer-events="none" transform="translate(462 428)">';
 h+=`<circle cx="10" cy="14" r="6.5" fill="#e6daf7" stroke="#6f42b5" stroke-width="1.6"/>`+txt(21,19,'SO₄²⁻ 硫酸根',14.2,'start','#3b1d6e','font-weight="600"');
 h+=`<circle cx="132" cy="14" r="6.5" fill="#cdeeff" stroke="#157aa7" stroke-width="1.6"/>`+txt(143,19,'H⁺',14.2,'start','#0f4c6b','font-weight="600"');
 h+=`<rect x="174" y="7" width="13" height="13" rx="2" fill="#ece5c9" stroke="#b9ab7c" stroke-width="1.4"/>`+txt(192,19,'PbSO₄',14.2,'start','#4f431c','font-weight="600"');
 h+=`<circle cx="256" cy="14" r="6.5" fill="#b24063"/>`+txt(267,19,'e⁻ 外電路',14.2,'start','#8f2d4d','font-weight="600"');
 h+='</g>';
 return h;
}
const clamp01=x=>Math.max(0,Math.min(1,x));
function extPoint(path,t){const len=path.getTotalLength();return path.getPointAtLength(len*clamp01(t));}
export function updateLeadVisuals(root,process,progress,playing){
 const svg=root?.querySelector('.battery-cutaway svg');if(!svg)return;
 const charging=process==='charge',p=clamp01(progress),done=p>=1,coat=charging?1-p:p,acidOp=charging?0.42+0.50*p:0.92-0.50*p;
 for(let i=0;i<5;i++){const c=svg.querySelector(`#lead-coat-${i}`);if(c)c.setAttribute('opacity',(0.95*coat).toFixed(3));}
 const el1=svg.querySelector('#lead-electrolyte'),el2=svg.querySelector('#lead-zoom-electrolyte');
 if(el1)el1.setAttribute('opacity',acidOp.toFixed(3));if(el2)el2.setAttribute('opacity',acidOp.toFixed(3));
 const cw=24*coat,cl=svg.querySelector('#lead-zoom-coat-l'),cr=svg.querySelector('#lead-zoom-coat-r'),ll=svg.querySelector('#lead-zoom-label-l'),lr=svg.querySelector('#lead-zoom-label-r');
 if(cl){cl.setAttribute('width',cw.toFixed(2));cl.setAttribute('x',(530-cw).toFixed(2));}
 if(cr){cr.setAttribute('width',cw.toFixed(2));cr.setAttribute('x','764');}
 if(ll)ll.setAttribute('opacity',clamp01((coat-.2)/.35).toFixed(3));
 if(lr)lr.setAttribute('opacity',clamp01((coat-.2)/.35).toFixed(3));
 const lit=!done&&(playing||p>0),glow=svg.querySelector('#lead-bulb-glow'),core=svg.querySelector('#lead-bulb-core');
 if(glow)glow.setAttribute('opacity',lit?(0.62-0.25*p).toFixed(3):'0');
 if(core){core.setAttribute('fill',lit?'#fff6d1':'#edf2ee');core.setAttribute('stroke',lit?'#b98a1e':'#7d8f88');}
 // External electrons: move strictly along left/right external wires connected to exact +/- terminals
 const wl=svg.querySelector('#lead-wire-l'),wr=svg.querySelector('#lead-wire-r');
 if(wl&&wr){
  const phase=(p*2.6)%1;
  for(let i=0;i<6;i++){
   const node=svg.querySelector(`#lead-e-${i}`);if(!node)continue;
   const onLeft=i<3,u=((i%3)/3+phase)%1;
   // Discharge: left wire (124,116)->(186,82) (t: 0->1), right wire (320,82)->(382,116) (t: 0->1)
   // Charge: right wire (382,116)->(320,82) (t: 1->0), left wire (186,82)->(124,116) (t: 1->0)
   const t=charging?1-u:u,pt=extPoint(onLeft?wl:wr,t);
   node.setAttribute('transform',`translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
   node.setAttribute('opacity',done?'0':'1');
  }
 }
 // Reactive SO4^2- on left (Pb) plate
 LEAD_SO4_L.forEach((o,i)=>{
  const n=svg.querySelector('#'+o.id);if(!n)return;
  const local=clamp01((p-o.delay)/.5);
  const x=charging?554+58*local:612-58*local,y=o.y+1.5*Math.sin(p*6+i);
  const op=charging?clamp01(local/.18)*(local>0?1:0):1-clamp01((local-.78)/.22);
  n.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  n.setAttribute('opacity',op.toFixed(3));
 });
 // Reactive SO4^2- on right (PbO2) plate (both plates participate!)
 LEAD_SO4_R.forEach((o,i)=>{
  const n=svg.querySelector('#'+o.id);if(!n)return;
  const local=clamp01((p-o.delay)/.5);
  const x=charging?740-60*local:680+60*local,y=o.y+1.5*Math.cos(p*6+i);
  const op=charging?clamp01(local/.18)*(local>0?1:0):1-clamp01((local-.78)/.22);
  n.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  n.setAttribute('opacity',op.toFixed(3));
 });
 // Reactive H+ on positive (PbO2) plate
 LEAD_H.forEach((o,i)=>{
  const n=svg.querySelector('#'+o.id);if(!n)return;
  const local=clamp01((p-o.delay)/.48);
  const x=charging?744-70*local:674+70*local,y=o.y+1.5*Math.sin(p*7+i*1.3);
  const op=charging?clamp01(local/.18)*(local>0?1:0):1-clamp01((local-.78)/.22);
  n.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  n.setAttribute('opacity',op.toFixed(3));
 });
 // Progress-responsive concise H2O hint below positive plate
 const wn=svg.querySelector('#lead-h2o-note');
 if(wn){
  wn.textContent=done?(charging?'正極已消耗 H₂O':'正極已生成 H₂O'):(charging?'正極消耗 H₂O ↓':'正極生成 H₂O ↑');
  wn.setAttribute('opacity',(0.72+0.28*p).toFixed(3));
 }
 const st=svg.querySelector('#lead-stage-text'),ct=svg.querySelector('#lead-conc-text'),pct=Math.round(p*100);
 if(st)st.textContent=done?(charging?'已達充電示意終態 · 極板恢復 Pb／PbO₂（可按重置動畫）':'已達放電示意終態 · 兩極覆蓋 PbSO₄（可按重置動畫）'):!playing?(p===0?(charging?'已暫停 · 按「▶ 播放」開始充電（0%）':'已暫停 · 按「▶ 播放」開始放電（0%）'):(charging?`充電已暫停（${pct}%）`:`放電已暫停（${pct}%）`)):(charging?'充電進行中 · 兩極釋出 SO₄²⁻，正極釋出 H⁺':'放電進行中 · 兩極消耗 SO₄²⁻，正極消耗 H⁺ 生成 H₂O');
 if(ct)ct.textContent=(charging?'硫酸濃度 ↑ · 恢復 Pb／PbO₂':'硫酸濃度 ↓ · 兩極生成 PbSO₄')+`（定性示意 ${pct}%）`;
}
export function batteryStructure(index,process='discharge',selected='overview'){
 const charging=index===2&&process==='charge',parts=BATTERY_PARTS[index],description=parts[selected]||parts.overview,r=batteryReaction(index,process);
 const viewBox=index===2?'20 12 820 456':'80 20 770 480';
 const cutaway=`<div class="battery-cutaway${index===2?' lead-cutaway':''}"><svg viewBox="${viewBox}" role="group" aria-label="可點選部位的電池剖面">${index===2?lead(selected,charging):cylindrical(index,selected)}</svg>${index===2?'':`<div id="battery-part-note" class="part-note" role="status"><strong>${description[0]}</strong>　${description[1]}</div>`}</div>`;
 const reactionHtml=`<section class="battery-reaction"><div class="section-title"><h2>${charging?'充電：電能 → 化學能':'放電：化學能 → 電能'}</h2><span>教材簡化平衡式</span></div><p class="overall-reaction">${formatReaction(r.overall)}</p><details class="battery-half"><summary>兩極半反應</summary><div class="reactions"><div class="reaction"><strong>負極 · ${charging?'還原（得電子）':'氧化（失電子）'}</strong><code>${formatReaction(r.negative)}</code></div><div class="reaction"><strong>正極 · ${charging?'氧化（失電子）':'還原（得電子）'}</strong><code>${formatReaction(r.positive)}</code></div></div></details><p class="electron-direction">${charging?'電子：充電器負端 → 負極；正極 → 充電器正端（正接正、負接負；電子不經電解液）。':index===2?'電子：鉛負極板 → 外部負載 → 正極板；兩極消耗 SO₄²⁻、正極消耗 H⁺，硫酸濃度下降。':'電子：鋅負極 → 外電路 → 正極；碳棒／金屬棒只協助集流。'}</p></section>`;
 const notesHtml=`<details class="battery-detail-notes"><summary>構造、反應與來源</summary><p>剖面依教材印刷第 24–25 頁的材料位置繪製，未按比例。${index===2?'圖示為 3 負 2 正、共 5 片交錯並聯的約 2 V 液式單格（負極板多一片，讓正極板兩面都對著負極板；實物汽車電瓶常以 6 個單格串聯組成約 12 V）。放／充電離子與時間皆為定性示意，預設暫停、按播放開始並於終態停止，未模擬過充與副反應。':index===0?'酸性電解質位在混合糊與隔紙內；實際反應會受放電條件影響，這裡省略後續配位反應。':'KOH 分布於膠與多孔材料內；本畫面採教材的 Mn₂O₃ 簡化式，非所有放電階段的完整機制。'}</p><p>核對：<a href="https://openstax.org/books/chemistry-atoms-first/pages/16-5-batteries-and-fuel-cells" target="_blank" rel="noreferrer">OpenStax 電池原理與剖面</a>；<a href="https://www.gs-battery.com.tw/en/knowhow-technicalmanual-4.php" target="_blank" rel="noreferrer">GS 原廠鉛蓄充放電反應</a>；<a href="https://www.bulldog-battery.com/wp-content/uploads/Bulldog-Battery-Service-Manual-12122024.pdf" target="_blank" rel="noreferrer">Bulldog 極板排列手冊</a>；<a href="https://www.curtisinstruments.com/evbatterymonitoring/" target="_blank" rel="noreferrer">Curtis 電池構造說明</a>（2026-11-26）。</p></details>`;
 if(index===2)return cutaway+`<div class="lead-footer"><div class="lead-footer-left"><div id="battery-part-note" class="part-note" role="status"><strong>${description[0]}</strong>　${description[1]}</div>${notesHtml}</div>${reactionHtml}</div>`;
 return cutaway+reactionHtml+notesHtml;
}
