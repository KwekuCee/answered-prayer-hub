import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Quote, PlusCircle, Sparkles, CheckCircle2, HeartHandshake, MessageSquarePlus } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

export const TestimonyGrid = () => {
    const { data: testimonials = [] } = useQuery({
        queryKey: ["live-testimonies-grid"],
        queryFn: async () => {
            let remoteApproved: any[] = [];
            try {
                const { data, error } = await supabase
                    .from("testimonials")
                    .select("*")
                    .eq("is_approved", true)
                    .order("created_at", { ascending: false });

                if (!error && data) {
                    remoteApproved = data;
                }
            } catch {
                // Ignore network errors
            }

            // Get user's locally submitted testimonies
            let userSubmitted: any[] = [];
            try {
                const local = localStorage.getItem("ksw_user_submitted_testimonies");
                if (local) {
                    userSubmitted = JSON.parse(local);
                }
            } catch {
                // Ignore parsing errors
            }

            // Merge unique testimonies
            const allMap = new Map();
            [...remoteApproved, ...userSubmitted].forEach((item) => {
                if (item && item.content) {
                    const key = item.id || item.content.slice(0, 30);
                    if (!allMap.has(key)) {
                        allMap.set(key, item);
                    }
                }
            });

            const merged = Array.from(allMap.values());

            // Save merged list to cache
            if (merged.length > 0) {
                try {
                    localStorage.setItem("ksw_cached_testimonials", JSON.stringify(merged));
                } catch {
                    // Ignore quota
                }
            }

            return merged;
        },
        initialData: () => {
            try {
                const userSubmitted = JSON.parse(localStorage.getItem("ksw_user_submitted_testimonies") || "[]");
                const cached = JSON.parse(localStorage.getItem("ksw_cached_testimonials") || "[]");
                const combined = [...userSubmitted, ...cached];
                const uniqueMap = new Map();
                combined.forEach((item) => {
                    if (item && item.content) {
                        const key = item.id || item.content.slice(0, 30);
                        if (!uniqueMap.has(key)) uniqueMap.set(key, item);
                    }
                });
                return Array.from(uniqueMap.values());
            } catch {
                return [];
            }
        }
    });

    return (
        <section id="testimonies" className="py-24 px-4 relative overflow-hidden bg-background border-t border-border/30">
            {/* Background Glows */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gold/5 rounded-full blur-[140px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto space-y-12 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-up">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gold/10 border border-gold/30 rounded-full text-xs font-semibold uppercase tracking-wider text-gold">
                            <Sparkles className="w-3.5 h-3.5 text-gold" /> Answered Prayers & Miracles
                        </div>
                        <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
                            Real <span className="bg-gradient-gold bg-clip-text text-transparent">Testimonies</span>
                        </h2>
                        <p className="text-muted-foreground font-body text-base max-w-xl">
                            Read inspiring stories of God's power, divine healing, and answered prayers shared by our community and ministry leaders.
                        </p>
                    </div>

                    {/* Add Your Story CTA Button */}
                    <Link to="/share-testimony" className="shrink-0">
                        <Button className="bg-gradient-gold text-navy font-bold hover:shadow-gold transition-all duration-300 gap-2.5 py-6 px-6 rounded-2xl text-sm md:text-base">
                            <PlusCircle className="w-5 h-5" /> Add Your Story
                        </Button>
                    </Link>
                </div>

                {/* Responsive Grid or Empty State */}
                {testimonials.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up">
                        {testimonials.map((testimonial: any, idx: number) => (
                            <div
                                key={testimonial.id || idx}
                                className="bg-card/70 backdrop-blur-xl border border-border/50 rounded-3xl p-7 shadow-lg hover:shadow-gold/15 hover:border-gold/40 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group relative overflow-hidden"
                            >
                                {/* Decorative Quote Icon in background */}
                                <Quote className="absolute top-4 right-4 w-12 h-12 text-gold/10 group-hover:text-gold/20 transition-colors pointer-events-none" />

                                <div className="space-y-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0">
                                            <HeartHandshake className="w-5 h-5 text-gold" />
                                        </div>
                                        <div>
                                            <h3 className="font-display font-bold text-foreground text-lg group-hover:text-gold transition-colors leading-snug">
                                                {testimonial.author_name || "Anonymous"}
                                            </h3>
                                            {testimonial.church_name && (
                                                <p className="text-xs text-muted-foreground font-body font-medium">
                                                    {testimonial.church_name}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-sm md:text-base font-body text-foreground/80 leading-relaxed italic pt-1">
                                        "{testimonial.content}"
                                    </p>
                                </div>

                                <div className="pt-6 mt-6 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground font-body relative z-10">
                                    <span className="flex items-center gap-1.5 text-green-400 font-semibold">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified Grace
                                    </span>
                                    <span>
                                        {new Date(testimonial.created_at || Date.now()).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Empty State when no testimonies submitted yet */
                    <div className="py-16 px-8 rounded-3xl bg-card/40 border border-dashed border-border/60 text-center space-y-6 max-w-2xl mx-auto">
                        <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto text-gold">
                            <MessageSquarePlus className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-display font-bold text-foreground">No Published Testimonies Yet</h3>
                            <p className="text-sm text-muted-foreground font-body leading-relaxed max-w-md mx-auto">
                                Be the first to testify of the Lord's goodness! Share your story of answered prayer or miracle below.
                            </p>
                        </div>
                        <Link to="/share-testimony">
                            <Button className="bg-gradient-gold text-navy font-bold rounded-2xl px-8 py-3 hover:shadow-gold transition-all gap-2">
                                <PlusCircle className="w-5 h-5" /> Add Your Story
                            </Button>
                        </Link>
                    </div>
                )}

                {/* Bottom Callout banner */}
                <div className="p-8 rounded-3xl bg-gradient-to-r from-gold/10 via-card/80 to-gold/10 border border-gold/30 text-center space-y-4 max-w-3xl mx-auto shadow-xl">
                    <h3 className="text-xl md:text-2xl font-display font-bold text-foreground">
                        Has God Done Something Wonderful For You?
                    </h3>
                    <p className="text-sm text-muted-foreground font-body max-w-lg mx-auto">
                        Your testimony builds faith in the hearts of thousands. Share what the Lord has done for you today!
                    </p>
                    <div>
                        <Link to="/share-testimony">
                            <Button className="bg-gradient-gold text-navy font-bold rounded-xl px-6 py-2.5 hover:shadow-gold transition-all">
                                Share Your Testimony Now &rarr;
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TestimonyGrid;
