// =============================================================================
// D ONE — D Group Page Footer
// =============================================================================
// Inity per-page dla strony D Group:
//   - initNumberOdometer (rolling digits scroll-triggered)
//   - initModalBasic (basic modal open/close)
// =============================================================================

(function () {
  window.__odometerState = window.__odometerState || {
    activeTweens: new WeakMap(),
    resizeBound: false,
    resizeTimer: null,
    lastWidth: window.innerWidth,
  };
  var state = window.__odometerState;

  var defaults = {
    duration: 1,
    ease: 'power3.out',
    elementStagger: 0.1,
    digitStagger: 0.04,
    revealDuration: 0.5,
    revealEase: 'power2.out',
    triggerStart: 'top 80%',
    staggerOrder: 'left',
    digitCycles: 2,
  };

  window.initNumberOdometer = function (scope) {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    var ctx = scope || document;
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var initFlag = 'data-odometer-initialized';

    ctx.querySelectorAll('[data-odometer-group]').forEach(function (group) {
      if (group.hasAttribute(initFlag)) return;
      group.setAttribute(initFlag, '');

      var elements = Array.from(group.querySelectorAll('[data-odometer-element]'));
      if (!elements.length || prefersReducedMotion) return;

      var staggerOrder = group.getAttribute('data-odometer-stagger-order') || defaults.staggerOrder;
      var triggerStart = group.getAttribute('data-odometer-trigger-start') || defaults.triggerStart;
      var elementStagger = parseFloat(group.getAttribute('data-odometer-stagger')) || defaults.elementStagger;

      var elementData = elements.map(function (el) {
        var originalText = el.textContent.trim();
        var hasExplicitStart = el.hasAttribute('data-odometer-start');
        var startValue = parseFloat(el.getAttribute('data-odometer-start')) || 0;
        var duration = parseFloat(el.getAttribute('data-odometer-duration')) || defaults.duration;
        var step = getLineHeightRatio(el);

        var segments = parseSegments(originalText);
        segments = mapStartDigits(segments, startValue);
        segments = markHiddenSegments(segments, startValue);

        var grow = shouldGrow(el, hasExplicitStart, startValue, segments);
        var built = buildRollerDOM(el, segments, step, grow);

        var fontSize = parseFloat(getComputedStyle(el).fontSize);
        var revealData = built.revealEls.map(function (revealEl) {
          var widthEm = revealEl.offsetWidth / fontSize;
          gsap.set(revealEl, { width: 0, overflow: 'hidden' });
          return { el: revealEl, widthEm: widthEm };
        });

        return { el: el, rollers: built.rollers, duration: duration, step: step, revealData: revealData, originalText: originalText };
      });

      var ordered = applyStaggerOrder(elementData, staggerOrder);

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: group,
          start: triggerStart,
          once: true,
        },
        onComplete: function () {
          elementData.forEach(function (data) {
            cleanupElement(data.el, data.originalText);
          });
        },
      });

      ordered.forEach(function (data, orderIdx) {
        var offset = orderIdx * elementStagger;

        data.revealData.forEach(function (rd) {
          tl.to(rd.el, {
            width: rd.widthEm + 'em',
            opacity: 1,
            duration: defaults.revealDuration,
            ease: defaults.revealEase,
          }, offset);
        });

        data.rollers.forEach(function (roller, digitIdx) {
          var reversedIdx = data.rollers.length - 1 - digitIdx;
          tl.to(roller.roller, {
            y: -roller.targetPos * data.step + 'em',
            duration: data.duration,
            ease: defaults.ease,
            force3D: true,
          }, offset + reversedIdx * defaults.digitStagger);
        });
      });
    });

    if (!state.resizeBound) {
      state.resizeBound = true;
      window.addEventListener('resize', function () {
        clearTimeout(state.resizeTimer);
        state.resizeTimer = setTimeout(function () {
          if (window.innerWidth === state.lastWidth) return;
          state.lastWidth = window.innerWidth;
          recalcOnResize();
        }, 250);
      });
    }
  };

  function getLineHeightRatio(el) {
    var cs = getComputedStyle(el);
    var lh = cs.lineHeight;
    if (lh === 'normal') return 1.2;
    return parseFloat(lh) / parseFloat(cs.fontSize);
  }

  function parseSegments(text) {
    return Array.from(text).map(function (char) {
      return { type: /\d/.test(char) ? 'digit' : 'static', char: char };
    });
  }

  function mapStartDigits(segments, startValue) {
    var digitSlots = segments.filter(function (s) { return s.type === 'digit'; });
    var padded = String(Math.floor(Math.abs(startValue)))
      .padStart(digitSlots.length, '0')
      .slice(-digitSlots.length);
    var di = 0;
    return segments.map(function (s) {
      if (s.type === 'digit') {
        return Object.assign({}, s, { startDigit: parseInt(padded[di++], 10) });
      }
      return s;
    });
  }

  function markHiddenSegments(segments, startValue) {
    var totalDigits = segments.filter(function (s) { return s.type === 'digit'; }).length;
    var absStart = Math.floor(Math.abs(startValue));
    var startDigitCount = absStart === 0 ? 1 : String(absStart).length;
    var leadingZeros = Math.max(0, totalDigits - startDigitCount);
    if (leadingZeros === 0) return segments;
    var digitsSeen = 0;
    var firstDigitSeen = false;
    var prevDigitHidden = false;
    return segments.map(function (seg) {
      if (seg.type === 'digit') {
        firstDigitSeen = true;
        var hidden = digitsSeen < leadingZeros;
        prevDigitHidden = hidden;
        digitsSeen++;
        return Object.assign({}, seg, { hidden: hidden });
      }
      var hidden2 = firstDigitSeen && prevDigitHidden;
      return Object.assign({}, seg, { hidden: hidden2 });
    });
  }

  function shouldGrow(el, hasExplicitStart, startValue, segments) {
    if (el.hasAttribute('data-odometer-grow')) {
      return el.getAttribute('data-odometer-grow') !== 'false';
    }
    if (!hasExplicitStart) return false;
    var absStart = Math.floor(Math.abs(startValue));
    var startDigitCount = absStart === 0 ? 1 : String(absStart).length;
    var endDigitCount = segments.filter(function (s) { return s.type === 'digit'; }).length;
    return startDigitCount < endDigitCount;
  }

  function buildRollerDOM(el, segments, step, grow) {
    el.textContent = '';
    el.style.height = '';
    var rollers = [];
    var revealEls = [];
    var totalCells = 10 * defaults.digitCycles;
    segments.forEach(function (seg) {
      if (seg.type === 'static') {
        var span = document.createElement('span');
        span.setAttribute('data-odometer-part', 'static');
        span.style.height = step + 'em';
        span.style.lineHeight = step;
        span.textContent = seg.char;
        el.appendChild(span);
        if (grow && seg.hidden) {
          gsap.set(span, { opacity: 0 });
          revealEls.push(span);
        }
        return;
      }
      var mask = document.createElement('span');
      mask.setAttribute('data-odometer-part', 'mask');
      mask.style.height = step + 'em';
      mask.style.lineHeight = step;
      var roller = document.createElement('span');
      roller.setAttribute('data-odometer-part', 'roller');
      roller.style.lineHeight = step;

      var digits = [];
      for (var d = 0; d < totalCells; d++) {
        digits.push(d % 10);
      }
      roller.textContent = digits.join('\n');
      mask.appendChild(roller);
      el.appendChild(mask);
      var startDigit = seg.startDigit || 0;
      var isReveal = grow && seg.hidden;
      gsap.set(roller, { y: isReveal ? step + 'em' : -startDigit * step + 'em' });
      var endDigit = parseInt(seg.char, 10);
      var targetPos = endDigit > startDigit ? endDigit : 10 + endDigit;
      rollers.push({ roller: roller, targetPos: targetPos });
      if (isReveal) revealEls.push(mask);
    });
    return { rollers: rollers, revealEls: revealEls };
  }

  function cleanupElement(el, originalText) {
    el.style.overflow = '';
    el.style.height = '';

    var digits = Array.from(originalText).filter(function (c) { return /\d/.test(c); });
    var di = 0;

    el.querySelectorAll('[data-odometer-part="mask"]').forEach(function (mask) {
      var roller = mask.querySelector('[data-odometer-part="roller"]');
      if (roller) roller.remove();
      mask.textContent = digits[di++] || '';
      mask.style.opacity = '';
      mask.style.overflow = '';
    });

    el.querySelectorAll('[data-odometer-part="static"]').forEach(function (stat) {
      stat.style.opacity = '';
    });
  }

  function recalcOnResize() {
    document.querySelectorAll('[data-odometer-element]').forEach(function (el) {
      var running = state.activeTweens.get(el);
      if (running) {
        running.progress(1);
        state.activeTweens.delete(el);
      }

      var hasRollers = el.querySelector('[data-odometer-part="roller"]');

      if (hasRollers) {
        var step = getLineHeightRatio(el);
        el.querySelectorAll('[data-odometer-part="mask"]').forEach(function (mask) {
          mask.style.height = step + 'em';
          mask.style.lineHeight = step;
        });
        el.querySelectorAll('[data-odometer-part="roller"]').forEach(function (roller) {
          roller.style.lineHeight = step;
        });
        el.querySelectorAll('[data-odometer-part="static"]').forEach(function (stat) {
          stat.style.lineHeight = step;
        });
      }
    });
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }

  function applyStaggerOrder(items, order) {
    var arr = items.slice();
    if (order === 'right') return arr.reverse();
    if (order === 'random') return shuffleArray(arr);
    return arr;
  }

  function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }
})();

