
/* Graceantjoy customer order lookup
   Requires supabase-lookup-customer-order.sql
*/
(function () {
  "use strict";

  const SUPABASE_URL =
    "https://udpjnirtmuzmiwmgelua.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_IpMDj4zQ9B3GuMW4JAH0SA_MgqdDC0G";

  const RPC_URL =
    SUPABASE_URL + "/rest/v1/rpc/lookup_customer_order";

  const MODAL_ID = "gj-my-orders-modal";
  const STYLE_ID = "gj-my-orders-style";

  const labels = {
    en: {
      button: "My Orders",
      title: "Track Your Order",
      intro: "Enter your order number and checkout phone number.",
      order: "Order Number",
      phone: "Phone Number Used at Checkout",
      search: "Find My Order",
      close: "Close",
      required: "Please enter both your order number and phone number.",
      loading: "Searching for your order...",
      notFound: "No matching order found. Please check your details.",
      error: "Unable to check your order. Please try again later.",
      details: "Order Details",
      date: "Order Date",
      payment: "Payment Status",
      fulfilment: "Order Status",
      subtotal: "Subtotal",
      shipping: "Shipping",
      total: "Order Total",
      item: "Item",
      model: "iPhone Model",
      code: "Style Code",
      qty: "Quantity",
      noItems: "Item details are unavailable.",
      unpaid: "Unpaid",
      awaiting_verification: "Awaiting Payment Verification",
      paid: "Paid",
      refunded: "Refunded",
      pending_payment: "Pending Payment",
      processing: "Processing",
      shipped: "Shipped",
      completed: "Completed",
      cancelled: "Cancelled",
      privacy: "Keep your order number and phone number private."
    },
    zh: {
      button: "我的订单",
      title: "查询我的订单",
      intro: "请输入订单编号，以及下单时填写的手机号码。",
      order: "订单编号",
      phone: "下单时填写的手机号码",
      search: "查询订单",
      close: "关闭",
      required: "请填写订单编号和手机号码。",
      loading: "正在查询订单……",
      notFound: "找不到符合资料的订单，请检查订单编号和手机号码。",
      error: "暂时无法查询订单，请稍后再试。",
      details: "订单详情",
      date: "下单日期",
      payment: "付款状态",
      fulfilment: "订单状态",
      subtotal: "商品小计",
      shipping: "运费",
      total: "订单总额",
      item: "商品",
      model: "iPhone 型号",
      code: "款式编号",
      qty: "数量",
      noItems: "暂时无法显示商品详情。",
      unpaid: "未付款",
      awaiting_verification: "等待核实付款",
      paid: "已付款",
      refunded: "已退款",
      pending_payment: "等待付款",
      processing: "处理中",
      shipped: "已发货",
      completed: "已完成",
      cancelled: "已取消",
      privacy: "请妥善保管订单编号和手机号码，不要公开分享。"
    }
  };

  function currentLang() {
    try {
      return localStorage.getItem("gj_lang_v1") === "zh"
        ? "zh"
        : "en";
    } catch (_) {
      return "en";
    }
  }

  function t(key) {
    return labels[currentLang()][key] || key;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);

    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);

    return node;
  }

  function money(value) {
    const n = Number(value);
    return "RM " + (Number.isFinite(n) ? n : 0).toFixed(2);
  }

  function prettyStatus(value) {
    const key = String(value || "").toLowerCase();
    return t(key) === key ? (value || "-") : t(key);
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = el("style");
    style.id = STYLE_ID;

    style.textContent = `
      #gj-my-orders-button {
        margin-left: 8px;
      }

      #${MODAL_ID} {
        position: fixed;
        inset: 0;
        z-index: 10020;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 14px;
        background: rgba(35,20,28,.62);
      }

      #${MODAL_ID}.open {
        display: flex;
      }

      #${MODAL_ID} * {
        box-sizing: border-box;
      }

      #${MODAL_ID} .gj-mo-card {
        width: min(100%, 520px);
        max-height: 90vh;
        overflow: auto;
        background: #fffdfd;
        border: 1px solid #eedde3;
        border-radius: 18px;
        padding: 22px;
        color: #30272b;
        box-shadow: 0 20px 70px #0003;
      }

      #${MODAL_ID} .gj-mo-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }

      #${MODAL_ID} h2 {
        font: 26px Georgia, serif;
        margin: 0 0 8px;
      }

      #${MODAL_ID} .gj-mo-muted {
        font-size: 12px;
        line-height: 1.6;
        color: #897980;
      }

      #${MODAL_ID} label {
        display: block;
        font-size: 12px;
        margin: 13px 0 6px;
        color: #6f5c64;
      }

      #${MODAL_ID} input {
        width: 100%;
        padding: 12px;
        border: 1px solid #eedde3;
        border-radius: 10px;
        background: white;
        color: #30272b;
      }

      #${MODAL_ID} .gj-mo-btn {
        border: 0;
        border-radius: 10px;
        padding: 12px 15px;
        font-weight: 700;
        cursor: pointer;
      }

      #${MODAL_ID} .gj-mo-primary {
        background: #9d526d;
        color: #fff;
        width: 100%;
        margin-top: 14px;
      }

      #${MODAL_ID} .gj-mo-close {
        background: #f7e8ed;
        color: #9d526d;
        white-space: nowrap;
      }

      #${MODAL_ID} .gj-mo-status {
        margin-top: 13px;
        padding: 11px;
        border-radius: 10px;
        background: #fff5f7;
        color: #7c4057;
        font-size: 12px;
        line-height: 1.6;
        white-space: pre-wrap;
      }

      #${MODAL_ID} .gj-mo-result {
        margin-top: 14px;
      }

      #${MODAL_ID} .gj-mo-panel {
        border: 1px solid #eedde3;
        border-radius: 12px;
        padding: 13px;
        margin-top: 10px;
      }

      #${MODAL_ID} .gj-mo-line {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        padding: 7px 0;
        border-bottom: 1px solid #f3e8ec;
        font-size: 12px;
      }

      #${MODAL_ID} .gj-mo-line:last-child {
        border-bottom: 0;
      }

      #${MODAL_ID} .gj-mo-line strong {
        text-align: right;
        overflow-wrap: anywhere;
      }

      #${MODAL_ID} .gj-mo-item {
        padding: 10px 0;
        border-bottom: 1px solid #f3e8ec;
        font-size: 12px;
        line-height: 1.7;
      }

      #${MODAL_ID} .gj-mo-item:last-child {
        border-bottom: 0;
      }

      #${MODAL_ID} .gj-mo-total {
        font-size: 16px;
        color: #9d526d;
        font-weight: 800;
      }

      @media(max-width:480px) {
        #${MODAL_ID} .gj-mo-card {
          padding: 16px;
        }

        #${MODAL_ID} h2 {
          font-size: 23px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function makeLine(parent, label, value, isTotal) {
    const row = el(
      "div",
      "gj-mo-line" + (isTotal ? " gj-mo-total" : "")
    );

    row.append(
      el("span", "", label),
      el("strong", "", value)
    );

    parent.appendChild(row);
  }

  function renderOrder(result, target) {
    target.replaceChildren();

    target.appendChild(el("h3", "", t("details")));

    const panel = el("div", "gj-mo-panel");

    if (result.created_at) {
      const d = new Date(result.created_at);

      makeLine(
        panel,
        t("date"),
        Number.isNaN(d.getTime())
          ? result.created_at
          : d.toLocaleString()
      );
    }

    makeLine(panel, t("order"), result.order_number || "-");
    makeLine(panel, t("payment"), prettyStatus(result.payment_status));
    makeLine(panel, t("fulfilment"), prettyStatus(result.order_status));

    target.appendChild(panel);

    const itemPanel = el("div", "gj-mo-panel");
    const items = Array.isArray(result.items) ? result.items : [];

    if (!items.length) {
      itemPanel.appendChild(
        el("div", "gj-mo-muted", t("noItems"))
      );
    } else {
      items.forEach(function (item) {
        const box = el("div", "gj-mo-item");

        box.appendChild(
          el("strong", "", item.product_name || item.name || t("item"))
        );

        const code =
          item.product_code ||
          item.style_code ||
          "";

        if (code) {
          box.appendChild(
            el("div", "gj-mo-muted", t("code") + ": " + code)
          );
        }

        box.appendChild(
          el(
            "div",
            "gj-mo-muted",
            t("model") + ": " + (item.phone_model || item.model || "-")
          )
        );

        box.appendChild(
          el(
            "div",
            "gj-mo-muted",
            t("qty") + ": " + (item.quantity || item.qty || 1)
          )
        );

        itemPanel.appendChild(box);
      });
    }

    target.appendChild(itemPanel);

    const totals = el("div", "gj-mo-panel");

    makeLine(totals, t("subtotal"), money(result.subtotal));
    makeLine(totals, t("shipping"), money(result.shipping_fee));
    makeLine(totals, t("total"), money(result.total), true);

    target.appendChild(totals);
  }

  function openModal() {
    let modal = document.getElementById(MODAL_ID);

    if (!modal) {
      modal = el("div");
      modal.id = MODAL_ID;

      const card = el("section", "gj-mo-card");
      card.setAttribute("role", "dialog");
      card.setAttribute("aria-modal", "true");
      card.setAttribute("aria-labelledby", "gj-mo-title");

      const head = el("div", "gj-mo-head");
      const title = el("h2", "", t("title"));
      title.id = "gj-mo-title";

      head.appendChild(title);

      const close = el("button", "gj-mo-btn gj-mo-close", "×");
      close.type = "button";
      close.setAttribute("aria-label", t("close"));

      close.addEventListener("click", function () {
        modal.classList.remove("open");
      });

      head.appendChild(close);

      const intro = el("p", "gj-mo-muted", t("intro"));
      const form = el("form");

      const orderLabel = el("label", "", t("order"));
      const orderInput = el("input");
      orderInput.name = "order_number";
      orderInput.autocomplete = "off";
      orderInput.required = true;
      orderInput.maxLength = 80;
      orderInput.placeholder = "GJ-XXXXXXXXXX";
      orderLabel.appendChild(orderInput);

      const phoneLabel = el("label", "", t("phone"));
      const phoneInput = el("input");
      phoneInput.name = "phone";
      phoneInput.type = "tel";
      phoneInput.autocomplete = "tel";
      phoneInput.required = true;
      phoneInput.maxLength = 40;
      phoneLabel.appendChild(phoneInput);

      const submit = el("button", "gj-mo-btn gj-mo-primary", t("search"));
      submit.type = "submit";

      const status = el("div", "gj-mo-status");
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.hidden = true;

      const result = el("div", "gj-mo-result");

      form.append(orderLabel, phoneLabel, submit);

      form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const orderNumber = orderInput.value.trim();
        const phone = phoneInput.value.trim();

        result.replaceChildren();
        status.hidden = false;

        if (!orderNumber || !phone) {
          status.textContent = t("required");
          return;
        }

        status.textContent = t("loading");
        submit.disabled = true;

        try {
          const response = await fetch(RPC_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": SUPABASE_KEY,
              "Authorization": "Bearer " + SUPABASE_KEY
            },
            body: JSON.stringify({
              p_order_number: orderNumber,
              p_phone: phone
            })
          });

          if (!response.ok) {
            const detail = await response.text();
            console.error(
              "Order lookup failed:",
              response.status,
              detail
            );
            throw new Error("RPC request failed");
          }

          const data = await response.json();

          if (!data || !data.order_number) {
            status.textContent = t("notFound");
            return;
          }

          status.hidden = true;
          renderOrder(data, result);

        } catch (error) {
          console.error("Graceantjoy order lookup error:", error);
          status.textContent = t("error");
        } finally {
          submit.disabled = false;
        }
      });

      card.append(
        head,
        intro,
        form,
        status,
        result,
        el("p", "gj-mo-muted", t("privacy"))
      );

      modal.appendChild(card);

      modal.addEventListener("click", function (event) {
        if (event.target === modal) {
          modal.classList.remove("open");
        }
      });

      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          modal.classList.remove("open");
        }
      });

      document.body.appendChild(modal);
    }

    modal.classList.add("open");

    const input = modal.querySelector('input[name="order_number"]');
    if (input) input.focus();
  }

  function init() {
    addStyles();

    const headerActions =
      document.querySelector(".header > div:last-child");

    if (!headerActions || document.getElementById("gj-my-orders-button")) {
      return;
    }

    const button = el("button", "btn", t("button"));
    button.id = "gj-my-orders-button";
    button.type = "button";
    button.addEventListener("click", openModal);

    const cartButton = document.getElementById("cartOpen");

    if (cartButton) {
      headerActions.insertBefore(button, cartButton);
    } else {
      headerActions.appendChild(button);
    }

    const langToggle = document.getElementById("languageToggle");

    if (langToggle) {
      langToggle.addEventListener("click", function () {
        setTimeout(function () {
          button.textContent = t("button");
        }, 0);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
