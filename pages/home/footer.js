// =============================================================================
// D ONE — Home Page Footer
// =============================================================================
// Inity per-page dla strony Home:
//   - initParallaxImageGalleryThumbnails (slideshow z observer)
//   - initFlipOnScroll (scaling element header flip)
//   - initLogoGrid (rotujące logos w gridzie)
//   - initHomeHeroVideoDelay (delayed start hero video po 6s)
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

    // Lazy/orientation helpers: tylko WIDOCZNA orientacja (display !== none) ładuje się/gra.
    function visibleVideos(slide) {
      return Array.prototype.slice.call(slide.querySelectorAll('video')).filter(function (v) {
        return window.getComputedStyle(v).display !== 'none';
      });
    }
    function playSlide(slide) {
      visibleVideos(slide).forEach(function (v) {
        try { v.currentTime = 0; } catch (e) {}
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      });
    }
    function resumeSlide(slide) {
      visibleVideos(slide).forEach(function (v) {
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      });
    }
    function pauseSlide(slide) {
      visibleVideos(slide).forEach(function (v) {
        v.pause(); try { v.currentTime = 0; } catch (e) {}
      });
    }

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
          playSlide(upcomingSlide);
        },
        onComplete: function () {
          currentSlide.classList.remove('is--current');
          pauseSlide(currentSlide);
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

    // LAZY: ładuj+graj widoczną orientację aktywnego slajdu, gdy sekcja jest ~1 ekran przed
    // kadrem (preload-ahead). Bez autoplay (Designer) wideo nie ściągają się wcześniej.
    // resumeSlide (bez resetu) — ponowne wejście w kadr wznawia, nie restartuje od 0.
    var lazyRoot = el.closest('.section_home-project') || el;
    var lazyIO = null;
    if (typeof IntersectionObserver !== 'undefined') {
      lazyIO = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) { resumeSlide(slides[current]); break; }
        }
      }, { rootMargin: '100% 0px 100% 0px' }); // ~1 ekran zapasu w obie strony (tuning point)
      lazyIO.observe(lazyRoot);
    } else {
      resumeSlide(slides[current]); // brak IO → graj od razu (degradacja do nie-lazy)
    }

    return {
      destroy: function () {
        if (lazyIO) lazyIO.disconnect();
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

/**
 * window.initFlipOnScroll(scope) — scaling element header: target [data-flip-element='target']
 * rośnie scroll-driven do pełnego ekranu, z "wlotem" small-boxa zsekwencjonowanym PRZED wzrostem.
 *
 * Przebudowa 2026-06-26 (v2 — wlot w GSAP, na czas). Dwa SĄSIADUJĄCE zakresy scrolla:
 *   - wlot:  [stStart - WLOT_ENTER_VH*vh, stStart]  (podczas wjazdu sekcji, przed przypięciem)
 *   - wzrost:[stStart, stEnd]                        (podczas przypięcia)
 * Wlot kończy DOKŁADNIE tam, gdzie zaczyna się wzrost → brak nakładania, działa w obie strony
 * (forward: wlot→wzrost; reverse: zmniejszenie→wylot), niezależnie od kierunku/refresh.
 *
 * Dlaczego tak (historia bugów):
 *   - geometria wzrostu przez offsetParent-chain (offsetLeft/Top = LAYOUT, transform-immune) →
 *     poprawna niezależnie od transformu przodka. Naprawia rozcentrowanie przy resize/fast-scroll.
 *   - small-box (wlot) sterowany przez style.setProperty(..., 'important') co klatkę — NADPISUJE
 *     natywny Webflow IX3 bez migotania (IX3 animuje `transform`, trzyma scale/rotate/translate:none).
 *     Dzięki temu NIE trzeba usuwać interakcji IX3 w Designerze (opcjonalnie czystsze).
 *   - bez pin (Lenis); kill-by-id (Lumos ColorChanger na tym samym .section_home-project);
 *     progress z window.scrollY; resize: debounce + double-rAF settle → pełny rebuild.
 *
 * Pokrętła: WLOT_ENTER_VH (jak wcześnie/długo trwa wlot), WLOT_EASE, WLOT_FROM.
 * Guard `data-flip-ready` na triggerze chroni przed double-init.
 */
window.initFlipOnScroll = function (scope) {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  var ctx = scope || document;
  var wrappers = Array.prototype.slice.call(ctx.querySelectorAll("[data-flip-element='wrapper']"));
  var targetEl = ctx.querySelector("[data-flip-element='target']");
  var triggerEl = ctx.querySelector("[data-flip-element='trigger']");
  if (!wrappers.length || !targetEl || !triggerEl) return;
  if (triggerEl.dataset.flipReady) return;
  triggerEl.dataset.flipReady = '1';
  var stickyHeader = ctx.querySelector('.scaling-element-header') || document.querySelector('.scaling-element-header');
  if (!stickyHeader) return;
  var smallBox = targetEl.closest('.scaling-element__small-box');

  // --- STROJENIE WLOTU ---
  var WLOT_ENTER_VH = 1; // ile vh PRZED przypięciem trwa wlot (jak wcześnie rusza)
  var WLOT_EASE = (gsap.parseEase && gsap.parseEase('power2.out')) || function (x) { return x; };
  var WLOT_FROM = { xPercent: -200, yPercent: 200, rotation: -45, scale: 3, opacity: 0 };
  // -----------------------

  var extraEls = [];
  var navEl = ctx.querySelector('.img-slider__nav'); if (navEl) extraEls.push(navEl);
  var btnWrap = ctx.querySelector('.scaling-video__button-wrap'); if (btnWrap) extraEls.push(btnWrap);
  if (extraEls.length) gsap.set(extraEls, { yPercent: 300, opacity: 0 });

  var ST_ID = 'flip-on-scroll';
  var tlExtras = null, tickerFn = null, resizeTimer = null, geom = null, stStart = 0, stEnd = 0, wlotStart = 0;

  function offsetToDoc(el) {
    var x = 0, y = 0, n = el;
    while (n) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { left: x, top: y };
  }
  function measureGeom() {
    var w = wrappers[0];
    var ow = offsetToDoc(w), os = offsetToDoc(stickyHeader);
    return { top: Math.round(ow.top - os.top), left: Math.round(ow.left - os.left), w: w.offsetWidth, h: w.offsetHeight };
  }
  function computeRange() {
    var r = triggerEl.getBoundingClientRect();
    var a = r.top + window.scrollY;
    stStart = a;
    stEnd = a + r.height - window.innerHeight * 1.2;
    wlotStart = stStart - WLOT_ENTER_VH * window.innerHeight;
  }

  // WLOT na small-box przez !important — nadpisuje natywny IX3 (gdyby nie usunięty), bez migotania.
  function setSmallBox(wlotP) {
    if (!smallBox) return;
    var w = WLOT_EASE(wlotP);
    var xp = WLOT_FROM.xPercent * (1 - w), yp = WLOT_FROM.yPercent * (1 - w), rot = WLOT_FROM.rotation * (1 - w),
        sc = 1 + (WLOT_FROM.scale - 1) * (1 - w), op = WLOT_FROM.opacity + (1 - WLOT_FROM.opacity) * w;
    smallBox.style.setProperty('transform', 'translate(' + xp + '%,' + yp + '%) rotate(' + rot + 'deg) scale(' + sc + ')', 'important');
    smallBox.style.setProperty('opacity', String(op), 'important');
  }
  function applyGrow(growP) {
    if (!geom) return;
    var vw = window.innerWidth, vh = window.innerHeight;
    gsap.set(targetEl, {
      top: -geom.top * growP, left: -geom.left * growP,
      width: geom.w + (vw - geom.w) * growP, height: geom.h + (vh - geom.h) * growP,
      zIndex: growP > 0.001 ? 100 : 1
    });
    if (extraEls.length && tlExtras) tlExtras.progress(growP);
  }
  function teardown() {
    if (tlExtras) { tlExtras.kill(); tlExtras = null; }
    ScrollTrigger.getAll().filter(function (st) { return st.vars.id === ST_ID || st.vars.id === ST_ID + '-defer'; }).forEach(function (st) { st.kill(); });
    if (tickerFn) { gsap.ticker.remove(tickerFn); tickerFn = null; }
  }
  function seal() {
    teardown();
    gsap.set(targetEl, { clearProps: 'transform,top,left,width,height,zIndex' });
    geom = measureGeom(); computeRange(); gsap.set(targetEl, { zIndex: 1 });
    if (extraEls.length) {
      tlExtras = gsap.timeline({ paused: true });
      tlExtras.fromTo(extraEls, { yPercent: 300, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'power2.out', duration: 0.22 }, 0.38);
    }
    var lastW = -1, lastG = -1;
    tickerFn = function () {
      var grRange = stEnd - stStart; if (grRange <= 0) return;
      var sy = window.scrollY, wRange = stStart - wlotStart;
      var wlotP = wRange > 0 ? Math.max(0, Math.min(1, (sy - wlotStart) / wRange)) : 1;
      var growP = Math.max(0, Math.min(1, (sy - stStart) / grRange));
      if (wlotP !== lastW) { lastW = wlotP; setSmallBox(wlotP); }
      if (growP !== lastG) { lastG = growP; applyGrow(growP); }
    };
    gsap.ticker.add(tickerFn); tickerFn();
  }
  requestAnimationFrame(seal);
  window.__flipOnScrollRebuild = function () {
    teardown();
    gsap.set(targetEl, { clearProps: 'transform,top,left,width,height,zIndex' });
    requestAnimationFrame(seal);
  };
  if (!window.__flipOnScrollResizeBound) {
    window.__flipOnScrollResizeBound = true;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        requestAnimationFrame(function () { requestAnimationFrame(function () {
          if (typeof window.__flipOnScrollRebuild === 'function') window.__flipOnScrollRebuild();
        }); });
      }, 200);
    });
  }
};

