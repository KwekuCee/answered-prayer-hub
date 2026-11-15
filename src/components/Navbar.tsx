import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import logoWhite from "@/assets/logo-white.webp";
import { Button } from "@/components/ui/button";

export const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);

    const { data: liveStreamSettings } = useQuery({
        queryKey: ["live-stream"],
        queryFn: async () => {
            try {
                const { data } = await supabase.from("live_stream_settings").select("is_active").order("updated_at", { ascending: false }).limit(1);
                return data?.[0] || { is_active: true };
            } catch {
                return { is_active: true };
            }
        },
    });

    const links = [
        { label: "Home", href: "/" },
        { label: "About", href: "/#about" },
        { label: "Location", href: "/#location" },
        { label: "Prayer", href: "/#prayer" },
        { label: "Resources", href: "/resources" },
        { label: "Give", href: "/donate" },
        { label: "Live", href: "/live" },
    ];

    return (
        <nav aria-label="Main navigation" className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[60rem] z-50 transition-all duration-300">
            {/* Complete Floating Rounded Rectangle Navbar Container */}
            <div className="relative bg-background/90 backdrop-blur-xl border border-gold/30 rounded-full px-4 lg:px-5 py-2.5 shadow-gold flex items-center justify-between gap-4">
                
                {/* Left Side: White Logo (increased size for prominence & WebP loaded) */}
                <Link to="/" className="flex items-center gap-2 shrink-0 z-10">
                    <img 
                        src={logoWhite} 
                        alt="Korle Bu Stands in Worship" 
                        loading="eager"
                        decoding="async"
                        className="h-14 md:h-16 w-auto object-contain drop-shadow transition-transform hover:scale-105" 
                    />
                </Link>

                {/* Links share layout space with the logo and account controls. */}
                <div className="hidden lg:flex items-center justify-center gap-4 flex-1 min-w-0">
                    {links.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="text-foreground/80 hover:text-gold font-body text-xs font-semibold uppercase tracking-normal transition-colors whitespace-nowrap"
                            onClick={(e) => {
                                if (link.href.startsWith("/#")) {
                                    const id = link.href.split("/")[1];
                                    if (window.location.pathname === "/") {
                                        e.preventDefault();
                                        document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
                                    }
                                }
                            }}
                        >
                            {link.label}
                            {link.label === "Live" && liveStreamSettings?.is_active && (
                                <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-destructive animate-pulse" />
                            )}
                        </a>
                    ))}
                </div>

                {/* Right Side: Register, Login */}
                <div className="hidden lg:flex items-center gap-2 shrink-0 z-10">
                    <Link
                        to="/register"
                        className="px-4 py-2 bg-gradient-gold text-navy font-bold font-body text-xs rounded-full shadow-gold hover:opacity-90 transition-all whitespace-nowrap"
                    >
                        Register
                    </Link>
                    <Link
                        to="/admin"
                        className="px-4 py-2 border border-gold/40 text-foreground hover:text-gold font-bold font-body text-xs rounded-full transition-all whitespace-nowrap"
                    >
                        Login
                    </Link>
                </div>

                {/* Mobile Menu */}
                <div className="lg:hidden flex items-center gap-2 ml-auto z-10">
                    <Link
                        to="/register"
                        className="px-3 py-1.5 bg-gradient-gold text-navy font-bold font-body text-xs rounded-full shadow-gold"
                    >
                        Register
                    </Link>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label={isOpen ? "Close menu" : "Open menu"}
                        aria-expanded={isOpen}
                        aria-controls="mobile-navigation"
                        className="shrink-0 text-foreground hover:text-gold"
                    >
                        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                </div>
            </div>

            {/* Mobile Navigation Dropdown */}
            {isOpen && (
                <div id="mobile-navigation" className="lg:hidden mt-2 bg-background/95 backdrop-blur-2xl border border-gold/30 rounded-3xl p-5 shadow-gold space-y-2 animate-fade-down">
                    <div className="grid grid-cols-2 gap-2">
                        {links.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                className="px-3 py-2 text-xs font-semibold font-body text-foreground hover:bg-gold/10 hover:text-gold rounded-xl transition-colors"
                                onClick={(e) => {
                                    setIsOpen(false);
                                    if (link.href.startsWith("/#")) {
                                        const id = link.href.split("/")[1];
                                        if (window.location.pathname === "/") {
                                            e.preventDefault();
                                            document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
                                        }
                                    }
                                }}
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>
                    <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                        <Link to="/live" onClick={() => setIsOpen(false)} className="text-gold font-semibold flex items-center gap-1.5">
                            Watch Live Stream {liveStreamSettings?.is_active && <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />}
                        </Link>
                        <Link to="/admin" onClick={() => setIsOpen(false)} className="text-foreground/80 hover:text-gold">
                            Admin Login &rarr;
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;

