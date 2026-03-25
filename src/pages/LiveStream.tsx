import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const LiveStream = () => {
    const { data: liveStreamSettings, isLoading } = useQuery({
        queryKey: ["live-stream"],
        queryFn: async () => {
            const { data, error } = await supabase.from("live_stream_settings").select("*").maybeSingle();
            if (error) throw error;
            return data || { url: "", is_active: false };
        },
    });

    const getEmbedUrl = (url: string) => {
        if (!url) return "";
        // Handle YouTube watch links
        if (url.includes("youtube.com/watch?v=")) {
            return url.replace("watch?v=", "embed/");
        }
        // Handle YouTube share links (youtu.be)
        if (url.includes("youtu.be/")) {
            return url.replace("youtu.be/", "youtube.com/embed/");
        }
        return url;
    };

    return (
        <div className="min-h-screen bg-navy text-foreground flex flex-col selection:bg-gold/30 selection:text-gold-light">
            <Navbar />

            <main className="flex-1 flex flex-col items-center justify-center p-4 pt-24 pb-12 relative overflow-hidden">
                {/* Abstract Background Elements */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-[100px] animate-pulse-slow" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: "2s" }} />
                </div>

                <div className="relative z-10 w-full max-w-5xl mx-auto space-y-8 animate-fade-up">
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl md:text-6xl font-display font-bold text-primary-foreground tracking-tight">
                            100% Answered Prayer <span className="text-gold">Live Stream</span>
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground font-body max-w-2xl mx-auto">
                            Join us in fellowship and prayer from anywhere in the world. Experience the undeniable power of God at work.
                        </p>
                    </div>

                    <div className="w-full bg-card/10 backdrop-blur-xl border border-gold/20 rounded-2xl md:rounded-[2.5rem] p-2 md:p-4 shadow-2xl relative overflow-hidden">
                        <div className="aspect-video w-full rounded-xl md:rounded-[2rem] overflow-hidden bg-black/50 relative flex items-center justify-center">
                            {isLoading ? (
                                <div className="flex flex-col items-center gap-4 text-gold">
                                    <Loader2 className="h-10 w-10 animate-spin" />
                                    <p className="font-body tracking-widest text-sm uppercase">Loading Stream...</p>
                                </div>
                            ) : liveStreamSettings?.is_active && liveStreamSettings?.url ? (
                                <iframe
                                    src={getEmbedUrl(liveStreamSettings.url)}
                                    title="Live Stream"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute inset-0 w-full h-full border-0"
                                ></iframe>
                            ) : (
                                <div className="text-center p-6 bg-card/40 backdrop-blur-sm rounded-xl border border-border/50 max-w-md">
                                    <div className="w-16 h-16 bg-navy border border-border/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-xl">📴</span>
                                    </div>
                                    <h3 className="text-xl font-display font-bold text-foreground mb-2">Stream Offline</h3>
                                    <p className="text-muted-foreground font-body mb-6">
                                        We are currently not live. Please check back during our scheduled program times or explore our testimonies.
                                    </p>
                                    <Button asChild className="bg-gradient-gold text-navy hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all">
                                        <Link to="/#testimonies">Read Testimonies</Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LiveStream;
