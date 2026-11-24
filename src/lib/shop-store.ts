import { supabase } from "@/integrations/supabase/client";
import {
  ShopProduct,
  ShopSettings,
  ShopOrder,
  OrderStatus,
  SEED_SHOP_PRODUCTS,
  DEFAULT_SHOP_SETTINGS,
  LOCAL_STORAGE_KEYS,
  readLocalJson,
  writeLocalJson,
} from "@/utils/shop";

function withTimeout<T>(promise: PromiseLike<T>, ms = 2500): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), ms)
    ),
  ]);
}

function isMissingRelationError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || "");
  const msg = String(error.message || "").toLowerCase();
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table")
  );
}

export async function fetchPublicProducts(): Promise<ShopProduct[]> {
  try {
    const { data, error }: any = await withTimeout(
      supabase
        .from("shop_products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
    );

    if (error) {
      if (!isMissingRelationError(error)) {
        console.warn("fetchPublicProducts note:", error.message);
      }
      const local = readLocalJson<ShopProduct[]>(LOCAL_STORAGE_KEYS.PRODUCTS, SEED_SHOP_PRODUCTS);
      return local.filter((p) => p.is_active);
    }

    if (data && data.length > 0) {
      const normalized = data.map((row: any) => ({ ...row, price: Number(row.price) }));
      writeLocalJson(LOCAL_STORAGE_KEYS.PRODUCTS, normalized);
      return normalized;
    }

    const local = readLocalJson<ShopProduct[]>(LOCAL_STORAGE_KEYS.PRODUCTS, SEED_SHOP_PRODUCTS);
    return local.filter((p) => p.is_active);
  } catch {
    const local = readLocalJson<ShopProduct[]>(LOCAL_STORAGE_KEYS.PRODUCTS, SEED_SHOP_PRODUCTS);
    return local.filter((p) => p.is_active);
  }
}

export async function fetchAllAdminProducts(): Promise<ShopProduct[]> {
  try {
    const { data, error }: any = await withTimeout(
      supabase
        .from("shop_products")
        .select("*")
        .order("created_at", { ascending: false })
    );

    if (error) {
      return readLocalJson<ShopProduct[]>(LOCAL_STORAGE_KEYS.PRODUCTS, SEED_SHOP_PRODUCTS);
    }

    if (data && data.length > 0) {
      const normalized = data.map((row: any) => ({ ...row, price: Number(row.price) }));
      writeLocalJson(LOCAL_STORAGE_KEYS.PRODUCTS, normalized);
      return normalized;
    }

    return readLocalJson<ShopProduct[]>(LOCAL_STORAGE_KEYS.PRODUCTS, SEED_SHOP_PRODUCTS);
  } catch {
    return readLocalJson<ShopProduct[]>(LOCAL_STORAGE_KEYS.PRODUCTS, SEED_SHOP_PRODUCTS);
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

async function compressImageToWebP(
  file: File,
  maxDimension = 900,
  quality = 0.84
): Promise<{ blob: Blob; dataUrl: string }> {
  const srcDataUrl = await readFileAsDataUrl(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Invalid image file"));
    img.src = srcDataUrl;
  });

  const scale = Math.min(1, maxDimension / Math.max(img.width || 1, img.height || 1));
  const targetWidth = Math.max(1, Math.round((img.width || maxDimension) * scale));
  const targetHeight = Math.max(1, Math.round((img.height || maxDimension) * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { blob: file, dataUrl: srcDataUrl };
  }
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const webpDataUrl = canvas.toDataURL("image/webp", quality);
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (b) => resolve(b || file),
      "image/webp",
      quality
    );
  });

  return {
    blob,
    dataUrl: webpDataUrl.startsWith("data:image/") ? webpDataUrl : srcDataUrl,
  };
}

/**
 * Compresses a selected product image to WebP and uploads it to the `shop-images`
 * Supabase Storage bucket when available, with a compressed WebP Data URL fallback.
 */
export async function uploadShopProductImage(
  file: File
): Promise<{ url: string; uploadedToStorage: boolean }> {
  const { blob, dataUrl } = await compressImageToWebP(file);
  const filePath = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

  try {
    const { error }: any = await withTimeout(
      supabase.storage
        .from("shop-images")
        .upload(filePath, blob, {
          contentType: "image/webp",
          upsert: true,
        }),
      5000
    );

    if (!error) {
      const { data: pub } = supabase.storage
        .from("shop-images")
        .getPublicUrl(filePath);
      if (pub?.publicUrl) {
        return { url: pub.publicUrl, uploadedToStorage: true };
      }
    }
  } catch {
    // Fall through to compressed WebP Data URL fallback
  }

  return { url: dataUrl, uploadedToStorage: false };
}

