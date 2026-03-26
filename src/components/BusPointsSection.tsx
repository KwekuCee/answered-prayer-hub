import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bus, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import ErrorBoundary from "./ErrorBoundary";

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* Map View */}
                        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-4 shadow-xl h-[500px] overflow-hidden sticky top-24 z-10">
                            <ErrorBoundary>
                                <MapContainer
                                    center={[5.6037, -0.1870]} // Default center (Accra, adjust as needed)
                                    zoom={11}
                                    scrollWheelZoom={false}
                                    className="w-full h-full rounded-2xl z-0"
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    {busPoints.map((bp: any) => (
                                        bp.lat && bp.lng && (
                                            <Marker key={bp.id} position={[bp.lat, bp.lng]}>
                                                <Popup className="font-body">
                                                    <strong className="text-gold font-display text-base block mb-1">{bp.name}</strong>
                                                    <span className="block mb-1">{bp.location}</span>
                                                    <span className="text-muted-foreground font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> {bp.departure_time || "TBD"}</span>
                                                </Popup>
                                            </Marker>
                                        )
                                    ))}
                                </MapContainer>
                            </ErrorBoundary>
                        </div>

                        {/* List View */}
                        <div className="space-y-4 max-h-[500px] lg:overflow-y-auto pr-2 custom-scrollbar">
                            {busPoints.map((bp: any) => (
                                <Card key={bp.id} className="bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-gold/20 hover:border-gold/50 transition-all duration-300 transform hover:-translate-y-1">
                                    <CardHeader className="py-4">
                                        <CardTitle className="font-display text-xl flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                                                    <Bus className="w-4 h-4 text-gold" />
                                                </div>
                                                {bp.name}
                                            </div>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 pb-4">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                            <p className="text-sm font-body text-foreground leading-relaxed">{bp.location}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <p className="text-sm font-body font-semibold text-foreground">{bp.departure_time || "TBD"}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
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
