let bootstrapped = false;

// Home 子应用 — bootstrap / mount / unmount 三个生命周期
export async function bootstrap({name}) {
    // bootstrap 应用初始化阶段，只执行一次（应用从 NOT_BOOTSTRAPPED → NOT_MOUNTED）
    bootstrapped = true;
    console.log(`[${name}] bootstrap`, {bootstrapped});
}

export async function mount({domElement}) {
    // mount 阶段：将子应用的内容渲染到分配的 DOM 容器中（NOT_MOUNTED → MOUNTED）
    domElement.innerHTML = `
    <h2>Home 应用</h2>
    <p>当前 hash 匹配 <code>#/home</code>，所以 Home 被挂载。</p>
    <button id="to-orders">跳转到 Orders</button>
  `;

    // 按钮点击后通过修改 hash 触发路由变化，mini-single-spa 会卸载本应用、挂载 Orders 应用
    domElement.querySelector("#to-orders").addEventListener("click", () => {
        window.location.hash = "#/orders";
    });
}

export async function unmount({name,domElement}) {
    // unmount 阶段：路由不匹配时清空 DOM、移除事件监听等清理工作（MOUNTED → NOT_MOUNTED）
    console.log(`[${name}] unmount`);
    domElement.innerHTML = "";
}
