/* Toast: a short status message over the canvas (exports, errors). Non-interactive.
   Exposes window.Draw.toast. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});
  var node = null;
  var timer = 0;

  function init(element) {
    node = element;
  }

  function show(message) {
    if (!node) return;
    node.textContent = message;
    node.classList.add("is-visible");
    clearTimeout(timer);
    timer = setTimeout(function () { node.classList.remove("is-visible"); }, 2600);
  }

  Draw.toast = { init: init, show: show };
})();
