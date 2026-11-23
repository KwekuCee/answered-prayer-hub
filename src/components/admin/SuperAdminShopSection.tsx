import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShoppingBag,
  PlusCircle,
  Pencil,
  Trash2,
  Smartphone,
  MessageSquare,
  Truck,
  Save,
  Package,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  OrderStatus,
  ShopProduct,
  ShopSettings,
  DEFAULT_SHOP_SETTINGS,
  SEED_SHOP_PRODUCTS,
  LOCAL_STORAGE_KEYS,
  readLocalJson,
  formatGHS,
  buildWhatsAppUrl,
} from "@/utils/shop";
import {
  fetchAllAdminProducts,
  fetchShopSettings,
  fetchAllShopOrders,
  upsertShopProduct,
  deleteShopProduct,
  saveShopSettings,
  updateShopOrderStatus,
} from "@/lib/shop-store";

const PRESET_PRODUCT_IMAGES = [
  { label: "Royal Crest Worship Tee", url: "/images/shop/worship-tee.webp" },
  { label: "Hardcover Prayer Journal", url: "/images/shop/devotional-journal.webp" },
  { label: "Sanctuary Canvas Tote", url: "/images/shop/worship-tote.webp" },
  { label: "Cap & Wristband Set", url: "/images/shop/commemorative-cap.webp" },
];

