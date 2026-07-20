import "./product-card.css";

export default function ProductCard({ product, onAddToCart }) {
  const { name, description, price, accent = "violet" } = product;

  return (
    <article className="product-card">
      <div className={`product-visual product-visual--${accent}`}>
        <span className="product-orbit" />
        <div className="headphones" aria-hidden="true">
          <span />
          <i />
          <b />
        </div>
        <span className="source-label">Rendered by Remote</span>
      </div>

      <div className="product-content">
        <span className="product-kicker">AUDIO / NEW RELEASE</span>
        <h3>{name}</h3>
        <p>{description}</p>
        <div className="product-meta">
          <div>
            <small>会员价</small>
            <strong>¥{price}</strong>
          </div>
          <button type="button" onClick={onAddToCart}>
            加入购物车
          </button>
        </div>
      </div>
    </article>
  );
}

