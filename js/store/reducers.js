/* State shape and pure reducers. Exposes window.Draw.reducers.
   State:
     elements    : committed elements, in z-order (last = top)
     draft       : element being drawn (not yet committed), or null
     tool        : active tool id
     style       : style applied to newly created elements
     selectedIds : ids of selected elements
     marquee     : rubber-band rect {x, y, w, h} while dragging, or null */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});

  function initialState() {
    return {
      elements: [],
      draft: null,
      tool: Draw.Types.ELEMENT.RECTANGLE,
      style: Object.assign({}, Draw.Types.DEFAULT_STYLE),
      selectedIds: [],
      marquee: null,
      editingId: null
    };
  }

  function toSet(ids) {
    var s = {};
    ids.forEach(function (id) { s[id] = true; });
    return s;
  }

  // Keep only the ids that still exist.
  function existingIds(elements, ids) {
    var have = toSet(elements.map(function (el) { return el.id; }));
    return ids.filter(function (id) { return have[id]; });
  }

  // Z-order change for the selected elements.
  function reorder(elements, selectedIds, mode) {
    var sel = toSet(selectedIds);
    var arr = elements.slice();
    var i;
    if (mode === "front") {
      return arr.filter(function (el) { return !sel[el.id]; })
        .concat(arr.filter(function (el) { return sel[el.id]; }));
    }
    if (mode === "back") {
      return arr.filter(function (el) { return sel[el.id]; })
        .concat(arr.filter(function (el) { return !sel[el.id]; }));
    }
    if (mode === "forward") {
      // Walk from the top so each selected element moves up past one unselected neighbour.
      for (i = arr.length - 2; i >= 0; i--) {
        if (sel[arr[i].id] && !sel[arr[i + 1].id]) {
          var t = arr[i]; arr[i] = arr[i + 1]; arr[i + 1] = t;
        }
      }
    } else if (mode === "backward") {
      for (i = 1; i < arr.length; i++) {
        if (sel[arr[i].id] && !sel[arr[i - 1].id]) {
          var u = arr[i]; arr[i] = arr[i - 1]; arr[i - 1] = u;
        }
      }
    }
    return arr;
  }

  function reduce(state, action) {
    switch (action.type) {
      case "ADD_ELEMENT":
        return Object.assign({}, state, {
          elements: state.elements.concat([action.element]),
          draft: null
        });

      case "ADD_ELEMENTS":
        return Object.assign({}, state, {
          elements: state.elements.concat(action.elements),
          draft: null,
          selectedIds: action.select
            ? action.elements.map(function (el) { return el.id; })
            : state.selectedIds
        });

      case "SET_ELEMENTS":
        // Used for live edits and for undo/redo. Drops selected ids that no longer exist.
        return Object.assign({}, state, {
          elements: action.elements,
          selectedIds: existingIds(action.elements, state.selectedIds)
        });

      case "SET_DRAFT":
        return Object.assign({}, state, { draft: action.element || null });

      case "SET_TOOL":
        // Switching tools ends any selection or marquee.
        return Object.assign({}, state, {
          tool: action.tool,
          draft: null,
          selectedIds: [],
          marquee: null
        });

      case "SET_EDITING":
        // id of the existing text element open in the text editor (hidden from the canvas), or null
        return Object.assign({}, state, { editingId: action.id });

      case "SET_STYLE":
        return Object.assign({}, state, { style: Object.assign({}, state.style, action.patch) });

      case "SET_SELECTION":
        return Object.assign({}, state, { selectedIds: action.ids });

      case "SET_MARQUEE":
        return Object.assign({}, state, { marquee: action.rect || null });

      case "DELETE_SELECTED": {
        var gone = toSet(state.selectedIds);
        return Object.assign({}, state, {
          elements: state.elements.filter(function (el) { return !gone[el.id]; }),
          selectedIds: []
        });
      }

      case "MOVE_SELECTED": {
        var moving = toSet(state.selectedIds);
        return Object.assign({}, state, {
          elements: state.elements.map(function (el) {
            return moving[el.id] ? Draw.element.withPatch(el, { x: el.x + action.dx, y: el.y + action.dy }) : el;
          })
        });
      }

      case "ZORDER":
        return Object.assign({}, state, {
          elements: reorder(state.elements, state.selectedIds, action.mode)
        });

      default:
        return state;
    }
  }

  Draw.reducers = {
    initialState: initialState,
    reduce: reduce
  };
})();
