/* Properties panel. With a selection it edits the selected elements; with nothing
   selected it sets the defaults for new elements. Controls reflect the first selected
   element, or the defaults. Exposes window.Draw.propertiesPanel. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});
  var E = Draw.Types.ELEMENT;

  var STROKE_COLORS = ["auto", "#1e1e1e", "#e03131", "#2f9e44", "#1971c2", "#f08c00"];
  var BACKGROUND_COLORS = ["transparent", "#ffc9c9", "#b2f2bb", "#a5d8ff", "#ffec99"];
  var FILLS = [
    { value: "solid", label: "Solid" },
    { value: "hachure", label: "Hachure" },
    { value: "cross-hatch", label: "Cross-hatch" }
  ];
  var WIDTHS = [
    { value: 1, label: "Thin" },
    { value: 3, label: "Bold" },
    { value: 5, label: "Extra bold" }
  ];
  var STROKE_STYLES = [
    { value: "solid", label: "Solid" },
    { value: "dashed", label: "Dashed" },
    { value: "dotted", label: "Dotted" }
  ];
  var ROUGHNESS = [
    { value: 0, label: "Architect" },
    { value: 1, label: "Artist" },
    { value: 2, label: "Cartoonist" }
  ];
  var FONT_SIZES = [
    { value: 16, label: "S" },
    { value: 20, label: "M" },
    { value: 28, label: "L" },
    { value: 36, label: "XL" }
  ];
  var ALIGNS = [
    { value: "left", label: "Left" },
    { value: "center", label: "Center" },
    { value: "right", label: "Right" }
  ];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // container: element to fill. commands: from Draw.commands. store: the app store.
  function create(container, commands, store) {
    var buttons = {};   // style key -> array of buttons
    var colorInputs = {};
    var opacityInput = null;
    var textSection = null;
    var pending = null; // snapshot taken at the start of a live (slider or colour) change

    container.innerHTML = "";

    function section(title) {
      var s = el("section", "prop-section");
      s.appendChild(el("h3", "prop-title", title));
      container.appendChild(s);
      return s;
    }

    function row(parent, label) {
      var r = el("div", "prop-row");
      r.appendChild(el("span", "prop-label", label));
      parent.appendChild(r);
      return r;
    }

    function choices(key, options, parent) {
      var group = el("div", "prop-choices");
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", key);
      buttons[key] = options.map(function (o) {
        var b = el("button", "prop-choice", o.label);
        b.type = "button";
        b.dataset.value = String(o.value);
        b.title = o.label;
        b.addEventListener("click", function () {
          commands.applyStyle(Object.assign({}, { [key]: o.value }));
        });
        group.appendChild(b);
        return b;
      });
      parent.appendChild(group);
    }

    function swatches(key, colors, parent) {
      var group = el("div", "prop-swatches");
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", key);
      buttons[key] = colors.map(function (c) {
        var b = el("button", "swatch");
        b.type = "button";
        b.dataset.value = c;
        if (c === "transparent") {
          b.classList.add("is-none");
          b.title = "None";
        } else if (c === "auto") {
          b.classList.add("is-auto");
          b.title = "Auto (follows the theme)";
        } else {
          b.style.background = c;
          b.title = c;
        }
        b.addEventListener("click", function () {
          commands.applyStyle({ [key]: c });
        });
        group.appendChild(b);
        return b;
      });
      parent.appendChild(group);
    }

    // Colour picker. Live updates while dragging are one undo step on release.
    function colorPicker(key, label, parent) {
      var input = el("input", "prop-color");
      input.type = "color";
      input.setAttribute("aria-label", label);
      input.addEventListener("input", function () {
        if (!pending) pending = commands.snapshot();
        commands.applyStyle({ [key]: input.value }, { record: false });
      });
      input.addEventListener("change", function () {
        if (pending) {
          commands.recordSnapshot(pending);
          pending = null;
        }
      });
      parent.appendChild(input);
      colorInputs[key] = input;
    }

    // Stroke
    var stroke = section("Stroke");
    var colourRow = row(stroke, "Colour");
    swatches("strokeColor", STROKE_COLORS, colourRow);
    colorPicker("strokeColor", "Custom stroke colour", colourRow);
    choices("strokeWidth", WIDTHS, row(stroke, "Width"));
    choices("strokeStyle", STROKE_STYLES, row(stroke, "Style"));
    choices("roughness", ROUGHNESS, row(stroke, "Roughness"));

    // Fill
    var fill = section("Fill");
    var bgRow = row(fill, "Background");
    swatches("backgroundColor", BACKGROUND_COLORS, bgRow);
    colorPicker("backgroundColor", "Custom background colour", bgRow);
    choices("fillStyle", FILLS, row(fill, "Fill style"));

    // Appearance
    var appearance = section("Appearance");
    var opacityRow = row(appearance, "Opacity");
    opacityInput = el("input", "prop-range");
    opacityInput.type = "range";
    opacityInput.min = "10";
    opacityInput.max = "100";
    opacityInput.step = "5";
    opacityInput.setAttribute("aria-label", "Opacity");
    opacityInput.addEventListener("input", function () {
      if (!pending) pending = commands.snapshot();
      commands.applyStyle({ opacity: Number(opacityInput.value) }, { record: false });
    });
    opacityInput.addEventListener("change", function () {
      if (pending) {
        commands.recordSnapshot(pending);
        pending = null;
      }
    });
    opacityRow.appendChild(opacityInput);

    // Text (shown when nothing is selected, or a text element is)
    textSection = section("Text");
    choices("fontSize", FONT_SIZES, row(textSection, "Size"));
    choices("textAlign", ALIGNS, row(textSection, "Align"));

    // Reflect the current selection or defaults.
    function sync(state) {
      var selected = {};
      state.selectedIds.forEach(function (id) { selected[id] = true; });
      var sel = state.elements.filter(function (e) { return selected[e.id]; });
      var src = sel.length ? sel[0] : state.style;

      Object.keys(buttons).forEach(function (key) {
        buttons[key].forEach(function (b) {
          b.setAttribute("aria-pressed", String(String(src[key]) === b.dataset.value));
        });
      });

      colorInputs.strokeColor.value = Draw.theme.resolveInk(src.strokeColor);
      colorInputs.backgroundColor.value = src.backgroundColor === "transparent" ? "#ffffff" : src.backgroundColor;
      opacityInput.value = String(src.opacity);

      textSection.hidden = !(sel.length === 0 || sel.some(function (e) { return e.type === E.TEXT; }));
    }

    store.subscribe(sync);
    sync(store.getState());
  }

  Draw.propertiesPanel = { create: create };
})();
