import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { BIRTHDAY_MONTHS, buildBirthdayDateString, getDaysInBirthdayMonth } from "@/utils/birthday";
import { formatMemberRegistrationError } from "@/utils/registration";

const MemberRegistrationForm = () => {
  const { data: inviters = [] } = useQuery({
    queryKey: ["inviters"],
    queryFn: async () => {
      try {
        const { data } = await supabase.rpc("list_public_inviters" as any);
        return ((data as any[]) || []).map((i) => ({ ...i, invite_count: 0, churches: { id: i.church_id, name: i.church_name } })) as any[];
      } catch {
        return [];
      }
    },
  });

  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", occupation: "",
    location: "", birthMonth: "", birthDay: "", inviterId: "",
  });
  const [loading, setLoading] = useState(false);

  const birthdayDays = Array.from(
    { length: getDaysInBirthdayMonth(form.birthMonth || "01") },
    (_, index) => String(index + 1).padStart(2, "0"),
  );

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
    if ((form.birthMonth && !form.birthDay) || (!form.birthMonth && form.birthDay)) {
      toast.error("Please select both month and day for your birthday, or leave both empty.");
      return;
    }

    setLoading(true);
    try {
      const inviter = inviters.find(i => i.id === form.inviterId);
      if (!inviter?.church_id) {
        throw new Error("Selected inviter is missing church information.");
      }

      const birthdayDate = buildBirthdayDateString(form.birthMonth, form.birthDay);

      const { data: memberId, error } = await supabase.rpc("register_member" as any, {
        p_full_name: form.fullName.trim(),
        p_phone: form.phone.trim(),
        p_inviter_id: form.inviterId,
        p_email: form.email.trim() || null,
        p_occupation: form.occupation.trim() || null,
        p_location: form.location.trim() || null,
        p_date_of_birth: birthdayDate,
        p_church_id: null,
      });
      if (error) throw error;

      const { error: emailError } = await supabase.functions.invoke("send-inviter-email", {
        body: { memberId: String(memberId) },
      });

      if (emailError) {
        console.error("Inviter email notification failed:", emailError);
      }

      toast.success("Registration successful! Welcome to Korle Bu Stands in Worship.");
      setForm({ fullName: "", email: "", phone: "", occupation: "", location: "", birthMonth: "", birthDay: "", inviterId: "" });
    } catch (err: unknown) {
      toast.error(formatMemberRegistrationError(err));
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
          <Label>Birthday</Label>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={form.birthMonth}
              onValueChange={(month) => {
                const maxDay = getDaysInBirthdayMonth(month);
                const nextDay = form.birthDay && Number(form.birthDay) > maxDay ? "" : form.birthDay;
                setForm(p => ({ ...p, birthMonth: month, birthDay: nextDay }));
              }}
            >
              <SelectTrigger aria-label="Birthday month">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {BIRTHDAY_MONTHS.map(month => (
                  <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={form.birthDay}
              onValueChange={(day) => setForm(p => ({ ...p, birthDay: day }))}
            >
              <SelectTrigger aria-label="Birthday day">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {birthdayDays.map(day => (
                  <SelectItem key={day} value={day}>{Number(day)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
