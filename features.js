window.Features = {
  toggleCallWidget: function() {
    var el = document.getElementById("call-widget");
    if (el) { el.remove(); return; }
    var widget = document.createElement("div");
    widget.id = "call-widget";
    widget.innerHTML = '<div style="position:fixed;bottom:100px;right:16px;width:300px;height:220px;background:#fff;border:1px solid #E8E6E3;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.15);z-index:99999;padding:12px;"><strong>Call (Jitsi)</strong><br><iframe src="https://meet.jit.si/DuoVibeRoom" style="width:100%;height:160px;border:0;border-radius:8px;" allow="camera;microphone" title="Call"></iframe></div>';
    document.body.appendChild(widget);
  }
};