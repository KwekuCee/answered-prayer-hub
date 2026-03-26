import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo.png";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const { data: liveStreamSettings } = useQuery({
        queryKey: ["live-stream"],
        queryFn: async () => {
            const { data, error } = await supabase.from("live_stream_settings").select("is_active").order("updated_at", { ascending: false }).limit(1);
            if (error) console.error(error);
            return data?.[0] || { is_active: true };
        },
    });

    const links = [
        { label: "Home", href: "/" },
        { label: "About", href: "/#about" },
        { label: "Location", href: "/#location" },
        { label: "Prayer", href: "/#prayer" },
        { label: "Bus Routes", href: "/#bus" },
        { label: "Testimonies", href: "/#testimonies" },
        { label: "Resources", href: "/resources" },
        { label: "Give", href: "/donate" },
    ];

    return (
        <nav
            className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-background/80 backdrop-blur-md shadow-md border-b border-border/50" : "bg-transparent"
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <div className="flex-shrink-0 flex items-center gap-3">
                        <a href="/" className="flex items-center gap-2">
                            <img src={logo} alt="100% Answered Prayer" className="h-16 md:h-20 w-auto object-contain" />
                        </a>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex space-x-8 items-center">
                        {links.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                className="text-muted-foreground hover:text-foreground font-body text-sm font-semibold transition-colors"
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
                            </a>
                        ))}
                        <a
                            href="/live"
                            className="text-muted-foreground hover:text-foreground font-body text-sm font-semibold transition-colors flex items-center gap-1.5"
                        >
                            Live Stream {liveStreamSettings?.is_active && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                        </a>
                        <a
                            href="/register"
                            className="px-5 py-2.5 bg-gradient-gold text-accent-foreground font-semibold font-body text-sm rounded-lg shadow-gold hover:-translate-y-0.5 transition-transform"
                        >
                            Get Started
                        </a>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-4">
                        <a
                            href="/live"
                            className="text-muted-foreground font-body text-xs font-semibold flex items-center gap-1"
                        >
                            Live {liveStreamSettings?.is_active && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                        </a>
                        <a
                            href="/register"
                            className="px-4 py-2 bg-gradient-gold text-accent-foreground font-semibold font-body text-xs rounded-lg shadow-gold"
                        >
                            Get Started
                        </a>
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-foreground focus:outline-none"
                        >
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-background/95 backdrop-blur-md border-b border-border shadow-lg absolute w-full">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {links.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                className="block px-3 py-2 text-base font-semibold font-body text-foreground hover:bg-gold/10 hover:text-gold rounded-md"
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
                </div>
            )}
        </nav>
    );
};

export default Navbar;
