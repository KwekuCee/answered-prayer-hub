import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Calendar, MapPin, Users, Flame } from "lucide-react";

export const LaunchOutlineSection = () => {
  return (
    <section className="py-24 px-4 bg-background relative overflow-hidden">
      <div className="absolute top-1/3 left-0 w-96 h-96 bg-gold/5 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto space-y-12 relative z-10">
        <div className="text-center space-y-4 animate-fade-down">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 border border-gold/30 rounded-full text-xs font-semibold uppercase tracking-wider text-gold">
            <Sparkles className="w-4 h-4" /> KSW2026 Vision & Mandate
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            What is <span className="bg-gradient-gold bg-clip-text text-transparent">KSW 2026</span>?
          </h2>
          <p className="text-muted-foreground font-body max-w-2xl mx-auto text-base md:text-lg">
            A community-wide worship gathering birthed by the inspiration of the Holy Spirit.
          </p>
        </div>

        <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl rounded-3xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-60 h-60 bg-gold/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <CardContent className="px-0 space-y-8 font-body text-muted-foreground text-base md:text-lg leading-relaxed">
            <p className="first-letter:text-5xl first-letter:font-display first-letter:font-bold first-letter:text-gold first-letter:float-left first-letter:mr-3">
              <strong>KORLE BU STANDS IN WORSHIP 2026</strong> is a community-wide worship gathering birthed by the inspiration of the Holy Spirit and strategically designed to bring together people from within the Korle Bu enclave and across the city of Accra for a divine encounter with our Lord Jesus Christ in worship and praise.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="p-6 rounded-2xl bg-background/60 border border-border/50 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-gold/20 text-gold flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <h4 className="font-display font-bold text-foreground text-xl">Date & Time</h4>
                <p className="text-sm">Friday, 18th December, 2026 at 5:00 PM</p>
              </div>

              <div className="p-6 rounded-2xl bg-background/60 border border-border/50 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-gold/20 text-gold flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <h4 className="font-display font-bold text-foreground text-xl">Venue</h4>
                <p className="text-sm">Bukom Boxing Arena, Accra, Ghana</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gold/10 border border-gold/30 text-foreground flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-gold text-navy flex items-center justify-center shrink-0 shadow-gold">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-display font-lg font-bold">6,000+ Target Attendance & 20+ Choirs</h4>
                <p className="text-sm text-muted-foreground mt-0.5">Mobilizing over 20 different choirs and music groups to lead the congregation in unity, love, and faith.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default LaunchOutlineSection;
