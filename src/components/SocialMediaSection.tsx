import { Facebook, Instagram, Youtube, Video } from "lucide-react";

export const SocialMediaSection = () => {
    const socials = [
        { name: "Facebook", icon: Facebook, href: "https://facebook.com", color: "hover:text-blue-500" },
        { name: "Instagram", icon: Instagram, href: "https://instagram.com", color: "hover:text-pink-500" },
        { name: "YouTube", icon: Youtube, href: "https://youtube.com", color: "hover:text-red-500" },
        { 
            name: "TikTok", 
            icon: () => (
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
                </svg>
            ), 
            href: "https://tiktok.com", 
            color: "hover:text-foreground" 
        },
    ];

    return (
        <section className="py-20 px-4 bg-background border-t border-border/50">
            <div className="max-w-4xl mx-auto text-center animate-fade-up">
                <h2 className="text-3xl font-display font-bold text-foreground mb-4">
                    Connect With Us
                </h2>
                <p className="text-muted-foreground font-body mb-10">
                    Stay updated with announcements, live updates, and worship moments across our social platforms.
                </p>

                <div className="flex flex-wrap justify-center gap-6 md:gap-10 mt-8">
                    {socials.map((social) => {
                        const Icon = social.icon;
                        return (
                            <a
                                key={social.name}
                                href={social.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`group flex flex-col items-center gap-3 transition-transform hover:scale-110`}
                            >
                                <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                                    <Icon className={`w-8 h-8 text-muted-foreground transition-colors ${social.color}`} />
                                </div>
                                <span className="text-sm font-semibold font-body text-foreground">{social.name}</span>
                            </a>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default SocialMediaSection;
