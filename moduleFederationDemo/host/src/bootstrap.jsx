import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "./ErrorBoundary";
import "./styles.css";

const RemoteProductCard = React.lazy(() => import("productApp/ProductCard"));

function App() {
  return (
    <main className="shell">
      <header className="hero">
        <span className="eyebrow">HOST · PORT 3000</span>
        <h1>模块联邦商城</h1>
        <p>
          页面框架由 Host 渲染；下方商品卡片来自独立构建、独立部署的 Remote。
        </p>
      </header>

      <section className="content" aria-labelledby="remote-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow remote-label">REMOTE · PORT 3001</span>
            <h2 id="remote-title">远程商品模块</h2>
          </div>
          <span className="status"><i />运行中</span>
        </div>

        <ErrorBoundary>
          <Suspense fallback={<div className="loading">正在获取远程模块…</div>}>
            <RemoteProductCard
              name="Federation Keyboard"
              price={699}
              onAddToCart={(name) => window.alert(`已将 ${name} 加入购物车`)}
            />
          </Suspense>
        </ErrorBoundary>
      </section>

      <footer>
        <code>productApp/ProductCard</code>
        <span>在运行时通过 remoteEntry.js 加载</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
