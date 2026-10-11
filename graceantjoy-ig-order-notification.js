(function () {
  "use strict";

  const INSTAGRAM_URL = "https://ig.me/m/graceantjoy";
  const PANEL_ID = "gj-instagram-order-panel";
  const STYLE_ID = "gj-order-panel-style";

  let observer = null;
  let retryTimer = null;

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
      "Order Number: " + (
        data.orderNumber || "Please help me identify my order"
      )
    ];

    if (items.length) {
      lines.push("");

      items.forEach(function (item, index) {
        lines.push((index + 1) + ". " + (
          item.product_name || item.name || item.title || "Phone Case"
        ));
        lines.push("   Style Code: " + (
          item.product_code ||
          item.style_code ||
          item.product_id ||
          item.sku ||
          "-"
        ));
        lines.push("   iPhone Model: " + (
          item.phone_model || item.model || item.iphone_model || "-"
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
      "Shipping: RM " + money(
        order.shipping_fee != null
          ? order.shipping_fee
          : order.shipping
      ),
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
        display: block;
        box-sizing: border-box;
        width: 100%;
        margin: 16px 0;
        padding: 18px;
        border: 1px solid #d4af37;
        border-radius: 14px;
        background: #fffdf7;
        color: #211d16;
        font-family: Arial, sans-serif;
        line-height: 1.5;
        position: relative;
        z-index: 5;
      }

      #${PANEL_ID} * {
        box-sizing: border-box;
      }

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

      #${PANEL_ID} .gj-item:last-child {
        border-bottom: 0;
      }

      #${PANEL_ID} .gj-item-name {
        font-weight: 700;
        font-size: 14px;
        margin-bottom: 4px;
      }

      #${PANEL_ID} .gj-muted {
        color: #625b50;
      }

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
        white-space: normal;
      }

      #${PANEL_ID} .gj-copy {
        background: #211d16;
        color: #fff;
      }

      #${PANEL_ID} .gj-ig {
        background: #d4af37;
        color: #211d16;
      }

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
    if (!summary) return;

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
        name.textContent =
          item.product_name || item.name || item.title || "Phone Case";

        const code = document.createElement("div");
        code.className = "gj-muted";
        code.textContent = "Style Code: " + (
          item.product_code ||
          item.style_code ||
          item.product_id ||
          item.sku ||
          "-"
        );

        const model = document.createElement("div");
        model.className = "gj-muted";
        model.textContent = "iPhone Model: " + (
          item.phone_model || item.model || item.iphone_model || "-"
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

  function placePanel(panel) {
    // 优先放在付款窗口内，避免插入上传控件内部。
    const paymentCard = document.querySelector(
      "#paymentOverlay .pay-card"
    );

    if (paymentCard) {
      paymentCard.appendChild(panel);
      return;
    }

    const status = document.querySelector("#proofUploadStatus");

    if (status && status.parentNode) {
      status.parentNode.insertBefore(panel, status.nextSibling);
      return;
    }

    const uploadButton = document.querySelector("#uploadProofBtn");

    if (uploadButton && uploadButton.parentNode) {
      uploadButton.parentNode.insertBefore(
        panel,
        uploadButton.nextSibling
      );
      return;
    }

    document.body.appendChild(panel);
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
    title.textContent =
      "Payment Proof Upload Successful!｜付款凭证上传成功！";

    const intro = document.createElement("div");
    intro.textContent =
      "Your order details are shown below. Please copy them and send them to us on Instagram DM so we can confirm your order.｜请复制以下订单资料，并发送到我们的 Instagram 私信，以便我们确认订单。";

    const alert = document.createElement("div");
    alert.className = "gj-alert";
    alert.textContent =
      "IMPORTANT｜重要：1. Tap “Copy Order Details” to copy your order.｜点击复制订单资料。 2. Tap “Go to Instagram DM”.｜点击前往 Instagram 私信。 3. Paste the details into our chat and press Send.｜在聊天框粘贴资料并按发送。 Please make sure you send the message.｜请务必发送消息。";

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
      "After copying, open Instagram DM, paste the details and press Send.｜复制后，请前往 Instagram 私信，粘贴资料并发送。";

    const manualArea = document.createElement("textarea");
    manualArea.className = "gj-copy-area";
    manualArea.readOnly = true;
    manualArea.setAttribute(
      "aria-label",
      "Order details to copy manually"
    );

    copyButton.addEventListener("click", async function () {
      const message = getOrderMessage();

      try {
        await copyText(message);
        copyButton.textContent =
          "Copied!｜已复制 ✓";
        manualArea.style.display = "none";
        note.textContent =
          "Copied successfully. Open Instagram DM, paste the message, and press Send.｜复制成功，请前往 Instagram 私信粘贴并发送。";
      } catch (error) {
        manualArea.value = message;
        manualArea.style.display = "block";
        manualArea.focus();
        manualArea.select();

        copyButton.textContent =
          "Select the text below to copy｜请手动复制下方资料";
        note.textContent =
          "Automatic copy was blocked. Select and copy the text below, then paste it in Instagram DM.｜自动复制未成功，请手动复制下方资料，再粘贴到 Instagram 私信。";
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

    placePanel(panel);
    renderOrderSummary(panel);
  }

  function checkUploadStatus() {
    const status = document.querySelector("#proofUploadStatus");
    const uploadButton = document.querySelector("#uploadProofBtn");

    const statusText = status
      ? String(status.textContent || "").trim().toLowerCase()
      : "";

    const buttonText = uploadButton
      ? String(uploadButton.textContent || "").trim().toLowerCase()
      : "";

    const success =
      /receipt uploaded|upload\s*success|uploaded successfully|successfully uploaded|凭证已上传|已上传凭证|上传成功/.test(statusText) ||
      /^(uploaded|已上传)(\s|✓|$)/.test(buttonText) ||
      /uploaded/.test(buttonText) ||
      /已上传/.test(buttonText);

    if (success) {
      createPanel();
    }
  }

  function startRetryCheck() {
    if (retryTimer) {
      window.clearInterval(retryTimer);
    }

    let attempts = 0;

    retryTimer = window.setInterval(function () {
      checkUploadStatus();
      attempts++;

      if (
        document.getElementById(PANEL_ID) ||
        attempts >= 40
      ) {
        window.clearInterval(retryTimer);
        retryTimer = null;
      }
    }, 500);
  }

  function init() {
    checkUploadStatus();

    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver(function () {
      checkUploadStatus();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });

    // 顾客点击上传凭证后，额外检查上传结果，避免状态更新延迟。
    document.addEventListener("click", function (event) {
      const target = event.target;

      if (
        target &&
        typeof target.closest === "function" &&
        target.closest("#uploadProofBtn")
      ) {
        startRetryCheck();
      }
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
