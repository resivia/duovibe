/* ═══════════════════════════════════════════════════════════════════
   DUOVIBE V2 FEATURES
   📹 Video Chat | 💭 Daily Q | 🎵 Spotify | 🔔 Push | 📊 Stats | 📸 Photos
   ═══════════════════════════════════════════════════════════════════ */

const DAILY_QUESTIONS = [
  "What's one thing I did this week that made you smile?",
  "If we could teleport anywhere right now, where would we go?",
  "What's a secret dream you've never told anyone?",
  "What small thing about me do you love most?",
  "If you could relive one day with me, which would it be?",
  "What's your favorite memory of us so far?",
  "What's one thing you want us to do together this year?",
  "What makes you feel most loved by me?",
  "If we had a whole free weekend together, what would be the perfect plan?",
  "What's something you've always wanted to tell me but haven't?",
  "What's your love language and how can I show it better?",
  "What's one adventure you want us to go on?",
  "What do you miss most about me when we're apart?",
  "What's a tradition you want us to start?",
  "What's the first thing you'd do if we lived together?",
  "What song reminds you of us?",
  "What's the best gift you could ever receive from me?",
  "What's one habit of mine that makes you happy?",
  "Where do you see us in 5 years?",
  "What's your favorite thing about our relationship?",
  "What's one goal we should work on together?",
  "What's the most romantic thing I could do for you?",
  "What movie describes our love story?",
  "What's your perfect date night with me?",
  "What's one thing I say that always makes you laugh?",
  "If you could add any superpower to our relationship, what would it be?",
  "What's a food you'd love to cook together?",
  "What's your favorite physical feature of mine?",
  "What's one thing we're really good at as a couple?",
  "If we wrote a book about us, what would the title be?"
];

