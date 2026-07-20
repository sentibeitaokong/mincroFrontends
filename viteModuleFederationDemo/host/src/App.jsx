import React, { Suspense, useState } from "react";
import ErrorBoundary from "./ErrorBoundary";

const RemoteProductCard = React.lazy(() => import("productApp/ProductCard"));

function LoadingCard() {
  return (
    <div className="loading-card" role="status">
      正在从 Remote 加载商品组件...
    </div>
  );
}

export default function App() {
  const [cartCount, setCartCount] = useState(0);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          Nova Market
        </a>
        <div className="cart" aria-label={`购物车中有 ${cartCount} 件商品`}>
          购物车 <strong>{cartCount}</strong>
        </div>
      </header>

      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">VITE + MODULE FEDERATION</p>
            <h1>一个页面，两个独立应用</h1>
            <p className="hero-copy">
              页面框架由 Host 渲染，商品卡片在运行时从 Remote 获取。
            </p>
          </div>
          <div className="architecture" aria-label="应用架构">
            <span>Host :5173</span>
            <i>runtime import</i>
            <span>Remote :4174</span>
          </div>
        </section>

        <section className="products" aria-labelledby="products-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">REMOTE COMPONENT</p>
              <h2 id="products-title">今日精选</h2>
            </div>
            <span className="live-badge">Remote 在线</span>
          </div>

          <ErrorBoundary>
            <Suspense fallback={<LoadingCard />}>
              <RemoteProductCard
                product={{
                  name: "Aurora 无线耳机",
                  description: "40 小时续航，空间音频与自适应降噪。",
                  price: 899,
                  accent: "violet",
                }}
                onAddToCart={() => setCartCount((count) => count + 1)}
              />
            </Suspense>
          </ErrorBoundary>
        </section>
      </main>

      <footer>
        Host 管理布局和购物车状态，Remote 只负责可复用的业务组件。
      </footer>
    </div>
  );
}

