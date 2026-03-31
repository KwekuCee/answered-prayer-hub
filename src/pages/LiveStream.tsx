import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Loader2, Users, Send, MessageCircle, MapPin, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { toast } from "sonner";
const LiveStream = () => {
    const { data: liveStreamSettings, isLoading } = useQuery({
        queryKey: ["live-stream-settings"],
        queryFn: async () => {
            try {
                const { data, error } = await supabase.from("live_stream_settings").select("*").order("updated_at", { ascending: false }).limit(1);
                if (error) {
                    console.error("Failed to fetch live stream settings:", error);
                    return null;
                }
                return data?.[0] || null;
            } catch (err) {
                console.error("Live stream settings fetch error:", err);
                return null;
            }
        },
        refetchOnWindowFocus: true,
        staleTime: 0,
    });

    useEffect(() => {
        console.debug('liveStreamSettings:', liveStreamSettings);
    }, [liveStreamSettings]);
    // Local UI state
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const [iframeError, setIframeError] = useState(false);
    // persist user-play intent so refresh keeps attempting autoplay
    const [userPlayed, setUserPlayed] = useState<boolean>(() => {
        const v = localStorage.getItem('userPlayed');
        return v === null ? true : v === '1';
    });
    const [viewers, setViewers] = useState(0);
    const sessionIdRef = useRef<string>('');

    if (!sessionIdRef.current) {
        let sid = localStorage.getItem('viewer_session_id');
        if (!sid) {
            sid = crypto.randomUUID();
            localStorage.setItem('viewer_session_id', sid);
        }
        sessionIdRef.current = sid;
    }

    // Modal state for forcing users to enter details before watching
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingForm, setOnboardingForm] = useState({
        name: localStorage.getItem("chatName") || "",
        contact: localStorage.getItem("chatContact") || ""
    });
    const [onboardingLoading, setOnboardingLoading] = useState(false);
    const [userIpData, setUserIpData] = useState<{ ip?: string, city?: string, country_name?: string }>({});

    // Check if user is allowed to watch
    useEffect(() => {
        if (!localStorage.getItem("liveStreamJoined")) {
            setShowOnboarding(true);

            // Silently fetch IP-based location
            fetch('https://ipapi.co/json/')
                .then(res => res.json())
                .then(data => {
                    if (data.ip) setUserIpData(data);
                })
                .catch(err => console.debug("IP fetch failed", err));
        }
    }, []);

    const handleJoinStream = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = onboardingForm.name.trim();
        const contact = onboardingForm.contact.trim();

        if (!name || !contact) {
            toast.error("Please provide both Name and Contact details.");
            return;
        }

        setOnboardingLoading(true);
        try {
            const finalLocation = userIpData.city && userIpData.country_name
                ? `${userIpData.city}, ${userIpData.country_name} (${userIpData.ip || ''})`
                : "Unknown Location";

            const payload = {
                viewer_key: sessionIdRef.current,
                name: name,
                contact: contact,
                location: finalLocation
            };

            await supabase.from('live_participants').upsert(payload, { onConflict: 'viewer_key' });

            localStorage.setItem("chatName", name);
            localStorage.setItem("chatContact", contact);
            localStorage.setItem("liveStreamJoined", "true");
            setUserName(name);
            setShowOnboarding(false);
            toast.success("Welcome to the live stream!");
        } catch (err: any) {
            toast.error("Failed to join. Please try again.");
            console.error(err);
        } finally {
            setOnboardingLoading(false);
        }
    };

    // Track watcher presence
    useEffect(() => {
        const sessionId = sessionIdRef.current;

        const upsertPresence = async () => {
            await supabase.from('live_stream_watchers').upsert(
                { session_id: sessionId, is_active: true, last_seen: new Date().toISOString() },
                { onConflict: 'session_id' }
            );
        };

        const fetchCount = async () => {
            const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const { count } = await supabase
                .from('live_stream_watchers')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)
                .gte('last_seen', fiveMinAgo);
            setViewers(count ?? 0);
        };

        upsertPresence();
        fetchCount();

        const interval = setInterval(() => {
            upsertPresence();
            fetchCount();
        }, 30000);

        const handleBeforeUnload = () => {
            navigator.sendBeacon && supabase.from('live_stream_watchers').update({ is_active: false }).eq('session_id', sessionId);
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            supabase.from('live_stream_watchers').update({ is_active: false }).eq('session_id', sessionId);
        };
    }, []);

    // Chat state
    const [messages, setMessages] = useState<any[]>([]);
    const chatRef = useRef<HTMLDivElement | null>(null);
    const [userName, setUserName] = useState<string>(localStorage.getItem("chatName") || "");
    const [newMessage, setNewMessage] = useState<string>("");

    // Simple helper to convert popular watch URLs to embed URLs
    const getEmbedUrl = (url?: string) => {
        if (!url) return "";
        try {
            // Normalize whitespace
            const u = url.trim();
            // YouTube watch URL
            const ytMatch = u.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
            if (ytMatch && ytMatch[1]) return `https://www.youtube.com/embed/${ytMatch[1]}`;
            // If already an embed or absolute URL, return as-is
            if (/^https?:\/\//.test(u)) return u;
            return u;
        } catch (err) {
            console.debug("getEmbedUrl error", err);
            return "";
        }
    };

    // Load recent chat messages once
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data, error } = await supabase.from("live_chats").select("*").order("created_at", { ascending: true }).limit(200);
                if (error) throw error;
                if (mounted && data) setMessages(data as any[]);
            } catch (err) {
                console.debug("Failed to load messages", err);
            }
        })();

        return () => { mounted = false; };
    }, []);

    // Auto-scroll chat when messages update
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        let finalName = userName.trim();
        if (!finalName) {
            finalName = "Anonymous " + Math.floor(Math.random() * 1000);
            setUserName(finalName);
            localStorage.setItem("chatName", finalName);
        } else {
            localStorage.setItem("chatName", finalName);
        }

        const msgToSend = newMessage;
        setNewMessage("");

        const { error } = await supabase.from("live_chats").insert({
            user_name: finalName,
            message: msgToSend
        });

        if (error) {
            console.error(error);
            toast.error("Failed to send message");
        }
    };

    return (
        <div className="min-h-screen bg-navy text-foreground flex flex-col selection:bg-gold/30 selection:text-gold-light">
            <Navbar />

            <main className="flex-1 flex justify-center w-full pt-20 lg:pt-24 pb-8 px-2 md:px-4 lg:px-6 relative overflow-hidden">
                {/* Abstract Background Elements */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-[120px] animate-pulse-slow" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: "2s" }} />
                </div>

                <div className="relative z-10 w-full max-w-[1800px] flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">

                    {/* Left Column: Video & Details */}
                    <div className="flex-1 w-full flex flex-col gap-4 animate-fade-up min-w-0">
                        {/* 16:9 Video Player */}
                        <div className="w-full aspect-video rounded-xl md:rounded-2xl overflow-hidden bg-black relative shadow-2xl border border-border/10">
                            {isLoading ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gold">
                                    <Loader2 className="h-10 w-10 animate-spin" />
                                    <p className="font-body tracking-widest text-sm uppercase">Loading Stream...</p>
                                </div>
                            ) : !liveStreamSettings?.is_active || !liveStreamSettings?.url ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                    <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 opacity-50">
                                            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                                            <line x1="3" y1="3" x2="21" y2="21" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <p className="font-display text-xl font-bold">Stream Offline</p>
                                    <p className="text-sm text-muted-foreground/70">The live stream is currently not available. Check back later!</p>
                                </div>
                            ) : (
                                <iframe
                                    key={getEmbedUrl(liveStreamSettings.url)}
                                    src={(() => {
                                        const embed = getEmbedUrl(liveStreamSettings.url);
                                        if (!embed) return liveStreamSettings.url;
                                        const sep = embed.includes('?') ? '&' : '?';
                                        return `${embed}${sep}autoplay=1&mute=1`;
                                    })()}
                                    title="Live Stream"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    onLoad={() => { setIframeLoaded(true); setIframeError(false); }}
                                    onError={() => { setIframeError(true); setIframeLoaded(false); }}
                                    className="absolute inset-0 w-full h-full border-0"
                                />
                            )}
                        </div>

                        {/* Video Details / Description Box */}
                        <div className="w-full bg-card/40 backdrop-blur-xl border border-border/30 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground leading-tight">
                                        100% Answered Prayer <span className="text-gold">Live Stream</span>
                                    </h1>
                                </div>
                                <div className="flex gap-3 shrink-0">
                                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full">
                                        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                                        <span className="font-display font-bold text-sm tracking-widest uppercase text-red-500">LIVE</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-navy-light/50 px-3 py-1.5 rounded-full border border-border/50">
                                        <Users className="w-4 h-4 text-gold" />
                                        <span className="font-body font-semibold text-sm text-gold-light">{viewers} Watching</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-background/50 rounded-lg border border-border/20">
                                <p className="text-sm md:text-base text-foreground/80 font-body">
                                    Join us in fellowship and prayer from anywhere in the world. Experience the undeniable power of God at work.
                                    Feel free to share your prayer requests below or engage with the community in the live chat!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Live Chat (Sticky on Desktop) */}
                    <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col bg-card border border-border/50 rounded-xl md:rounded-2xl shadow-2xl h-[550px] lg:h-[calc(100vh-120px)] lg:sticky lg:top-[90px] overflow-hidden">
                        {/* Chat Header */}
                        <div className="p-4 border-b border-border/50 flex items-center gap-3 bg-muted/20">
                            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                                <MessageCircle className="w-5 h-5 text-gold" />
                            </div>
                            <div>
                                <h3 className="font-display font-bold text-lg leading-tight text-foreground">Live Chat</h3>
                                <p className="text-xs text-muted-foreground font-semibold">Top messages</p>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-background/30" ref={chatRef}>
                            {messages.map((msg, i) => (
                                <div key={msg.id || i} className="group animate-fade-in flex gap-3 items-start">
                                    <div className="w-8 h-8 rounded-full bg-gradient-navy shrink-0 flex items-center justify-center text-xs font-bold text-gold-light border border-gold/20">
                                        {msg.user_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2 mb-0.5">
                                            <span className="font-bold text-[13px] text-foreground/90 truncate">{msg.user_name}</span>
                                            <span className="text-[11px] text-muted-foreground shrink-0">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-sm font-body text-foreground/80 break-words leading-relaxed">{msg.message}</p>
                                    </div>
                                </div>
                            ))}
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col justify-center items-center text-center opacity-50 space-y-2">
                                    <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground" />
                                    <p className="text-sm font-semibold">Welcome to live chat!</p>
                                </div>
                            )}
                        </div>

                        {/* Chat Input */}
                        <form onSubmit={handleSendMessage} className="p-3 border-t border-border/50 bg-card space-y-3 shrink-0">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs text-muted-foreground">
                                    Chatting as <strong className="text-gold-light">{userName}</strong>
                                </span>
                            </div>
                            <div className="flex gap-2 relative">
                                <Input
                                    placeholder="Say something..."
                                    className="h-10 border-border bg-background focus-visible:ring-gold pr-10 shadow-inner"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    maxLength={250}
                                />
                                <Button type="submit" size="icon" disabled={!newMessage.trim()} className="absolute right-1 top-1 h-8 w-8 bg-transparent text-gold hover:bg-gold/10 hover:text-gold-light shrink-0 transition-colors">
                                    <Send className="w-4 h-4 ml-0.5" />
                                </Button>
                            </div>
                        </form>
                    </div>

                </div>
            </main>

            {/* Pre-watch Onboarding Modal */}
            <Dialog open={showOnboarding} onOpenChange={() => { }}>
                <DialogContent className="sm:max-w-[425px] [&>button]:hidden bg-card/95 backdrop-blur-xl border-gold/20 shadow-2xl relative">
                    <Link to="/" className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 z-50 text-foreground hover:bg-muted p-1 border border-border/50">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close and return to Homepage</span>
                    </Link>
                    <DialogHeader className="text-center pt-4">
                        <DialogTitle className="font-display text-2xl mb-2 text-foreground">Welcome to Live Service</DialogTitle>
                        <DialogDescription className="text-base text-foreground/80">
                            Please sign the digital attendance board to watch and participate in today's service!
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleJoinStream} className="space-y-6 pt-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-semibold text-foreground/90">Full Name <span className="text-red-500">*</span></Label>
                                <Input
                                    id="name"
                                    placeholder="Enter your full name"
                                    value={onboardingForm.name}
                                    onChange={(e) => setOnboardingForm({ ...onboardingForm, name: e.target.value })}
                                    required
                                    className="bg-background border-border h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact" className="text-sm font-semibold text-foreground/90">Phone number or Email <span className="text-red-500">*</span></Label>
                                <Input
                                    id="contact"
                                    placeholder="e.g. +2348000000000"
                                    value={onboardingForm.contact}
                                    onChange={(e) => setOnboardingForm({ ...onboardingForm, contact: e.target.value })}
                                    required
                                    className="bg-background border-border h-11"
                                />
                            </div>
                            <div className="bg-navy-light/40 border border-gold/10 rounded-lg p-3 flex items-start gap-3 mt-4">
                                <MapPin className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    For security and analytics, your approximate location ({userIpData.city || 'detecting...'}) will be recorded.
                                </p>
                            </div>
                        </div>
                        <DialogFooter className="sm:justify-stretch">
                            <Button type="submit" disabled={onboardingLoading} className="w-full bg-gradient-gold text-accent-foreground font-bold shadow-gold text-base h-11">
                                {onboardingLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Watch Now"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default LiveStream;
