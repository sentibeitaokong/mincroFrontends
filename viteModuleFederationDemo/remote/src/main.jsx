import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import ProductCard from "./ProductCard";
import "./standalone.css";

function RemoteApp() {
  const [cartCount, setCartCount] = useState(0);

  return (
    <main className="remote-page">
      <div className="remote-heading">
        <div>
          <p>PRODUCT REMOTE · STANDALONE</p>
          <h1>独立开发与预览</h1>
        </div>
        <span>已添加 {cartCount} 件</span>
      </div>
      <ProductCard
        product={{
          name: "Aurora 无线耳机",
          description: "40 小时续航，空间音频与自适应降噪。",
          price: 899,
          accent: "violet",
        }}
        onAddToCart={() => setCartCount((count) => count + 1)}
      />
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RemoteApp />
  </React.StrictMode>,
);

