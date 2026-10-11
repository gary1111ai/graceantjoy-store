
(function () {
  "use strict";

  const IG_DM = "https://ig.me/m/graceantjoy";

  function isChinese() {
    return localStorage.getItem("gj_lang_v1") === "zh";
  }

  function text(en, zh) {
    return isChinese() ? zh : en;
  }

  function money(value) {
    return "RM " + Number(value || 0).toFixed(2);
  }

  function getOrder() {
    const number = document
      .getElementById("paymentOrder")
      ?.textContent?.trim();

    let orders = [];

    try {
      orders = JSON.parse(
        localStorage.getItem("gj_orders_v2") || "[]"
      );
    } catch (e) {}

    return orders.find(
      order => String(order.id || order.order_number) === number
    );
  }

  function getOrderDetails(order) {
    const items = Array.isArray(order.items) ? order.items : [];

    const lines = [
      "Graceantjoy Order Details",
      "Order Number: " + (order.id || order.order_number),
      ""
    ];

    items.forEach((item, index) => {
      const name = item.product_name || item.name || "Product";
      const code = item.product_code || item.style_code || "-";
      const model = item.phone_model || item.model || "-";
      const quantity = Number(item.quantity || item.qty || 0);

      const subtotal = Number(
        item.subtotal ??
        item.line_total ??
        Number(item.unit_price || 0) * quantity
      );

      lines.push(
        (index + 1) + ". " + name,
        "Product Code: " + code,
        "iPhone Model: " + model,
        "Quantity: " + quantity,
        "Item Total: " + money(subtotal),
        ""
      );
    });

    lines.push("Order Total: " + money(order.total));

    return lines.join("\n");
  }

  function addFeature() {
    const card = document.querySelector(
      "#paymentOverlay .pay-card"
    );

    if (
      !card ||
      document.getElementById("gj-done-payment-wrap")
    ) {
      return;
    }

    const style = document.createElement("style");

    style.textContent = `
      #gj-done-payment-wrap {
        margin-top: 18px;
        padding-top: 14px;
        border-top: 1px solid #eedde3;
      }

      #gj-done-payment-wrap[hidden] {
        display: none !important;
      }

      #gj-done-payment-button,
      #gj-copy-order-button,
      #gj-ig-dm-button {
        display: block;
        width: 100%;
        box-sizing: border-box;
        padding: 13px 16px;
        margin-top: 10px;
        border: 0;
        border-radius: 999px;
        font-weight: bold;
        text-align: center;
        cursor: pointer;
        font-size: 14px;
      }

      #gj-done-payment-button,
      #gj-copy-order-button {
        background: #9d526d;
        color: white;
      }

      #gj-ig-dm-button {
        background: #30272b;
        color: white;
        text-decoration: none;
      }

      #gj-order-panel {
        margin-top: 14px;
        padding: 16px;
        border: 1px solid #eedde3;
        border-radius: 14px;
        background: #fffdfd;
      }

      #gj-order-panel pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        font: 13px/1.7 Arial, sans-serif;
      }

      #gj-copy-success {
        color: #207245;
        font-weight: bold;
        line-height: 1.6;
      }

      #gj-order-warning {
        color: #9d526d;
        font-size: 13px;
        line-height: 1.7;
      }
    `;

    document.head.appendChild(style);

    const wrap = document.createElement("div");
    wrap.id = "gj-done-payment-wrap";

    // 关键：默认隐藏，付款凭证上传成功后才显示
    wrap.hidden = true;

    const done = document.createElement("button");
    done.id = "gj-done-payment-button";
    done.type = "button";
    done.textContent = text(
      "Done Payment — View Order Details",
      "已完成付款 — 查看订单资料"
    );

    const panel = document.createElement("div");
    panel.id = "gj-order-panel";
    panel.hidden = true;

    const heading = document.createElement("h3");
    heading.textContent = text(
      "Your Order Details",
      "您的订单资料"
    );
    panel.appendChild(heading);

    const intro = document.createElement("p");
    intro.textContent = text(
      "Copy the details below and send them to us on Instagram DM so we can confirm your order.",
      "请先复制以下订单资料，再前往 Instagram 私信发送给我们，以便我们核实并确认订单。"
    );
    panel.appendChild(intro);

    const details = document.createElement("pre");
    panel.appendChild(details);

    const copy = document.createElement("button");
    copy.id = "gj-copy-order-button";
    copy.type = "button";
    copy.textContent = text(
      "Copy Order Details",
      "复制订单资料"
    );
    panel.appendChild(copy);

    const success = document.createElement("p");
    success.id = "gj-copy-success";
    success.hidden = true;
    success.setAttribute("role", "status");
    success.textContent = text(
      "Copied successfully! Please paste it into our Instagram DM.",
      "复制成功！请前往我们的 Instagram 私信并粘贴发送。"
    );
    panel.appendChild(success);

    const warning = document.createElement("p");
    warning.id = "gj-order-warning";
    warning.textContent = text(
      "Important: Copy your order details first, then send them to us in Instagram DM. We need these details to confirm your order.",
      "重要：请务必先复制订单资料，再到 Instagram DM 粘贴并发送给我们。我们需要收到这些资料才能确认订单。"
    );
    panel.appendChild(warning);

    const dm = document.createElement("a");
    dm.id = "gj-ig-dm-button";
    dm.href = IG_DM;
    dm.target = "_blank";
    dm.rel = "noopener noreferrer";
    dm.textContent = text(
      "Continue to Instagram DM",
      "前往 Instagram 私信"
    );

    // 复制订单资料之前，先禁用 Instagram 跳转
    dm.style.opacity = "0.45";
    dm.style.pointerEvents = "none";

    panel.appendChild(dm);

    wrap.append(done, panel);
    card.appendChild(wrap);

    // 监听原有付款凭证上传程序的成功状态
    const proofStatus = document.getElementById(
      "proofUploadStatus"
    );

    const uploadButton = document.getElementById(
      "uploadProofBtn"
    );

    function revealAfterSuccessfulUpload() {
      const label = uploadButton?.textContent?.trim() || "";
      const color = proofStatus?.style.color || "";

      const successByButton =
        /uploaded\s*✓|已上传\s*✓/i.test(label);

      const successByColor =
        color === "#207245" ||
        color === "rgb(32, 114, 69)";

      if (successByButton || successByColor) {
        wrap.hidden = false;
      }
    }

    const observer = new MutationObserver(
      revealAfterSuccessfulUpload
    );

    if (proofStatus) {
      observer.observe(proofStatus, {
        childList: true,
        characterData: true,
        subtree: true,
        attributes: true
      });
    }

    if (uploadButton) {
      observer.observe(uploadButton, {
        childList: true,
        characterData: true,
        subtree: true,
        attributes: true
      });
    }

    // 检查是否已经上传成功
    revealAfterSuccessfulUpload();

    done.addEventListener("click", function () {
      const order = getOrder();

      if (!order) {
        alert(text(
          "Order details could not be found. Please contact us with your order number.",
          "暂时无法读取订单资料，请联系我们并提供订单编号。"
        ));
        return;
      }

      details.textContent = getOrderDetails(order);
      panel.hidden = false;
      success.hidden = true;

      copy.textContent = text(
        "Copy Order Details",
        "复制订单资料"
      );

      dm.style.opacity = "0.45";
      dm.style.pointerEvents = "none";

      panel.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    });

    copy.addEventListener("click", async function () {
      const order = getOrder();

      if (!order) {
        alert(text(
          "Order details could not be found.",
          "无法读取订单资料。"
        ));
        return;
      }

      const content = getOrderDetails(order);
      let copied = false;

      try {
        if (
          navigator.clipboard &&
          window.isSecureContext
        ) {
          await navigator.clipboard.writeText(content);
          copied = true;
        }
      } catch (e) {}

      // 备用复制方式
      if (!copied) {
        const area = document.createElement("textarea");
        area.value = content;
        area.style.position = "fixed";
        area.style.left = "-9999px";

        document.body.appendChild(area);
        area.select();

        try {
          copied = document.execCommand("copy");
        } catch (e) {}

        area.remove();
      }

      if (!copied) {
        alert(text(
          "Automatic copy failed. Please select and copy the order details manually.",
          "自动复制失败，请手动选择并复制订单资料。"
        ));
        return;
      }

      success.hidden = false;

      copy.textContent = text(
        "Copied Successfully ✓",
        "复制成功 ✓"
      );

      // 复制成功后才允许前往 Instagram
      dm.style.opacity = "1";
      dm.style.pointerEvents = "auto";
    });
  }

  function init() {
    addFeature();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
