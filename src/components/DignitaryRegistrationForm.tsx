import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Award, ShieldAlert, Phone, Mail, User, Building, MapPin, CheckCircle2 } from "lucide-react";

export const DignitaryRegistrationForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    title: "Hon.",
    fullName: "",
    officeOrPortfolio: "",
    constituency: "",
    contactPhone: "",
    contactEmail: "",
    protocolOfficerName: "",
    protocolOfficerPhone: "",
    securityDetailCount: "0",
    specialSeatingZone: "VIP-A",
    arrivalWindow: "4:30 PM",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      toast.error("Please enter the dignitary's full name.");
      return;
    }
    if (!formData.officeOrPortfolio.trim()) {
      toast.error("Please specify the office, ministry, or royal title.");
      return;
    }
    if (!formData.contactPhone.trim()) {
      toast.error("Please provide a contact phone number.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create a member record flagged as category 'dignitary' so total attendee counts update
      const { data: member, error: memberError } = await supabase
        .from("members")
        .insert({
          full_name: `${formData.title} ${formData.fullName.trim()}`,
          phone: formData.contactPhone.trim(),
          email: formData.contactEmail.trim() || null,
          category: "dignitary",
          occupation: formData.officeOrPortfolio.trim(),
          location: formData.constituency.trim() || null,
          dignitary_title: formData.title,
          dignitary_office: formData.officeOrPortfolio.trim(),
          dignitary_constituency: formData.constituency.trim() || null,
          vip_tier: "vip",
          confirmed: true,
        })
        .select()
        .single();

      if (memberError) throw memberError;

      // 2. Insert into dignitaries table for protocol tracking
      const { error: digError } = await supabase
        .from("dignitaries")
        .insert({
          member_id: member.id,
          title: formData.title,
          full_name: formData.fullName.trim(),
          office_or_portfolio: formData.officeOrPortfolio.trim(),
          organization_or_constituency: formData.constituency.trim() || null,
          contact_phone: formData.contactPhone.trim(),
          contact_email: formData.contactEmail.trim() || null,
          protocol_officer_name: formData.protocolOfficerName.trim() || null,
          protocol_officer_phone: formData.protocolOfficerPhone.trim() || null,
          security_detail_count: parseInt(formData.securityDetailCount, 10) || 0,
          special_seating_zone: formData.specialSeatingZone,
          arrivalWindow: formData.arrivalWindow,
          status: "confirmed",
        });

      if (digError) {
        console.warn("Dignitary protocol log note:", digError);
      }

      setSubmitted(true);
      toast.success(`${formData.title} ${formData.fullName} successfully registered for VIP protocol seating!`);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      console.error("Dignitary registration error:", err);
      const msg = err instanceof Error ? err.message : "Failed to register dignitary";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-10 space-y-6 animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-gold/20 border border-gold/40 text-gold flex items-center justify-center mx-auto shadow-gold">
          <Award className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-display font-bold text-foreground">VIP Dignitary Registered</h3>
          <p className="text-muted-foreground font-body text-sm max-w-md mx-auto">
            <span className="font-semibold text-foreground">{formData.title} {formData.fullName}</span> has been confirmed for Korle Bu Stands in Worship 2026.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-gold/30 text-left max-w-md mx-auto text-xs space-y-2 font-body">
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-muted-foreground">Portfolio / Office:</span>
            <span className="font-semibold text-foreground">{formData.officeOrPortfolio}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-muted-foreground">Seating Allocation:</span>
            <span className="font-semibold text-gold font-mono">{formData.specialSeatingZone}</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-muted-foreground">Protocol Window:</span>
            <span className="font-medium text-foreground">{formData.arrivalWindow}</span>
          </div>
        </div>

        <div className="pt-4 flex justify-center">
          <Button
            onClick={() => {
              setSubmitted(false);
              setFormData({
                title: "Hon.",
                fullName: "",
                officeOrPortfolio: "",
                constituency: "",
                contactPhone: "",
                contactEmail: "",
                protocolOfficerName: "",
                protocolOfficerPhone: "",
                securityDetailCount: "0",
                specialSeatingZone: "VIP-A",
                arrivalWindow: "4:30 PM",
              });
            }}
            variant="outline"
            className="border-gold/30 hover:border-gold"
          >
            Register Another Dignitary
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 rounded-2xl bg-gold/10 border border-gold/30 flex items-start gap-3">
        <Award className="w-5 h-5 text-gold shrink-0 mt-0.5" />
        <div className="text-xs text-foreground/90 font-body leading-relaxed">
          <span className="font-bold text-gold">State & VIP Protocol Registration:</span> Register government officials, traditional leaders, corporate executives, and church patriarchs. Details are linked to the Central Protocol Directorate for reserved seating and security coordination.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-3 space-y-2">
          <Label className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Official Title *
          </Label>
          <Select value={formData.title} onValueChange={(val) => setFormData({ ...formData, title: val })}>
            <SelectTrigger className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body">
              <SelectValue placeholder="Title" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Hon.">Hon. (Minister / MP)</SelectItem>
              <SelectItem value="His Excellency">His Excellency</SelectItem>
              <SelectItem value="Her Excellency">Her Excellency</SelectItem>
              <SelectItem value="Dr.">Dr.</SelectItem>
              <SelectItem value="Prof.">Prof.</SelectItem>
              <SelectItem value="Nana / Togbe">Nana / Chief / Royal</SelectItem>
              <SelectItem value="Justice">Justice</SelectItem>
              <SelectItem value="Rev. / Bishop">Rev. / Bishop / Apostle</SelectItem>
              <SelectItem value="Mr. / Mrs.">Mr. / Mrs. / Ms.</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-9 space-y-2">
          <Label htmlFor="dignitaryName" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gold" /> Full Name *
          </Label>
          <Input
            id="dignitaryName"
            placeholder="e.g., Samuel Okudzeto Ablakwa"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
            required
          />
        </div>

        <div className="md:col-span-6 space-y-2">
          <Label htmlFor="office" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-gold" /> Portfolio / Ministry / Office *
          </Label>
          <Input
            id="office"
            placeholder="e.g., Member of Parliament / CEO, Korle Bu Teaching Hospital"
            value={formData.officeOrPortfolio}
            onChange={(e) => setFormData({ ...formData, officeOrPortfolio: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
            required
          />
        </div>

        <div className="md:col-span-6 space-y-2">
          <Label htmlFor="constituency" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gold" /> Constituency / Region / Organization
          </Label>
          <Input
            id="constituency"
            placeholder="e.g., North Tongu / Greater Accra"
            value={formData.constituency}
            onChange={(e) => setFormData({ ...formData, constituency: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
          />
        </div>

        <div className="md:col-span-6 space-y-2">
          <Label htmlFor="phone" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-gold" /> Contact Phone Number *
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="024 000 0000"
            value={formData.contactPhone}
            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
            required
          />
        </div>

        <div className="md:col-span-6 space-y-2">
          <Label htmlFor="email" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-gold" /> Official Email (Optional)
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="office@gov.gh"
            value={formData.contactEmail}
            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
          />
        </div>

        <div className="md:col-span-6 space-y-2">
          <Label htmlFor="protocolName" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gold" /> Protocol Officer / Aide Name
          </Label>
          <Input
            id="protocolName"
            placeholder="e.g., Lt. Col. K. Addo"
            value={formData.protocolOfficerName}
            onChange={(e) => setFormData({ ...formData, protocolOfficerName: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
          />
        </div>

        <div className="md:col-span-6 space-y-2">
          <Label htmlFor="protocolPhone" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-gold" /> Protocol Officer Phone
          </Label>
          <Input
            id="protocolPhone"
            type="tel"
            placeholder="020 000 0000"
            value={formData.protocolOfficerPhone}
            onChange={(e) => setFormData({ ...formData, protocolOfficerPhone: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
          />
        </div>

        <div className="md:col-span-4 space-y-2">
          <Label className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            VIP Seating Zone
          </Label>
          <Select value={formData.specialSeatingZone} onValueChange={(val) => setFormData({ ...formData, specialSeatingZone: val })}>
            <SelectTrigger className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body">
              <SelectValue placeholder="Zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="V-VIP Stage Front">V-VIP Stage Front</SelectItem>
              <SelectItem value="VIP-A Ring Side">VIP-A Ring Side</SelectItem>
              <SelectItem value="VIP-B Executive Box">VIP-B Executive Box</SelectItem>
              <SelectItem value="Clergy & Patriarchs">Clergy & Patriarchs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-4 space-y-2">
          <Label className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-gold" /> Security Detail Count
          </Label>
          <Input
            type="number"
            min="0"
            max="12"
            value={formData.securityDetailCount}
            onChange={(e) => setFormData({ ...formData, securityDetailCount: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
          />
        </div>

        <div className="md:col-span-4 space-y-2">
          <Label className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Expected Arrival Window
          </Label>
          <Input
            value={formData.arrivalWindow}
            onChange={(e) => setFormData({ ...formData, arrivalWindow: e.target.value })}
            placeholder="e.g. 4:30 PM - 4:45 PM"
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-13 bg-gradient-gold text-navy font-bold font-body text-base rounded-xl shadow-gold hover:opacity-95 transition-all mt-4"
      >
        {loading ? "Registering Dignitary..." : "Register VIP Dignitary"}
      </Button>
    </form>
  );
};

export default DignitaryRegistrationForm;
