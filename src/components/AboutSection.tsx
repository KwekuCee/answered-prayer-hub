import { Link } from "react-router-dom";

export const AboutSection = () => {
    return (
        <section id="about" className="py-24 px-4 relative overflow-hidden bg-background">
            {/* Dynamic Background Glows */}
            <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-gold/5 rounded-full blur-[120px] pointer-events-none transform translate-x-1/4 -translate-y-1/4"></div>
            <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none transform -translate-x-1/4 translate-y-1/4"></div>

            <div className="max-w-5xl mx-auto relative z-10 text-center animate-fade-up">
                <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-6">
                    What is <span className="bg-gradient-gold bg-clip-text text-transparent">Korle Bu Stands in Worship</span>?
                </h2>

                <div className="bg-card/40 backdrop-blur-xl border border-border/50 shadow-2xl rounded-3xl p-8 md:p-12 text-left mt-10">
                    <p className="text-lg md:text-xl text-muted-foreground font-body leading-relaxed mb-6">
                        <strong>Korle Bu Stands in Worship</strong> is a Spirit-inspired strategic worship and prayer movement,
                        dedicated to lifting up holy hands and leading believers in powerful worship to experience divine transformation.
                        God inhabits the praises of His people.
                    </p>
                    <p className="text-lg md:text-xl text-muted-foreground font-body leading-relaxed mb-6">
                        Our mission is to ignite hearts with faith, passion, and profound worship encounters.
                        Every Edition of <strong>Korle Bu Stands in Worship</strong> has been a catalogue of miracles and testimonies for many. Join us for the next Edition; <strong>YOUR CHANCE HAS COME!</strong>
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-center">
                        <a
                            href="/resources"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 transition-all hover:shadow-lg duration-300"
                        >
                            <h3 className="text-2xl font-display font-bold text-foreground mb-2">Build your Faith</h3>
                        </a>

                        <a
                            href="https://chat.whatsapp.com/REPLACE_WITH_GROUP_LINK"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-8 rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-teal-500/20 transition-all hover:shadow-lg duration-300"
                        >
                            <h3 className="text-2xl font-display font-bold text-foreground mb-2">Join any of our Worship Groups</h3>
                        </a>

                        <Link
                            to="/share-testimony"
                            className="block p-8 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 transition-all hover:shadow-lg duration-300"
                        >
                            <h3 className="text-2xl font-display font-bold text-foreground mb-2">Share Your testimony</h3>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AboutSection;