/**
 * window.initHomeHeroVideoDelay(scope) — startuje hero wideo [data-home-hero-video]
 * DOKŁADNIE w momencie odsłonięcia przez intro (zwinięcie paneli .intro_wipe do 0),
 * zamiast na stałym timerze liczonym od załadowania strony.
 *
 * Powód (fix 2026-06-25): poprzednia wersja robiła setTimeout(play, 6000) kotwiczony
 * w DOMContentLoaded, podczas gdy odsłona intro (Webflow IX3) jest zakotwiczona w
 * window.load. Na wolnym mobile luka DCL↔load rośnie do kilkunastu sekund (ciężki
 * payload wideo opóźnia `load`), więc 5-sekundowe wideo dograło do końca, ZANIM intro
 * je odsłoniło → widoczna była tylko martwa ostatnia klatka. Obserwacja realnej odsłony
 * usuwa rozjazd niezależnie od prędkości łącza. Zweryfikowane na Slow 4G + CPU 4×.
 *
 * Wymagania video tagu (Webflow Designer):
 *   - `muted` — wymagane dla programmatic .play() bez user interaction (autoplay policy).
 *   - `playsinline` — wymagane dla iOS (inaczej video startuje fullscreen).
 *   - `autoplay` — opcjonalne (i tak nadpisujemy logiką tutaj).
 *
 * Guard `data-hero-video-delay-ready` chroni przed double-bind.
 */
