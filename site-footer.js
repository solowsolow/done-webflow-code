// =============================================================================
// D ONE — Site Footer (orchestrator + custom transition + site-wide animations)
// =============================================================================
// Hostowane na jsDelivr CDN. Repo: github.com/solowsolow/done-webflow-code
//
// Kolejność ładowania w Webflow Site Footer:
//   1. Lenis CSS + JS (CDN: unpkg)
//   2. Lumos theme-collector (CDN: jsdelivr)
//   3. Ten plik (CDN: jsdelivr)
//
// GSAP + ScrollTrigger + Flip + Observer + CustomEase + SplitText są ładowane
// wcześniej (Site Head / Webflow built-in).
// =============================================================================

// -----------------------------------------------------------------------------
// CORE: GSAP defaults, page transitions (hard reload pod overlayem), Lenis,
// orchestrator.
// -----------------------------------------------------------------------------
gsap.registerPlugin(CustomEase);
CustomEase.create('osmo', '0.625, 0.05, 0, 1');
CustomEase.create('main', '0.65, 0.01, 0.05, 0.99');
gsap.defaults({ ease: 'osmo', duration: 0.6 });
history.scrollRestoration = 'manual';

var lenis = null;
var isNavigating = false;
var hasLenis = typeof window.Lenis !== 'undefined';
var hasScrollTrigger = typeof window.ScrollTrigger !== 'undefined';
var rmMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
var reducedMotion = rmMQ.matches;
rmMQ.addEventListener && rmMQ.addEventListener('change', function (e) {
  reducedMotion = e.matches;
});

window._slideshowInstances = window._slideshowInstances || [];
window._marqueeInstances = window._marqueeInstances || [];
window._logoGridInstances = window._logoGridInstances || [];

var SKIP_INITS = {
  initLenis: 1,
  initScrollToAnchorLenis: 1,
  initLenisToggleHandlers: 1,
  initCustomAnimations: 1,
  initLumosColorChanger: 1,
};

