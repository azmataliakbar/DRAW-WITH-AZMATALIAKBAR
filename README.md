# Draw

A hand-drawn whiteboard app in plain HTML, CSS, and JavaScript. No build step, no npm, no framework.

**Status:** Stage 4 of 5. Canvas, navigation, responsive shell, drawing tools, selection and editing, undo/redo, the eraser, text, the properties panel, and the shortcuts dialog. Local save, export, and import arrive in Stage 5.

## Run locally

Double-click `index.html`, or drag it into a browser window. No server is required: the scripts are classic `<script>` tags loaded in order, which work from `file://`.

## Test the layout

Open the page in a desktop browser, open DevTools (F12), and turn on the device toolbar (Ctrl+Shift+M). Check these widths:

| Width | Expected layout |
|---|---|
| 1440px | Left tool column, canvas, right properties column. All visible. |
| 768px | Icon tool column, canvas. "Properties" button at top-right opens a drawer from the right. |
| 270px | Canvas fills the screen. Tools wrap into a bottom bar. "Properties" opens a full-screen sheet with Close. No horizontal scrolling. |

On a phone, one finger draws with the active tool, two fingers pinch to zoom and pan, and the Hand tool pans with one finger.

## Controls

- **Draw:** pick a tool and drag on the canvas. Shift constrains a shape to a square or circle, or a line to 45° steps. A click without a drag creates nothing.
- **Select:** click an element (an outline, or inside a filled shape) to select it. Shift-click adds or removes. Drag on empty canvas for a marquee; it selects the elements fully inside it.
- **Move and resize:** drag a selected element to move it (Shift locks to one axis). Drag one of the eight handles to resize (Shift keeps the aspect ratio on corner handles). Edges cannot cross the opposite edge.
- **Edit:** Delete removes the selection. Ctrl+D duplicates it. Arrow keys nudge 1px (Shift: 10px). Ctrl+] and Ctrl+[ move the selection one step up or down in z-order (Ctrl+Shift+] and Ctrl+Shift+[ to the top or bottom).
- **Undo/redo:** Ctrl+Z, and Ctrl+Shift+Z or Ctrl+Y. Each drag, deletion, or stroke is one step.
- **Eraser (E):** click or drag over elements to remove them.
- **Pan:** hold Space and drag, middle-mouse drag, drag with the Hand tool (H), or use the mouse wheel.
- **Zoom:** Ctrl+wheel (or trackpad pinch), the `+` / `−` buttons, two-finger pinch on touch.
- **Fit:** resets to 100% centered on the origin until the Stage 5 fit-to-content.
- **Grid:** toggles the dot grid.
- **Keyboard tools:** 1/V select, 2/R rectangle, 3/D diamond, 4/O ellipse, 5/A arrow, 6/L line, 7/P freedraw, 8/T text, E eraser, H hand.
- **Text:** with the Text tool, click the canvas and type. Escape or Ctrl+Enter saves, and so does clicking away. Double-click a text element (with Select or Text) to edit it. Clearing the text removes the element. Text is drawn at the same size as the editor at any zoom.
- **Properties:** with a selection, the panel changes the selected elements. With nothing selected, it sets the defaults for new elements. Applying a style to a selection also sets the default for new elements.
- **Shortcuts:** press `?` (or Ctrl+/, or the `?` button) for the full list.
- **Theme:** the ◐ button cycles System → Light → Dark (☀ / ☾). System follows your computer's setting. Your choice is remembered.
- **Export:** the Export button saves the drawing area (not the whole screen) as PNG (transparent background), JPG (white background), SVG (vector), or JSON (project file). The signature is never included.
- **Autosave:** the drawing is saved in this browser (IndexedDB) a moment after you stop editing, and restored when you reopen the page. One drawing is kept.

## Deploy to Netlify

**Drag and drop (fastest):**
1. Go to https://app.netlify.com/drop.
2. Drag the `draw` folder onto the page.
3. Netlify gives you a URL. The folder has no build step, so nothing else is needed.

**Connected to GitHub (redeploys on every push):**
1. Create a GitHub repository and push the contents of the `draw` folder to its root (`index.html` must be at the top level of the repo).
2. In Netlify, choose **Add new site → Import an existing project** and pick the repository.
3. Set **Build command** to empty and **Publish directory** to `.`
4. Deploy. Each push to the default branch redeploys.

## Dependencies

- None. There is no CDN and no npm package. The hand-drawn look is written in `js/engine/drawElement.js`, so the app works offline once loaded.

## Project layout

```
index.html              page shell and markup, script order
css/app.css             layout, breakpoints (--bp-tablet, --bp-desktop), theme variables
js/main.js              bootstrap: store, renderer, tools, zoom buttons, responsive shell
js/model/               types, element factory, geometry
js/model/hitTest.js     hit testing, selection bounds, resize handles
js/store/               store, reducers, history (undo/redo), commands (all edits)
js/engine/              viewport, dot grid, renderer, element drawing, selection overlay
js/tools/               shape, line, freedraw, select, eraser, hand tools
js/input/pointer.js     pointer routing: tools vs pan/pinch, wheel, space-to-pan
js/input/keyboard.js    keyboard shortcuts
js/ui/toolbar.js        tool buttons
```

Later stages add selection, history, keyboard shortcuts, text, the properties panel, and import/export under `js/io/`.
