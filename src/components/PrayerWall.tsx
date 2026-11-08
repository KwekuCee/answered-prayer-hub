import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, Sparkles, Send, Users, Shield, PlusCircle, Check, Search, Filter } from "lucide-react";
import { toast } from "sonner";

export interface PrayerWallRequest {
  id: string;
  author_name: string;
  is_anonymous: boolean;
  category: string;
  title: string;
  request: string;
  praying_count: number;
  created_at: string;
}

const CATEGORIES = [
  "All",
  "Healing",
  "Breakthrough",
  "Family",
  "Spiritual Growth",
  "Academic & Career",
  "Thanksgiving",
  "General",
];

const SEED_REQUESTS: PrayerWallRequest[] = [
  {
    id: "seed-1",
    author_name: "Anonymous",
    is_anonymous: true,
    category: "Healing",
    title: "Complete Recovery for My Mother",
    request: "Please join me in faith as we pray for total restoration and strength for my mother who is undergoing medical treatment at Korle Bu. We declare complete divine healing!",
    praying_count: 24,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "seed-2",
    author_name: "Sister Faith",
    is_anonymous: false,
    category: "Breakthrough",
    title: "Guidance in Final Year Medical Exams",
    request: "Standing in agreement for divine wisdom, peace of mind, and supernatural memory retention for all healthcare students sitting for clinical exams this month.",
    praying_count: 42,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "seed-3",
    author_name: "Anonymous",
    is_anonymous: true,
    category: "Family",
    title: "Peace & Salvation in My Household",
    request: "Believing God for the salvation of my siblings and restored joy in our home. By faith, every closed door is turning into a testimony of answered prayer!",
    praying_count: 18,
    created_at: new Date(Date.now() - 3600000 * 9).toISOString(),
  },
  {
    id: "seed-4",
    author_name: "Anonymous",
    is_anonymous: true,
    category: "Spiritual Growth",
    title: "Fresh Fire & Boldness for Soul Winning",
    request: "Praying for an unquenchable fire for soul winning, evangelism, and profound worship encounters throughout our upcoming Korle Bu gathering.",
    praying_count: 51,
    created_at: new Date(Date.now() - 3600000 * 14).toISOString(),
  },
];

