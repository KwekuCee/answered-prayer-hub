import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Loader2, Users, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const LiveStream = () => {
    const { data: liveStreamSettings, isLoading } = useQuery({
        queryKey: ["live-stream"],
        queryFn: async () => {
            const { data, error } = await supabase.from("live_stream_settings").select("*").order("updated_at", { ascending: false }).limit(1);
            if (error) console.error(error);
            return data?.[0] || { url: "https://www.youtube.com/watch?v=At7EcvV7wOM", is_active: true };
        },
    });

    const getEmbedUrl = (url: string) => {
        if (!url) return "";
        try {
            if (url.includes("youtube.com") || url.includes("youtu.be")) {
                let videoId = "";
                if (url.includes("watch?v=")) {
                    videoId = url.split("watch?v=")[1]?.split("&")[0];
                } else if (url.includes("youtu.be/")) {
                    videoId = url.split("youtu.be/")[1]?.split("?")[0];
                } else if (url.includes("youtube.com/live/")) {
                    videoId = url.split("youtube.com/live/")[1]?.split("?")[0];
                } else if (url.includes("embed/")) {
                    return url;
                }

                if (videoId) {
                    return `https://www.youtube.com/embed/${videoId}`;
                }
            }
        } catch (e) {
            console.error("URL Parsing error:", e);
        }
        return url;
    };

    // Chat State
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [userName, setUserName] = useState(() => localStorage.getItem("chatName") || "");
    const chatRef = useRef<HTMLDivElement>(null);
    const [viewers, setViewers] = useState(1);

    // Initial Fetch & Subscription
    useEffect(() => {
        // Fetch existing messages
        const fetchMessages = async () => {
            const { data } = await supabase.from("live_chats").select("*").eq("is_deleted", false).order("created_at", { ascending: true }).limit(100);
            if (data) setMessages(data);
        };
        fetchMessages();

        // Subscribe to New Messages
        const chatSubscription = supabase.channel('public:live_chats')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_chats' }, payload => {
                setMessages(prev => [...prev, payload.new]);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_chats' }, payload => {
                // Handle deletions
                if (payload.new.is_deleted) {
                    setMessages(prev => prev.filter(msg => msg.id !== payload.new.id));
                }
            })
            .subscribe();

        // Presence Tracking
        const presenceChannel = supabase.channel('stream-room', {
            config: { presence: { key: Math.random().toString() } }
        });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                setViewers(Object.keys(state).length);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({ online_at: new Date().toISOString() });
                }
            });

        return () => {
            supabase.removeChannel(chatSubscription);
            supabase.removeChannel(presenceChannel);
        };
    }, []);

    // Auto-scroll to bottom of chat
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
                            ) : true ? (
                                <iframe
                                    src={getEmbedUrl(liveStreamSettings?.url || "https://www.youtube.com/watch?v=At7EcvV7wOM")}
                                    title="Live Stream"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute inset-0 w-full h-full border-0"
                                ></iframe>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-card/40 backdrop-blur-md">
                                    <div className="w-16 h-16 bg-navy border border-border/50 rounded-full flex items-center justify-center mb-4">
                                        <span className="text-xl">📴</span>
                                    </div>
                                    <h3 className="text-2xl font-display font-bold text-foreground mb-2">Stream Offline</h3>
                                    <p className="text-muted-foreground font-body mb-6 text-center max-w-sm">
                                        We are currently not live. Please check back during our scheduled program times.
                                    </p>
                                    <Button asChild className="bg-gradient-gold text-navy hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                                        <Link to="/#testimonies">Read Testimonies</Link>
                                    </Button>
                                </div>
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
                            <Input
                                placeholder="Chat as... (Name)"
                                className="h-8 text-xs bg-background border-border shadow-inner"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                maxLength={25}
                            />
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
        </div>
    );
};

export default LiveStream;
