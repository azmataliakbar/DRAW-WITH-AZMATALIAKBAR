/* JPG export. JPG has no transparency, so the drawing is rendered onto a white background.
   Exposes window.Draw.exportJpg. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});

  // Resolves to a JPEG Blob, or null if there is nothing to draw.
  function jpg(elements) {
    var canvas = Draw.exportPng.render(elements, "#ffffff");
    return canvas ? Draw.exportPng.toBlob(canvas, "image/jpeg", 0.92) : Promise.resolve(null);
  }

  Draw.exportJpg = { jpg: jpg };
})();
