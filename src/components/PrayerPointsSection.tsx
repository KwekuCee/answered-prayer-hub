import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send } from "lucide-react";

export const PrayerPointsSection = () => {
    const [form, setForm] = useState({ name: "", prayer_request: "" });
    const [loading, setLoading] = useState(false);

  const { data: activeProgram } = useQuery({
    queryKey: ["active-program"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("id").eq("is_active", true).maybeSingle();
      if (error && error.code !== "PGRST116") console.error(error);
      return data;
    },
  });


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.prayer_request.trim()) {
            toast.error("Please enter your prayer request.");
            return;
        }

        setLoading(true);
        try {
            // Assuming a prayer_points table exists
            const { error } = await supabase.from("prayer_points").insert({
                name: form.name.trim() || "Anonymous",
                request: form.prayer_request.trim(),
        program_id: activeProgram?.id || null,
            });

            if (error) throw error;

            toast.success("Prayer request submitted. We will pray with you!");
            setForm({ name: "", prayer_request: "" });
        } catch (err: any) {
            toast.error("Failed to submit prayer request. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section id="prayer" className="py-24 px-4 bg-background relative isolate">
            {/* Background Decor */}
            <div className="absolute inset-x-0 top-[-10rem] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[-20rem]">
                <div className="relative left-1/2 -z-10 aspect-[1155/678] w-[36.125rem] max-w-none -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-gold to-indigo-500 opacity-20 sm:left-[calc(50%-40rem)] sm:w-[72.1875rem]"></div>
            </div>

            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10 animate-fade-up">
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
                        Submit Your <span className="text-gold">Prayer Points</span>
                    </h2>
                    <p className="text-lg text-muted-foreground font-body">
                        God is still in the business of answering prayers. Share your burdens with us.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-2xl rounded-3xl p-8 md:p-12 space-y-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
                    <div className="space-y-2">
                        <Label htmlFor="prayerName" className="text-foreground font-semibold">Your Name (Optional)</Label>
                        <Input
                            id="prayerName"
                            placeholder="Leave blank to remain anonymous"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="bg-background/50 border-border/50 focus:border-gold h-12"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="prayerRequest" className="text-foreground font-semibold">Prayer Request *</Label>
                        <Textarea
                            id="prayerRequest"
                            placeholder="What would you like us to pray about?"
                            rows={5}
                            required
                            value={form.prayer_request}
                            onChange={(e) => setForm({ ...form, prayer_request: e.target.value })}
                            className="bg-background/50 border-border/50 focus:border-gold resize-none"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-gold text-accent-foreground shadow-gold hover:opacity-90 h-14 text-base font-bold rounded-xl gap-2 transition-all"
                    >
                        {loading ? "Submitting..." : (
                            <>
                                <Send className="w-5 h-5" />
                                Submit Prayer Request
                            </>
                        )}
                    </Button>
                </form>
            </div>
        </section>
    );
};

export default PrayerPointsSection;
