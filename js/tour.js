/* =============================================
   Color Wagon - interior tour
   Drag / swipe / arrow-key panning across a wide interior sweep, with
   labelled hotspots that open a caption. Hotspots are positioned as a
   percentage of the IMAGE, not the viewport, so they stay pinned to the
   thing they point at while the image pans.
   ============================================= */
(function () {
  'use strict';

  var SPOTS = [
    { x: 5,  y: 55, label: 'Rear kitchen',
      text: 'The back doors open onto the kitchen: pull-out propane stove, sink with a 5-gallon water tank, and a refrigerator. You cook facing out, not hunched inside.' },
    { x: 27, y: 34, label: 'Privacy curtains',
      text: 'Blackout curtains run the whole way round, so you can change, sleep in, or park somewhere bright and still get a proper night.' },
    { x: 33, y: 80, label: 'Queen bed',
      text: 'The bench folds out to a full queen. It comes made up: bedding, linens and pillows are all included, so there is nothing to inflate or unroll.' },
    { x: 61, y: 50, label: 'It drives like a van',
      text: 'No special licence, no air brakes, no trailer to reverse. It parks in a normal spot and averages around 16 mpg, the best gas mileage you will find in an RV.' },
    { x: 88, y: 52, label: 'Side door',
      text: 'The sliding door is your front door. Step straight out onto the campsite, or leave it open with the curtains drawn for shade and a breeze.' }
  ];

  function init(root) {
    var viewport = root.querySelector('.tour-viewport');
    var plane    = root.querySelector('.tour-plane');
    var img      = plane.querySelector('img');
    var caption  = root.querySelector('.tour-caption');
    var capTitle = caption.querySelector('h4');
    var capText  = caption.querySelector('p');
    var railFill = root.querySelector('.tour-rail span');

    var maxScroll = 0;   // how far the image can travel, in px
    var pos = 0;         // current offset, 0 .. -maxScroll

    function measure() {
      var over = plane.scrollWidth - viewport.clientWidth;
      maxScroll = Math.max(0, over);
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
        var p = -pos / maxScroll;
        var travel = 100 - parseFloat(railFill.style.width || '30');
        railFill.style.marginLeft = (p * travel) + '%';
      }
    }

    // ---- hotspots ----
    SPOTS.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tour-spot';
      b.style.left = s.x + '%';
      b.style.top = s.y + '%';
      b.textContent = String(i + 1);
      b.setAttribute('aria-label', s.label);
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        open(s, b);
      });
      plane.appendChild(b);
    });

    function open(s, btn) {
      root.querySelectorAll('.tour-spot').forEach(function (n) { n.classList.remove('is-active'); });
      if (btn) btn.classList.add('is-active');
      capTitle.textContent = s.label;
      capText.textContent = s.text;
      caption.classList.add('is-open');
      root.classList.add('has-moved');
    }
    function close() {
      caption.classList.remove('is-open');
      root.querySelectorAll('.tour-spot').forEach(function (n) { n.classList.remove('is-active'); });
    }
    caption.querySelector('.tour-caption-close').addEventListener('click', function (e) {
      e.stopPropagation(); close();
    });

    // ---- drag / swipe ----
    var dragging = false, startX = 0, startPos = 0, moved = 0;

    function down(clientX) {
      dragging = true; moved = 0;
      startX = clientX; startPos = pos;
      root.classList.add('is-dragging');
    }
    function move(clientX) {
      if (!dragging) return;
      var dx = clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      if (moved > 4) root.classList.add('has-moved');
      apply(startPos + dx);
    }
    function up() { dragging = false; root.classList.remove('is-dragging'); }

    root.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.tour-spot, .tour-caption')) return;
      down(e.clientX);
      root.setPointerCapture && root.setPointerCapture(e.pointerId);
    });
    root.addEventListener('pointermove', function (e) { move(e.clientX); });
    root.addEventListener('pointerup', up);
    root.addEventListener('pointercancel', up);
    root.addEventListener('click', function (e) {
      // a drag should not also count as a tap that closes the caption
      if (moved > 6) return;
      if (!e.target.closest('.tour-spot, .tour-caption')) close();
    });

    // ---- keyboard ----
    root.tabIndex = 0;
    root.addEventListener('keydown', function (e) {
      var step = viewport.clientWidth * 0.3;
      if (e.key === 'ArrowRight') { apply(pos - step); root.classList.add('has-moved'); e.preventDefault(); }
      if (e.key === 'ArrowLeft')  { apply(pos + step); root.classList.add('has-moved'); e.preventDefault(); }
      if (e.key === 'Escape') close();
    });

    if (img.complete) measure();
    else img.addEventListener('load', measure);
    window.addEventListener('resize', measure);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-tour]').forEach(init);
  });
})();
