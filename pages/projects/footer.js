// =============================================================================
// D ONE — Projects Page Footer
// =============================================================================
// Inity per-page dla strony Projects:
//   - initGridLayoutFlip (large/small grid toggle z GSAP Flip)
//   - initBasicFilterSetupMultiMatch (multi-tag filtrowanie collection)
// =============================================================================

// OSMO Layout Grid Flip
window.initGridLayoutFlip = function () {
  if (document.body.hasAttribute('data-layout-flip-ready')) return;
  if (typeof gsap === 'undefined' || typeof Flip === 'undefined') return;
  document.body.setAttribute('data-layout-flip-ready', '');

  const groups = document.querySelectorAll('[data-layout-group]');
  const ACTIVE_CLASS = 'is--active'; // The classes toggled on your buttons

  groups.forEach((group) => {
    let activeTween = null;

    const buttons = group.querySelectorAll('[data-layout-button]');
    const grid = group.querySelector('[data-layout-grid]');
    const collection = group.querySelector('[data-layout-grid-collection]');
    if (!buttons.length || !grid || !collection) {
      console.warn('Missing required HTML elements. Check the Osmo resoure documentation!');
      return;
    }

    // a11y init
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.classList.contains(ACTIVE_CLASS))));

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetLayout = btn.getAttribute('data-layout-button'); // "large" | "small"
        const currentLayout = group.getAttribute('data-layout-status');
        if (currentLayout === targetLayout) return;

        // Kill any in-flight animation
        if (activeTween) {
          activeTween.kill();
          activeTween = null;
        }

        // Reduced-motion: just toggle and refresh
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          group.setAttribute('data-layout-status', targetLayout);
          buttons.forEach((b) => {
            const isActive = b === btn;
            b.classList.toggle(ACTIVE_CLASS, isActive);
            b.setAttribute('aria-pressed', String(isActive));
          });
          window.ScrollTrigger?.refresh?.();
          if (window.lenis?.resize) window.lenis.resize();
          return;
        }

        // Flip.from z extended targets — gif analiza pokazała że content (card-title
        // font-size, card-sub opacity) snapuje INSTANT po setAttribute przed Flip
        // animation start. CSS `[data-layout-status='X'] .card-title { font-size: }`
        // apply do title niezależnie od że items są pos:absolute. Title font-size
        // zmienia się w paint window → user widzi "wielki tekst w małej ramce" przed
        // animacją.
        //
        // Fix: capture state ALL relevant elements (items + card-title + card-sub).
        // Flip animuje też ich font-size i opacity smoothly. `absolute: itemsArr`
        // ogranicza pos:absolute hack tylko do items — children zostają w flow.
        const itemsArr = Array.from(grid.querySelectorAll('[data-layout-grid-item]'));
        const titles = Array.from(grid.querySelectorAll('.layout-grid__card-title'));
        const subs = Array.from(grid.querySelectorAll('.layout-grid__card-sub'));
        const allTargets = [...itemsArr, ...titles, ...subs];
        const state = Flip.getState(allTargets);

        collection.getBoundingClientRect();
        const prevH = collection.offsetHeight;

        group.setAttribute('data-layout-status', targetLayout);
        buttons.forEach((b) => {
          const isActive = b === btn;
          b.classList.toggle(ACTIVE_CLASS, isActive);
          b.setAttribute('aria-pressed', String(isActive));
        });

        collection.getBoundingClientRect();
        const nextH = collection.offsetHeight;

        gsap.set(collection, { height: prevH });

        group.setAttribute('data-transitioning', 'true');

        const tl = gsap.timeline({
          onInterrupt: () => {
            group.removeAttribute('data-transitioning');
            gsap.set(collection, { clearProps: 'height' });
          },
          onComplete: () => {
            group.removeAttribute('data-transitioning');
            gsap.set(collection, { clearProps: 'height' });
            window.ScrollTrigger?.refresh?.();
            if (window.lenis?.resize) window.lenis.resize();
            activeTween = null;
          },
        });

        // Iter 10: usunięte `absolute: itemsArr`. Każda poprzednia iteracja z włączonym
        // `absolute` produkowała "skok kafelków 2+ do top-left" (paint window przy
        // apply position:absolute). Bez absolute items zostają w grid flow, Flip animuje
        // delta transforms — aktualny Head iter 8 (transition: none + transform: none
        // na flip-active) eliminuje CSS conflict który był podejrzewany w iter 3.
        tl.add(
          Flip.from(state, {
            duration: 0.65,
            ease: 'power4.inOut',
            nested: true,
            prune: true,
            stagger: targetLayout === 'large' ? { each: 0.03, from: 'end' } : { each: 0.03, from: 'start' },
          }),
          0,
        ).to(
          collection,
          {
            height: nextH,
            duration: 0.65,
            ease: 'power4.inOut',
          },
          0,
        );

        activeTween = tl;
      });
    });
  });
};

