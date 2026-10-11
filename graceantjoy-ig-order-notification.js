(function () {
  "use strict";

  const INSTAGRAM_URL = "https://ig.me/m/graceantjoy";
  const PANEL_ID = "gj-instagram-order-panel";
  const STYLE_ID = "gj-order-panel-style";

  function getCurrentOrder() {
    const orderInput = document.querySelector("#paymentOrder");
    const orderNumber = orderInput
      ? String(orderInput.value || orderInput.textContent || "").trim()
      : "";

    let orders = [];

    try {
      orders = JSON.parse(localStorage.getItem("gj_orders_v2") || "[]");
    } catch (error) {
      console.error("Unable to read order history:", error);
    }

    if (!Array.isArray(orders)) orders = [];

    const order = orders.find(function (item) {
      return orderNumber &&
        String(item.id || item.order_number || "") === orderNumber;
    }) || orders[orders.length - 1] || null;

    return {
      orderNumber: orderNumber || String(
        order && (order.id || order.order_number) || ""
      ),
      order: order
    };
  }

  function money(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(2) : "0.00";
  }

  function getOrderMessage() {
    const data = getCurrentOrder();
    const order = data.order || {};
    const items = Array.isArray(order.items)
      ? order.items
      : Array.isArray(order.products)
        ? order.products
        : [];

    const lines = [
      "Hello Graceantjoy!",
      "My payment proof has been uploaded successfully.",
      "",
      "ORDER DETAILS",
      "Order Number: " + (data.orderNumber || "Please help me identify my order")
    ];

    if (items.length) {
      lines.push("");

      items.forEach(function (item, index) {
        lines.push((index + 1) + ". " + (
          item.product_name || item.name || "Phone Case"
        ));
        lines.push("   Style Code: " + (
          item.product_code || item.style_code || item.product_id || "-"
        ));
        lines.push("   iPhone Model: " + (
          item.phone_model || item.model || "-"
        ));
        lines.push("   Quantity: " + (
          item.quantity || item.qty || 1
        ));
      });
    } else {
      lines.push("");
      lines.push("Please help me check my order items.");
    }

    lines.push(
      "",
      "Subtotal: RM " + money(order.subtotal),
      "Shipping: RM " + money(order.shipping_fee),
      "TOTAL: RM " + money(order.total),
      "",
      "Please confirm my order. Thank you!"
    );

    return lines.join("\n");
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        box-sizing: border-box;
        margin: 16px 0;
        padding: 18px;
        border: 1px solid #d4af37;
        border-radius: 14px;
        background: #fffdf7;
        color: #211d16;
        font-family: Arial, sans-serif;
        line-height: 1.5;
      }
      #${PANEL_ID} * { box-sizing: border-box; }
      #${PANEL_ID} .gj-success {
        font-size: 18px;
        font-weight: 700;
        margin: 0 0 8px;
      }
      #${PANEL_ID} .gj-alert {
        padding: 12px;
        border-radius: 9px;
        background: #fff0c2;
        border: 1px solid #e4c45e;
        margin: 12px 0;
        font-size: 13px;
        line-height: 1.6;
      }
      #${PANEL_ID} .gj-items {
        padding: 12px;
        background: #fff;
        border: 1px solid #eee2c2;
        border-radius: 10px;
        margin: 12px 0;
        font-size: 13px;
      }
      #${PANEL_ID} .gj-item {
        padding: 10px 0;
        border-bottom: 1px solid #eee;
      }
      #${PANEL_ID} .gj-item:last-child { border-bottom: 0; }
      #${PANEL_ID} .gj-item-name {
        font-weight: 700;
        font-size: 14px;
        margin-bottom: 4px;
      }
      #${PANEL_ID} .gj-muted { color: #625b50; }
      #${PANEL_ID} .gj-total {
        font-weight: 700;
        font-size: 15px;
        margin-top: 10px;
      }
      #${PANEL_ID} .gj-btn {
        display: block;
        width: 100%;
        margin: 10px 0 0;
        padding: 14px 12px;
        border: 0;
        border-radius: 9px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }
      #${PANEL_ID} .gj-copy { background: #211d16; color: #fff; }
      #${PANEL_ID} .gj-ig { background: #d4af37; color: #211d16; }
      #${PANEL_ID} .gj-note {
        font-size: 12px;
        color: #625b50;
        margin: 10px 0 0;
      }
      #${PANEL_ID} .gj-copy-area {
        display: none;
        width: 100%;
        min-height: 150px;
        margin-top: 10px;
        padding: 10px;
        border: 1px solid #d4af37;
        border-radius: 8px;
        font-size: 13px;
      }
    `;

    document.head.appendChild(style);
  }

  function createButton(label, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gj-btn " + className;
    button.textContent = label;
    return button;
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "-9999px";

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const success = document.execCommand("copy");
    textarea.remove();

    if (!success) throw new Error("Copy failed");
    return true;
  }

  function renderOrderSummary(panel) {
    const data = getCurrentOrder();
    const order = data.order || {};
    const items = Array.isArray(order.items)
      ? order.items
      : Array.isArray(order.products)
        ? order.products
        : [];

    const summary = panel.querySelector(".gj-items");
    summary.replaceChildren();

    const number = document.createElement("div");
    number.className = "gj-item-name";
    number.textContent = "Order Number: " + (
      data.orderNumber || "Not available"
    );
    summary.appendChild(number);

    if (!items.length) {
      const missing = document.createElement("p");
      missing.className = "gj-muted";
      missing.textContent =
        "Order items could not be loaded. Please contact us with your order number.";
      summary.appendChild(missing);
    } else {
      items.forEach(function (item) {
        const row = document.createElement("div");
        row.className = "gj-item";

        const name = document.createElement("div");
        name.className = "gj-item-name";
        name.textContent = item.product_name || item.name || "Phone Case";

        const code = document.createElement("div");
        code.className = "gj-muted";
        code.textContent = "Style Code: " + (
          item.product_code || item.style_code || item.product_id || "-"
        );

        const model = document.createElement("div");
        model.className = "gj-muted";
        model.textContent = "iPhone Model: " + (
          item.phone_model || item.model || "-"
        );

        const quantity = document.createElement("div");
        quantity.className = "gj-muted";
        quantity.textContent = "Quantity: " + (
          item.quantity || item.qty || 1
        );

        row.append(name, code, model, quantity);
        summary.appendChild(row);
      });
    }

    const total = document.createElement("div");
    total.className = "gj-total";
    total.textContent = "Order Total: RM " + money(order.total);
    summary.appendChild(total);
  }

  function createPanel() {
    let panel = document.getElementById(PANEL_ID);

    if (panel) {
      renderOrderSummary(panel);
      return;
    }

    addStyles();

    panel = document.createElement("section");
    panel.id = PANEL_ID;

    const title = document.createElement("p");
    title.className = "gj-success";
    title.textContent = "Payment Proof Upload Successful!";

    const intro = document.createElement("div");
    intro.textContent =
      "Your order details are shown below. Please send them to us on Instagram DM so we can confirm your order.";

    const alert = document.createElement("div");
    alert.className = "gj-alert";
    alert.textContent =
      "IMPORTANT: 1. Tap “Copy Order Details”. 2. Tap “Go to Instagram DM”. 3. In our chat, press and hold the message box, tap Paste, then press Send. Your order is not fully submitted until you send us your order details.";

    const summary = document.createElement("div");
    summary.className = "gj-items";

    const copyButton = createButton(
      "Copy Order Details｜复制订单资料",
      "gj-copy"
    );

    const instagramButton = createButton(
      "Go to Instagram DM｜前往 Instagram 私信",
      "gj-ig"
    );

    const note = document.createElement("p");
    note.className = "gj-note";
    note.textContent =
      "Remember to paste and SEND your copied order details in Instagram DM.";

    const manualArea = document.createElement("textarea");
    manualArea.className = "gj-copy-area";
    manualArea.readOnly = true;
    manualArea.setAttribute("aria-label", "Order details to copy manually");

    copyButton.addEventListener("click", async function () {
      const message = getOrderMessage();

      try {
        await copyText(message);
        copyButton.textContent = "Copied! Now open Instagram DM ✓";
        manualArea.style.display = "none";
        note.textContent =
          "Copied successfully. Tap “Go to Instagram DM”, paste the message, and press Send.";
      } catch (error) {
        manualArea.value = message;
        manualArea.style.display = "block";
        manualArea.focus();
        manualArea.select();

        copyButton.textContent = "Select the text below to copy";
        note.textContent =
          "Automatic copy was blocked. Select the text below and copy it, then open Instagram DM and paste it.";
      }
    });

    instagramButton.addEventListener("click", function () {
      window.location.href = INSTAGRAM_URL;
    });

    panel.append(
      title,
      intro,
      alert,
      summary,
      copyButton,
      instagramButton,
      note,
      manualArea
    );

    const status = document.querySelector("#proofUploadStatus");
    const target = status && status.parentNode
      ? status
      : document.querySelector("#uploadProofBtn") ||
        document.querySelector("button[type='submit']");

    if (target && target.parentNode) {
      target.parentNode.insertBefore(panel, target.nextSibling);
    } else {
      const paymentCard = document.querySelector("#paymentOverlay .pay-card");
      (paymentCard || document.body).appendChild(panel);
    }

    renderOrderSummary(panel);
  }

  function checkUploadStatus() {
    const status = document.querySelector("#proofUploadStatus");
    const uploadButton = document.querySelector("#uploadProofBtn");

    const statusText = status ? status.textContent.toLowerCase() : "";
    const buttonText = uploadButton ? uploadButton.textContent.toLowerCase() : "";

    const success =
      /upload\s*success|uploaded|successfully uploaded|凭证已上传|上传成功/.test(statusText) ||
      /uploaded|已上传/.test(buttonText);

    if (success) createPanel();
  }

  function init() {
    checkUploadStatus();

    const observer = new MutationObserver(checkUploadStatus);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
