import test from "node:test";
import assert from "node:assert/strict";
import {
  formatGHS,
  calculateCartTotal,
  calculateCartItemCount,
  normalizeWhatsAppNumber,
  generateOrderNumber,
  validateDeliveryForm,
  buildWhatsAppOrderMessage,
  buildWhatsAppUrl,
  isUuid,
  appendImageVersion,
  resolveProductImageUrl,
  normalizeShopProductRow,
  syncCartWithProducts,
} from "./shop";

test("formatGHS formats currency cleanly with cedis symbol", () => {
  assert.equal(formatGHS(150), "₵150.00");
  assert.equal(formatGHS(1250.5), "₵1,250.50");
  assert.equal(formatGHS(Number.NaN), "₵0.00");
});

test("calculateCartTotal and calculateCartItemCount ignore invalid quantities and compute accurately", () => {
  const items = [
    { product_id: "1", name: "Worship Tee", price: 150, quantity: 2, image_url: "/a.webp" },
    { product_id: "2", name: "Journal", price: 95, quantity: 1, image_url: "/b.webp" },
    { product_id: "3", name: "Broken", price: 50, quantity: -3, image_url: "/c.webp" },
  ];
  assert.equal(calculateCartTotal(items), 395);
  assert.equal(calculateCartItemCount(items), 3);
});

test("normalizeWhatsAppNumber formats Ghanaian local numbers and E.164 numbers", () => {
  assert.equal(normalizeWhatsAppNumber("024 123 4567"), "233241234567");
  assert.equal(normalizeWhatsAppNumber("+233 55 987 6543"), "233559876543");
  assert.equal(normalizeWhatsAppNumber("00233201112233"), "233201112233");
  assert.equal(normalizeWhatsAppNumber("241234567"), "233241234567");
  assert.equal(normalizeWhatsAppNumber(""), "");
});

test("validateDeliveryForm checks required delivery and contact fields", () => {
  const invalid = validateDeliveryForm({
    customer_name: "A",
    customer_phone: "123",
    delivery_address: "AB",
    delivery_city: "",
    customer_email: "bad-email",
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.length >= 4);

  const valid = validateDeliveryForm({
    customer_name: "Kwame Mensah",
    customer_phone: "0244123456",
    delivery_address: "House 14, Korle Bu Road",
    delivery_city: "Accra",
    customer_email: "kwame@example.com",
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, []);
});

test("generateOrderNumber formats predictable KSW order references", () => {
  const ref = generateOrderNumber(new Date("2026-12-18T10:00:00Z"), "AB12");
  assert.equal(ref, "KSW-20261218-AB12");
});

test("buildWhatsAppOrderMessage & buildWhatsAppUrl include items, total, and delivery details for manual WhatsApp completion", () => {
  const order = {
    order_number: "KSW-20261218-Z9K1",
    customer_name: "Abena Osei",
    customer_phone: "0541112233",
    customer_email: "abena@example.com",
    delivery_address: "12 Liberation Link, Dansoman",
    delivery_city: "Accra",
    delivery_notes: "Call upon arrival",
    items: [
      { product_id: "1", name: "KSW 2026 Royal Crest Worship Tee", price: 150, quantity: 2, image_url: "/tee.webp" },
    ],
    total_amount: 300,
  };

  const msg = buildWhatsAppOrderMessage(order);
  assert.match(msg, /KSW-20261218-Z9K1/);
  assert.match(msg, /Awaiting Payment Follow-up/);
  assert.match(msg, /Abena Osei/);
  assert.match(msg, /Dansoman/);
  assert.match(msg, /₵300\.00/);
  assert.equal(msg.includes("MoMo"), false);

  const url = buildWhatsAppUrl("0249998888", order);
  assert.ok(url.startsWith("https://wa.me/233249998888?text="));
  assert.ok(decodeURIComponent(url).includes("KSW-20261218-Z9K1"));
});

test("isUuid distinguishes real database UUIDs from local seed IDs", () => {
  assert.equal(isUuid("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(isUuid("ksw-prod-tee-01"), false);
  assert.equal(isUuid(""), false);
});

test("appendImageVersion versions HTTPS URLs cleanly and preserves data/static URLs", () => {
  const storageUrl = "https://example.supabase.co/storage/v1/object/public/shop-images/products/tee.webp";
  const versioned = appendImageVersion(storageUrl, "2026-11-27T08:00:00.000Z");
  assert.match(versioned, /^https:\/\/example\.supabase\.co\/storage\/v1\/object\/public\/shop-images\/products\/tee\.webp\?v=\d+$/);

  const dataUrl = "data:image/webp;base64,AAAA";
  assert.equal(appendImageVersion(dataUrl, "2026-11-27T08:00:00.000Z"), dataUrl);
  assert.equal(appendImageVersion("/images/shop/worship-tee.webp", "2026-11-27T08:00:00.000Z"), "/images/shop/worship-tee.webp");
});

test("normalizeShopProductRow and syncCartWithProducts update stale cart thumbnails with live uploaded images", () => {
  const product = normalizeShopProductRow({
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "KSW Worship Tee",
    description: "Updated shirt",
    category: "Apparel",
    price: "160.00",
    stock: 25,
    image_url: "https://cdn.example.com/new-tee.webp",
    is_active: true,
    updated_at: "2026-11-27T09:00:00.000Z",
  });

  assert.equal(resolveProductImageUrl(product), "https://cdn.example.com/new-tee.webp?v=" + Date.parse("2026-11-27T09:00:00.000Z"));

  const synced = syncCartWithProducts(
    [
      {
        product_id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Old Tee",
        price: 150,
        quantity: 2,
        image_url: "/images/shop/worship-tee.webp",
      },
    ],
    [product]
  );

  assert.equal(synced[0].name, "KSW Worship Tee");
  assert.equal(synced[0].price, 160);
  assert.ok(synced[0].image_url.startsWith("https://cdn.example.com/new-tee.webp?v="));
});

