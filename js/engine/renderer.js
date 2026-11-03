/* Renderer: sizes the canvas for devicePixelRatio and redraws the scene on
   animation frames, only when something changed. Exposes window.Draw.Renderer. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});

  // options.canvas     : HTMLCanvasElement
  // options.getViewport: () => viewport
  // options.layers     : array of fn(ctx, viewport, size), drawn in order
  function create(options) {
    var canvas = options.canvas;
    var ctx = canvas.getContext("2d");
    var size = { width: 0, height: 0, dpr: 1 };
    var frameId = 0;

    function requestRender() {
      if (!frameId) frameId = requestAnimationFrame(render);
    }

    function render() {
      frameId = 0;
      // All drawing uses CSS pixels; the transform handles the device scale.
      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      ctx.clearRect(0, 0, size.width, size.height);
      var vp = options.getViewport();
      for (var i = 0; i < options.layers.length; i++) {
        options.layers[i](ctx, vp, size);
      }
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      var w = Math.max(1, Math.round(rect.width));
      var h = Math.max(1, Math.round(rect.height));
      var pw = Math.round(w * dpr);
      var ph = Math.round(h * dpr);
      if (canvas.width !== pw) canvas.width = pw;
      if (canvas.height !== ph) canvas.height = ph;
      size.width = w;
      size.height = h;
      size.dpr = dpr;
      requestRender();
    }

    return {
      size: size,
      resize: resize,
      requestRender: requestRender
    };
  }

  Draw.Renderer = { create: create };
})();