// OSMO Basic Filter Setup (Multi Match)
window.initBasicFilterSetupMultiMatch = function () {
  if (document.body.hasAttribute('data-filter-ready')) return;
  document.body.setAttribute('data-filter-ready', '');

  const transitionDelay = 300;
  const groups = [...document.querySelectorAll('[data-filter-group]')];

  groups.forEach((group) => {
    const buttons = [...group.querySelectorAll('[data-filter-target]')];
    const items = [...group.querySelectorAll('[data-filter-name]')];

    // collect names once (init only)
    items.forEach((item) => {
      const cs = item.querySelectorAll('[data-filter-name-collect]');
      if (!cs.length) return;
      const seen = new Set(),
        out = [];
      cs.forEach((c) => {
        const v = (c.getAttribute('data-filter-name-collect') || '').trim().toLowerCase();
        if (v && !seen.has(v)) {
          seen.add(v);
          out.push(v);
        }
      });
      if (out.length) item.setAttribute('data-filter-name', out.join(' '));
    });

    // cache tokens
    const itemTokens = new Map();
    items.forEach((el) => {
      const tokens = (el.getAttribute('data-filter-name') || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
      itemTokens.set(el, new Set(tokens));
    });

    // state helpers
    const setItemState = (el, on) => {
      const next = on ? 'active' : 'not-active';
      if (el.getAttribute('data-filter-status') !== next) {
        el.setAttribute('data-filter-status', next);
        el.setAttribute('aria-hidden', on ? 'false' : 'true');
      }
    };
    const setButtonState = (btn, on) => {
      const next = on ? 'active' : 'not-active';
      if (btn.getAttribute('data-filter-status') !== next) {
        btn.setAttribute('data-filter-status', next);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    };

    let activeTarget = null;
    const itemMatches = (el) => {
      if (!activeTarget || activeTarget === 'all') return true;
      return itemTokens.get(el).has(activeTarget);
    };

    const paint = (rawTarget) => {
      const target = (rawTarget || '').trim().toLowerCase();
      activeTarget = !target || target === 'all' ? 'all' : target;

      items.forEach((el) => {
        if (el._ft) clearTimeout(el._ft);
        const next = itemMatches(el);
        const cur = el.getAttribute('data-filter-status');
        if (cur === 'active' && transitionDelay > 0) {
          el.setAttribute('data-filter-status', 'transition-out');
          el._ft = setTimeout(() => {
            setItemState(el, next);
            el._ft = null;
          }, transitionDelay);
        } else if (transitionDelay > 0) {
          el._ft = setTimeout(() => {
            setItemState(el, next);
            el._ft = null;
          }, transitionDelay);
        } else {
          setItemState(el, next);
        }
      });

      buttons.forEach((btn) => {
        const t = (btn.getAttribute('data-filter-target') || '').trim().toLowerCase();
        setButtonState(btn, (activeTarget === 'all' && t === 'all') || (t && t === activeTarget));
      });
    };

    group.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter-target]');
      if (btn && group.contains(btn)) paint(btn.getAttribute('data-filter-target'));
    });
  });
};