function initLenis() {
  if (lenis || !hasLenis) return;
  lenis = new Lenis({
    autoRaf: false,
    smoothWheel: true,
    smoothTouch: false,
    lerp: 0.075,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.5,
    syncTouch: false,
  });
  window.lenis = lenis;
  if (hasScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
  gsap.ticker.lagSmoothing(0);
}

function initScrollToAnchorLenis() {
  document.querySelectorAll('[data-anchor-target]').forEach(function (el) {
    el.addEventListener('click', function () {
      lenis.scrollTo(this.getAttribute('data-anchor-target'), {
        easing: function (x) {
          return x < 0.5 ? 8 * Math.pow(x, 4) : 1 - Math.pow(-2 * x + 2, 4) / 2;
        },
        duration: 1.2,
        offset: 0,
      });
    });
  });
}

function initLenisToggleHandlers() {
  $('[data-lenis-start]').on('click', function () { lenis.start(); });
  $('[data-lenis-stop]').on('click', function () { lenis.stop(); });
  $('[data-lenis-toggle]').on('click', function () {
    $(this).toggleClass('stop-scroll');
    $(this).hasClass('stop-scroll') ? lenis.stop() : lenis.start();
  });
}

var themeConfig = {
  light: { nav: 'dark', transition: 'light' },
  dark: { nav: 'light', transition: 'dark' },
};

function applyTheme(container) {
  var theme = (container && container.dataset.pageTheme) || 'light';
  var cfg = themeConfig[theme] || themeConfig.light;
  document.body.dataset.pageTheme = theme;
  var el = document.querySelector('[data-theme-transition]');
  var nav = document.querySelector('[data-theme-nav]');
  if (el) el.dataset.themeTransition = cfg.transition;
  if (nav) nav.dataset.themeNav = cfg.nav;
}

function initCustomAnimations(scope) {
  Object.keys(window).forEach(function (key) {
    if (key.indexOf('init') !== 0) return;
    if (SKIP_INITS[key]) return;
    var fn = window[key];
    if (typeof fn !== 'function') return;
    try { fn(scope); } catch (e) { console.error('[initCustomAnimations]', key, e); }
  });
}

function runLeave(container) {
  var wrap = document.querySelector('[data-transition-wrap]');
  if (!wrap) return Promise.resolve();
  var panel = wrap.querySelector('[data-transition-panel]');
  var panelTop = wrap.querySelector('[data-transition-panel-top]');
  var panelBot = wrap.querySelector('[data-transition-panel-bottom]');
  var logo = wrap.querySelector('[data-transition-logo]');
  var paths = wrap.querySelectorAll('path');

  return new Promise(function (resolve) {
    if (reducedMotion) {
      gsap.set(container, { autoAlpha: 0 });
      resolve();
      return;
    }
    var tl = gsap.timeline({ onComplete: resolve });
    tl.set(panel, { autoAlpha: 1 }, 0);
    tl.set(panelTop, { scaleY: 0, height: '15vw' }, 0);
    tl.set(panelBot, { scaleY: 1, height: '20vw' }, 0);
    tl.set(logo, { autoAlpha: 1 });
    tl.set(paths, { yPercent: 105 });
    tl.fromTo(panel, { yPercent: 0 }, { yPercent: -100, duration: 1 }, 0);
    tl.fromTo(panelTop, { scaleY: 0 }, { scaleY: 1, duration: 1 }, '<');
    tl.fromTo(paths, { yPercent: 105 }, { yPercent: 0, duration: 0.8, ease: 'expo.out', stagger: { amount: 0.06 } }, '<+=0.4');
    tl.fromTo(container, { y: '0vh' }, { y: '-15dvh', duration: 1 }, 0);
  });
}

function runEnter(container) {
  var wrap = document.querySelector('[data-transition-wrap]');
  if (!wrap) return Promise.resolve();
  var panel = wrap.querySelector('[data-transition-panel]');
  var panelBot = wrap.querySelector('[data-transition-panel-bottom]');
  var paths = wrap.querySelectorAll('path');

  return new Promise(function (resolve) {
    if (reducedMotion) {
      gsap.set(container, { autoAlpha: 1 });
      resolve();
      return;
    }
    var tl = gsap.timeline({ onComplete: resolve });
    tl.add('in', 0.2);
    tl.set(container, { autoAlpha: 1 }, 'in');
    tl.fromTo(panel, { yPercent: -100 }, { yPercent: -200, duration: 1, overwrite: 'auto', immediateRender: false }, 'in');
    tl.fromTo(panelBot, { scaleY: 1 }, { scaleY: 0, duration: 1 }, '<');
    tl.set(panel, { autoAlpha: 0 }, '>');
    tl.to(paths, { yPercent: -130, duration: 1.2, ease: 'expo.inOut', stagger: { amount: -0.06 } }, 'in-=0.4');
    tl.from(container, { y: '25dvh', duration: 1 }, 'in');
  });
}

// Navigation: hard reload under overlay (Webflow IX3 incompatible with SPA DOM-swap)
async function navigate(url, isPopState) {
  if (isNavigating) return;
  isNavigating = true;
  try {
    if (lenis) lenis.stop();
    var current = document.querySelector('[data-barba="container"]');
    await runLeave(current);
    try { sessionStorage.setItem('__doneInTransition', '1'); } catch (e) {}
    if (isPopState) {
      window.location.replace(url);
    } else {
      window.location.href = url;
    }
  } catch (e) {
    console.error('[navigate]', e);
    window.location.href = url;
  }
}

document.addEventListener('click', function (e) {
  var link = e.target.closest('a');
  if (!link) return;
  var href = link.getAttribute('href');
  if (!href || !href.trim()) return;
  if (link.target === '_blank') return;
  if (/^(#|mailto:|tel:)/.test(href)) return;
  if (link.hasAttribute('data-no-transition')) return;
  if (isNavigating) return;
  try {
    var parsed = new URL(link.href);
    if (parsed.origin !== location.origin) return;
    if (/\.(?!html?)[\w]+(\?|$)/i.test(parsed.pathname)) return;
  } catch (ex) { return; }
  if (link.href === location.href) return;
  e.preventDefault();
  navigate(link.href, false);
});

window.addEventListener('popstate', function (e) {
  navigate((e.state && e.state.url) || location.href, true);
});

// bfcache restore: overlay was covering at unload → retract so user isn't stuck
window.addEventListener('pageshow', function (e) {
  if (!e.persisted) return;
  isNavigating = false;

  var wrap = document.querySelector('[data-transition-wrap]');
  var next = document.querySelector('[data-barba="container"]');
  if (!wrap) { if (lenis) lenis.start(); return; }

  var panel = wrap.querySelector('[data-transition-panel]');
  var panelBot = wrap.querySelector('[data-transition-panel-bottom]');
  var panelTop = wrap.querySelector('[data-transition-panel-top]');
  var transLogo = wrap.querySelector('[data-transition-logo]');
  var transPaths = wrap.querySelectorAll('path');

  if (next) gsap.set(next, { autoAlpha: 1, clearProps: 'transform,translate,rotate,scale,y,x' });

  if (panel) gsap.set(panel, { autoAlpha: 1, yPercent: -100, y: 0, x: 0 });
  if (panelBot) gsap.set(panelBot, { scaleY: 1 });
  if (panelTop) gsap.set(panelTop, { scaleY: 1, height: '15vw' });
  if (transLogo) gsap.set(transLogo, { autoAlpha: 1 });
  if (transPaths && transPaths.length) gsap.set(transPaths, { yPercent: 0 });

  // No container y animation — bfcache restored scroll; animating y would jerk whole page
  var tl = gsap.timeline();
  if (panel) tl.to(panel, { yPercent: -200, duration: 1, overwrite: 'auto' }, 0);
  if (panelBot) tl.to(panelBot, { scaleY: 0, duration: 1 }, 0);
  if (transPaths && transPaths.length) tl.to(transPaths, { yPercent: -130, duration: 1.2, ease: 'expo.inOut', stagger: { amount: -0.06 } }, 0);
  if (panel) tl.set(panel, { autoAlpha: 0 }, 1);

  if (lenis) lenis.start();
  if (hasScrollTrigger) ScrollTrigger.refresh();
});

// Boot
document.addEventListener('DOMContentLoaded', function () {
  history.replaceState({ url: location.href }, '', location.href);
  initLenis();
  initScrollToAnchorLenis();
  initLenisToggleHandlers();
  applyTheme(document.querySelector('[data-barba="container"]'));

  var wasInTransition = false;
  try {
    wasInTransition = sessionStorage.getItem('__doneInTransition') === '1';
    sessionStorage.removeItem('__doneInTransition');
  } catch (e) {}

  function bootCustomAnimations() {
    initCustomAnimations(document);
    if (typeof initLumosColorChanger === 'function') initLumosColorChanger();
    if (hasScrollTrigger) ScrollTrigger.refresh();
  }

  (function waitForGSAP() {
    if (window.gsap && (!hasScrollTrigger || window.ScrollTrigger)) {
      if (wasInTransition) {
        var next = document.querySelector('[data-barba="container"]');
        var wrap = document.querySelector('[data-transition-wrap]');
        if (next) gsap.set(next, { autoAlpha: 0 });
        if (wrap) {
          var panel = wrap.querySelector('[data-transition-panel]');
          var panelBot = wrap.querySelector('[data-transition-panel-bottom]');
          var panelTop = wrap.querySelector('[data-transition-panel-top]');
          var transLogo = wrap.querySelector('[data-transition-logo]');
          var transPaths = wrap.querySelectorAll('path');
          // Explicit y:0 x:0 — bez nich GSAP kompozytuje residual matrix z yPercent → panel leci -3× viewport
          if (panel) gsap.set(panel, { autoAlpha: 1, yPercent: -100, y: 0, x: 0 });
          if (panelBot) gsap.set(panelBot, { scaleY: 1 });
          if (panelTop) gsap.set(panelTop, { scaleY: 1, height: '15vw' });
          if (transLogo) gsap.set(transLogo, { autoAlpha: 1 });
          if (transPaths && transPaths.length) gsap.set(transPaths, { yPercent: 0 });
        }
        gsap.set(document.body, { visibility: 'visible' });
        document.documentElement.removeAttribute('data-done-boot-transition');
        bootCustomAnimations();
        runEnter(next).then(function () {
          // clearProps transform KRYTYCZNE — gsap.from container { y } zostawia inline translate(0,0) = containing block dla fixed dzieci (modale!)
          if (next) gsap.set(next, { clearProps: 'transform,translate,rotate,scale' });
          if (lenis) lenis.start();
          if (hasScrollTrigger) ScrollTrigger.refresh();
        });
      } else {
        bootCustomAnimations();
      }
    } else {
      setTimeout(waitForGSAP, 50);
    }
  })();
});

// -----------------------------------------------------------------------------
// LUMOS COLOR CHANGER (theme-collector loadowany osobno w Webflow Site Footer)
// -----------------------------------------------------------------------------
window.initLumosColorChanger = function () {
  if (typeof colorThemes === 'undefined') return;
  if (typeof ScrollTrigger === 'undefined') return;

  document.querySelectorAll('[data-animate-theme-to]').forEach(function (el, i) {
    var stId = 'lumos-theme-' + i;
    // kill-by-id (nie kill-by-trigger) — inaczej zabija flip/footer-parallax na tym samym triggerze
    ScrollTrigger.getAll()
      .filter(function (st) { return st.vars.id === stId; })
      .forEach(function (st) { st.kill(); });

    var theme = el.getAttribute('data-animate-theme-to');
    ScrollTrigger.create({
      id: stId,
      trigger: el,
      start: 'top 1%',
      end: 'bottom 1%',
      onToggle: function (state) {
        if (state.isActive) {
          gsap.to(
            '.nav_logo_wrap, .nav_header, .progress-bar-wrap',
            Object.assign({}, colorThemes.getTheme(theme), {
              duration: 0.2,
              ease: 'none',
            }),
          );
        }
      },
    });
  });
};

document.addEventListener('colorThemesReady', function () {
  initLumosColorChanger();
});

// -----------------------------------------------------------------------------
// NAV open/close
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.nav').forEach(function (component) {
    if (component.dataset.scriptInitialized) return;
    component.dataset.scriptInitialized = 'true';

    var navWrap = document.querySelector('[data-nav-wrap]');
    if (!navWrap) return;

    var state = navWrap.getAttribute('data-nav-state');
    var overlay = navWrap.querySelector('[data-nav-overlay]');
    var menu = navWrap.querySelector('[data-nav-menu]');
    var bgPanels = navWrap.querySelectorAll('[data-nav-panel]');
    var menuToggles = document.querySelectorAll('[data-nav-toggle]');
    var menuLinks = navWrap.querySelectorAll('[data-nav-link]');
    var fadeTargets = navWrap.querySelectorAll('[data-nav-fade]');
    var menuButton = document.querySelector('[data-nav-button]');
    var menuButtonTexts = menuButton && menuButton.querySelectorAll('[data-nav-label]');
    var menuButtonIcon = menuButton && menuButton.querySelector('[data-nav-icon]');

    if (!menuButton) return;

    var tl = gsap.timeline();
    var NAV_DEFAULTS = { ease: 'main', duration: 0.8 };

    var openNav = function () {
      navWrap.setAttribute('data-nav-state', 'open');
      if (window.lenis) window.lenis.stop();
      document.querySelectorAll('[data-lenis-toggle]').forEach(function (el) {
        el.classList.add('stop-scroll');
      });
      tl.clear()
        .set(navWrap, { display: 'block' })
        .set(menu, { yPercent: 0 })
        .fromTo(menuButtonTexts, { yPercent: 0 }, Object.assign({}, NAV_DEFAULTS, { yPercent: -100, stagger: 0.2 }))
        .fromTo(menuButtonIcon, { rotate: 0 }, Object.assign({}, NAV_DEFAULTS, { rotate: 315 }), '<')
        .fromTo(overlay, { autoAlpha: 0 }, Object.assign({}, NAV_DEFAULTS, { autoAlpha: 1 }), '<')
        .fromTo(bgPanels, { yPercent: -101 }, Object.assign({}, NAV_DEFAULTS, { yPercent: 0, stagger: 0.12, duration: 0.575 }), '<')
        .fromTo(menuLinks, { yPercent: 180, rotate: 10 }, Object.assign({}, NAV_DEFAULTS, { yPercent: 0, rotate: 0, stagger: 0.05 }), '<+=0.35')
        .fromTo(fadeTargets, { autoAlpha: 0 }, Object.assign({}, NAV_DEFAULTS, { autoAlpha: 1 }), '<+=0.2');

      // Snake w hidden nav ma bounds=0 przy init → recalc przy otwarciu menu
      requestAnimationFrame(function () {
        document.querySelectorAll('[data-nav-menu] .d-shape_snake-move-wrap, .nav_wrap .d-shape_snake-move-wrap').forEach(function (w) {
          if (typeof w.__dShapeSnakeUpdateBounds === 'function') w.__dShapeSnakeUpdateBounds();
        });
      });
    };

    var closeNav = function () {
      navWrap.setAttribute('data-nav-state', 'closed');
      if (window.lenis) window.lenis.start();
      document.querySelectorAll('[data-lenis-toggle]').forEach(function (el) {
        el.classList.remove('stop-scroll');
      });
      tl.clear()
        .to(overlay, Object.assign({}, NAV_DEFAULTS, { autoAlpha: 0 }))
        .to(menu, Object.assign({}, NAV_DEFAULTS, { yPercent: -120 }), '<')
        .to(menuButtonTexts, Object.assign({}, NAV_DEFAULTS, { yPercent: 0 }), '<')
        .to(menuButtonIcon, Object.assign({}, NAV_DEFAULTS, { rotate: 0 }), '<')
        .set(navWrap, { display: 'none' });
    };

    menuToggles.forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        state = navWrap.getAttribute('data-nav-state');
        state === 'open' ? closeNav() : openNav();
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navWrap.getAttribute('data-nav-state') === 'open') {
        closeNav();
      }
    });
  });
});

