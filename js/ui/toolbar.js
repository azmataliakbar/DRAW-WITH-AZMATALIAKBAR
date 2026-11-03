/* Toolbar: highlights the active tool and dispatches SET_TOOL on click.
   Buttons marked .is-stub are not implemented yet and ignore clicks.
   Exposes window.Draw.toolbar. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});

  function bind(store) {
    var buttons = document.querySelectorAll(".tool-btn");

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.classList.contains("is-stub")) return;
        store.dispatch({ type: "SET_TOOL", tool: btn.dataset.tool });
      });
    });

    function sync() {
      var current = store.getState().tool;
      buttons.forEach(function (btn) {
        var on = btn.dataset.tool === current;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", String(on));
      });
    }

    store.subscribe(sync);
    sync();
  }

  Draw.toolbar = { bind: bind };
})();
