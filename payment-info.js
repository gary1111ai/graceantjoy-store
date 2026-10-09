
(function () {
  const BANK = {
    name: "Hong Leong Bank",
    holder: "SEE ZHI QI",
    account: "33300222066",
    instagram: "graceantjoy"
  };

  const QR_IMAGE = "./duitnow-qr.jpeg";

  function initPaymentInfo() {
    const select = document.querySelector(
      '#checkout select[name="payment"]'
    );
    if (!select || document.getElementById("graceantjoy-payment-info")) return;

    const panel = document.createElement("div");
    panel.id = "graceantjoy-payment-info";
    panel.style.cssText =
      "display:none;margin:12px 0;padding:18px;" +
      "border:1px solid #ded7cc;border-radius:12px;" +
      "background:#faf8f4;color:#222;line-height:1.7;";

    function updatePanel() {
      const option = select.options[select.selectedIndex];
      const method = option ? option.text : "";
      const isBank = /bank transfer/i.test(method);
      const isQR = /duitnow|qr/i.test(method);

      panel.style.display = (isBank || isQR) ? "block" : "none";

      if (isBank) {
        panel.innerHTML = `
          <h3>Bank Transfer Details</h3>
          <p>Bank: <strong>${BANK.name}</strong></p>
          <p>Account Holder: <strong>${BANK.holder}</strong></p>
          <p>Account Number: <strong>${BANK.account}</strong></p>
          <button type="button" id="copy-bank-account">
            Copy Account Number
          </button>
        `;

        panel.querySelector("#copy-bank-account")
          .addEventListener("click", async function () {
            try {
              await navigator.clipboard.writeText(BANK.account);
              this.textContent = "Copied!";
            } catch (e) {
              window.prompt("Copy account number:", BANK.account);
            }
          });
      } else if (isQR) {
        panel.innerHTML = `
          <h3>DuitNow QR Payment</h3>
          <p>Scan this QR code using your banking app or eWallet.</p>
          <img src="${duitnow-qr}" alt="Graceantjoy DuitNow QR"
            style="display:block;width:100%;max-width:340px;height:auto;margin:16px auto;border-radius:8px"
            onerror="this.alt='QR image could not load. Please check the uploaded filename.'">
          <p style="text-align:center"><strong>Account Name: ${BANK.holder}</strong></p>
        `;
      } else {
        panel.innerHTML = "";
      }

      if (isBank || isQR) {
        const heading = document.createElement("div");
        heading.style.marginTop = "16px";
        heading.innerHTML = `
          <p>After payment, please send your receipt through Instagram.</p>
          <a href="https://www.instagram.com/${BANK.instagram}/"
            target="_blank" rel="noopener noreferrer"
            style="display:block;text-align:center;padding:13px;background:#C13584;color:white;text-decoration:none;border-radius:8px;font-weight:600">
            Send Payment Proof via Instagram
          </a>
          <p style="font-size:12px;color:#666">
            Open our Instagram profile, tap Message, and attach your receipt.
          </p>
        `;
        panel.appendChild(heading);
      }
    }

    select.insertAdjacentElement("afterend", panel);
    select.addEventListener("change", updatePanel);
    updatePanel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPaymentInfo);
  } else {
    initPaymentInfo();
  }
})();