// -----------------------------------------------------------------------------
// SITE-WIDE: footer parallax
// -----------------------------------------------------------------------------
window.initFooterParallax = function () {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  if (window.innerWidth < 768) return;

  document.querySelectorAll('[data-footer-parallax]').forEach(function (el, i) {
    var stId = 'footer-parallax-' + i;
    ScrollTrigger.getAll()
      .filter(function (st) { return st.vars.id === stId; })
      .forEach(function (st) { st.kill(); });

    var inner = el.querySelector('[data-footer-parallax-inner]');
    var dark  = el.querySelector('[data-footer-parallax-dark]');
    if (!inner && !dark) return;

    if (inner) gsap.set(inner, { clearProps: 'yPercent,transform' });
    if (dark)  gsap.set(dark,  { clearProps: 'opacity' });

    var tl = gsap.timeline({
      scrollTrigger: {
        id: stId,
        trigger: el,
        start: 'top bottom',
        end: 'top top',
        scrub: true,
      },
    });

    if (inner) tl.from(inner, { yPercent: -25, ease: 'linear' });
    if (dark)  tl.from(dark,  { opacity: 0.5, ease: 'linear' }, '<');
  });
};

// -----------------------------------------------------------------------------
// SITE-WIDE: cursor link scale
// -----------------------------------------------------------------------------
window.initCursorLinkScale = function (scope) {
  var ctx = scope || document;

  var CLICKABLE_SELECTOR = 'a, button, [role="button"], input[type="submit"], input[type="button"], label[for], [data-cursor-hover]';
  var BYPASS_SELECTOR = '[data-move-cursor="nolink"]';
  var TWEEN_OPTS = { duration: 0.4, ease: 'power3.out', overwrite: 'auto' };

  function scaleTo(value) {
    if (!window.gsap) return;
    var els = document.querySelectorAll('[data-cursor-link]');
    if (!els.length) return;
    gsap.to(els, Object.assign({ scale: value }, TWEEN_OPTS));
  }

  function activeClickable(target) {
    if (!target || !target.closest) return null;
    var clickable = target.closest(CLICKABLE_SELECTOR);
    if (!clickable) return null;
    if (clickable.closest(BYPASS_SELECTOR)) return null;
    return clickable;
  }

  if (window.gsap) {
    var scoped = ctx.querySelectorAll('[data-cursor-link]');
    if (scoped.length) gsap.set(scoped, { scale: 1 });
  }

  if (document.body.hasAttribute('data-cursor-link-scale-ready')) return;
  document.body.setAttribute('data-cursor-link-scale-ready', '');

  document.addEventListener('mouseover', function (e) {
    if (activeClickable(e.target)) scaleTo(0);
  });

  document.addEventListener('mouseout', function (e) {
    var fromActive = activeClickable(e.target);
    if (!fromActive) return;
    var toActive = activeClickable(e.relatedTarget);
    if (toActive === fromActive) return;
    if (!toActive) scaleTo(1);
  });
};

