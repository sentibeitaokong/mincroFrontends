import { useState } from "react";
import "./product-card.css";

export default function ProductCard({
  name = "Federation Keyboard",
  price = 699,
  onAddToCart
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <article className="product-card">
      <div className="product-visual" aria-hidden="true">
        <div className="key-row">
          <kbd>M</kbd><kbd>F</kbd><kbd>↗</kbd>
        </div>
        <span>REMOTE UI</span>
      </div>

      <div className="product-info">
        <span className="product-tag">模块联邦限定</span>
        <h3>{name}</h3>
        <p>由 Remote 暴露的 React 组件，状态在远程模块内部维护。</p>

        <div className="product-actions">
          <strong>¥{price}</strong>
          <div className="stepper" aria-label="商品数量">
            <button
              type="button"
              aria-label="减少数量"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            >−</button>
            <output>{quantity}</output>
            <button
              type="button"
              aria-label="增加数量"
              onClick={() => setQuantity((value) => value + 1)}
            >+</button>
          </div>
          <button
            className="add-button"
            type="button"
            onClick={() => onAddToCart?.(name, quantity)}
          >
            加入购物车
          </button>
        </div>
      </div>
    </article>
  );
}
