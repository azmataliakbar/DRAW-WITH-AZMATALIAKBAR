/* Element factory. Elements are plain, JSON-serializable objects.
   Geometry: rectangles/diamonds/ellipses use x, y (top-left), width, height.
   Linear elements (line, arrow, freedraw) use x, y as the origin and `points`
   as offsets from it: [[0, 0], [dx, dy], ...]. Z-order is the array index.
   Exposes window.Draw.element. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});
  var STYLE_KEYS = Object.keys(Draw.Types.DEFAULT_STYLE);

  function randomId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  // Seed for the hand-drawn wobble. Fixed per element so shapes do not shimmer.
  function randomSeed() {
    return 1 + Math.floor(Math.random() * 2147483646);
  }

  function create(type, x, y, style) {
    var el = {
      id: randomId(),
      type: type,
      x: x,
      y: y,
      width: 0,
      height: 0,
      points: null,
      seed: randomSeed(),
      isDeleted: false,
      version: 1,
      versionNonce: randomSeed()
    };
    for (var i = 0; i < STYLE_KEYS.length; i++) {
      el[STYLE_KEYS[i]] = style[STYLE_KEYS[i]];
    }
    return el;
  }

  // Returns a new element with `patch` applied; bumps version. Used by later stages.
  function withPatch(el, patch) {
    var next = Object.assign({}, el, patch);
    next.version = el.version + 1;
    next.versionNonce = randomSeed();
    return next;
  }

  Draw.element = {
    create: create,
    withPatch: withPatch,
    randomId: randomId
  };
})();
