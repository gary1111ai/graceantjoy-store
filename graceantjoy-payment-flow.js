
/* Graceantjoy Payment Flow
   Single upload handler for payment receipts.
   Storage upload has a timeout; database save runs in background.
*/
(function () {
  "use strict";

  const SUPABASE_URL = "https://udpjnirtmuzmiwmgelua.supabase.co";
  const SUPABASE_KEY = "sb_publishable_IpMDj4zQ9B3GuMW4JAH0SA_MgqdDC0G";
  const BUCKET = "payment-proofs";
  const MAX_BYTES = 5 * 1024 * 1024;
  const INSTAGRAM_URL = "https://ig.me/m/graceantjoy";

  let busy = false;
  const $ = id => document.getElementById(id);

  function isChinese() {
    try {
      return localStorage.getItem("gj_lang_v1") === "zh";
    } catch (_) {
      return document.documentElement.lang === "zh-CN";
    }
  }

  function tr(zh, en) {
    return isChinese() ? zh : en;
  }

  function setStatus(message, color) {
    const node = $("proofUploadStatus");
    if (!node) return;
    node.textContent = message;
    node.style.color = color || "#625b50";
  }

  function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(
          label + " timed out after " +
          Math.round(ms / 1000) +
          " seconds. Please check your connection and retry."
        ));
      }, ms);

      Promise.resolve(promise).then(
        value => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(value);
        },
        error => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }

  function buildOrderMessage(orderNo, storagePath) {
    const lines = [
      "Graceantjoy Order Details",
      "Order No: " + orderNo
    ];

    const allOrders = Array.isArray(window.orders)
      ? window.orders
      : [];

    const order = allOrders.find(item =>
      String(item.order_number || item.id || "") === String(orderNo)
    );

    if (order) {
      lines.push(
        "Name: " + (order.name || order.customer_name || "-"),
        "Phone: " + (order.phone || "-"),
        "Address: " + (order.address || order.delivery_address || "-"),
        ""
      );

      (Array.isArray(order.items) ? order.items : []).forEach((item, i) => {
        lines.push(
          "Product " + (i + 1) + ": " +
            (item.product_name || item.name || "Phone Case"),
          "Style Code: " +
            (item.product_code || item.style_code || "-"),
          "Phone Model: " +
            (item.phone_model || item.model || "-"),
          "Quantity: " + Number(item.quantity || item.qty || 0),
          ""
        );
      });

      lines.push(
        "Subtotal: RM " + Number(order.subtotal || 0).toFixed(2),
        "Shipping: RM " + Number(order.shipping_fee || 0).toFixed(2),
        "Total: RM " + Number(order.total || 0).toFixed(2)
      );
    } else if ($("paymentTotal")) {
      lines.push("Total: " + $("paymentTotal").textContent);
    }

    lines.push("Payment proof path: " + storagePath);
    return lines.join("\n");
  }

  function showConfirmation(orderNo, storagePath) {
    const previous = $("gj-payment-confirmation");
    if (previous) previous.remove();

    const panel = document.createElement("section");
    panel.id = "gj-payment-confirmation";
    panel.style.cssText =
      "margin-top:16px;padding:16px;border:1px solid #eedde3;" +
      "border-radius:14px;background:#fff5f7;color:#30272b;";

    const heading = document.createElement("h3");
    heading.textContent = tr("订单资料 ♡", "Order Details ♡");

    const note = document.createElement("p");
    note.textContent = tr(
      "请复制以下资料，然后打开 Instagram 私信发送给我们。",
      "Copy the details below, then open Instagram DM and send them to us."
    );

    const message = buildOrderMessage(orderNo, storagePath);

    const preview = document.createElement("pre");
    preview.textContent = message;
    preview.style.cssText =
      "white-space:pre-wrap;overflow-wrap:anywhere;padding:12px;" +
      "background:#fff;border:1px solid #eedde3;border-radius:9px;" +
      "font:12px/1.7 Arial,sans-serif;";

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "primary";
    copy.textContent = tr("复制订单资料", "Copy Order Details");
    copy.style.cssText = "width:100%;margin:8px 0;";

    copy.addEventListener("click", async function () {
      try {
        await navigator.clipboard.writeText(message);
        copy.textContent = tr("已复制 ✓", "Copied ✓");
      } catch (_) {
        const area = document.createElement("textarea");
        area.value = message;
        area.style.cssText = "width:100%;min-height:180px;";
        panel.insertBefore(area, dm);
        area.focus();
        area.select();
        copy.textContent = tr(
          "请手动复制资料",
          "Select and copy the details"
        );
      }
    });

    const dm = document.createElement("a");
    dm.href = INSTAGRAM_URL;
    dm.target = "_blank";
    dm.rel = "noopener noreferrer";
    dm.className = "primary";
    dm.textContent = tr(
      "前往 Instagram 私信发送订单 →",
      "Open Instagram DM →"
    );
    dm.style.cssText =
      "display:block;width:100%;box-sizing:border-box;" +
      "text-align:center;text-decoration:none;margin-top:8px;";

    panel.append(heading, note, preview, copy, dm);

    const statusNode = $("proofUploadStatus");
    if (statusNode && statusNode.parentNode) {
      statusNode.parentNode.appendChild(panel);
    } else {
      const button = $("uploadProofBtn");
      if (button && button.parentNode) {
        button.parentNode.appendChild(panel);
      }
    }
  }

  async function uploadReceipt() {
    const button = $("uploadProofBtn");
    const input = $("paymentProofFile");
    const file = input && input.files && input.files[0];
    const orderNo = window.currentOrderNumber || "";
    const proofToken = window.currentProofToken || "";

    if (busy) return;

    if (!file) {
      setStatus(tr(
        "请先选择付款凭证图片。",
        "Please choose a payment receipt image."
      ));
      return;
    }

    if (!/^image\/(jpeg|png|webp)$/.test(file.type) ||
        file.size > MAX_BYTES) {
      setStatus(tr(
        "请上传 5MB 以内的 JPG、PNG 或 WebP 图片。",
        "Please upload a JPG, PNG or WebP image under 5MB."
      ), "#b42318");
      return;
    }

    if (!orderNo || !proofToken) {
      setStatus(tr(
        "找不到订单编号。请刷新页面并重新下单。",
        "Order session not found. Refresh the page and place the order again."
      ), "#b42318");
      return;
    }

    if (!window.supabase ||
        typeof window.supabase.createClient !== "function") {
      setStatus(tr(
        "Supabase 未加载，请刷新页面后重试。",
        "Supabase did not load. Refresh the page and retry."
      ), "#b42318");
      return;
    }

    busy = true;

    if (button) {
      button.disabled = true;
      button.textContent = tr("正在上传…", "Uploading…");
    }

    setStatus(tr(
      "正在上传图片，请稍候…",
      "Uploading image, please wait…"
    ));

    try {
      const db = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );

      const ext = file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";

      const uuid = window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : Date.now() + "-" + Math.random().toString(36).slice(2);

      const path = proofToken + "/" + uuid + "." + ext;

      const result = await withTimeout(
        db.storage.from(BUCKET).upload(path, file, {
          upsert: false,
          contentType: file.type
        }),
        30000,
        "Storage upload"
      );

      if (result && result.error) {
        throw result.error;
      }

      setStatus(tr(
        "图片已上传成功！正在显示订单资料…",
        "Image uploaded successfully. Preparing order details…"
      ), "#207245");

      // Save the proof record in the background.
      // Do not let a slow database request block the confirmation UI.
      withTimeout(
        db.rpc("save_payment_proof", {
          p_order_number: orderNo,
          p_proof_token: proofToken,
          p_storage_path: path
        }),
        15000,
        "Payment proof record save"
      ).then(saved => {
        if (saved && saved.error) {
          console.error("save_payment_proof error:", saved.error);
        }
      }).catch(error => {
        console.error("save_payment_proof error:", error);
      });

      showConfirmation(orderNo, path);

      setStatus(tr(
        "付款凭证已上传！请复制订单资料发送给我们。订单编号：",
        "Payment proof uploaded! Copy your order details and send them to us. Order: "
      ) + orderNo, "#207245");

      if (button) {
        button.textContent = tr("已上传 ✓", "Uploaded ✓");
        button.disabled = true;
      }

      if (input) input.value = "";

    } catch (error) {
      console.error("Payment proof upload error:", error);

      setStatus(
        tr("上传失败：", "Upload failed: ") +
        (error && error.message ? error.message : "Unknown error"),
        "#b42318"
      );

      if (button) {
        button.disabled = false;
        button.textContent = tr(
          "重新上传凭证",
          "Retry Upload"
        );
      }
    } finally {
      busy = false;
    }
  }

  function init() {
    const button = $("uploadProofBtn");

    if (!button ||
        button.dataset.singlePaymentFlowBound === "true") {
      return;
    }

    button.dataset.singlePaymentFlowBound = "true";

    // The only real upload handler.
    button.addEventListener("click", function (event) {
      event.preventDefault();
      uploadReceipt();
    });

    const input = $("paymentProofFile");

    if (input) {
      input.addEventListener("change", function () {
        if (input.files && input.files[0]) {
          button.disabled = false;
          button.textContent = tr(
            "上传付款凭证",
            "Upload Payment Receipt"
          );
          setStatus("");
        }
      });
    }
  }

  // The script is loaded at the end of the storefront HTML.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
