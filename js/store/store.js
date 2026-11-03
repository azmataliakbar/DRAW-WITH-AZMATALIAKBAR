/* Minimal store: one state object, reducer-driven updates, synchronous subscribers.
   Exposes window.Draw.store. */
(function () {
  "use strict";
  var Draw = (window.Draw = window.Draw || {});

  function createStore(initialState, reducer) {
    var state = initialState;
    var listeners = [];

    function getState() {
      return state;
    }

    function dispatch(action) {
      var next = reducer(state, action);
      if (next === state) return;
      state = next;
      for (var i = 0; i < listeners.length; i++) listeners[i](state, action);
    }

    function subscribe(fn) {
      listeners.push(fn);
      return function unsubscribe() {
        listeners = listeners.filter(function (l) { return l !== fn; });
      };
    }

    return { getState: getState, dispatch: dispatch, subscribe: subscribe };
  }

  Draw.store = { createStore: createStore };
})();
