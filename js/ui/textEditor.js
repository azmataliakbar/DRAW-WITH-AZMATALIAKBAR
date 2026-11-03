/* Text editor: a textarea laid over the canvas while text is being typed or edited.
   It is positioned and sized from the viewport, so the text appears at the same size
   and place it will be drawn. Exposes window.Draw.textEditor.

   Commit rules: Escape, Ctrl+Enter, or clicking away saves. Empty text creates
   nothing for a new element, and removes an existing one. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});

  // opts: { stage (container element), commands, viewport() }
  function create(opts) {
    var commands = opts.commands;

    var area = document.createElement("textarea");
    area.className = "text-editor";
    area.hidden = true;
    area.spellcheck = false;
    area.setAttribute("aria-label", "Text");
    area.setAttribute("autocomplete", "off");
    opts.stage.appendChild(area);

    var current = null; // { element, isNew }

    // Position and size the textarea to match the element at the current zoom.
    function layout() {
      if (!current) return;
      var vp = opts.viewport();
      var el = current.element;
      var s = Draw.Viewport.worldToScreen(vp, el.x, el.y);
      var fs = el.fontSize * vp.zoom;
      var lines = area.value.split("\n");
      var maxW = 0;
      lines.forEach(function (line) {
        maxW = Math.max(maxW, Draw.text.measureText(line, fs).width);
      });
      area.style.left = s.x + "px";
      area.style.top = s.y + "px";
      area.style.width = Math.max(maxW + fs * 0.5, fs * 1.5) + "px";
      area.style.height = (lines.length * fs * Draw.text.LINE_HEIGHT + 2) + "px";
      area.style.fontFamily = Draw.text.FONT;
      area.style.fontSize = fs + "px";
      area.style.lineHeight = String(Draw.text.LINE_HEIGHT);
      area.style.textAlign = el.textAlign;
      area.style.color = el.strokeColor;
      area.style.opacity = String(el.opacity / 100);
      area.rows = lines.length;
    }

    // Saves the text (or removes it when blank) and closes the editor.
    function finish(save) {
      if (!current) return;
      var cur = current;
      current = null;
      var text = area.value;
      area.hidden = true;
      if (!cur.isNew) commands.dispatch({ type: "SET_EDITING", id: null });
      if (!save) return;

      var blank = !text.trim();
      if (cur.isNew) {
        if (!blank) {
          commands.commit(Object.assign({}, cur.element, Draw.text.measurePatch(cur.element, text)));
        }
      } else if (blank) {
        commands.removeElement(cur.element.id);
      } else if (text !== cur.element.text) {
        commands.updateElement(cur.element.id, Draw.text.measurePatch(cur.element, text));
      }
    }

    // element: a text element. isNew: true for an element that is not in the scene yet.
    function open(element, isNew) {
      finish(true);
      current = { element: element, isNew: !!isNew };
      area.value = element.text || "";
      area.hidden = false;
      if (!isNew) commands.dispatch({ type: "SET_EDITING", id: element.id });
      layout();
      area.focus();
      area.setSelectionRange(area.value.length, area.value.length);
    }

    area.addEventListener("input", layout);

    area.addEventListener("blur", function () {
      if (!area.hidden) finish(true);
    });

    area.addEventListener("keydown", function (e) {
      // Typing never reaches the global shortcuts.
      e.stopPropagation();
      if (e.key === "Escape" || ((e.ctrlKey || e.metaKey) && e.key === "Enter")) {
        e.preventDefault();
        finish(true);
      }
    });

    return {
      open: open,
      layout: layout,
      finish: finish,
      isOpen: function () { return !!current; }
    };
  }

  Draw.textEditor = { create: create };
})();
