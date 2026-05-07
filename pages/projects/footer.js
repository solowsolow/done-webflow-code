// =============================================================================
// D ONE — Projects Page Footer
// =============================================================================
// Init per-page dla strony Projects:
//   - initBasicFilterSetupMultiMatch (multi-tag filtrowanie collection)
//
// Usunięte 2026-05-07: initGridLayoutFlip (Osmo Layout Grid Flip large/small toggle).
// Decyzja po 10 iteracjach bez pełnego fixu (zob. project_projects_grid_flip_iterations.md).
// =============================================================================

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
