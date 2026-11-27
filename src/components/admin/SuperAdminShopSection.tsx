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
  MessageSquare,
  Truck,
  Save,
  Package,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  Upload,
  Loader2,
  X,
  Star,
  Images,
} from "lucide-react";
import { toast } from "sonner";
import {
  OrderStatus,
  ShopProduct,
  ShopSettings,
  DEFAULT_SHOP_SETTINGS,
  formatGHS,
  buildWhatsAppUrl,
  resolveProductImageUrl,
  resolveProductGalleryUrls,
  normalizeProductImages,
  getDiscountInfo,
} from "@/utils/shop";
import {
  fetchAdminProductsWithStatus,
  fetchShopSettings,
  fetchAllShopOrders,
  upsertShopProduct,
  deleteShopProduct,
  saveShopSettings,
  updateShopOrderStatus,
  uploadShopProductImage,
} from "@/lib/shop-store";

const PRESET_PRODUCT_IMAGES = [
  { label: "Royal Crest Worship Tee", url: "/images/shop/worship-tee.webp" },
  { label: "Hardcover Prayer Journal", url: "/images/shop/devotional-journal.webp" },
  { label: "Sanctuary Canvas Tote", url: "/images/shop/worship-tote.webp" },
  { label: "Cap & Wristband Set", url: "/images/shop/commemorative-cap.webp" },
];

