'use strict';
const places = [
  {id:'shelter', name:'대피소', x:145, y:85, icon:'⌂', note:'안전 목표'},
  {id:'gym', name:'체육관', x:445, y:85, icon:'◈', note:'실내 운동장'},
  {id:'cafeteria', name:'급식실', x:755, y:85, icon:'♨', note:'좀비 출현 구역'},
  {id:'gate', name:'정문', x:145, y:240, icon:'⚑', note:'시작 위치'},
  {id:'hall', name:'중앙 복도', x:445, y:240, icon:'⌘', note:'교내 연결 통로'},
  {id:'nurse', name:'보건실', x:755, y:240, icon:'✚', note:'응급 처치실'},
  {id:'library', name:'도서관', x:145, y:400, icon:'▤', note:'조용한 열람실'},
  {id:'lab', name:'과학실', x:445, y:400, icon:'⚗', note:'해독제 보관 장소'}
];
const passages = [['shelter','gate'],['shelter','gym'],['gym','cafeteria'],['gym','hall'],['cafeteria','nurse'],['gate','hall'],['gate','library'],['hall','nurse'],['hall','library'],['hall','lab'],['library','lab'],['gym','nurse'],['shelter','hall']];
const $ = id => document.getElementById(id);
const place = id => places.find(p => p.id === id);
const edgeKey = (a,b) => [a,b].sort().join(':');
let state;
function neighbors(id){return passages.filter(([a,b]) => (a===id || b===id) && !state.blocked.has(edgeKey(a,b))).map(([a,b]) => a===id ? b : a);}
function distancesFrom(target){
  const distances = {[target]:0}, queue = [target];
  for(let i=0;i<queue.length;i++) for(const next of neighbors(queue[i])) if(distances[next]===undefined){distances[next]=distances[queue[i]]+1;queue.push(next);}
  return distances;
}
function log(message, warning=false){
  const li=document.createElement('li'), turn=document.createElement('b'), text=document.createElement('span');
  turn.textContent=state.turn===0?'시작':`턴 ${String(state.turn).padStart(2,'0')}`;
  text.textContent=message; if(warning)text.className='warning';li.append(turn,text);$('log').prepend(li);
}
function finish(won, reason){state.over=true;state.won=won;state.mode=false;$('result').hidden=false;$('result').className=`result${won?'':' loss'}`;$('result').textContent=reason;log(reason,!won);}
function takeTurn(action){
  if(state.over)return;
  state.turn++;state.mode=false;log(action);
  if(state.player===state.zombie){finish(false,'게임 오버 — 좀비가 있는 장소에 들어가 붙잡혔습니다.');render();return;}
  if(state.player==='lab'&&!state.antidote){state.antidote=true;log('해독제를 확보했습니다! 이제 대피소로 돌아가세요.');}
  if(state.player==='shelter'&&state.antidote){finish(true,`탈출 성공! 해독제를 가지고 대피소에 도착했습니다. ${state.turn}턴 사용 · ${state.distance}칸 이동`);render();return;}
  const distances=distancesFrom(state.player), old=state.zombie;
  const choices=neighbors(old).filter(id=>distances[id]!==undefined && distances[id]===distances[old]-1);
  if(choices.length){state.zombie=choices[Math.floor(Math.random()*choices.length)];log(`좀비: ${place(old).name} → ${place(state.zombie).name}. 현재 내 위치: ${place(state.player).name}.`,true);}
  else log(`좀비는 통로가 차단되어 ${place(old).name}에 머물렀습니다. 현재 내 위치: ${place(state.player).name}.`);
  if(state.zombie===state.player)finish(false,'게임 오버 — 좀비에게 붙잡혔습니다. 통로를 차단해 추격을 막아보세요.');
  else if(state.turn>=12)finish(false,'게임 오버 — 12턴이 모두 지났습니다. 제한 시간 안에 해독제를 들고 대피소에 도착해야 합니다.');
  render();
}
function move(id){
  if(state.over)return;
  if(state.mode){$('map-hint').textContent='장소 사이의 통로를 클릭하면 바리케이드를 설치합니다.';return;}
  if(!neighbors(state.player).includes(id)){$('map-hint').textContent='현재 위치와 연결된, 차단되지 않은 장소를 선택하세요.';return;}
  const old=state.player;state.player=id;state.distance++;takeTurn(`플레이어: ${place(old).name} → ${place(id).name} 이동.`);
}
function barricade(a,b){
  if(state.over||!state.mode||state.barricades<=0)return;
  const key=edgeKey(a,b);if(state.blocked.has(key))return;
  state.blocked.add(key);state.barricades--;takeTurn(`플레이어: ${place(a).name} ↔ ${place(b).name} 통로에 바리케이드 설치. ${place(state.player).name}에서 대기.`);
}
function svgElement(tag,attributes={},text){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attributes))el.setAttribute(key,value);if(text!==undefined)el.textContent=text;return el;}
function activate(el,fn){el.addEventListener('click',fn);el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();fn();}});}
function render(){
  $('remaining').textContent=12-state.turn;$('time-bar').style.width=`${(12-state.turn)/12*100}%`;
  $('barricades').textContent=state.barricades;$('distance').textContent=state.distance;$('location').textContent=place(state.player).name;
  const distance=distancesFrom(state.player)[state.zombie], danger=distance!==undefined&&distance<=1;
  $('safety').textContent=state.over?(state.won?'탈출 성공':'게임 종료'):(danger?'위험':'안전');$('safety').className=`badge${danger||state.over&&!state.won?' danger':''}`;
  $('location-description').textContent=state.over?'다시 시작 버튼으로 새로운 도전에 나서세요.':danger?'좀비가 바로 옆에 있습니다. 이동 경로와 차단할 통로를 살펴보세요.':distance===undefined?'바리케이드가 좀비의 접근을 막고 있습니다.':`좀비까지 최단 거리 ${distance}칸. 다음 이동을 신중하게 선택하세요.`;
  $('inventory').textContent=state.antidote?'✚ 해독제 확보 · 대피소로 이동하세요':'✚ 해독제 미확보 · 과학실에서 획득';
  for(const [id,done,n] of [['mission-one',state.antidote,1],['mission-two',state.won,2]]){$(id).className=`objective${done?' done':''}`;$(id).querySelector('.check').textContent=done?'✓':n;}
  $('barricade-mode').disabled=state.over||state.barricades===0;$('next-turn').disabled=state.over;
  $('barricade-mode').setAttribute('aria-pressed',String(state.mode));$('barricade-mode').textContent=state.mode?'✕ 설치 모드 취소':'▥ 바리케이드 설치 모드';
  $('map').classList.toggle('install-mode',state.mode);$('map-hint').textContent=state.over?'게임 종료 · 다시 도전해 보세요.':state.mode?'차단할 통로를 클릭하세요. 설치하면 즉시 1턴 진행됩니다.':'연결된 장소를 클릭해 이동하세요.';
  $('edges').replaceChildren();$('nodes').replaceChildren();
  for(const [a,b] of passages){
    const p=place(a),q=place(b),blocked=state.blocked.has(edgeKey(a,b));
    const group=svgElement('g',{'class':'edge-action'}),coords={x1:p.x,y1:p.y,x2:q.x,y2:q.y};
    group.append(svgElement('line',{...coords,class:`edge${blocked?' blocked':''}`}));
    if(state.mode&&!blocked&&!state.over){group.setAttribute('role','button');group.setAttribute('tabindex','0');group.setAttribute('aria-label',`${p.name}와 ${q.name} 사이 바리케이드 설치`);group.append(svgElement('line',{...coords,class:'edge-hit'}));activate(group,()=>barricade(a,b));}
    if(blocked)group.append(svgElement('text',{x:(p.x+q.x)/2,y:(p.y+q.y)/2+7,'text-anchor':'middle',class:'barrier-mark'},'▥'));
    $('edges').append(group);
  }
  for(const p of places){
    const current=p.id===state.player,zombie=p.id===state.zombie,reachable=neighbors(state.player).includes(p.id);
    const group=svgElement('g',{class:`node${current?' current':''}${zombie?' zombie':''}${reachable&&!state.over&&!state.mode?' reachable':''}`,transform:`translate(${p.x},${p.y})`,role:'button',tabindex:state.over?'-1':'0','aria-label':`${p.name}${current?', 현재 위치':''}${zombie?', 좀비 있음':''}${reachable?', 연결된 장소':''}`,'aria-disabled':String(state.over||state.mode||!reachable)});
    group.append(svgElement('rect',{x:-73,y:-48,width:146,height:96,rx:12}),svgElement('text',{y:-18,class:'node-icon'},zombie?'☠':p.icon),svgElement('text',{y:8},p.name),svgElement('text',{y:30,class:'node-sub'},zombie?'좀비 위치':current?'현재 내 위치':p.id==='lab'&&state.antidote?'해독제 확보 완료':p.note));
    activate(group,()=>move(p.id));$('nodes').append(group);
  }
}
function reset(){state={player:'gate',zombie:'cafeteria',turn:0,distance:0,barricades:3,blocked:new Set(),antidote:false,mode:false,over:false,won:false};$('result').hidden=true;$('log').replaceChildren();log('정문에 도착했습니다. 급식실에서 좀비가 발견되었습니다. 12턴 안에 해독제를 확보하고 대피소로 이동하세요.');render();}
$('reset').addEventListener('click',reset);
$('barricade-mode').addEventListener('click',()=>{if(state.over||!state.barricades)return;state.mode=!state.mode;render();});
$('next-turn').addEventListener('click',()=>takeTurn(`플레이어: ${place(state.player).name}에서 대기.`));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.mode){state.mode=false;render();}});
reset();
