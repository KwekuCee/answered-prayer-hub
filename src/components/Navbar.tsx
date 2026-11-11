import { useState, useEffect } from "react";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import logoWhite from "@/assets/logo-white.webp";

export const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isDark, setIsDark] = useState<boolean>(() => {
        try {
            const stored = localStorage.getItem('theme');
            if (stored) return stored === 'dark';
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            if (isDark) document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        } catch (e) {
            console.debug('theme toggle error', e);
        }
    }, [isDark]);

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
        <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[94%] max-w-6xl z-50 transition-all duration-300">
            {/* Complete Floating Rounded Rectangle Navbar Container */}
            <div className="relative bg-black/85 dark:bg-black/90 backdrop-blur-xl border border-gold/30 rounded-full px-5 py-2.5 shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex items-center justify-between">
                
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

                {/* Middle: Centered Menu Links (centered exactly on page) */}
                <div className="hidden lg:flex items-center space-x-6 absolute left-1/2 -translate-x-1/2 z-0">
                    {links.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="text-zinc-300 hover:text-gold font-body text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap"
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
                                <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            )}
                        </a>
                    ))}
                </div>

                {/* Right Side: Theme Icon, Register, Login */}
                <div className="hidden md:flex items-center gap-3 shrink-0 ml-auto z-10">
                    <button
                        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        onClick={() => setIsDark(d => !d)}
                        className="p-2 rounded-full text-zinc-300 hover:text-gold hover:bg-gold/10 transition-colors"
                    >
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>

                    <Link
                        to="/register"
                        className="px-4 py-2 bg-gradient-gold text-navy font-bold font-body text-xs rounded-full shadow-gold hover:opacity-90 transition-all whitespace-nowrap"
                    >
                        Register
                    </Link>
                    <Link
                        to="/admin"
                        className="px-4 py-2 border border-gold/40 text-zinc-200 hover:text-gold font-bold font-body text-xs rounded-full transition-all whitespace-nowrap"
                    >
                        Login
                    </Link>
                </div>

                {/* Mobile Menu & Theme Toggle */}
                <div className="lg:hidden flex items-center gap-2 ml-auto z-10">
                    <button
                        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        onClick={() => setIsDark(d => !d)}
                        className="p-1.5 rounded-full text-zinc-300 hover:text-gold"
                    >
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>

                    <Link
                        to="/register"
                        className="px-3 py-1.5 bg-gradient-gold text-navy font-bold font-body text-xs rounded-full shadow-gold"
                    >
                        Register
                    </Link>

                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-2 text-zinc-200 hover:text-gold focus:outline-none"
                    >
                        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Dropdown */}
            {isOpen && (
                <div className="lg:hidden mt-2 bg-black/95 backdrop-blur-2xl border border-gold/30 rounded-3xl p-5 shadow-2xl space-y-2 animate-fade-down">
                    <div className="grid grid-cols-2 gap-2">
                        {links.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                className="px-3 py-2 text-xs font-semibold font-body text-zinc-200 hover:bg-gold/10 hover:text-gold rounded-xl transition-colors"
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
                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                        <Link to="/live" onClick={() => setIsOpen(false)} className="text-gold font-semibold flex items-center gap-1.5">
                            Watch Live Stream {liveStreamSettings?.is_active && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                        </Link>
                        <Link to="/admin" onClick={() => setIsOpen(false)} className="text-zinc-300 hover:text-gold">
                            Admin Login &rarr;
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;

