/* JSON project export: the elements and the current style, in a versioned format.
   Exposes window.Draw.exportJson. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});

  // elements: committed elements. style: the current style defaults.
  function json(elements, style) {
    var doc = {
      format: "draw-project",
      version: 1,
      savedAt: new Date().toISOString(),
      style: style,
      elements: elements.filter(function (el) { return !el.isDeleted; })
    };
    return new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
  }

  Draw.exportJson = { json: json };
})();
