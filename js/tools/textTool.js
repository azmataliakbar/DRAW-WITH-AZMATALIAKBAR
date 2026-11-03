/* Text tool: click on the canvas to place a text box and type. Double-click an
   existing text element (with the Select or Text tool) to edit it.
   Exposes window.Draw.textTool. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});
  var TOOL = Draw.Types.TOOL;
  var CLICK_SCREEN = 4; // css px: more movement than this is not a click

  // app: commands object. editor: from Draw.textEditor.create.
  function create(app, editor) {
    var start = null;

    return {
      type: TOOL.TEXT,

      down: function (pt) {
        start = { x: pt.x, y: pt.y };
      },

      move: function () {},

      up: function (pt) {
        if (!start) return;
        var s = start;
        start = null;
        var moved = Math.hypot(pt.x - s.x, pt.y - s.y) * app.viewport().zoom;
        if (moved > CLICK_SCREEN) return;
        editor.open(Draw.text.newTextElement(s.x, s.y, app.getStyle()), true);
      },

      cancel: function () {
        start = null;
      }
    };
  }

  // Double-click on a text element opens it for editing.
  function bindDoubleClick(canvas, app, editor) {
    canvas.addEventListener("dblclick", function (e) {
      var tool = app.getState().tool;
      if (tool !== TOOL.SELECT && tool !== TOOL.TEXT) return;

      var r = canvas.getBoundingClientRect();
      var vp = app.viewport();
      var pt = Draw.Viewport.screenToWorld(vp, e.clientX - r.left, e.clientY - r.top);
      var hit = Draw.hitTest.findTopAt(app.getState().elements, pt, vp.zoom);
      if (hit && hit.type === Draw.Types.ELEMENT.TEXT) editor.open(hit, false);
    });
  }

  Draw.textTool = {
    create: create,
    bindDoubleClick: bindDoubleClick
  };
})();
