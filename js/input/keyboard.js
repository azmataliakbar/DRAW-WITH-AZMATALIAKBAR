/* Keyboard shortcuts. Ignored while typing in a field. Exposes window.Draw.keyboard.
   Tools:   1/V select   2/R rectangle   3/D diamond   4/O ellipse
            5/A arrow    6/L line        7/P freedraw   E eraser   H hand
   Edit:    Ctrl+Z undo   Ctrl+Shift+Z / Ctrl+Y redo   Ctrl+D duplicate   Ctrl+A select all
            Delete / Backspace delete   Arrow keys nudge (Shift: 10px)   Esc deselect
            Ctrl+] bring forward   Ctrl+[ send backward
            Ctrl+Shift+] bring to front   Ctrl+Shift+[ send to back
   Space (pan) is handled in pointer.js. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});
  var TOOL = Draw.Types.TOOL;

  var TOOL_KEYS = {
    "1": TOOL.SELECT, "v": TOOL.SELECT,
    "2": TOOL.RECTANGLE, "r": TOOL.RECTANGLE,
    "3": TOOL.DIAMOND, "d": TOOL.DIAMOND,
    "4": TOOL.ELLIPSE, "o": TOOL.ELLIPSE,
    "5": TOOL.ARROW, "a": TOOL.ARROW,
    "6": TOOL.LINE, "l": TOOL.LINE,
    "7": TOOL.FREEDRAW, "p": TOOL.FREEDRAW,
    "e": TOOL.ERASER,
    "h": TOOL.HAND,
    "8": TOOL.TEXT, "t": TOOL.TEXT
  };

  var ARROWS = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]
  };

  function isTyping(el) {
    return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  }

  // commands: object from Draw.commands.create
  function bind(commands) {
    window.addEventListener("keydown", function (e) {
      if (isTyping(e.target)) return;

      var mod = e.ctrlKey || e.metaKey;
      var key = (e.key || "").toLowerCase();

      if (mod) {
        if (key === "z") {
          e.preventDefault();
          if (e.shiftKey) commands.redo(); else commands.undo();
        } else if (key === "y") {
          e.preventDefault();
          commands.redo();
        } else if (key === "d") {
          e.preventDefault();
          commands.duplicateSelected();
        } else if (key === "a") {
          e.preventDefault();
          commands.selectAll();
        } else if (e.code === "BracketRight") {
          e.preventDefault();
          commands.zOrder(e.shiftKey ? "front" : "forward");
        } else if (e.code === "BracketLeft") {
          e.preventDefault();
          commands.zOrder(e.shiftKey ? "back" : "backward");
        }
        return;
      }

      if (e.altKey) return;

      if (key === "delete" || key === "backspace") {
        e.preventDefault();
        commands.deleteSelected();
        return;
      }

      if (key === "escape") {
        commands.clearSelection();
        return;
      }

      if (ARROWS[e.key]) {
        e.preventDefault();
        var step = e.shiftKey ? 10 : 1;
        commands.nudgeSelected(ARROWS[e.key][0] * step, ARROWS[e.key][1] * step, !e.repeat);
        return;
      }

      if (!e.repeat && TOOL_KEYS[key]) {
        commands.setTool(TOOL_KEYS[key]);
      }
    });
  }

  Draw.keyboard = { bind: bind };
})();
