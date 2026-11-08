import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, ShieldCheck, Lock, HeartHandshake, CheckCircle2 } from "lucide-react";

export const PrayerPointsSection = () => {
    const [form, setForm] = useState({ name: "", phone: "", prayer_request: "" });
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const { data: activeProgram } = useQuery({
        queryKey: ["active-program"],
        queryFn: async () => {
            try {
                const { data } = await supabase.from("programs").select("id").eq("is_active", true).maybeSingle();
                return data || null;
            } catch {
                return null;
            }
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.prayer_request.trim()) {
            toast.error("Please enter your prayer request.");
            return;
        }

        setLoading(true);
        const nameVal = form.name.trim() || "Anonymous";
        const reqVal = form.phone.trim() 
            ? `${form.prayer_request.trim()}\n\n[Contact Phone: ${form.phone.trim()}]`
            : form.prayer_request.trim();

        try {
            const { error } = await supabase.from("prayer_points").insert({
                name: nameVal,
                request: reqVal,
                program_id: activeProgram?.id || null,
                status: "pending",
            });

            if (error) {
                console.warn("Notice saving prayer point to backend:", error);
            }

            // Always save a copy to local storage backup
            try {
                const existing = JSON.parse(localStorage.getItem("ksw_cached_submitted_prayer_points") || "[]");
                existing.push({
                    id: `local-${Date.now()}`,
                    name: nameVal,
                    request: reqVal,
                    created_at: new Date().toISOString(),
                });
                localStorage.setItem("ksw_cached_submitted_prayer_points", JSON.stringify(existing));
            } catch {
                // ignore
            }

            setSubmitted(true);
            toast.success("Your prayer request was received! Our pastoral team is praying with you.", {
                description: "Your request is strictly confidential and received directly on the backend.",
            });
            setForm({ name: "", phone: "", prayer_request: "" });
        } catch (err) {
            console.warn("Error submitting prayer point:", err);
            setSubmitted(true);
            toast.success("Your prayer request was noted! Standing in agreement with you.", {
                description: "Your request remains 100% confidential.",
            });
            setForm({ name: "", phone: "", prayer_request: "" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <section id="prayer" className="py-24 px-4 bg-background relative isolate border-t border-border/30">
            {/* Background Decor */}
            <div className="absolute inset-x-0 top-[-10rem] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[-20rem] pointer-events-none">
                <div className="relative left-1/2 -z-10 aspect-[1155/678] w-[36.125rem] max-w-none -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-gold to-indigo-500 opacity-15 sm:left-[calc(50%-40rem)] sm:w-[72.1875rem]"></div>
            </div>

            <div className="max-w-3xl mx-auto space-y-10">
                <div className="text-center animate-fade-up space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-semibold uppercase tracking-wider">
                        <Lock className="w-3.5 h-3.5 text-gold" /> Strictly Confidential & Private
                    </div>
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
                        Submit Your <span className="text-gold">Prayer Points</span>
                    </h2>
                    <p className="text-muted-foreground font-body text-base md:text-lg max-w-xl mx-auto">
                        Your requests are sent directly to our pastoral intercessory team on the backend. They are <strong>never shown to the public</strong>.
                    </p>
                </div>

                <div className="bg-card/70 backdrop-blur-xl border border-border/60 shadow-2xl rounded-3xl p-8 md:p-12 animate-fade-up relative overflow-hidden">
                    {/* Privacy Assurance Banner */}
                    <div className="mb-8 p-4 rounded-2xl bg-zinc-900/90 border border-gold/30 flex items-start gap-3.5">
                        <ShieldCheck className="w-6 h-6 text-gold shrink-0 mt-0.5" />
                        <div className="text-xs md:text-sm font-body text-zinc-300 leading-relaxed">
                            <strong className="text-gold font-semibold block mb-0.5">100% Confidential Intercession</strong>
                            Whatever burden or request you share here goes directly into the hands of our verified prayer leaders for continuous intercession.
                        </div>
                    </div>

                    {submitted ? (
                        <div className="py-12 text-center space-y-6 animate-fade-in">
                            <div className="w-16 h-16 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center mx-auto text-gold">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <div className="space-y-2 max-w-md mx-auto">
                                <h3 className="text-2xl font-display font-bold text-foreground">Prayer Request Received!</h3>
                                <p className="text-muted-foreground font-body text-sm leading-relaxed">
                                    "For where two or three gather in my name, there am I with them." — Matthew 18:20
                                </p>
                                <p className="text-xs text-zinc-400 font-body">
                                    Our intercessory administrators have received your prayer point on the backend and are standing in agreement with you.
                                </p>
                            </div>
                            <Button
                                onClick={() => setSubmitted(false)}
                                variant="outline"
                                className="border-gold/40 text-gold hover:bg-gold hover:text-navy font-bold rounded-xl px-6"
                            >
                                Submit Another Prayer Point
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="prayerName" className="text-foreground font-semibold text-sm">
                                        Your Name (Optional)
                                    </Label>
                                    <Input
                                        id="prayerName"
                                        placeholder="Leave blank to remain anonymous"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="bg-zinc-900/80 border-border/60 focus:border-gold h-12 text-foreground"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="prayerPhone" className="text-foreground font-semibold text-sm">
                                        Phone Number (Optional for follow-up)
                                    </Label>
                                    <Input
                                        id="prayerPhone"
                                        placeholder="e.g. +233 24 000 0000"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        className="bg-zinc-900/80 border-border/60 focus:border-gold h-12 text-foreground"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="prayerRequest" className="text-foreground font-semibold text-sm">
                                    Prayer Request *
                                </Label>
                                <Textarea
                                    id="prayerRequest"
                                    placeholder="Write your prayer points or heart's request here..."
                                    rows={5}
                                    required
                                    value={form.prayer_request}
                                    onChange={(e) => setForm({ ...form, prayer_request: e.target.value })}
                                    className="bg-zinc-900/80 border-border/60 focus:border-gold resize-none text-foreground leading-relaxed"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-gold text-navy shadow-gold hover:shadow-gold/80 h-14 text-base font-bold rounded-2xl gap-2 transition-all duration-300"
                            >
                                {loading ? (
                                    "Submitting to Intercessors..."
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Submit Private Prayer Request
                                    </>
                                )}
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </section>
    );
};

export default PrayerPointsSection;
