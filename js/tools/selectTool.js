/* Select tool: click or shift-click to select, drag a selected element to move,
   drag a handle to resize, drag on empty canvas for a marquee.
   Shift on a drag constrains a move to one axis, keeps aspect ratio on a corner
   resize, and adds to the selection for a marquee.
   Live changes are transient; one undo step is recorded on pointer-up.
   Tool interface: down(pt, e), move(pt, e), up(pt, e), cancel(). pt is in world coords.
   Exposes window.Draw.selectTool. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});
  var H = Draw.hitTest;
  var G = Draw.geometry;
  var MIN_SIZE = 1;     // world units: resizing never collapses an element below this
  var EPS = 1e-9;

  function selectedOf(st) {
    var ids = {};
    st.selectedIds.forEach(function (id) { ids[id] = true; });
    return st.elements.filter(function (el) { return ids[el.id]; });
  }

  function originMap(list) {
    var m = {};
    list.forEach(function (el) { m[el.id] = el; });
    return m;
  }

  // New box for a resize drag. Edges cannot cross the opposite edge.
  function resizeBox(box, handle, pt, keepAspect) {
    var left = box.x, right = box.x + box.w;
    var top = box.y, bottom = box.y + box.h;
    var hasW = handle.indexOf("w") >= 0, hasE = handle.indexOf("e") >= 0;
    var hasN = handle.indexOf("n") >= 0, hasS = handle.indexOf("s") >= 0;

    if (hasW) left = Math.min(pt.x, right - MIN_SIZE);
    if (hasE) right = Math.max(pt.x, left + MIN_SIZE);
    if (hasN) top = Math.min(pt.y, bottom - MIN_SIZE);
    if (hasS) bottom = Math.max(pt.y, top + MIN_SIZE);

    var isCorner = (hasW || hasE) && (hasN || hasS);
    if (keepAspect && isCorner && box.w > EPS && box.h > EPS) {
      var w = right - left, h = bottom - top;
      var s = Math.max(w / box.w, h / box.h);
      w = box.w * s;
      h = box.h * s;
      if (hasW) left = right - w; else right = left + w;
      if (hasN) top = bottom - h; else bottom = top + h;
    }
    return { x: left, y: top, w: right - left, h: bottom - top };
  }

  // Element after mapping the group box `box` onto `nb`, with scale sx, sy.
  function scaledElement(o, box, nb, sx, sy) {
    var x = nb.x + (o.x - box.x) * sx;
    var y = nb.y + (o.y - box.y) * sy;
    if (o.type === Draw.Types.ELEMENT.TEXT) {
      // Text scales by changing its font size, then re-measures its box.
      var resized = Draw.element.withPatch(o, { x: x, y: y, fontSize: Math.max(4, o.fontSize * sy) });
      return Object.assign(resized, Draw.text.measurePatch(resized, resized.text));
    }
    if (o.points && o.points.length) {
      var next = Draw.element.withPatch(o, {
        x: x,
        y: y,
        points: o.points.map(function (p) { return [p[0] * sx, p[1] * sy]; })
      });
      var b = G.boundsOf(next);
      next.width = b.w;
      next.height = b.h;
      return next;
    }
    return Draw.element.withPatch(o, { x: x, y: y, width: o.width * sx, height: o.height * sy });
  }

  // app: commands object (getState, dispatch, viewport, recordHistory)
  function create(app) {
    var mode = null;    // { kind: "move" | "resize" | "marquee", ... }
    var before = null;  // elements at gesture start, for undo and cancel

    function mapElements(origin, fn) {
      return app.getState().elements.map(function (el) {
        return origin[el.id] ? fn(origin[el.id]) : el;
      });
    }

    return {
      type: Draw.Types.TOOL.SELECT,

      down: function (pt, e) {
        var st = app.getState();
        var zoom = app.viewport().zoom;
        before = st.elements;
        mode = null;

        var sel = selectedOf(st);
        var box = H.selectionBounds(sel);
        if (box) {
          var handle = H.handleAt(box, pt, zoom);
          if (handle) {
            mode = { kind: "resize", handle: handle, box: box, origin: originMap(sel) };
            return;
          }
        }

        var hit = H.findTopAt(st.elements, pt, zoom);
        if (hit) {
          var ids = st.selectedIds;
          if (e.shiftKey) {
            if (ids.indexOf(hit.id) >= 0) {
              // Shift-click on a selected element deselects it and starts no drag.
              app.dispatch({ type: "SET_SELECTION", ids: ids.filter(function (i) { return i !== hit.id; }) });
              return;
            }
            ids = ids.concat([hit.id]);
          } else if (ids.indexOf(hit.id) < 0) {
            ids = [hit.id];
          }
          app.dispatch({ type: "SET_SELECTION", ids: ids });
          var moving = selectedOf(app.getState());
          mode = { kind: "move", start: { x: pt.x, y: pt.y }, origin: originMap(moving) };
          return;
        }

        // Empty canvas: start a marquee. Shift keeps the current selection.
        var base = e.shiftKey ? st.selectedIds : [];
        if (!e.shiftKey && st.selectedIds.length) {
          app.dispatch({ type: "SET_SELECTION", ids: [] });
        }
        mode = { kind: "marquee", start: { x: pt.x, y: pt.y }, base: base };
        app.dispatch({ type: "SET_MARQUEE", rect: { x: pt.x, y: pt.y, w: 0, h: 0 } });
      },

      move: function (pt, e) {
        if (!mode) return;

        if (mode.kind === "marquee") {
          var r = G.normalizeRect(mode.start.x, mode.start.y, pt.x, pt.y);
          app.dispatch({ type: "SET_MARQUEE", rect: { x: r.x, y: r.y, w: r.w, h: r.h } });
          var inside = H.enclosedIds(app.getState().elements, r);
          var all = mode.base.concat(inside.filter(function (id) { return mode.base.indexOf(id) < 0; }));
          app.dispatch({ type: "SET_SELECTION", ids: all });
          return;
        }

        var next;
        if (mode.kind === "move") {
          var dx = pt.x - mode.start.x;
          var dy = pt.y - mode.start.y;
          if (e.shiftKey) {
            if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0;
          }
          next = mapElements(mode.origin, function (o) {
            return Draw.element.withPatch(o, { x: o.x + dx, y: o.y + dy });
          });
        } else {
          var nb = resizeBox(mode.box, mode.handle, pt, e.shiftKey);
          var sx = mode.box.w > EPS ? nb.w / mode.box.w : 1;
          var sy = mode.box.h > EPS ? nb.h / mode.box.h : 1;
          next = mapElements(mode.origin, function (o) {
            return scaledElement(o, mode.box, nb, sx, sy);
          });
        }
        app.dispatch({ type: "SET_ELEMENTS", elements: next });
      },

      up: function () {
        if (mode && (mode.kind === "move" || mode.kind === "resize")) {
          app.recordHistory(before);
        }
        if (mode && mode.kind === "marquee") {
          app.dispatch({ type: "SET_MARQUEE", rect: null });
        }
        mode = null;
        before = null;
      },

      cancel: function () {
        if (mode && (mode.kind === "move" || mode.kind === "resize") && before) {
          app.dispatch({ type: "SET_ELEMENTS", elements: before });
        }
        if (mode && mode.kind === "marquee") {
          app.dispatch({ type: "SET_MARQUEE", rect: null });
        }
        mode = null;
        before = null;
      }
    };
  }

  Draw.selectTool = { create: create };
})();
