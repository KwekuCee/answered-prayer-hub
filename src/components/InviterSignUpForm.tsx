import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AUTH_CODE = "100PRAYER";

const InviterSignUpForm = () => {
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", churchName: "", authCode: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim() || !form.churchName.trim()) {
      toast.error("All fields are required.");
      return;
    }
    if (form.authCode !== AUTH_CODE) {
      toast.error("Invalid authentication code.");
      return;
    }

    setLoading(true);
    try {
      // Find or create church
      const { data: existingChurch } = await supabase
        .from("churches")
        .select("id, name")
        .ilike("name", form.churchName.trim())
        .maybeSingle();

      let churchId: string;
      if (existingChurch) {
        churchId = existingChurch.id;
      } else {
        const { data: newChurch, error: churchErr } = await supabase
          .from("churches")
          .insert({ name: form.churchName.trim() })
          .select("id")
          .single();
        if (churchErr) throw churchErr;
        churchId = newChurch.id;
      }

      const { error } = await supabase.from("inviters").insert({
        full_name: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        church_id: churchId,
      });
      if (error) throw error;

      toast.success("You're now registered as an inviter! Start inviting members.");
      setForm({ fullName: "", email: "", phone: "", churchName: "", authCode: "" });
    } catch (err: any) {
      toast.error(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="inv-name">Full Name *</Label>
          <Input id="inv-name" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Your full name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inv-email">Email *</Label>
          <Input id="inv-email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inv-phone">Phone *</Label>
          <Input id="inv-phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+234..." required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inv-church">Church Name *</Label>
          <Input id="inv-church" value={form.churchName} onChange={e => setForm(p => ({ ...p, churchName: e.target.value }))} placeholder="Your church name" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="inv-code">Authentication Code *</Label>
        <Input id="inv-code" type="password" value={form.authCode} onChange={e => setForm(p => ({ ...p, authCode: e.target.value }))} placeholder="Enter the auth code" required />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90 transition-opacity h-12 text-base">
        {loading ? "Signing Up..." : "Sign Up as Inviter"}
      </Button>
    </form>
  );
};

export default InviterSignUpForm;
