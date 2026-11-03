/* Pointer input: routes pointer events to navigation (pan, pinch zoom) or to the
   active tool. Also wheel zoom and space-to-pan. Exposes window.Draw.pointer.

   Routing:
   - two pointers down          -> pinch zoom/pan; any drawing in progress is cancelled
   - middle button or space held -> pan
   - otherwise                  -> active tool (mouse, pen or touch); the Hand tool pans
   - wheel / trackpad           -> pan; ctrl+wheel (or trackpad pinch) -> zoom */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});

  // opts: { canvas, store, tools (toolId -> tool), getViewport(), onViewChange() }
  function create(opts) {
    var canvas = opts.canvas;
    var store = opts.store;
    var tools = opts.tools;
    var getViewport = opts.getViewport;
    var onViewChange = opts.onViewChange;

    var pointers = new Map(); // pointerId -> { x, y, type } in canvas css px
    var nav = null;           // { id } while a pointer pans
    var pinch = null;         // { dist, mid } while two pointers are down
    var drawing = null;       // { id, tool } while a tool gesture is in progress
    var spaceDown = false;

    function localPoint(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    // World point for tools. `screen` carries the css-px point too (the Hand tool needs it).
    function toWorld(p) {
      var w = Draw.Viewport.screenToWorld(getViewport(), p.x, p.y);
      w.screen = { x: p.x, y: p.y };
      return w;
    }

    function activeToolId() {
      return store.getState().tool;
    }

    function pinchMetrics() {
      var it = pointers.values();
      var a = it.next().value;
      var b = it.next().value;
      return {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      };
    }

    function cancelDrawing() {
      if (drawing) {
        drawing.tool.cancel();
        drawing = null;
      }
    }

    var DRAW_TOOLS = ["rectangle", "diamond", "ellipse", "arrow", "line", "freedraw", "text"];

    function updateCursor() {
      var id = activeToolId();
      var cursor = "default";
      if (nav) cursor = "grabbing";
      else if (spaceDown || id === Draw.Types.TOOL.HAND) cursor = "grab";
      else if (DRAW_TOOLS.indexOf(id) >= 0 || id === Draw.Types.TOOL.ERASER) cursor = "crosshair";
      canvas.style.cursor = cursor;
    }

    canvas.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 1) return;
      if (e.button === 1) e.preventDefault(); // stop middle-click autoscroll

      var p = localPoint(e);
      pointers.set(e.pointerId, { x: p.x, y: p.y, type: e.pointerType });
      canvas.setPointerCapture(e.pointerId);

      if (pointers.size === 2) {
        cancelDrawing();
        nav = null;
        pinch = pinchMetrics();
      } else if (pointers.size === 1) {
        var id = activeToolId();
        var wantsPan = e.button === 1 || spaceDown;
        if (wantsPan) {
          nav = { id: e.pointerId };
        } else if (tools[id]) {
          drawing = { id: e.pointerId, tool: tools[id] };
          drawing.tool.down(toWorld(p), e);
        }
      }
      updateCursor();
    });

    canvas.addEventListener("pointermove", function (e) {
      var prev = pointers.get(e.pointerId);
      if (!prev) return;
      var p = localPoint(e);
      var dx = p.x - prev.x;
      var dy = p.y - prev.y;
      pointers.set(e.pointerId, { x: p.x, y: p.y, type: prev.type });

      if (pinch && pointers.size >= 2) {
        var m = pinchMetrics();
        var vp = getViewport();
        Draw.Viewport.panBy(vp, m.mid.x - pinch.mid.x, m.mid.y - pinch.mid.y);
        Draw.Viewport.zoomAt(vp, m.mid.x, m.mid.y, vp.zoom * (m.dist / pinch.dist));
        pinch = m;
        onViewChange();
      } else if (nav && nav.id === e.pointerId) {
        Draw.Viewport.panBy(getViewport(), dx, dy);
        onViewChange();
      } else if (drawing && drawing.id === e.pointerId) {
        drawing.tool.move(toWorld(p), e);
      }
    });

    function endPointer(e, cancelled) {
      if (!pointers.has(e.pointerId)) return;
      var p = localPoint(e);
      pointers.delete(e.pointerId);
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);

      if (drawing && drawing.id === e.pointerId) {
        if (cancelled) drawing.tool.cancel();
        else drawing.tool.up(toWorld(p), e);
        drawing = null;
      }
      if (pointers.size < 2) pinch = null;
      if (nav && nav.id === e.pointerId) nav = null;
      updateCursor();
    }

    canvas.addEventListener("pointerup", function (e) { endPointer(e, false); });
    canvas.addEventListener("pointercancel", function (e) { endPointer(e, true); });

    // iOS Safari fires its own pinch gesture events; suppress them on the canvas.
    canvas.addEventListener("gesturestart", function (e) { e.preventDefault(); });

    // Wheel: pan. Ctrl+wheel (or trackpad pinch, which arrives as ctrl+wheel): zoom at cursor.
    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      var scale = e.deltaMode === 1 ? 16 : 1; // lines to px
      var dx = e.deltaX * scale;
      var dy = e.deltaY * scale;
      if (e.ctrlKey || e.metaKey) {
        var p = localPoint(e);
        Draw.Viewport.zoomBy(getViewport(), p.x, p.y, Math.exp(-dy * 0.0015));
      } else {
        Draw.Viewport.panBy(getViewport(), -dx, -dy);
      }
      onViewChange();
    }, { passive: false });

    // Space held = temporary pan. Ignored while typing in a field.
    function isTypingTarget(el) {
      return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    }

    window.addEventListener("keydown", function (e) {
      if (e.code === "Space" && !isTypingTarget(e.target)) {
        e.preventDefault(); // no page scroll, no button activation
        if (!e.repeat) {
          spaceDown = true;
          updateCursor();
        }
      }
    });

    window.addEventListener("keyup", function (e) {
      if (e.code === "Space") {
        spaceDown = false;
        updateCursor();
      }
    });

    window.addEventListener("blur", function () {
      spaceDown = false;
      updateCursor();
    });

    return { updateCursor: updateCursor };
  }

  Draw.pointer = { create: create };
})();
