export const MESSAGE_TYPES = {
  CHILD_READY: "child:ready",
  CHILD_LOG: "child:log",
  CHILD_SET_USER: "child:set-user",
  HOST_INIT: "host:init",
  HOST_THEME: "host:theme",
  HOST_USER: "host:user",
};

export function createMessage(type, payload = {}) {
  return {
    source: "iframe-micro-frontend-demo",
    type,
    payload,
    timestamp: Date.now(),
  };
}

export function isTrustedMessage(message) {
  return message && message.source === "iframe-micro-frontend-demo" && typeof message.type === "string";
}
