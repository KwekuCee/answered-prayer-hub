import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";

const Resources = () => {
    // Fetch files from the 'resources' bucket
    const { data: files, isLoading, error } = useQuery({
        queryKey: ["resources"],
        queryFn: async () => {
            const { data, error } = await supabase.storage.from("resources").list();
            if (error) {
                console.error("Storage error:", error);
                throw error;
            }
            // Filter out placeholder files like .emptyFolderPlaceholder
            return data.filter(file => file.name !== ".emptyFolderPlaceholder");
        },
    });

    const handleDownload = async (fileName: string) => {
        try {
            const { data, error } = await supabase.storage.from("resources").download(fileName);
            if (error) throw error;

            // Create a download link
            const url = URL.createObjectURL(data);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`Started downloading ${fileName}`);
        } catch (err: any) {
            toast.error("Failed to download file. Please try again.");
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-background relative selection:bg-gold/30 selection:text-gold-light flex flex-col">
            <Navbar />

            <main className="flex-1 flex flex-col items-center pt-32 pb-12 px-4 relative overflow-hidden">
                {/* Decorative Backgrounds */}
                <div className="fixed top-0 left-1/4 w-[50%] h-[50%] bg-gold/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
                <div className="fixed bottom-0 right-1/4 w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

                <div className="max-w-5xl w-full mx-auto space-y-12 relative z-10 w-full">
                    <div className="text-center animate-fade-down space-y-4">
                        <div className="inline-flex items-center justify-center p-4 bg-gold/10 rounded-full mb-2">
                            <BookOpen className="w-8 h-8 text-gold" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight">
                            Digital <span className="bg-gradient-gold bg-clip-text text-transparent">Library</span>
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground font-body max-w-2xl mx-auto">
                            Access study materials, prayer guides, and event resources designed to enrich your spiritual journey.
                        </p>
                    </div>

                    <div className="w-full max-w-4xl mx-auto">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4 text-gold">
                                <Loader2 className="w-12 h-12 animate-spin" />
                                <p className="font-body tracking-wider uppercase text-sm">Loading Resources...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-20 bg-card/40 rounded-3xl border border-dashed border-red-500/50">
                                <FileText className="w-12 h-12 text-red-500/50 mx-auto mb-4" />
                                <h3 className="text-xl font-display font-semibold text-foreground mb-2">Unavailable</h3>
                                <p className="text-muted-foreground font-body">We couldn't connect to the resource library at this time.</p>
                            </div>
                        ) : !files || files.length === 0 ? (
                            <div className="text-center py-20 bg-card/40 rounded-3xl border border-dashed border-border/50">
                                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                <h3 className="text-xl font-display font-semibold text-foreground mb-2">No resources available yet</h3>
                                <p className="text-muted-foreground font-body">Check back soon! We are actively preparing materials for the upcoming sessions.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-up">
                                {files.map((file) => (
                                    <Card key={file.id} className="bg-card/80 backdrop-blur-xl border-border/50 hover:shadow-gold/10 hover:border-gold/30 transition-all duration-300 group">
                                        <CardHeader className="pb-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                                                        <FileText className="w-5 h-5 text-gold" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="font-display text-lg group-hover:text-gold transition-colors line-clamp-1">
                                                            {file.name.replace(/\.[^/.]+$/, "")}
                                                        </CardTitle>
                                                        <CardDescription className="text-xs uppercase tracking-wider font-semibold mt-1">
                                                            PDF Document
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <Button
                                                variant="outline"
                                                className="w-full gap-2 border-border/50 hover:bg-gold hover:text-navy hover:border-gold transition-colors"
                                                onClick={() => handleDownload(file.name)}
                                            >
                                                <Download className="w-4 h-4" /> Download Resource
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Resources;