window.initModalBasic = function (scope) {
  if (document.body.hasAttribute('data-modal-basic-ready')) return;
  document.body.setAttribute('data-modal-basic-ready', '');

  function closeAllModals() {
    document.querySelectorAll('[data-modal-target]').forEach(function (target) {
      target.setAttribute('data-modal-status', 'not-active');
    });
    document.querySelectorAll('[data-modal-name]').forEach(function (modal) {
      modal.setAttribute('data-modal-status', 'not-active');
    });
    var modalGroup = document.querySelector('[data-modal-group-status]');
    if (modalGroup) modalGroup.setAttribute('data-modal-group-status', 'not-active');
  }

  document.addEventListener('click', function (e) {
    var openTrigger = e.target.closest && e.target.closest('[data-modal-target]');
    if (openTrigger) {
      var name = openTrigger.getAttribute('data-modal-target');
      if (!name) return;

      closeAllModals();

      var trigger = document.querySelector('[data-modal-target="' + name + '"]');
      var modal = document.querySelector('[data-modal-name="' + name + '"]');
      if (trigger) trigger.setAttribute('data-modal-status', 'active');
      if (modal) modal.setAttribute('data-modal-status', 'active');
      var modalGroup = document.querySelector('[data-modal-group-status]');
      if (modalGroup) modalGroup.setAttribute('data-modal-group-status', 'active');
      return;
    }

    var closeBtn = e.target.closest && e.target.closest('[data-modal-close]');
    if (closeBtn) {
      closeAllModals();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllModals();
  });
};
