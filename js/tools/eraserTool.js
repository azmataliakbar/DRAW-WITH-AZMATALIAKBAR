/* Eraser: click or drag over elements to delete them. One undo step per stroke.
   Exposes window.Draw.eraserTool. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});

  // app: commands object (getState, dispatch, viewport, recordHistory)
  function create(app) {
    var before = null;

    function eraseAt(pt) {
      var st = app.getState();
      var ids = Draw.hitTest.findAllAt(st.elements, pt, app.viewport().zoom);
      if (!ids.length) return;
      var gone = {};
      ids.forEach(function (id) { gone[id] = true; });
      app.dispatch({
        type: "SET_ELEMENTS",
        elements: st.elements.filter(function (el) { return !gone[el.id]; })
      });
    }

    return {
      type: Draw.Types.TOOL.ERASER,

      down: function (pt) {
        before = app.getState().elements;
        eraseAt(pt);
      },

      move: function (pt) {
        if (before) eraseAt(pt);
      },

      up: function () {
        if (before) app.recordHistory(before);
        before = null;
      },

      cancel: function () {
        if (before) app.dispatch({ type: "SET_ELEMENTS", elements: before });
        before = null;
      }
    };
  }

  Draw.eraserTool = { create: create };
})();
