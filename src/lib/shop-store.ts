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
    const { data, error } = await supabase
      .from("shop_products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return readLocalJson<ShopProduct[]>(LOCAL_STORAGE_KEYS.PRODUCTS, SEED_SHOP_PRODUCTS);
    }

    if (data && data.length > 0) {
      const normalized = data.map((row) => ({ ...row, price: Number(row.price) }));
      writeLocalJson(LOCAL_STORAGE_KEYS.PRODUCTS, normalized);
      return normalized;
    }

    return readLocalJson<ShopProduct[]>(LOCAL_STORAGE_KEYS.PRODUCTS, SEED_SHOP_PRODUCTS);
  } catch {
    return readLocalJson<ShopProduct[]>(LOCAL_STORAGE_KEYS.PRODUCTS, SEED_SHOP_PRODUCTS);
  }
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
      const { data, error } = await supabase
        .from("shop_products")
        .update(payload)
        .eq("id", product.id)
        .select()
        .single();
      if (!error && data) {
        savedRow = { ...data, price: Number(data.price) };
        syncedToDb = true;
      }
    } else {
      const { data, error } = await supabase
        .from("shop_products")
        .insert(payload)
        .select()
        .single();
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
      const { error } = await supabase.from("shop_products").delete().eq("id", id);
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
    const { data, error } = await supabase
      .from("shop_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return readLocalJson<ShopSettings>(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SHOP_SETTINGS);
    }

    writeLocalJson(LOCAL_STORAGE_KEYS.SETTINGS, data[0]);
    return data[0];
  } catch {
    return readLocalJson<ShopSettings>(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SHOP_SETTINGS);
  }
}

export async function saveShopSettings(settings: ShopSettings): Promise<{ saved: ShopSettings; syncedToDb: boolean }> {
  const payload = {
    momo_number: settings.momo_number.trim(),
    momo_account_name: settings.momo_account_name.trim(),
    momo_network: settings.momo_network.trim(),
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
    const { data: existing } = await supabase
      .from("shop_settings")
      .select("id")
      .limit(1);

    if (existing && existing.length > 0) {
      const { data, error } = await supabase
        .from("shop_settings")
        .update(payload)
        .eq("id", existing[0].id)
        .select()
        .single();
      if (!error && data) {
        savedRow = data;
        syncedToDb = true;
      }
    } else {
      const { data, error } = await supabase
        .from("shop_settings")
        .insert(payload)
        .select()
        .single();
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

export async function submitConfirmedOrder(order: ShopOrder): Promise<{ syncedToDb: boolean }> {
  let syncedToDb = false;
  try {
    const { error } = await supabase.from("shop_orders").insert({
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
      payment_method: order.payment_method,
      payment_reference: order.payment_reference || null,
      momo_network: order.momo_network || null,
      payment_confirmed: order.payment_confirmed,
      payment_confirmed_at: order.payment_confirmed_at || new Date().toISOString(),
      status: order.status,
      whatsapp_notified: order.whatsapp_notified,
    });
    if (!error) {
      syncedToDb = true;
    } else if (!isMissingRelationError(error)) {
      console.warn("submitConfirmedOrder note:", error.message);
    }
  } catch {
    syncedToDb = false;
  }

  const localOrders = readLocalJson<ShopOrder[]>(LOCAL_STORAGE_KEYS.ORDERS, []);
  writeLocalJson(LOCAL_STORAGE_KEYS.ORDERS, [order, ...localOrders]);

  // Also decrement stock in local cache immediately
  const localProducts = readLocalJson<ShopProduct[]>(LOCAL_STORAGE_KEYS.PRODUCTS, SEED_SHOP_PRODUCTS);
  const updatedProducts = localProducts.map((p) => {
    const match = order.items.find((i) => i.product_id === p.id);
    if (!match) return p;
    return { ...p, stock: Math.max(0, p.stock - match.quantity) };
  });
  writeLocalJson(LOCAL_STORAGE_KEYS.PRODUCTS, updatedProducts);

  return { syncedToDb };
}

export async function fetchAllShopOrders(): Promise<ShopOrder[]> {
  try {
    const { data, error } = await supabase
      .from("shop_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return readLocalJson<ShopOrder[]>(LOCAL_STORAGE_KEYS.ORDERS, []);
    }

    const normalized: ShopOrder[] = (data || []).map((row) => ({
      ...row,
      total_amount: Number(row.total_amount),
      payment_method: (row.payment_method as "momo" | "card") || "momo",
      status: (row.status as OrderStatus) || "payment_confirmed",
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
    const { error } = await supabase
      .from("shop_orders")
      .update({
        status,
        ...(extras || {}),
      })
      .eq("id", id);
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
