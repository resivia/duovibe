function getPersistentId(){let uid=localStorage.getItem('duovibe_uid');if(!uid){uid='user_'+Math.random().toString(36).substr(2,9)+'_'+Date.now().toString(36);localStorage.setItem('duovibe_uid',uid);}return uid;}
let sb=null;
class DuoVibeApp{
constructor(){this.myUid=getPersistentId();this.myName=localStorage.getItem('duovibe_name')||'';this.roomId=null;this.isHost=false;this.pollInterval=null;this.isPolling=false;this.roomData=null;this.blindRankSelections=[null,null,null,null,null];this.blindRankStep=0;}
init(){
 if(window.supabase&&typeof SUPABASE_URL!=='undefined'&&typeof SUPABASE_ANON_KEY!=='undefined'&&SUPABASE_ANON_KEY.indexOf('PASTE')===-1){
   sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
 } else {
   console.warn("Supabase not configured - check config.js");
   if(window.supabase&&typeof SUPABASE_URL!=='undefined'){try{sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);}catch(e){}}
 }
 this.bindEvents();
 const params=new URLSearchParams(window.location.search);const roomParam=params.get('room');if(roomParam){const codeInput=document.getElementById('join-room-code');if(codeInput)codeInput.value=roomParam.toUpperCase();}
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&this.roomId){console.log("Tab focused - force sync");this.pollDB();}});
}
bindEvents(){
 const createBtn=document.getElementById('btn-create-room');const joinBtn=document.getElementById('btn-join-room');const nameInput=document.getElementById('player-name-input');
 if(nameInput){nameInput.value=this.myName;nameInput.addEventListener('input',e=>{this.myName=e.target.value.trim();localStorage.setItem('duovibe_name',this.myName);});}
 if(createBtn)createBtn.addEventListener('click',()=>this.handleCreateRoom());
 if(joinBtn)joinBtn.addEventListener('click',()=>this.handleJoinRoom());
 const joinCode=document.getElementById('join-room-code');if(joinCode){joinCode.addEventListener('keydown',e=>{if(e.key==='Enter')this.handleJoinRoom();});}
}
generateRoomCode(){return Math.floor(1000+Math.random()*9000).toString();}
async handleCreateRoom(){
 const name=(document.getElementById('player-name-input')?.value.trim())||this.myName||'Host';this.myName=name;localStorage.setItem('duovibe_name',name);
 if(!sb){alert('Supabase not configured. Please add your anon key in config.js');return;}
 const code=this.generateRoomCode();
 const newRoom={id:code,host_id:this.myUid,host_name:name,players:[{id:this.myUid,name:name,role:'host'}],state:'LOBBY',game_type:null,current_prompt:null,choices:{},streak:0,round:1,updated_at:new Date().toISOString()};
 try{const {data,error}=await sb.from('rooms').insert([newRoom]).select().single();if(error){alert('Could not create room: '+error.message);return;}this.roomId=code;this.isHost=true;this.roomData=data;this.startPolling();this.renderScreen();}catch(err){console.error(err);alert('Network error creating room.');}
}
async handleJoinRoom(){
 const name=(document.getElementById('player-name-input')?.value.trim())||this.myName||'Player';const codeInput=document.getElementById('join-room-code');const code=codeInput?codeInput.value.trim().toUpperCase():'';
 if(!code){alert('Enter a 4-digit room code.');return;}this.myName=name;localStorage.setItem('duovibe_name',name);
 if(!sb){alert('Supabase not configured.');return;}
 try{const {data:room,error}=await sb.from('rooms').select('*').eq('id',code).single();if(error||!room){alert('Room not found! Check code.');return;}
  let players=room.players||[];const existingIndex=players.findIndex(p=>p.id===this.myUid);if(existingIndex>=0){players[existingIndex].name=name;}else{players.push({id:this.myUid,name:name,role:'player'});}
  const {data:updatedRoom}=await sb.from('rooms').update({players:players,updated_at:new Date().toISOString()}).eq('id',code).select().single();
  this.roomId=code;this.isHost=(room.host_id===this.myUid);this.roomData=updatedRoom||room;this.startPolling();this.renderScreen();}catch(err){console.error(err);alert('Network error joining room.');}
}
startPolling(){if(this.pollInterval)clearInterval(this.pollInterval);this.pollDB();this.pollInterval=setInterval(()=>this.pollDB(),800);}
async pollDB(){
 if(!this.roomId||this.isPolling||!sb)return;this.isPolling=true;
 try{const {data,error}=await sb.from('rooms').select('*').eq('id',this.roomId).single();if(error||!data)return;this.syncStateWithDB(data);}catch(err){console.warn('Poll error',err);}finally{this.isPolling=false;}
}
syncStateWithDB(remote){
 if(!this.roomData){this.roomData=remote;this.renderScreen();return;}
 const sig=a=>JSON.stringify({state:a.state,game_type:a.game_type,round:a.round,prompt:a.current_prompt,pCount:(a.players||[]).length,choices:a.choices||{},streak:a.streak});
 const cur=sig(this.roomData);const rem=sig(remote);
 this.roomData=remote;this.isHost=(remote.host_id===this.myUid);
 if(cur!==rem){this.renderScreen();}
}
async submitChoice(choiceValue){
 if(!this.roomId||!sb)return;
 try{
  const {data:fresh}=await sb.from('rooms').select('choices').eq('id',this.roomId).single();
  const choices=(fresh&&fresh.choices)?fresh.choices:(this.roomData.choices||{});
  choices[this.myUid]=choiceValue;
  const {data:updated,error}=await sb.from('rooms').update({choices:choices,updated_at:new Date().toISOString()}).eq('id',this.roomId).select().single();
  if(!error&&updated){this.roomData=updated;this.renderScreen();}
 }catch(err){console.error('Submit error',err);}
}
async hostStartDrafting(gameType){
 if(!this.isHost||!sb)return;const updates={state:'DRAFTING',game_type:gameType,choices:{},updated_at:new Date().toISOString()};
 const {data}=await sb.from('rooms').update(updates).eq('id',this.roomId).select().single();if(data){this.roomData=data;this.renderScreen();}
}
async hostLaunchGame(gameType,customPrompt=null){
 if(!this.isHost||!sb)return;let prompt=customPrompt;
 if(!prompt){prompt=window.Picker?window.Picker.nextItem(gameType):{question:"Default question"};}
 if(typeof prompt==='string'){const v=prompt;if(gameType==='secretGuess'){prompt={items:window.Picker.get50Items(),target:v,question:"Guess the secret: "+v,title:"Mastermind"};}else{prompt={question:v,topic:v,scenario:v,title:v};}}
 this.blindRankSelections=[null,null,null,null,null];this.blindRankStep=0;
 const updates={state:'PLAYING',game_type:gameType,current_prompt:prompt,choices:{},updated_at:new Date().toISOString()};
 const {data}=await sb.from('rooms').update(updates).eq('id',this.roomId).select().single();if(data){this.roomData=data;this.renderScreen();}
}
async hostNextRound(){
 if(!this.isHost||!sb)return;const gameType=this.roomData.game_type;const prompt=window.Picker.nextItem(gameType);this.blindRankSelections=[null,null,null,null,null];this.blindRankStep=0;
 const updates={state:'PLAYING',round:(this.roomData.round||1)+1,current_prompt:prompt,choices:{},updated_at:new Date().toISOString()};
 const {data}=await sb.from('rooms').update(updates).eq('id',this.roomId).select().single();if(data){this.roomData=data;this.renderScreen();}
}
async hostReturnToLobby(){
 if(!this.isHost||!sb)return;const updates={state:'LOBBY',game_type:null,current_prompt:null,choices:{},updated_at:new Date().toISOString()};
 const {data}=await sb.from('rooms').update(updates).eq('id',this.roomId).select().single();if(data){this.roomData=data;this.renderScreen();}
}
async updateStreak(newStreak){if(!this.isHost||!sb)return;await sb.from('rooms').update({streak:newStreak}).eq('id',this.roomId);}
checkAllAnswered(){
 if(!this.roomData||!this.roomData.choices)return false;const players=this.roomData.players||[];const choices=this.roomData.choices;const count=Object.keys(choices).length;
 if(players.length<=1)return count>=1;return count>=players.length;
}
renderScreen(){
 const landing=document.getElementById('landing-view');const gameView=document.getElementById('game-view');
 if(!this.roomId||!this.roomData){if(landing)landing.style.display='block';if(gameView)gameView.style.display='none';return;}
 if(landing)landing.style.display='none';if(gameView)gameView.style.display='block';
 const state=this.roomData.state||'LOBBY';
 if(state==='LOBBY')this.renderLobby(gameView);
 else if(state==='DRAFTING')this.renderDrafting(gameView);
 else if(state==='PLAYING'){if(this.checkAllAnswered())this.renderComparison(gameView);else this.renderActiveGame(gameView);}
}
renderLobby(container){
 const players=this.roomData.players||[];const shareUrl=`${window.location.origin}${window.location.pathname}?room=${this.roomId}`;
 let html=`<div class="glass-card animate-fade"><div class="header-banner"><span class="badge-pill pulse">&#128308; LIVE LOBBY</span><h2 style="margin-top:8px;">Room: <span class="text-glow">${this.roomId}</span></h2><p style="font-size:0.9rem;opacity:0.8;">Share code with partner!</p><div style="margin-top:10px;"><button class="btn-secondary" id="btn-copy-link" style="padding:8px 16px;font-size:0.85rem;">&#128203; Copy Direct Link</button></div></div><div style="margin:20px 0;"><h4 style="margin-bottom:12px;font-size:1rem;opacity:0.9;">Connected (${players.length})</h4><div style="display:flex;gap:10px;flex-wrap:wrap;">${players.map(p=>`<div class="badge-pill ${p.id===this.myUid?'active-player':''}" style="padding:10px 16px;font-size:0.9rem;">${p.role==='host'?'&#128081;':'&#128104;&#8205;&#128187;'} ${p.name} ${p.id===this.myUid?'(You)':''}</div>`).join('')}</div></div>`;
 if(this.isHost){
 html+=`<div style="margin-top:22px;"><h3 style="margin-bottom:12px;">Select Game (11 Modes)</h3><div class="game-selector-grid">
 <div class="game-card" onclick="window.App.hostLaunchGame('wouldRather')"><div class="game-icon">&#129300;</div><div class="game-title">Would You Rather</div><div class="game-desc">Option A vs B consensus</div></div>
 <div class="game-card" onclick="window.App.hostLaunchGame('redGreenFlag')"><div class="game-icon">&#128681;</div><div class="game-title">Red / Green Flag</div><div class="game-desc">Dating LDR scenarios</div></div>
 <div class="game-card" onclick="window.App.hostLaunchGame('compatQuiz')"><div class="game-icon">&#128150;</div><div class="game-title">Compatibility Quiz</div><div class="game-desc">Who knows who best</div></div>
 <div class="game-card" onclick="window.App.hostLaunchGame('hotTakes')"><div class="game-icon">&#128293;</div><div class="game-title">Hot Takes Radar</div><div class="game-desc">Agree vs Disagree debate</div></div>
 <div class="game-card" onclick="window.App.hostLaunchGame('bucketList')"><div class="game-icon">&#9992;&#65039;</div><div class="game-title">LDR Bucket List</div><div class="game-desc">Match reunion ideas</div></div>
 <div class="game-card" onclick="window.App.hostLaunchGame('truthOrDare')"><div class="game-icon">&#127917;</div><div class="game-title">Truth or Dare</div><div class="game-desc">LDR truths & dares</div></div>
 <div class="game-card" onclick="window.App.hostStartDrafting('mindMeld')"><div class="game-icon">&#129504;</div><div class="game-title">Mind Meld</div><div class="game-desc">Exact word match</div></div>
 <div class="game-card" onclick="window.App.hostLaunchGame('vibeSlider')"><div class="game-icon">&#127914;</div><div class="game-title">Vibe Slider</div><div class="game-desc">Rate 0-100 intensity</div></div>
 <div class="game-card" onclick="window.App.hostLaunchGame('percentage')"><div class="game-icon">&#128202;</div><div class="game-title">Percentage Predictor</div><div class="game-desc">Guess % within 15%</div></div>
 <div class="game-card" onclick="window.App.hostLaunchGame('blindRank')"><div class="game-icon">&#128220;</div><div class="game-title">Blind Rank</div><div class="game-desc">Rank 5 surprise items</div></div>
             <div class="game-card" onclick="window.App.hostLaunchGame('flashPoll')">
              <div class="game-icon">📊</div>
              <div class="game-title">Flash Poll</div>
              <div class="game-desc">Quick polls for instant votes.</div>
            </div>
            <div class="game-card" onclick="window.App.hostLaunchGame('wordStorm')">
              <div class="game-icon">🌪️</div>
              <div class="game-title">Word Storm</div>
              <div class="game-desc">Type as many words as you can!</div>
            </div>
            <div class="game-card" onclick="window.App.hostLaunchGame('spyInTheCrowd')">
              <div class="game-icon">🕵️</div>
              <div class="game-title">Spy in the Crowd</div>
              <div class="game-desc">Find the spy among us!</div>
            </div>            <div class="game-card" onclick="window.App.hostLaunchGame('flashPoll')">
              <div class="game-icon">📊</div>
              <div class="game-title">Flash Poll</div>
              <div class="game-desc">Quick polls for instant votes.</div>
            </div>
            <div class="game-card" onclick="window.App.hostLaunchGame('wordStorm')">
              <div class="game-icon">🌪️</div>
              <div class="game-title">Word Storm</div>
              <div class="game-desc">Type as many words as you can!</div>
            </div>
            <div class="game-card" onclick="window.App.hostLaunchGame('spyInTheCrowd')">
              <div class="game-icon">🕵️</div>
              <div class="game-title">Spy in the Crowd</div>
              <div class="game-desc">Find the spy among us!</div>
            </div>            <div class="game-card" onclick="window.App.hostLaunchGame('flashPoll')">
              <div class="game-icon">📊</div>
              <div class="game-title">Flash Poll</div>
              <div class="game-desc">Quick polls for instant votes.</div>
            </div>
            <div class="game-card" onclick="window.App.hostLaunchGame('wordStorm')">
              <div class="game-icon">🌪️</div>
              <div class="game-title">Word Storm</div>
              <div class="game-desc">Type as many words as you can!</div>
            </div>
            <div class="game-card" onclick="window.App.hostLaunchGame('spyInTheCrowd')">
              <div class="game-icon">🕵️</div>
              <div class="game-title">Spy in the Crowd</div>
              <div class="game-desc">Find the spy among us!</div>
            </div><div class="game-card" onclick="window.App.hostStartDrafting('secretGuess')"><div class="game-icon">&#128373;</div><div class="game-title">Mastermind</div><div class="game-desc">50 item secret guess</div></div>
 </div></div>`;
 } else {
 html+=`<div style="margin-top:24px;text-align:center;padding:30px;" class="glass-card"><div class="spinner" style="margin:0 auto 16px auto;"></div><h3>Waiting for Host...</h3><p style="opacity:0.8;font-size:0.9rem;margin-top:8px;">Host is picking from 11 games.</p></div>`;
 }
 html+=`</div>`;container.innerHTML=html;
 const copyBtn=document.getElementById('btn-copy-link');if(copyBtn){copyBtn.addEventListener('click',()=>{navigator.clipboard.writeText(shareUrl);copyBtn.innerText='&#10004; Copied!';setTimeout(()=>copyBtn.innerText='&#128203; Copy Direct Link',2000);});}
}
renderDrafting(container){
 if(this.isHost){
 container.innerHTML=`<div class="glass-card animate-fade"><span class="badge-pill">&#9997; HOST DRAFTING</span><h2 style="margin-top:12px;">Draft Custom Prompt</h2><p style="opacity:0.8;margin-bottom:20px;">Type custom topic or roll random from bank.</p><div style="margin-bottom:20px;"><input type="text" id="custom-prompt-input" class="input-field" placeholder="Type custom topic/question..." style="margin-bottom:12px;"/><div style="display:flex;gap:12px;"><button class="btn-primary" id="btn-submit-draft" style="flex:1;">Launch Custom</button><button class="btn-secondary" id="btn-roll-random" style="flex:1;">Auto-Roll Random</button></div></div><button class="btn-secondary" onclick="window.App.hostReturnToLobby()" style="width:100%;">Back to Lobby</button></div>`;
 document.getElementById('btn-submit-draft')?.addEventListener('click',()=>{const val=document.getElementById('custom-prompt-input').value.trim();if(val){this.hostLaunchGame(this.roomData.game_type,val);}else{alert('Enter topic or roll random');}});
 document.getElementById('btn-roll-random')?.addEventListener('click',()=>{this.hostLaunchGame(this.roomData.game_type);});
 } else {
 container.innerHTML=`<div class="glass-card animate-fade" style="text-align:center;padding:40px 20px;"><div class="spinner" style="margin:0 auto 20px auto;"></div><h2>Host is Drafting...</h2><p style="opacity:0.8;margin-top:10px;">Round starts when host submits.</p></div>`;
 }
}
renderActiveGame(container){
 const prompt=this.roomData.current_prompt||{};const gameType=this.roomData.game_type;const choices=this.roomData.choices||{};const myChoice=choices[this.myUid];const players=this.roomData.players||[];const partner=players.find(p=>p.id!==this.myUid)||{name:'Partner'};const partnerHasChoice=partner.id&&choices[partner.id]!==undefined;
 let html=`<div class="glass-card animate-fade"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><span class="badge-pill">&#128293; STREAK: ${this.roomData.streak||0}</span><span class="badge-pill">ROUND ${this.roomData.round||1}</span></div><div style="margin-bottom:20px;text-align:center;"><h2 style="font-size:1.32rem;font-weight:800;">${prompt.question||prompt.topic||prompt.scenario||prompt.title||'Answer the Question'}</h2>${prompt.target&&gameType==='secretGuess'?`<div style="margin-top:8px;font-size:0.85rem;opacity:0.7;">Target is hidden &#128274;</div>`:''}</div>`;
 html+=`<div style="display:flex;gap:10px;margin-bottom:20px;justify-content:center;"><div class="status-chip ${myChoice!==undefined?'ready':'waiting'}">You: ${myChoice!==undefined?'&#10004; Locked In':'Thinking...'}</div><div class="status-chip ${partnerHasChoice?'ready':'waiting'}">${partner.name}: ${partnerHasChoice?'&#10004; Locked In':'Thinking...'}</div></div>`;
 if(myChoice!==undefined){
 html+=`<div style="text-align:center;padding:30px 10px;" class="glass-card"><div class="spinner" style="margin:0 auto 16px auto;"></div><h3>Locked! &#128274;</h3><p style="opacity:0.8;margin-top:8px;">Waiting for ${partner.name}... Choice is [ HIDDEN ] until all lock in.</p></div>`;
 } else {
  if(gameType==='wouldRather'||gameType==='bucketList'){
   html+=`<div style="display:flex;flex-direction:column;gap:14px;"><button class="btn-primary" onclick="window.App.submitChoice('${(prompt.optionA||'Option A').replace(/'/g,"\\'")}')" style="padding:18px;font-size:1.05rem;">${prompt.optionA||'Option A'}</button><button class="btn-secondary" onclick="window.App.submitChoice('${(prompt.optionB||'Option B').replace(/'/g,"\\'")}')" style="padding:18px;font-size:1.05rem;">${prompt.optionB||'Option B'}</button></div>`;
  } else if(gameType==='redGreenFlag'){
   html+=`<div style="display:flex;gap:16px;"><button class="btn-primary" onclick="window.App.submitChoice('GREEN FLAG')" style="flex:1;background:linear-gradient(135deg,#00E676,#00B0FF);padding:20px;font-size:1.1rem;">&#128689; GREEN FLAG</button><button class="btn-primary" onclick="window.App.submitChoice('RED FLAG')" style="flex:1;background:linear-gradient(135deg,#FF1744,#FF5252);padding:20px;font-size:1.1rem;">&#128681; RED FLAG</button></div>`;
  } else if(gameType==='hotTakes'){
   html+=`<div style="display:flex;gap:16px;"><button class="btn-primary" onclick="window.App.submitChoice('AGREE')" style="flex:1;background:linear-gradient(135deg,#00E676,#00B0FF);padding:20px;font-size:1.1rem;">&#128077; AGREE</button><button class="btn-primary" onclick="window.App.submitChoice('DISAGREE')" style="flex:1;background:linear-gradient(135deg,#FF1744,#FF5252);padding:20px;font-size:1.1rem;">&#128078; DISAGREE</button></div>`;
  } else if(gameType==='truthOrDare'){
   const mode=prompt.mode||'TRUTH';html+=`<div style="text-align:center;"><div class="badge-pill" style="margin-bottom:14px;background:var(--primary);color:#fff;">${mode} MODE</div>${mode==='TRUTH'?`<input type="text" id="truth-input" class="input-field" placeholder="Type answer..." style="margin-bottom:16px;text-align:center;font-size:1.1rem;"/><button class="btn-primary" id="btn-submit-truth" style="width:100%;">Lock In Truth</button>`:`<p style="opacity:0.9;margin-bottom:16px;">Perform dare live via voice/video, then complete!</p><button class="btn-primary" onclick="window.App.submitChoice('DARE COMPLETED!')" style="width:100%;padding:18px;">&#10004; I Completed Dare!</button>`}</div>`;
  } else if(gameType==='compatQuiz'){
   const options=prompt.options||["Me","Partner","Both","Neither"];html+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">`;options.forEach(opt=>{let label=opt;if(opt==='Me')label=this.myName||'Me';if(opt==='Partner')label=partner.name||'Partner';html+=`<button class="btn-secondary" onclick="window.App.submitChoice('${opt}')" style="padding:16px;font-size:1rem;">${label}</button>`;});html+=`</div>`;
  } else if(gameType==='mindMeld'){
   html+=`<div style="text-align:center;"><input type="text" id="mindmeld-input" class="input-field" placeholder="Type 1-word answer..." style="margin-bottom:16px;text-align:center;font-size:1.2rem;"/><button class="btn-primary" id="btn-submit-mindmeld" style="width:100%;">Lock In Word</button></div>`;
  } else if(gameType==='vibeSlider'||gameType==='percentage'){
   html+=`<div style="text-align:center;padding:10px 0;"><div id="slider-val-display" style="font-size:2.5rem;font-weight:900;margin-bottom:12px;color:var(--secondary);">50</div><input type="range" id="vibe-range" min="0" max="100" value="50" oninput="document.getElementById('slider-val-display').innerText=this.value"/><button class="btn-primary" onclick="window.App.submitChoice(document.getElementById('vibe-range').value)" style="width:100%;margin-top:18px;">Lock In Value</button></div>`;
  } else if(gameType==='secretGuess'){
   const items=prompt.items||(window.Picker?window.Picker.get50Items():[]);html+=`<div class="options-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;max-height:340px;overflow-y:auto;padding:8px;">`;items.forEach(item=>{html+=`<button class="btn-secondary" onclick="window.App.submitChoice('${item.replace(/'/g,"\\'")}')" style="padding:10px 4px;font-size:0.8rem;">${item}</button>`;});html+=`</div>`;
  } else if(gameType==='blindRank'){
   const items=prompt.items||[];const currentItem=items[this.blindRankStep]||'Final Item';html+=`<div style="text-align:center;"><div class="badge-pill" style="margin-bottom:10px;">Item ${this.blindRankStep+1} of 5</div><h3 style="font-size:1.3rem;margin-bottom:16px;color:var(--secondary);">${currentItem}</h3><div style="display:flex;flex-direction:column;gap:8px;">`;for(let i=0;i<5;i++){const filled=this.blindRankSelections[i];html+=`<button class="btn-secondary" ${filled?'disabled style="opacity:0.5;"':`onclick="window.App.handleBlindRankSelect(${i},'${currentItem.replace(/'/g,"\\'")}')"`} style="padding:12px;font-size:0.95rem;">Slot ${i+1}: ${filled||'[ Empty ]'}</button>`;}html+=`</div></div>`;
  }
 }
 if(this.isHost){html+=`<div style="margin-top:24px;border-top:1px solid var(--border-glass);padding-top:16px;display:flex;gap:10px;"><button class="btn-secondary" onclick="window.App.hostNextRound()" style="flex:1;">Skip</button><button class="btn-secondary" onclick="window.App.hostReturnToLobby()" style="flex:1;">Lobby</button></div>`;}
 html+=`</div>`;container.innerHTML=html;
 const mmBtn=document.getElementById('btn-submit-mindmeld');if(mmBtn){mmBtn.addEventListener('click',()=>{const val=document.getElementById('mindmeld-input').value.trim();if(val)this.submitChoice(val);else alert('Enter a word!');});}
 const truthBtn=document.getElementById('btn-submit-truth');if(truthBtn){truthBtn.addEventListener('click',()=>{const val=document.getElementById('truth-input').value.trim()||'Answered Live';this.submitChoice(val);});}
}
handleBlindRankSelect(slotIdx,itemText){this.blindRankSelections[slotIdx]=itemText;this.blindRankStep++;if(this.blindRankStep>=5){this.submitChoice(JSON.stringify(this.blindRankSelections));}else{this.renderScreen();}}
renderComparison(container){
 const prompt=this.roomData.current_prompt||{};const gameType=this.roomData.game_type;const choices=this.roomData.choices||{};const players=this.roomData.players||[];const p1=players[0]||{id:this.myUid,name:this.myName||'Player 1'};const p2=players[1]||{id:'p2',name:'Partner'};const c1=choices[p1.id];const c2=choices[p2.id];
 let isMatch=false;
 if(c1!==undefined&&c2!==undefined){
  if(gameType==='wouldRather'||gameType==='redGreenFlag'||gameType==='compatQuiz'||gameType==='hotTakes'||gameType==='bucketList'||gameType==='truthOrDare'){isMatch=(String(c1).trim()===String(c2).trim());}
  else if(gameType==='mindMeld'){isMatch=(String(c1).toLowerCase().trim()===String(c2).toLowerCase().trim());}
  else if(gameType==='vibeSlider'||gameType==='percentage'){isMatch=(Math.abs(Number(c1)-Number(c2))<=15);}
  else if(gameType==='secretGuess'){if(prompt.target){isMatch=(String(c1).toLowerCase()===String(prompt.target).toLowerCase()&&String(c2).toLowerCase()===String(prompt.target).toLowerCase());}else{isMatch=(String(c1).trim()===String(c2).trim());}}
  else if(gameType==='blindRank'){isMatch=(String(c1)===String(c2));}
 }
 if(isMatch&&window.confetti){window.confetti({particleCount:70,spread:70,origin:{y:0.6}});}
 if(this.isHost){const cur=this.roomData.streak||0;if(isMatch)this.updateStreak(cur+1);else this.updateStreak(0);}
 let html=`<div class="glass-card animate-fade" style="text-align:center;"><div class="match-box" style="padding:20px;border-radius:16px;margin-bottom:20px;background:${isMatch?'rgba(0,230,118,0.15)':'rgba(255,23,68,0.15)'};border:2px solid ${isMatch?'#00E676':'#FF1744'};"><h1 style="font-size:1.8rem;margin-bottom:6px;">${isMatch?'&#127881; PERFECT MATCH!':'&#128148; NOT A MATCH'}</h1><p style="opacity:0.9;">${isMatch?'Same wavelength!':'Different vibes this time!'}</p></div><h3 style="margin-bottom:16px;">Revealed Answers</h3>`;
 if(gameType==='secretGuess'&&prompt.target){html+=`<div class="badge-pill" style="margin-bottom:14px;background:rgba(0,229,255,0.2);">Secret Target Was: ${prompt.target}</div>`;}
 html+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;"><div class="glass-card" style="padding:16px;"><div style="font-size:0.85rem;opacity:0.8;margin-bottom:6px;">${p1.name}</div><div style="font-size:1.1rem;font-weight:800;color:var(--secondary);word-break:break-word;">${c1!==undefined?c1:'No answer'}</div></div><div class="glass-card" style="padding:16px;"><div style="font-size:0.85rem;opacity:0.8;margin-bottom:6px;">${p2.name}</div><div style="font-size:1.1rem;font-weight:800;color:var(--primary);word-break:break-word;">${c2!==undefined?c2:'No answer'}</div></div></div>`;
 if(!isMatch&&(this.roomData.streak>=2)){const dare=window.Picker?window.Picker.nextItem('dares'):{text:"Do a funny dance!"};html+=`<div class="penalty-box" style="margin-bottom:24px;padding:18px;border-radius:14px;background:rgba(255,46,147,0.2);border:1px solid var(--primary);"><div class="badge-pill" style="background:var(--primary);color:#fff;margin-bottom:8px;">&#9888;&#65039; STREAK PENALTY DARE</div><p style="font-size:1rem;font-weight:700;color:#fff;">${dare.text||dare}</p></div>`;}
 if(this.isHost){html+=`<div style="display:flex;gap:12px;margin-top:20px;"><button class="btn-primary" onclick="window.App.hostNextRound()" style="flex:1;">Next Round &#10140;</button><button class="btn-secondary" onclick="window.App.hostReturnToLobby()" style="flex:1;">Change Game</button></div>`;}else{html+=`<div style="margin-top:20px;text-align:center;"><p style="opacity:0.8;font-size:0.9rem;">Waiting for host to start next round...</p></div>`;}
 html+=`</div>`;container.innerHTML=html;
}
}
window.addEventListener('DOMContentLoaded',()=>{window.App=new DuoVibeApp();window.App.init();});