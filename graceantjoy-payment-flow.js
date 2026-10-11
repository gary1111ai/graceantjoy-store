
(function () {
  "use strict";

  const BUCKET = "payment-proofs";
  const UPLOAD_TIMEOUT = 60000;
  const RPC_TIMEOUT = 15000;

  let busy = false;
  let proofPath = "";

  function byId(id) {
    return document.getElementById(id);
  }

  

function getClient() {
  if (
    window.graceantjoySupabaseClient &&
    typeof window.graceantjoySupabaseClient.rpc === "function"
  ) {
    return window.graceantjoySupabaseClient;
  }

  if (
    window.supabase &&
    typeof window.supabase.createClient === "function"
  ) {
    window.graceantjoySupabaseClient =
      window.supabase.createClient(
        "https://udpjnirtmuzmiwmgelua.supabase.co",
        "sb_publishable_IpMDj4zQ9B3GuMW4JAH0SA_MgqdDC0G"
      );

    return window.graceantjoySupabaseClient;
  }

  console.error(
    "[Graceantjoy] Supabase JS SDK is not loaded."
  );

  return null;
}


  function getOrderNumber() {
    return (
      window.currentOrderNumber ||
      window.current_order_number ||
      ""
    ).toString().trim();
  }

  function getProofToken() {
    return (
      window.currentProofToken ||
      window.current_proof_token ||
      ""
    ).toString().trim();
  }

  function setMessage(message, isError) {
    let el = byId("gjPaymentFlowMessage");

    if (!el) {
      el = document.createElement("div");
      el.id = "gjPaymentFlowMessage";

      const button = byId("uploadProofBtn");

      if (button && button.parentNode) {
        button.parentNode.insertBefore(
          el,
          button.nextSibling
        );
      } else {
        document.body.appendChild(el);
      }
    }

    el.textContent = message;
    el.style.cssText =
      "margin-top:10px;padding:10px;border-radius:8px;" +
      "font-size:14px;line-height:1.5;" +
      "color:" + (isError ? "#b42318" : "#167647") + ";" +
      "background:" + (isError ? "#fff1f0" : "#ecfdf3") + ";";
  }

  function withTimeout(promise, ms, label) {
    let timer;

    const timeout = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        reject(new Error(label + " timeout"));
      }, ms);
    });

    return Promise.race([promise, timeout]).finally(
      function () {
        clearTimeout(timer);
      }
    );
  }

  function getFile() {
    const input = byId("paymentProofFile");

    if (!input || !input.files || !input.files[0]) {
      return null;
    }

    return input.files[0];
  }

  function safeFileName(file) {
    const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch
      ? extMatch[1].toLowerCase()
      : "jpg";

    return (
      Date.now() + "-" +
      Math.random().toString(36).slice(2, 10) +
      "." + ext
    );
  }

  function showDonePaymentButton() {
    let button = byId("gjDonePaymentBtn");

    if (!button) {
      button = document.createElement("button");
      button.id = "gjDonePaymentBtn";
      button.type = "button";
      button.textContent = "Done Payment";

      button.style.cssText =
        "display:block;width:100%;margin-top:12px;" +
        "padding:14px 18px;border:0;border-radius:10px;" +
        "background:#111;color:#fff;font-size:16px;" +
        "font-weight:700;cursor:pointer;";

      const uploadButton = byId("uploadProofBtn");

      if (uploadButton && uploadButton.parentNode) {
        uploadButton.parentNode.insertBefore(
          button,
          uploadButton.nextSibling
        );
      } else {
        document.body.appendChild(button);
      }

      button.addEventListener("click", showOrderSummary);
    }

    button.style.display = "block";
  }

  function findOrderData(orderNo) {
    const keys = [
      "gj_orders_v2",
      "graceantjoy_orders",
      "orders",
      "gj_last_order",
      "lastOrder"
    ];

    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        const data = JSON.parse(raw);
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.orders)
            ? data.orders
            : [data];

        const found = list.find(function (order) {
          const number =
            order.order_number ||
            order.orderNumber ||
            order.order_no ||
            order.orderNo ||
            order.id ||
            "";

          return String(number) === String(orderNo);
        });

        if (found) return found;
      } catch (_) {}
    }

    return null;
  }

  function getOrderItems(order) {
    if (!order) return [];

    const possible = [
      order.items,
      order.order_items,
      order.cart,
      order.products,
      order.order_details
    ];

    for (const value of possible) {
      if (Array.isArray(value)) return value;
    }

    return [];
  }

  function itemDescription(item) {
    const code =
      item.product_code ||
      item.productCode ||
      item.code ||
      item.sku ||
      "";

    const name =
      item.product_name ||
      item.productName ||
      item.name ||
      item.title ||
      "Product";

    const model =
      item.model ||
      item.phone_model ||
      item.phoneModel ||
      item.variant ||
      "";

    const qty = Number(
      item.quantity || item.qty || 1
    );

    const price = Number(
      item.price || item.unit_price || item.unitPrice || 0
    );

    return [
      code ? "款式编号：" + code : "",
      "产品名称：" + name,
      model ? "型号：" + model : "",
      "数量：" + qty,
      price > 0
        ? "单价：RM " + price.toFixed(2)
        : ""
    ].filter(Boolean).join("\n");
  }

  function showOrderSummary() {
    const orderNo = getOrderNumber();
    const order = findOrderData(orderNo);
    const items = getOrderItems(order);

    let summary = "Graceantjoy 订单资料\n";
    summary += "订单编号：" + (orderNo || "请向店主确认") + "\n\n";

    if (items.length) {
      summary += items.map(function (item, index) {
        return (index + 1) + ".\n" + itemDescription(item);
      }).join("\n\n");
    } else {
      summary +=
        "商品详细资料：请以网站订单记录为准。\n";
    }

    const total =
      order && (
        order.total_amount ??
        order.total ??
        order.grand_total ??
        order.amount
      );

    if (total !== undefined && total !== null && total !== "") {
      const amount = Number(total);

      summary += "\n\n订单总额：RM " +
        (Number.isFinite(amount) ? amount.toFixed(2) : total);
    }

    summary +=
      "\n\n付款凭证已提交，请店主核对付款及订单资料。";

    let modal = byId("gjOrderSummaryModal");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "gjOrderSummaryModal";
      modal.style.cssText =
        "position:fixed;inset:0;z-index:999999;" +
        "background:rgba(0,0,0,.65);display:flex;" +
        "align-items:center;justify-content:center;" +
        "padding:16px;";

      modal.innerHTML =
        '<div style="background:#fff;color:#111;width:100%;' +
        'max-width:460px;max-height:90vh;overflow:auto;' +
        'border-radius:14px;padding:20px;">' +
        '<h2 style="margin:0 0 8px;">订单确认</h2>' +
        '<p style="font-size:14px;line-height:1.6;">' +
        '请复制以下资料，并发送到我们的 Instagram 私信，' +
        '店主收到后才能确认订单。</p>' +
        '<textarea id="gjOrderSummaryText" readonly ' +
        'style="box-sizing:border-box;width:100%;min-height:220px;' +
        'padding:12px;border:1px solid #ddd;border-radius:8px;' +
        'font-size:14px;line-height:1.5;"></textarea>' +
        '<button id="gjCopyOrderBtn" type="button" ' +
        'style="width:100%;padding:13px;margin-top:10px;' +
        'border:0;border-radius:8px;background:#111;color:#fff;' +
        'font-weight:700;">复制订单资料</button>' +
        '<p style="font-size:13px;line-height:1.6;">' +
        '复制后，点击下方链接打开 Instagram，粘贴并发送订单资料。' +
        '<br><b>请注意：只上传付款凭证还不算完成订单确认。</b></p>' +
        '<a id="gjInstagramLink" href="https://ig.me/m/graceantjoy" ' +
        'target="_blank" rel="noopener noreferrer" ' +
        'style="display:block;text-align:center;padding:13px;' +
        'border-radius:8px;background:#e1306c;color:#fff;' +
        'text-decoration:none;font-weight:700;">' +
        '前往 Instagram 私信</a>' +
        '<button id="gjCloseSummaryBtn" type="button" ' +
        'style="width:100%;padding:12px;margin-top:10px;' +
        'border:1px solid #ddd;border-radius:8px;background:#fff;">' +
        '关闭</button></div>';

      document.body.appendChild(modal);

      byId("gjCopyOrderBtn").addEventListener("click", async function () {
        const text = byId("gjOrderSummaryText").value;

        try {
          await navigator.clipboard.writeText(text);
          setMessage("订单资料已复制，请到 Instagram 粘贴并发送。", false);
        } catch (_) {
          const area = byId("gjOrderSummaryText");
          area.focus();
          area.select();

          try {
            const copied = document.execCommand("copy");
            setMessage(
              copied
                ? "订单资料已复制，请到 Instagram 粘贴并发送。"
                : "请长按上方订单资料并选择复制。",
              !copied
            );
          } catch (__) {
            setMessage("请长按上方订单资料并选择复制。", true);
          }
        }
      });

      byId("gjCloseSummaryBtn").addEventListener("click", function () {
        modal.style.display = "none";
      });
    }

    byId("gjOrderSummaryText").value = summary;
    modal.style.display = "flex";
  }

  async function uploadProof() {
    if (busy) return;

    const file = getFile();
    const orderNo = getOrderNumber();
    const proofToken = getProofToken();
    const db = getClient();

    if (!file) {
      setMessage("请先选择付款凭证图片。", true);
      return;
    }

    if (!orderNo || !proofToken) {
      setMessage(
        "找不到当前订单资料，请返回订单付款页面重新打开后再试。",
        true
      );
      return;
    }

    if (!db || !db.storage || typeof db.rpc !== "function") {
      setMessage(
        "无法连接 Supabase。请刷新页面后重试。",
        true
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage("图片不能超过 10MB，请选择较小的图片。", true);
      return;
    }

    busy = true;

    const button = byId("uploadProofBtn");
    const originalText = button ? button.textContent : "";

    if (button) {
      button.disabled = true;
      button.textContent = "请稍候…";
    }

    try {
      const path = proofToken + "/" + safeFileName(file);

      const uploadResult = await withTimeout(
        db.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || "image/jpeg"
        }),
        UPLOAD_TIMEOUT,
        "Storage upload"
      );

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      proofPath = path;

      setMessage(
        "图片已上传，正在保存付款记录，请勿关闭页面。",
        false
      );

      const rpcResult = await withTimeout(
        db.rpc("save_payment_proof", {
          p_order_number: orderNo,
          p_proof_token: proofToken,
          p_storage_path: path
        }),
        RPC_TIMEOUT,
        "Payment record save"
      );

      if (rpcResult.error) {
        throw new Error(
          "图片已上传，但保存订单付款记录失败：" +
          rpcResult.error.message
        );
      }

      if (button) {
        button.textContent = "付款凭证已上传";
      }

      const input = byId("paymentProofFile");
      if (input) input.disabled = true;

      setMessage(
        "付款凭证上传及记录保存成功。请点击 Done Payment 复制订单资料，并发送到 Instagram。",
        false
      );

      showDonePaymentButton();

    } catch (error) {
      console.error("[Graceantjoy payment]", error);

      const message = error && error.message
        ? error.message
        : "未知错误";

      if (proofPath) {
        setMessage(
          "图片可能已上传到 Storage，但付款记录未能确认保存。" +
          "请勿重复付款。错误：" + message,
          true
        );
      } else {
        setMessage(
          "付款凭证上传失败：" + message +
          "。请检查网络后重试。",
          true
        );
      }

      if (button) {
        button.textContent = originalText || "Upload Payment Proof";
      }

    } finally {
      busy = false;

      if (button) {
        button.disabled = false;
      }
    }
  }

  function install() {
    const button = byId("uploadProofBtn");

    if (!button || button.dataset.gjPaymentFlowInstalled === "1") {
      return;
    }

    button.dataset.gjPaymentFlowInstalled = "1";

    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      uploadProof();
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }

  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.graceantjoyPaymentFlow = {
    uploadProof: uploadProof,
    showOrderSummary: showOrderSummary
  };
})();