// -----------------------------------------------------------------------------
// SITE-WIDE: cursor scroll visibility
// -----------------------------------------------------------------------------
window.initCursorScrollVisibility = function (scope) {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  var ctx = scope || document;

  // Multi-target support — każdy cursor target pairs z contentem przez DOM index.
  // Założenie: targets i contents są w tej samej kolejności w DOM (np. hero target przed home-project target).
  var cursors = Array.prototype.slice.call(document.querySelectorAll("[data-move-cursor='target']"));
  if (!cursors.length) return;

  var contents = Array.prototype.slice.call(ctx.querySelectorAll("[data-move-cursor='content']"));
  if (!contents.length) contents = Array.prototype.slice.call(document.querySelectorAll("[data-move-cursor='content']"));

  if (!contents.length) {
    // Strona bez content — pokaż wszystkie kursory zawsze (D Group, Profile etc.).
    // Belt-and-suspenders dla browser'ów bez :has() support — JS jawnie nadpisuje opacity 1.
    cursors.forEach(function (c) { gsap.set(c, { opacity: 1 }); });
    return;
  }

  // Re-init detection — przy SPA nav nie resetujemy opacity gdy ScrollTriggery z poprzedniej init żyją
  var alreadyHasTriggers = false;
  var allST = ScrollTrigger.getAll();
  for (var i = 0; i < allST.length; i++) {
    if (allST[i].vars && allST[i].vars.id && allST[i].vars.id.indexOf('cursor-scroll-') === 0) {
      alreadyHasTriggers = true;
      break;
    }
  }
  if (!alreadyHasTriggers) {
    cursors.forEach(function (c) { gsap.set(c, { opacity: 0 }); });
  }

  var cursorUnlocked = false;

  function showCursor(cursor) {
    if (!cursorUnlocked) return;
    gsap.to(cursor, { opacity: 1, duration: 0.6, ease: 'power2.out', overwrite: true });
  }
  function hideCursor(cursor) {
    if (!cursorUnlocked) return;
    gsap.to(cursor, { opacity: 0, duration: 0.5, ease: 'power2.in', overwrite: true });
  }

  // Pair każdy cursor z odpowiadającym mu contentem przez index
  var pairs = [];
  var pairCount = Math.min(cursors.length, contents.length);
  for (var p = 0; p < pairCount; p++) {
    pairs.push({ cursor: cursors[p], content: contents[p], st: null });
  }

  // Sticky/fixed content (np. .scaling-element-header) ma niestabilną pozycję dla ScrollTrigger —
  // start/end calc'y rozjeżdżają się przy refresh, co generuje spurious onLeave (cursor "miękko znika").
  // Wykryj sticky/fixed i użyj non-sticky ancestor jako trigger; content zostaje semantycznym markerem.
  function getEffectiveTrigger(el) {
    var node = el;
    while (node && node !== document.body) {
      var pos = getComputedStyle(node).position;
      if (pos === 'sticky' || pos === 'fixed') {
        node = node.parentElement;
        continue;
      }
      break;
    }
    return node || el;
  }

  pairs.forEach(function (pair, idx) {
    if (pair.content.dataset.cursorScrollReady) return;
    pair.content.dataset.cursorScrollReady = '1';

    pair.st = ScrollTrigger.create({
      id: 'cursor-scroll-' + idx,
      trigger: getEffectiveTrigger(pair.content),
      start: 'top bottom',
      end: 'bottom top',
      invalidateOnRefresh: true,
      onEnter: function () { showCursor(pair.cursor); },
      onLeave: function () { hideCursor(pair.cursor); },
      onEnterBack: function () { showCursor(pair.cursor); },
      onLeaveBack: function () { hideCursor(pair.cursor); },
    });
  });

  gsap.delayedCall(2.5, function () {
    cursorUnlocked = true;
    // Po 2.5s ScrollTrigger jest zrefreshowany przez bootCustomAnimations — st.isActive zwraca prawidłowe stany.
    // Dla każdej pary: jeśli content w viewport → fade in odpowiadającego cursora.
    pairs.forEach(function (pair) {
      if (pair.st && pair.st.isActive) {
        gsap.to(pair.cursor, { opacity: 1, duration: 0.8, ease: 'power2.out' });
      }
    });
  });
};

