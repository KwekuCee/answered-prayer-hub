export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  image_url: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShopSettings {
  id?: string;
  whatsapp_number: string;
  store_notice: string;
  updated_at?: string;
}

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
}

export type OrderStatus =
  | "pending_payment"
  | "payment_confirmed"
  | "processing"
  | "dispatched"
  | "delivered"
  | "cancelled";

export interface ShopOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  delivery_address: string;
  delivery_city: string;
  delivery_notes?: string | null;
  items: CartItem[];
  total_amount: number;
  payment_method: "whatsapp" | "momo" | "card";
  payment_reference?: string | null;
  payment_confirmed: boolean;
  payment_confirmed_at?: string | null;
  status: OrderStatus;
  whatsapp_notified: boolean;
  created_at: string;
}

export interface DeliveryFormInput {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address: string;
  delivery_city: string;
  delivery_notes?: string;
}

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  id: "default-shop-settings",
  whatsapp_number: "233240000000",
  store_notice:
    "Place your order with your delivery details and complete it directly on WhatsApp for payment & manual physical delivery.",
};

export const SEED_SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: "ksw-prod-tee-01",
    name: "KSW 2026 Royal Crest Worship Tee",
    description:
      "Heavyweight 240gsm organic black cotton crewneck finished with a metallic gold worship crest. Tailored for comfort during all-night praise sessions.",
    category: "Apparel",
    price: 150,
    stock: 80,
    image_url: "/images/shop/worship-tee.webp",
    is_active: true,
  },
  {
    id: "ksw-prod-journal-02",
    name: "Covenant Hardcover Prayer Journal",
    description:
      "Charcoal linen hardcover devotional & sermon journal with gold foil trim, satin ribbon marker, and 200 ruled reflection pages.",
    category: "Publications",
    price: 95,
    stock: 60,
    image_url: "/images/shop/devotional-journal.webp",
    is_active: true,
  },
  {
    id: "ksw-prod-tote-03",
    name: "Sanctuary Canvas Carry Tote",
    description:
      "Structured heavyweight black and natural canvas tote featuring brushed brass clasp hardware—built for Bibles, devotionals, and study notes.",
    category: "Accessories",
    price: 120,
    stock: 45,
    image_url: "/images/shop/worship-tote.webp",
    is_active: true,
  },
  {
    id: "ksw-prod-cap-04",
    name: "KSW Embroidered Cap & Wristband Set",
    description:
      "Structured matte black cotton cap with raised gold embroidery paired with an engraved commemorative worship wristband.",
    category: "Accessories",
    price: 85,
    stock: 100,
    image_url: "/images/shop/commemorative-cap.webp",
    is_active: true,
  },
];

export const LOCAL_STORAGE_KEYS = {
  PRODUCTS: "ksw_shop_products_v1",
  SETTINGS: "ksw_shop_settings_v2",
  ORDERS: "ksw_shop_orders_v1",
  CART: "ksw_shop_cart_v1",
} as const;

export function formatGHS(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `₵${safeAmount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
    const price = Math.max(0, Number(item.price) || 0);
    return sum + price * qty;
  }, 0);
}

export function calculateCartItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + Math.max(0, Math.floor(Number(item.quantity) || 0)), 0);
}

/**
 * Normalizes a phone/WhatsApp number into pure digits suitable for `https://wa.me/<digits>`.
 * Handles Ghanaian local numbers (e.g., `0241234567` -> `233241234567`) as well as full E.164 inputs.
 */
export function normalizeWhatsAppNumber(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `233${digits.slice(1)}`;
  }
  if (digits.length === 9 && !digits.startsWith("233")) {
    return `233${digits}`;
  }
  return digits;
}

export function generateOrderNumber(now: Date = new Date(), randomSuffix?: string): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const suffix =
    randomSuffix ||
    Math.random().toString(36).substring(2, 6).toUpperCase();
  return `KSW-${yyyy}${mm}${dd}-${suffix}`;
}

export function validateDeliveryForm(input: DeliveryFormInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.customer_name || input.customer_name.trim().length < 2) {
    errors.push("Full name is required.");
  }
  const phoneDigits = (input.customer_phone || "").replace(/\D/g, "");
  if (phoneDigits.length < 7) {
    errors.push("Please enter a valid contact phone number.");
  }
  if (!input.delivery_address || input.delivery_address.trim().length < 4) {
    errors.push("Delivery street address or landmark is required.");
  }
  if (!input.delivery_city || input.delivery_city.trim().length < 2) {
    errors.push("Delivery city or area is required.");
  }
  if (input.customer_email && input.customer_email.trim().length > 0) {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customer_email.trim());
    if (!emailOk) errors.push("Please provide a valid email address.");
  }
  return { valid: errors.length === 0, errors };
}

