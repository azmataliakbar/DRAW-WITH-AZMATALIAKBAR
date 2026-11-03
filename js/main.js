/* App bootstrap. Creates the store, history, commands, tools, text editor, renderer
   and input, then wires the theme, autosave, export menu, zoom buttons, grid toggle,
   properties panel, shortcuts dialog and responsive shell. Pointer input lives in
   js/input/pointer.js, keyboard shortcuts in js/input/keyboard.js, tools in js/tools/,
   and UI in js/ui/. */
(function () {
  "use strict";
  var Draw = window.Draw;
  var doc = document.documentElement;
  var canvas = document.getElementById("canvas");
  var stage = document.getElementById("stage");
  var panel = document.getElementById("properties");
  var propsToggle = document.getElementById("props-toggle");
  var zoomValue = document.getElementById("zoom-value");
  var gridBtn = document.getElementById("grid-toggle");

  var ZOOM_STEP = 1.25;

  var viewport = Draw.Viewport.create();
  var view = { gridVisible: true, viewInitialized: false };

  function readCssVar(name) {
    return getComputedStyle(doc).getPropertyValue(name).trim();
  }

  var store = Draw.store.createStore(Draw.reducers.initialState(), Draw.reducers.reduce);
  var history = Draw.history.create(store);
  var editor = null;

  function refresh() {
    renderer.requestRender();
    zoomValue.textContent = Math.round(viewport.zoom * 100) + "%";
    if (editor) editor.layout(); // keep the text editor aligned with the view
  }

  // All edits go through commands: they record undo steps and are used by tools and the keyboard.
  var commands = Draw.commands.create({
    store: store,
    history: history,
    viewport: function () { return viewport; },
    viewChanged: refresh
  });

  editor = Draw.textEditor.create({
    stage: stage,
    commands: commands,
    viewport: function () { return viewport; }
  });

  var renderer = Draw.Renderer.create({
    canvas: canvas,
    getViewport: function () { return viewport; },
    layers: [
      function background(ctx, vp, size) {
        ctx.fillStyle = Draw.theme.colors().canvasBg;
        ctx.fillRect(0, 0, size.width, size.height);
      },
      function grid(ctx, vp, size) {
        if (view.gridVisible) Draw.grid.drawDotGrid(ctx, vp, size, Draw.theme.colors().gridDot);
      },
      function elements(ctx, vp) {
        var s = store.getState();
        Draw.scene.drawElements(ctx, vp, s.elements, s.editingId);
      },
      function draft(ctx, vp) {
        var d = store.getState().draft;
        if (d) Draw.scene.drawElements(ctx, vp, [d]);
      },
      function selection(ctx, vp) {
        Draw.selectionOverlay.draw(ctx, vp, store.getState());
      }
    ]
  });

  // ---------- Theme, toast, autosave, export ----------
  Draw.theme.init(document.getElementById("theme-toggle"));
  Draw.theme.onChange(refresh); // redraw the canvas in the new colours
  Draw.toast.init(document.getElementById("toast"));

  var persist = Draw.persistence.create(store, {
    onError: function () { Draw.toast.show("Autosave is not available in this browser."); }
  });
  persist.restore().then(function (data) {
    if (!data) return;
    store.dispatch({ type: "SET_ELEMENTS", elements: data.elements });
    if (data.style) store.dispatch({ type: "SET_STYLE", patch: data.style });
    persist.markSaved(data.elements);
    refresh();
  }).catch(function () { /* nothing saved yet, or storage blocked: start empty */ });

  Draw.exportMenu.create({
    button: document.getElementById("export-btn"),
    menu: document.getElementById("export-menu"),
    store: store
  });

  var T = Draw.Types.ELEMENT;
  var TOOL = Draw.Types.TOOL;
  var tools = {};
  tools[T.RECTANGLE] = Draw.shapeTool.create(commands, T.RECTANGLE);
  tools[T.DIAMOND] = Draw.shapeTool.create(commands, T.DIAMOND);
  tools[T.ELLIPSE] = Draw.shapeTool.create(commands, T.ELLIPSE);
  tools[T.LINE] = Draw.lineTool.create(commands, T.LINE);
  tools[T.ARROW] = Draw.lineTool.create(commands, T.ARROW);
  tools[T.FREEDRAW] = Draw.freedrawTool.create(commands);
  tools[TOOL.TEXT] = Draw.textTool.create(commands, editor);
  tools[TOOL.SELECT] = Draw.selectTool.create(commands);
  tools[TOOL.ERASER] = Draw.eraserTool.create(commands);
  tools[TOOL.HAND] = Draw.handTool.create(commands);

  var pointer = Draw.pointer.create({
    canvas: canvas,
    store: store,
    tools: tools,
    getViewport: function () { return viewport; },
    onViewChange: refresh
  });

  Draw.textTool.bindDoubleClick(canvas, commands, editor);
  Draw.toolbar.bind(store);
  Draw.keyboard.bind(commands);
  Draw.propertiesPanel.create(document.getElementById("props-body"), commands, store);
  Draw.shortcutsDialog.bind();

  store.subscribe(function () {
    refresh();
    pointer.updateCursor();
  });

  // ---------- Zoom and view buttons ----------
  function viewCenter() {
    return { x: renderer.size.width / 2, y: renderer.size.height / 2 };
  }

  document.getElementById("zoom-in").addEventListener("click", function () {
    var c = viewCenter();
    Draw.Viewport.zoomBy(viewport, c.x, c.y, ZOOM_STEP);
    refresh();
  });

  document.getElementById("zoom-out").addEventListener("click", function () {
    var c = viewCenter();
    Draw.Viewport.zoomBy(viewport, c.x, c.y, 1 / ZOOM_STEP);
    refresh();
  });

  // Fit resets to 100% centered on the origin. Stage 5 fits the bounds of the real elements.
  document.getElementById("zoom-fit").addEventListener("click", function () {
    Draw.Viewport.fitRect(viewport, null, renderer.size.width, renderer.size.height);
    refresh();
  });

  gridBtn.addEventListener("click", function () {
    view.gridVisible = !view.gridVisible;
    gridBtn.setAttribute("aria-pressed", String(view.gridVisible));
    refresh();
  });

  // ---------- Responsive shell ----------
  // Breakpoints come from --bp-* in app.css, so they are defined in one place.
  var mqTablet = window.matchMedia("(min-width: " + readCssVar("--bp-tablet") + ")");
  var mqDesktop = window.matchMedia("(min-width: " + readCssVar("--bp-desktop") + ")");

  function applyLayout() {
    doc.dataset.layout = mqDesktop.matches ? "desktop" : mqTablet.matches ? "tablet" : "mobile";
  }

  function setPanelOpen(open) {
    panel.classList.toggle("is-open", open);
    propsToggle.setAttribute("aria-expanded", String(open));
  }

  propsToggle.addEventListener("click", function () {
    setPanelOpen(!panel.classList.contains("is-open"));
  });
  document.getElementById("props-close").addEventListener("click", function () {
    setPanelOpen(false);
  });
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setPanelOpen(false);
  });

  mqTablet.addEventListener("change", applyLayout);
  mqDesktop.addEventListener("change", applyLayout);
  applyLayout();
  // Enable panel animations one frame after the first layout is applied.
  requestAnimationFrame(function () { doc.classList.add("app-ready"); });

  // ---------- Sizing ----------
  // Center the origin on first real layout; afterwards keep the current view.
  var ro = new ResizeObserver(function () {
    renderer.resize();
    if (!view.viewInitialized && renderer.size.width > 1) {
      Draw.Viewport.fitRect(viewport, null, renderer.size.width, renderer.size.height);
      view.viewInitialized = true;
    }
    refresh();
  });
  ro.observe(stage);
  window.addEventListener("resize", renderer.resize); // also catches devicePixelRatio changes

  pointer.updateCursor();
  refresh();
})();
