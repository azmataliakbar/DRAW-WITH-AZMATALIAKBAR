/* Hit testing and selection geometry, all in world coordinates.
   Tolerances are in screen pixels, so they feel the same at every zoom.
   Exposes window.Draw.hitTest. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});
  var T = Draw.Types.ELEMENT;

  var HIT_SCREEN = 6;      // css px: how close the pointer must be to an outline
  var HANDLE_SCREEN = 8;   // css px: handle size, also the grab tolerance
  var HANDLE_NAMES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  function clamp01(t) {
    return t < 0 ? 0 : t > 1 ? 1 : t;
  }

  function segmentDistance(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var len2 = dx * dx + dy * dy;
    var t = len2 ? clamp01(((px - ax) * dx + (py - ay) * dy) / len2) : 0;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  function pointInPolygon(px, py, pts) {
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var a = pts[i], b = pts[j];
      if ((a.y > py) !== (b.y > py) &&
          px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) {
        inside = !inside;
      }
    }
    return inside;
  }

  // Closed outline for a rectangle, diamond or ellipse.
  function outlineOf(el) {
    var x = el.x, y = el.y, w = el.width, h = el.height;
    if (el.type === T.RECTANGLE) {
      return [{ x: x, y: y }, { x: x + w, y: y }, { x: x + w, y: y + h }, { x: x, y: y + h }];
    }
    if (el.type === T.DIAMOND) {
      return [{ x: x + w / 2, y: y }, { x: x + w, y: y + h / 2 }, { x: x + w / 2, y: y + h }, { x: x, y: y + h / 2 }];
    }
    var pts = [];
    var cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2;
    for (var i = 0; i < 48; i++) {
      var t = (i / 48) * Math.PI * 2;
      pts.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
    }
    return pts;
  }

  function absolutePoints(el) {
    return el.points.map(function (p) {
      return { x: el.x + p[0], y: el.y + p[1] };
    });
  }

  function hitsElement(el, pt, zoom) {
    var tol = HIT_SCREEN / zoom + el.strokeWidth / 2;
    var b = Draw.geometry.boundsOf(el);
    if (pt.x < b.x - tol || pt.x > b.x + b.w + tol ||
        pt.y < b.y - tol || pt.y > b.y + b.h + tol) {
      return false;
    }

    // Text is hit anywhere in its box (the bounds check above already applied the tolerance).
    if (el.type === T.TEXT) return true;

    if (el.type === T.RECTANGLE || el.type === T.DIAMOND || el.type === T.ELLIPSE) {
      var poly = outlineOf(el);
      for (var i = 0; i < poly.length; i++) {
        var a = poly[i], c = poly[(i + 1) % poly.length];
        if (segmentDistance(pt.x, pt.y, a.x, a.y, c.x, c.y) <= tol) return true;
      }
      // Filled shapes are also hit inside. Unfilled shapes are hit only on the outline.
      var filled = el.backgroundColor && el.backgroundColor !== "transparent";
      return !!filled && pointInPolygon(pt.x, pt.y, poly);
    }

    if (el.points && el.points.length) {
      var pts = absolutePoints(el);
      if (pts.length === 1) return Math.hypot(pt.x - pts[0].x, pt.y - pts[0].y) <= tol;
      for (var k = 0; k < pts.length - 1; k++) {
        if (segmentDistance(pt.x, pt.y, pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y) <= tol) return true;
      }
    }
    return false;
  }

  // Topmost (last in z-order) element under the point, or null.
  function findTopAt(elements, pt, zoom) {
    for (var i = elements.length - 1; i >= 0; i--) {
      var el = elements[i];
      if (!el.isDeleted && hitsElement(el, pt, zoom)) return el;
    }
    return null;
  }

  // Ids of every element under the point (used by the eraser).
  function findAllAt(elements, pt, zoom) {
    var ids = [];
    for (var i = 0; i < elements.length; i++) {
      if (!elements[i].isDeleted && hitsElement(elements[i], pt, zoom)) ids.push(elements[i].id);
    }
    return ids;
  }

  // Union of the bounds of the given elements, or null if there are none.
  function selectionBounds(elements) {
    if (!elements.length) return null;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(function (el) {
      var b = Draw.geometry.boundsOf(el);
      if (b.x < minX) minX = b.x;
      if (b.y < minY) minY = b.y;
      if (b.x + b.w > maxX) maxX = b.x + b.w;
      if (b.y + b.h > maxY) maxY = b.y + b.h;
    });
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  // Centre of each resize handle for a box.
  function handlePoints(b) {
    return {
      nw: { x: b.x, y: b.y },
      n: { x: b.x + b.w / 2, y: b.y },
      ne: { x: b.x + b.w, y: b.y },
      e: { x: b.x + b.w, y: b.y + b.h / 2 },
      se: { x: b.x + b.w, y: b.y + b.h },
      s: { x: b.x + b.w / 2, y: b.y + b.h },
      sw: { x: b.x, y: b.y + b.h },
      w: { x: b.x, y: b.y + b.h / 2 }
    };
  }

  // Name of the handle under the point, or null.
  function handleAt(b, pt, zoom) {
    var tol = (HANDLE_SCREEN / 2 + 3) / zoom;
    var pts = handlePoints(b);
    for (var i = 0; i < HANDLE_NAMES.length; i++) {
      var h = pts[HANDLE_NAMES[i]];
      if (Math.abs(pt.x - h.x) <= tol && Math.abs(pt.y - h.y) <= tol) return HANDLE_NAMES[i];
    }
    return null;
  }

  // Ids of non-deleted elements whose bounds lie entirely inside rect {x, y, w, h}.
  function enclosedIds(elements, rect) {
    var ids = [];
    elements.forEach(function (el) {
      if (el.isDeleted) return;
      var b = Draw.geometry.boundsOf(el);
      if (b.x >= rect.x && b.y >= rect.y &&
          b.x + b.w <= rect.x + rect.w && b.y + b.h <= rect.y + rect.h) {
        ids.push(el.id);
      }
    });
    return ids;
  }

  Draw.hitTest = {
    HANDLE_SCREEN: HANDLE_SCREEN,
    HANDLE_NAMES: HANDLE_NAMES,
    findTopAt: findTopAt,
    findAllAt: findAllAt,
    selectionBounds: selectionBounds,
    handlePoints: handlePoints,
    handleAt: handleAt,
    enclosedIds: enclosedIds
  };
})();
