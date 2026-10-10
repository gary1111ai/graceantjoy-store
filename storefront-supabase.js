
/* Graceantjoy Supabase product connection */
(function () {
  const SUPABASE_URL =
    "https://udpjnirtmuzmiwmgelua.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_IpMDj4zQ9B3GuMW4JAH0SA_MgqdDC0G";

  if (
    !window.supabase ||
    typeof products === "undefined" ||
    typeof render !== "function"
  ) {
    console.error(
      "Graceantjoy: storefront connection not ready."
    );
    return;
  }

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  async function loadCloudProducts() {
    const productBox = document.getElementById("products");

    try {
      const { data, error } = await db
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      products = (data || []).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",

        price: Number(p.price),

        salePrice:
          p.compare_at_price !== null &&
          Number(p.compare_at_price) < Number(p.price)
            ? Number(p.compare_at_price)
            : null,

        promoQuantity: Number(p.promo_quantity || 0),

        promoPrice:
          p.promo_price !== null &&
          p.promo_price !== undefined
            ? Number(p.promo_price)
            : null,

        stock: Number(p.stock || 0),
        image: p.image_url || "",
        brand: p.brand || "Graceantjoy",
        style: p.style || p.category || "New Arrivals",
        material: p.material || "Hard Case",
        models: p.models || []
      }));

      render();

    } catch (err) {
      console.error(
        "Supabase product load failed:",
        err
      );

      if (productBox) {
        productBox.innerHTML =
          '<div class="empty">' +
          "Products could not load. Please try again later." +
          "</div>";
      }
    }
  }

  loadCloudProducts();
})();
