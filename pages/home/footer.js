// =============================================================================
// D ONE — Home Page Footer
// =============================================================================
// Inity per-page dla strony Home:
//   - initParallaxImageGalleryThumbnails (slideshow z observer)
//   - initFlipOnScroll (scaling element header flip)
//   - initLogoGrid (rotujące logos w gridzie)
//   - initHomeHeroVideoDelay (delayed start hero video po 3s)
// =============================================================================

(function () {
  if (typeof gsap !== 'undefined' && typeof Observer !== 'undefined' && typeof CustomEase !== 'undefined') {
    gsap.registerPlugin(Observer, CustomEase);
    if (!window.__slideshowWipeEase) {
      CustomEase.create('slideshow-wipe', '0.6, 0.08, 0.02, 0.99');
      window.__slideshowWipeEase = true;
    }
  }

  function initSlideShow(el) {
    var slides = Array.from(el.querySelectorAll('[data-slideshow="slide"]'));
    var thumbs = Array.from(el.querySelectorAll('[data-slideshow="thumb"]'));
    var inner = slides.map(function (slide) {
      return Array.from(slide.querySelectorAll('[data-slideshow="parallax"]'));
    });

    var current = 0;
    var length = slides.length;
    var animating = false;
    var observer;
    var animationDuration = 0.9;

    slides.forEach(function (slide, i) { slide.setAttribute('data-index', i); });
    thumbs.forEach(function (thumb, i) { thumb.setAttribute('data-index', i); });

    gsap.set(el, { position: 'relative', overflow: 'hidden' });
    gsap.set(slides, { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' });

    slides[current].classList.add('is--current');
    thumbs[current].classList.add('is--current');

    slides.forEach(function (slide, i) {
      if (i !== current) gsap.set(slide, { xPercent: 100 });
    });
    inner.forEach(function (innerGroup, i) {
      if (i !== current && innerGroup.length) gsap.set(innerGroup, { xPercent: -50 });
    });

    function navigateSlide(direction, targetIndex) {
      if (animating) return;
      animating = true;
      observer.disable();
      var previous = current;
      current =
        targetIndex !== null && targetIndex !== undefined
          ? targetIndex
          : direction === 1
            ? current < length - 1 ? current + 1 : 0
            : current > 0 ? current - 1 : length - 1;

      var currentSlide = slides[previous];
      var currentInners = inner[previous];
      var upcomingSlide = slides[current];
      var upcomingInners = inner[current];

      var tl = gsap.timeline({
        defaults: { duration: animationDuration, ease: 'slideshow-wipe' },
        onStart: function () {
          upcomingSlide.classList.add('is--current');
          thumbs[previous].classList.remove('is--current');
          thumbs[current].classList.add('is--current');
          upcomingSlide.querySelectorAll('video').forEach(function (v) {
            v.currentTime = 0;
            v.play().catch(function () {});
          });
        },
        onComplete: function () {
          currentSlide.classList.remove('is--current');
          currentSlide.querySelectorAll('video').forEach(function (v) {
            v.pause();
            v.currentTime = 0;
          });
          gsap.set(currentSlide, { xPercent: 100 });
          if (currentInners.length) gsap.set(currentInners, { xPercent: -50 });
          animating = false;
          setTimeout(function () { observer.enable(); }, animationDuration * 1000);
        },
      });

      tl.to(currentSlide, { xPercent: -direction * 100 }, 0)
        .fromTo(upcomingSlide, { xPercent: direction * 100 }, { xPercent: 0 }, 0);
      if (currentInners.length) {
        tl.to(currentInners, { xPercent: direction * 50 }, 0);
      }
      if (upcomingInners.length) {
        tl.fromTo(upcomingInners, { xPercent: -direction * 50 }, { xPercent: 0 }, 0);
      }
    }

    function onClick(event) {
      var targetIndex = parseInt(event.currentTarget.getAttribute('data-index'), 10);
      if (targetIndex === current || animating) return;
      navigateSlide(targetIndex > current ? 1 : -1, targetIndex);
    }

    thumbs.forEach(function (thumb) { thumb.addEventListener('click', onClick); });

    observer = Observer.create({
      target: el,
      type: 'wheel,touch,pointer',
      onLeft: function () { if (!animating) navigateSlide(1); },
      onRight: function () { if (!animating) navigateSlide(-1); },
      onWheel: function (event) {
        if (animating) return;
        if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
          if (event.deltaX > 50) navigateSlide(1);
          if (event.deltaX < -50) navigateSlide(-1);
        }
      },
      wheelSpeed: -1,
      tolerance: 10,
    });

    return {
      destroy: function () {
        if (observer) observer.kill();
        thumbs.forEach(function (thumb) { thumb.removeEventListener('click', onClick); });
      },
    };
  }

  window.initParallaxImageGalleryThumbnails = function (scope) {
    if (typeof gsap === 'undefined' || typeof Observer === 'undefined') return;
    var ctx = scope || document;

    ctx.querySelectorAll('[data-slideshow="wrap"]:not([data-slideshow-ready])').forEach(function (wrap) {
      wrap.setAttribute('data-slideshow-ready', '');
      var instance = initSlideShow(wrap);
      window._slideshowInstances = window._slideshowInstances || [];
      window._slideshowInstances.push(instance);
    });
  };
})();

window.initFlipOnScroll = function (scope) {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  var ctx = scope || document;

  var wrappers = Array.from(ctx.querySelectorAll("[data-flip-element='wrapper']"));
  var targetEl = ctx.querySelector("[data-flip-element='target']");
  var triggerEl = ctx.querySelector("[data-flip-element='trigger']");
  if (!wrappers.length || !targetEl || !triggerEl) return;
  if (triggerEl.dataset.flipReady) return;
  triggerEl.dataset.flipReady = '1';

  var stickyHeader =
    ctx.querySelector('.scaling-element-header') ||
    document.querySelector('.scaling-element-header');
  if (!stickyHeader) return;

  var tl;
  var resizeTimer;
  var ST_ID = 'flip-on-scroll';

  function buildTimeline() {
    if (tl) tl.kill();
    // Kill only own ST — Lumos ColorChanger targets the same trigger element
    // (`.section_home-project` has data-animate-theme-to="brand") and without
    // id-based filtering it would kill our flip ST.
    ScrollTrigger.getAll()
      .filter(function (st) { return st.vars.id === ST_ID; })
      .forEach(function (st) { st.kill(); });
    gsap.set(targetEl, { clearProps: 'all' });

    var stickyOff = stickyHeader.offsetTop;
    var shRect = stickyHeader.getBoundingClientRect();
    var w0Rect = wrappers[0].getBoundingClientRect();
    var startTop = Math.round(w0Rect.top - shRect.top);
    var startLeft = Math.round(w0Rect.left - shRect.left);

    var vw = window.innerWidth;
    var vh = window.innerHeight;

    gsap.set(targetEl, { zIndex: 1 });

    tl = gsap.timeline({
      scrollTrigger: {
        id: ST_ID,
        trigger: triggerEl,
        start: 'top -' + stickyOff + 'px',
        endTrigger: triggerEl,
        end: 'bottom 120%',
        scrub: 0,
      },
    });

    tl.to(targetEl, {
      top: -startTop,
      left: -startLeft,
      width: vw,
      height: vh,
      zIndex: 100,
      ease: 'none',
    });

    var extraEls = [];
    var navEl = ctx.querySelector('.img-slider__nav');
    if (navEl) extraEls.push(navEl);
    var btnWrap = ctx.querySelector('.scaling-video__button-wrap');
    if (btnWrap) extraEls.push(btnWrap);

    if (extraEls.length) {
      tl.fromTo(extraEls, { yPercent: 300 }, { yPercent: 0, ease: 'power2.out', duration: 0.22 }, 0.38);
    }
  }

  // KEY FIX: Refresh-w-środku-strony detection. Standardowy 'top top' rebuild
  // ScrollTrigger nie odpala onEnter jeśli scrollY już za start przy create
  // (= reload w środku). W tym przypadku initial buildTimeline mierzy wrapper
  // już w post-IX3-collapse stanie (106×106) → math poprawny od razu.
  // Bez tego warunku rebuild trigger byłby tworzony, nigdy nie odpaliłby, a stary
  // ScrollTrigger zostawałby z dryfowanym start (= scrollY zamiast trigger.absoluteTop).
  var triggerAbsTop = triggerEl.getBoundingClientRect().top + window.scrollY;

  buildTimeline();

  if (window.scrollY < triggerAbsTop) {
    // Fresh top load: initial build z stale 449×449 wrapper (pre-collapse),
    // rebuild przy 'top top' gdy IX3 collapse complete → poprawne wartości.
    if (!triggerEl.dataset.flipRebuildBound) {
      triggerEl.dataset.flipRebuildBound = '1';
      ScrollTrigger.create({
        id: ST_ID + '-rebuild',
        trigger: triggerEl,
        start: 'top top',
        once: true,
        onEnter: buildTimeline,
      });
    }
  }
  // else: refresh-w-środku — initial buildTimeline już z post-collapse wartościami,
  // rebuild trigger niepotrzebny.

  // Resize: rebuild. 100ms debounce.
  if (!window.__flipOnScrollResizeBound) {
    window.__flipOnScrollResizeBound = true;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(buildTimeline, 100);
    });
  }
};

