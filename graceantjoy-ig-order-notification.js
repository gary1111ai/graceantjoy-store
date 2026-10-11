
(function () {
  "use strict";

  const INSTAGRAM_URL = "https://ig.me/m/graceantjoy";
  const PANEL_ID = "gj-instagram-order-panel";

  function getOrderDetails() {
    const orderInput = document.querySelector("#paymentOrder");
    const orderNumber = orderInput
      ? orderInput.value.trim()
      : "";

    let orders = [];

    try {
      orders = JSON.parse(
        localStorage.getItem("gj_orders_v2") || "[]"
      );
    } catch (error) {
      console.error("Unable to read order details:", error);
    }

    let order = null;

    if (orderNumber && Array.isArray(orders)) {
      order = orders.find(function (item) {
        return String(
          item.id || item.order_number || ""
        ) === orderNumber;
      });
    }

    const items = order
      ? order.items || order.products || []
      : [];

    const lines = [];

    lines.push("Hello Graceantjoy! I have uploaded my payment proof.");
    lines.push("");
    lines.push("Order Number: " + (orderNumber || "Please confirm my order"));

    if (items.length > 0) {
      lines.push("");
      lines.push("Order Details:");

      items.forEach(function (item, index) {
        lines.push((index + 1) + ". " + [
          "Style Code: " + (
            item.product_code ||
            item.style_code ||
            "-"
          ),
          "Product: " + (
            item.product_name ||
            item.name ||
            "-"
          ),
          "Phone Model: " + (
            item.phone_model ||
            item.model ||
            "-"
          ),
          "Quantity: " + (
            item.quantity ||
            item.qty ||
            1
          )
        ].join(" | "));
      });
    }

    lines.push("");
    lines.push("Please help me confirm my order. Thank you!");

    return lines.join("\n");
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID)) {
      return;
    }

    const panel = document.createElement("div");
    panel.id = PANEL_ID;

    panel.style.cssText = [
      "margin:16px 0",
      "padding:16px",
      "border:1px solid #d4af37",
      "border-radius:12px",
      "background:#fffdf7",
      "color:#222",
      "font-family:Arial,sans-serif"
    ].join(";");

    const title = document.createElement("div");
    title.textContent = "Payment proof uploaded successfully";
    title.style.cssText =
      "font-size:16px;font-weight:bold;margin-bottom:8px";

    const description = document.createElement("div");
    description.textContent =
      "Copy your order details, then send them to our Instagram DM.";
    description.style.cssText =
      "font-size:13px;line-height:1.6;margin-bottom:12px";

    const copyButton = createButton(
      "Copy Order Details",
      "#222",
      "#fff"
    );

    copyButton.addEventListener("click", async function () {
      const message = getOrderDetails();

      try {
        await copyText(message);
        copyButton.textContent = "Copied!";
      } catch (error) {
        window.prompt("Copy your order details:", message);
      }
    });

    const instagramButton = createButton(
      "Open Instagram DM",
      "#d4af37",
      "#111"
    );

    instagramButton.addEventListener("click", function () {
      window.open(INSTAGRAM_URL, "_blank", "noopener");
    });

    const bothButton = createButton(
      "Copy Details & Open Instagram",
      "#f2d675",
      "#111"
    );

    bothButton.addEventListener("click", async function () {
      const message = getOrderDetails();

      try {
        await copyText(message);
      } catch (error) {
        window.prompt("Copy your order details:", message);
        return;
      }

      window.open(INSTAGRAM_URL, "_blank", "noopener");
    });

    panel.appendChild(title);
    panel.appendChild(description);
    panel.appendChild(copyButton);
    panel.appendChild(instagramButton);
    panel.appendChild(bothButton);

    const status = document.querySelector(
      "#proofUploadStatus"
    );

    if (status && status.parentNode) {
      status.parentNode.insertBefore(
        panel,
        status.nextSibling
      );
    } else {
      const target =
        document.querySelector("#uploadProofBtn") ||
        document.querySelector("button[type='submit']");

      if (target && target.parentNode) {
        target.parentNode.insertBefore(
          panel,
          target.nextSibling
        );
      } else {
        document.body.appendChild(panel);
      }
    }
  }

  function createButton(text, background, color) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;

    button.style.cssText = [
      "display:block",
      "width:100%",
      "margin:8px 0",
      "padding:12px",
      "border:none",
      "border-radius:8px",
      "font-size:14px",
      "font-weight:bold",
      "cursor:pointer",
      "background:" + background,
      "color:" + color
    ].join(";");

    return button;
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);
    textarea.select();

    const successful = document.execCommand("copy");
    textarea.remove();

    if (!successful) {
      throw new Error("Copy failed");
    }
  }

  function checkUploadStatus() {
    const status = document.querySelector(
      "#proofUploadStatus"
    );

    const uploadButton = document.querySelector(
      "#uploadProofBtn"
    );

    const statusText = status
      ? status.textContent.toLowerCase()
      : "";

    const buttonText = uploadButton
      ? uploadButton.textContent.toLowerCase()
      : "";

    const success =
      statusText.includes("uploaded") ||
      statusText.includes("upload successful") ||
      statusText.includes("凭证已上传") ||
      statusText.includes("上传成功") ||
      buttonText.includes("uploaded") ||
      buttonText.includes("已上传");

    if (success) {
      createPanel();
    }
  }

  function init() {
    checkUploadStatus();

    const observer = new MutationObserver(function () {
      checkUploadStatus();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