export const PrayerWall: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Track which requests current user has prayed for
  const [prayedIds, setPrayedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("ksw_prayed_requests");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // New Request Form State
  const [form, setForm] = useState({
    author_name: "",
    is_anonymous: true,
    category: "General",
    title: "",
    request: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch prayer requests from Supabase with offline caching
  const { data: prayerRequests = [], isLoading } = useQuery<PrayerWallRequest[]>({
    queryKey: ["prayer-wall-requests"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("prayer_wall")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Could not fetch from prayer_wall table, checking cache:", error);
          const cached = localStorage.getItem("ksw_cached_prayer_wall");
          if (cached) return JSON.parse(cached);
          return SEED_REQUESTS;
        }

        if (data && data.length > 0) {
          try {
            localStorage.setItem("ksw_cached_prayer_wall", JSON.stringify(data));
          } catch {
            // ignore storage quota error
          }
          return data;
        }

        const cached = localStorage.getItem("ksw_cached_prayer_wall");
        return cached ? JSON.parse(cached) : SEED_REQUESTS;
      } catch (err) {
        console.warn("Prayer wall fetch error:", err);
        const cached = localStorage.getItem("ksw_cached_prayer_wall");
        return cached ? JSON.parse(cached) : SEED_REQUESTS;
      }
    },
    initialData: () => {
      try {
        const cached = localStorage.getItem("ksw_cached_prayer_wall");
        return cached ? JSON.parse(cached) : SEED_REQUESTS;
      } catch {
        return SEED_REQUESTS;
      }
    },
  });

  // Handle Praying click
  const handlePraying = async (request: PrayerWallRequest) => {
    const isAlreadyPrayed = prayedIds.has(request.id);
    const newPrayedSet = new Set(prayedIds);

    if (isAlreadyPrayed) {
      newPrayedSet.delete(request.id);
    } else {
      newPrayedSet.add(request.id);
      toast.success("You are standing in agreement in prayer! 🙏", {
        description: `Your prayer support was added for "${request.title}".`,
      });
    }

    setPrayedIds(newPrayedSet);
    try {
      localStorage.setItem("ksw_prayed_requests", JSON.stringify(Array.from(newPrayedSet)));
    } catch {
      // ignore
    }

    const newCount = Math.max(0, request.praying_count + (isAlreadyPrayed ? -1 : 1));

    // Optimistic UI update
    queryClient.setQueryData<PrayerWallRequest[]>(["prayer-wall-requests"], (old = []) =>
      old.map((item) => (item.id === request.id ? { ...item, praying_count: newCount } : item))
    );

    // Sync to Supabase
    try {
      if (!request.id.startsWith("seed-")) {
        await supabase
          .from("prayer_wall")
          .update({ praying_count: newCount })
          .eq("id", request.id);
      }
    } catch (e) {
      console.warn("Could not sync prayer count to Supabase:", e);
    }
  };

  // Submit prayer request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.request.trim()) {
      toast.error("Please enter a title and your prayer request.");
      return;
    }

    setIsSubmitting(true);
    const newRequestItem: PrayerWallRequest = {
      id: crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`,
      author_name: form.is_anonymous ? "Anonymous" : (form.author_name.trim() || "Registered Member"),
      is_anonymous: form.is_anonymous,
      category: form.category,
      title: form.title.trim(),
      request: form.request.trim(),
      praying_count: 1,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from("prayer_wall").insert({
        author_name: newRequestItem.author_name,
        is_anonymous: newRequestItem.is_anonymous,
        category: newRequestItem.category,
        title: newRequestItem.title,
        request: newRequestItem.request,
        praying_count: 1,
      }).select();

      if (error) {
        console.warn("Supabase insert notice:", error);
      }

      // Add to query cache
      const finalItem = data && data[0] ? data[0] : newRequestItem;
      queryClient.setQueryData<PrayerWallRequest[]>(["prayer-wall-requests"], (old = []) => [
        finalItem,
        ...old,
      ]);

      // Cache updated list locally
      try {
        const currentList = queryClient.getQueryData<PrayerWallRequest[]>(["prayer-wall-requests"]) || [];
        localStorage.setItem("ksw_cached_prayer_wall", JSON.stringify(currentList));
      } catch {
        // ignore
      }

      // Automatically mark author as praying for their own request
      const updatedPrayed = new Set(prayedIds).add(finalItem.id);
      setPrayedIds(updatedPrayed);
      localStorage.setItem("ksw_prayed_requests", JSON.stringify(Array.from(updatedPrayed)));

      toast.success("Prayer request posted to the wall!", {
        description: "The brethren will stand in faith and prayer with you.",
      });

      setForm({
        author_name: "",
        is_anonymous: true,
        category: "General",
        title: "",
        request: "",
      });
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to post request. Saved locally.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests = prayerRequests.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.request.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="prayer-wall" className="py-24 px-4 bg-background relative overflow-hidden border-t border-border/40">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-gold/5 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-up">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold/10 border border-gold/30 rounded-full text-xs font-semibold uppercase tracking-wider text-gold">
              <Users className="w-3.5 h-3.5" /> Community Prayer Wall
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
              Stand in <span className="bg-gradient-gold bg-clip-text text-transparent">Faith Together</span>
            </h2>
            <p className="text-muted-foreground font-body text-base max-w-xl">
              Share your heart, post anonymous prayer requests, and join hundreds of believers lifting up one another in fervent prayer.
            </p>
          </div>

          {/* Post Request Modal Trigger */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-gold text-navy font-bold hover:shadow-gold transition-all duration-300 gap-2 shrink-0 py-6 px-6 rounded-2xl">
                <PlusCircle className="w-5 h-5" /> Post Prayer Request
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-lg bg-zinc-950 border-gold/40 text-foreground">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-gold" /> Post on Prayer Wall
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-body text-sm">
                  Your request will be visible on the wall so the body of Christ can pray with you. You can choose to remain completely anonymous.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 pt-3">
                
                {/* Anonymous Toggle */}
                <div className="p-4 rounded-xl bg-zinc-900 border border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-gold" />
                    <div>
                      <div className="font-semibold text-sm">Post Anonymously</div>
                      <div className="text-xs text-muted-foreground">Keep your name and identity hidden</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.is_anonymous}
                    onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })}
                    className="w-5 h-5 accent-gold cursor-pointer rounded"
                  />
                </div>

                {!form.is_anonymous && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-xs font-semibold text-muted-foreground">Your Name or Alias</label>
                    <Input
                      placeholder="e.g. Sister Grace"
                      value={form.author_name}
                      onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                      className="bg-zinc-900 border-zinc-800 focus:border-gold"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold"
                  >
                    {CATEGORIES.filter((c) => c !== "All").map((c) => (
                      <option key={c} value={c} className="bg-zinc-950">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Title / Focus</label>
                  <Input
                    placeholder="e.g. Divine Healing for Sister Mary"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="bg-zinc-900 border-zinc-800 focus:border-gold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Prayer Details</label>
                  <Textarea
                    placeholder="Write your prayer request here. Share what you are trusting God for..."
                    value={form.request}
                    onChange={(e) => setForm({ ...form, request: e.target.value })}
                    className="bg-zinc-900 border-zinc-800 focus:border-gold min-h-[120px]"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-gold text-navy font-bold py-3 rounded-xl hover:shadow-gold transition-all duration-300 mt-2"
                >
                  {isSubmitting ? "Posting to Wall..." : "Post Prayer Request"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/60 backdrop-blur-xl border border-border/50 p-4 rounded-2xl">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === cat
                    ? "bg-gold text-navy font-bold shadow-sm"
                    : "bg-background/60 text-muted-foreground hover:text-foreground hover:bg-background"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search prayer requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/80 border-border/60 text-sm h-9 rounded-xl focus:border-gold"
            />
          </div>
        </div>

        {/* Prayer Requests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRequests.map((req) => {
            const hasPrayed = prayedIds.has(req.id);

            return (
              <Card
                key={req.id}
                className="bg-card/70 backdrop-blur-xl border-border/50 hover:border-gold/40 hover:shadow-gold/10 transition-all duration-300 rounded-3xl flex flex-col justify-between group overflow-hidden"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="outline" className="border-gold/40 text-gold bg-gold/5 text-[11px] font-medium">
                      {req.category}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-body">
                      <Shield className="w-3.5 h-3.5 text-gold/70" />
                      <span>{req.is_anonymous ? "Anonymous Prayer" : req.author_name}</span>
                    </div>
                  </div>
                  <CardTitle className="text-xl font-display font-bold text-foreground group-hover:text-gold transition-colors leading-snug">
                    {req.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6 pt-0">
                  <p className="text-sm font-body text-muted-foreground leading-relaxed whitespace-pre-line">
                    {req.request}
                  </p>

                  <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-gold/80" />
                      <span>
                        <strong className="text-foreground font-semibold">{req.praying_count}</strong> standing in prayer
                      </span>
                    </div>

                    {/* Praying Button */}
                    <Button
                      size="sm"
                      onClick={() => handlePraying(req)}
                      className={`gap-2 rounded-xl transition-all duration-300 ${
                        hasPrayed
                          ? "bg-gold text-navy font-bold shadow-gold scale-105"
                          : "bg-background/80 hover:bg-gold/10 hover:text-gold border border-border/60 text-foreground"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${hasPrayed ? "fill-navy text-navy" : "text-gold"}`} />
                      <span>{hasPrayed ? "Prayed 🙏" : "Praying"}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredRequests.length === 0 && (
          <div className="text-center py-16 bg-card/40 rounded-3xl border border-dashed border-border/60">
            <Sparkles className="w-10 h-10 text-gold mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-display font-bold text-foreground mb-1">No prayer requests in this category yet</h3>
            <p className="text-sm text-muted-foreground font-body">
              Be the first to post a prayer request or select another category above.
            </p>
          </div>
        )}

      </div>
    </section>
  );
};

export default PrayerWall;