/**
 * window.initHomeHeroVideoDelay(scope) — opóźnia start video [data-home-hero-video]
 * o 3 sekundy od momentu inita (= boot strony, po DOMContentLoaded → bootCustomAnimations).
 *
 * Działa niezależnie od stanu autoplay w HTML — jeśli browser już zaczął odtwarzać
 * przez autoplay attribute, init pause()uje natychmiast i resetuje currentTime do 0,
 * potem po 3s wywołuje play().
 *
 * Wymagania video tagu (Webflow Designer):
 *   - `muted` — wymagane dla programmatic .play() bez user interaction (browser
 *     autoplay policy). Bez muted Promise z .play() zostanie rejected.
 *   - `playsinline` — wymagane dla iOS (inaczej video startuje fullscreen).
 *   - `autoplay` — opcjonalne (i tak nadpisujemy logiką tutaj).
 *
 * Guard `data-hero-video-delay-ready` chroni przed double-bind.
 */
window.initHomeHeroVideoDelay = function (scope) {
  var ctx = scope || document;
  var DELAY_MS = 6000;

  ctx.querySelectorAll('[data-home-hero-video]').forEach(function (video) {
    if (video.dataset.heroVideoDelayReady) return;
    video.dataset.heroVideoDelayReady = '1';

    // Pause + reset — na wypadek gdyby browser już zaczął przez autoplay attribute.
    video.pause();
    try { video.currentTime = 0; } catch (e) {}

    setTimeout(function () {
      var p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function (err) {
          // Najczęstsza przyczyna: video nie ma `muted` (browser autoplay policy).
          console.warn('[initHomeHeroVideoDelay] play() rejected:', err && err.message);
        });
      }
    }, DELAY_MS);
  });
};

