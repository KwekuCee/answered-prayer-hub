import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Church, Shield, Lock, Eye, EyeOff, Sparkles, MapPin, Mail, Phone, User } from "lucide-react";

export const ExternalChurchForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    churchName: "",
    pastorName: "",
    pastorEmail: "",
    pastorPhone: "",
    location: "",
    target: "100",
    authCode: "",
    privacyMode: "masked" as "masked" | "open" | "anonymized",
    delegationNotes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.churchName.trim()) {
      toast.error("Please enter the church name.");
      return;
    }
    if (!formData.pastorName.trim()) {
      toast.error("Please enter the Pastor / Lead Minister's name.");
      return;
    }
    if (!formData.pastorPhone.trim()) {
      toast.error("Please enter the Pastor's contact phone number.");
      return;
    }
    if (!formData.authCode.trim()) {
      toast.error("Please create an authentication / password code for your church admin access.");
      return;
    }

    setLoading(true);
    try {
      // 1. Insert church into Supabase
      const { data: newChurch, error: churchError } = await supabase
        .from("churches")
        .insert({
          name: formData.churchName.trim(),
          is_external: true,
          pastor_name: formData.pastorName.trim(),
          pastor_email: formData.pastorEmail.trim() || null,
          pastor_phone: formData.pastorPhone.trim(),
          location: formData.location.trim() || null,
          target: parseInt(formData.target, 10) || 100,
          auth_code: formData.authCode.trim(),
          privacy_mode: formData.privacyMode,
          delegation_notes: formData.delegationNotes.trim() || null,
          confirmed: 0,
        })
        .select()
        .single();

      if (churchError) throw churchError;

      // 2. Also record an audit log
      try {
        await supabase.from("audit_logs").insert({
          action: "EXTERNAL_CHURCH_REGISTERED",
          target_type: "church",
          target_id: newChurch.id,
          details: `Registered external church '${formData.churchName.trim()}' with Pastor ${formData.pastorName.trim()}`,
        });
      } catch {
        // non-blocking
      }

      setSubmitted(true);
      toast.success(`Church '${formData.churchName}' registered successfully! Your congregation can now select your church when registering.`);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      console.error("External church registration error:", err);
      const msg = err instanceof Error ? err.message : "Failed to register church";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-10 space-y-6 animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-gold/20 border border-gold/40 text-gold flex items-center justify-center mx-auto shadow-gold">
          <Church className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-display font-bold text-foreground">Church Successfully Registered</h3>
          <p className="text-muted-foreground font-body text-sm max-w-md mx-auto">
            <span className="font-semibold text-foreground">{formData.churchName}</span> has been added to the church roster.
            Members and leaders from your church can now select this name during registration.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-gold/30 text-left max-w-md mx-auto text-xs space-y-2 font-body">
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-muted-foreground">Pastor in Charge:</span>
            <span className="font-semibold text-foreground">{formData.pastorName}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-muted-foreground">Privacy Protection:</span>
            <span className="font-semibold text-gold capitalize">{formData.privacyMode} (Member data protected)</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-muted-foreground">Portal Access Code:</span>
            <span className="font-mono text-gold font-bold">••••••••</span>
          </div>
        </div>

        <div className="pt-4 flex flex-wrap justify-center gap-4">
          <Button
            onClick={() => {
              setSubmitted(false);
              setFormData({
                churchName: "",
                pastorName: "",
                pastorEmail: "",
                pastorPhone: "",
                location: "",
                target: "100",
                authCode: "",
                privacyMode: "masked",
                delegationNotes: "",
              });
            }}
            variant="outline"
            className="border-gold/30 hover:border-gold"
          >
            Register Another Church
          </Button>
          <a
            href="/admin"
            className="px-6 py-2.5 bg-gradient-gold text-navy font-bold font-body text-sm rounded-xl shadow-gold hover:opacity-95 transition-all"
          >
            Access Church Admin Portal &rarr;
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 rounded-2xl bg-gold/10 border border-gold/30 flex items-start gap-3">
        <Shield className="w-5 h-5 text-gold shrink-0 mt-0.5" />
        <div className="text-xs text-foreground/90 font-body leading-relaxed">
          <span className="font-bold text-gold">External Church Privacy Guarantee:</span> When your congregation members register under your church name, their personal names and contact details are masked for confidentiality. You retain exclusive access to your church roster through your pastor portal.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="churchName" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Church className="w-3.5 h-3.5 text-gold" /> Church / Ministry Name *
          </Label>
          <Input
            id="churchName"
            placeholder="e.g., Harvest Chapel International, Accra Central"
            value={formData.churchName}
            onChange={(e) => setFormData({ ...formData, churchName: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pastorName" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gold" /> Senior Pastor / Lead Minister *
          </Label>
          <Input
            id="pastorName"
            placeholder="e.g., Rev. Dr. Michael Annan"
            value={formData.pastorName}
            onChange={(e) => setFormData({ ...formData, pastorName: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pastorPhone" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-gold" /> Pastor Contact Phone *
          </Label>
          <Input
            id="pastorPhone"
            type="tel"
            placeholder="e.g., 024 123 4567"
            value={formData.pastorPhone}
            onChange={(e) => setFormData({ ...formData, pastorPhone: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pastorEmail" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-gold" /> Pastor Email (Optional)
          </Label>
          <Input
            id="pastorEmail"
            type="email"
            placeholder="pastor@churchdomain.org"
            value={formData.pastorEmail}
            onChange={(e) => setFormData({ ...formData, pastorEmail: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gold" /> Church Location / Branch
          </Label>
          <Input
            id="location"
            placeholder="e.g., Dansoman, High Street"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-gold" /> Mobilization Target (Estimated Attendees)
          </Label>
          <Input
            id="target"
            type="number"
            min="10"
            max="10000"
            placeholder="100"
            value={formData.target}
            onChange={(e) => setFormData({ ...formData, target: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="authCode" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-gold" /> Admin Portal Password / Access Code *
          </Label>
          <div className="relative">
            <Input
              id="authCode"
              type={showPassword ? "text" : "password"}
              placeholder="Create your portal password"
              value={formData.authCode}
              onChange={(e) => setFormData({ ...formData, authCode: e.target.value })}
              className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gold transition-colors p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="privacyMode" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Member Privacy Protection Level
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, privacyMode: "masked" })}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                formData.privacyMode === "masked"
                  ? "border-gold bg-gold/10 text-foreground shadow-sm"
                  : "border-border/60 bg-background/40 text-muted-foreground hover:border-gold/50"
              }`}
            >
              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-gold" /> Masked Confidential (Recommended)
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Central system sees verified headcount only (e.g. Member #14). Pastor sees full details in their portal.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, privacyMode: "open" })}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                formData.privacyMode === "open"
                  ? "border-gold bg-gold/10 text-foreground shadow-sm"
                  : "border-border/60 bg-background/40 text-muted-foreground hover:border-gold/50"
              }`}
            >
              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Church className="w-3.5 h-3.5 text-gold" /> Open Network Partnership
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Full member contact shared with Central Worship Committee for joint intercession and transport coordination.
              </p>
            </button>
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="delegationNotes" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Delegation / Seating Requests (Optional)
          </Label>
          <Input
            id="delegationNotes"
            placeholder="Special seating, bus pickup requests, or pastoral delegation notes"
            value={formData.delegationNotes}
            onChange={(e) => setFormData({ ...formData, delegationNotes: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-13 bg-gradient-gold text-navy font-bold font-body text-base rounded-xl shadow-gold hover:opacity-95 transition-all mt-4"
      >
        {loading ? "Registering Church..." : "Register External Church"}
      </Button>
    </form>
  );
};

export default ExternalChurchForm;
