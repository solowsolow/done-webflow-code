// =============================================================================
// D ONE — Profile Page Footer
// =============================================================================
// Inity per-page dla strony Profile:
//   - initDirectionalListHover (kierunkowy hover na list items)
//   - initStackingCardsParallax (parallax na sąsiadujących stacking cards)
// =============================================================================

window.initDirectionalListHover = function (scope) {
  var ctx = scope || document;

  var directionMap = {
    top: 'translateY(-100%)',
    bottom: 'translateY(100%)',
    left: 'translateX(-100%)',
    right: 'translateX(100%)',
  };

  function getDirection(event, el, type) {
    var rect = el.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var w = rect.width;
    var h = rect.height;

    if (type === 'y') return y < h / 2 ? 'top' : 'bottom';
    if (type === 'x') return x < w / 2 ? 'left' : 'right';

    var distances = { top: y, right: w - x, bottom: h - y, left: x };
    return Object.entries(distances).reduce(function (a, b) {
      return a[1] < b[1] ? a : b;
    })[0];
  }

  ctx.querySelectorAll('[data-directional-hover]').forEach(function (container) {
    var type = container.getAttribute('data-type') || 'all';

    container.querySelectorAll('[data-directional-hover-item]:not([data-directional-hover-ready])').forEach(function (item) {
      var tile = item.querySelector('[data-directional-hover-tile]');
      if (!tile) return;

      item.setAttribute('data-directional-hover-ready', '');

      item.addEventListener('mouseenter', function (e) {
        var dir = getDirection(e, item, type);
        tile.style.transition = 'none';
        tile.style.transform = directionMap[dir] || 'translate(0, 0)';
        void tile.offsetHeight;
        tile.style.transition = '';
        tile.style.transform = 'translate(0%, 0%)';
        item.setAttribute('data-status', 'enter-' + dir);
      });

      item.addEventListener('mouseleave', function (e) {
        var dir = getDirection(e, item, type);
        item.setAttribute('data-status', 'leave-' + dir);
        tile.style.transform = directionMap[dir] || 'translate(0, 0)';
      });
    });
  });
};

window.initStackingCardsParallax = function (scope) {
  if (!window.gsap || !window.ScrollTrigger) return;

  var ctx = scope || document;
  var cards = ctx.querySelectorAll('[data-stacking-cards-item]');
  if (cards.length < 2) return;

  cards.forEach(function (card, i) {
    if (i === 0) return;
    if (card.hasAttribute('data-stacking-cards-ready')) return;

    var previousCard = cards[i - 1];
    if (!previousCard) return;

    var previousCardParagraph = previousCard.querySelector('[data-stacking-cards-paragraph]');
    var previousCardOverlay = previousCard.querySelector('[data-stacking-cards-overlay]');

    card.setAttribute('data-stacking-cards-ready', '');

    var tl = gsap.timeline({
      defaults: { ease: 'none', duration: 1 },
      scrollTrigger: {
        trigger: card,
        start: 'top bottom',
        end: 'top top',
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    tl.fromTo(previousCard, { yPercent: 0 }, { yPercent: 50 })
      .fromTo(previousCardParagraph, { rotate: 0, yPercent: 0 }, { rotate: -5, yPercent: -25 }, '<');

    if (previousCardOverlay) {
      tl.fromTo(previousCardOverlay, { opacity: 0 }, { opacity: 1 }, '<');
    }
  });

  // Last card parallax — triggered by next section (element with data-stacking-cards-end-trigger).
  // Same animation as inter-card parallax, just against the section that covers the last card.
  var lastCard = cards[cards.length - 1];
  var endTrigger = ctx.querySelector('[data-stacking-cards-end-trigger]');
  if (lastCard && endTrigger && !lastCard.hasAttribute('data-stacking-cards-end-ready')) {
    lastCard.setAttribute('data-stacking-cards-end-ready', '');
    var lastCardParagraph = lastCard.querySelector('[data-stacking-cards-paragraph]');
    var lastCardOverlay = lastCard.querySelector('[data-stacking-cards-overlay]');

    var tlLast = gsap.timeline({
      defaults: { ease: 'none', duration: 1 },
      scrollTrigger: {
        trigger: endTrigger,
        start: 'top bottom',
        end: 'top top',
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    tlLast.fromTo(lastCard, { yPercent: 0 }, { yPercent: 50 })
      .fromTo(lastCardParagraph, { rotate: 0, yPercent: 0 }, { rotate: -5, yPercent: -25 }, '<');

    if (lastCardOverlay) {
      tlLast.fromTo(lastCardOverlay, { opacity: 0 }, { opacity: 1 }, '<');
    }
  }
};
