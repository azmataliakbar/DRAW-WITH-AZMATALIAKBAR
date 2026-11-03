/* Shared constants: element types, tool ids, style options and defaults.
   Exposes window.Draw.Types. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});

  var ELEMENT = {
    RECTANGLE: "rectangle",
    DIAMOND: "diamond",
    ELLIPSE: "ellipse",
    LINE: "line",
    ARROW: "arrow",
    FREEDRAW: "freedraw",
    TEXT: "text"
  };

  // Tool ids. Drawing tools share their element type's name.
  var TOOL = {
    SELECT: "select",
    RECTANGLE: "rectangle",
    DIAMOND: "diamond",
    ELLIPSE: "ellipse",
    ARROW: "arrow",
    LINE: "line",
    FREEDRAW: "freedraw",
    TEXT: "text",
    ERASER: "eraser",
    HAND: "hand"
  };

  var FILL_STYLES = ["solid", "hachure", "cross-hatch"];
  var STROKE_STYLES = ["solid", "dashed", "dotted"];

  // Style properties every element carries. New elements copy these from state.style.
  var DEFAULT_STYLE = {
    strokeColor: "auto",   // "auto" follows the theme: dark ink in light mode, light ink in dark mode
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 3,
    strokeStyle: "solid",
    roughness: 1,      // 0 = clean geometry, 1 = slight wobble, 2 = strong
    opacity: 100,      // percent
    fontSize: 20,      // text elements only: world units
    textAlign: "left"  // text elements only: left | center | right
  };

  var FONT_SIZES = [16, 20, 28, 36];
  var TEXT_ALIGNS = ["left", "center", "right"];

  Draw.Types = {
    ELEMENT: ELEMENT,
    TOOL: TOOL,
    FILL_STYLES: FILL_STYLES,
    STROKE_STYLES: STROKE_STYLES,
    FONT_SIZES: FONT_SIZES,
    TEXT_ALIGNS: TEXT_ALIGNS,
    DEFAULT_STYLE: DEFAULT_STYLE
  };
})();
