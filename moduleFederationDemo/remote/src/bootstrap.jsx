import { createRoot } from "react-dom/client";
import ProductCard from "./ProductCard";
import "./standalone.css";

function StandaloneApp() {
  return (
    <main className="remote-page">
      <div className="remote-intro">
        <span>REMOTE · 独立运行模式</span>
        <h1>商品模块</h1>
        <p>这个应用既能独立开发，也能由 Host 在运行时加载。</p>
      </div>
      <ProductCard name="Federation Keyboard" price={699} />
    </main>
  );
}

createRoot(document.getElementById("root")).render(<StandaloneApp />);
