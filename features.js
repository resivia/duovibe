window.Features = window.Features || {};

window.Features.toggleCallWidget = function () {
  var existing = document.getElementById("duo-call-overlay");
  if (existing) {
    existing.remove();
    return;
  }

  var room = "DuoVibeRoom";
  try {
    if (window.App && window.App.roomCode) room = "DuoVibe_" + window.App.roomCode;
  } catch (e) {}

  var overlay = document.createElement("div");
  overlay.id = "duo-call-overlay";
  overlay.className = "duo-call-overlay";
  overlay.innerHTML =
    '<div class="duo-call-header">' +
      '<strong>Voice / Video Call</strong>' +
      '<button onclick="window.Features.toggleCallWidget()">Close</button>' +
    '</div>' +
    '<iframe title="DuoVibe Call" allow="camera; microphone; fullscreen; display-capture" src="https://meet.jit.si/' + encodeURIComponent(room) + '"></iframe>';

  document.body.appendChild(overlay);
};