window.initLogoGrid = function (scope) {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  var ctx = scope || document;

  ctx.querySelectorAll('[data-logo-wall-cycle-init]:not([data-logo-grid-ready])').forEach(function (root) {
    root.setAttribute('data-logo-grid-ready', '');

    var DURATION = 0.9;
    var INTERVAL = 1500;
    var SLIDE = 60;

    var list = root.querySelector('[data-logo-wall-list]');
    var allItems = Array.from(list.querySelectorAll('[data-logo-wall-item]'));

    allItems.forEach(function (item) {
      item.querySelectorAll('img').forEach(function (img) {
        img.loading = 'eager';
        if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
        if (img.dataset.srcset) { img.srcset = img.dataset.srcset; img.removeAttribute('data-srcset'); }
      });
    });

    var visibleItems = allItems.filter(function (item) {
      return window.getComputedStyle(item).display !== 'none';
    });
    var SLOTS = visibleItems.length;
    if (!SLOTS) return;

    var allLogos = allItems
      .map(function (item) { return item.querySelector('[data-logo-wall-target]'); })
      .filter(Boolean);
    if (allLogos.length < SLOTS) return;

    var parents = visibleItems.map(function (item) {
      return item.querySelector('[data-logo-wall-target-parent]') || item;
    });

    allLogos.forEach(function (logo) { logo.remove(); });

    function shuffle(arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }

    var shuffled = shuffle(allLogos);
    var visible = shuffled.slice(0, SLOTS);
    var queue = shuffle(shuffled.slice(SLOTS));
    var busy = new Array(SLOTS).fill(false);
    var lastSwap = -1;

    visible.forEach(function (logo, i) { parents[i].appendChild(logo); });

    function swap(idx) {
      if (busy[idx] || !queue.length) return;
      busy[idx] = true;

      var outgoing = visible[idx];
      var incoming = queue.shift();

      gsap.killTweensOf(incoming);
      gsap.set(incoming, { clearProps: 'all' });
      gsap.set(incoming, { yPercent: SLIDE, autoAlpha: 0 });

      parents[idx].appendChild(incoming);

      if (outgoing) {
        gsap.killTweensOf(outgoing);
        gsap.to(outgoing, {
          yPercent: -SLIDE,
          autoAlpha: 0,
          duration: DURATION,
          ease: 'expo.inOut',
          onComplete: function () {
            gsap.set(outgoing, { clearProps: 'all' });
            outgoing.remove();
            queue.push(outgoing);
          },
        });
      }

      gsap.to(incoming, {
        yPercent: 0,
        autoAlpha: 1,
        duration: DURATION,
        ease: 'expo.inOut',
        onComplete: function () {
          visible[idx] = incoming;
          busy[idx] = false;
        },
      });
    }

    function tick() {
      if (!queue.length) return;
      var available = [];
      for (var i = 0; i < SLOTS; i++) {
        if (!busy[i]) available.push(i);
      }
      if (!available.length) return;
      var preferred = available.filter(function (i) { return i !== lastSwap; });
      var candidates = preferred.length ? preferred : available;
      var idx = candidates[Math.floor(Math.random() * candidates.length)];
      lastSwap = idx;
      swap(idx);
    }

    var timer = null;
    var inViewport = false;

    function updateTimer() {
      var run = inViewport && !document.hidden;
      if (run && !timer) timer = setInterval(tick, INTERVAL);
      if (!run && timer) { clearInterval(timer); timer = null; }
    }

    var st = ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onEnter: function () { inViewport = true; updateTimer(); },
      onLeave: function () { inViewport = false; updateTimer(); },
      onEnterBack: function () { inViewport = true; updateTimer(); },
      onLeaveBack: function () { inViewport = false; updateTimer(); },
    });

    document.addEventListener('visibilitychange', updateTimer);

    window._logoGridInstances = window._logoGridInstances || [];
    window._logoGridInstances.push({
      destroy: function () {
        if (timer) { clearInterval(timer); timer = null; }
        document.removeEventListener('visibilitychange', updateTimer);
        if (st) st.kill();
      },
    });
  });
};