export async function upsertShopProduct(
  product: Partial<ShopProduct> & { name: string; price: number }
): Promise<{ saved: ShopProduct; syncedToDb: boolean }> {
  const payload = {
    name: product.name.trim(),
    description: (product.description || "").trim(),
    category: (product.category || "Apparel").trim(),
    price: Math.max(0, Number(product.price) || 0),
    stock: Math.max(0, Math.floor(Number(product.stock) || 0)),
    image_url: (product.image_url || "/images/shop/worship-tee.webp").trim(),
    is_active: product.is_active ?? true,
  };

  let syncedToDb = false;
  let savedRow: ShopProduct = {
    id: product.id || `ksw-prod-${Date.now()}`,
    ...payload,
    created_at: product.created_at || new Date().toISOString(),
  };

  try {
    if (product.id && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(product.id)) {
      const { data, error }: any = await withTimeout(
        supabase
          .from("shop_products")
          .update(payload)
          .eq("id", product.id)
          .select()
          .single()
      );
      if (!error && data) {
        savedRow = { ...data, price: Number(data.price) };
        syncedToDb = true;
      }
    } else {
      const { data, error }: any = await withTimeout(
        supabase
          .from("shop_products")
          .insert(payload)
          .select()
          .single()
      );
      if (!error && data) {
        savedRow = { ...data, price: Number(data.price) };
        syncedToDb = true;
      }
    }
  } catch {
    syncedToDb = false;
  }

  const current = readLocalJson<ShopProduct[]>(LOCAL_STORAGE_KEYS.PRODUCTS, SEED_SHOP_PRODUCTS);
  const existsIdx = current.findIndex((p) => p.id === product.id || p.id === savedRow.id);
  const updated =
    existsIdx >= 0
      ? current.map((p, i) => (i === existsIdx ? savedRow : p))
      : [savedRow, ...current];
  writeLocalJson(LOCAL_STORAGE_KEYS.PRODUCTS, updated);

  return { saved: savedRow, syncedToDb };
}

export async function deleteShopProduct(id: string): Promise<{ syncedToDb: boolean }> {
  let syncedToDb = false;
  try {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id)) {
      const { error }: any = await withTimeout(
        supabase.from("shop_products").delete().eq("id", id)
      );
      if (!error) syncedToDb = true;
    }
  } catch {
    syncedToDb = false;
  }

  const current = readLocalJson<ShopProduct[]>(LOCAL_STORAGE_KEYS.PRODUCTS, SEED_SHOP_PRODUCTS);
  writeLocalJson(
    LOCAL_STORAGE_KEYS.PRODUCTS,
    current.filter((p) => p.id !== id)
  );
  return { syncedToDb };
}

export async function fetchShopSettings(): Promise<ShopSettings> {
  try {
    const { data, error }: any = await withTimeout(
      (supabase as any).rpc("get_public_shop_settings")
    );

    if (error || !data || data.length === 0) {
      return readLocalJson<ShopSettings>(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SHOP_SETTINGS);
    }

    const normalized: ShopSettings = {
      id: data[0].id,
      whatsapp_number: data[0].whatsapp_number || DEFAULT_SHOP_SETTINGS.whatsapp_number,
      store_notice: data[0].store_notice || DEFAULT_SHOP_SETTINGS.store_notice,
      updated_at: data[0].updated_at,
    };
    writeLocalJson(LOCAL_STORAGE_KEYS.SETTINGS, normalized);
    return normalized;
  } catch {
    return readLocalJson<ShopSettings>(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SHOP_SETTINGS);
  }
}

