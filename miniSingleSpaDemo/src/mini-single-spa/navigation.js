// 保存用户注册的路由事件监听器，等待微前端调度完成后再统一触发。
const capturedEventListeners = {
  hashchange: [],
  popstate: [],
};

const routingEventsListeningTo = ["hashchange", "popstate"];

function isRoutingEvent(eventName) {
  return routingEventsListeningTo.includes(eventName);
}

function shouldReroute(oldUrl, newUrl) {
  return oldUrl !== newUrl;
}

function callCapturedEventListeners(eventArgs) {
  if (!eventArgs || !eventArgs[0]) {
    return;
  }

  const eventType = eventArgs[0].type;
  const listeners = capturedEventListeners[eventType] || [];
  listeners.forEach((listener) => listener.apply(window, eventArgs));
}

// history.pushState / replaceState 本身不会触发 popstate，这里手动构造事件保持行为一致。
function createPopStateEvent(state, oldUrl) {
  return new PopStateEvent("popstate", {
    state,
    oldURL: oldUrl,
    newURL: window.location.href,
  });
}

function patchedUpdateState(updateState, reroute) {
  return function patchedHistoryUpdateState(state, title, url) {
    const oldUrl = window.location.href;
    const result = updateState.apply(this, arguments);
    const newUrl = window.location.href;

    if (shouldReroute(oldUrl, newUrl)) {
      const eventArgs = [createPopStateEvent(state, oldUrl)];
      Promise.resolve(reroute(eventArgs)).then(() => callCapturedEventListeners(eventArgs));
    }
    return result;
  };
}

export function patchRoutingEvents(reroute) {
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  // 拦截用户注册的 hashchange / popstate，避免用户监听早于应用挂载执行。
  window.addEventListener = function patchedAddEventListener(eventName, listener, ...rest) {
    if (isRoutingEvent(eventName) && !capturedEventListeners[eventName].includes(listener)) {
      capturedEventListeners[eventName].push(listener);
      return;
    }

    return originalAddEventListener.call(this, eventName, listener, ...rest);
  };
  //保留不需要删除的事件
  window.removeEventListener = function patchedRemoveEventListener(eventName, listener, ...rest) {
    if (isRoutingEvent(eventName)) {
      capturedEventListeners[eventName] = capturedEventListeners[eventName].filter((fn) => fn !== listener);
      return;
    }

    return originalRemoveEventListener.call(this, eventName, listener, ...rest);
  };

  // 包装 history API，让编程式路由跳转也能触发 reroute。
  window.history.pushState = patchedUpdateState(originalPushState, reroute);
  window.history.replaceState = patchedUpdateState(originalReplaceState, reroute);

  // 内部监听必须使用原始 addEventListener，否则会被上面的拦截逻辑捕获而无法真正绑定。
  originalAddEventListener.call(window, "hashchange", (...eventArgs) => {
    Promise.resolve(reroute(eventArgs)).then(() => callCapturedEventListeners(eventArgs));
  });

  originalAddEventListener.call(window, "popstate", (...eventArgs) => {
    Promise.resolve(reroute(eventArgs)).then(() => callCapturedEventListeners(eventArgs));
  });
}
