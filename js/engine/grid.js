/* Dot grid: draws dots in world space, with spacing adapted to zoom so the
   on-screen density stays readable. Exposes window.Draw.grid. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});

  var BASE_SPACING = 20;        // world units between dots at 100%
  var MIN_SCREEN_SPACING = 16;  // px: below this, double the spacing
  var MAX_SCREEN_SPACING = 64;  // px: above this, halve the spacing
  var MAX_DOTS = 12000;         // safety cap on draw calls per frame
  var DOT_RADIUS = 1;           // css px

  function pickSpacing(zoom) {
    var s = BASE_SPACING;
    while (s * zoom < MIN_SCREEN_SPACING) s *= 2;
    while (s * zoom > MAX_SCREEN_SPACING) s /= 2;
    return s;
  }

  // Only dots inside the visible world rect are drawn.
  function drawDotGrid(ctx, vp, size, color) {
    var spacing = pickSpacing(vp.zoom);

    var left = -vp.panX / vp.zoom;
    var top = -vp.panY / vp.zoom;
    var right = (size.width - vp.panX) / vp.zoom;
    var bottom = (size.height - vp.panY) / vp.zoom;

    var i0 = Math.floor(left / spacing);
    var i1 = Math.ceil(right / spacing);
    var j0 = Math.floor(top / spacing);
    var j1 = Math.ceil(bottom / spacing);

    if ((i1 - i0 + 1) * (j1 - j0 + 1) > MAX_DOTS) return;

    var step = spacing * vp.zoom;
    var d = DOT_RADIUS * 2;
    ctx.fillStyle = color;

    for (var i = i0; i <= i1; i++) {
      var sx = i * step + vp.panX - DOT_RADIUS;
      for (var j = j0; j <= j1; j++) {
        ctx.fillRect(sx, j * step + vp.panY - DOT_RADIUS, d, d);
      }
    }
  }

  Draw.grid = {
    BASE_SPACING: BASE_SPACING,
    pickSpacing: pickSpacing,
    drawDotGrid: drawDotGrid
  };
})();