const ORDER_STATUS_LABELS: Record<OrderStatus, { label: string; className: string }> = {
  pending_payment: { label: "Pending Payment", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  payment_confirmed: { label: "Paid (MoMo Confirmed)", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  processing: { label: "Packing for Delivery", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  dispatched: { label: "Out for Delivery", className: "bg-gold/15 text-gold border-gold/40" },
  delivered: { label: "Delivered", className: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
  cancelled: { label: "Cancelled", className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

export const SuperAdminShopSection: React.FC = () => {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<"products" | "orders" | "config">("products");

  const { data: products = [] } = useQuery({
    queryKey: ["admin-shop-products"],
    queryFn: fetchAllAdminProducts,
    initialData: () => readLocalJson<ShopProduct[]>(LOCAL_STORAGE_KEYS.PRODUCTS, SEED_SHOP_PRODUCTS),
    retry: false,
  });

  const { data: settings = DEFAULT_SHOP_SETTINGS } = useQuery({
    queryKey: ["admin-shop-settings"],
    queryFn: fetchShopSettings,
    initialData: () => readLocalJson<ShopSettings>(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SHOP_SETTINGS),
    retry: false,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-shop-orders"],
    queryFn: fetchAllShopOrders,
    initialData: () => readLocalJson(LOCAL_STORAGE_KEYS.ORDERS, []),
    retry: false,
  });

  // Payment & WhatsApp Settings form state
  const [draftSettings, setDraftSettings] = useState<ShopSettings | null>(null);
  const currentSettings = draftSettings || settings;
  const [savingConfig, setSavingConfig] = useState(false);

  // Add / Edit Product modal state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<ShopProduct>>({
    name: "",
    description: "",
    category: "Apparel",
    price: 100,
    stock: 50,
    image_url: "/images/shop/worship-tee.webp",
    is_active: true,
  });
  const [savingProduct, setSavingProduct] = useState(false);

  // Orders filter & pagination
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderPage, setOrderPage] = useState(1);
  const ordersPerPage = 10;

  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === "all") return orders;
    return orders.filter((o) => o.status === orderStatusFilter);
  }, [orders, orderStatusFilter]);

  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage));
  const paginatedOrders = useMemo(
    () => filteredOrders.slice((orderPage - 1) * ordersPerPage, orderPage * ordersPerPage),
    [filteredOrders, orderPage]
  );

  const openNewProduct = () => {
    setEditingProduct({
      name: "",
      description: "",
      category: "Apparel",
      price: 100,
      stock: 50,
      image_url: "/images/shop/worship-tee.webp",
      is_active: true,
    });
    setProductModalOpen(true);
  };

  const openEditProduct = (product: ShopProduct) => {
    setEditingProduct({ ...product });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct.name?.trim()) {
      toast.error("Product name is required.");
      return;
    }
    setSavingProduct(true);
    try {
      const { syncedToDb } = await upsertShopProduct({
        ...editingProduct,
        name: editingProduct.name.trim(),
        price: Number(editingProduct.price) || 0,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-shop-products"] });
      await queryClient.invalidateQueries({ queryKey: ["shop-products-public"] });
      toast.success(
        syncedToDb
          ? "Product saved to store catalog!"
          : "Product saved locally (run the Shop SQL migration in Supabase to sync online)."
      );
      setProductModalOpen(false);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Remove this product from the store?")) return;
    await deleteShopProduct(id);
    await queryClient.invalidateQueries({ queryKey: ["admin-shop-products"] });
    await queryClient.invalidateQueries({ queryKey: ["shop-products-public"] });
    toast.success("Product removed.");
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSettings.momo_number.trim() || !currentSettings.whatsapp_number.trim()) {
      toast.error("Both MoMo number and WhatsApp notification number are required.");
      return;
    }
    setSavingConfig(true);
    try {
      const { syncedToDb } = await saveShopSettings(currentSettings);
      await queryClient.invalidateQueries({ queryKey: ["admin-shop-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["shop-settings-public"] });
      setDraftSettings(null);
      toast.success(
        syncedToDb
          ? "MoMo & WhatsApp order settings updated!"
          : "Settings saved locally (apply Shop SQL migration in Supabase to sync across devices)."
      );
    } finally {
      setSavingConfig(false);
    }
  };

  const handleChangeOrderStatus = async (orderId: string, status: OrderStatus) => {
    await updateShopOrderStatus(orderId, status, {
      payment_confirmed: status !== "pending_payment" && status !== "cancelled",
    });
    await queryClient.invalidateQueries({ queryKey: ["admin-shop-orders"] });
    toast.success(`Order updated to "${ORDER_STATUS_LABELS[status].label}"`);
  };

  const confirmedRevenue = useMemo(
    () =>
      orders
        .filter((o) => o.payment_confirmed && o.status !== "cancelled")
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
    [orders]
  );

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/80 backdrop-blur-xl border-border/60 rounded-3xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Active Products</p>
          <p className="text-3xl font-display font-bold text-foreground mt-1 tabular-nums">
            {products.filter((p) => p.is_active).length}
            <span className="text-sm font-normal text-muted-foreground ml-2">/ {products.length} listed</span>
          </p>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/60 rounded-3xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Confirmed Orders</p>
          <p className="text-3xl font-display font-bold text-foreground mt-1 tabular-nums">
            {orders.filter((o) => o.payment_confirmed).length}
          </p>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-gold/30 rounded-3xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">MoMo Revenue</p>
          <p className="text-3xl font-display font-bold text-gold mt-1 tabular-nums">
            {formatGHS(confirmedRevenue)}
          </p>
        </Card>
      </div>

      {/* Sub-navigation pills */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={subTab === "products" ? "default" : "outline"}
            onClick={() => setSubTab("products")}
            className={subTab === "products" ? "bg-gradient-gold text-navy font-bold rounded-2xl" : "rounded-2xl"}
          >
            <Package className="w-4 h-4 mr-2" /> Product Catalog ({products.length})
          </Button>
          <Button
            variant={subTab === "orders" ? "default" : "outline"}
            onClick={() => setSubTab("orders")}
            className={subTab === "orders" ? "bg-gradient-gold text-navy font-bold rounded-2xl" : "rounded-2xl"}
          >
            <Truck className="w-4 h-4 mr-2" /> Orders &amp; Delivery ({orders.length})
          </Button>
          <Button
            variant={subTab === "config" ? "default" : "outline"}
            onClick={() => setSubTab("config")}
            className={subTab === "config" ? "bg-gradient-gold text-navy font-bold rounded-2xl" : "rounded-2xl"}
          >
            <Smartphone className="w-4 h-4 mr-2" /> MoMo &amp; WhatsApp Setup
          </Button>
        </div>

        {subTab === "products" && (
          <Button
            onClick={openNewProduct}
            data-testid="admin-add-product-btn"
            className="bg-gradient-gold text-navy font-bold rounded-2xl gap-2 shadow-gold"
          >
            <PlusCircle className="w-4 h-4" /> List New Product
          </Button>
        )}
      </div>

      {/* SUBTAB 1: PRODUCTS */}
      {subTab === "products" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product) => (
            <Card key={product.id} className="bg-card/80 backdrop-blur-xl border-border/60 rounded-3xl overflow-hidden flex flex-col">
              <div className="aspect-[16/10] bg-zinc-950 relative overflow-hidden">
                <img
                  src={product.image_url}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
                <Badge
                  variant="outline"
                  className={`absolute top-3 left-3 text-[10px] ${
                    product.is_active
                      ? "bg-emerald-950/85 text-emerald-300 border-emerald-500/40"
                      : "bg-zinc-950/85 text-zinc-400 border-zinc-700"
                  }`}
                >
                  {product.is_active ? "Visible in Store" : "Hidden"}
                </Badge>
              </div>
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-gold font-semibold uppercase tracking-wider mb-1">
                    <span>{product.category}</span>
                    <span className="tabular-nums text-muted-foreground">{product.stock} left</span>
                  </div>
                  <h4 className="font-display font-bold text-lg text-foreground leading-snug">{product.name}</h4>
                  <p className="text-xs text-muted-foreground font-body line-clamp-2 mt-1">
                    {product.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                  <span className="text-xl font-display font-bold text-foreground tabular-nums">
                    {formatGHS(product.price)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => openEditProduct(product)}
                      aria-label={`Edit ${product.name}`}
                      className="rounded-xl h-8 w-8"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleDeleteProduct(product.id)}
                      aria-label={`Delete ${product.name}`}
                      className="rounded-xl h-8 w-8 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* SUBTAB 2: ORDERS & PHYSICAL DELIVERY */}
      {subTab === "orders" && (
        <Card className="bg-card/80 backdrop-blur-xl border-border/60 rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50">
            <div>
              <CardTitle className="font-display text-xl">Customer Orders &amp; Manual Delivery</CardTitle>
              <CardDescription className="text-xs">
                Track confirmed MoMo payments and dispatch physical deliveries.
              </CardDescription>
            </div>
            <Select value={orderStatusFilter} onValueChange={(v) => { setOrderStatusFilter(v); setOrderPage(1); }}>
              <SelectTrigger className="w-[210px] rounded-xl bg-zinc-900 border-border/60 text-xs">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="payment_confirmed">Paid (MoMo Confirmed)</SelectItem>
                <SelectItem value="processing">Packing for Delivery</SelectItem>
                <SelectItem value="dispatched">Out for Delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            {paginatedOrders.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <ShoppingBag className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground font-body">No customer orders yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-zinc-900/80 border-b border-border/60">
                  <TableRow>
                    <TableHead className="text-xs uppercase">Order Ref</TableHead>
                    <TableHead className="text-xs uppercase">Customer &amp; Delivery</TableHead>
                    <TableHead className="text-xs uppercase">Items</TableHead>
                    <TableHead className="text-xs uppercase">MoMo Ref / Total</TableHead>
                    <TableHead className="text-xs uppercase">Status</TableHead>
                    <TableHead className="text-xs uppercase text-right">WhatsApp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order) => {
                    const statusMeta = ORDER_STATUS_LABELS[order.status] || ORDER_STATUS_LABELS.payment_confirmed;
                    return (
                      <TableRow key={order.id} className="border-b border-border/40">
                        <TableCell className="font-mono text-xs font-semibold text-gold">
                          {order.order_number}
                          <div className="text-[11px] font-sans font-normal text-muted-foreground mt-0.5">
                            {new Date(order.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-semibold text-foreground">{order.customer_name}</div>
                          <div className="text-muted-foreground">{order.customer_phone}</div>
                          <div className="text-muted-foreground max-w-[240px] truncate" title={`${order.delivery_address}, ${order.delivery_city}`}>
                            {order.delivery_address}, {order.delivery_city}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs max-w-[220px]">
                          {(order.items || []).map((i, idx) => (
                            <div key={idx} className="truncate text-foreground/90">
                              {i.name} ×{i.quantity}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-display font-bold text-sm tabular-nums text-foreground">
                            {formatGHS(order.total_amount)}
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {order.payment_reference || "Pending ref"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(val) => handleChangeOrderStatus(order.id, val as OrderStatus)}
                          >
                            <SelectTrigger className={`h-8 text-[11px] font-semibold rounded-xl w-[170px] border ${statusMeta.className}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k} className="text-xs">
                                  {v.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <a
                            href={buildWhatsAppUrl(currentSettings.whatsapp_number, order)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Alert</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>

          {totalOrderPages > 1 && (
            <div className="p-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page <strong>{orderPage}</strong> of <strong>{totalOrderPages}</strong>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={orderPage <= 1}
                  onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                  className="rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={orderPage >= totalOrderPages}
                  onClick={() => setOrderPage((p) => Math.min(totalOrderPages, p + 1))}
                  className="rounded-xl"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* SUBTAB 3: MOMO & WHATSAPP CONFIGURATION */}
      {subTab === "config" && (
        <Card className="bg-card/80 backdrop-blur-xl border-gold/30 rounded-3xl max-w-2xl">
          <CardHeader>
            <CardTitle className="font-display text-xl flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-gold" /> MoMo &amp; WhatsApp Order Desk Configuration
            </CardTitle>
            <CardDescription className="text-xs">
              Configure the Mobile Money account displayed at checkout and the WhatsApp number that receives confirmed order alerts for physical dispatch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="admin-momo-number" className="text-xs">MoMo Payment Number *</Label>
                  <Input
                    id="admin-momo-number"
                    value={currentSettings.momo_number}
                    onChange={(e) =>
                      setDraftSettings({ ...currentSettings, momo_number: e.target.value })
                    }
                    placeholder="e.g. 024 123 4567"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-momo-network" className="text-xs">MoMo Network *</Label>
                  <Select
                    value={currentSettings.momo_network}
                    onValueChange={(v) =>
                      setDraftSettings({ ...currentSettings, momo_network: v })
                    }
                  >
                    <SelectTrigger id="admin-momo-network">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MTN Mobile Money">MTN Mobile Money</SelectItem>
                      <SelectItem value="Telecel Cash">Telecel Cash</SelectItem>
                      <SelectItem value="AT Money">AT Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="admin-momo-account" className="text-xs">MoMo Account Name *</Label>
                  <Input
                    id="admin-momo-account"
                    value={currentSettings.momo_account_name}
                    onChange={(e) =>
                      setDraftSettings({ ...currentSettings, momo_account_name: e.target.value })
                    }
                    placeholder="Korle Bu Stands in Worship"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-whatsapp-number" className="text-xs flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp Alert Number *
                  </Label>
                  <Input
                    id="admin-whatsapp-number"
                    value={currentSettings.whatsapp_number}
                    onChange={(e) =>
                      setDraftSettings({ ...currentSettings, whatsapp_number: e.target.value })
                    }
                    placeholder="e.g. 233241234567 or 0241234567"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-store-notice" className="text-xs">Delivery &amp; Store Notice</Label>
                <Textarea
                  id="admin-store-notice"
                  rows={2}
                  value={currentSettings.store_notice}
                  onChange={(e) =>
                    setDraftSettings({ ...currentSettings, store_notice: e.target.value })
                  }
                />
              </div>

              <Button
                type="submit"
                disabled={savingConfig}
                data-testid="save-shop-config-btn"
                className="bg-gradient-gold text-navy font-bold rounded-2xl shadow-gold gap-2 h-11 px-6"
              >
                <Save className="w-4 h-4" />
                {savingConfig ? "Saving Configuration..." : "Save MoMo & WhatsApp Settings"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Product Modal */}
      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="sm:max-w-lg bg-zinc-950 border-gold/40 text-foreground rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">
              {editingProduct.id ? "Edit Store Product" : "List New Store Product"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Products saved here immediately appear in the public Shop storefront.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="prod-name" className="text-xs">Product Name *</Label>
              <Input
                id="prod-name"
                value={editingProduct.name || ""}
                onChange={(e) => setEditingProduct((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. KSW Choir Choir Robe Edition"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prod-price" className="text-xs">Price (GHS ₵) *</Label>
                <Input
                  id="prod-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={editingProduct.price ?? 0}
                  onChange={(e) =>
                    setEditingProduct((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prod-stock" className="text-xs">Stock Qty</Label>
                <Input
                  id="prod-stock"
                  type="number"
                  min={0}
                  value={editingProduct.stock ?? 0}
                  onChange={(e) =>
                    setEditingProduct((p) => ({ ...p, stock: parseInt(e.target.value, 10) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prod-category" className="text-xs">Category</Label>
                <Input
                  id="prod-category"
                  value={editingProduct.category || ""}
                  onChange={(e) => setEditingProduct((p) => ({ ...p, category: e.target.value }))}
                  placeholder="Apparel"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prod-desc" className="text-xs">Description</Label>
              <Textarea
                id="prod-desc"
                rows={3}
                value={editingProduct.description || ""}
                onChange={(e) => setEditingProduct((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prod-image" className="text-xs">Product Image URL or WebP Preset</Label>
              <Input
                id="prod-image"
                value={editingProduct.image_url || ""}
                onChange={(e) => setEditingProduct((p) => ({ ...p, image_url: e.target.value }))}
                placeholder="/images/shop/worship-tee.webp"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PRESET_PRODUCT_IMAGES.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setEditingProduct((p) => ({ ...p, image_url: preset.url }))}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors ${
                      editingProduct.image_url === preset.url
                        ? "border-gold bg-gold/15 text-gold font-semibold"
                        : "border-border/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Label htmlFor="prod-active" className="text-xs">Visible on Public Storefront</Label>
              <Switch
                id="prod-active"
                checked={editingProduct.is_active ?? true}
                onCheckedChange={(checked) => setEditingProduct((p) => ({ ...p, is_active: checked }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProductModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={savingProduct} className="bg-gradient-gold text-navy font-bold rounded-xl shadow-gold">
                {savingProduct ? "Saving..." : "Save Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminShopSection;