export function buildWhatsAppOrderMessage(
  order: Pick<
    ShopOrder,
    | "order_number"
    | "customer_name"
    | "customer_phone"
    | "customer_email"
    | "delivery_address"
    | "delivery_city"
    | "delivery_notes"
    | "items"
    | "total_amount"
  >
): string {
  const itemLines = order.items
    .map((item) => `• ${item.name} x${item.quantity} — ${formatGHS(item.price * item.quantity)}`)
    .join("\n");

  const lines = [
    `*NEW ORDER — KORLE BU STANDS IN WORSHIP SHOP*`,
    `Order Ref: *${order.order_number}*`,
    `Status: *Awaiting Payment Follow-up & Manual Delivery*`,
    ``,
    `*ITEMS ORDERED:*`,
    itemLines,
    `*Total Amount: ${formatGHS(order.total_amount)}*`,
    ``,
    `*DELIVERY DETAILS:*`,
    `Recipient: ${order.customer_name}`,
    `Phone: ${order.customer_phone}`,
    order.customer_email ? `Email: ${order.customer_email}` : null,
    `Location/Area: ${order.delivery_city}`,
    `Address/Landmark: ${order.delivery_address}`,
    order.delivery_notes ? `Notes: ${order.delivery_notes}` : null,
    ``,
    `Hello! I would like to complete payment and arrange physical delivery for this order.`,
  ].filter((l) => l !== null);

  return lines.join("\n");
}

export function buildWhatsAppUrl(
  whatsappNumber: string,
  order: Parameters<typeof buildWhatsAppOrderMessage>[0]
): string {
  const normalized = normalizeWhatsAppNumber(whatsappNumber);
  const message = encodeURIComponent(buildWhatsAppOrderMessage(order));
  return normalized ? `https://wa.me/${normalized}?text=${message}` : `https://wa.me/?text=${message}`;
}

export function readLocalJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeLocalJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota limits
  }
}

export function isUuid(value?: string | null): boolean {
  return Boolean(
    value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
}

/**
 * Appends a version cache-buster query param (`v=...`) to remote HTTP/HTTPS
 * product image URLs using the product's `updated_at` timestamp so mobile,
 * tablet, and desktop browsers never hold onto stale CDN/browser cached images.
 * Leaves `data:`, `blob:`, and relative static paths untouched.
 */
export function appendImageVersion(imageUrl?: string | null, version?: string | null): string {
  const trimmed = (imageUrl || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:") || !/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const versionTag = (version || "").trim();
  if (!versionTag) return trimmed;

  const parsedMs = Date.parse(versionTag);
  const token = Number.isFinite(parsedMs) ? String(parsedMs) : versionTag.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!token) return trimmed;

  try {
    const url = new URL(trimmed);
    url.searchParams.set("v", token);
    return url.toString();
  } catch {
    const separator = trimmed.includes("?") ? "&" : "?";
    return `${trimmed}${separator}v=${encodeURIComponent(token)}`;
  }
}

export function resolveProductImageUrl(
  product: Pick<ShopProduct, "image_url" | "updated_at" | "created_at">
): string {
  return appendImageVersion(product.image_url, product.updated_at || product.created_at);
}

export function normalizeShopProductRow(row: any): ShopProduct {
  return {
    id: String(row.id || ""),
    name: String(row.name || ""),
    description: String(row.description || ""),
    category: String(row.category || "Apparel"),
    price: Number(row.price) || 0,
    stock: Math.max(0, Math.floor(Number(row.stock) || 0)),
    image_url: String(row.image_url || ""),
    is_active: row.is_active !== false,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

/**
 * Keeps cart items' display metadata (`name`, `price`, `image_url`) synced with
 * the latest server catalog so items added prior to an image update reflect
 * the newly uploaded product photo.
 */
export function syncCartWithProducts(cart: CartItem[], products: ShopProduct[]): CartItem[] {
  if (!cart.length || !products.length) return cart;
  const byId = new Map(products.map((p) => [p.id, p]));
  let changed = false;

  const next = cart.map((item) => {
    const live = byId.get(item.product_id);
    if (!live) return item;
    const nextImage = resolveProductImageUrl(live);
    const nextPrice = Number(live.price);
    if (
      item.name === live.name &&
      item.price === nextPrice &&
      item.image_url === nextImage
    ) {
      return item;
    }
    changed = true;
    return {
      ...item,
      name: live.name,
      price: nextPrice,
      image_url: nextImage,
    };
  });

  return changed ? next : cart;
}

