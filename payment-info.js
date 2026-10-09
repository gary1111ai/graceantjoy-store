
(function () {
  const BANK = {
    name: "Hong Leong Bank",
    holder: "SEE ZHI QI",
    account: "33300222066",
    instagram: "graceantjoy"
  };

  function initPaymentInfo() {
    const select = document.querySelector(
      '#checkout select[name="payment"]'
    );

    if (
      !select ||
      document.getElementById("graceantjoy-payment-info")
    ) return;

    const panel = document.createElement("div");
    panel.id = "graceantjoy-payment-info";
    panel.style.cssText =
      "display:none;margin:12px 0;padding:18px;" +
      "border:1px solid #ded7cc;border-radius:12px;" +
      "background:#faf8f4;color:#222;line-height:1.7;";

    panel.innerHTML = `
      <h3 style="margin:0 0 12px">Bank Transfer Details</h3>

      <p>Bank: <strong>${BANK.name}</strong></p>
      <p>Account Holder: <strong>${BANK.holder}</strong></p>
      <p>Account Number:</p>

      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <strong style="font-size:20px">${BANK.account}</strong>
        <button type="button" id="graceantjoy-copy-account"
          style="padding:8px 12px;border:1px solid #aaa;border-radius:8px;background:white">
          Copy Account Number
        </button>
      </div>

      <hr style="border:0;border-top:1px solid #ddd;margin:16px 0">

      <p><strong>After Payment</strong></p>
      <p>Please send your payment receipt to our Instagram DM.</p>

      <a href="https://www.instagram.com/graceantjoy/"
        target="_blank" rel="noopener noreferrer"
        style="display:block;text-align:center;padding:13px;background:#C13584;color:white;text-decoration:none;border-radius:8px;font-weight:600">
        Send Payment Proof via Instagram
      </a>

      <p style="font-size:12px;color:#666;margin-top:10px">
        Instagram will open in a new page. Open our profile, tap Message,
        and attach your payment receipt.
      </p>
    `;

    select.insertAdjacentElement("afterend", panel);

    function updatePanel() {
      const value = select.options[select.selectedIndex]?.text || "";
      panel.style.display = /bank transfer/i.test(value)
        ? "block"
        : "none";
    }

    select.addEventListener("change", updatePanel);

    panel.querySelector("#graceantjoy-copy-account")
      .addEventListener("click", async function () {
        try {
          await navigator.clipboard.writeText(BANK.account);
          this.textContent = "Copied!";
        } catch (error) {
          window.prompt("Copy bank account number:", BANK.account);
        }
      });

    updatePanel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPaymentInfo);
  } else {
    initPaymentInfo();
  }
})();