// -----------------------------------------------------------------------------
// SITE-WIDE: D Shape Snake (cursor-following clones)
// -----------------------------------------------------------------------------
window.initDShapeSnake = function (scope) {
  var ctx = scope || document;

  ctx.querySelectorAll('.d-shape_snake-move-wrap:not([data-d-shape-snake-ready])').forEach(function (wrapper) {
    wrapper.setAttribute('data-d-shape-snake-ready', '');

    var activeEl = wrapper.querySelector('.d-shape_snake-img-wrap.is-active');
    var baseEl = wrapper.querySelector('.d-shape_snake-img-wrap:not(.is-active)');
    if (!activeEl || !baseEl) return;

    // Per-wrapper override: data-snake-count, data-snake-min-scale (fallbacks 11 / 0.25)
    var COUNT = parseInt(wrapper.getAttribute('data-snake-count'), 10) || 11;
    if (COUNT < 2) COUNT = 2;
    var MIN_SCALE = parseFloat(wrapper.getAttribute('data-snake-min-scale')) || 0.25;
    var MAX_SCALE = 1;
    var LERP = 0.15;
    var OFFSET_RATIO = 0.30;
    var GYRO_RANGE = 25;

    activeEl.classList.remove('is-active');

    var clones = [];
    for (var c = 0; c < COUNT - 2; c++) {
      var clone = baseEl.cloneNode(true);
      clone.classList.remove('is-active');
      clone.setAttribute('data-d-shape-clone', '');
      wrapper.appendChild(clone);
      clones.push(clone);
    }

    var orderedEls = [activeEl].concat(clones).concat([baseEl]);

    var positions = [];
    var setters = [];
    orderedEls.forEach(function (el, i) {
      var t = i / (COUNT - 1);
      var scale = MIN_SCALE * Math.pow(MAX_SCALE / MIN_SCALE, t);

      gsap.set(el, {
        scale: scale,
        x: 0,
        y: 0,
        zIndex: COUNT - i,
        force3D: true,
        willChange: 'transform',
      });

      positions.push({ x: 0, y: 0 });
      setters.push({
        x: gsap.quickSetter(el, 'x', 'px'),
        y: gsap.quickSetter(el, 'y', 'px'),
      });
    });

    var target = { x: 0, y: 0 };
    var maxOffsetX = 0;
    var maxOffsetY = 0;

    var onMouseMove = null;
    var onResize = null;
    var onOrient = null;
    var onDeviceOrient = null;
    var onTouchEnd = null;
    var resizeObserver = null;

    function updateBounds() {
      var rect = wrapper.getBoundingClientRect();
      maxOffsetX = rect.width * OFFSET_RATIO;
      maxOffsetY = rect.height * OFFSET_RATIO;
    }
    updateBounds();

    // Expose recalc dla nav openNav + ResizeObserver na display:none→block
    wrapper.__dShapeSnakeUpdateBounds = updateBounds;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(function () { updateBounds(); });
      resizeObserver.observe(wrapper);
    }

    onResize = updateBounds;
    window.addEventListener('resize', onResize);

    var isTouch = window.matchMedia('(pointer: coarse)').matches;

    if (!isTouch) {
      onMouseMove = function (e) {
        if (maxOffsetX === 0 || maxOffsetY === 0) updateBounds();
        var nx = (e.clientX / window.innerWidth) * 2 - 1;
        var ny = (e.clientY / window.innerHeight) * 2 - 1;
        target.x = nx * maxOffsetX;
        target.y = ny * maxOffsetY;
      };
      window.addEventListener('mousemove', onMouseMove, { passive: true });
    } else {
      var calibrated = false;
      var baseBeta = 0;
      var baseGamma = 0;

      onDeviceOrient = function (e) {
        if (e.gamma == null || e.beta == null) return;

        if (!calibrated) {
          baseBeta = e.beta;
          baseGamma = e.gamma;
          calibrated = true;
        }

        var dBeta = e.beta - baseBeta;
        var dGamma = e.gamma - baseGamma;
        var orient = (screen.orientation && screen.orientation.angle) || window.orientation || 0;

        var nx, ny;
        if (orient === 90) {
          nx = -dBeta / GYRO_RANGE;
          ny = dGamma / GYRO_RANGE;
        } else if (orient === -90 || orient === 270) {
          nx = dBeta / GYRO_RANGE;
          ny = -dGamma / GYRO_RANGE;
        } else {
          nx = dGamma / GYRO_RANGE;
          ny = dBeta / GYRO_RANGE;
        }

        nx = Math.max(-1, Math.min(1, nx));
        ny = Math.max(-1, Math.min(1, ny));

        if (maxOffsetX === 0 || maxOffsetY === 0) updateBounds();
        target.x = nx * maxOffsetX;
        target.y = ny * maxOffsetY;
      };

      function attachOrientation() {
        window.addEventListener('deviceorientation', onDeviceOrient, true);
      }

      function requestGyroPermission() {
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
          DeviceOrientationEvent.requestPermission()
            .then(function (state) { if (state === 'granted') attachOrientation(); })
            .catch(function () {});
        } else {
          attachOrientation();
        }
      }

      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        onTouchEnd = function () {
          window.removeEventListener('touchend', onTouchEnd);
          onTouchEnd = null;
          requestGyroPermission();
        };
        window.addEventListener('touchend', onTouchEnd, { passive: true });
      } else {
        requestGyroPermission();
      }

      onOrient = function () { calibrated = false; };
      window.addEventListener('orientationchange', onOrient);
    }

    var tickerFn = function () {
      if (!wrapper.isConnected) {
        gsap.ticker.remove(tickerFn);
        if (resizeObserver) resizeObserver.disconnect();
        if (onMouseMove) window.removeEventListener('mousemove', onMouseMove);
        if (onResize) window.removeEventListener('resize', onResize);
        if (onOrient) window.removeEventListener('orientationchange', onOrient);
        if (onDeviceOrient) window.removeEventListener('deviceorientation', onDeviceOrient, true);
        if (onTouchEnd) window.removeEventListener('touchend', onTouchEnd);
        return;
      }

      positions[0].x += (target.x - positions[0].x) * LERP;
      positions[0].y += (target.y - positions[0].y) * LERP;
      setters[0].x(positions[0].x);
      setters[0].y(positions[0].y);

      for (var i = 1; i < COUNT; i++) {
        positions[i].x += (positions[i - 1].x - positions[i].x) * LERP;
        positions[i].y += (positions[i - 1].y - positions[i].y) * LERP;
        setters[i].x(positions[i].x);
        setters[i].y(positions[i].y);
      }
    };
    gsap.ticker.add(tickerFn);
  });
};

