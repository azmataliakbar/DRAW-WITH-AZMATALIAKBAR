/* Keyboard shortcuts dialog. Opens with ? (or Ctrl+/) and from the ? button.
   Exposes window.Draw.shortcutsDialog. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});

  var GROUPS = [
    {
      title: "Tools",
      rows: [
        ["1 or V", "Select"], ["2 or R", "Rectangle"], ["3 or D", "Diamond"],
        ["4 or O", "Ellipse"], ["5 or A", "Arrow"], ["6 or L", "Line"],
        ["7 or P", "Freedraw"], ["8 or T", "Text"], ["E", "Eraser"], ["H", "Hand (pan)"]
      ]
    },
    {
      title: "Edit",
      rows: [
        ["Ctrl+Z", "Undo"], ["Ctrl+Shift+Z or Ctrl+Y", "Redo"], ["Ctrl+D", "Duplicate"],
        ["Ctrl+A", "Select all"], ["Delete or Backspace", "Delete selection"],
        ["Arrow keys", "Nudge 1px (Shift: 10px)"],
        ["Ctrl+] / Ctrl+[", "Bring forward / send backward"],
        ["Ctrl+Shift+] / Ctrl+Shift+[", "Bring to front / send to back"],
        ["Esc", "Deselect"]
      ]
    },
    {
      title: "View",
      rows: [
        ["Space + drag", "Pan"], ["Mouse wheel", "Pan"], ["Ctrl + wheel", "Zoom"], ["?", "This help"]
      ]
    },
    {
      title: "Text",
      rows: [
        ["Double-click text", "Edit text"], ["Ctrl+Enter or Esc", "Finish text"]
      ]
    }
  ];

  function isTyping(target) {
    return !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
  }

  function bind() {
    var dialog = document.getElementById("shortcuts");
    var body = document.getElementById("shortcuts-body");
    var openBtn = document.getElementById("shortcuts-open");
    var closeBtn = document.getElementById("shortcuts-close");
    if (!dialog) return;

    GROUPS.forEach(function (group) {
      var wrap = document.createElement("section");
      wrap.className = "shortcuts-group";
      var h = document.createElement("h3");
      h.textContent = group.title;
      var list = document.createElement("dl");
      group.rows.forEach(function (row) {
        var dt = document.createElement("dt");
        dt.textContent = row[0];
        var dd = document.createElement("dd");
        dd.textContent = row[1];
        list.appendChild(dt);
        list.appendChild(dd);
      });
      wrap.appendChild(h);
      wrap.appendChild(list);
      body.appendChild(wrap);
    });

    function open() {
      if (dialog.showModal) dialog.showModal();
      else dialog.setAttribute("open", "");
    }

    openBtn.addEventListener("click", open);
    closeBtn.addEventListener("click", function () { dialog.close(); });

    window.addEventListener("keydown", function (e) {
      if (isTyping(e.target)) return;
      if (e.key === "?" || ((e.ctrlKey || e.metaKey) && e.key === "/")) {
        e.preventDefault();
        open();
      }
    });
  }

  Draw.shortcutsDialog = { bind: bind };
})();
