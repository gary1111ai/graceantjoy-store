
/* Graceantjoy cart fixes: quantity controls and reliable closing */
(function () {
  const style = document.createElement("style");
  style.textContent = `
    .cart-line {
      display: grid;
      grid-template-columns: minmax(0,1fr) auto;
      gap: 12px;
      padding: 15px 0;
      border-bottom: 1px solid var(--line);
      font-size: 12px;
    }
    .cart-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 10px;
    }
    .qty-control {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--line);
      border-radius: 999px;
      overflow: hidden;
      background: white;
    }
    .qty-btn {
      width: 34px;
      height: 34px;
      border: 0;
      background: white;
      color: var(--rose-dark);
      font-size: 20px;
      cursor: pointer;
    }
    .qty-btn:disabled {
      opacity: .35;
      cursor: not-allowed;
    }
    .qty-value {
      min-width: 28px;
      text-align: center;
      font-weight: 700;
    }
    .cart-line-total {
      text-align: right;
      white-space: nowrap;
      font-weight: 700;
    }
    .close {
      flex-shrink: 0;
      position: relative;
      z-index: 25;
      cursor: pointer;
      touch-action: manipulation;
    }
    @media(max-width:380px) {
      .cart-line { gap: 7px; }
      .qty-btn { width: 30px; height: 32px; }
    }
  `;
  document.head.appendChild(style);

  // Replace the existing cart renderer.
  window.renderCart = function () {
    const count = document.getElementById("count");
    const itemsBox = document.getElementById("cartItems");
    const totalBox = document.getElementById("total");

    if (!count || !itemsBox || !totalBox) return;

    count.textContent = cart.reduce(
      (sum, item) => sum + Number(item.qty || 0), 0
    );

    itemsBox.innerHTML = cart.length
      ? cart.map((item, index) => {
          const p = products.find(product => product.id === item.id);
          if (!p) return "";

          const qty = Number(item.qty || 1);
          const stock = Number(p.stock || 0);

          return `
            <div class="cart-line">
              <div>
                <strong>${safe(p.name)}</strong>
                <small>${safe(item.model)}<br>
                  ${money(price(p))} each
                </small>
                <div class="cart-actions">
                  <div class="qty-control">
                    <button class="qty-btn" type="button"
                      data-cart-qty="minus" data-cart-index="${index}"
                      aria-label="Decrease quantity"
                      ${qty <= 1 ? "disabled" : ""}>−</button>
                    <span class="qty-value">${qty}</span>
                    <button class="qty-btn" type="button"
                      data-cart-qty="plus" data-cart-index="${index}"
                      aria-label="Increase quantity"
                      ${qty >= stock ? "disabled" : ""}>+</button>
                  </div>
                  <button class="remove" type="button"
                    data-remove="${index}">Remove</button>
                </div>
              </div>
              <div class="cart-line-total">
                ${money(price(p) * qty)}
              </div>
            </div>`;
        }).join("")
      : '<div class="empty">Your bag is waiting for something lovely ♡</div>';

    totalBox.textContent = money(cart.reduce((sum, item) => {
      const p = products.find(product => product.id === item.id);
      return sum + (p ? price(p) * Number(item.qty || 0) : 0);
    }, 0));
  };

  // Handle quantity buttons and make the drawer easier to close.
  document.addEventListener("click", function (event) {
    const closeButton = event.target.closest("[data-close]");
    if (closeButton) {
      event.preventDefault();
      event.stopPropagation();
      const overlay = document.getElementById(closeButton.dataset.close);
      if (overlay) overlay.classList.remove("open");
      return;
    }

    const overlay = event.target;
    if (overlay.classList &&
        overlay.classList.contains("overlay")) {
      overlay.classList.remove("open");
      return;
    }

    const button = event.target.closest("[data-cart-qty]");
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    const index = Number(button.dataset.cartIndex);
    const item = cart[index];
    const product = item &&
      products.find(p => p.id === item.id);

    if (!item || !product) return;

    const qty = Number(item.qty || 1);
    const stock = Number(product.stock || 0);

    if (button.dataset.cartQty === "plus") {
      if (qty >= stock) {
        alert("Not enough stock available.");
        return;
      }
      item.qty = qty + 1;
    } else {
      if (qty <= 1) return;
      item.qty = qty - 1;
    }

    save();
    window.renderCart();
  }, true);

  // Close the open drawer with the Escape key.
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      document.querySelectorAll(".overlay.open")
        .forEach(overlay => overlay.classList.remove("open"));
    }
  });
})();
