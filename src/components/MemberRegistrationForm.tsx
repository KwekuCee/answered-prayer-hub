import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

const MemberRegistrationForm = () => {
  const { data: inviters = [] } = useQuery({
    queryKey: ["inviters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inviters")
        .select("id, full_name, church_id, invite_count, churches(name)")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", occupation: "",
    location: "", dateOfBirth: "", inviterId: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.phone.trim()) {
      toast.error("Full Name and Phone are required.");
      return;
    }
    if (!form.inviterId) {
      toast.error("Please select who invited you.");
      return;
    }

    setLoading(true);
    try {
      const inviter = inviters.find(i => i.id === form.inviterId);
      if (!inviter?.church_id) {
        throw new Error("Selected inviter is missing church information.");
      }

      const { data: insertedMember, error } = await supabase
        .from("members")
        .insert({
          full_name: form.fullName.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim(),
          occupation: form.occupation.trim() || null,
          location: form.location.trim() || null,
          date_of_birth: form.dateOfBirth || null,
          inviter_id: form.inviterId,
          church_id: inviter.church_id,
        })
        .select("id")
        .single();
      if (error) throw error;

      const nextInviteCount = (inviter.invite_count ?? 0) + 1;
      await supabase.from("inviters").update({ invite_count: nextInviteCount }).eq("id", form.inviterId);

      const { error: emailError } = await supabase.functions.invoke("send-inviter-email", {
        body: { memberId: insertedMember.id },
      });

      if (emailError) {
        console.error("Inviter email notification failed:", emailError);
      }

      toast.success("Registration successful! Welcome to 100% Answered Prayer.");
      setForm({ fullName: "", email: "", phone: "", occupation: "", location: "", dateOfBirth: "", inviterId: "" });
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
          <Label htmlFor="fullName">Full Name *</Label>
          <Input id="fullName" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Enter your full name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input id="phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+234..." required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="occupation">Occupation</Label>
          <Input id="occupation" value={form.occupation} onChange={e => setForm(p => ({ ...p, occupation: e.target.value }))} placeholder="Your occupation" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="City, State" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dob">Date of Birth</Label>
          <Input id="dob" type="date" value={form.dateOfBirth} onChange={e => setForm(p => ({ ...p, dateOfBirth: e.target.value }))} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Who Invited You? *</Label>
        <Select value={form.inviterId} onValueChange={v => setForm(p => ({ ...p, inviterId: v }))}>
          <SelectTrigger><SelectValue placeholder="Select your inviter" /></SelectTrigger>
          <SelectContent>
            {inviters.map(inv => (
              <SelectItem key={inv.id} value={inv.id}>
                {inv.full_name} ({(inv.churches as any)?.name || "Unknown"})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90 transition-opacity h-12 text-base">
        {loading ? "Registering..." : "Register as Member"}
      </Button>
    </form>
  );
};

export default MemberRegistrationForm;
