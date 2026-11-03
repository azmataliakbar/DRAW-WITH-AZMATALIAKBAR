/* Geometry helpers in world coordinates. Exposes window.Draw.geometry. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});

  // Rect from two corners, always with positive width and height.
  function normalizeRect(x1, y1, x2, y2) {
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      w: Math.abs(x2 - x1),
      h: Math.abs(y2 - y1)
    };
  }

  // Rect for a drag from a to b. With `square`, the sides are equal (shift).
  function rectFromDrag(a, b, square) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    if (square) {
      var side = Math.max(Math.abs(dx), Math.abs(dy));
      dx = (dx < 0 ? -1 : 1) * side;
      dy = (dy < 0 ? -1 : 1) * side;
    }
    return normalizeRect(a.x, a.y, a.x + dx, a.y + dy);
  }

  // End point for a line from a towards b. With `constrain`, the angle snaps to 45 degrees.
  function snapLineEnd(a, b, constrain) {
    if (!constrain) return { x: b.x, y: b.y };
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var len = Math.hypot(dx, dy);
    var step = Math.PI / 4;
    var angle = Math.round(Math.atan2(dy, dx) / step) * step;
    return { x: a.x + len * Math.cos(angle), y: a.y + len * Math.sin(angle) };
  }

  // World-space bounding box {x, y, w, h} of an element.
  function boundsOf(el) {
    if (el.points && el.points.length) {
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (var i = 0; i < el.points.length; i++) {
        var px = el.x + el.points[i][0];
        var py = el.y + el.points[i][1];
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    return { x: el.x, y: el.y, w: el.width, h: el.height };
  }

  // Bounds of all non-deleted elements, grown by `padding` plus half the largest stroke.
  // Returns null when there is nothing to measure.
  function contentBounds(elements, padding) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    var any = false, maxStroke = 0;
    elements.forEach(function (el) {
      if (el.isDeleted) return;
      any = true;
      var b = boundsOf(el);
      if (b.x < minX) minX = b.x;
      if (b.y < minY) minY = b.y;
      if (b.x + b.w > maxX) maxX = b.x + b.w;
      if (b.y + b.h > maxY) maxY = b.y + b.h;
      if ((el.strokeWidth || 0) > maxStroke) maxStroke = el.strokeWidth;
    });
    if (!any) return null;
    var pad = (padding || 0) + maxStroke / 2;
    return { x: minX - pad, y: minY - pad, w: maxX - minX + 2 * pad, h: maxY - minY + 2 * pad };
  }

  Draw.geometry = {
    normalizeRect: normalizeRect,
    rectFromDrag: rectFromDrag,
    snapLineEnd: snapLineEnd,
    boundsOf: boundsOf,
    contentBounds: contentBounds
  };
})();
