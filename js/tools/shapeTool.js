/* Shape tool: drag to create a rectangle, diamond or ellipse.
   Shift constrains to a square or circle. Tiny drags are treated as clicks and create nothing.
   Tool interface: down(pt, e), move(pt, e), up(pt, e), cancel(). pt is in world coords.
   Exposes window.Draw.shapeTool. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});
  var MIN_SCREEN_SIZE = 3; // css px

  // app: { getStyle(), setDraft(el), commit(el), viewport() }
  function create(app, type) {
    var start = null;
    var draft = null;

    function minWorldSize() {
      return MIN_SCREEN_SIZE / app.viewport().zoom;
    }

    return {
      type: type,

      down: function (pt) {
        start = { x: pt.x, y: pt.y };
        draft = null;
      },

      move: function (pt, e) {
        if (!start) return;
        var r = Draw.geometry.rectFromDrag(start, pt, e.shiftKey);
        if (!draft) draft = Draw.element.create(type, r.x, r.y, app.getStyle());
        draft.x = r.x;
        draft.y = r.y;
        draft.width = r.w;
        draft.height = r.h;
        app.setDraft(draft);
      },

      up: function () {
        if (draft && Math.max(draft.width, draft.height) >= minWorldSize()) {
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

  Draw.shapeTool = { create: create };
})();
