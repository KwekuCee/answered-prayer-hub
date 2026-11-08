import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, ChevronLeft, ChevronRight, WifiOff } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect } from "react";
import { Button } from "./ui/button";

const DEFAULT_OFFLINE_TESTIMONIALS = [
    {
        author_name: "Bro. Emmanuel T.",
        church_name: "Christ Embassy Korle Bu",
        content: "During the prayer session, divine healing swept through my body. The chronic spine pain that plagued me for 3 years disappeared completely!",
    },
    {
        author_name: "Sis. Grace A.",
        church_name: "Accra Central Zone",
        content: "I had been praying for open doors in my medical internship. Two days after joining the prayers, I was called and given my first-choice placement!",
    },
    {
        author_name: "Deaconess Rita K.",
        church_name: "Korle Bu Fellowship",
        content: "The atmospheric worship unlocked peace in my family that I hadn't felt in years. God is truly doing wonders at Korle Bu Stands in Worship!",
    },
    {
        author_name: "Dr. Kofi A.",
        church_name: "Korle Bu Enclave",
        content: "A financial breakthrough that seemed impossible came through in less than 24 hours. Glory to God for answered prayers!",
    }
];

export const TestimonialMarquee = () => {
    const { data: testimonials = [] } = useQuery({
        queryKey: ["live-testimonials"],
        queryFn: async () => {
            try {
                const { data, error } = await supabase
                    .from("testimonials")
                    .select("*")
                    .eq("is_approved", true)
                    .order("created_at", { ascending: false });

                if (error) {
                    console.warn("Supabase query failed, falling back to local cached testimonies:", error);
                    const local = localStorage.getItem("ksw_cached_testimonials");
                    if (local) return JSON.parse(local);
                    return DEFAULT_OFFLINE_TESTIMONIALS;
                }

                if (data && data.length > 0) {
                    try {
                        localStorage.setItem("ksw_cached_testimonials", JSON.stringify(data));
                    } catch (e) {
                        // ignore quota issues
                    }
                    return data;
                }

                // If remote returns empty or offline
                const local = localStorage.getItem("ksw_cached_testimonials");
                if (local) return JSON.parse(local);
                return DEFAULT_OFFLINE_TESTIMONIALS;
            } catch (err) {
                const local = localStorage.getItem("ksw_cached_testimonials");
                if (local) return JSON.parse(local);
                return DEFAULT_OFFLINE_TESTIMONIALS;
            }
        },
        initialData: () => {
            try {
                const local = localStorage.getItem("ksw_cached_testimonials");
                return local ? JSON.parse(local) : DEFAULT_OFFLINE_TESTIMONIALS;
            } catch {
                return DEFAULT_OFFLINE_TESTIMONIALS;
            }
        }
    });

    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" }, [
        Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })
    ]);

    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev();
    }, [emblaApi]);

    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.scrollNext();
    }, [emblaApi]);

    if (!testimonials.length) return null;

    return (
        <div className="w-full relative px-4 md:px-12 py-4">
            <div className="overflow-hidden cursor-grab active:cursor-grabbing pb-8" ref={emblaRef}>
                <div className="flex -ml-4">
                    {testimonials.map((testimonial: any, idx: number) => (
                        <div
                            key={testimonial.id || idx}
                            className="flex-[0_0_100%] sm:flex-[0_0_50%] md:flex-[0_0_33.33%] lg:flex-[0_0_25%] pl-4"
                        >
                            <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-gold/20 hover:border-gold/30 transition-all duration-300 hover:-translate-y-2 h-full flex flex-col group">
                                <div className="flex items-start gap-3 mb-4">
                                    <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5 group-hover:scale-110 group-hover:text-gold transition-all duration-300 flex-shrink-0" />
                                    <div>
                                        <p className="font-display font-semibold text-foreground text-lg leading-tight">{testimonial.author_name}</p>
                                        {testimonial.church_name && (
                                            <p className="text-sm text-muted-foreground font-body mt-1">{testimonial.church_name}</p>
                                        )}
                                    </div>
                                </div>
                                <p className="text-base font-body text-foreground/80 italic leading-relaxed flex-grow">"{testimonial.content}"</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="absolute top-1/2 left-0 md:left-4 -translate-y-1/2 z-10 hidden md:block">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={scrollPrev}
                    className="rounded-full bg-background/80 backdrop-blur-sm border-border hover:bg-card hover:text-gold w-10 h-10 shadow-lg"
                    aria-label="Previous Testimonial"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
            </div>

            <div className="absolute top-1/2 right-0 md:right-4 -translate-y-1/2 z-10 hidden md:block">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={scrollNext}
                    className="rounded-full bg-background/80 backdrop-blur-sm border-border hover:bg-card hover:text-gold w-10 h-10 shadow-lg"
                    aria-label="Next Testimonial"
                >
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>

            {/* Mobile Controls */}
            <div className="flex justify-center gap-4 mt-6 md:hidden">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={scrollPrev}
                    className="rounded-full bg-background border-border hover:text-gold w-12 h-12 shadow-md"
                    aria-label="Previous Testimonial"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={scrollNext}
                    className="rounded-full bg-background border-border hover:text-gold w-12 h-12 shadow-md"
                    aria-label="Next Testimonial"
                >
                    <ChevronRight className="h-6 w-6" />
                </Button>
            </div>
        </div>
    );
};

export default TestimonialMarquee;
