import { MESSAGE_TYPES, createMessage, isTrustedMessage } from "../../shared/message.js";

const appName = "Profile 子应用";
const stateText = document.getElementById("state");
const profileName = document.getElementById("profile-name");
const profileRole = document.getElementById("profile-role");
const promoteButton = document.getElementById("promote-user");

let currentUser = {
  name: "游客",
  role: "guest",
};
let currentTheme = "light";

function postToHost(type, payload = {}) {
  window.parent.postMessage(createMessage(type, { appName, ...payload }), window.location.origin);
}

function render() {
  stateText.textContent = `主题：${currentTheme}，用户：${currentUser.name}`;
  profileName.textContent = `用户：${currentUser.name}`;
  profileRole.textContent = `角色：${currentUser.role}`;
  document.body.classList.toggle("dark", currentTheme === "dark");
}

function handleHostMessage(type, payload) {
  if (type === MESSAGE_TYPES.HOST_INIT) {
    currentTheme = payload.theme;
    currentUser = payload.user;
    render();
    postToHost(MESSAGE_TYPES.CHILD_LOG, { text: "收到主应用初始化状态" });
    return;
  }

  if (type === MESSAGE_TYPES.HOST_THEME) {
    currentTheme = payload.theme;
    render();
    postToHost(MESSAGE_TYPES.CHILD_LOG, { text: `主题已切换为 ${currentTheme}` });
    return;
  }

  if (type === MESSAGE_TYPES.HOST_USER) {
    currentUser = payload.user;
    render();
    postToHost(MESSAGE_TYPES.CHILD_LOG, { text: `用户已同步为 ${currentUser.name}` });
  }
}

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin || !isTrustedMessage(event.data)) {
    return;
  }

  handleHostMessage(event.data.type, event.data.payload);
});

promoteButton.addEventListener("click", () => {
  currentUser = {
    name: "ProfileAdmin",
    role: "admin",
  };

  render();
  postToHost(MESSAGE_TYPES.CHILD_SET_USER, { user: currentUser });
});

render();
postToHost(MESSAGE_TYPES.CHILD_READY);
