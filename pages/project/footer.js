// =============================================================================
// D ONE — Project (CMS template) Page Footer JS
// =============================================================================
// Native HTML5 video player.
//
// Markup w Webflow Designerze: klasy .bunny-player + .bunny-player__* (reused
// historycznie z iteracji Bunny Stream, klasy są tylko CSS nazwami).
// Selektor root: [data-player-init]
// Atrybut źródła: [data-player-src] (bindowany do CMS field "Treść - video 1 URL")
// Image placeholder bindowany do CMS Image field "Treść - video 1 placeholder".
//
// Funkcjonalność: togglePlay / toggleMute / toggleFullscreen, scrubbable
// timeline z buffered bar, hover/idle (bottom bar znika po 3s idle podczas
// playing), state machine via standard video events.
//
// Bez HLS.js, bez Bunny Stream API, bez canvas capture. Czyste native video.
//
// UWAGA: Bunny Pull Zone CORS per-extension list musi zawierać rozszerzenia
// uploadowanych plików (mov/webm/m4v itd.) — default list ma tylko mp4/mpeg.
// Zob. .claude/memory/project_video_player_project_template.md.
// =============================================================================

(function () {
  function initVideoPlayer() {
    document.querySelectorAll('[data-player-init]:not([data-player-ready])').forEach(function (player) {
      player.setAttribute('data-player-ready', '1');

      var src = (player.getAttribute('data-player-src') || '').trim();
      if (!src) return;

      var video = player.querySelector('video');
      if (!video) return;

      video.src = src;
      video.preload = 'metadata';
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.playsInline = true;

      function setStatus(s) {
        if (player.getAttribute('data-player-status') !== s) player.setAttribute('data-player-status', s);
      }
      function setActivated(v) { player.setAttribute('data-player-activated', v ? 'true' : 'false'); }
      function setMutedAttr(v) { player.setAttribute('data-player-muted', v ? 'true' : 'false'); }
      function setFsAttr(v) { player.setAttribute('data-player-fullscreen', v ? 'true' : 'false'); }
      if (!player.hasAttribute('data-player-activated')) setActivated(false);
      if (!player.hasAttribute('data-player-status')) setStatus('idle');

      var initialMuted = player.getAttribute('data-player-muted') === 'true';
      video.muted = initialMuted;
      setMutedAttr(initialMuted);

      var timeline = player.querySelector('[data-player-timeline]');
      var progressBar = player.querySelector('[data-player-progress]');
      var bufferedBar = player.querySelector('[data-player-buffered]');
      var handle = player.querySelector('[data-player-timeline-handle]');
      var timeDurEls = player.querySelectorAll('[data-player-time-duration]');
      var timeCurrEls = player.querySelectorAll('[data-player-time-progress]');

      function pad2(n) { return (n < 10 ? '0' : '') + n; }
      function formatTime(sec) {
        if (!isFinite(sec) || sec < 0) return '00:00';
        var s = Math.floor(sec), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
        return h > 0 ? (h + ':' + pad2(m) + ':' + pad2(r)) : (pad2(m) + ':' + pad2(r));
      }
      function setText(nodes, text) { nodes.forEach(function (n) { n.textContent = text; }); }
      function safePlay() {
        var p = video.play();
        if (p && typeof p.then === 'function') p.catch(function () {});
      }

      function togglePlay() {
        if (video.paused || video.ended) { setStatus('loading'); safePlay(); }
        else { video.pause(); }
      }
      function toggleMute() { video.muted = !video.muted; setMutedAttr(video.muted); }
      function isFsActive() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
      function enterFs() {
        if (player.requestFullscreen) return player.requestFullscreen();
        if (video.requestFullscreen) return video.requestFullscreen();
        if (typeof video.webkitEnterFullscreen === 'function') return video.webkitEnterFullscreen();
      }
      function exitFs() {
        if (document.exitFullscreen) return document.exitFullscreen();
        if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
      }
      function toggleFs() { if (isFsActive() || video.webkitDisplayingFullscreen) exitFs(); else enterFs(); }

      document.addEventListener('fullscreenchange', function () { setFsAttr(isFsActive()); });
      document.addEventListener('webkitfullscreenchange', function () { setFsAttr(isFsActive()); });
      video.addEventListener('webkitbeginfullscreen', function () { setFsAttr(true); });
      video.addEventListener('webkitendfullscreen', function () { setFsAttr(false); });

      player.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-player-control]');
        if (!btn || !player.contains(btn)) return;
        var type = btn.getAttribute('data-player-control');
        if (type === 'play' || type === 'pause' || type === 'playpause') togglePlay();
        else if (type === 'mute') toggleMute();
        else if (type === 'fullscreen') toggleFs();
      });

      function updateTimes() {
        if (timeDurEls.length) setText(timeDurEls, formatTime(video.duration));
        if (timeCurrEls.length) setText(timeCurrEls, formatTime(video.currentTime));
      }
      video.addEventListener('timeupdate', updateTimes);
      video.addEventListener('loadedmetadata', function () { updateTimes(); setStatus(video.paused ? 'ready' : 'playing'); });
      video.addEventListener('durationchange', updateTimes);

      var rafId;
      function updateProgress() {
        if (!video.duration) return;
        var pct = (video.currentTime / video.duration) * 100;
        if (progressBar) progressBar.style.transform = 'translateX(' + (-100 + pct) + '%)';
        if (handle) handle.style.left = pct + '%';
      }
      function tick() {
        updateProgress();
        if (!video.paused && !video.ended) rafId = requestAnimationFrame(tick);
      }
      function updateBuffered() {
        if (!bufferedBar || !video.duration || !video.buffered.length) return;
        var end = video.buffered.end(video.buffered.length - 1);
        bufferedBar.style.transform = 'translateX(' + (-100 + (end / video.duration) * 100) + '%)';
      }
      video.addEventListener('progress', updateBuffered);
      video.addEventListener('loadedmetadata', updateBuffered);
      video.addEventListener('durationchange', updateBuffered);

      video.addEventListener('play', function () { setActivated(true); cancelAnimationFrame(rafId); tick(); setStatus('playing'); });
      video.addEventListener('playing', function () { setStatus('playing'); });
      video.addEventListener('pause', function () { cancelAnimationFrame(rafId); updateProgress(); setStatus('paused'); });
      video.addEventListener('waiting', function () { setStatus('loading'); });
      video.addEventListener('canplay', function () { if (player.getAttribute('data-player-status') === 'idle') setStatus('ready'); });
      video.addEventListener('ended', function () { cancelAnimationFrame(rafId); updateProgress(); setStatus('paused'); setActivated(false); });

      if (timeline) {
        var dragging = false, wasPlaying = false, targetTime = 0, rect = null, lastSeekTs = 0, seekThrottle = 180;
        window.addEventListener('resize', function () { if (!dragging) rect = null; });
        function getFraction(x) {
          if (!rect) rect = timeline.getBoundingClientRect();
          var f = (x - rect.left) / rect.width; if (f < 0) f = 0; if (f > 1) f = 1; return f;
        }
        function previewAt(f) {
          if (!video.duration) return;
          var pct = f * 100;
          if (progressBar) progressBar.style.transform = 'translateX(' + (-100 + pct) + '%)';
          if (handle) handle.style.left = pct + '%';
          if (timeCurrEls.length) setText(timeCurrEls, formatTime(f * video.duration));
        }
        function maybeSeek(now) {
          if (!video.duration || (now - lastSeekTs) < seekThrottle) return;
          lastSeekTs = now; video.currentTime = targetTime;
        }
        function onDown(e) {
          if (!video.duration) return;
          dragging = true; wasPlaying = !video.paused && !video.ended; if (wasPlaying) video.pause();
          player.setAttribute('data-timeline-drag', 'true'); rect = timeline.getBoundingClientRect();
          var f = getFraction(e.clientX); targetTime = f * video.duration; previewAt(f); maybeSeek(performance.now());
          timeline.setPointerCapture && timeline.setPointerCapture(e.pointerId);
          window.addEventListener('pointermove', onMove, { passive: false });
          window.addEventListener('pointerup', onUp, { passive: true });
          e.preventDefault();
        }
        function onMove(e) {
          if (!dragging) return;
          var f = getFraction(e.clientX); targetTime = f * video.duration; previewAt(f); maybeSeek(performance.now()); e.preventDefault();
        }
        function onUp() {
          if (!dragging) return;
          dragging = false; player.setAttribute('data-timeline-drag', 'false'); rect = null; video.currentTime = targetTime;
          if (wasPlaying) safePlay(); else { updateProgress(); updateTimes(); }
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        }
        timeline.addEventListener('pointerdown', onDown, { passive: false });
        if (handle) handle.addEventListener('pointerdown', onDown, { passive: false });
      }

      var hoverTimer, HIDE_DELAY = 3000, trackingMove = false;
      function setHover(state) { if (player.getAttribute('data-player-hover') !== state) player.setAttribute('data-player-hover', state); }
      function scheduleHide() { clearTimeout(hoverTimer); hoverTimer = setTimeout(function () { setHover('idle'); }, HIDE_DELAY); }
      function wake() { setHover('active'); scheduleHide(); }
      function onMoveGlobal(e) {
        var r = player.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) wake();
      }
      player.addEventListener('pointerdown', wake);
      player.addEventListener('pointerenter', function () {
        wake();
        if (!trackingMove) { trackingMove = true; window.addEventListener('pointermove', onMoveGlobal, { passive: true }); }
      });
      player.addEventListener('pointerleave', function () {
        setHover('idle'); clearTimeout(hoverTimer);
        if (trackingMove) { trackingMove = false; window.removeEventListener('pointermove', onMoveGlobal); }
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initVideoPlayer);
  else initVideoPlayer();
})();
