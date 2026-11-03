/* Hand tool: drag to pan. Uses screen-space deltas, so panning feels exact at any zoom.
   Exposes window.Draw.handTool. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});

  // app: commands object (viewport, viewChanged)
  function create(app) {
    var last = null; // last pointer position in css px

    return {
      type: Draw.Types.TOOL.HAND,

      down: function (pt) {
        last = pt.screen;
      },

      move: function (pt) {
        if (!last) return;
        var s = pt.screen;
        Draw.Viewport.panBy(app.viewport(), s.x - last.x, s.y - last.y);
        last = s;
        app.viewChanged();
      },

      up: function () {
        last = null;
      },

      cancel: function () {
        last = null;
      }
    };
  }

  Draw.handTool = { create: create };
})();
