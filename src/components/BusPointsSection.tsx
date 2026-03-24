import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bus, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const BusPointsSection = () => {
    const { data: activeProgram } = useQuery({
        queryKey: ["active-program"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("programs")
                .select("id")
                .eq("is_active", true)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
    });

    const { data: busPoints, isLoading } = useQuery({
        queryKey: ["busPoints", activeProgram?.id],
        enabled: !!activeProgram?.id, // Only fetch if we have an active program
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bus_points")
                .select("*")
                .eq("program_id", activeProgram!.id)
                .order("name");

            if (error) {
                console.error("Error fetching bus points:", error);
                return [];
            }
            return data || [];
        },
    });

    return (
        <section id="bus" className="py-24 px-4 bg-muted/20 border-t border-border/30 relative">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-14 animate-fade-up">
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
                        Free <span className="bg-gradient-gold bg-clip-text text-transparent">Bus Services</span>
                    </h2>
                    <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
                        Find the nearest pickup location to join us for the upcoming camp meetings.
                    </p>
                </div>

                {(isLoading && !!activeProgram) ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
                    </div>
                ) : busPoints && busPoints.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {busPoints.map((bp: any) => (
                            <Card key={bp.id} className="bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-gold/20 hover:border-gold/50 transition-all duration-300 transform hover:-translate-y-1">
                                <CardHeader>
                                    <CardTitle className="font-display text-xl flex items-center gap-2">
                                        <Bus className="w-5 h-5 text-gold" />
                                        {bp.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                                        <p className="text-sm font-body text-foreground leading-relaxed">{bp.location}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
                                        <p className="text-sm font-body font-semibold text-foreground">{bp.departure_time || "TBD"}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-card/40 rounded-3xl border border-dashed border-border/50">
                        <Bus className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-display font-semibold text-foreground mb-2">No active bus routes</h3>
                        <p className="text-muted-foreground font-body">
                            Bus schedules for this program are currently being updated. Please check back later.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default BusPointsSection;
