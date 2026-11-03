/* Autosave: keeps the drawing in IndexedDB (localStorage is too small for long strokes).
   Saves a short time after the last change, and when the page is hidden or closed.
   One drawing is kept. Exposes window.Draw.persistence. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});
  var DB_NAME = "draw-app";
  var STORE = "drawing";
  var KEY = "current";
  var VERSION = 1;
  var DEBOUNCE_MS = 400;

  var dbPromise = null;

  function openDb() {
    if (!dbPromise) {
      dbPromise = new Promise(function (resolve, reject) {
        if (!window.indexedDB) {
          reject(new Error("IndexedDB is not available"));
          return;
        }
        var req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    }
    return dbPromise;
  }

  // Runs one request in its own transaction and resolves with its result.
  function request(mode, makeReq) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode);
        var req = makeReq(tx.objectStore(STORE));
        tx.oncomplete = function () { resolve(req ? req.result : undefined); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
    });
  }

  function load() {
    return request("readonly", function (s) { return s.get(KEY); });
  }

  function save(data) {
    return request("readwrite", function (s) { return s.put(data, KEY); });
  }

  // store: the app store. opts.onError(err): called if a save fails.
  function create(store, opts) {
    var timer = 0;
    var lastSaved = null;

    function flush() {
      clearTimeout(timer);
      var st = store.getState();
      if (st.elements === lastSaved) return;
      var elements = st.elements;
      save({ version: VERSION, savedAt: Date.now(), elements: elements, style: st.style })
        .then(function () { lastSaved = elements; })
        .catch(function (err) { if (opts && opts.onError) opts.onError(err); });
    }

    store.subscribe(function (st) {
      if (st.elements === lastSaved) return;
      clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    });

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") flush();
    });

    // Resolves to the saved data, or null. Call before the user starts drawing.
    function restore() {
      return load().then(function (data) {
        if (data && Array.isArray(data.elements)) {
          lastSaved = data.elements;
          return data;
        }
        return null;
      });
    }

    // Called after the restored elements are dispatched, so they are not saved back.
    function markSaved(elements) {
      lastSaved = elements;
    }

    return { restore: restore, markSaved: markSaved, flush: flush };
  }

  Draw.persistence = { create: create };
})();
