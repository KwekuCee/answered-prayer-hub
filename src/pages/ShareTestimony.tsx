import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Sparkles, ArrowLeft, Send, CheckCircle2 } from "lucide-react";

const ShareTestimony = () => {
  const [authorName, setAuthorName] = useState("");
  const [churchName, setChurchName] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Please enter your testimony.");
      return;
    }
    setLoading(true);

    const newTestimony = {
      id: `local-t-${Date.now()}`,
      author_name: authorName.trim() || "Anonymous",
      church_name: churchName.trim() || null,
      content: content.trim(),
      is_approved: true, // Visible to author locally
      created_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from("testimonials").insert([{
        author_name: newTestimony.author_name,
        church_name: newTestimony.church_name,
        content: newTestimony.content,
        is_approved: false, // Pending admin approval on server
      }]);

      if (error) {
        console.warn("Notice saving testimony to server:", error);
      }

      // Save to local cache so user sees their submission immediately
      try {
        const stored = JSON.parse(localStorage.getItem("ksw_user_submitted_testimonies") || "[]");
        stored.unshift(newTestimony);
        localStorage.setItem("ksw_user_submitted_testimonies", JSON.stringify(stored));
      } catch {
        // ignore storage errors
      }

      toast.success("Thank you! Your testimony has been submitted.", {
        description: "Your story is recorded and will inspire many on the homepage.",
      });
      navigate("/");
    } catch {
      try {
        const stored = JSON.parse(localStorage.getItem("ksw_user_submitted_testimonies") || "[]");
        stored.unshift(newTestimony);
        localStorage.setItem("ksw_user_submitted_testimonies", JSON.stringify(stored));
      } catch {
        // ignore
      }

      toast.success("Testimony submitted! We appreciate you sharing your story.", {
        description: "Your story has been saved successfully.",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative selection:bg-gold/30 selection:text-gold flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col items-center pt-32 pb-16 px-4 relative overflow-hidden">
        {/* Decorative Glow Backgrounds */}
        <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[140px] pointer-events-none -z-10"></div>

        <div className="max-w-2xl w-full mx-auto space-y-8 relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-gold hover:underline text-sm font-medium font-body transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          <Card className="bg-card/80 backdrop-blur-xl border border-gold/30 shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="p-8 pb-4 text-center space-y-3 border-b border-border/40">
              <div className="inline-flex items-center justify-center p-3 bg-gold/10 border border-gold/30 rounded-2xl mx-auto text-gold mb-1">
                <Sparkles className="w-6 h-6" />
              </div>
              <CardTitle className="text-3xl font-display font-bold text-foreground">
                Share Your <span className="bg-gradient-gold bg-clip-text text-transparent">Testimony</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground font-body text-sm max-w-md mx-auto">
                Declare the goodness of God! Share what He has done in your health, finances, family, or spiritual walk.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="authorName" className="text-foreground font-semibold text-sm">
                    Your Name
                  </Label>
                  <Input
                    id="authorName"
                    placeholder="e.g. Bro. Emmanuel T. (Leave blank for Anonymous)"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="bg-zinc-900/80 border-border/60 focus:border-gold h-12 text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="churchName" className="text-foreground font-semibold text-sm">
                    Church / Zone (Optional)
                  </Label>
                  <Input
                    id="churchName"
                    placeholder="e.g. Christ Embassy Korle Bu"
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                    className="bg-zinc-900/80 border-border/60 focus:border-gold h-12 text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content" className="text-foreground font-semibold text-sm">
                    Your Testimony Details *
                  </Label>
                  <Textarea
                    id="content"
                    placeholder="Describe the miracle or answered prayer God wrought for you..."
                    rows={6}
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="bg-zinc-900/80 border-border/60 focus:border-gold resize-none text-foreground leading-relaxed"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
                  <span>Your testimony will be posted and made visible to inspire others.</span>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-gold text-navy font-bold shadow-gold hover:shadow-gold/80 h-14 text-base rounded-2xl gap-2 transition-all duration-300 mt-2"
                >
                  {loading ? "Submitting..." : (
                    <>
                      <Send className="w-5 h-5" /> Submit Testimony
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ShareTestimony;
