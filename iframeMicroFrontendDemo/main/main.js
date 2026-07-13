import { MESSAGE_TYPES, createMessage, isTrustedMessage } from "../shared/message.js";

const apps = {
  todo: {
    name: "Todo 子应用",
    url: "../apps/todo/index.html",
  },
  profile: {
    name: "Profile 子应用",
    url: "../apps/profile/index.html",
  },
};

const frame = document.getElementById("micro-app-frame");
const messageList = document.getElementById("message-list");
const activeUser = document.getElementById("active-user");
const appButtons = document.querySelectorAll("[data-app]");
const themeButton = document.getElementById("broadcast-theme");
const userButton = document.getElementById("send-user");

let currentApp = "todo";
let currentTheme = "light";
let currentUser = {
  name: "游客",
  role: "guest",
};

function appendMessage(text) {
  const item = document.createElement("li");
  item.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  messageList.prepend(item);
}

function postToChild(type, payload = {}) {
  frame.contentWindow?.postMessage(createMessage(type, payload), window.location.origin);
}

function syncHostStateToChild() {
  postToChild(MESSAGE_TYPES.HOST_INIT, {
    app: currentApp,
    theme: currentTheme,
    user: currentUser,
  });
}

function switchApp(appName) {
  currentApp = appName;
  frame.src = apps[appName].url;

  appButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.app === appName);
  });

  appendMessage(`主应用切换到 ${apps[appName].name}`);
}

appButtons.forEach((button) => {
  button.addEventListener("click", () => switchApp(button.dataset.app));
});

themeButton.addEventListener("click", () => {
  currentTheme = currentTheme === "light" ? "dark" : "light";
  document.body.classList.toggle("dark", currentTheme === "dark");
  postToChild(MESSAGE_TYPES.HOST_THEME, { theme: currentTheme });
  appendMessage(`主应用广播主题：${currentTheme}`);
});

userButton.addEventListener("click", () => {
  currentUser = currentUser.name === "游客"
    ? { name: "Alice", role: "admin" }
    : { name: "游客", role: "guest" };

  activeUser.textContent = `当前用户：${currentUser.name}`;
  postToChild(MESSAGE_TYPES.HOST_USER, { user: currentUser });
  appendMessage(`主应用发送用户：${currentUser.name}`);
});

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin || !isTrustedMessage(event.data)) {
    return;
  }

  const { type, payload } = event.data;

  if (type === MESSAGE_TYPES.CHILD_READY) {
    appendMessage(`${payload.appName} 已就绪，主应用开始同步状态`);
    syncHostStateToChild();
    return;
  }

  if (type === MESSAGE_TYPES.CHILD_LOG) {
    appendMessage(`${payload.appName}：${payload.text}`);
    return;
  }

  if (type === MESSAGE_TYPES.CHILD_SET_USER) {
    currentUser = payload.user;
    activeUser.textContent = `当前用户：${currentUser.name}`;
    appendMessage(`${payload.appName} 更新用户为：${currentUser.name}`);
    return;
  }
});

appendMessage("主应用启动完成，默认加载 Todo 子应用");