// -----------------------------------------------------------------------------
// SITE-WIDE: Marquee scroll direction
// -----------------------------------------------------------------------------
window.initMarqueeScrollDirection = function (scope) {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  var ctx = scope || document;

  ctx.querySelectorAll('[data-marquee-scroll-direction-target]:not([data-marquee-ready])').forEach(function (marquee) {
    marquee.setAttribute('data-marquee-ready', '');

    var marqueeContent = marquee.querySelector('[data-marquee-collection-target]');
    var marqueeScroll = marquee.querySelector('[data-marquee-scroll-target]');
    if (!marqueeContent || !marqueeScroll) return;

    var ds = marquee.dataset;
    var marqueeSpeedAttr = parseFloat(ds.marqueeSpeed);
    var marqueeDirectionAttr = ds.marqueeDirection === 'right' ? 1 : -1;
    var duplicateAmount = parseInt(ds.marqueeDuplicate || 0);
    var scrollSpeedAttr = parseFloat(ds.marqueeScrollSpeed);
    var speedMultiplier = window.innerWidth < 479 ? 0.25 : window.innerWidth < 991 ? 0.5 : 1;

    var marqueeSpeed = marqueeSpeedAttr * (marqueeContent.offsetWidth / window.innerWidth) * speedMultiplier;

    marqueeScroll.style.marginLeft = scrollSpeedAttr * -1 + '%';
    marqueeScroll.style.width = scrollSpeedAttr * 2 + 100 + '%';

    if (duplicateAmount > 0) {
      var fragment = document.createDocumentFragment();
      for (var i = 0; i < duplicateAmount; i++) {
        fragment.appendChild(marqueeContent.cloneNode(true));
      }
      marqueeScroll.appendChild(fragment);
    }

    var marqueeItems = marquee.querySelectorAll('[data-marquee-collection-target]');
    var animation = gsap.to(marqueeItems, {
      xPercent: -100,
      repeat: -1,
      duration: marqueeSpeed,
      ease: 'linear',
    }).totalProgress(0.5);

    gsap.set(marqueeItems, { xPercent: marqueeDirectionAttr === 1 ? 100 : -100 });
    animation.timeScale(marqueeDirectionAttr);
    animation.play();

    marquee.setAttribute('data-marquee-status', 'normal');

    ScrollTrigger.create({
      trigger: marquee,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: function (self) {
        var isInverted = self.direction === 1;
        var currentDirection = isInverted ? -marqueeDirectionAttr : marqueeDirectionAttr;
        animation.timeScale(currentDirection);
        marquee.setAttribute('data-marquee-status', isInverted ? 'normal' : 'inverted');
      },
    });

    gsap.timeline({
      scrollTrigger: {
        trigger: marquee,
        start: '0% 100%',
        end: '100% 0%',
        scrub: 0,
      },
    }).fromTo(
      marqueeScroll,
      { x: (marqueeDirectionAttr === -1 ? scrollSpeedAttr : -scrollSpeedAttr) + 'vw' },
      { x: (marqueeDirectionAttr === -1 ? -scrollSpeedAttr : scrollSpeedAttr) + 'vw', ease: 'none' },
    );

    window._marqueeInstances = window._marqueeInstances || [];
    window._marqueeInstances.push(animation);
  });
};

