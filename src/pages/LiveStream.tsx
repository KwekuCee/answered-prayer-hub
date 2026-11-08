import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Loader2, Users, Send, MessageCircle, MapPin, X, HelpCircle, BarChart2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
                const { data } = await supabase.from("live_stream_settings").select("*").order("updated_at", { ascending: false }).limit(1);
                return data?.[0] || null;
            } catch {
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

    // --- Q&A AND POLLS LOGIC ---
    const [questions, setQuestions] = useState<any[]>([]);
    const [newQuestion, setNewQuestion] = useState("");
    const [polls, setPolls] = useState<any[]>([]);
    const [userVotes, setUserVotes] = useState<Record<string, number>>({});
    const [voteCounts, setVoteCounts] = useState<Record<string, Record<number, number>>>({});

    useEffect(() => {
        let mounted = true;

        const fetchInteractions = async () => {
            try {
                // Fetch questions (UI decides formatting based on approval)
                const { data: qs } = await supabase.from("live_questions").select("*").order("created_at", { ascending: false }).limit(100);
                if (mounted && qs) setQuestions(qs);

                // Fetch active polls
                const { data: ps } = await supabase.from("live_polls").select("*").eq("is_active", true).order("created_at", { ascending: false });
                if (mounted && ps) setPolls(ps);

                // Fetch my votes
                if (sessionIdRef.current) {
                    const { data: vs } = await supabase.from("live_poll_votes").select("poll_id, option_index").eq("viewer_key", sessionIdRef.current);
                    if (mounted && vs) {
                        const voteMap: Record<string, number> = {};
                        vs.forEach(v => { if (v.poll_id) voteMap[v.poll_id] = v.option_index; });
                        setUserVotes(voteMap);
                    }
                }

                // Fetch all votes for tallies
                const { data: allVotes } = await supabase.from("live_poll_votes").select("poll_id, option_index");
                if (mounted && allVotes) {
                    const counts: Record<string, Record<number, number>> = {};
                    allVotes.forEach(v => {
                        if (!v.poll_id) return;
                        if (!counts[v.poll_id]) counts[v.poll_id] = {};
                        counts[v.poll_id][v.option_index] = (counts[v.poll_id][v.option_index] || 0) + 1;
                    });
                    setVoteCounts(counts);
                }
            } catch (err) {
                console.debug("Failed to fetch interactions", err);
            }
        };

        fetchInteractions();

        // Supabase Realtime Subscriptions
        const qSub = supabase.channel('live-questions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'live_questions' }, fetchInteractions)
            .subscribe();

        const pSub = supabase.channel('live-polls')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'live_polls' }, fetchInteractions)
            .subscribe();

        const vSub = supabase.channel('live-votes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'live_poll_votes' }, fetchInteractions)
            .subscribe();

        return () => {
            mounted = false;
            supabase.removeChannel(qSub);
            supabase.removeChannel(pSub);
            supabase.removeChannel(vSub);
        };
    }, []);

    const handleSendQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newQuestion.trim()) return;

        let finalName = userName.trim() || ("Anonymous " + Math.floor(Math.random() * 1000));
        setUserName(finalName);
        localStorage.setItem("chatName", finalName);

        const qToSend = newQuestion;
        setNewQuestion("");

        const { error } = await supabase.from("live_questions").insert({
            user_name: finalName,
            question: qToSend
        });

        if (error) {
            console.error(error);
            toast.error("Failed to submit question");
        } else {
            toast.success("Question submitted for review!");
        }
    };

    const handleVote = async (pollId: string, optionIndex: number) => {
        if (!sessionIdRef.current) return;

        // Optimistic UI update
        setUserVotes(prev => ({ ...prev, [pollId]: optionIndex }));

        const { error } = await supabase.from("live_poll_votes").insert({
            poll_id: pollId,
            viewer_key: sessionIdRef.current,
            option_index: optionIndex
        });

        if (error) {
            // Revert on error
            toast.error("Failed to submit vote. You may have already voted.");
            setUserVotes(prev => { const n = { ...prev }; delete n[pollId]; return n; });
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
                                        Korle Bu Stands in Worship <span className="text-gold">Live Stream</span>
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

                    {/* Right Column: Interaction Panel (Sticky on Desktop) */}
                    <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col bg-card border border-border/50 rounded-xl md:rounded-2xl shadow-2xl h-[550px] lg:h-[calc(100vh-120px)] lg:sticky lg:top-[90px] overflow-hidden">

                        <Tabs defaultValue="chat" className="flex flex-col h-full w-full">
                            <div className="px-4 pt-4 pb-2 border-b border-border/50 bg-muted/20">
                                <TabsList className="grid w-full grid-cols-3 bg-background border border-border/50 h-10">
                                    <TabsTrigger value="chat" className="text-xs sm:text-sm font-semibold data-[state=active]:bg-gradient-gold data-[state=active]:text-foreground"><MessageCircle className="w-3.5 h-3.5 mr-1" />Chat</TabsTrigger>
                                    <TabsTrigger value="qa" className="text-xs sm:text-sm font-semibold data-[state=active]:bg-gradient-gold data-[state=active]:text-foreground"><HelpCircle className="w-3.5 h-3.5 mr-1" />Q&A</TabsTrigger>
                                    <TabsTrigger value="polls" className="text-xs sm:text-sm font-semibold data-[state=active]:bg-gradient-gold data-[state=active]:text-foreground"><BarChart2 className="w-3.5 h-3.5 mr-1" />Polls</TabsTrigger>
                                </TabsList>
                            </div>

                            {/* Chat Tab */}
                            <TabsContent value="chat" className="flex-1 flex flex-col mt-0 h-full overflow-hidden data-[state=inactive]:hidden">

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
                            </TabsContent>

                            {/* Q&A Tab */}
                            <TabsContent value="qa" className="flex-1 flex flex-col mt-0 h-full overflow-hidden data-[state=inactive]:hidden p-4">
                                <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar flex flex-col bg-background/30 rounded-lg border border-border/50 p-4">
                                    {questions.length === 0 ? (
                                        <div className="flex-1 flex flex-col justify-center items-center text-center opacity-50 space-y-2">
                                            <HelpCircle className="w-10 h-10 mx-auto text-muted-foreground" />
                                            <p className="text-sm font-semibold">Ask questions during the service.</p>
                                            <p className="text-xs max-w-[200px]">Approved questions will appear here for everyone to see.</p>
                                        </div>
                                    ) : (
                                        questions.map((q) => (
                                            <div key={q.id} className="bg-card p-3 rounded-lg border border-border/50 shadow-sm animate-fade-in relative flex flex-col shrink-0">
                                                {!q.is_approved && (
                                                    <div className="absolute top-2 right-2 group cursor-help transition-all">
                                                        <span className="flex h-2.5 w-2.5 relative">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <span className="font-bold text-[13px] text-foreground/90 truncate">{q.user_name}</span>
                                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                                        {new Date(q.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-body text-foreground/80 break-words leading-relaxed">{q.question}</p>

                                                {/* Answer Section Flag */}
                                                {q.is_answered ? (
                                                    <div className="mt-3 pt-2 border-t border-border/30">
                                                        <div className="flex items-center gap-1.5 text-gold mb-1">
                                                            <MessageCircle className="w-3.5 h-3.5 fill-gold" />
                                                            <span className="text-[11px] font-bold uppercase tracking-wider">Answered Live</span>
                                                        </div>
                                                    </div>
                                                ) : !q.is_approved ? (
                                                    <p className="text-[10px] text-yellow-500/80 mt-2 italic border-t border-border/20 pt-1.5">Awaiting moderation</p>
                                                ) : null}
                                            </div>
                                        ))
                                    )}
                                </div>
                                <form className="mt-4 shrink-0 flex gap-2" onSubmit={handleSendQuestion}>
                                    <Input
                                        placeholder="Type your question..."
                                        className="flex-1 bg-background border-border focus-visible:ring-gold"
                                        value={newQuestion}
                                        onChange={(e) => setNewQuestion(e.target.value)}
                                        maxLength={300}
                                    />
                                    <Button type="submit" disabled={!newQuestion.trim()} className="bg-gold hover:bg-gold-light text-navy font-bold">Ask</Button>
                                </form>
                            </TabsContent>

                            {/* Polls Tab */}
                            <TabsContent value="polls" className="flex-1 flex flex-col mt-0 h-full overflow-hidden data-[state=inactive]:hidden p-4">
                                <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar bg-background/30 border border-border/50 rounded-lg p-3">
                                    {polls.length === 0 ? (
                                        <div className="h-full flex flex-col justify-center items-center text-center opacity-50 space-y-2">
                                            <BarChart2 className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                                            <p className="text-sm font-semibold">No active polls.</p>
                                            <p className="text-xs max-w-[200px]">When a poll is launched, you can cast your vote here.</p>
                                        </div>
                                    ) : (
                                        polls.map(poll => {
                                            const totalVotesForPoll = Object.values(voteCounts[poll.id] || {}).reduce((a, b) => a + b, 0);
                                            const hasVoted = userVotes[poll.id] !== undefined;

                                            return (
                                                <div key={poll.id} className="bg-card p-4 rounded-xl border border-border/50 shadow-md relative overflow-hidden animate-fade-in group shrink-0">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-gold"></div>
                                                    <div className="flex items-center justify-between mb-3 px-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="flex h-2.5 w-2.5 relative">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                                            </span>
                                                            <h4 className="font-display font-bold text-sm tracking-wide uppercase text-foreground/90 leading-tight">Live Poll</h4>
                                                        </div>
                                                    </div>
                                                    <p className="font-body text-base font-semibold mb-4 px-1">{poll.question}</p>

                                                    <div className="space-y-2.5">
                                                        {Array.isArray(poll.options) && poll.options.map((opt: any, i: number) => {
                                                            const count = voteCounts[poll.id]?.[i] || 0;
                                                            const percent = totalVotesForPoll > 0 ? Math.round((count / totalVotesForPoll) * 100) : 0;
                                                            const isSelected = userVotes[poll.id] === i;

                                                            return (
                                                                <button
                                                                    key={i}
                                                                    disabled={hasVoted}
                                                                    onClick={() => handleVote(poll.id, i)}
                                                                    className={`w-full relative overflow-hidden rounded-lg border text-left flex justify-between items-center z-10 p-3 transition-colors ${isSelected ? 'border-gold bg-gold/5' : 'border-border/50 bg-background/50 hover:bg-muted/30 disabled:opacity-80'}`}
                                                                >
                                                                    {hasVoted && (
                                                                        <div
                                                                            className="absolute left-0 top-0 h-full bg-gold/15 -z-10 transition-all duration-1000 ease-out"
                                                                            style={{ width: `${percent}%` }}
                                                                        />
                                                                    )}
                                                                    <span className={`text-sm z-10 ${isSelected ? 'font-bold text-foreground' : 'text-foreground/90 font-medium'}`}>
                                                                        {opt}
                                                                    </span>
                                                                    {hasVoted && (
                                                                        <span className="text-xs font-bold text-gold z-10 ml-3">{percent}%</span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {hasVoted && (
                                                        <div className="mt-4 pt-3 border-t border-border/30 text-right">
                                                            <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">{totalVotesForPoll} Total Votes</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </main>

            {/* Pre-watch Onboarding Modal */}
            <Dialog open={showOnboarding} onOpenChange={() => { }}>
                <DialogContent className="sm:max-w-[425px] [&>button]:hidden bg-card/95 backdrop-blur-xl border-gold/20 shadow-2xl">
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