window.initHomeHeroVideoDelay = function (scope) {
  var ctx = scope || document;

  var videos = Array.prototype.slice
    .call(ctx.querySelectorAll('[data-home-hero-video]'))
    .filter(function (video) {
      if (video.dataset.heroVideoDelayReady) return false;
      video.dataset.heroVideoDelayReady = '1';
      return true;
    });
  if (!videos.length) return;

  // Reset — na wypadek gdyby browser zaczął odtwarzać przez autoplay attribute.
  videos.forEach(function (video) {
    video.pause();
    try { video.currentTime = 0; } catch (e) {}
  });

  var played = false;
  function playNow() {
    if (played) return;
    played = true;
    videos.forEach(function (video) {
      var p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function (err) {
          // Najczęstsza przyczyna: video nie ma `muted` (browser autoplay policy).
          console.warn('[initHomeHeroVideoDelay] play() rejected:', err && err.message);
        });
      }
    });
  }

  // Kotwica = realna odsłona intro: panele .intro_wipe (góra+dół) zwijają się do 0.
  var wipes = [
    document.querySelector('.intro_wipe.is-top'),
    document.querySelector('.intro_wipe.is-bottom')
  ].filter(Boolean);
  var introComp = document.querySelector('.intro_component');

  // Brak intro (np. wejście przez custom transition z innej strony — intro pominięte):
  // nie ma czego obserwować, odpal po krótkim buforze.
  if (!introComp || !wipes.length) {
    setTimeout(playNow, 400);
    return;
  }

  var maxCover = 0;
  function coverHeight() {
    var h = 0;
    for (var i = 0; i < wipes.length; i++) {
      h = Math.max(h, wipes[i].getBoundingClientRect().height);
    }
    return h;
  }

  // Backstop — gdyby IX3 nigdy nie odsłoniło (błąd): nie zostawiaj wideo niegrające.
  var backstop = setTimeout(playNow, 30000);

  // rAF poll: graj, gdy panele NAJPIERW zakrywały (maxCover duże), a teraz zwinięte (~0).
  (function watchReveal() {
    var h = coverHeight();
    if (h > maxCover) maxCover = h;
    if (maxCover > 40 && h <= 2) {
      clearTimeout(backstop);
      playNow();
      return;
    }
    if (!played) requestAnimationFrame(watchReveal);
  })();
};

