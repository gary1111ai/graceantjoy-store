
/* Graceantjoy payment flow v2
   Standalone payment receipt uploader.
   Handles upload timeout, error messages, receipt record saving,
   order detail copying and Instagram DM follow-up.
*/
(function () {
  "use strict";

  var SUPABASE_URL = "https://udpjnirtmuzmiwmgelua.supabase.co";
  var SUPABASE_KEY = "sb_publishable_IpMDj4zQ9B3GuMW4JAH0SA_MgqdDC0G";
  var BUCKET = "payment-proofs";
  var MAX_BYTES = 5 * 1024 * 1024;
  var UPLOAD_TIMEOUT_MS = 30000;
  var RECORD_TIMEOUT_MS = 15000;
  var INSTAGRAM_URL = "https://ig.me/m/graceantjoy";
  var busy = false;

  function $(id) {
    return document.getElementById(id);
  }

  function isZh() {
    try {
      return localStorage.getItem("gj_lang_v1") === "zh";
    } catch (_) {
      return false;
    }
  }

  function tr(zh, en) {
    return isZh() ? zh : en;
  }

  function money(value) {
    var n = Number(value);
    return "RM " + (Number.isFinite(n) ? n : 0).toFixed(2);
  }

  function setStatus(message, color) {
    var node = $("proofUploadStatus");
    if (!node) return;
    node.textContent = message;
    node.style.color = color || "#625b50";
  }

  function withTimeout(promise, label, ms) {
    return new Promise(function (resolve, reject) {
      var settled = false;

      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(
          new Error(
            label + " timed out after " +
            Math.round(ms / 1000) + " seconds."
          )
        );
      }, ms);

      Promise.resolve(promise).then(
        function (value) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(value);
        },
        function (error) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }

  function getCurrentOrder() {
    var orderNo = window.currentOrderNumber || "";
    var list = Array.isArray(window.orders) ? window.orders : [];

    return list.find(function (order) {
      return String(order.order_number || order.id || "") ===
        String(orderNo);
    }) || null;
  }

  function makeOrderMessage(orderNo, storagePath) {
    var order = getCurrentOrder();
    var lines = [
      "Graceantjoy Order Details",
      "Order No: " + orderNo
    ];

    if (order) {
      if (order.name || order.customer_name) {
        lines.push(
          "Name: " + (order.name || order.customer_name)
        );
      }

      if (order.phone) {
        lines.push("Phone: " + order.phone);
      }

      if (order.address || order.delivery_address) {
        lines.push(
          "Address: " +
          (order.address || order.delivery_address)
        );
      }

      lines.push("");

      (Array.isArray(order.items) ? order.items : [])
        .forEach(function (item, index) {
          var quantity = Number(item.quantity || item.qty || 0);

          var lineTotal = item.subtotal != null
            ? item.subtotal
            : Number(item.unit_price || 0) * quantity;

          lines.push(
            "Product " + (index + 1) + ": " +
              (item.product_name || item.name || "Phone Case"),
            "Style Code: " +
              (item.product_code || item.style_code || "-"),
            "Phone Model: " +
              (item.phone_model || item.model || "-"),
            "Quantity: " + quantity,
            "Item Total: " + money(lineTotal),
            ""
          );
        });

      lines.push(
        "Subtotal: " + money(order.subtotal),
        "Shipping: " + money(order.shipping_fee),
        "Total: " + money(order.total)
      );
    } else if ($("paymentTotal")) {
      lines.push("Total: " + $("paymentTotal").textContent);
    }

    lines.push(
      "Payment proof uploaded: " +
      (storagePath || "pending verification")
    );

    return lines.join("\n");
  }

  function showConfirmation(orderNo, storagePath) {
    var old = $("gj-payment-v2-confirmation");
    if (old) old.remove();

    var panel = document.createElement("section");
    panel.id = "gj-payment-v2-confirmation";
    panel.style.cssText =
      "margin-top:16px;padding:16px;" +
      "border:1px solid #eedde3;border-radius:14px;" +
      "background:#fff5f7;color:#30272b;";

    var heading = document.createElement("h3");
    heading.textContent = tr(
      "付款凭证处理结果 ♡",
      "Payment Receipt Result ♡"
    );
    heading.style.cssText =
      "font:22px Georgia,serif;margin:0 0 8px;";

    var note = document.createElement("p");
    note.textContent = tr(
      "请复制订单资料，再打开 Instagram 私信并粘贴发送。" +
      "订单需由我们核实付款后才会标记为已付款。",
      "Copy your order details, then open Instagram DM and send them. " +
      "Your order remains unpaid until we verify the payment."
    );
    note.style.cssText = "font-size:12px;line-height:1.7;";

    var message = makeOrderMessage(orderNo, storagePath);

    var preview = document.createElement("pre");
    preview.textContent = message;
    preview.style.cssText =
      "white-space:pre-wrap;overflow-wrap:anywhere;" +
      "font:12px/1.7 Arial,sans-serif;background:#fff;" +
      "padding:12px;border:1px solid #eedde3;border-radius:9px;";

    var copy = document.createElement("button");
    copy.type = "button";
    copy.className = "primary";
    copy.textContent = tr("复制订单资料", "Copy Order Details");
    copy.style.cssText = "width:100%;margin:8px 0;";

    var dm = document.createElement("a");
    dm.href = INSTAGRAM_URL;
    dm.target = "_blank";
    dm.rel = "noopener noreferrer";
    dm.className = "primary";
    dm.textContent = tr(
      "前往 Instagram 私信发送订单 →",
      "Open Instagram DM to send order →"
    );
    dm.style.cssText =
      "display:block;box-sizing:border-box;width:100%;" +
      "text-align:center;text-decoration:none;margin-top:8px;";

    copy.addEventListener("click", async function () {
      try {
        if (!navigator.clipboard ||
            !navigator.clipboard.writeText) {
          throw new Error("Clipboard unavailable");
        }

        await navigator.clipboard.writeText(message);
        copy.textContent = tr("已复制 ✓", "Copied ✓");
      } catch (_) {
        var manual = document.createElement("textarea");
        manual.value = message;
        manual.style.cssText =
          "width:100%;min-height:170px;padding:10px;";

        panel.insertBefore(manual, dm);
        manual.focus();
        manual.select();

        copy.textContent = tr(
          "请手动复制资料",
          "Select and copy the details"
        );
      }
    });

    panel.append(heading, note, preview, copy, dm);

    var statusNode = $("proofUploadStatus");
    if (statusNode && statusNode.parentNode) {
      statusNode.parentNode.appendChild(panel);
    }
  }

  async function uploadReceipt() {
    var button = $("uploadProofBtn");
    var input = $("paymentProofFile");
    var file = input && input.files && input.files[0];

    var orderNo = window.currentOrderNumber || "";
    var proofToken = window.currentProofToken || "";

    if (!file) {
      setStatus(
        tr(
          "请先选择付款凭证图片。",
          "Please choose your payment receipt image."
        )
      );
      return;
    }

    if (!/^image\/(jpeg|png|webp)$/.test(file.type) ||
        file.size > MAX_BYTES) {
      setStatus(
        tr(
          "格式不正确或文件超过 5MB。请使用 JPG、PNG 或 WebP。",
          "Unsupported image or file exceeds 5MB. " +
          "Use JPG, PNG or WebP."
        ),
        "#b42318"
      );
      return;
    }

    if (!orderNo || !proofToken) {
      setStatus(
        tr(
          "找不到当前订单编号。请保留订单资料并联系 Graceantjoy。",
          "Order session not found. Keep your order details " +
          "and contact Graceantjoy."
        ),
        "#b42318"
      );
      return;
    }

    if (busy) return;

    busy = true;

    if (button) {
      button.disabled = true;
      button.textContent = tr("正在上传…", "Uploading…");
    }

    setStatus(
      tr(
        "正在上传凭证，请保持页面开启。",
        "Uploading receipt. Please keep this page open."
      )
    );

    try {
      if (!window.supabase ||
          typeof window.supabase.createClient !== "function") {
        throw new Error(
          "Supabase client did not load. Refresh the page and try again."
        );
      }

      var db = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );

      var extension = file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";

      var unique = window.crypto &&
        typeof window.crypto.randomUUID === "function"
          ? window.crypto.randomUUID()
          : String(Date.now()) + "-" +
            Math.random().toString(36).slice(2);

      var path = proofToken + "/" + unique + "." + extension;

      var uploaded = await withTimeout(
        db.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        }),
        "Storage upload",
        UPLOAD_TIMEOUT_MS
      );

      if (uploaded && uploaded.error) {
        throw uploaded.error;
      }

      setStatus(
        tr(
          "图片已上传，正在保存凭证记录…",
          "Image uploaded. Saving the receipt record…"
        )
      );

      var recordSaved = false;

      try {
        var saved = await withTimeout(
          db.rpc("save_payment_proof", {
            p_order_number: orderNo,
            p_proof_token: proofToken,
            p_storage_path: path
          }),
          "Receipt record save",
          RECORD_TIMEOUT_MS
        );

        if (saved && saved.error) {
          throw saved.error;
        }

        recordSaved = true;
      } catch (recordError) {
        console.error(
          "Graceantjoy receipt record save failed:",
          recordError
        );
      }

      if (recordSaved) {
        setStatus(
          tr(
            "付款凭证已上传并记录成功！订单编号：",
            "Receipt uploaded and recorded successfully. Order: "
          ) + orderNo,
          "#207245"
        );
      } else {
        setStatus(
          tr(
            "图片已上传，但系统暂时无法确认订单记录。" +
            "请复制订单资料并发送给我们核对。订单编号：",
            "Image uploaded, but the order record could not be " +
            "confirmed. Send us the order details so we can verify it. Order: "
          ) + orderNo,
          "#9a6700"
        );
      }

      showConfirmation(orderNo, path);

      if (button) {
        button.textContent = tr(
          "凭证已上传 ✓",
          "Receipt Uploaded ✓"
        );
        button.disabled = true;
      }

      if (input) input.value = "";

    } catch (error) {
      console.error(
        "Graceantjoy payment receipt upload failed:",
        error
      );

      var message = error && error.message
        ? error.message
        : "Unknown error";

      setStatus(
        tr("上传失败：", "Upload failed: ") +
        message +
        tr(" 请检查网络后重试。", " Check your connection and retry."),
        "#b42318"
      );

      if (button) {
        button.disabled = false;
        button.textContent = tr(
          "重新上传付款凭证",
          "Retry Receipt Upload"
        );
      }

    } finally {
      busy = false;
    }
  }

  function init() {
    var button = $("uploadProofBtn");

    if (!button ||
        button.dataset.paymentFlowV2 === "true") {
      return;
    }

    button.dataset.paymentFlowV2 = "true";

    // Intercept the button before the old click handler runs.
    document.addEventListener("click", function (event) {
      var target = event.target;

      if (!target ||
          typeof target.closest !== "function" ||
          !target.closest("#uploadProofBtn")) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.stopImmediatePropagation) {
        event.stopImmediatePropagation();
      }

      uploadReceipt();
    }, true);

    var input = $("paymentProofFile");

    if (input) {
      input.addEventListener("change", function () {
        if (!input.files || !input.files[0]) return;

        var text = button.textContent || "";

        if (!/Uploaded|已上传|凭证已上传/i.test(text)) {
          button.disabled = false;
          button.textContent = tr(
            "上传付款凭证",
            "Upload Payment Receipt"
          );
        }

        setStatus("");
      });
    }

    var close = $("paymentClose");

    if (close) {
      close.addEventListener("click", function () {
        var overlay = $("paymentOverlay");
        if (overlay) overlay.style.display = "none";
      });
    }

    var overlay = $("paymentOverlay");

    if (overlay) {
      overlay.addEventListener("click", function (event) {
        if (event.target === overlay) {
          overlay.style.display = "none";
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