export async function saveShopSettings(
  settings: ShopSettings
): Promise<{ saved: ShopSettings; syncedToDb: boolean }> {
  const payload = {
    whatsapp_number: settings.whatsapp_number.trim(),
    store_notice: settings.store_notice.trim(),
  };

  let syncedToDb = false;
  let savedRow: ShopSettings = {
    ...settings,
    ...payload,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data: existing }: any = await withTimeout(
      supabase
        .from("shop_settings")
        .select("id")
        .limit(1)
    );

    if (existing && existing.length > 0) {
      const { data, error }: any = await withTimeout(
        supabase
          .from("shop_settings")
          .update(payload)
          .eq("id", existing[0].id)
          .select("id, whatsapp_number, store_notice, updated_at")
          .single()
      );
      if (!error && data) {
        savedRow = data;
        syncedToDb = true;
      }
    } else {
      const { data, error }: any = await withTimeout(
        supabase
          .from("shop_settings")
          .insert(payload)
          .select("id, whatsapp_number, store_notice, updated_at")
          .single()
      );
      if (!error && data) {
        savedRow = data;
        syncedToDb = true;
      }
    }
  } catch {
    syncedToDb = false;
  }

  writeLocalJson(LOCAL_STORAGE_KEYS.SETTINGS, savedRow);
  return { saved: savedRow, syncedToDb };
}

export async function submitShopOrder(order: ShopOrder): Promise<{ syncedToDb: boolean }> {
  let syncedToDb = false;
  try {
    const { error }: any = await withTimeout(
      supabase.from("shop_orders").insert({
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        customer_email: order.customer_email || null,
        delivery_address: order.delivery_address,
        delivery_city: order.delivery_city,
        delivery_notes: order.delivery_notes || null,
        items: order.items as any,
        total_amount: order.total_amount,
        payment_method: order.payment_method || "whatsapp",
        payment_reference: order.payment_reference || null,
        payment_confirmed: Boolean(order.payment_confirmed),
        payment_confirmed_at: order.payment_confirmed_at || null,
        status: order.status,
        whatsapp_notified: order.whatsapp_notified,
      })
    );
    if (!error) {
      syncedToDb = true;
    } else if (!isMissingRelationError(error)) {
      console.warn("submitShopOrder note:", error.message);
    }
  } catch {
    syncedToDb = false;
  }

  const localOrders = readLocalJson<ShopOrder[]>(LOCAL_STORAGE_KEYS.ORDERS, []);
  writeLocalJson(LOCAL_STORAGE_KEYS.ORDERS, [order, ...localOrders]);

  // Decrement stock in local cache immediately
  const localProducts = readLocalJson<ShopProduct[]>(LOCAL_STORAGE_KEYS.PRODUCTS, SEED_SHOP_PRODUCTS);
  const updatedProducts = localProducts.map((p) => {
    const match = order.items.find((i) => i.product_id === p.id);
    if (!match) return p;
    return { ...p, stock: Math.max(0, p.stock - match.quantity) };
  });
  writeLocalJson(LOCAL_STORAGE_KEYS.PRODUCTS, updatedProducts);

  return { syncedToDb };
}

export const submitConfirmedOrder = submitShopOrder;

export async function fetchAllShopOrders(): Promise<ShopOrder[]> {
  try {
    const { data, error }: any = await withTimeout(
      supabase
        .from("shop_orders")
        .select("*")
        .order("created_at", { ascending: false })
    );

    if (error) {
      return readLocalJson<ShopOrder[]>(LOCAL_STORAGE_KEYS.ORDERS, []);
    }

    const normalized: ShopOrder[] = (data || []).map((row: any) => ({
      ...row,
      total_amount: Number(row.total_amount),
      payment_method: (row.payment_method as ShopOrder["payment_method"]) || "whatsapp",
      status: (row.status as OrderStatus) || "pending_payment",
      items: Array.isArray(row.items) ? (row.items as any) : [],
    }));
    writeLocalJson(LOCAL_STORAGE_KEYS.ORDERS, normalized);
    return normalized;
  } catch {
    return readLocalJson<ShopOrder[]>(LOCAL_STORAGE_KEYS.ORDERS, []);
  }
}

export async function updateShopOrderStatus(
  id: string,
  status: OrderStatus,
  extras?: { payment_confirmed?: boolean; whatsapp_notified?: boolean }
): Promise<{ syncedToDb: boolean }> {
  let syncedToDb = false;
  try {
    const { error }: any = await withTimeout(
      supabase
        .from("shop_orders")
        .update({
          status,
          ...(extras || {}),
        })
        .eq("id", id)
    );
    if (!error) syncedToDb = true;
  } catch {
    syncedToDb = false;
  }

  const orders = readLocalJson<ShopOrder[]>(LOCAL_STORAGE_KEYS.ORDERS, []);
  const nextOrders = orders.map((o) =>
    o.id === id ? { ...o, status, ...(extras || {}) } : o
  );
  writeLocalJson(LOCAL_STORAGE_KEYS.ORDERS, nextOrders);
  return { syncedToDb };
}
