import { useState } from "react";
import Navbar from "@/components/Navbar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, Loader2, BookOpen, Eye, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface ResourceItem {
    id: string;
    title: string;
    description: string;
    category: string;
    file_type: string;
    file_size: number;
    download_count: number;
    file_path?: string;
    file_name?: string;
    content?: string;
}

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const DEFAULT_OFFLINE_RESOURCES: ResourceItem[] = [
    {
        id: "res-ksw-1",
        title: "KSW 2026 Spiritual Preparation & Fasting Guide",
        description: "Official guide on spiritual alignment, daily scripture meditations, and fasting schedules leading up to Korle Bu Stands in Worship 2026.",
        category: "Prayer Guide",
        file_type: "pdf",
        file_size: 2450000,
        download_count: 1420,
        file_name: "KSW_2026_Fasting_Preparation_Guide.pdf",
        content: `KORLE BU STANDS IN WORSHIP 2026
SPIRITUAL PREPARATION & FASTING GUIDE

"Worship the Lord in the beauty of holiness; fear before Him, all the earth." — Psalm 96:9

1. THE VISION & CONSECRATION
Korle Bu Stands in Worship (KSW 2026) is an apostolic gathering of believers, healthcare professionals, students, and leaders lifting high praises to the Almighty God. As we approach the gathering, our hearts must be consecrated in pure worship and unity of faith.

2. DAILY FASTING SCHEDULE & DEVOTION
- Morning Devotion (6:00 AM - 7:00 AM): Thanksgiving, surrender, and spiritual awakening.
- Noon Prayer Focus (12:00 PM - 12:30 PM): Intercession for Korle Bu Teaching Hospital, healthcare staff, and miraculous recoveries.
- Evening Exaltation (5:30 PM - 6:00 PM): Proclamation of God's majesty and breaking the fast with thanksgiving.

3. SCRIPTURAL MEDITATIONS
- Isaiah 12:2: "Behold, God is my salvation; I will trust, and not be afraid."
- Psalm 100:1-5: "Make a joyful noise unto the Lord, all ye lands."
- John 4:23-24: "True worshipers shall worship the Father in spirit and in truth."

4. CONFESSION FOR KSW 2026
We declare that the power of God fills every corner of Korle Bu. Miracles, healings, and deep transformations are taking place as we stand in unified adoration!`
    },
    {
        id: "res-ksw-2",
        title: "7 Days Midnight Worship & Intercession Guide",
        description: "Scriptural points and prayer targets for the 7 midnight vigils uniting believers across Accra and beyond.",
        category: "Devotional",
        file_type: "pdf",
        file_size: 1850000,
        download_count: 980,
        file_name: "KSW_7_Days_Midnight_Intercession.pdf",
        content: `7 DAYS MIDNIGHT WORSHIP & INTERCESSION
KORLE BU STANDS IN WORSHIP 2026

"At midnight Paul and Silas prayed, and sang praises unto God: and the prisoners heard them." — Acts 16:25

DAY 1: THE THRONE OF GRACE
Focus: Entering His presence with thanksgiving and absolute praise.
Prayer: Lord, let Your glory saturate our lives and homes. We honor Your eternal sovereignty.

DAY 2: BREAKING EVERY FETTER
Focus: Deliverance, spiritual clarity, and breakthrough for every family represented.
Scripture: Isaiah 10:27 — The yoke shall be destroyed because of the anointing.

DAY 3: HEALING FOR THE INFIRM
Focus: Intensive prayer for the hospital wards at Korle Bu Teaching Hospital, healing beds, and specialized units.
Declaration: Jehovah Rapha is walking through every ward, dispensing healing!

DAY 4: EMPOWERMENT FOR HEALTHCARE WORKERS
Focus: Doctors, nurses, surgeons, pharmacists, paramedics, and support staff.
Prayer: Supernatural stamina, wisdom, empathy, and protection upon our frontline medical workforce.

DAY 5: REVIVAL AMONG THE YOUTH & STUDENTS
Focus: Medical students, nursing trainees, university campuses across Ghana.

DAY 6: MASSIVE HARVEST OF SOULS
Focus: Salvation of souls throughout Korle Bu, Mamprobi, Chorkor, and Greater Accra.

DAY 7: UNITED ASCENSION IN WORSHIP
Focus: Complete surrender, welcoming the Holy Spirit's tangible presence for KSW 2026.`
    },
    {
        id: "res-ksw-3",
        title: "Scriptural Meditations & Confessions Booklet",
        description: "A pocket guide of 50 scriptural declarations of faith, divine health, peace, and spiritual victory.",
        category: "Study Material",
        file_type: "pdf",
        file_size: 1240000,
        download_count: 810,
        file_name: "KSW_Scriptural_Meditations_Booklet.pdf",
        content: `SCRIPTURAL MEDITATIONS & FAITH DECLARATIONS
KORLE BU STANDS IN WORSHIP 2026

DECLARATION 1: DIVINE HEALTH
"By His stripes I am completely healed and made whole. Sickness, infirmity, and weakness have no place in my body." (1 Peter 2:24)

DECLARATION 2: SUPERNATURAL PEACE
"The peace of God which surpasses all human understanding guards my heart and mind through Christ Jesus." (Philippians 4:7)

DECLARATION 3: UNCOMMON FAVOR
"Thou, Lord, wilt bless the righteous; with favour wilt thou compass him as with a shield." (Psalm 5:12)

DECLARATION 4: SOUND MIND & WISDOM
"For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind." (2 Timothy 1:7)

DECLARATION 5: ANSWERED PRAYER
"This is the confidence that we have in Him, that, if we ask any thing according to His will, He heareth us." (1 John 5:14)`
    },
    {
        id: "res-ksw-4",
        title: "Official Hymns, Anthems & Worship Song Sheet",
        description: "Complete lyrics and scriptures for hymns and anthems including 'I'm Satisfied in Your Love', 'The Great I Am', and 'Awesome God'.",
        category: "Song Sheet",
        file_type: "pdf",
        file_size: 3100000,
        download_count: 2150,
        file_name: "KSW_Official_Hymns_SongSheet.pdf",
        content: `OFFICIAL HYMNS, ANTHEMS & WORSHIP LYRICS
KORLE BU STANDS IN WORSHIP 2026

SONG 1: I'M SATISFIED IN YOUR LOVE
Chorus:
I am satisfied in Your love, oh Lord
Nothing else compares to the beauty of Your grace
Your presence is my home, Your glory is my shield
Forever I will praise Your Holy Name.

SONG 2: THE GREAT I AM
Chorus:
Hallelujah, holy, holy
God Almighty, the Great I Am
Who is worthy? None beside Thee
God Almighty, the Great I Am!

SONG 3: YOU ARE GREAT
Chorus:
You are great, You do miracles so great
There is no one else like You
There is no one else like You!

SONG 4: AWESOME GOD
Chorus:
Our God is an awesome God
He reigns from heaven above
With wisdom, power, and love
Our God is an awesome God!

SONG 5: HOLY ARE YOU LORD
Chorus:
Holy, holy are You Lord God Almighty
Worthy is the Lamb, worthy is the Lamb
Amen.`
    }
];

