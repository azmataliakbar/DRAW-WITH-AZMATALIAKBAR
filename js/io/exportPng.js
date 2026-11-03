/* PNG export. Renders only the drawing area (its content bounds plus padding) at 2x,
   with a transparent background. The watermark is a DOM element, so it is never included.
   Also provides the raster helper used by JPG. Exposes window.Draw.exportPng. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});
  var SCALE = 2;
  var PAD = 24;

  // Draws the elements onto a new canvas sized to their bounds. background: CSS colour or null.
  function render(elements, background) {
    var b = Draw.geometry.contentBounds(elements, PAD);
    if (!b) return null;
    var canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(b.w * SCALE));
    canvas.height = Math.max(1, Math.ceil(b.h * SCALE));
    var ctx = canvas.getContext("2d");
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // Map the content box to the canvas. Export always uses light ink for "auto" strokes.
    var vp = { zoom: SCALE, panX: -b.x * SCALE, panY: -b.y * SCALE };
    Draw.scene.drawElements(ctx, vp, elements, null, "light");
    return canvas;
  }

  function toBlob(canvas, type, quality) {
    return new Promise(function (resolve) { canvas.toBlob(resolve, type, quality); });
  }

  // elements: the committed elements. Resolves to a PNG Blob, or null if there is nothing to draw.
  function png(elements) {
    var canvas = render(elements, null);
    return canvas ? toBlob(canvas, "image/png") : Promise.resolve(null);
  }

  Draw.exportPng = { render: render, toBlob: toBlob, png: png };
})();
