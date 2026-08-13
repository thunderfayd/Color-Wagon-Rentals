/* =============================================
   Color Wagon - interior tour

   Works like a map with pins. The overview is the whole interior in one
   frame, with a numbered pin on each feature. Tap a pin and you are taken
   into a full photo of that thing, filling the same frame. A back control
   returns you to the overview, and you can move straight between stops.

   No dragging: the overview shows everything at once, so there is nothing
   to hunt for.
   ============================================= */
(function () {
  'use strict';

  var STOPS = [
    { id:'kitchen', x:8,  y:62, label:'Rear kitchen',
      text:'The back doors open onto the kitchen: a pull-out propane stove, a sink with a 5-gallon water tank, and a refrigerator. You cook facing out into the open, not hunched inside.' },
    { id:'curtains', x:27, y:32, label:'Privacy curtains',
      text:'Blackout curtains run the whole way round. Change, sleep in, or park somewhere bright and still get a proper night.' },
    { id:'bed', x:35, y:82, label:'Queen bed',
      text:'The bench folds out to a full queen and it comes made up. Bedding, linens and pillows are included, so there is nothing to inflate or unroll.' },
    { id:'cab', x:61, y:48, label:'It drives like a van',
      text:'No special licence, no air brakes, no trailer to reverse. It parks in a normal spot and averages around 16 mpg, the best gas mileage you will find in an RV.' },
    { id:'door', x:88, y:52, label:'Side door',
      text:'The sliding door is your front door. Step straight out onto the campsite, or leave it open with the curtains drawn for shade and a breeze.' }
  ];

  var BASE = 'colorwagonrentals/tour/stop-';

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function init(root) {
    var stage = root.querySelector('.tour-stage');
    var overview = root.querySelector('.tour-scene-overview');
    var map = root.querySelector('.tour-map');
    var strip = root.querySelector('.tour-strip');

    // If markup and script ever fall out of step (a cached copy of one paired
    // with a fresh copy of the other), leave the page alone rather than
    // throwing halfway through and stranding a dead widget.
    if (!stage || !overview || !map || !strip) {
      if (window.console && console.warn) console.warn('[tour] markup out of step, skipping');
      return;
    }

    var scenes = { overview: overview };
    var currentId = 'overview';

    // ---- build a scene per stop ----
    STOPS.forEach(function (s, i) {
      var scene = el('div', 'tour-scene tour-scene-detail');
      scene.dataset.scene = s.id;

      var img = el('img', 'tour-photo');
      img.src = BASE + s.id + '.webp';
      img.alt = s.label + ' inside a Color Wagon camper';
      img.loading = 'lazy';
      img.decoding = 'async';
      scene.appendChild(img);

      var card = el('div', 'tour-info',
        '<span class="tour-info-step">Stop ' + (i + 1) + ' of ' + STOPS.length + '</span>' +
        '<h4>' + s.label + '</h4>' +
        '<p>' + s.text + '</p>');
      scene.appendChild(card);

      var back = el('button', 'tour-back', '<span aria-hidden="true">&#8592;</span> Back to the camper');
      back.type = 'button';
      back.addEventListener('click', function () { go('overview'); });
      scene.appendChild(back);

      var nav = el('div', 'tour-arrows');
      var prev = el('button', 'tour-arrow', '<span aria-hidden="true">&#8249;</span>');
      prev.type = 'button';
      prev.setAttribute('aria-label', 'Previous stop');
      prev.addEventListener('click', function () { go(STOPS[(i - 1 + STOPS.length) % STOPS.length].id); });
      var next = el('button', 'tour-arrow', '<span aria-hidden="true">&#8250;</span>');
      next.type = 'button';
      next.setAttribute('aria-label', 'Next stop');
      next.addEventListener('click', function () { go(STOPS[(i + 1) % STOPS.length].id); });
      nav.appendChild(prev); nav.appendChild(next);
      scene.appendChild(nav);

      stage.appendChild(scene);
      scenes[s.id] = scene;
    });

    // ---- pins on the overview ----
    // These sit inside .tour-map, not the scene, so their percentages are
    // measured against the photo itself and stay put at any screen width.
    STOPS.forEach(function (s, i) {
      var pin = el('button', 'tour-pin', '<span class="tour-pin-num">' + (i + 1) + '</span>' +
                                         '<span class="tour-pin-label">' + s.label + '</span>');
      pin.type = 'button';
      pin.dataset.stop = s.id;
      pin.style.left = s.x + '%';
      pin.style.top = s.y + '%';
      pin.setAttribute('aria-label', 'Go to ' + s.label);
      pin.addEventListener('click', function () { go(s.id); });
      map.appendChild(pin);
    });

    // ---- strip ----
    STOPS.forEach(function (s, i) {
      var c = el('button', 'tour-chip',
        '<img src="' + BASE + s.id + '-thumb.webp" alt="" width="300" height="300" loading="lazy" decoding="async">' +
        '<span>' + (i + 1) + '. ' + s.label + '</span>');
      c.type = 'button';
      c.dataset.stop = s.id;
      c.setAttribute('aria-pressed', 'false');
      c.addEventListener('click', function () { go(s.id); });
      strip.appendChild(c);
    });

    // ---- navigation ----
    function go(id) {
      if (id === currentId || !scenes[id]) return;
      var from = scenes[currentId], to = scenes[id];

      from.classList.remove('is-active');
      from.classList.add('is-leaving');
      window.setTimeout(function () { from.classList.remove('is-leaving'); }, 420);

      to.classList.add('is-active');
      currentId = id;

      strip.querySelectorAll('.tour-chip').forEach(function (n) {
        var on = n.dataset.stop === id;
        n.classList.toggle('is-active', on);
        n.setAttribute('aria-pressed', String(on));
      });
      root.classList.toggle('is-detail', id !== 'overview');

      // move focus so keyboard and screen reader users land in the new scene
      var target = to.querySelector('.tour-back') || to;
      if (target.focus) target.focus({ preventScroll: true });
    }

    root.addEventListener('keydown', function (e) {
      if (currentId === 'overview') return;
      var i = STOPS.findIndex(function (s) { return s.id === currentId; });
      if (e.key === 'Escape')     { go('overview'); e.preventDefault(); }
      if (e.key === 'ArrowRight') { go(STOPS[(i + 1) % STOPS.length].id); e.preventDefault(); }
      if (e.key === 'ArrowLeft')  { go(STOPS[(i - 1 + STOPS.length) % STOPS.length].id); e.preventDefault(); }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-tour]').forEach(init);
  });
})();
