/* Freedraw tool: records the pointer path while dragging.
   Points closer than ~1.5 screen px to the last one are skipped to keep paths light.
   Exposes window.Draw.freedrawTool. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});
  var MIN_STEP_SCREEN = 1.5; // css px between recorded points

  // app is as in shapeTool.js.
  function create(app) {
    var draft = null;
    var last = null;

    return {
      type: Draw.Types.TOOL.FREEDRAW,

      down: function (pt) {
        draft = Draw.element.create(Draw.Types.ELEMENT.FREEDRAW, pt.x, pt.y, app.getStyle());
        draft.points = [[0, 0]];
        last = { x: pt.x, y: pt.y };
        app.setDraft(draft);
      },

      move: function (pt) {
        if (!draft) return;
        var minStep = MIN_STEP_SCREEN / app.viewport().zoom;
        if (Math.hypot(pt.x - last.x, pt.y - last.y) < minStep) return;
        draft.points.push([pt.x - draft.x, pt.y - draft.y]);
        var b = Draw.geometry.boundsOf(draft);
        draft.width = b.w;
        draft.height = b.h;
        last = { x: pt.x, y: pt.y };
        app.setDraft(draft);
      },

      up: function () {
        if (draft && draft.points.length > 1) {
          app.commit(draft);
        } else {
          app.setDraft(null);
        }
        draft = null;
        last = null;
      },

      cancel: function () {
        draft = null;
        last = null;
        app.setDraft(null);
      }
    };
  }

  Draw.freedrawTool = { create: create };
})();
