import {apps} from "../src/mini-single-spa/apps.js";

// Orders 子应用 — bootstrap / mount / unmount 三个生命周期
export async function bootstrap({name}) {
    // bootstrap：一次性初始化，应用被首次激活前执行
    console.log(`[${name}] bootstrap`);
}

export async function mount({domElement}) {
    // mount：路由匹配时渲染订单列表页面
    domElement.innerHTML = `
    <h2>Orders 应用</h2>
    <p>这里模拟订单子应用。切换路由时，mini single-spa 会先卸载旧应用，再挂载新应用。</p>
    <ul>
      <li>Order #1001</li>
      <li>Order #1002</li>
      <li>Order #1003</li>
    </ul>
  `;
}

export async function unmount({name,domElement}) {
    // unmount：路由不匹配时清理 DOM 并输出日志
    console.log(`[${name}] unmount`);
    domElement.innerHTML = "";
}
