/* Undo/redo as snapshots of the elements array.
   Elements are never mutated in place (edits create new objects), so keeping a
   reference to the old array is a complete, cheap snapshot.
   A snapshot is recorded once per gesture (on pointer-up), not per pointermove.
   Exposes window.Draw.history. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});
  var LIMIT = 200;

  function create(store) {
    var past = [];
    var future = [];

    // Call after a change. `before` is the elements array from before the change.
    // Nothing is recorded if the elements did not change.
    function record(before) {
      if (!before || before === store.getState().elements) return;
      past.push(before);
      if (past.length > LIMIT) past.shift();
      future.length = 0;
    }

    function undo() {
      if (!past.length) return false;
      future.push(store.getState().elements);
      store.dispatch({ type: "SET_ELEMENTS", elements: past.pop() });
      return true;
    }

    function redo() {
      if (!future.length) return false;
      past.push(store.getState().elements);
      store.dispatch({ type: "SET_ELEMENTS", elements: future.pop() });
      return true;
    }

    return {
      record: record,
      undo: undo,
      redo: redo,
      canUndo: function () { return past.length > 0; },
      canRedo: function () { return future.length > 0; }
    };
  }

  Draw.history = { create: create };
})();
