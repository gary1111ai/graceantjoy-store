
/* Graceantjoy Payment Flow V3
   Fix: avoid waiting forever for Supabase RPC.
   Upload image, show order details, provide copy + Instagram DM.
*/
(function () {
  "use strict";

  var SUPABASE_URL = "https://udpjnirtmuzmiwmgelua.supabase.co";
  var SUPABASE_KEY = "sb_publishable_IpMDj4zQ9B3GuMW4JAH0SA_MgqdDC0G";
  var BUCKET = "payment-proofs";
  var MAX_BYTES = 5 * 1024 * 1024;
  var INSTAGRAM_URL = "https://ig.me/m/graceantjoy";
  var busy = false;

  function $(id) {
    return document.getElementById(id);
  }

  function isZh() {
    try {
      return localStorage.getItem("gj_lang_v1") === "zh";
    } catch (_) {
      return document.documentElement.lang === "zh-CN";
    }
  }

  function tr(zh, en) {
    return isZh() ? zh : en;
  }

  function status(message, color) {
    var node = $("proofUploadStatus");
    if (!node) return;
    node.textContent = message;
    node.style.color = color || "#625b50";
  }

  function withTimeout(promise, seconds, label) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error(label + " timed out after " + seconds + " seconds."));
      }, seconds * 1000);

      Promise.resolve(promise).then(function (result) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      }, function (error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  function orderMessage(orderNo, storagePath) {
    var lines = [
      "Graceantjoy Order Details",
      "Order No: " + orderNo
    ];

    var list = Array.isArray(window.orders) ? window.orders : [];
    var order = list.find(function (item) {
      return String(item.order_number || item.id || "") === String(orderNo);
    });

    if (order) {
      lines.push("Name: " + (order.name || order.customer_name || "-"));
      lines.push("Phone: " + (order.phone || "-"));
      lines.push("Address: " + (order.address || order.delivery_address || "-"));
      lines.push("");

      (Array.isArray(order.items) ? order.items : []).forEach(function (item, i) {
        lines.push(
          "Product " + (i + 1) + ": " + (item.product_name || item.name || "Phone Case"),
          "Style Code: " + (item.product_code || item.style_code || "-"),
          "Phone Model: " + (item.phone_model || item.model || "-"),
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
    var old = $("gj-payment-v3-confirmation");
    if (old) old.remove();

    var panel = document.createElement("section");
    panel.id = "gj-payment-v3-confirmation";
    panel.style.cssText =
      "margin-top:16px;padding:16px;border:1px solid #eedde3;" +
      "border-radius:14px;background:#fff5f7;color:#30272b;";

    var heading = document.createElement("h3");
    heading.textContent = tr("订单资料 ♡", "Order Details ♡");

    var note = document.createElement("p");
    note.textContent = tr(
      "请复制订单资料，然后打开 Instagram 私信发送给我们。",
      "Copy your order details, then open Instagram DM and send them to us."
    );

    var message = orderMessage(orderNo, storagePath);
    var preview = document.createElement("pre");
    preview.textContent = message;
    preview.style.cssText =
      "white-space:pre-wrap;overflow-wrap:anywhere;padding:12px;" +
      "background:#fff;border:1px solid #eedde3;border-radius:9px;";

    var copy = document.createElement("button");
    copy.type = "button";
    copy.className = "primary";
    copy.textContent = tr("复制订单资料", "Copy Order Details");
    copy.style.cssText = "width:100%;margin:8px 0;";

    copy.onclick = async function () {
      try {
        await navigator.clipboard.writeText(message);
        copy.textContent = tr("已复制 ✓", "Copied ✓");
      } catch (error) {
        var area = document.createElement("textarea");
        area.value = message;
        area.style.cssText = "width:100%;min-height:180px;";
        panel.insertBefore(area, dm);
        area.focus();
        area.select();
        copy.textContent = tr("请手动复制资料", "Select and copy the details");
      }
    };

    var dm = document.createElement("a");
    dm.href = INSTAGRAM_URL;
    dm.target = "_blank";
    dm.rel = "noopener noreferrer";
    dm.className = "primary";
    dm.textContent = tr(
      "前往 Instagram 私信发送订单 →",
      "Open Instagram DM →"
    );
    dm.style.cssText =
      "display:block;width:100%;box-sizing:border-box;text-align:center;" +
      "text-decoration:none;margin-top:8px;";

    panel.append(heading, note, preview, copy, dm);

    var node = $("proofUploadStatus");
    if (node && node.parentNode) node.parentNode.appendChild(panel);
  }

  async function uploadReceipt() {
    var button = $("uploadProofBtn");
    var input = $("paymentProofFile");
    var file = input && input.files && input.files[0];
    var orderNo = window.currentOrderNumber || "";
    var proofToken = window.currentProofToken || "";

    if (busy) return;

    if (!file) {
      status(tr("请先选择付款凭证图片。", "Please choose a payment receipt image."));
      return;
    }

    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > MAX_BYTES) {
      status(
        tr(
          "请上传 5MB 以内的 JPG、PNG 或 WebP 图片。",
          "Please upload a JPG, PNG or WebP image under 5MB."
        ),
        "#b42318"
      );
      return;
    }

    if (!orderNo || !proofToken) {
      status(
        tr(
          "找不到订单编号，请保留订单资料并联系 Graceantjoy。",
          "Order session not found. Please contact Graceantjoy."
        ),
        "#b42318"
      );
      return;
    }

    busy = true;
    if (button) {
      button.disabled = true;
      button.textContent = tr("正在上传…", "Uploading…");
    }
    status(tr("正在上传图片，请稍候…", "Uploading image, please wait…"));

    try {
      if (!window.supabase || !window.supabase.createClient) {
        throw new Error("Supabase client did not load. Refresh and retry.");
      }

      var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      var extension = file.type === "image/png" ? "png" :
        file.type === "image/webp" ? "webp" : "jpg";

      var uuid = window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : String(Date.now()) + "-" + Math.random().toString(36).slice(2);

      var path = proofToken + "/" + uuid + "." + extension;

      var uploaded = await withTimeout(
        db.storage.from(BUCKET).upload(path, file, {
          upsert: false,
          contentType: file.type
        }),
        30,
        "Storage upload"
      );

      if (uploaded && uploaded.error) throw uploaded.error;

      status(
        tr(
          "图片已上传，正在确认订单记录…",
          "Image uploaded. Checking the order record…"
        )
      );

      /* RPC runs in the background; it cannot keep the page spinning. */
      withTimeout(
        db.rpc("save_payment_proof", {
          p_order_number: orderNo,
          p_proof_token: proofToken,
          p_storage_path: path
        }),
        15,
        "Receipt record save"
      ).then(function (saved) {
        if (saved && saved.error) {
          console.error("save_payment_proof error:", saved.error);
        }
      }).catch(function (error) {
        console.error("save_payment_proof error:", error);
      });

      status(
        tr(
          "付款凭证图片已上传！请复制订单资料发送给我们。订单编号：",
          "Payment proof image uploaded. Send us your order details. Order: "
        ) + orderNo,
        "#207245"
      );

      showConfirmation(orderNo, path);

      if (button) {
        button.textContent = tr("已上传 ✓", "Uploaded ✓");
        button.disabled = true;
      }
      if (input) input.value = "";

    } catch (error) {
      console.error("Payment proof upload error:", error);
      status(
        tr("上传失败：", "Upload failed: ") +
          (error && error.message ? error.message : "Unknown error"),
        "#b42318"
      );
      if (button) {
        button.disabled = false;
        button.textContent = tr("重新上传凭证", "Retry Upload");
      }
    } finally {
      busy = false;
    }
  }

  function init() {
    var button = $("uploadProofBtn");
    if (!button || button.dataset.paymentFlowV3 === "true") return;

    button.dataset.paymentFlowV3 = "true";

    /* Capture-phase listener intercepts the old click handler. */
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || !target.closest || !target.closest("#uploadProofBtn")) return;

      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();

      uploadReceipt();
    }, true);

    var input = $("paymentProofFile");
    if (input) {
      input.addEventListener("change", function () {
        if (input.files && input.files[0]) {
          if (button.textContent.indexOf("Uploaded") === -1 &&
              button.textContent.indexOf("已上传") === -1) {
            button.disabled = false;
            button.textContent = tr("上传付款凭证", "Upload Payment Receipt");
          }
          status("");
        }
      });
    }
  }

  /* This file is injected after document.write(), so initialize immediately. */
  init();
})();
