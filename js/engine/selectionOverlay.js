/* Selection overlay: bounding box, resize handles and the marquee rectangle.
   Drawn in world coordinates, with handle and line sizes kept constant on screen.
   Exposes window.Draw.selectionOverlay. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});
  var FALLBACK_ACCENT = "#6965db";
  var MARQUEE_FILL = "rgba(105, 101, 219, 0.08)";

  // state: { elements, selectedIds, marquee }
  function draw(ctx, vp, state) {
    var zoom = vp.zoom;
    var colors = Draw.theme ? Draw.theme.colors() : { accent: FALLBACK_ACCENT, handleFill: "#ffffff" };
    var ACCENT = colors.accent;
    var selected = {};
    state.selectedIds.forEach(function (id) { selected[id] = true; });
    var sel = state.elements.filter(function (el) { return !el.isDeleted && selected[el.id]; });

    if (!sel.length && !state.marquee) return;

    ctx.save();
    ctx.transform(zoom, 0, 0, zoom, vp.panX, vp.panY);
    ctx.lineJoin = "miter";

    if (sel.length) {
      var box = Draw.hitTest.selectionBounds(sel);
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([4 / zoom, 3 / zoom]);
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.setLineDash([]);

      var size = Draw.hitTest.HANDLE_SCREEN / zoom;
      var pts = Draw.hitTest.handlePoints(box);
      ctx.fillStyle = colors.handleFill;
      Draw.hitTest.HANDLE_NAMES.forEach(function (name) {
        var p = pts[name];
        ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
        ctx.strokeRect(p.x - size / 2, p.y - size / 2, size, size);
      });
    }

    if (state.marquee) {
      var m = state.marquee;
      ctx.fillStyle = MARQUEE_FILL;
      ctx.fillRect(m.x, m.y, m.w, m.h);
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([4 / zoom, 3 / zoom]);
      ctx.strokeRect(m.x, m.y, m.w, m.h);
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  Draw.selectionOverlay = { draw: draw };
})();
