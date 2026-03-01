import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { store } from "@/lib/store";
import { toast } from "sonner";

const MemberRegistrationForm = () => {
  const inviters = store.getInviters();
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", occupation: "",
    location: "", dateOfBirth: "", inviterId: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
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
    const inviter = inviters.find(i => i.id === form.inviterId);
    const members = store.getMembers();
    members.push({
      id: `m${Date.now()}`,
      fullName: form.fullName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim(),
      occupation: form.occupation.trim() || undefined,
      location: form.location.trim() || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      inviterId: form.inviterId,
      inviterName: inviter?.fullName || "",
      churchId: inviter?.churchId || "",
      churchName: inviter?.churchName || "",
      confirmed: false,
      createdAt: new Date().toISOString().split("T")[0],
    });
    store.setMembers(members);

    // Update inviter count
    if (inviter) {
      const allInviters = store.getInviters();
      const idx = allInviters.findIndex(i => i.id === inviter.id);
      if (idx >= 0) { allInviters[idx].inviteCount++; store.setInviters(allInviters); }
    }

    toast.success("Registration successful! Welcome to 100% Answered Prayer.");
    setForm({ fullName: "", email: "", phone: "", occupation: "", location: "", dateOfBirth: "", inviterId: "" });
    setLoading(false);
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
              <SelectItem key={inv.id} value={inv.id}>{inv.fullName} ({inv.churchName})</SelectItem>
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
