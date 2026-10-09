
/* Graceantjoy checkout recovery */
document.addEventListener("submit", async function (event) {
  const form = event.target;
  if (!form || form.id !== "checkout") return;

  event.preventDefault();
  event.stopImmediatePropagation();

  if (form.dataset.submitting === "true") return;

  if (!cart.length) {
    alert("Your bag is empty.");
    return;
  }

  if (!window.supabase) {
    alert("Order service is not ready. Please refresh and try again.");
    return;
  }

  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const phone = String(data.get("phone") || "").trim();
  const address = String(data.get("address") || "").trim();
  const payment = String(data.get("payment") || "").trim();

  if (!name || !phone || !address || !payment) {
    alert("Please complete all required fields.");
    return;
  }

  for (const item of cart) {
    const p = products.find(x => x.id === item.id);
    if (!p || Number(p.stock) < Number(item.qty)) {
      alert("Please check your product stock.");
      return;
    }
  }

  const total = Number(cart.reduce((sum, item) => {
    const p = products.find(x => x.id === item.id);
    return sum + price(p) * Number(item.qty);
  }, 0).toFixed(2));

  if (total <= 0) {
    alert("Invalid order total.");
    return;
  }

  const orderNumber = "GJ-" + Date.now().toString().slice(-10);

  const items = cart.map(item => {
    const p = products.find(x => x.id === item.id);
    return {
      product_id: item.id,
      product_name: p.name,
      model: item.model,
      quantity: Number(item.qty),
      unit_price: price(p),
      subtotal: Number((price(p) * Number(item.qty)).toFixed(2))
    };
  });

  const order = {
    order_number: orderNumber,
    customer_name: name,
    phone: phone,
    delivery_address: address,
    payment_method: payment,
    items,
    total,
    order_status: "pending_payment",
    payment_status: "unpaid"
  };

  form.dataset.submitting = "true";
  const button = form.querySelector('[type="submit"]');
  const oldText = button ? button.textContent : "";

  if (button) {
    button.disabled = true;
    button.textContent = "Submitting order...";
  }

  try {
    const db = window.supabase.createClient(
      "https://udpjnirtmuzmiwmgelua.supabase.co",
      "sb_publishable_IpMDj4zQ9B3GuMW4JAH0SA_MgqdDC0G"
    );

    const { error } = await db.from("orders").insert(order);
    if (error) throw error;

    orders.push({
      id: orderNumber,
      name,
      phone,
      address,
      payment,
      total,
      items: cart.map(item => ({ ...item })),
      created: new Date().toISOString(),
      order_status: "pending_payment",
      payment_status: "unpaid"
    });

    cart = [];
    save();
    render();
    form.reset();

    document.getElementById("cartOverlay")
      ?.classList.remove("open");

    alert(
      "Order submitted successfully! Order number: " +
      orderNumber +
      ". Please send your payment proof to Instagram @graceantjoy."
    );
  } catch (error) {
    console.error("Checkout error:", error);
    alert(
      "Order submission failed. Your cart is saved and has not been cleared. Error: " +
      (error.message || "Please try again.")
    );
  } finally {
    delete form.dataset.submitting;
    if (button) {
      button.disabled = false;
      button.textContent = oldText;
    }
  }
}, true);
