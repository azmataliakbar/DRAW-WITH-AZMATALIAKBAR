/* Export menu: PNG, JPG, SVG and JSON. Each save downloads a file named with the
   date and time, then shows a short confirmation. Exposes window.Draw.exportMenu. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});

  // opts: { button, menu, store }
  function create(opts) {
    var button = opts.button;
    var menu = opts.menu;
    var store = opts.store;

    function setOpen(open) {
      menu.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
    }

    function run(format) {
      var elements = store.getState().elements.filter(function (el) { return !el.isDeleted; });
      if (!elements.length) {
        Draw.toast.show("Nothing to export yet. Draw something first.");
        return;
      }
      var base = "drawing-" + Draw.download.stamp();
      var job;
      if (format === "png") {
        job = Draw.exportPng.png(elements).then(function (blob) { return { blob: blob, name: base + ".png" }; });
      } else if (format === "jpg") {
        job = Draw.exportJpg.jpg(elements).then(function (blob) { return { blob: blob, name: base + ".jpg" }; });
      } else if (format === "svg") {
        var text = Draw.exportSvg.svg(elements);
        job = Promise.resolve({ blob: new Blob([text], { type: "image/svg+xml" }), name: base + ".svg" });
      } else {
        job = Promise.resolve({ blob: Draw.exportJson.json(elements, store.getState().style), name: base + ".json" });
      }

      job.then(function (result) {
        if (!result || !result.blob) {
          Draw.toast.show("Export failed. Try again.");
          return;
        }
        Draw.download.save(result.blob, result.name);
        Draw.toast.show("Saved " + result.name);
      }).catch(function () {
        Draw.toast.show("Export failed. Try again.");
      });
    }

    button.addEventListener("click", function () { setOpen(menu.hidden); });

    menu.querySelectorAll("[data-format]").forEach(function (item) {
      item.addEventListener("click", function () {
        setOpen(false);
        run(item.dataset.format);
      });
    });

    document.addEventListener("pointerdown", function (e) {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== button) setOpen(false);
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  Draw.exportMenu = { create: create };
})();
