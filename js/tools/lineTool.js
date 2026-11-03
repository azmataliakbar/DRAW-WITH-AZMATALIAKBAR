/* Line and arrow tool: drag from start to end. Shift snaps the angle to 45 degrees.
   Exposes window.Draw.lineTool. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});
  var MIN_SCREEN_SIZE = 3; // css px

  // type: "line" or "arrow". app is as in shapeTool.js.
  function create(app, type) {
    var start = null;
    var draft = null;

    return {
      type: type,

      down: function (pt) {
        start = { x: pt.x, y: pt.y };
        draft = null;
      },

      move: function (pt, e) {
        if (!start) return;
        var end = Draw.geometry.snapLineEnd(start, pt, e.shiftKey);
        if (!draft) draft = Draw.element.create(type, start.x, start.y, app.getStyle());
        draft.points = [[0, 0], [end.x - start.x, end.y - start.y]];
        var b = Draw.geometry.boundsOf(draft);
        draft.width = b.w;
        draft.height = b.h;
        app.setDraft(draft);
      },

      up: function () {
        var minWorld = MIN_SCREEN_SIZE / app.viewport().zoom;
        if (draft && Math.max(draft.width, draft.height) >= minWorld) {
          app.commit(draft);
        } else {
          app.setDraft(null);
        }
        start = null;
        draft = null;
      },

      cancel: function () {
        start = null;
        draft = null;
        app.setDraft(null);
      }
    };
  }

  Draw.lineTool = { create: create };
})();