const Resources = () => {
    const isOnline = useOnlineStatus();
    const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);

    // Fetch resources with local storage offline caching
    const { data: resources = DEFAULT_OFFLINE_RESOURCES, isLoading } = useQuery<ResourceItem[]>({
        queryKey: ["resources"],
        queryFn: async () => {
            try {
                const { data, error } = await supabase
                    .from("resources")
                    .select("*")
                    .eq("is_public", true)
                    .order("created_at", { ascending: false });

                if (error) {
                    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
                        console.warn("Resources table not found in schema cache. Using local/fallback resources.");
                    } else {
                        console.warn("Database error fetching resources:", error);
                    }
                    const cached = localStorage.getItem("ksw_cached_resources");
                    return cached ? JSON.parse(cached) : DEFAULT_OFFLINE_RESOURCES;
                }

                if (data && data.length > 0) {
                    try {
                        localStorage.setItem("ksw_cached_resources", JSON.stringify(data));
                    } catch {
                        // ignore quota
                    }
                    return data;
                }

                const cached = localStorage.getItem("ksw_cached_resources");
                return cached ? JSON.parse(cached) : DEFAULT_OFFLINE_RESOURCES;
            } catch (err) {
                console.warn("Offline or network issue, using cached resources:", err);
                const cached = localStorage.getItem("ksw_cached_resources");
                return cached ? JSON.parse(cached) : DEFAULT_OFFLINE_RESOURCES;
            }
        },
        initialData: () => {
            try {
                const cached = localStorage.getItem("ksw_cached_resources");
                return cached ? JSON.parse(cached) : DEFAULT_OFFLINE_RESOURCES;
            } catch {
                return DEFAULT_OFFLINE_RESOURCES;
            }
        }
    });

    const handleDownload = async (resource: ResourceItem) => {
        try {
            // If real storage file path is present and we're online
            if (resource.file_path && isOnline) {
                const { data, error } = await supabase.storage.from("resources").download(resource.file_path);
                if (!error && data) {
                    const url = URL.createObjectURL(data);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = resource.file_name || `${resource.title}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    URL.revokeObjectURL(url);
                    document.body.removeChild(a);

                    try {
                        await supabase.rpc('increment_download_count', { resource_id: resource.id });
                    } catch {
                        // ignore RPC offline
                    }
                    toast.success(`Downloaded ${resource.title}`);
                    return;
                }
            }

            // Offline or seeded fallback resource: generate document download
            const content = resource.content || `${resource.title}\n\n${resource.description}\n\nKorle Bu Stands in Worship 2026\nOfficial Resource Document`;
            const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = (resource.file_name || `${resource.title}.txt`).replace(".pdf", ".txt");
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`Downloaded offline resource: ${resource.title}`);
        } catch (err: any) {
            toast.error("Resource saved to offline cache. You can view it directly.");
            setSelectedResource(resource);
        }
    };

    return (
        <div className="min-h-screen bg-background relative selection:bg-gold/30 selection:text-gold flex flex-col">
            <Navbar />

            <main className="flex-1 flex flex-col items-center pt-32 pb-16 px-4 relative overflow-hidden">
                {/* Decorative Backgrounds */}
                <div className="fixed top-0 left-1/4 w-[50%] h-[50%] bg-gold/5 rounded-full blur-[140px] pointer-events-none -z-10"></div>
                <div className="fixed bottom-0 right-1/4 w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none -z-10"></div>

                <div className="max-w-5xl w-full mx-auto space-y-12 relative z-10">
                    <div className="text-center animate-fade-down space-y-4">
                        <div className="inline-flex items-center justify-center p-3.5 bg-gold/10 border border-gold/30 rounded-2xl mb-2">
                            <BookOpen className="w-8 h-8 text-gold" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight">
                            Digital <span className="bg-gradient-gold bg-clip-text text-transparent">Library</span>
                        </h1>
                        <p className="text-base md:text-lg text-muted-foreground font-body max-w-2xl mx-auto">
                            Access fasting guides, midnight prayer points, hymns, and spiritual materials for Korle Bu Stands in Worship 2026.
                        </p>

                        <div className="flex items-center justify-center gap-2 pt-2">
                            <Badge variant="outline" className="border-gold/40 text-gold bg-gold/5 gap-1.5 py-1 px-3">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {isOnline ? "Cached for Offline Use via Service Worker" : "Offline Mode — Cached Library Available"}
                            </Badge>
                        </div>
                    </div>

                    <div className="w-full max-w-4xl mx-auto">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4 text-gold">
                                <Loader2 className="w-12 h-12 animate-spin" />
                                <p className="font-body tracking-wider uppercase text-sm">Loading Resources...</p>
                            </div>
                        ) : resources.length === 0 ? (
                            <div className="text-center py-20 bg-card/40 rounded-3xl border border-dashed border-border/50">
                                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                <h3 className="text-xl font-display font-semibold text-foreground mb-2">No resources available yet</h3>
                                <p className="text-muted-foreground font-body">Check back soon! We are actively preparing materials for the upcoming sessions.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-up">
                                {resources.map((resource) => (
                                    <Card key={resource.id} className="bg-card/80 backdrop-blur-xl border-border/50 hover:shadow-gold/10 hover:border-gold/30 transition-all duration-300 group flex flex-col justify-between">
                                        <CardHeader className="pb-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                                                        <FileText className="w-5 h-5 text-gold" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="font-display text-lg group-hover:text-gold transition-colors line-clamp-2">
                                                            {resource.title}
                                                        </CardTitle>
                                                        <CardDescription className="text-xs uppercase tracking-wider font-semibold mt-1 text-gold/80">
                                                            {(resource.file_type || "PDF").toUpperCase()} • {(resource.category || "General").replace('_', ' ')}
                                                        </CardDescription>
                                                        {resource.description && (
                                                            <p className="text-sm text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                                                                {resource.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        
                                        <CardContent className="pt-2">
                                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 pb-3 border-b border-border/40">
                                                <span>Size: {formatFileSize(resource.file_size || 1500000)}</span>
                                                <span>{resource.download_count || 120} downloads</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1.5 border-border/60 hover:border-gold hover:text-gold rounded-xl"
                                                    onClick={() => setSelectedResource(resource)}
                                                >
                                                    <Eye className="w-4 h-4" /> View Guide
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    className="gap-1.5 bg-gradient-gold text-navy font-bold rounded-xl hover:shadow-gold transition-all"
                                                    onClick={() => handleDownload(resource)}
                                                >
                                                    <Download className="w-4 h-4" /> Download
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Offline Document Viewer Dialog */}
            <Dialog open={!!selectedResource} onOpenChange={(open) => !open && setSelectedResource(null)}>
                <DialogContent className="sm:max-w-2xl bg-zinc-950 border-gold/40 text-foreground max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="border-gold/40 text-gold bg-gold/10">
                                {selectedResource?.category}
                            </Badge>
                            <Badge variant="secondary" className="text-xs bg-zinc-800 text-muted-foreground">
                                Offline Available
                            </Badge>
                        </div>
                        <DialogTitle className="text-2xl font-display font-bold text-foreground">
                            {selectedResource?.title}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground font-body text-sm">
                            {selectedResource?.description}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 p-5 rounded-2xl bg-zinc-900/90 border border-border/60 font-mono text-xs md:text-sm whitespace-pre-wrap leading-relaxed text-zinc-200 selection:bg-gold/30">
                        {selectedResource?.content || (
                            <div className="space-y-4 font-sans text-sm">
                                <p className="font-semibold text-gold">Korle Bu Stands in Worship 2026 — Official Material</p>
                                <p className="text-muted-foreground">
                                    This document is stored in your device's offline cache. You can study and refer to it at any time during your prayer walks, personal devotions, or hospital visits.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
                        <Button
                            variant="ghost"
                            onClick={() => setSelectedResource(null)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Close
                        </Button>
                        {selectedResource && (
                            <Button
                                onClick={() => handleDownload(selectedResource)}
                                className="bg-gradient-gold text-navy font-bold gap-2 rounded-xl"
                            >
                                <Download className="w-4 h-4" /> Download Copy
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Resources;

