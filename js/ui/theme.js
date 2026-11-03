/* Theme: System / Light / Dark. Sets data-theme on <html> (light or dark, resolved).
   The choice is stored in localStorage and defaults to System, which follows
   prefers-color-scheme live. Colours come from CSS custom properties.
   Exposes window.Draw.theme. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});
  var KEY = "draw.theme";
  var CHOICES = ["system", "light", "dark"];
  var LABELS = { system: "System", light: "Light", dark: "Dark" };
  var GLYPHS = { system: "◐", light: "☀", dark: "☾" };

  var root = document.documentElement;
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  var choice = readChoice();
  var cache = null;
  var listeners = [];
  var button = null;

  function readChoice() {
    try {
      var v = localStorage.getItem(KEY);
      return CHOICES.indexOf(v) >= 0 ? v : "system";
    } catch (e) {
      return "system";
    }
  }

  function resolved() {
    if (choice === "system") return media.matches ? "dark" : "light";
    return choice;
  }

  // Colours the canvas needs, read from the current theme (cached until the theme changes).
  function colors() {
    if (cache) return cache;
    var cs = getComputedStyle(root);
    function v(name) { return cs.getPropertyValue(name).trim(); }
    cache = {
      canvasBg: v("--canvas-bg"),
      gridDot: v("--grid-dot"),
      accent: v("--accent"),
      handleFill: v("--handle-fill"),
      ink: v("--ink")
    };
    return cache;
  }

  // "auto" stroke colour resolves to the theme's ink; any other colour is returned as is.
  function resolveInk(color) {
    return color === "auto" ? colors().ink : color;
  }

  function apply() {
    var mode = resolved();
    root.dataset.theme = mode;
    root.dataset.themeChoice = choice;
    cache = null;
    if (button) {
      button.textContent = GLYPHS[choice];
      button.title = "Theme: " + LABELS[choice] + " (click to change)";
      button.setAttribute("aria-label", "Theme: " + LABELS[choice] + ". Click to change.");
    }
    listeners.forEach(function (fn) { fn(mode); });
  }

  function set(next) {
    choice = CHOICES.indexOf(next) >= 0 ? next : "system";
    try { localStorage.setItem(KEY, choice); } catch (e) { /* storage unavailable: keep in memory */ }
    apply();
  }

  function cycle() {
    set(CHOICES[(CHOICES.indexOf(choice) + 1) % CHOICES.length]);
  }

  function init(buttonEl) {
    button = buttonEl;
    button.addEventListener("click", cycle);
    media.addEventListener("change", function () {
      if (choice === "system") apply();
    });
    apply();
  }

  Draw.theme = {
    init: init,
    set: set,
    cycle: cycle,
    choice: function () { return choice; },
    resolved: resolved,
    colors: colors,
    resolveInk: resolveInk,
    onChange: function (fn) { listeners.push(fn); }
  };
})();
