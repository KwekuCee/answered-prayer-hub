import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";

const AUTH_CODE = "100PRAYER";

const InviterSignUpForm = () => {
  const { data: churches = [] } = useQuery({
    queryKey: ["churches-list"],
    queryFn: async () => {
      try {
        const { data } = await supabase.from("churches").select("id, name").order("name");
        return data || [];
      } catch {
        return [];
      }
    },
  });

  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", churchId: "", authCode: "",
  });
  const [showAuthCode, setShowAuthCode] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: activeProgram } = useQuery({
    queryKey: ["active-program"],
    queryFn: async () => {
      try {
        const { data } = await supabase.from("programs").select("id").eq("is_active", true).maybeSingle();
        return data || null;
      } catch {
        return null;
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim() || !form.churchId) {
      toast.error("All fields are required.");
      return;
    }
    if (form.authCode !== AUTH_CODE) {
      toast.error("Invalid authentication code.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("inviters").insert({
        program_id: activeProgram?.id || null,
        full_name: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        church_id: form.churchId,
      });
      if (error) throw error;

      toast.success("You're now registered as an inviter! Start inviting members.");
      setForm({ fullName: "", email: "", phone: "", churchId: "", authCode: "" });
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
          <Label>Church Name *</Label>
          <Select value={form.churchId} onValueChange={v => setForm(p => ({ ...p, churchId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select your church" /></SelectTrigger>
            <SelectContent>
              {churches.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="inv-code">Authentication Code *</Label>
        <div className="relative">
          <Input
            id="inv-code"
            type={showAuthCode ? "text" : "password"}
            value={form.authCode}
            onChange={e => setForm(p => ({ ...p, authCode: e.target.value }))}
            placeholder="Enter the auth code"
            className="pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowAuthCode(!showAuthCode)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            title={showAuthCode ? "Hide code" : "Show code"}
          >
            {showAuthCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90 transition-opacity h-12 text-base">
        {loading ? "Signing Up..." : "Sign Up as Inviter"}
      </Button>
    </form>
  );
};

export default InviterSignUpForm;
