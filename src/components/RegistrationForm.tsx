import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";

const RegistrationForm = () => {
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
  const [registeredMember, setRegisteredMember] = useState<{ id: string; name: string } | null>(null);

  const { data: activeProgram } = useQuery({
    queryKey: ["active-program"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("id").eq("is_active", true).maybeSingle();
      if (error && error.code !== "PGRST116") console.error(error);
      return data;
    },
  });


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
      const isSelf = form.inviterId === "self";
      const inviter = isSelf ? null : inviters.find(i => i.id === form.inviterId);

      if (!isSelf && !inviter?.church_id) {
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
          inviter_id: isSelf ? null : form.inviterId,
          church_id: isSelf ? null : inviter?.church_id,
          program_id: activeProgram?.id || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (!isSelf && inviter) {
        const nextInviteCount = (inviter.invite_count ?? 0) + 1;
        await supabase.from("inviters").update({ invite_count: nextInviteCount }).eq("id", form.inviterId);
      }

      const { error: emailError } = await supabase.functions.invoke("send-inviter-email", {
        body: { memberId: insertedMember.id },
      });

      if (emailError) {
        console.error("Inviter email notification failed:", emailError);
      }

      // 1. Direct synchronous frontend welcome email dispatch via Secure Vercel Proxy
      if (form.email.trim()) {
        try {
          const welcomeResponse = await fetch("/api/send_prayer_mail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Answered Prayer Hub",
              to: [form.email.trim()], // Array with exactly 1 email
              subject: "Welcome to 100% Answered Prayer!",
              html: `
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); font-family: sans-serif; text-align: center; color: #0a1128;">
                  <div style="margin-bottom: 30px;">
                      <img src="https://answered-prayer-hub.web.app/logo.png" alt="100% Answered Prayer" style="max-height: 100px; width: auto; border-radius: 12px; margin: 0 auto; display: block;" onerror="this.src='https://placehold.co/100x100/0a1128/bf953f?text=AP'" />
                  </div>
                  <h1 style="color: #bf953f; font-size: 28px;">Welcome, ${form.fullName.trim()}!</h1>
                  <p style="font-size: 16px; color: #334155; line-height: 1.6; margin-bottom: 30px;">We are absolutely thrilled to have you with us.</p>
                </div>
              `
            })
          });
          const rawWelcome = await welcomeResponse.text();
          let d;
          try { d = JSON.parse(rawWelcome); } catch (ex) { d = rawWelcome; }

          if (!welcomeResponse.ok) console.error("Gmail SMTP rejected welcome email via proxy:", d);
        } catch (fetchErr) {
          console.error("Network proxy failed calling Gmail SMTP:", fetchErr);
        }
      }

      toast.success("Registration successful! Save your QR Code.");
      setRegisteredMember({ id: insertedMember.id, name: form.fullName });
      setForm({ fullName: "", email: "", phone: "", occupation: "", location: "", dateOfBirth: "", inviterId: "" });
    } catch (err: any) {
      toast.error(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById("qr-gen") as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      const safeName = registeredMember?.name.replace(/[^a-zA-Z0-9]/g, "_") || "Attendee";
      downloadLink.download = `${safeName}_Ticket.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  if (registeredMember) {
    return (
      <div className="text-center space-y-6 animate-fade-up">
        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h3 className="text-2xl font-display font-bold text-foreground">Registration Successful!</h3>
        <p className="text-muted-foreground font-body">
          Welcome, <strong>{registeredMember.name}</strong>. Please save or screenshot this QR Code. You will need to show it at the event entrance for quick check-in.
        </p>
        <div className="bg-white p-4 rounded-xl inline-block shadow-lg mx-auto">
          <QRCodeCanvas id="qr-gen" value={registeredMember.id} size={200} level="M" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-4">
          <Button onClick={downloadQRCode} className="bg-gold hover:bg-gold-light text-navy font-bold flex items-center gap-2">
            <Download className="w-4 h-4" /> Download QR Code Ticket
          </Button>
          <Button variant="outline" onClick={() => setRegisteredMember(null)}>
            Register Another Attendee
          </Button>
        </div>
      </div>
    );
  }

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
          <SelectContent className="max-h-[300px]">
            <SelectItem value="self" className="font-bold text-gold">Self Invite / Not Invited</SelectItem>
            {inviters.map(inv => (
              <SelectItem key={inv.id} value={inv.id}>
                {inv.full_name} ({(inv.churches as any)?.name || "Unknown"})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90 transition-opacity h-12 text-base">
        {loading ? "Registering..." : "Register as Attendee"}
      </Button>
    </form>
  );
};

export default RegistrationForm;
