window.Features = {
  callActive: false,
  
  toggleCallWidget() {
    let callBox = document.getElementById('duo-call-overlay');
    if (!callBox) {
      callBox = document.createElement('div');
      callBox.id = 'duo-call-overlay';
      callBox.className = 'call-overlay-floating';
      callBox.innerHTML = `
        <div class="call-overlay-header">
          <span>🎙️ Live Voice & Video Call</span>
          <button onclick="window.Features.toggleCallWidget()" class="close-call-btn">✕</button>
        </div>
        <div class="call-overlay-body">
          <iframe src="https://meet.jit.si/DuoVibeRoom_Couple_US_NG" allow="camera; microphone; display-capture; autoplay" style="width:100%; height:220px; border:none; border-radius:12px;"></iframe>
        </div>
      `;
      document.body.appendChild(callBox);
      this.callActive = true;
    } else {
      callBox.remove();
      this.callActive = false;
    }
  }
};