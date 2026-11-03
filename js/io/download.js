/* Download helper: saves a Blob through a temporary anchor, then frees the object URL.
   Exposes window.Draw.download. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});

  function save(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  // Local time as YYYYMMDD-HHMM, for file names.
  function stamp() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes());
  }

  Draw.download = { save: save, stamp: stamp };
})();