const ORDER_STATUS_LABELS: Record<OrderStatus, { label: string; className: string }> = {
  pending_payment: { label: "Pending Payment", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  payment_confirmed: { label: "Payment Received", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  processing: { label: "Packing for Delivery", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  dispatched: { label: "Out for Delivery", className: "bg-gold/15 text-gold border-gold/40" },
  delivered: { label: "Delivered", className: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
  cancelled: { label: "Cancelled", className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

export const SuperAdminShopSection: React.FC = () => {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<"products" | "orders" | "config">("products");

  const { data: productsResult } = useQuery({
    queryKey: ["admin-shop-products"],
    queryFn: fetchAdminProductsWithStatus,
    staleTime: 0,
    refetchOnMount: "always",
    retry: 1,
  });
  const products = productsResult?.products ?? [];
  const isUsingFallbackProducts = productsResult?.source === "fallback";

  const { data: settings = DEFAULT_SHOP_SETTINGS } = useQuery({
    queryKey: ["admin-shop-settings"],
    queryFn: fetchShopSettings,
    staleTime: 0,
    refetchOnMount: "always",
    retry: 1,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-shop-orders"],
    queryFn: fetchAllShopOrders,
    staleTime: 0,
    refetchOnMount: "always",
    retry: 1,
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
    compare_at_price: null,
    stock: 50,
    image_url: "/images/shop/worship-tee.webp",
    images: ["/images/shop/worship-tee.webp"],
    is_active: true,
  });
  const [extraImageUrl, setExtraImageUrl] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productSaveError, setProductSaveError] = useState("");

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

  const editingGallery = useMemo(
    () => normalizeProductImages(editingProduct.images, editingProduct.image_url),
    [editingProduct.images, editingProduct.image_url]
  );

  const openNewProduct = () => {
    setProductSaveError("");
    setExtraImageUrl("");
    setEditingProduct({
      name: "",
      description: "",
      category: "Apparel",
      price: 100,
      compare_at_price: null,
      stock: 50,
      image_url: "/images/shop/worship-tee.webp",
      images: ["/images/shop/worship-tee.webp"],
      is_active: true,
    });
    setProductModalOpen(true);
  };

  const openEditProduct = (product: ShopProduct) => {
    setProductSaveError("");
    setExtraImageUrl("");
    const gallery = normalizeProductImages(product.images, product.image_url);
    setEditingProduct({
      ...product,
      image_url: gallery[0] || product.image_url,
      images: gallery,
      compare_at_price: product.compare_at_price ?? null,
    });
    setProductModalOpen(true);
  };

  const setProductGallery = (nextUrls: string[]) => {
    const cleaned = normalizeProductImages(nextUrls);
    setEditingProduct((p) => ({
      ...p,
      images: cleaned,
      image_url: cleaned[0] || "",
    }));
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Please select image files (JPG, PNG, or WebP).");
      e.target.value = "";
      return;
    }

    setUploadingImage(true);
    setProductSaveError("");
    try {
      const results = await Promise.all(imageFiles.map((file) => uploadShopProductImage(file)));
      const newUrls = results.map((r) => r.url);
      const hadStorageSuccess = results.some((r) => r.uploadedToStorage);

      // Replace single untouched default placeholder if the admin is adding their first real upload
      const existingWithoutDefaultSeed =
        editingGallery.length === 1 && editingGallery[0].startsWith("/images/shop/")
          ? []
          : editingGallery;

      setProductGallery([...existingWithoutDefaultSeed, ...newUrls]);

      const countLabel = newUrls.length === 1 ? "Image" : `${newUrls.length} images`;
      toast.success(
        hadStorageSuccess
          ? `${countLabel} uploaded to store storage! Click Save Product to publish.`
          : `${countLabel} optimized and added to gallery! Click Save Product to publish across all devices.`
      );
    } catch {
      toast.error("Could not process the selected images. Please try another file.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleAddExtraImageUrl = () => {
    const trimmed = extraImageUrl.trim();
    if (!trimmed) return;
    setProductGallery([...editingGallery, trimmed]);
    setExtraImageUrl("");
  };

  const handleSetCoverImage = (index: number) => {
    if (index <= 0 || index >= editingGallery.length) return;
    const selected = editingGallery[index];
    const reordered = [selected, ...editingGallery.filter((_, i) => i !== index)];
    setProductGallery(reordered);
  };

  const handleRemoveImage = (index: number) => {
    const next = editingGallery.filter((_, i) => i !== index);
    setProductGallery(next);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct.name?.trim()) {
      toast.error("Product name is required.");
      return;
    }
    const activePrice = Math.max(0, Number(editingProduct.price) || 0);
    const rawCompare =
      editingProduct.compare_at_price === null ||
      editingProduct.compare_at_price === undefined ||
      editingProduct.compare_at_price === ("" as any)
        ? null
        : Number(editingProduct.compare_at_price);
    if (rawCompare !== null && Number.isFinite(rawCompare) && rawCompare <= activePrice) {
      toast.error("Old price must be higher than the active selling price to show as a discount.");
      return;
    }

    setSavingProduct(true);
    setProductSaveError("");
    try {
      const galleryToSave = normalizeProductImages(editingProduct.images, editingProduct.image_url);
      const { syncedToDb, dbError } = await upsertShopProduct({
        ...editingProduct,
        name: editingProduct.name.trim(),
        price: activePrice,
        compare_at_price: rawCompare,
        image_url: galleryToSave[0] || "/images/shop/worship-tee.webp",
        images: galleryToSave,
      });

      if (!syncedToDb) {
        const msg =
          dbError ||
          "Could not save product to the live Supabase database. Check your Super Admin permissions and ensure supabase_shop_migration.sql has been applied.";
        setProductSaveError(msg);
        toast.error(msg);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["admin-shop-products"] });
      await queryClient.invalidateQueries({ queryKey: ["shop-products-public"] });
      toast.success("Product saved and published across all devices!");
      setProductModalOpen(false);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Remove this product from the store?")) return;
    const { syncedToDb, dbError } = await deleteShopProduct(id);
    await queryClient.invalidateQueries({ queryKey: ["admin-shop-products"] });
    await queryClient.invalidateQueries({ queryKey: ["shop-products-public"] });
    if (!syncedToDb && dbError) {
      toast.error(`Could not delete product online: ${dbError}`);
      return;
    }
    toast.success("Product removed.");
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSettings.whatsapp_number.trim()) {
      toast.error("WhatsApp order number is required.");
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
          ? "WhatsApp order desk settings updated!"
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

  const totalOrderValue = useMemo(
    () =>
      orders
        .filter((o) => o.status !== "cancelled")
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
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Orders</p>
          <p className="text-3xl font-display font-bold text-foreground mt-1 tabular-nums">
            {orders.length}
          </p>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-gold/30 rounded-3xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Order Volume</p>
          <p className="text-3xl font-display font-bold text-gold mt-1 tabular-nums">
            {formatGHS(totalOrderValue)}
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
            <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp &amp; Store Setup
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
        <div className="space-y-4">
          {isUsingFallbackProducts && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-start gap-3 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-amber-300">Showing Default Preview Items (Not Yet Published Online)</p>
                <p className="text-amber-200/85">
                  {productsResult?.error ||
                    "Your live database catalog is currently empty. Edit a product below or add a new item and click Save Product so customers on mobile, tablets, and laptops see your uploaded photos."}
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((product) => {
              const gallery = resolveProductGalleryUrls(product);
              const discount = getDiscountInfo(product);
              return (
                <Card key={product.id} className="bg-card/80 backdrop-blur-xl border-border/60 rounded-3xl overflow-hidden flex flex-col">
                  <div className="aspect-[16/10] bg-zinc-950 relative overflow-hidden">
                    <img
                      src={gallery[0] || resolveProductImageUrl(product)}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
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
                  {gallery.length > 1 && (
                    <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-medium">
                      <Images className="w-3 h-3 text-gold" />
                      {gallery.length} photos
                    </span>
                  )}
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

                  <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2 tabular-nums">
                      {discount.hasDiscount && discount.oldPrice !== null && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatGHS(discount.oldPrice)}
                        </span>
                      )}
                      <span className="text-xl font-display font-bold text-foreground">
                        {formatGHS(discount.activePrice)}
                      </span>
                    </div>
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
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: ORDERS & PHYSICAL DELIVERY */}
      {subTab === "orders" && (
        <Card className="bg-card/80 backdrop-blur-xl border-border/60 rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50">
            <div>
              <CardTitle className="font-display text-xl">Customer Orders &amp; Manual Delivery</CardTitle>
              <CardDescription className="text-xs">
                Follow up on WhatsApp orders, mark payment received, and track physical delivery.
              </CardDescription>
            </div>
            <Select value={orderStatusFilter} onValueChange={(v) => { setOrderStatusFilter(v); setOrderPage(1); }}>
              <SelectTrigger className="w-[210px] rounded-xl bg-zinc-900 border-border/60 text-xs">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                <SelectItem value="payment_confirmed">Payment Received</SelectItem>
                <SelectItem value="processing">Packing for Delivery</SelectItem>
                <SelectItem value="dispatched">Out for Delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
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
                    <TableHead className="text-xs uppercase">Order Total</TableHead>
                    <TableHead className="text-xs uppercase">Status</TableHead>
                    <TableHead className="text-xs uppercase text-right">WhatsApp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order) => {
                    const statusMeta = ORDER_STATUS_LABELS[order.status] || ORDER_STATUS_LABELS.pending_payment;
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
                          <div className="text-[11px] text-muted-foreground">
                            WhatsApp Follow-up
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

      {/* SUBTAB 3: WHATSAPP & STORE CONFIGURATION */}
      {subTab === "config" && (
        <Card className="bg-card/80 backdrop-blur-xl border-gold/30 rounded-3xl max-w-2xl">
          <CardHeader>
            <CardTitle className="font-display text-xl flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" /> WhatsApp Order Desk Configuration
            </CardTitle>
            <CardDescription className="text-xs">
              Configure the WhatsApp number customers message when completing orders on the shop so you can arrange manual payment and physical delivery.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-whatsapp-number" className="text-xs flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp Order Number *
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
                <p className="text-[11px] text-muted-foreground">
                  When customers click &quot;Complete Order on WhatsApp&quot;, it opens this WhatsApp chat with their itemized order and delivery address.
                </p>
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
                {savingConfig ? "Saving Configuration..." : "Save WhatsApp Order Settings"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Product Modal */}
      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="sm:max-w-lg bg-zinc-950 border-gold/40 text-foreground rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">
              {editingProduct.id ? "Edit Store Product" : "List New Store Product"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Upload a product photo from your device and publish directly to the public Shop storefront.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-4">
            {productSaveError && (
              <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {productSaveError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="prod-name" className="text-xs">Product Name *</Label>
              <Input
                id="prod-name"
                value={editingProduct.name || ""}
                onChange={(e) => setEditingProduct((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. KSW Commemorative Choir Shirt"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prod-price" className="text-xs">Active Price (New Price, GHS ₵) *</Label>
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
                <Label htmlFor="prod-compare-price" className="text-xs">
                  Old Price (Cancelled, GHS ₵ — Optional)
                </Label>
                <Input
                  id="prod-compare-price"
                  data-testid="admin-product-compare-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={editingProduct.compare_at_price ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditingProduct((p) => ({
                      ...p,
                      compare_at_price: val === "" ? null : parseFloat(val),
                    }));
                  }}
                  placeholder="Leave empty if no discount"
                />
              </div>
            </div>

            {(() => {
              const previewDiscount = getDiscountInfo({
                price: Number(editingProduct.price) || 0,
                compare_at_price: editingProduct.compare_at_price ?? null,
              });
              const rawOld = editingProduct.compare_at_price;
              if (rawOld !== null && rawOld !== undefined && rawOld !== ("" as any)) {
                if (previewDiscount.hasDiscount && previewDiscount.oldPrice !== null) {
                  return (
                    <div className="flex items-center justify-between rounded-xl border border-gold/25 bg-gold/5 px-3 py-2 text-xs">
                      <span className="text-muted-foreground">Storefront price preview:</span>
                      <span className="flex items-baseline gap-2 tabular-nums">
                        <span className="line-through text-muted-foreground">
                          {formatGHS(previewDiscount.oldPrice)}
                        </span>
                        <span className="font-bold text-foreground">
                          {formatGHS(previewDiscount.activePrice)}
                        </span>
                        <span className="text-gold font-semibold">
                          ({previewDiscount.discountPercent}% off)
                        </span>
                      </span>
                    </div>
                  );
                }
                return (
                  <p className="text-[11px] text-amber-400">
                    Old price should be greater than the active selling price to display as a cancelled discount.
                  </p>
                );
              }
              return null;
            })()}

            <div className="grid grid-cols-2 gap-3">
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

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">
                  Product Gallery ({editingGallery.length} {editingGallery.length === 1 ? "image" : "images"})
                </Label>
                <label
                  htmlFor="prod-image-upload"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gold/40 bg-gold/10 text-gold text-xs font-semibold cursor-pointer hover:bg-gold/20 transition-colors ${
                    uploadingImage ? "opacity-60 pointer-events-none" : ""
                  }`}
                >
                  {uploadingImage ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{uploadingImage ? "Uploading..." : "Upload Photos"}</span>
                  <input
                    id="prod-image-upload"
                    data-testid="admin-product-image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleProductImageUpload}
                    disabled={uploadingImage}
                    className="sr-only"
                  />
                </label>
              </div>

              {editingGallery.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {editingGallery.map((imgUrl, idx) => (
                    <div
                      key={`${imgUrl}-${idx}`}
                      className={`group relative rounded-xl overflow-hidden border bg-zinc-900 aspect-square ${
                        idx === 0 ? "border-gold" : "border-border/60"
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Product photo ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {idx === 0 && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-gold text-navy text-[10px] font-bold leading-none">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        aria-label={`Remove image ${idx + 1}`}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/80 text-white hover:text-red-400 flex items-center justify-center transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSetCoverImage(idx)}
                          aria-label={`Set image ${idx + 1} as cover photo`}
                          className="absolute inset-x-1.5 bottom-1.5 py-1 rounded-lg bg-black/80 text-[10px] font-semibold text-gold hover:bg-black flex items-center justify-center gap-1"
                        >
                          <Star className="w-2.5 h-2.5" />
                          Make Cover
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-zinc-900/50 py-6 text-center space-y-1">
                  <Package className="w-6 h-6 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    No photos selected yet. Click Upload Photos above to add one or multiple angles.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  id="prod-image"
                  value={extraImageUrl}
                  onChange={(e) => setExtraImageUrl(e.target.value)}
                  placeholder="Or paste an image URL to add to gallery"
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddExtraImageUrl}
                  className="rounded-xl shrink-0 text-xs"
                >
                  Add URL
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {PRESET_PRODUCT_IMAGES.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => {
                      const withoutDefault =
                        editingGallery.length === 1 && editingGallery[0].startsWith("/images/shop/")
                          ? []
                          : editingGallery;
                      setProductGallery([...withoutDefault, preset.url]);
                    }}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors ${
                      editingGallery.includes(preset.url)
                        ? "border-gold bg-gold/15 text-gold font-semibold"
                        : "border-border/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    + {preset.label}
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
              <Button type="submit" disabled={savingProduct || uploadingImage} className="bg-gradient-gold text-navy font-bold rounded-xl shadow-gold">
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
