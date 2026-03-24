import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback } from "react";
import { Button } from "./ui/button";

export const TestimonialMarquee = () => {
    const { data: testimonials = [] } = useQuery({
        queryKey: ["live-testimonials"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("testimonials")
                .select("*")
                .eq("is_approved", true)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data || [];
        },
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
                    {testimonials.map((testimonial, idx) => (
                        <div
                            key={idx}
                            className="flex-[0_0_100%] sm:flex-[0_0_50%] md:flex-[0_0_33.33%] lg:flex-[0_0_25%] pl-4"
                        >
                            <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-gold/20 hover:border-gold/30 transition-all duration-300 hover:-translate-y-2 h-full flex flex-col group">
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
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={scrollNext}
                    className="rounded-full bg-background border-border hover:text-gold w-12 h-12 shadow-md"
                >
                    <ChevronRight className="h-6 w-6" />
                </Button>
            </div>
        </div>
    );
};