window.initLogoGrid = function (scope) {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  var ctx = scope || document;

  ctx.querySelectorAll('[data-logo-wall-cycle-init]:not([data-logo-grid-ready])').forEach(function (root) {
    root.setAttribute('data-logo-grid-ready', '');

    var DURATION = 0.9;
    var INTERVAL = 1500;
    var SLIDE = 60;

    var BREAKPOINT = 991; // <=991px = tablet i mniej (8 logo); powyzej desktop (10)

    var list = root.querySelector('[data-logo-wall-list]');
    if (!list) return;
    var allItems = Array.from(list.querySelectorAll('[data-logo-wall-item]'));

    allItems.forEach(function (item) {
      item.querySelectorAll('img').forEach(function (img) {
        img.loading = 'eager';
        if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
        if (img.dataset.srcset) { img.srcset = img.dataset.srcset; img.removeAttribute('data-srcset'); }
      });
    });

    // Pelny zestaw logo (referencje trzymane na stale; build() rozdaje je do widocznych slotow).
    var allLogos = allItems
      .map(function (item) { return item.querySelector('[data-logo-wall-target]'); })
      .filter(Boolean);
    if (!allLogos.length) return;

    function shuffle(arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }

    // Jeden cykl zycia animacji dla biezacej liczby slotow (SLOTS = widoczne itemy). Zwraca { destroy }.
    function build() {
      var visibleItems = allItems.filter(function (item) {
        return window.getComputedStyle(item).display !== 'none';
      });
      var SLOTS = visibleItems.length;
      if (!SLOTS || allLogos.length < SLOTS) return null;

      var parents = visibleItems.map(function (item) {
        return item.querySelector('[data-logo-wall-target-parent]') || item;
      });

      allLogos.forEach(function (logo) { logo.remove(); });
      gsap.set(allLogos, { clearProps: 'all' }); // czysty start (wazne przy rebuildzie po resize)

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

      // Sekcja moze byc juz w viewporcie (np. rebuild po resize) -> odpal timer od razu.
      inViewport = !!st.isActive;
      updateTimer();

      document.addEventListener('visibilitychange', updateTimer);

      return {
        destroy: function () {
          if (timer) { clearInterval(timer); timer = null; }
          document.removeEventListener('visibilitychange', updateTimer);
          if (st) st.kill();
          gsap.killTweensOf(allLogos);
        },
      };
    }

    var instance = build();

    // SLOTS liczone raz na build -> przy przekroczeniu progu tabletu przebuduj (10 <-> 8).
    var mq = window.matchMedia('(max-width: ' + BREAKPOINT + 'px)');
    function onBreakpointChange() {
      if (instance) { instance.destroy(); instance = null; }
      instance = build();
    }
    if (mq.addEventListener) mq.addEventListener('change', onBreakpointChange);
    else if (mq.addListener) mq.addListener(onBreakpointChange); // Safari < 14

    window._logoGridInstances = window._logoGridInstances || [];
    window._logoGridInstances.push({
      destroy: function () {
        if (instance) { instance.destroy(); instance = null; }
        if (mq.removeEventListener) mq.removeEventListener('change', onBreakpointChange);
        else if (mq.removeListener) mq.removeListener(onBreakpointChange);
      },
    });
  });
};
