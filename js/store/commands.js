/* Commands: the one entry point for edits. Used by tools, the keyboard and (later)
   the toolbar, properties panel and clipboard. Each command that changes elements
   is recorded as one undo step. Exposes window.Draw.commands. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});
  var DUPLICATE_OFFSET = 10; // world units

  // opts: { store, history, viewport(), viewChanged() }
  function create(opts) {
    var store = opts.store;
    var history = opts.history;

    function state() {
      return store.getState();
    }

    function selectedElements() {
      var ids = {};
      state().selectedIds.forEach(function (id) { ids[id] = true; });
      return state().elements.filter(function (el) { return ids[el.id]; });
    }

    // Runs a change and records it as one undo step.
    function run(change) {
      var before = state().elements;
      change();
      history.record(before);
    }

    var commands = {
      // Store access for tools
      getState: state,
      dispatch: function (action) { store.dispatch(action); },
      getStyle: function () { return state().style; },
      setDraft: function (el) { store.dispatch({ type: "SET_DRAFT", element: el }); },
      viewport: opts.viewport,
      viewChanged: opts.viewChanged,

      // Gesture-level history: tools call this on pointer-up
      recordHistory: function (before) { history.record(before); },

      commit: function (el) {
        run(function () { store.dispatch({ type: "ADD_ELEMENT", element: el }); });
      },

      setTool: function (tool) {
        store.dispatch({ type: "SET_TOOL", tool: tool });
      },

      selectAll: function () {
        store.dispatch({
          type: "SET_SELECTION",
          ids: state().elements.filter(function (el) { return !el.isDeleted; }).map(function (el) { return el.id; })
        });
      },

      clearSelection: function () {
        store.dispatch({ type: "SET_SELECTION", ids: [] });
      },

      deleteSelected: function () {
        if (!state().selectedIds.length) return;
        run(function () { store.dispatch({ type: "DELETE_SELECTED" }); });
      },

      duplicateSelected: function () {
        var sel = selectedElements();
        if (!sel.length) return;
        var copies = sel.map(function (el) {
          return Object.assign({}, el, {
            id: Draw.element.randomId(),
            x: el.x + DUPLICATE_OFFSET,
            y: el.y + DUPLICATE_OFFSET,
            version: 1
          });
        });
        run(function () {
          store.dispatch({ type: "ADD_ELEMENTS", elements: copies, select: true });
        });
      },

      // Arrow-key nudge. Pass startOfEdit=true on the first press of a hold, so
      // holding an arrow key is one undo step.
      nudgeSelected: function (dx, dy, startOfEdit) {
        if (!state().selectedIds.length) return;
        var before = state().elements;
        store.dispatch({ type: "MOVE_SELECTED", dx: dx, dy: dy });
        if (startOfEdit) history.record(before);
      },

      // mode: "forward" | "backward" | "front" | "back"
      zOrder: function (mode) {
        if (!state().selectedIds.length) return;
        run(function () { store.dispatch({ type: "ZORDER", mode: mode }); });
      },

      // Style change. Applies to the selection (if any) and to the defaults for new elements.
      // Pass {record: false} for live updates (slider, colour picker), then call
      // recordSnapshot(before) once the control is released.
      applyStyle: function (patch, opts) {
        var record = !(opts && opts.record === false);
        var before = state().elements;
        var ids = state().selectedIds;
        if (ids.length) {
          var sel = {};
          ids.forEach(function (id) { sel[id] = true; });
          var next = state().elements.map(function (el) {
            if (!sel[el.id]) return el;
            var updated = Draw.element.withPatch(el, patch);
            return el.type === Draw.Types.ELEMENT.TEXT
              ? Object.assign(updated, Draw.text.measurePatch(updated, updated.text))
              : updated;
          });
          store.dispatch({ type: "SET_ELEMENTS", elements: next });
        }
        store.dispatch({ type: "SET_STYLE", patch: patch });
        if (record) history.record(before);
      },

      snapshot: function () { return state().elements; },
      recordSnapshot: function (before) { history.record(before); },

      // Single-element changes (used by the text editor)
      updateElement: function (id, patch) {
        run(function () {
          store.dispatch({
            type: "SET_ELEMENTS",
            elements: state().elements.map(function (el) {
              return el.id === id ? Draw.element.withPatch(el, patch) : el;
            })
          });
        });
      },

      removeElement: function (id) {
        run(function () {
          store.dispatch({
            type: "SET_ELEMENTS",
            elements: state().elements.filter(function (el) { return el.id !== id; })
          });
        });
      },

      undo: function () { return history.undo(); },
      redo: function () { return history.redo(); }
    };

    return commands;
  }

  Draw.commands = { create: create };
})();