const Features = {
  // ═════════════════════════════════════════════════════════════
  // 📹 VIDEO CHAT (using Daily.co free embed)
  // ═════════════════════════════════════════════════════════════
  video: {
    isOpen: false,
    callFrame: null,
    minimized: false,

    async start() {
      if (this.isOpen) { this.toggle(); return; }
      
      if (!App.roomId) {
        App.toast('Join a room first!', 'error');
        return;
      }

      // Load Daily.co script
      if (!window.DailyIframe) {
        await this.loadDaily();
      }

      this.createVideoPanel();
      
      try {
        const roomName = 'duovibe-' + App.roomId.toLowerCase();
        const roomUrl = `https://duovibe.daily.co/${roomName}`;
        
        this.callFrame = window.DailyIframe.createFrame(document.getElementById('video-container'), {
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: '0',
            borderRadius: '14px'
          },
          showLeaveButton: false,
          showFullscreenButton: true,
        });

        // Fallback: create ephemeral room on-the-fly
        await this.callFrame.join({ 
          url: roomUrl,
          userName: App.myName
        }).catch(async () => {
          // Room doesn't exist, use fallback approach
          App.toast('Setting up video room...', 'info');
          const fallbackUrl = `https://meet.jit.si/duovibe-${App.roomId}`;
          document.getElementById('video-container').innerHTML = `
            <iframe src="${fallbackUrl}" 
              allow="camera; microphone; fullscreen; display-capture; autoplay" 
              style="width:100%;height:100%;border:none;border-radius:14px;">
            </iframe>
          `;
        });

        this.isOpen = true;
      } catch(e) {
        console.error('Video error:', e);
        // Fallback to Jitsi (no API key needed, 100% free)
        document.getElementById('video-container').innerHTML = `
          <iframe src="https://meet.jit.si/duovibe-${App.roomId}" 
            allow="camera; microphone; fullscreen; display-capture; autoplay" 
            style="width:100%;height:100%;border:none;border-radius:14px;">
          </iframe>
        `;
        this.isOpen = true;
      }
    },

    loadDaily() {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@daily-co/daily-js';
        script.onload = resolve;
        script.onerror = resolve; // Will fallback to Jitsi
        document.head.appendChild(script);
      });
    },

    createVideoPanel() {
      const existing = document.getElementById('video-panel');
      if (existing) existing.remove();

      const panel = document.createElement('div');
      panel.id = 'video-panel';
      panel.innerHTML = `
        <div class="video-header">
          <div class="video-title">📹 Face-to-Face</div>
          <div class="video-controls">
            <button onclick="Features.video.toggleMinimize()" class="video-btn" title="Minimize">—</button>
            <button onclick="Features.video.close()" class="video-btn" title="Close">✕</button>
          </div>
        </div>
        <div id="video-container"></div>
      `;
      document.body.appendChild(panel);
    },

    toggle() {
      const panel = document.getElementById('video-panel');
      if (panel) {
        panel.classList.toggle('video-hidden');
        this.isOpen = !panel.classList.contains('video-hidden');
      }
    },

    toggleMinimize() {
      const panel = document.getElementById('video-panel');
      if (panel) {
        this.minimized = !this.minimized;
        panel.classList.toggle('video-minimized', this.minimized);
      }
    },

    close() {
      if (this.callFrame) {
        try { this.callFrame.destroy(); } catch(e) {}
        this.callFrame = null;
      }
      const panel = document.getElementById('video-panel');
      if (panel) panel.remove();
      this.isOpen = false;
      App.toast('Video call ended', 'info');
    }
  },

  // ═════════════════════════════════════════════════════════════
  // 💭 DAILY LOVE QUESTION
  // ═════════════════════════════════════════════════════════════
  dailyQ: {
    todayQuestion: null,
    myAnswer: null,
    partnerAnswer: null,

    async load() {
      if (!App.roomId) return;
      
      const today = new Date().toISOString().split('T')[0];
      const { data } = await sb
        .from('daily_questions')
        .select('*')
        .eq('room_id', App.roomId)
        .eq('question_date', today)
        .maybeSingle();

      if (data) {
        this.todayQuestion = data;
      } else {
        // Create today's question
        const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % DAILY_QUESTIONS.length;
        const questionText = DAILY_QUESTIONS[dayIndex];
        const { data: newQ } = await sb
          .from('daily_questions')
          .insert({
            room_id: App.roomId,
            question_date: today,
            question_text: questionText
          })
          .select()
          .single();
        this.todayQuestion = newQ;
      }
      this.render();
    },

    render() {
      if (!this.todayQuestion) return;
      
      const q = this.todayQuestion;
      const myKey = 'p' + App.myPlayerNum + '_answer';
      const partnerKey = 'p' + (App.myPlayerNum === 1 ? 2 : 1) + '_answer';
      
      const myAnswer = q[myKey];
      const partnerAnswer = q[partnerKey];
      const bothAnswered = q.p1_answer && q.p2_answer;

      const existing = document.getElementById('daily-q-modal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'daily-q-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content fade-in visible">
          <button onclick="Features.dailyQ.close()" class="modal-close">✕</button>
          <div class="daily-q-header">
            <span class="tag tag-rose">💭 Daily Question</span>
            <h2 class="font-heading font-black text-xl mt-2">${q.question_text}</h2>
            <p class="text-xs" style="color:var(--text-tertiary);margin-top:4px;">
              ${new Date(q.question_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div class="divider mt-3"></div>
          ${!myAnswer ? `
            <div class="mt-3">
              <label class="text-xs font-bold" style="color:var(--text-secondary);">Your answer:</label>
              <textarea id="daily-answer" class="input mt-2" rows="4" placeholder="Share your thoughts..." style="font-family:inherit;resize:vertical;"></textarea>
              <button onclick="Features.dailyQ.submit()" class="btn btn-primary btn-full mt-3">Share Answer 💕</button>
            </div>
          ` : !bothAnswered ? `
            <div class="mt-3">
              <div class="love-note">
                <div class="love-note-header">You wrote</div>
                <div class="love-note-body">${this.esc(myAnswer)}</div>
              </div>
              <div class="text-center mt-3" style="color:var(--text-tertiary);">
                <div class="waiting-spinner" style="margin:0 auto;"></div>
                <p class="text-xs mt-2">Waiting for ${App.players[App.myPlayerNum === 1 ? 'p2' : 'p1']?.name || 'partner'}...</p>
              </div>
            </div>
          ` : `
            <div class="mt-3 space-y-2">
              <div class="love-note" style="background:var(--accent-soft);border-color:rgba(232,54,78,0.2);">
                <div class="love-note-header">${App.players.p1?.avatar || '👩'} ${App.players.p1?.name || 'P1'}</div>
                <div class="love-note-body">${this.esc(q.p1_answer)}</div>
              </div>
              <div class="love-note" style="background:var(--purple-soft);border-color:rgba(124,92,252,0.2);">
                <div class="love-note-header" style="color:var(--purple);">${App.players.p2?.avatar || '👦'} ${App.players.p2?.name || 'P2'}</div>
                <div class="love-note-body">${this.esc(q.p2_answer)}</div>
              </div>
              <p class="text-xs text-center mt-3" style="color:var(--text-tertiary);">
                💕 Come back tomorrow for a new question
              </p>
            </div>
          `}
        </div>
      `;
      document.body.appendChild(modal);
    },

    async submit() {
      const textarea = document.getElementById('daily-answer');
      if (!textarea || !textarea.value.trim()) {
        App.toast('Please write an answer!', 'error');
        return;
      }

      const myKey = 'p' + App.myPlayerNum + '_answer';
      const myTimeKey = 'p' + App.myPlayerNum + '_answered_at';

      const { error } = await sb
        .from('daily_questions')
        .update({ 
          [myKey]: textarea.value.trim(),
          [myTimeKey]: new Date().toISOString()
        })
        .eq('id', this.todayQuestion.id);

      if (!error) {
        App.toast('Answer saved 💕', 'success');
        if (typeof Sound !== 'undefined') Sound.success();
        this.todayQuestion[myKey] = textarea.value.trim();
        this.render();
      }
    },

    close() {
      const modal = document.getElementById('daily-q-modal');
      if (modal) modal.remove();
    },

    esc(text) {
      const d = document.createElement('div');
      d.textContent = text || '';
      return d.innerHTML;
    }
  },

  // ═════════════════════════════════════════════════════════════
  // 🎵 SPOTIFY (Open Spotify link together)
  // ═════════════════════════════════════════════════════════════
  spotify: {
    currentUrl: null,

    open() {
      const existing = document.getElementById('spotify-modal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'spotify-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content fade-in visible">
          <button onclick="Features.spotify.close()" class="modal-close">✕</button>
          <div class="text-center">
            <span class="tag" style="background:#1DB954;color:white;">🎵 Spotify Together</span>
            <h2 class="font-heading font-black text-xl mt-2">Share Music 🎧</h2>
            <p class="text-xs mt-2" style="color:var(--text-tertiary);">
              Paste a Spotify link to play together
            </p>
          </div>
          <div class="mt-3 space-y-2">
            <input id="spotify-url" type="text" class="input" placeholder="https://open.spotify.com/track/..." />
            <button onclick="Features.spotify.play()" class="btn btn-primary btn-full" style="background:#1DB954;">
              ▶ Play For Both
            </button>
          </div>
          <div class="divider mt-3"></div>
          <div id="spotify-player" class="mt-3"></div>
          <p class="text-xs text-center mt-3" style="color:var(--text-tertiary);">
            Tip: Open Spotify → right click a song → Share → Copy Song Link
          </p>
        </div>
      `;
      document.body.appendChild(modal);

      // Load last shared song
      if (this.currentUrl) {
        this.renderPlayer(this.currentUrl);
      }
    },

    async play() {
      const input = document.getElementById('spotify-url');
      if (!input || !input.value.trim()) return;
      
      const url = input.value.trim();
      if (!url.includes('spotify.com')) {
        App.toast('Please paste a Spotify link!', 'error');
        return;
      }

      this.currentUrl = url;
      
      // Broadcast to partner
      await App.sendEvent('spotify', { url: url });
      this.renderPlayer(url);
      App.toast('🎵 Playing for both of us!', 'success');
    },

    renderPlayer(url) {
      // Convert Spotify URL to embed URL
      let embedUrl = url
        .replace('open.spotify.com/', 'open.spotify.com/embed/')
        .split('?')[0];
      
      const player = document.getElementById('spotify-player');
      if (player) {
        player.innerHTML = `
          <iframe src="${embedUrl}" 
            width="100%" height="152" frameborder="0" 
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style="border-radius:12px;">
          </iframe>
        `;
      }
    },

    handleIncoming(url) {
      this.currentUrl = url;
      App.toast('🎵 Partner shared a song!', 'success');
      if (!document.getElementById('spotify-modal')) {
        this.open();
      } else {
        this.renderPlayer(url);
      }
    },

    close() {
      const modal = document.getElementById('spotify-modal');
      if (modal) modal.remove();
    }
  },

  // ═════════════════════════════════════════════════════════════
  // 🔔 PUSH NOTIFICATIONS
  // ═════════════════════════════════════════════════════════════
  push: {
    async request() {
      if (!('Notification' in window)) {
        App.toast('Notifications not supported in this browser', 'error');
        return;
      }

      if (Notification.permission === 'granted') {
        App.toast('✅ Notifications already enabled!', 'success');
        this.updatePresence(true);
        return;
      }

      const result = await Notification.requestPermission();
      if (result === 'granted') {
        App.toast('🔔 Notifications enabled!', 'success');
        this.updatePresence(true);
        
        // Test notification
        new Notification('DuoVibe 💕', {
          body: 'You\'ll be notified when your partner is online!',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💕</text></svg>'
        });
      } else {
        App.toast('Notifications blocked. Enable in browser settings.', 'error');
      }
    },

    async updatePresence(isOnline) {
      if (!App.roomId || !App.myPlayerNum) return;
      await sb.from('presence').upsert({
        room_id: App.roomId,
        player_num: App.myPlayerNum,
        last_seen: new Date().toISOString(),
        is_online: isOnline
      });
    },

    notify(title, body) {
      if (Notification.permission === 'granted' && document.hidden) {
        new Notification(title, {
          body: body,
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💕</text></svg>',
          tag: 'duovibe'
        });
      }
    }
  },

  // ═════════════════════════════════════════════════════════════
  // 📊 GAME HISTORY & STATS
  // ═════════════════════════════════════════════════════════════
  stats: {
    async open() {
      if (!App.roomId) {
        App.toast('Join a room first!', 'error');
        return;
      }

      const { data: history } = await sb
        .from('game_history')
        .select('*')
        .eq('room_id', App.roomId)
        .order('played_at', { ascending: false })
        .limit(50);

      const stats = this.calculate(history || []);
      this.render(stats, history || []);
    },

    calculate(history) {
      const total = history.length;
      const p1Wins = history.filter(h => h.winner === 1).length;
      const p2Wins = history.filter(h => h.winner === 2).length;
      const ties = history.filter(h => h.winner === 0 || !h.winner).length;
      
      const favGame = {};
      history.forEach(h => {
        favGame[h.game_id] = (favGame[h.game_id] || 0) + 1;
      });
      const topGame = Object.keys(favGame).sort((a, b) => favGame[b] - favGame[a])[0];

      // Calculate days together using CONFIG
      let daysTogether = 0;
      try {
        const start = new Date(CONFIG.COUPLE_SINCE);
        daysTogether = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
      } catch(e) {}

      return { total, p1Wins, p2Wins, ties, topGame, daysTogether };
    },

    render(stats, history) {
      const existing = document.getElementById('stats-modal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'stats-modal';
      modal.className = 'modal-overlay';
      
      const p1 = App.players.p1 || {};
      const p2 = App.players.p2 || {};
      
      modal.innerHTML = `
        <div class="modal-content fade-in visible" style="max-width:420px;">
          <button onclick="Features.stats.close()" class="modal-close">✕</button>
          <div class="text-center">
            <span class="tag tag-purple">📊 Couple Stats</span>
            <h2 class="font-heading font-black text-xl mt-2">Our Journey Together 💕</h2>
          </div>
          
          <div class="stats-grid mt-3">
            <div class="stat-box">
              <div class="stat-value">${stats.daysTogether}</div>
              <div class="stat-label">Days Together</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${stats.total}</div>
              <div class="stat-label">Games Played</div>
            </div>
          </div>

          <div class="divider mt-3"></div>
          
          <h3 class="font-heading font-bold text-sm mt-3 mb-2">🏆 Wins Battle</h3>
          <div class="wins-bar">
            <div class="wins-fill p1" style="width:${stats.total > 0 ? (stats.p1Wins / stats.total * 100) : 50}%;">
              ${p1.avatar || '👩'} ${stats.p1Wins}
            </div>
            <div class="wins-fill p2" style="width:${stats.total > 0 ? (stats.p2Wins / stats.total * 100) : 50}%;">
              ${stats.p2Wins} ${p2.avatar || '👦'}
            </div>
          </div>

          ${stats.topGame ? `
            <div class="divider mt-3"></div>
            <h3 class="font-heading font-bold text-sm mt-3 mb-2">🎮 Most Played</h3>
            <div class="love-note">
              <div class="love-note-body">
                ${this.getGameEmoji(stats.topGame)} <strong>${this.getGameTitle(stats.topGame)}</strong>
              </div>
            </div>
          ` : ''}

          ${history.length > 0 ? `
            <div class="divider mt-3"></div>
            <h3 class="font-heading font-bold text-sm mt-3 mb-2">⏱️ Recent Games</h3>
            <div style="max-height:200px;overflow-y:auto;" class="space-y-2">
              ${history.slice(0, 10).map(h => `
                <div class="history-item">
                  <span>${this.getGameEmoji(h.game_id)} ${this.getGameTitle(h.game_id)}</span>
                  <span class="text-xs" style="color:var(--text-tertiary);">
                    ${h.winner === 1 ? p1.avatar + ' won' : h.winner === 2 ? p2.avatar + ' won' : 'tied'}
                  </span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
      document.body.appendChild(modal);
    },

    getGameEmoji(id) {
      const game = GAMES.find(g => g.id === id);
      return game ? game.emoji : '🎮';
    },

    getGameTitle(id) {
      const game = GAMES.find(g => g.id === id);
      return game ? game.title : id;
    },

    async record(gameId, winner, p1Score, p2Score) {
      if (!App.roomId) return;
      await sb.from('game_history').insert({
        room_id: App.roomId,
        game_id: gameId,
        winner: winner,
        p1_score: p1Score,
        p2_score: p2Score,
        rounds_played: 1
      });
    },

    close() {
      const modal = document.getElementById('stats-modal');
      if (modal) modal.remove();
    }
  },

  // ═════════════════════════════════════════════════════════════
  // 📸 PHOTO REACTIONS
  // ═════════════════════════════════════════════════════════════
  photo: {
    stream: null,

    async capture() {
      if (!App.roomId) {
        App.toast('Join a room first!', 'error');
        return;
      }

      const existing = document.getElementById('photo-modal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'photo-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content fade-in visible">
          <button onclick="Features.photo.close()" class="modal-close">✕</button>
          <div class="text-center">
            <span class="tag tag-rose">📸 Photo Reaction</span>
            <h2 class="font-heading font-black text-xl mt-2">Smile! 😄</h2>
            <p class="text-xs mt-2" style="color:var(--text-tertiary);">
              Capture your reaction for your partner
            </p>
          </div>
          
          <div id="camera-preview" class="camera-container mt-3">
            <video id="camera-video" autoplay playsinline muted></video>
          </div>

          <input id="photo-caption" type="text" class="input mt-3" placeholder="Add a caption... (optional)" maxlength="100" />

          <div class="flex gap-2 mt-3">
            <button onclick="Features.photo.snap()" class="btn btn-primary btn-full">📸 Capture & Send</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Request camera access
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 400, height: 400 },
          audio: false
        });
        const video = document.getElementById('camera-video');
        if (video) video.srcObject = this.stream;
      } catch(e) {
        App.toast('Camera access denied. Please allow in browser.', 'error');
        this.close();
      }
    },

    async snap() {
      const video = document.getElementById('camera-video');
      if (!video) return;

      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 400, 400);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      const caption = document.getElementById('photo-caption')?.value || '';

      const { error } = await sb.from('photo_reactions').insert({
        room_id: App.roomId,
        from_player: App.myPlayerNum,
        image_data: imageData,
        caption: caption,
        game_context: App.activeGameId || 'lobby'
      });

      if (!error) {
        App.toast('📸 Photo sent to your partner!', 'success');
        if (typeof Sound !== 'undefined') Sound.success();
        this.close();
      } else {
        App.toast('Failed to send photo', 'error');
      }
    },

    show(photo) {
      const existing = document.getElementById('photo-view-modal');
      if (existing) existing.remove();

      const player = photo.from_player === 1 ? App.players.p1 : App.players.p2;

      const modal = document.createElement('div');
      modal.id = 'photo-view-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content fade-in visible">
          <button onclick="document.getElementById('photo-view-modal').remove()" class="modal-close">✕</button>
          <div class="text-center">
            <span class="tag tag-rose">📸 ${player?.avatar || ''} ${player?.name || 'Partner'} sent you a photo!</span>
            <div class="photo-view mt-3">
              <img src="${photo.image_data}" alt="Reaction" />
            </div>
            ${photo.caption ? `
              <p class="mt-3 font-bold">${this.esc(photo.caption)}</p>
            ` : ''}
            <p class="text-xs mt-2" style="color:var(--text-tertiary);">
              ${new Date(photo.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      if (typeof Sound !== 'undefined') Sound.success();
    },

    close() {
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
      }
      const modal = document.getElementById('photo-modal');
      if (modal) modal.remove();
    },

    esc(text) {
      const d = document.createElement('div');
      d.textContent = text || '';
      return d.innerHTML;
    }
  },

  // ═════════════════════════════════════════════════════════════
  // INITIALIZE ALL FEATURES
  // ═════════════════════════════════════════════════════════════
  init() {
    // Subscribe to feature events via existing channel
    this.subscribeToUpdates();
    
    // Track presence
    if (App.roomId) {
      this.push.updatePresence(true);
      setInterval(() => this.push.updatePresence(true), 60000);
      window.addEventListener('beforeunload', () => this.push.updatePresence(false));
    }
  },

  subscribeToUpdates() {
    if (!App.roomId) return;
    
    // Hook into existing game_events subscription
    const originalHandler = App.handleGameEvent.bind(App);
    App.handleGameEvent = function(event) {
      originalHandler(event);
      
      // Handle feature-specific events
      if (event.event_type === 'spotify' && event.from_player !== App.myPlayerNum) {
        Features.spotify.handleIncoming(event.payload.url);
      }
    };

    // Subscribe to photo reactions
    sb.channel(`photos:${App.roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'photo_reactions',
        filter: `room_id=eq.${App.roomId}`
      }, (payload) => {
        if (payload.new.from_player !== App.myPlayerNum) {
          Features.photo.show(payload.new);
          Features.push.notify('📸 New photo!', 'Your partner sent you a reaction');
        }
      })
      .subscribe();

    // Subscribe to daily question updates
    sb.channel(`daily:${App.roomId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'daily_questions',
        filter: `room_id=eq.${App.roomId}`
      }, (payload) => {
        if (Features.dailyQ.todayQuestion && payload.new.id === Features.dailyQ.todayQuestion.id) {
          Features.dailyQ.todayQuestion = payload.new;
          Features.dailyQ.render();
        }
      })
      .subscribe();

    // Subscribe to presence changes
    sb.channel(`presence:${App.roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'presence',
        filter: `room_id=eq.${App.roomId}`
      }, (payload) => {
        if (payload.new && payload.new.player_num !== App.myPlayerNum && payload.new.is_online) {
          Features.push.notify('💕 Partner is online!', `${App.players['p' + payload.new.player_num]?.name || 'Partner'} just came online`);
        }
      })
      .subscribe();
  },

  // Render feature toolbar
  renderToolbar() {
    const existing = document.getElementById('feature-toolbar');
    if (existing) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'feature-toolbar';
    toolbar.innerHTML = `
      <button class="feature-btn" onclick="Features.video.start()" title="Video Chat">
        <span>📹</span><span class="feature-label">Video</span>
      </button>
      <button class="feature-btn" onclick="Features.dailyQ.load()" title="Daily Question">
        <span>💭</span><span class="feature-label">Daily Q</span>
      </button>
      <button class="feature-btn" onclick="Features.spotify.open()" title="Spotify">
        <span>🎵</span><span class="feature-label">Music</span>
      </button>
      <button class="feature-btn" onclick="Features.photo.capture()" title="Send Photo">
        <span>📸</span><span class="feature-label">Photo</span>
      </button>
      <button class="feature-btn" onclick="Features.stats.open()" title="Stats">
        <span>📊</span><span class="feature-label">Stats</span>
      </button>
      <button class="feature-btn" onclick="Features.push.request()" title="Notifications">
        <span>🔔</span><span class="feature-label">Notify</span>
      </button>
    `;
    document.body.appendChild(toolbar);
  }
};

// Auto-init when App is ready
if (typeof App !== 'undefined') {
  const originalRenderLobby = App.renderGameLobby;
  App.renderGameLobby = function() {
    originalRenderLobby.call(this);
    Features.init();
    Features.renderToolbar();
  };
}