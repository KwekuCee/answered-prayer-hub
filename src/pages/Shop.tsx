import React, { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  MessageSquare,
  Truck,
  Package,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  CartItem,
  ShopOrder,
  ShopProduct,
  LOCAL_STORAGE_KEYS,
  calculateCartItemCount,
  calculateCartTotal,
  formatGHS,
  generateOrderNumber,
  validateDeliveryForm,
  buildWhatsAppOrderMessage,
  buildWhatsAppUrl,
  resolveProductImageUrl,
  syncCartWithProducts,
  readLocalJson,
  writeLocalJson,
} from "@/utils/shop";
import {
  fetchPublicProducts,
  fetchShopSettings,
  submitShopOrder,
} from "@/lib/shop-store";

type CheckoutStep = "delivery" | "whatsapp";

function createUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const ProductThumbnail: React.FC<{ src: string; alt: string; className?: string }> = ({
  src,
  alt,
  className = "",
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed || !src) {
    return (
      <div className={`flex flex-col items-center justify-center bg-zinc-900/90 text-gold/70 ${className}`}>
        <Package className="w-10 h-10 mb-2 opacity-60" />
        <span className="text-[11px] font-body uppercase tracking-wider text-muted-foreground">KSW Store</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${className}`}
    />
  );
};

const Shop = () => {
  const queryClient = useQueryClient();

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["shop-products-public"],
    queryFn: fetchPublicProducts,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  });

  const { data: settings } = useQuery({
    queryKey: ["shop-settings-public"],
    queryFn: fetchShopSettings,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  });

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>(() =>
    readLocalJson<CartItem[]>(LOCAL_STORAGE_KEYS.CART, [])
  );

  const [isBagOpen, setIsBagOpen] = useState(false);
  const [inspectingProduct, setInspectingProduct] = useState<ShopProduct | null>(null);
  const [inspectQty, setInspectQty] = useState(1);

  // Checkout Modal State
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("delivery");
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);
  const [isDirectBuy, setIsDirectBuy] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("Accra");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [formError, setFormError] = useState<string>("");

  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<ShopOrder | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    writeLocalJson(LOCAL_STORAGE_KEYS.CART, cart);
  }, [cart]);

  useEffect(() => {
    if (products.length > 0) {
      setCart((prev) => syncCartWithProducts(prev, products));
    }
  }, [products]);

  useEffect(() => {
    if (typeof supabase.channel !== "function") return;
    const channel = supabase
      .channel("public-shop-catalog-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shop_products" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shop-products-public"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shop_settings" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shop-settings-public"] });
        }
      )
      .subscribe();

    return () => {
      if (typeof supabase.removeChannel === "function") {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return ["All", ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const catOk = selectedCategory === "All" || p.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const searchOk =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return catOk && searchOk;
    });
  }, [products, selectedCategory, searchQuery]);

  const bagCount = useMemo(() => calculateCartItemCount(cart), [cart]);
  const bagTotal = useMemo(() => calculateCartTotal(cart), [cart]);
  const checkoutTotal = useMemo(() => calculateCartTotal(checkoutItems), [checkoutItems]);

  const copyValue = (key: string, value: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(value).catch(() => {});
    }
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
  };

  const addToBag = (product: ShopProduct, quantity = 1) => {
    if (product.stock <= 0) {
      toast.error("This item is currently out of stock.");
      return;
    }
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product_id === product.id);
      if (idx >= 0) {
        return prev.map((item, i) =>
          i === idx
            ? { ...item, quantity: Math.min(product.stock, item.quantity + quantity) }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: Math.min(product.stock, Math.max(1, quantity)),
          image_url: resolveProductImageUrl(product),
        },
      ];
    });
    toast.success(`${product.name} added to bag`);
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product_id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const openBuyNow = (product: ShopProduct, qty = 1) => {
    if (product.stock <= 0) {
      toast.error("This item is currently out of stock.");
      return;
    }
    setInspectingProduct(null);
    setCheckoutItems([
      {
        product_id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: Math.min(product.stock, Math.max(1, qty)),
        image_url: resolveProductImageUrl(product),
      },
    ]);
    setIsDirectBuy(true);
    setCheckoutStep("delivery");
    setFormError("");
    setConfirmedOrder(null);
    setCheckoutOpen(true);
  };

  const openBagCheckout = () => {
    if (cart.length === 0) return;
    setIsBagOpen(false);
    setCheckoutItems(cart);
    setIsDirectBuy(false);
    setCheckoutStep("delivery");
    setFormError("");
    setConfirmedOrder(null);
    setCheckoutOpen(true);
  };

  const handlePlaceOrderForWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateDeliveryForm({
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      delivery_address: deliveryAddress,
      delivery_city: deliveryCity,
      delivery_notes: deliveryNotes,
    });
    if (!validation.valid) {
      setFormError(validation.errors[0]);
      toast.error(validation.errors[0]);
      return;
    }

    setFormError("");
    setSubmittingOrder(true);
    try {
      const orderNumber = generateOrderNumber();
      const nowIso = new Date().toISOString();
      const order: ShopOrder = {
        id: createUuid(),
        order_number: orderNumber,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || null,
        delivery_address: deliveryAddress.trim(),
        delivery_city: deliveryCity.trim(),
        delivery_notes: deliveryNotes.trim() || null,
        items: checkoutItems,
        total_amount: checkoutTotal,
        payment_method: "whatsapp",
        payment_reference: null,
        payment_confirmed: false,
        payment_confirmed_at: null,
        status: "pending_payment",
        whatsapp_notified: true,
        created_at: nowIso,
      };

      await submitShopOrder(order);

      if (!isDirectBuy) {
        setCart([]);
      }

      setConfirmedOrder(order);
      setCheckoutStep("whatsapp");
      queryClient.invalidateQueries({ queryKey: ["shop-products-public"] });
      queryClient.invalidateQueries({ queryKey: ["admin-shop-orders"] });
      toast.success("Order saved! Tap Complete Order on WhatsApp to finalize.");
    } catch {
      toast.error("Could not place order. Please try again.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const activeWhatsappNumber = settings?.whatsapp_number || "233240000000";

  const whatsappUrl = useMemo(() => {
    if (!confirmedOrder) return "#";
    return buildWhatsAppUrl(activeWhatsappNumber, confirmedOrder);
  }, [confirmedOrder, activeWhatsappNumber]);

  const whatsappPreviewText = useMemo(() => {
    if (!confirmedOrder) return "";
    return buildWhatsAppOrderMessage(confirmedOrder);
  }, [confirmedOrder]);

  return (
    <div className="min-h-screen bg-background relative selection:bg-gold/30 selection:text-gold-light flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 md:pt-32 pb-20 px-4 md:px-8 max-w-7xl w-full mx-auto">
        {/* Editorial Storefront Header */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-3xl border border-gold/25 bg-card/60 backdrop-blur-xl p-6 md:p-10 mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6"
        >
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs uppercase tracking-[0.28em] font-semibold text-gold">
              Official Worship Store
            </p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground leading-[1.08]">
              Sanctuary Editions &amp;{" "}
              <span className="bg-gradient-gold bg-clip-text text-transparent">Commemoratives</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground font-body leading-relaxed">
              {settings?.store_notice ||
                "Select any item, enter your delivery details, and complete your order directly on WhatsApp to arrange payment and manual physical delivery."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground border border-border/60 bg-background/60 rounded-full px-4 py-2">
              <Truck className="w-4 h-4 text-gold" />
              <span>Manual Physical Delivery</span>
            </div>
            <Button
              onClick={() => setIsBagOpen(true)}
              data-testid="open-bag-btn"
              className="rounded-full bg-gradient-gold text-navy font-bold shadow-gold px-5 gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Bag</span>
              <span className="tabular-nums px-1.5 py-0.5 rounded-full bg-navy/15 text-navy text-xs font-extrabold">
                {bagCount}
              </span>
            </Button>
          </div>
        </motion.section>

        {/* Category Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold font-body transition-all ${
                    active
                      ? "bg-gradient-gold text-navy shadow-gold"
                      : "bg-card/70 border border-border/60 text-foreground/80 hover:border-gold/50 hover:text-gold"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search merchandise..."
              aria-label="Search store products"
              className="pl-10 rounded-full bg-card/70 border-border/60"
            />
          </div>
        </div>

        {/* Product Catalog Grid */}
        {productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="rounded-3xl border border-border/50 bg-card/50 h-[400px] animate-pulse"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/60 bg-card/40 py-20 text-center space-y-3">
            <Package className="w-10 h-10 text-gold/60 mx-auto" />
            <h2 className="font-display text-xl font-bold text-foreground">No matching items</h2>
            <p className="text-sm text-muted-foreground font-body">
              Try clearing your search or choosing another category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const outOfStock = product.stock <= 0;
              return (
                <article
                  key={product.id}
                  data-testid={`product-card-${product.id}`}
                  className="group rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl overflow-hidden flex flex-col hover:border-gold/45 hover:shadow-gold/10 transition-all duration-300"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setInspectQty(1);
                      setInspectingProduct(product);
                    }}
                    className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-950 text-left focus:outline-none"
                  >
                    <ProductThumbnail src={resolveProductImageUrl(product)} alt={product.name} />
                    {outOfStock && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-background/90 text-destructive text-[11px] font-semibold border border-destructive/40">
                        Sold Out
                      </span>
                    )}
                  </button>

                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wider text-gold/90 font-semibold">
                        <span>{product.category}</span>
                        <span className="tabular-nums text-muted-foreground font-normal">
                          {product.stock > 0 ? `${product.stock} in stock` : "Unavailable"}
                        </span>
                      </div>
                      <h2
                        onClick={() => {
                          setInspectQty(1);
                          setInspectingProduct(product);
                        }}
                        className="font-display font-bold text-lg text-foreground leading-snug cursor-pointer group-hover:text-gold transition-colors line-clamp-2"
                      >
                        {product.name}
                      </h2>
                      <p className="text-xs text-muted-foreground font-body line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-border/40">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-muted-foreground font-body">Price</span>
                        <span className="text-xl font-display font-bold text-foreground tabular-nums">
                          {formatGHS(product.price)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={outOfStock}
                          onClick={() => addToBag(product, 1)}
                          className="rounded-xl border-border/70 hover:border-gold hover:text-gold text-xs"
                        >
                          Add to Bag
                        </Button>
                        <Button
                          size="sm"
                          disabled={outOfStock}
                          onClick={() => openBuyNow(product, 1)}
                          className="rounded-xl bg-gradient-gold text-navy font-bold text-xs shadow-gold"
                        >
                          Buy Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Product Detail Quick View Modal */}
      <Dialog open={!!inspectingProduct} onOpenChange={(open) => !open && setInspectingProduct(null)}>
        <DialogContent className="sm:max-w-2xl bg-card border-gold/30 rounded-3xl p-0 overflow-hidden">
          {inspectingProduct && (
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="aspect-[4/3] md:aspect-auto md:h-full bg-zinc-950">
                <ProductThumbnail
                  src={resolveProductImageUrl(inspectingProduct)}
                  alt={inspectingProduct.name}
                />
              </div>
              <div className="p-6 md:p-7 flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <DialogHeader className="text-left space-y-1">
                    <span className="text-xs uppercase tracking-widest text-gold font-semibold">
                      {inspectingProduct.category}
                    </span>
                    <DialogTitle className="font-display text-2xl font-bold text-foreground">
                      {inspectingProduct.name}
                    </DialogTitle>
                    <DialogDescription className="text-sm font-body text-muted-foreground leading-relaxed pt-1">
                      {inspectingProduct.description}
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-2xl font-display font-bold text-foreground tabular-nums">
                      {formatGHS(inspectingProduct.price)}
                    </span>
                    <div className="flex items-center gap-2 border border-border/70 rounded-full px-2 py-1">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => setInspectQty((q) => Math.max(1, q - 1))}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">
                        {inspectQty}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() =>
                          setInspectQty((q) => Math.min(inspectingProduct.stock || 1, q + 1))
                        }
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <Button
                      variant="outline"
                      disabled={inspectingProduct.stock <= 0}
                      onClick={() => {
                        addToBag(inspectingProduct, inspectQty);
                        setInspectingProduct(null);
                      }}
                      className="rounded-xl"
                    >
                      Add to Bag
                    </Button>
                    <Button
                      disabled={inspectingProduct.stock <= 0}
                      onClick={() => openBuyNow(inspectingProduct, inspectQty)}
                      className="rounded-xl bg-gradient-gold text-navy font-bold shadow-gold"
                    >
                      Buy Now · {formatGHS(inspectingProduct.price * inspectQty)}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Slide-Over Bag Drawer */}
      <AnimatePresence>
        {isBagOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBagOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="relative z-10 w-full max-w-md bg-background border-l border-gold/25 h-full flex flex-col shadow-2xl"
              aria-label="Shopping Bag"
            >
              <div className="p-6 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-5 h-5 text-gold" />
                  <h2 className="font-display font-bold text-xl">Your Bag ({bagCount})</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsBagOpen(false)} aria-label="Close bag">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <ShoppingBag className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                    <p className="text-sm text-muted-foreground font-body">Your shopping bag is empty.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.product_id}
                      className="flex items-center gap-3.5 p-3 rounded-2xl border border-border/60 bg-card/60"
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="w-16 h-16 rounded-xl object-cover shrink-0 bg-zinc-900"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-semibold text-sm truncate text-foreground">
                          {item.name}
                        </p>
                        <p className="text-xs text-gold font-semibold tabular-nums mt-0.5">
                          {formatGHS(item.price)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product_id, -1)}
                            className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-xs hover:border-gold"
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-semibold tabular-nums w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product_id, 1)}
                            className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-xs hover:border-gold"
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.product_id, -item.quantity)}
                        className="text-muted-foreground hover:text-destructive p-1.5"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-border/60 bg-card/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground font-body">Subtotal</span>
                    <span className="text-2xl font-display font-bold text-foreground tabular-nums">
                      {formatGHS(bagTotal)}
                    </span>
                  </div>
                  <Button
                    onClick={openBagCheckout}
                    className="w-full h-12 rounded-2xl bg-gradient-gold text-navy font-bold shadow-gold gap-2"
                  >
                    Proceed to Checkout <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Two-Step Checkout Modal: Delivery Details -> Complete Order on WhatsApp */}
      <Dialog open={checkoutOpen} onOpenChange={(open) => !submittingOrder && setCheckoutOpen(open)}>
        <DialogContent className="sm:max-w-xl bg-card border-gold/30 rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
              {checkoutStep === "delivery" && "Step 1 of 2 · Delivery Details"}
              {checkoutStep === "whatsapp" && "Step 2 of 2 · Complete on WhatsApp"}
            </div>
            <DialogTitle className="font-display text-2xl font-bold text-foreground">
              {checkoutStep === "delivery" && "Where should we deliver?"}
              {checkoutStep === "whatsapp" && "Complete Your Order on WhatsApp"}
            </DialogTitle>
            <DialogDescription className="text-xs font-body text-muted-foreground">
              {checkoutStep === "delivery" &&
                "Enter your contact and physical delivery location, then continue to WhatsApp to complete payment and dispatch."}
              {checkoutStep === "whatsapp" &&
                "Tap the WhatsApp button below to open WhatsApp with your full order message pre-filled for payment and delivery arrangement."}
            </DialogDescription>
          </DialogHeader>

          {/* Order Items Summary Strip */}
          {checkoutStep === "delivery" && (
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4 space-y-2">
              {checkoutItems.map((item) => (
                <div key={item.product_id} className="flex items-center justify-between text-xs">
                  <span className="text-foreground/90 font-medium truncate pr-2">
                    {item.name} × <span className="tabular-nums">{item.quantity}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatGHS(item.price * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Due
                </span>
                <span className="text-lg font-display font-bold text-gold tabular-nums">
                  {formatGHS(checkoutTotal)}
                </span>
              </div>
            </div>
          )}

          {/* Step 1: Delivery Details */}
          {checkoutStep === "delivery" && (
            <form onSubmit={handlePlaceOrderForWhatsApp} className="space-y-4">
              {formError && (
                <p role="alert" className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2">
                  {formError}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="checkout-name" className="text-xs">Full Name *</Label>
                  <Input
                    id="checkout-name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Kwame Mensah"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="checkout-phone" className="text-xs">Phone / WhatsApp *</Label>
                  <Input
                    id="checkout-phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="024 123 4567"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="checkout-email" className="text-xs">Email (Optional)</Label>
                  <Input
                    id="checkout-email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="kwame@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="checkout-city" className="text-xs">City / Area *</Label>
                  <Input
                    id="checkout-city"
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    placeholder="Accra (e.g. Korle Bu / Dansoman)"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="checkout-address" className="text-xs">Delivery Address / Landmark *</Label>
                <Input
                  id="checkout-address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="House number, street name, or digital address (GPS)"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="checkout-notes" className="text-xs">Delivery Instructions (Optional)</Label>
                <Textarea
                  id="checkout-notes"
                  rows={2}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Preferred delivery window or gate instructions..."
                />
              </div>

              <Button
                type="submit"
                disabled={submittingOrder}
                data-testid="submit-delivery-order-btn"
                className="w-full h-11 rounded-2xl bg-gradient-gold text-navy font-bold shadow-gold gap-2"
              >
                {submittingOrder ? "Preparing Order..." : "Continue & Complete Order on WhatsApp"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          {/* Step 2: Direct WhatsApp Order Launch */}
          {checkoutStep === "whatsapp" && confirmedOrder && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 flex items-start gap-3.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-display font-bold text-base text-foreground">
                    Order Recorded · {confirmedOrder.order_number}
                  </p>
                  <p className="text-xs text-muted-foreground font-body leading-relaxed">
                    Order total: <strong className="text-foreground">{formatGHS(confirmedOrder.total_amount)}</strong>. Click below to open WhatsApp and send your order directly to our team for payment follow-up and manual physical delivery.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/70 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gold">
                    WhatsApp Order Message Preview
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    To: +{activeWhatsappNumber.replace(/\D/g, "")}
                  </span>
                </div>
                <pre className="text-[11px] font-mono whitespace-pre-wrap text-foreground/85 bg-card/80 p-3 rounded-xl border border-border/50 max-h-48 overflow-y-auto">
                  {whatsappPreviewText}
                </pre>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="whatsapp-order-link"
                  className="flex-1 inline-flex items-center justify-center gap-2 h-12 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors shadow-lg"
                >
                  <MessageSquare className="w-4 h-4" /> Complete Order on WhatsApp
                </a>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => copyValue("wa-msg", whatsappPreviewText)}
                  className="h-12 rounded-2xl gap-1.5 hover:bg-zinc-900 hover:text-foreground"
                >
                  {copiedKey === "wa-msg" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  Copy Message
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setCheckoutOpen(false)}
                className="w-full h-11 rounded-2xl border-border/70 bg-transparent hover:bg-zinc-900 hover:text-foreground text-xs text-muted-foreground"
              >
                Return to Storefront
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Shop;
