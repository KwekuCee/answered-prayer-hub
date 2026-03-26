import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const ShareTestimony = () => {
  const [authorName, setAuthorName] = useState("");
  const [churchName, setChurchName] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast({ title: "Please enter your testimony." });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("testimonials").insert([{
        author_name: authorName || "Anonymous",
        church_name: churchName || null,
        content,
        is_approved: false,
      }]);
      if (error) throw error;
      toast({ title: "Testimony submitted. Awaiting approval." });
      navigate("/");
    } catch (err: any) {
      console.error(err);
      toast({ title: "Failed to submit testimony." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Share Your Testimony</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Your Name</label>
              <input placeholder="Your name" aria-label="Your name" value={authorName} onChange={(e) => setAuthorName(e.target.value)} className="w-full px-3 py-2 rounded-md border" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Church (optional)</label>
              <input placeholder="Church (optional)" aria-label="Church" value={churchName} onChange={(e) => setChurchName(e.target.value)} className="w-full px-3 py-2 rounded-md border" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Testimony</label>
              <textarea placeholder="Write your testimony here" aria-label="Testimony" value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="w-full px-3 py-2 rounded-md border" />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={loading} className="px-6 py-2 rounded-md bg-gradient-gold text-white font-semibold">
                {loading ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareTestimony;
