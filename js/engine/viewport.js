/* Viewport: maps between world (scene) and screen (CSS pixel) coordinates.
   screen = world * zoom + pan
   Plain classic script; exposes window.Draw.Viewport. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});

  var MIN_ZOOM = 0.1;
  var MAX_ZOOM = 8;
  var DEFAULT_FIT_PADDING = 48; // screen px around fitted content

  function create() {
    return { panX: 0, panY: 0, zoom: 1 };
  }

  function clampZoom(z) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  }

  function screenToWorld(vp, sx, sy) {
    return { x: (sx - vp.panX) / vp.zoom, y: (sy - vp.panY) / vp.zoom };
  }

  function worldToScreen(vp, wx, wy) {
    return { x: wx * vp.zoom + vp.panX, y: wy * vp.zoom + vp.panY };
  }

  function panBy(vp, dx, dy) {
    vp.panX += dx;
    vp.panY += dy;
  }

  // Zoom to an absolute level, keeping the world point under (sx, sy) fixed.
  function zoomAt(vp, sx, sy, target) {
    var next = clampZoom(target);
    var ratio = next / vp.zoom;
    vp.panX = sx - (sx - vp.panX) * ratio;
    vp.panY = sy - (sy - vp.panY) * ratio;
    vp.zoom = next;
  }

  function zoomBy(vp, sx, sy, factor) {
    zoomAt(vp, sx, sy, vp.zoom * factor);
  }

  // Center a world-space rect {x, y, w, h} in a view of viewW x viewH.
  // rect === null means "no content": reset to 100% and center the origin.
  function fitRect(vp, rect, viewW, viewH, padding) {
    if (!rect) {
      vp.zoom = 1;
      vp.panX = viewW / 2;
      vp.panY = viewH / 2;
      return;
    }
    var pad = padding == null ? DEFAULT_FIT_PADDING : padding;
    var availW = Math.max(1, viewW - pad * 2);
    var availH = Math.max(1, viewH - pad * 2);
    var z = clampZoom(Math.min(availW / Math.max(rect.w, 1), availH / Math.max(rect.h, 1)));
    vp.zoom = z;
    vp.panX = viewW / 2 - (rect.x + rect.w / 2) * z;
    vp.panY = viewH / 2 - (rect.y + rect.h / 2) * z;
  }

  Draw.Viewport = {
    MIN_ZOOM: MIN_ZOOM,
    MAX_ZOOM: MAX_ZOOM,
    create: create,
    clampZoom: clampZoom,
    screenToWorld: screenToWorld,
    worldToScreen: worldToScreen,
    panBy: panBy,
    zoomAt: zoomAt,
    zoomBy: zoomBy,
    fitRect: fitRect
  };
})();
