(function() {
"use strict";

function esc(v){ return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }

const CONFIG = (window.CONFIG && window.CONFIG.SUPABASE_URL) ? window.CONFIG : {SUPABASE_URL:"https://euqrzxxldlsbhuyjuleo.supabase.co",SUPABASE_ANON_KEY:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...REDACTED..."};
const sbClient = window.supabase ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY) : null;

window.App = {
  myId:"user_"+Math.random().toString(36).slice(2,9),
  myName: localStorage.getItem("duo_my_name") || ("Player "+Math.floor(Math.random()*100)),
  roomCode:null,
  activeGame:null,
  gameState:{choices:{}},
  channel:null,
  peers:{},

  init(){
    localStorage.setItem("duo_my_name",this.myName);
    this.renderHome();
    document.getElementById("conn-status").textContent = "ONLINE";
    document.getElementById("conn-status").className = "status-badge live";
  },

  renderHome(){
    const c=document.getElementById("main-content");
    c.innerHTML=`
      <div class="home-card">
        <h2>Welcome to DuoVibe 💕</h2>
        <p>Play 11 real-time couple and group games.</p>
        <div style="margin-top:18px;">
          <label style="font-size:13px;font-weight:900;color:#666;">Your Name</label>
          <input id="input-my-name" value="${esc(this.myName)}" class="game-input" placeholder="Your name" />
        </div>
        <div style="margin-top:18px;">
          <button class="btn-primary" onclick="App.createRoom()">✨ Create Room</button>
          <div class="divider">OR JOIN</div>
          <div style="display:flex;gap:8px;">
            <input id="input-room-code" placeholder="6-DIGIT CODE" class="game-input" style="text-transform:uppercase;letter-spacing:2px;text-align:center;" maxlength="6"/>
            <button class="btn-secondary" onclick="App.joinRoomWithCode()" style="width:100px;">Join</button>
          </div>
        </div>
      </div>`;
  },

  saveName(){
    const el=document.getElementById("input-my-name");
    if(el && el.value.trim()){ this.myName=el.value.trim(); localStorage.setItem("duo_my_name",this.myName); }
  },

  createRoom(){
    this.saveName();
    const code=Math.floor(100000+Math.random()*900000).toString();
    this.joinRoom(code);
  },

  joinRoomWithCode(){
    this.saveName();
    const el=document.getElementById("input-room-code");
    const code=el?el.value.replace(/\D/g,""):"";
    if(code.length===6) this.joinRoom(code); else alert("Enter valid 6-digit code.");
  },

  async insertOrUpdateRoom(){
    if(!sbClient||!this.roomCode) return;
    try{
      await sbClient.from("rooms").upsert({
        id:this.roomCode,
        player1:{id:this.myId,name:this.myName},
        current_game:this.activeGame||"",
        game_state:this.gameState||{},
        updated_at:new Date().toISOString()
      },{onConflict:"id"});
    }catch(e){ console.error("DB upsert",e); }
  },

  async fetchRoomDB(){
    if(!sbClient||!this.roomCode) return null;
    try{
      const {data,error}=await sbClient.from("rooms").select("*").eq("id",this.roomCode).single();
      if(data) return data;
    }catch(e){ return null; }
    return null;
  },

  async joinRoom(code){
    this.saveName(); this.roomCode=code; this.activeGame=null; this.gameState={choices:{}};
    await this.insertOrUpdateRoom();
    this.renderLobby();

    if(!sbClient){ alert("Supabase unavailable. Please reload page."); return; }

    if(this.channel){ try{ sbClient.removeChannel(this.channel); }catch(e){} }

    const chName="duovibe_room_"+code;
    this.channel=sbClient.channel(chName,{config:{presence:{key:this.myId}}});

    this.channel
      .on("presence",{event:"sync"},()=>{ this.peers=this.channel.presenceState(); const c=Object.values(this.peers).reduce((a,v)=>a+(Array.isArray(v)?v.length:1),0); document.getElementById("conn-status").textContent="LIVE ("+c+")"; this.renderPlayers(); })
      .on("broadcast",{event:"GAME_START"},({payload})=>{ if(!payload||payload.roomCode!==this.roomCode) return; this.activeGame=payload.activeGame; this.gameState=payload.state||{choices:{}}; this.renderActiveGame(); })
      .on("broadcast",{event:"GAME_EVENT"},({payload})=>{ if(!payload||payload.roomCode!==this.roomCode) return; if(payload.event==="choice"){ if(!this.gameState.choices) this.gameState.choices={}; this.gameState.choices[payload.playerId]=payload.value; } this.renderActiveGame(); if(window.confetti && Object.keys(this.gameState.choices||{}).length>=2) window.confetti({particleCount:50,spread:60,origin:{y:0.7}}); })
      .subscribe(async (status)=>{
        if(status==="SUBSCRIBED"){
          this.channel.track({id:this.myId,name:this.myName});
          document.getElementById("conn-status").className="status-badge live";
          document.getElementById("conn-status").textContent="LIVE";

          const dbRow=await this.fetchRoomDB();
          if(dbRow && dbRow.current_game && dbRow.current_game!==""){ this.activeGame=dbRow.current_game; this.gameState=dbRow.game_state||{choices:{}}; this.renderActiveGame(); }
          else{ if(this.activeGame) this.renderActiveGame(); else this.renderLobby(); }
        }
      });
  },

  renderLobby(){
    const c=document.getElementById("main-content");
    if(!c) return;
    c.innerHTML=`
      <div class="lobby-card">
        <div class="lobby-header-bar">
          <div><span class="room-label">ROOM CODE</span><h2 class="room-code-display">${this.roomCode}</h2></div>
          <button class="btn-primary" style="width:auto;min-height:36px;padding:6px 12px;" onclick="navigator.clipboard.writeText('${this.roomCode}'); alert('Copied!');">📋 Copy</button>
        </div>
        <div style="margin:16px 0;">
          <label style="font-size:11px;font-weight:900;color:#8E8E93;letter-spacing:1px;">PLAYERS IN ROOM</label>
          <div id="connected-players-list" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;"><span class="player-tag">🟢 ${esc(this.myName)} (You)</span></div>
        </div>
        <h3 style="margin-top:20px;">Select a Game</h3>
        <div class="games-grid-container">
          <div class="game-card" onclick="App.startGame('would-rather')">⚖️ Would You Rather</div>
          <div class="game-card" onclick="App.startGame('this-or-that')">🔄 This or That</div>
          <div class="game-card" onclick="App.startGame('red-green-flag')">🚩 Red/Green Flag</div>
          <div class="game-card" onclick="App.startGame('couple-compat')">💖 Compatibility Quiz</div>
          <div class="game-card" onclick="App.startGame('word-letters')">🔤 First/Last Letter</div>
          <div class="game-card" onclick="App.startGame('categories-bomb')">💣 Pass The Bomb</div>
          <div class="game-card" onclick="App.startGame('guess-age')">📅 Guess The Year</div>
          <div class="game-card" onclick="App.startGame('guess-number')">🔢 Guess Number</div>
          <div class="game-card" onclick="App.startGame('guess-celeb')">⭐ Guess Celebrity</div>
          <div class="game-card" onclick="App.startGame('blind-rank')">🙈 Blind Rank</div>
          <div class="game-card" onclick="App.startGame('truths-lie')">🤫 2 Truths 1 Lie</div>
        </div>
      </div>`;

    if(this.peers){
      const names=[`🟢 ${esc(this.myName)} (You)`];
      Object.keys(this.peers).forEach(k=>{ const p=this.peers[k]; if(p&&p[0]&&p[0].name&&p[0].id!==this.myId) names.push(`🟢 ${esc(p[0].name)}`); });
      const el=document.getElementById("connected-players-list");
      if(el) el.innerHTML=names.map(n=>`<span class="player-tag">${n}</span>`).join("");
    }
  },

  renderPlayers(){
    const el=document.getElementById("connected-players-list");
    if(!el) return;
    const names=[`🟢 ${esc(this.myName)} (You)`];
    if(this.peers){
      Object.keys(this.peers).forEach(k=>{ const p=this.peers[k]; if(p&&p[0]&&p[0].name&&p[0].id!==this.myId) names.push(`🟢 ${esc(p[0].name)}`); });
    }
    el.innerHTML=names.map(n=>`<span class="player-tag">${n}</span>`).join("");
  },

  startGame(gameId){
    this.activeGame=gameId;
    this.gameState={choices:{}, currentPrompt:null, rankSet:null, clueIdx:0};

    if(window.BANKS && window.Picker){
      if(gameId==="would-rather" || gameId==="will-rather") this.gameState.currentPrompt=window.Picker.nextItem("wouldRather", window.BANKS.wouldRather||[]);
      else if(gameId==="this-or-that") this.gameState.currentPrompt=window.Picker.nextItem("thisOrThat", window.BANKS.thisOrThat||[]);
      else if(gameId==="red-green-flag") this.gameState.currentPrompt=window.Picker.nextItem("redGreenFlag", window.BANKS.redGreenFlag||[]);
      else if(gameId==="couple-compat") this.gameState.currentPrompt=window.Picker.nextItem("compatQuiz", window.BANKS.compatQuiz||[]);
      else if(gameId==="word-letters") this.gameState.currentPrompt=window.Picker.nextItem("letterPrompts", window.BANKS.letterPrompts||[]);
      else if(gameId==="categories-bomb") this.gameState.currentPrompt=window.Picker.nextItem("bombCategories", window.BANKS.bombCategories||[]);
      else if(gameId==="guess-age") this.gameState.currentPrompt=window.Picker.nextItem("guessAge", window.BANKS.guessAge||[]);
      else if(gameId==="guess-celeb"){ this.gameState.currentPrompt=window.Picker.nextItem("guessCeleb", window.BANKS.guessCeleb||[]); this.gameState.clueIdx=0; }
      else if(gameId==="guess-number") this.gameState.currentPrompt={secret:window.Picker.freshNumber(1,100)};
      else if(gameId==="blind-rank") this.gameState.rankSet=window.Picker.freshBlindRankSet(5);
      else if(gameId==="truths-lie") this.gameState.currentPrompt={mode:"truths-lie"};
    }

    this.insertOrUpdateRoom();
    if(this.channel){
      this.channel.send({
        type:"broadcast",
        event:"GAME_START",
        payload:{activeGame:this.activeGame, gameState:this.gameState, roomCode:this.roomCode}
      });
    }
    this.renderActiveGame();
  },

  submitChoice(val){
    if(!this.activeGame) return;
    if(!val||String(val).trim()===""){ alert("Please select or enter an answer."); return; }
    if(!this.gameState.choices) this.gameState.choices={};
    this.gameState.choices[this.myId]=String(val).trim();

    this.insertEvent("choice_submit", {playerId:this.myId, gameId:this.activeGame, value:String(val).trim()});
    if(this.channel){
      this.channel.send({
        type:"broadcast",
        event:"GAME_EVENT",
        payload:{event:"choice", playerId:this.myId, value:String(val).trim(), roomCode:this.roomCode}
      });
    }
    this.renderActiveGame();
  },

  renderChoiceComparison(){
    const choices=this.gameState.choices||{};
    const keys=Object.keys(choices);
    if(keys.length===0) return `<div class="comparison-bar" style="text-align:center;color:#777;font-size:14px;">Waiting for both answers...</div>`;
    let html=`<div class="comparison-bar">`;
    keys.forEach(k=>{
      const name=(k===this.myId)?"You":(this.peers[k]&&this.peers[k][0]&&this.peers[k][0].name?this.peers[k][0].name:"Partner");
      html+=`<div class="choice-row"><strong>${name}:</strong><span>${esc(choices[k])}</span></div>`;
    });
    if(keys.length>=2){
      const match=keys.map(k=>choices[k]).every(v=>v===choices[keys[0]]);
      html+=`<div style="text-align:center;font-weight:900;margin-top:10px;color:${match?"#137333":"#C5221F"};">${match?"🎉 MATCH!":"🤝 Different answers"}</div>`;
    }
    html+=`</div>`;
    return html;
  },

  renderActiveGame(){
    const c=document.getElementById("main-content");
    if(!c) return;
    if(!this.activeGame){ this.renderLobby(); return; }

    let body="";
    const myChoice=(this.gameState.choices&&this.gameState.choices[this.myId])?this.gameState.choices[this.myId]:null;

    switch(this.activeGame){
      case "would-rather": case "will-rather": {
        const p=this.gameState.currentPrompt||{a:"A",b:"B"};
        body=`<h3>Would You Rather...</h3>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px;">
          <button class="btn-choice ${myChoice===p.a?"selected":""}" onclick="App.submitChoice('${esc(p.a||"A").replace(/'/g,"\\'")}')">${esc(p.a||"A")}</button>
          <div class="divider">OR</div>
          <button class="btn-choice ${myChoice===p.b?"selected":""}" onclick="App.submitChoice('${esc(p.b||"B").replace(/'/g,"\\'")}')">${esc(p.b||"B")}</button>
        </div>`; break; }
      case "this-or-that": {
        const p=this.gameState.currentPrompt||{a:"A",b:"B"};
        body=`<h3>This or That</h3>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px;">
          <button class="btn-choice ${myChoice===p.a?"selected":""}" onclick="App.submitChoice('${esc(p.a||"A").replace(/'/g,"\\'")}')">${esc(p.a||"A")}</button>
          <div class="divider">VS</div>
          <button class="btn-choice ${myChoice===p.b?"selected":""}" onclick="App.submitChoice('${esc(p.b||"B").replace(/'/g,"\\'")}')">${esc(p.b||"B")}</button>
        </div>`; break; }
      case "red-green-flag": {
        const p=this.gameState.currentPrompt||"Unknown scenario";
        body=`<h3>Red Flag or Green Flag? 🚩</h3>
        <p style="font-weight:600;font-size:16px;margin:16px 0;">"${esc(p)}</p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <button class="btn-choice ${myChoice==="Green Flag"?"selected":""}" onclick="App.submitChoice('Green Flag')">🟢 Green Flag</button>
          <button class="btn-choice ${myChoice==="Red Flag"?"selected":""}" onclick="App.submitChoice('Red Flag')">🚩 Red Flag</button>
        </div>`; break; }
      case "couple-compat": {
        const p=this.gameState.currentPrompt||"Unknown question";
        body=`<h3>Compatibility Quiz 💖</h3>
        <p style="font-weight:600;font-size:16px;margin:16px 0;">${esc(p)}</p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <button class="btn-choice ${myChoice==="ME"?"selected":""}" onclick="App.submitChoice('ME')">🙋‍♂️ Definitely Me</button>
          <button class="btn-choice ${myChoice==="PARTNER"?"selected":""}" onclick="App.submitChoice('PARTNER')">🙋‍♀️ Definitely Partner</button>
        </div>`; break; }
      case "word-letters": {
        const p=this.gameState.currentPrompt||{category:"Animals",letter:"A"};
        body=`<h3>First / Last Letter 🔤</h3>
        <p>Category: <strong>${esc(p.category||"")}</strong></p>
        <p>Word must start with: <strong style="font-size:20px;">'${esc(p.letter||"")}'</strong></p>
        <input type="text" id="game-val" placeholder="Type word..." class="game-input" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('game-val').value)" style="margin-top:10px;">Submit Word</button>`; break; }
      case "categories-bomb": {
        const p=this.gameState.currentPrompt||"Unknown";
        body=`<h3>Pass The Bomb 💣</h3>
        <p>Category: <strong>${esc(p)}</strong></p>
        <input type="text" id="game-val" placeholder="Type word fast..." class="game-input" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('game-val').value)" style="margin-top:10px;">PASS BOMB 💣</button>`; break; }
      case "guess-age": {
        const p=this.gameState.currentPrompt||{subject:"Unknown",answer:"2000"};
        body=`<h3>Guess The Year 📅</h3>
        <div style="background:#FAF9F7;border:1px solid #E8E6E3;padding:16px;border-radius:12px;text-align:center;font-weight:600;margin:12px 0;">"${esc(p.subject||"")}"</div>
        <input type="number" id="game-val" placeholder="Enter year..." class="game-input" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('game-val').value)" style="margin-top:10px;">Submit Guess</button>
        <button class="btn-secondary" onclick="alert('Correct Answer: '+(App.gameState.currentPrompt ? (App.gameState.currentPrompt.answer||App.gameState.currentPrompt.subject) : ''))" style="margin-top:8px;">Reveal Answer</button>`; break; }
      case "guess-number": {
        const guess=myChoice?parseInt(myChoice):null;
        const secret=this.gameState.currentPrompt ? (this.gameState.currentPrompt.secret||Math.floor(Math.random()*100)+1) : Math.floor(Math.random()*100)+1;
        if(this.gameState.currentPrompt&&!this.gameState.currentPrompt.secret) this.gameState.currentPrompt.secret=secret;
        let hint="";
        if(guess!==null&&!isNaN(guess)){ if(guess===secret) hint="🎉 CORRECT!"; else if(guess<secret) hint="📈 Higher"; else hint="📉 Lower"; }
        body=`<h3>Guess Secret Number (1-100) 🔢</h3>
        <input type="number" id="game-val" placeholder="Enter 1-100..." class="game-input" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('game-val').value)" style="margin-top:10px;">Submit Guess</button>
        ${myChoice?`<p style="font-weight:700;margin-top:12px;">Your Guess: ${myChoice} - <span style="color:#137333;">${hint}</span></p>`:""}`; break; }
      case "guess-celeb": {
        const p=this.gameState.currentPrompt||{clues:["Unknown"],answer:"Unknown"};
        const idx=this.gameState.clueIdx||0;
        const shown=(p.clues||[]).slice(0,idx+1);
        body=`<h3>Guess Celebrity ⭐</h3>
        <div style="background:#FAF9F7;border:1px solid #E8E6E3;padding:14px;border-radius:12px;margin:12px 0;">
          ${shown.map((c,i)=>`<p style="margin-bottom:6px;"><strong>Clue #${i+1}:</strong> ${esc(c)}</p>`).join("")}
        </div>
        ${idx<(p.clues||[]).length-1 ? `<button class="btn-secondary" onclick="App.gameState.clueIdx++; App.renderActiveGame();">Reveal Next Clue 💡</button>` : `<p style="font-size:13px;color:#777;">All clues revealed.</p>`}
        <input type="text" id="game-val" placeholder="Type answer..." class="game-input" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('game-val').value)" style="margin-top:10px;">Submit Guess</button>
        <button class="btn-secondary" onclick="alert('Correct Answer: '+(App.gameState.currentPrompt ? (App.gameState.currentPrompt.answer||'Unknown') : 'Unknown'))" style="margin-top:8px;">Reveal Answer</button>`; break; }
      case "blind-rank": {
        const items=this.gameState.rankSet||[];
        body=`<h3>Blind Rank 🙈</h3>
        <p style="font-size:13px;color:#666;">Rank 1 (best) to ${items.length} (least best):</p>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:14px;">
          ${items.map((item,i)=>`
            <div style="background:#FAF9F7;border:1px solid #E8E6E3;padding:10px 14px;border-radius:10px;display:flex;justify-content:space-between;font-weight:600;">
              <span>${esc(item)}</span>
              <button class="btn-secondary" style="width:auto;min-height:36px;padding:4px 10px;font-size:12px;" onclick="App.submitChoice('Ranked #${i+1}: ${esc(item)}')">Rank #${i+1}</button>
            </div>`).join("")}
        </div>`; break; }
      case "truths-lie": {
        body=`<h3>2 Truths 1 Lie 🤫</h3>
        <p style="font-size:13px;color:#666;">Write two truths and one lie:</p>
        <input type="text" id="t1" class="game-input" placeholder="Truth #1" style="margin-top:8px;" />
        <input type="text" id="t2" class="game-input" placeholder="Truth #2" style="margin-top:8px;" />
        <input type="text" id="lie" class="game-input" placeholder="The Lie" style="margin-top:8px;" />
        <button class="btn-action" onclick="App.submitChoice('Truth 1: '+document.getElementById('t1').value+' | Truth 2: '+document.getElementById('t2').value+' | Lie: '+document.getElementById('lie').value)" style="margin-top:12px;">Submit Statements</button>`; break; }
      default: body=`<h3>Game: ${esc(this.activeGame)}</h3><p>Submit your answer.</p>`;
    }

    c.innerHTML=`
      <div class="dilemma-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <button class="btn-secondary" onclick="App.exitGame()" style="width:auto;min-height:36px;padding:6px 14px;">← Lobby</button>
          <span style="font-weight:900;font-size:12px;text-transform:uppercase;color:#8E8E93;">Live Room</span>
        </div>
        ${body}
        ${this.renderChoiceComparison()}
        <button class="btn-action" onclick="App.startGame('${this.activeGame}')" style="margin-top:16px;">Next Round →</button>
      </div>
    `;
  },

  exitGame(){
    this.activeGame=null;
    this.gameState={choices:{}};
    this.insertOrUpdateRoom();
    if(this.channel){
      this.channel.send({type:"broadcast",event:"GAME_START",payload:{activeGame:null,roomCode:this.roomCode}});
    }
    this.renderLobby();
  }
};

document.addEventListener("DOMContentLoaded", ()=>{ window.App.init(); });
})();