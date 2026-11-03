/* SVG export. Vector output built from the same drawing code as the canvas: each element
   is recorded by Draw.scene.recordElement and written as SVG. The viewBox is the drawing
   area (content bounds plus padding). Exposes window.Draw.exportSvg. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});
  var PAD = 24;

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // elements: committed elements. Returns the SVG document as a string, or null if empty.
  // Matches the screen: the current theme's background and "auto" ink.
  function svg(elements) {
    var b = Draw.geometry.contentBounds(elements, PAD);
    if (!b) return null;
    var mode = Draw.theme.resolved();
    var background = Draw.theme.colors().canvasBg;

    var defs = [];
    var clipIds = {};
    var body = [];
    var clipCount = 0;

    function clipFor(d) {
      if (!d) return null;
      if (!clipIds[d]) {
        clipCount += 1;
        clipIds[d] = "clip" + clipCount;
        defs.push('<clipPath id="' + clipIds[d] + '"><path d="' + d + '"/></clipPath>');
      }
      return clipIds[d];
    }

    elements.forEach(function (el) {
      if (el.isDeleted) return;
      Draw.scene.recordElement(el, mode).forEach(function (op) {
        var clipId = clipFor(op.clip);
        var open = clipId ? '<g clip-path="url(#' + clipId + ')">' : "<g>";
        var shape;
        if (op.kind === "stroke") {
          var dash = op.dash && op.dash.length ? ' stroke-dasharray="' + op.dash.join(" ") + '"' : "";
          shape = '<path d="' + op.d + '" fill="none" stroke="' + esc(op.strokeStyle) + '" stroke-width="' +
            op.lineWidth + '" stroke-linecap="' + op.lineCap + '" stroke-linejoin="round"' + dash +
            ' opacity="' + op.alpha + '"/>';
        } else if (op.kind === "fill") {
          shape = '<path d="' + op.d + '" fill="' + esc(op.fillStyle) + '" stroke="none" opacity="' + op.alpha + '"/>';
        } else if (op.kind === "text") {
          var size = parseFloat(op.font);
          var family = op.font.replace(/^[\d.]+px\s*/, "");
          shape = '<text x="' + op.x + '" y="' + op.y + '" font-size="' + size + '" font-family="' + esc(family) +
            '" fill="' + esc(op.fillStyle) + '" dominant-baseline="hanging" opacity="' + op.alpha + '">' +
            esc(op.text) + "</text>";
        } else {
          return;
        }
        body.push(open + shape + "</g>");
      });
    });

    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + round(b.w) + '" height="' + round(b.h) +
      '" viewBox="' + round(b.x) + " " + round(b.y) + " " + round(b.w) + " " + round(b.h) + '">\n' +
      (defs.length ? "<defs>" + defs.join("") + "</defs>\n" : "") +
      '<rect x="' + round(b.x) + '" y="' + round(b.y) + '" width="' + round(b.w) + '" height="' + round(b.h) +
      '" fill="' + esc(background) + '"/>\n' +
      body.join("\n") + "\n</svg>\n";
  }

  function round(n) {
    return Math.round(n * 100) / 100;
  }

  Draw.exportSvg = { svg: svg };
})();