// -----------------------------------------------------------------------------
// SITE-WIDE: GSAP Flip scroll (uniwersalny scroll-driven Flip między wrappers)
// -----------------------------------------------------------------------------
/**
 * window.initGsapFlipScroll(scope) — scroll-driven sequential GSAP Flip
 *
 * Atrybuty (Designer):
 *   [data-gsap-flip="wrapper"] × N  — kolejne kontenery przez które wędruje target
 *   [data-gsap-flip="target"]  × 1  — element animowany (DOM swap między wrappers)
 *   [data-gsap-flip="trigger"] × N  — checkpointy scrollu (każdy trigger = pozycja
 *                                     gdzie target jest w odpowiadającym wrapperze)
 *
 * Logika: dla N par sąsiadujących wrappers tworzy N-1 segmentów. Każdy segment
 *   ma własny ScrollTrigger ze startem `triggers[i] center @ vp center` i endem
 *   `triggers[i+1] center @ vp center`, scrub: true, ease: 'none' (Lenis wygładza).
 *   Flip.from(state) animuje target z pozycji w wrappers[i] do wrappers[i+1]
 *   liniowo wraz z scrollem (forward scroll = forward, scroll back = reverse).
 *
 * Dopasowanie size/transform target → wrapper jest natywne dla Flip API
 *   (FLIP technique: First, Last, Invert, Play). nested:true ogarnia transformy
 *   na ancestorach (np. sekcja z transform: rotate na rodzicu wrappera).
 *
 * Re-init przy SPA: kill istniejące ScrollTriggery z prefiksem 'gsap-flip-',
 *   target wraca do wrappers[0] (jeśli po poprzedniej init był w last wrapper).
 *
 * Uniwersalna — dowolna podstrona, dowolne klasy wrappers/target/triggers.
 *   Jedyna zasada: triggers w tym samym DOM order co wrappers (1:1 mapping).
 */
