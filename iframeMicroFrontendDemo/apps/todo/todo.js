import { MESSAGE_TYPES, createMessage, isTrustedMessage } from "../../shared/message.js";

const appName = "Todo 子应用";
const stateText = document.getElementById("state");
const input = document.getElementById("todo-input");
const addButton = document.getElementById("add-todo");
const loginButton = document.getElementById("login-from-child");
const todoList = document.getElementById("todo-list");

let currentUser = {
  name: "游客",
  role: "guest",
};
let currentTheme = "light";

function postToHost(type, payload = {}) {
  window.parent.postMessage(createMessage(type, { appName, ...payload }), window.location.origin);
}

function renderState() {
  stateText.textContent = `主题：${currentTheme}，用户：${currentUser.name}（${currentUser.role}）`;
  document.body.classList.toggle("dark", currentTheme === "dark");
}

function handleHostMessage(type, payload) {
  if (type === MESSAGE_TYPES.HOST_INIT) {
    currentTheme = payload.theme;
    currentUser = payload.user;
    renderState();
    postToHost(MESSAGE_TYPES.CHILD_LOG, { text: "收到主应用初始化状态" });
    return;
  }

  if (type === MESSAGE_TYPES.HOST_THEME) {
    currentTheme = payload.theme;
    renderState();
    postToHost(MESSAGE_TYPES.CHILD_LOG, { text: `主题已切换为 ${currentTheme}` });
    return;
  }

  if (type === MESSAGE_TYPES.HOST_USER) {
    currentUser = payload.user;
    renderState();
    postToHost(MESSAGE_TYPES.CHILD_LOG, { text: `用户已切换为 ${currentUser.name}` });
  }
}

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin || !isTrustedMessage(event.data)) {
    return;
  }

  handleHostMessage(event.data.type, event.data.payload);
});

addButton.addEventListener("click", () => {
  const text = input.value.trim();

  if (!text) {
    return;
  }

  const item = document.createElement("li");
  item.textContent = text;
  todoList.append(item);
  input.value = "";
  postToHost(MESSAGE_TYPES.CHILD_LOG, { text: `新增任务：${text}` });
});

loginButton.addEventListener("click", () => {
  const user = currentUser.name === "TodoUser"
    ? { name: "游客", role: "guest" }
    : { name: "TodoUser", role: "editor" };

  currentUser = user;
  renderState();
  postToHost(MESSAGE_TYPES.CHILD_SET_USER, { user });
});

renderState();
postToHost(MESSAGE_TYPES.CHILD_READY);
