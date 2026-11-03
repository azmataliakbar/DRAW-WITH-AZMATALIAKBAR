/* Draws elements in world coordinates.
   Every outline is stroked ONCE with a single path, so its width is uniform everywhere.
   The hand-drawn look is a gentle, deterministic bow of each edge (seeded per element),
   not a second offset copy of the outline. Exposes window.Draw.scene and window.Draw.text. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});
  var T = Draw.Types.ELEMENT;

  var BOW = 0.012;          // edge bow as a fraction of edge length, per unit of roughness
  var ELLIPSE_BOW = 0.006;  // ellipse radial wobble, per unit of roughness

  // Ink for stroke "auto" follows the theme. Values must match --ink in css/app.css.
  var INK = { light: "#1e1e1e", dark: "#ececf1" };
  var inkMode = "light";

  function inkOf(color) {
    return color === "auto" ? INK[inkMode] : color;
  }

  // Deterministic PRNG (mulberry32): same seed, same sequence.
  function makeRandom(seed) {
    var a = seed | 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function mid(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function applyStrokeStyle(ctx, el) {
    var w = el.strokeWidth;
    if (el.strokeStyle === "dashed") {
      ctx.lineCap = "butt";
      ctx.setLineDash([w * 4, w * 3]);
    } else if (el.strokeStyle === "dotted") {
      ctx.lineCap = "round";
      ctx.setLineDash([0.001, w * 3]);
    } else {
      ctx.lineCap = "round";
      ctx.setLineDash([]);
    }
  }

  // Corners of a rectangle or diamond, in world coordinates.
  function cornersOf(el) {
    var x = el.x, y = el.y, w = el.width, h = el.height;
    return el.type === T.RECTANGLE
      ? [{ x: x, y: y }, { x: x + w, y: y }, { x: x + w, y: y + h }, { x: x, y: y + h }]
      : [{ x: x + w / 2, y: y }, { x: x + w, y: y + h / 2 }, { x: x + w / 2, y: y + h }, { x: x, y: y + h / 2 }];
  }

  // Draws the edge from a to b, which must be the current point. Straight when roughness is 0.
  function edgeTo(ctx, a, b, roughness, seed) {
    var len = Math.hypot(b.x - a.x, b.y - a.y);
    if (roughness <= 0 || len === 0) {
      ctx.lineTo(b.x, b.y);
      return;
    }
    var off = (makeRandom(seed)() * 2 - 1) * roughness * BOW * len;
    var m = mid(a, b);
    var nx = -(b.y - a.y) / len;
    var ny = (b.x - a.x) / len;
    // A quadratic's control point is twice as far from the curve's midpoint.
    ctx.quadraticCurveTo(m.x + nx * off * 2, m.y + ny * off * 2, b.x, b.y);
  }

  function traceClosedPolygon(ctx, pts, roughness, seed) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 0; i < pts.length; i++) {
      edgeTo(ctx, pts[i], pts[(i + 1) % pts.length], roughness, seed + i * 131);
    }
    ctx.closePath();
  }

  // Smooth curve through points: quadratic segments between midpoints.
  function traceSmooth(ctx, pts, closed) {
    var n = pts.length;
    ctx.beginPath();
    if (n < 2) return;
    if (n === 2) {
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      return;
    }
    if (closed) {
      var start = mid(pts[n - 1], pts[0]);
      ctx.moveTo(start.x, start.y);
      for (var i = 0; i < n; i++) {
        var m = mid(pts[i], pts[(i + 1) % n]);
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y);
      }
      ctx.closePath();
    } else {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var j = 1; j < n - 1; j++) {
        var m2 = mid(pts[j], pts[j + 1]);
        ctx.quadraticCurveTo(pts[j].x, pts[j].y, m2.x, m2.y);
      }
      ctx.lineTo(pts[n - 1].x, pts[n - 1].y);
    }
  }

  // Exact ellipse when roughness is 0; otherwise a gently wobbled, smooth closed curve.
  function traceEllipse(ctx, el, roughness) {
    var cx = el.x + el.width / 2, cy = el.y + el.height / 2;
    var rx = el.width / 2, ry = el.height / 2;
    ctx.beginPath();
    if (roughness <= 0) {
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      return;
    }
    var phase = makeRandom(el.seed)() * Math.PI * 2;
    var amp = roughness * ELLIPSE_BOW;
    var n = 72;
    var pts = [];
    for (var i = 0; i < n; i++) {
      var t = (i / n) * Math.PI * 2;
      var k = 1 + amp * Math.sin(2 * t + phase);
      pts.push({ x: cx + rx * k * Math.cos(t), y: cy + ry * k * Math.sin(t) });
    }
    traceSmooth(ctx, pts, true);
  }

  // The outline of a rectangle, diamond or ellipse. Used for both fill and stroke,
  // so the fill always matches the outline.
  function tracePath(ctx, el) {
    if (el.type === T.ELLIPSE) {
      traceEllipse(ctx, el, el.roughness);
    } else {
      traceClosedPolygon(ctx, cornersOf(el), el.roughness, el.seed);
    }
  }

  // Hatch lines at 45 degrees, clipped to the shape by the caller.
  function drawHatch(ctx, el, cross) {
    var x = el.x, y = el.y, w = el.width, h = el.height;
    var gap = 6 + el.strokeWidth * 2;
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.lineCap = "butt";
    ctx.strokeStyle = el.backgroundColor;
    ctx.lineWidth = Math.max(0.5, el.strokeWidth * 0.6);
    for (var k = -h; k <= w; k += gap) {
      ctx.moveTo(x + k, y + h);
      ctx.lineTo(x + k + h, y);
    }
    if (cross) {
      for (var k2 = -h; k2 <= w; k2 += gap) {
        ctx.moveTo(x + k2, y);
        ctx.lineTo(x + k2 + h, y + h);
      }
    }
    ctx.stroke();
  }

  // Fill: solid colour, or hatching in the background colour.
  function fillShape(ctx, el) {
    if (!el.backgroundColor || el.backgroundColor === "transparent") return;
    ctx.save();
    tracePath(ctx, el);
    if (el.fillStyle === "solid") {
      ctx.fillStyle = el.backgroundColor;
      ctx.fill();
    } else {
      ctx.clip();
      drawHatch(ctx, el, el.fillStyle === "cross-hatch");
    }
    ctx.restore();
  }

  // Outline: one stroke.
  function strokeShape(ctx, el) {
    tracePath(ctx, el);
    ctx.stroke();
  }

  // Line and arrow: one stroke from points[0] to points[last]; arrowhead drawn separately.
  function drawLinear(ctx, el, arrow) {
    if (!el.points || el.points.length < 2) return;
    var a = { x: el.x + el.points[0][0], y: el.y + el.points[0][1] };
    var last = el.points[el.points.length - 1];
    var b = { x: el.x + last[0], y: el.y + last[1] };
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    edgeTo(ctx, a, b, el.roughness, el.seed);
    ctx.stroke();
    if (arrow) {
      var theta = Math.atan2(b.y - a.y, b.x - a.x);
      var head = 8 + el.strokeWidth * 3;
      ctx.beginPath();
      [-0.45, 0.45].forEach(function (s) {
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - head * Math.cos(theta + s), b.y - head * Math.sin(theta + s));
      });
      ctx.stroke();
    }
  }

  // Freedraw: smoothed polyline. No wobble, the stroke is already the hand's path.
  function drawFreedraw(ctx, el) {
    if (!el.points || el.points.length < 2) return;
    var pts = el.points.map(function (p) {
      return { x: el.x + p[0], y: el.y + p[1] };
    });
    traceSmooth(ctx, pts, false);
    ctx.stroke();
  }

  // ---- Text ----
  // Text helpers live here because this file owns how text is drawn. Measuring uses the
  // same font as drawing, so the stored box matches what is shown.
  var FONT = '"Segoe UI", system-ui, -apple-system, Roboto, sans-serif';
  var LINE_HEIGHT = 1.25;
  var measureCtx = document.createElement("canvas").getContext("2d");

  function fontFor(size) {
    return size + "px " + FONT;
  }

  // Size of `text` at `fontSize`, in the same units as fontSize.
  function measureText(text, fontSize) {
    measureCtx.font = fontFor(fontSize);
    var lines = String(text).split("\n");
    var width = 0;
    for (var i = 0; i < lines.length; i++) {
      width = Math.max(width, measureCtx.measureText(lines[i]).width);
    }
    return { width: width, height: lines.length * fontSize * LINE_HEIGHT };
  }

  // Patch that sets the text and its measured box. Used on commit and on font-size changes.
  function measurePatch(el, text) {
    var m = measureText(text, el.fontSize);
    return { text: text, width: m.width, height: m.height };
  }

  function newTextElement(x, y, style) {
    var el = Draw.element.create(T.TEXT, x, y, style);
    el.text = "";
    return el;
  }

  function drawText(ctx, el) {
    if (!el.text) return;
    ctx.font = fontFor(el.fontSize);
    ctx.fillStyle = inkOf(el.strokeColor);
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    var lines = el.text.split("\n");
    var lh = el.fontSize * LINE_HEIGHT;
    for (var i = 0; i < lines.length; i++) {
      var w = ctx.measureText(lines[i]).width;
      var x = el.textAlign === "center" ? el.x + (el.width - w) / 2
        : el.textAlign === "right" ? el.x + el.width - w
        : el.x;
      ctx.fillText(lines[i], x, el.y + i * lh);
    }
  }

  Draw.text = {
    FONT: FONT,
    LINE_HEIGHT: LINE_HEIGHT,
    measureText: measureText,
    measurePatch: measurePatch,
    newTextElement: newTextElement
  };

  function drawElement(ctx, el) {
    ctx.save();
    ctx.globalAlpha = el.opacity / 100;
    ctx.strokeStyle = inkOf(el.strokeColor);
    ctx.lineWidth = el.strokeWidth;
    ctx.lineJoin = "round";
    applyStrokeStyle(ctx, el);

    switch (el.type) {
      case T.RECTANGLE:
      case T.DIAMOND:
      case T.ELLIPSE:
        fillShape(ctx, el);          // saves and restores its own state
        strokeShape(ctx, el);
        break;
      case T.LINE:
        drawLinear(ctx, el, false);
        break;
      case T.ARROW:
        drawLinear(ctx, el, true);
        break;
      case T.FREEDRAW:
        drawFreedraw(ctx, el);
        break;
      case T.TEXT:
        drawText(ctx, el);
        break;
      default:
        break;
    }
    ctx.restore();
  }

  // Draws elements in z-order. ctx arrives in CSS pixels; we add the viewport transform.
  // skipId: the element being edited in the text editor (drawn there instead).
  // mode: "light" | "dark" for "auto" ink. Defaults to the current theme; export passes "light".
  function drawElements(ctx, vp, elements, skipId, mode) {
    inkMode = mode || (Draw.theme ? Draw.theme.resolved() : "light");
    ctx.save();
    ctx.transform(vp.zoom, 0, 0, vp.zoom, vp.panX, vp.panY);
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (!el.isDeleted && el.id !== skipId) drawElement(ctx, el);
    }
    ctx.restore();
  }

  // ---- Recording: runs the same drawing code against a recorder, for SVG export ----
  // The recorder implements the canvas methods used above and stores each stroke, fill and
  // text as data (path string, colours, dash, clip), so SVG matches the canvas exactly.
  var RECORDED_KEYS = ["globalAlpha", "strokeStyle", "fillStyle", "lineWidth", "lineCap",
    "lineJoin", "font", "textBaseline", "textAlign"];

  function recordElement(el, mode) {
    var ops = [];
    var rec = {
      globalAlpha: 1, strokeStyle: "#000000", fillStyle: "#000000", lineWidth: 1,
      lineCap: "butt", lineJoin: "miter", font: "10px sans-serif",
      textBaseline: "alphabetic", textAlign: "start"
    };
    var dash = [];
    var clip = null;
    var d = "";
    var stack = [];

    rec.save = function () {
      var snap = { dash: dash.slice(), clip: clip };
      RECORDED_KEYS.forEach(function (k) { snap[k] = rec[k]; });
      stack.push(snap);
    };
    rec.restore = function () {
      var snap = stack.pop();
      if (!snap) return;
      RECORDED_KEYS.forEach(function (k) { rec[k] = snap[k]; });
      dash = snap.dash;
      clip = snap.clip;
    };
    rec.setLineDash = function (a) { dash = a.slice(); };
    rec.beginPath = function () { d = ""; };
    rec.moveTo = function (x, y) { d += "M" + x + " " + y + " "; };
    rec.lineTo = function (x, y) { d += "L" + x + " " + y + " "; };
    rec.quadraticCurveTo = function (cx, cy, x, y) { d += "Q" + cx + " " + cy + " " + x + " " + y + " "; };
    rec.closePath = function () { d += "Z "; };
    rec.ellipse = function (cx, cy, rx, ry) {
      d += "M" + (cx - rx) + " " + cy + " A" + rx + " " + ry + " 0 1 0 " + (cx + rx) + " " + cy +
        " A" + rx + " " + ry + " 0 1 0 " + (cx - rx) + " " + cy + " Z ";
    };
    rec.stroke = function () {
      ops.push({ kind: "stroke", d: d, strokeStyle: rec.strokeStyle, lineWidth: rec.lineWidth,
        lineCap: rec.lineCap, dash: dash.slice(), alpha: rec.globalAlpha, clip: clip });
    };
    rec.fill = function () {
      ops.push({ kind: "fill", d: d, fillStyle: rec.fillStyle, alpha: rec.globalAlpha, clip: clip });
    };
    rec.clip = function () { clip = d; };
    rec.fillText = function (text, x, y) {
      ops.push({ kind: "text", text: String(text), x: x, y: y, font: rec.font,
        fillStyle: rec.fillStyle, alpha: rec.globalAlpha, clip: clip });
    };
    rec.measureText = function (text) {
      measureCtx.font = rec.font;
      return { width: measureCtx.measureText(text).width };
    };

    var prev = inkMode;
    inkMode = mode || "light";
    drawElement(rec, el);
    inkMode = prev;
    return ops;
  }

  Draw.scene = {
    drawElements: drawElements,
    drawElement: drawElement,
    recordElement: recordElement
  };
})();
