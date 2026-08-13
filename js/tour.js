/* =============================================
   Color Wagon - interior tour

   The panorama is the map, not the destination. Drag it to look around,
   then pick a stop and the view swings to that spot and opens the real
   photo of it. Every stop is a genuine photo of that feature, not a
   caption over a distant pixel.

   Hotspots are positioned as a percentage of the IMAGE, so they stay
   pinned to the thing they point at while the image pans.
   ============================================= */
(function () {
  'use strict';

  var STOPS = [
    { id:'kitchen', x:5,  y:55, label:'Rear kitchen',
      text:'The back doors open onto the kitchen: pull-out propane stove, sink with a 5-gallon water tank, and a refrigerator. You cook facing out, not hunched inside.' },
    { id:'curtains', x:27, y:34, label:'Privacy curtains',
      text:'Blackout curtains run the whole way round, so you can change, sleep in, or park somewhere bright and still get a proper night.' },
    { id:'bed', x:33, y:80, label:'Queen bed',
      text:'The bench folds out to a full queen, and it comes made up. Bedding, linens and pillows are included, so there is nothing to inflate or unroll.' },
    { id:'cab', x:61, y:50, label:'It drives like a van',
      text:'No special licence, no air brakes, no trailer to reverse. It parks in a normal spot and averages around 16 mpg, the best gas mileage you will find in an RV.' },
    { id:'door', x:88, y:52, label:'Side door',
      text:'The sliding door is your front door. Step straight out onto the campsite, or leave it open with the curtains drawn for shade and a breeze.' }
  ];

  var BASE = 'colorwagonrentals/tour/stop-';

  function init(root) {
    var viewport = root.querySelector('.tour-viewport');
    var plane    = root.querySelector('.tour-plane');
    var img      = plane && plane.querySelector('img');
    var scope    = root.parentNode || document;
    var strip    = scope.querySelector('.tour-strip');
    var panel    = scope.querySelector('.tour-panel');
    var pImg     = panel && panel.querySelector('.tour-panel-img');
    var pTitle   = panel && panel.querySelector('h4');
    var pText    = panel && panel.querySelector('p');
    var railFill = root.querySelector('.tour-rail span');

    // If the markup and this script ever fall out of step (a cached copy of
    // one paired with a fresh copy of the other), bail out quietly instead of
    // throwing partway through and leaving a dead, undraggable panorama on the
    // page. Worst case the visitor sees a plain photo, which still works.
    if (!viewport || !plane || !img || !strip || !panel || !pImg || !pTitle || !pText) {
      if (window.console && console.warn) {
        console.warn('[tour] markup and script are out of step, skipping enhancement');
      }
      return;
    }

    var maxScroll = 0, pos = 0, current = null;

    function measure() {
      maxScroll = Math.max(0, plane.scrollWidth - viewport.clientWidth);
      if (railFill) {
        var frac = plane.scrollWidth ? viewport.clientWidth / plane.scrollWidth : 1;
        railFill.style.width = Math.max(12, Math.min(100, frac * 100)) + '%';
      }
      apply(pos);
    }

    function apply(next) {
      pos = Math.max(-maxScroll, Math.min(0, next));
      plane.style.transform = 'translate3d(' + pos + 'px,0,0)';
      if (railFill && maxScroll > 0) {
        var travel = 100 - parseFloat(railFill.style.width || '30');
        railFill.style.marginLeft = ((-pos / maxScroll) * travel) + '%';
      }
    }

    // Glide the panorama so a stop sits in the middle of the frame.
    function panTo(stop, animate) {
      var target = -((stop.x / 100) * plane.scrollWidth - viewport.clientWidth / 2);
      target = Math.max(-maxScroll, Math.min(0, target));
      if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        var from = pos, delta = target - from, t0 = performance.now(), dur = 480;
        (function step(now) {
          var k = Math.min(1, (now - t0) / dur);
          apply(from + delta * (1 - Math.pow(1 - k, 3)));   // ease-out cubic
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      } else {
        apply(target);
      }
    }

    function select(stop, animate) {
      current = stop.id;
      root.querySelectorAll('.tour-spot').forEach(function (n) {
        n.classList.toggle('is-active', n.dataset.stop === stop.id);
      });
      strip.querySelectorAll('.tour-chip').forEach(function (n) {
        var on = n.dataset.stop === stop.id;
        n.classList.toggle('is-active', on);
        n.setAttribute('aria-pressed', String(on));
      });
      pImg.src = BASE + stop.id + '.webp';
      pImg.alt = stop.label + ' inside a Color Wagon camper';
      pTitle.textContent = stop.label;
      pText.textContent = stop.text;
      panel.classList.add('is-open');
      panTo(stop, animate);
      root.classList.add('has-moved');
    }

    // ---- build hotspots on the panorama ----
    STOPS.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tour-spot';
      b.dataset.stop = s.id;
      b.style.left = s.x + '%';
      b.style.top = s.y + '%';
      b.textContent = String(i + 1);
      b.setAttribute('aria-label', 'Show ' + s.label);
      b.addEventListener('click', function (e) { e.stopPropagation(); select(s, true); });
      plane.appendChild(b);
    });

    // ---- build the stop strip ----
    STOPS.forEach(function (s, i) {
      var c = document.createElement('button');
      c.type = 'button';
      c.className = 'tour-chip';
      c.dataset.stop = s.id;
      c.setAttribute('aria-pressed', 'false');
      c.innerHTML = '<img src="' + BASE + s.id + '-thumb.webp" alt="" width="300" height="300" loading="lazy" decoding="async">' +
                    '<span>' + (i + 1) + '. ' + s.label + '</span>';
      c.addEventListener('click', function () { select(s, true); });
      strip.appendChild(c);
    });

    // ---- drag / swipe ----
    var dragging = false, startX = 0, startPos = 0, moved = 0;
    root.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.tour-spot')) return;
      dragging = true; moved = 0; startX = e.clientX; startPos = pos;
      root.classList.add('is-dragging');
      if (root.setPointerCapture) root.setPointerCapture(e.pointerId);
    });
    root.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      if (moved > 4) root.classList.add('has-moved');
      apply(startPos + dx);
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      root.addEventListener(ev, function () { dragging = false; root.classList.remove('is-dragging'); });
    });

    // ---- keyboard ----
    root.tabIndex = 0;
    root.addEventListener('keydown', function (e) {
      var step = viewport.clientWidth * 0.3;
      if (e.key === 'ArrowRight') { apply(pos - step); root.classList.add('has-moved'); e.preventDefault(); }
      if (e.key === 'ArrowLeft')  { apply(pos + step); root.classList.add('has-moved'); e.preventDefault(); }
    });

    if (img.complete) measure(); else img.addEventListener('load', measure);
    window.addEventListener('resize', measure);

    // Open on the kitchen: it is the feature people ask about and the one
    // that separates these from a van with a mattress in it.
    if (img.complete) select(STOPS[0], false);
    else img.addEventListener('load', function () { select(STOPS[0], false); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-tour]').forEach(init);
  });
})();
