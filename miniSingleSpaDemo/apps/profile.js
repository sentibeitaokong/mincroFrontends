import {apps} from "../src/mini-single-spa/apps.js";

// Profile 子应用 — bootstrap / mount / unmount 三个生命周期
export async function bootstrap({name}) {
    // bootstrap：应用加载完成后、首次 mount 前执行的一次性初始化
    console.log(`[${name}] bootstrap`);
}

export async function mount({domElement}) {
    // mount：路由匹配 #/profile 时渲染个人信息卡片
    domElement.innerHTML = `
    <h2>Profile 应用</h2>
    <p>每个子应用只暴露 bootstrap / mount / unmount 三个生命周期。</p>
    <pre>{ "user": "micro-frontend learner", "role": "admin" }</pre>
  `;
}

export async function unmount({name,domElement}) {
    // unmount：路由不再匹配时清理 DOM，释放资源
    console.log(`[${name}] unmount`);
    domElement.innerHTML = "";
}
