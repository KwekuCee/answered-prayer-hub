export const AboutSection = () => {
    return (
        <section id="about" className="py-24 px-4 relative overflow-hidden bg-background">
            {/* Dynamic Background Glows */}
            <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-gold/5 rounded-full blur-[120px] pointer-events-none transform translate-x-1/4 -translate-y-1/4"></div>
            <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none transform -translate-x-1/4 translate-y-1/4"></div>

            <div className="max-w-5xl mx-auto relative z-10 text-center animate-fade-up">
                <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-6">
                    What is <span className="bg-gradient-gold bg-clip-text text-transparent">100% Answered Prayer</span>?
                </h2>

                <div className="bg-card/40 backdrop-blur-xl border border-border/50 shadow-2xl rounded-3xl p-8 md:p-12 text-left mt-10">
                    <p className="text-lg md:text-xl text-muted-foreground font-body leading-relaxed mb-6">
                        100% Answered Prayer is a global prophetic movement ordained by God, dedicated to teaching believers the spiritual science and biblical principles of effective prayer. We believe that when you align your requests with God's will and understand the mechanisms of the spirit, every prayer yields a result.
                    </p>
                    <p className="text-lg md:text-xl text-muted-foreground font-body leading-relaxed mb-6">
                        Our mission is to equip you with the knowledge, faith, and practical steps needed to turn your requests into testimonies. We gather consistently to intercede, worship, and experience the demonstrable power of God in real time.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-center">
                        <div className="p-6 bg-background/50 rounded-2xl border border-border/40 hover:border-gold/30 transition-all hover:shadow-gold duration-300">
                            <h3 className="text-2xl font-display font-bold text-foreground mb-2">Faith</h3>
                            <p className="text-sm text-muted-foreground font-body">Building unshakeable belief through the Word.</p>
                        </div>
                        <div className="p-6 bg-background/50 rounded-2xl border border-border/40 hover:border-gold/30 transition-all hover:shadow-gold duration-300">
                            <h3 className="text-2xl font-display font-bold text-foreground mb-2">Strategy</h3>
                            <p className="text-sm text-muted-foreground font-body">Learning the prophetic mechanisms of prayer.</p>
                        </div>
                        <div className="p-6 bg-background/50 rounded-2xl border border-border/40 hover:border-gold/30 transition-all hover:shadow-gold duration-300">
                            <h3 className="text-2xl font-display font-bold text-foreground mb-2">Results</h3>
                            <p className="text-sm text-muted-foreground font-body">Experiencing undeniable testimonies.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AboutSection;
