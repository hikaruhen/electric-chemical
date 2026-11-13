const schemes=[
 {negative:['鋅筒 Zn','外殼同時是負極'],positive:['二氧化錳 MnO₂','碳棒協助集流'],electrolyte:['酸性糊狀電解質','NH₄Cl、ZnCl₂'],note:'碳棒主要導電；二氧化錳參與正極反應。'},
 {negative:['鋅粉 Zn','分散的反應材料'],positive:['二氧化錳 MnO₂','正極反應材料'],electrolyte:['鹼性電解質','氫氧化鉀 KOH'],note:'與碳鋅電池比較：反應材料類似，電解質與材料配置不同。'},
 {negative:['鉛 Pb','放電時反應'],positive:['二氧化鉛 PbO₂','放電時反應'],electrolyte:['硫酸水溶液','H₂SO₄'],note:'放電時兩極形成硫酸鉛，硫酸濃度下降；適當充電可回復。'},
 {negative:['負極材料','可儲存鋰離子'],positive:['正極材料','可儲存鋰離子'],electrolyte:['含鋰離子的電解質','Li⁺ 經電解質移動'],note:'兩極材料依電池設計而異；這裡不指定市售型號的精確配方。'},
 {negative:['吸氫金屬合金','儲存／釋出氫'],positive:['鎳化合物','參與可逆反應'],electrolyte:['電解質','在兩極間傳遞離子'],note:'充電與放電時反應方向相反；負極不是鋅筒。'},
 {negative:['氫極','輸入 H₂'],positive:['氧極','輸入 O₂'],electrolyte:['電解質／隔離層','傳遞離子，隔開反應物'],note:'持續補充反應物供電；整體產物是水，並非一般充電補回燃料。'}
];
const text=(x,y,t,size=15,fill='#315c4e')=>`<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" fill="${fill}">${t}</text>`;
function electrode(index,side){const x=side?510:70;
 if(index===0&&!side)return `<path d="M${x+20} 165 V232 H${x+120} V165" fill="none" stroke="#8b9f9a" stroke-width="15"/>`+text(x+70,212,'鋅筒',15);
 if(index===0&&side)return `<rect x="${x+28}" y="164" width="84" height="70" rx="8" fill="#a2b0a0"/><rect x="${x+62}" y="155" width="16" height="86" rx="4" fill="#3e4d45"/>`+text(x+70,259,'中央碳棒',12);
 if(index===1&&!side)return Array.from({length:15},(_,i)=>`<circle cx="${x+30+i%5*20}" cy="${175+Math.floor(i/5)*21}" r="6" fill="#8daba1"/>`).join('');
 if(index===3)return Array.from({length:5},(_,i)=>`<rect x="${x+22}" y="${166+i*14}" width="96" height="7" rx="3" fill="${side?'#9fada3':'#687d79'}"/>`).join('');
 if(index===5)return `<path d="M${x+22} 160 V238 M${x+70} 160 V238 M${x+118} 160 V238" stroke="${side?'#4c8fa1':'#698d67'}" stroke-width="9" stroke-dasharray="3 5"/>`+text(x+70,259,side?'← 氧氣':'→ 氫氣',12);
 return `<rect x="${x+25}" y="165" width="27" height="70" rx="3" fill="${side?'#788f79':'#a6b4b1'}"/><rect x="${x+60}" y="165" width="27" height="70" rx="3" fill="${side?'#788f79':'#a6b4b1'}"/><rect x="${x+95}" y="165" width="20" height="70" rx="3" fill="${side?'#788f79':'#a6b4b1'}"/>`;
}
export function batteryStructure(index,process='idle'){
 const s=schemes[index],charging=process==='charge'&&index>=2&&index<=4;
 const flow=charging?'充電：電能 → 化學能':index===5?'供電：氫氣＋氧氣 → 電能＋水':'放電：化學能 → 電能';
 const arrow=charging?'M580 62 H148':'M140 62 H572';
 const ion=index===3?(charging?'Li⁺：正極材料 → 負極材料':'Li⁺：負極材料 → 正極材料'):'離子在電解質中傳遞';
 return `<details class="battery-structure" open><summary>結構與能量示意 <small>非精密實物剖面，未按比例</small></summary><svg viewBox="0 0 720 340" role="img" aria-label="${s.negative[0]}、${s.electrolyte.join('、')}、${s.positive[0]}的結構示意"><defs><marker id="battery-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="none" stroke="#a43d64" stroke-width="1.5"/></marker></defs>${text(360,24,flow,17)}<path d="${arrow}" stroke="#a43d64" stroke-width="3" fill="none" marker-end="url(#battery-arrow)"/>${text(360,52,charging?'外電路電子經充電器反向轉移':'外電路電子 e⁻：負極 → 正極',12,'#a43d64')}<path d="M140 66 V95 M580 66 V95" stroke="#66897a" stroke-width="2"/><rect x="45" y="91" width="630" height="190" rx="18" fill="#f3f7f1" stroke="#cbded2"/><rect x="259" y="161" width="202" height="92" rx="12" fill="${index===0?'#f1e5be':index===1?'#d9eac9':'#d9edf0'}"/>${text(140,115,'− 放電時負極',12)}${text(580,115,'＋ 放電時正極',12)}${text(140,143,s.negative[0])}${text(580,143,s.positive[0])}${electrode(index,0)}${electrode(index,1)}${text(140,273,s.negative[1],10)}${text(580,273,s.positive[1],10)}${text(360,185,s.electrolyte[0],14)}${text(360,211,s.electrolyte[1],12)}${text(360,237,'離子通道 ≠ 電子導線',11)}${text(360,303,ion,13)}${text(360,328,index===5?'整體反應：2H₂ + O₂ → 2H₂O（產物水）':'電子走外電路，離子在電解質中移動',12)}</svg><p class="hint">${s.note}</p></details>`;
}
