import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin } from "lucide-react";

export const LocationSection = () => {
    const { data: activeProgram, isLoading } = useQuery({
        queryKey: ["active-program"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("programs")
                .select("*")
                .eq("is_active", true)
                .maybeSingle();

            if (error) {
                console.error("Error fetching active program:", error);
                return null;
            }
            return data;
        },
    });

    const locationName = activeProgram?.location_name || "our upcoming location";
    const mapIframeSrc = activeProgram?.map_iframe_url || "";

    return (
        <section id="location" className="py-24 px-4 bg-muted/20 relative">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12 animate-fade-up">
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
                        Join Us at <span className="bg-gradient-gold bg-clip-text text-transparent">{locationName}</span>
                    </h2>
                    <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
                        Experience the move of God physically. Find directions to {locationName} below.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    {/* Location Info & Effects */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-xl rounded-2xl p-8 hover:shadow-gold/20 transition-all duration-500 transform hover:-translate-y-1">
                            <h3 className="text-2xl font-display font-bold text-foreground mb-2">Prayer Ground</h3>
                            <p className="text-muted-foreground font-body mb-4">
                                100% Answered Prayer Grounds, <br />
                                {locationName}
                            </p>
                            {mapIframeSrc && (
                                <a
                                    href={`https://maps.google.com/?q=${encodeURIComponent(locationName)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-sm font-semibold font-body text-gold hover:text-gold-light transition-colors"
                                >
                                    Open in Google Maps &rarr;
                                </a>
                            )}
                        </div>

                        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-8">
                            <h3 className="text-xl font-display font-bold text-foreground mb-2">Need a ride?</h3>
                            <p className="text-sm text-muted-foreground font-body mb-4">
                                We provide free bus services from various locations to the prayer grounds.
                            </p>
                            <a
                                href="#bus"
                                onClick={(e) => {
                                    e.preventDefault();
                                    document.querySelector("#bus")?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className="inline-block px-5 py-2.5 bg-background text-foreground text-sm font-semibold font-body rounded-lg shadow-sm hover:shadow-md border border-border transition-all"
                            >
                                View Bus Routes
                            </a>
                        </div>
                    </div>

                    {/* Animated Map Container */}
                    <div className="lg:col-span-8 relative h-[400px] md:h-[500px] w-full rounded-2xl overflow-hidden shadow-2xl border border-border/50 group">
                        {(isLoading || !mapIframeSrc) && (
                            <div className="absolute inset-0 bg-muted flex flex-col items-center justify-center z-20">
                                <MapPin className="h-8 w-8 text-gold mb-3 opacity-50" />
                                <span className="text-muted-foreground font-body text-center px-6">
                                    {isLoading ? "Loading Map Data..." : "Detailed mapping will be available once the next session location is confirmed."}
                                </span>
                            </div>
                        )}

                        {mapIframeSrc && (
                            <iframe
                                src={mapIframeSrc}
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen={true}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                className="absolute inset-0 z-10 transition-transform duration-700 ease-in-out group-hover:scale-105"
                            ></iframe>
                        )}

                        <div className="absolute inset-0 pointer-events-none border-[12px] border-background/20 z-20 mix-blend-overlay"></div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default LocationSection;