window.initGsapFlipScroll = function (scope) {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined' || typeof Flip === 'undefined') return;

  var ctx = scope || document;

  function build() {
    var wrappers = Array.prototype.slice.call(ctx.querySelectorAll('[data-gsap-flip="wrapper"]'));
    var target = ctx.querySelector('[data-gsap-flip="target"]');
    var triggers = Array.prototype.slice.call(ctx.querySelectorAll('[data-gsap-flip="trigger"]'));

    if (!target) return;
    if (wrappers.length < 2 || triggers.length < 2) return;

    ScrollTrigger.getAll().forEach(function (st) {
      if (st.vars && st.vars.id && String(st.vars.id).indexOf('gsap-flip-') === 0) st.kill();
    });

    if (target.parentElement !== wrappers[0]) wrappers[0].appendChild(target);
    target.removeAttribute('style');

    var segmentCount = Math.min(wrappers.length, triggers.length) - 1;

    // Document-relative pozycje triggerów
    var trigInfo = triggers.map(function (tr) {
      var r = tr.getBoundingClientRect();
      return {
        top: r.top + window.scrollY,
        bottom: r.top + window.scrollY + r.height,
        h: r.height,
      };
    });

    // Total scroll range: od top T[0] center DO bottom T[last] center.
    var totalRange = trigInfo[trigInfo.length - 1].bottom - trigInfo[0].top;

    // ARCHITECTURE: single master timeline + single ScrollTrigger (live-tested + verified
    // wszystkie phases). Per-segment ScrollTrigger z multi-Flip.fit miał overwrite issue —
    // każdy nowy tween kasował inline state poprzedniego, target wracał do W[0] CSS state.
    //
    // Master timeline = sequence przeplatających się postojów (empty tweens) i transitions
    // (Flip.fit). Każdy trigger T[i] reprezentuje "moment postoju" target w W[i] — postój
    // trwa od top T[i] center DO bottom T[i] center. Pomiędzy postojami transitions trwają
    // od bottom T[i] center DO top T[i+1] center, animując W[i] → W[i+1] z Flip.fit.
    //
    // Sequence (dla 6 wrappers + 6 triggers, 5 segments):
    //   postój 0 (top T[0] → bottom T[0], target W[0]) → transition 0 (W[0]→W[1])
    //   postój 1 (top T[1] → bottom T[1], target W[1]) → transition 1 (W[1]→W[2])
    //   ... → postój 5 (top T[5] → bottom T[5], target W[5])
    //
    // Single ScrollTrigger range: top T[0] center → bottom T[last] center, scrub: true.
    // Master timeline duration normalized to 1.0, każdy section proportional do scroll distance.
    var masterTl = gsap.timeline();

    for (var i = 0; i < segmentCount; i++) {
      // Postój i (target w W[i]) — empty tween over T[i].height
      masterTl.to({}, { duration: trigInfo[i].h / totalRange }, '>');
      // Transition i (W[i] → W[i+1]) — Flip.fit over gap między T[i] i T[i+1]
      var transDur = (trigInfo[i + 1].top - trigInfo[i].bottom) / totalRange;
      masterTl.add(Flip.fit(target, wrappers[i + 1], {
        duration: transDur,
        ease: 'sine.inOut',
      }), '>');
    }
    // Final postój (target w W[last]) — empty tween over T[last].height
    masterTl.to({}, { duration: trigInfo[trigInfo.length - 1].h / totalRange }, '>');

    ScrollTrigger.create({
      id: 'gsap-flip-master',
      trigger: triggers[0],
      start: 'top center',
      endTrigger: triggers[triggers.length - 1],
      end: 'bottom center',
      scrub: 2,
      animation: masterTl,
    });
  }

  var initTarget = ctx.querySelector('[data-gsap-flip="target"]');
  if (!initTarget) return;
  if (initTarget.dataset.gsapFlipReady) return;
  initTarget.dataset.gsapFlipReady = '1';

  build();

  // Resize handler — Flip.fit captureuje source bbox przy create timeline, więc resize wymaga
  // pełnego rebuildu (kill ScrollTrigger + re-init). invalidateOnRefresh:true sam nie
  // wymusi re-capture Flip.fit source. Globalny flag chroni przed multiple bind przy SPA nav.
  if (!window.__gsapFlipResizeBound) {
    window.__gsapFlipResizeBound = true;
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var freshTarget = document.querySelector('[data-gsap-flip="target"]');
        if (!freshTarget) return;
        freshTarget.removeAttribute('style');
        delete freshTarget.dataset.gsapFlipReady;
        freshTarget.dataset.gsapFlipReady = '1';
        build();
      }, 250);
    });
  }
};

// -----------------------------------------------------------------------------
// SITE-WIDE: Scroll progress bar
// -----------------------------------------------------------------------------
/**
 * window.initScrollProgressBar() — site-wide progress bar w .nav (fixed bottom-right).
 *
 * Selektory: .progress-bar (animated fill), .progress-bar-wrap (clickable rail).
 * Scroll: scaleX 0→1 driven by ScrollTrigger scrub 0.5 (Lenis raf już daje ease,
 *   to dodaje delikatne dotykanie).
 * Click: lenis.scrollTo() — gsap ScrollToPlugin / window.scrollTo nie współpracują z Lenis raf.
 * ID 'scroll-progress' — kill-by-id chroni przed Lumos ColorChanger (zabija inne ST'y).
 * Guard data-scroll-progress-ready na body — chroni przed double init.
 */
window.initScrollProgressBar = function () {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  if (document.body.hasAttribute('data-scroll-progress-ready')) return;

  var bar = document.querySelector('.progress-bar');
  var wrap = document.querySelector('.progress-bar-wrap');
  if (!bar || !wrap) return;

  document.body.setAttribute('data-scroll-progress-ready', '');

  var stId = 'scroll-progress';
  ScrollTrigger.getAll()
    .filter(function (st) { return st.vars.id === stId; })
    .forEach(function (st) { st.kill(); });

  gsap.set(bar, { scaleY: 0, transformOrigin: 'center top' });
  gsap.to(bar, {
    scaleY: 1,
    ease: 'none',
    scrollTrigger: {
      id: stId,
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
    },
  });
};
