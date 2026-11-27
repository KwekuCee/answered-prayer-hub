import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createEphemeralSupabaseClient } from "@/lib/ephemeralAuthClient";
import { validateExternalChurchPassword } from "@/utils/externalChurchAuth";
import { toast } from "sonner";
import { Church, Shield, Eye, EyeOff } from "lucide-react";

export const ExternalChurchForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [formData, setFormData] = useState({
    churchName: "",
    pastorName: "",
    pastorEmail: "",
    pastorPhone: "",
    location: "",
    target: "100",
    authCode: "",
    privacyMode: "masked" as "masked" | "open",
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
    const cleanEmail = formData.pastorEmail.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Please enter a valid Church Administrator / Pastor email address for alerts.");
      return;
    }

    const passwordError = validateExternalChurchPassword(formData.authCode);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    const cleanPassword = formData.authCode.trim();

    setLoading(true);
    try {
      const { error: churchError } = await supabase.rpc("register_external_church" as any, {
        p_name: formData.churchName.trim(),
        p_pastor_name: formData.pastorName.trim(),
        p_pastor_email: cleanEmail,
        p_pastor_phone: formData.pastorPhone.trim(),
        p_location: formData.location.trim() || null,
        p_target: parseInt(formData.target, 10) || 100,
        p_auth_code: cleanPassword,
        p_privacy_mode: formData.privacyMode,
        p_delegation_notes: formData.delegationNotes.trim() || null,
      });

      if (churchError) throw churchError;

      let resultNotice = `Your Church Admin account for ${cleanEmail} is ready. Sign in at the Admin Portal with your email and password.`;
      try {
        const ephemeral = createEphemeralSupabaseClient();
        const { data: authData, error: signUpErr } = await ephemeral.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/verify-email`,
            data: {
              full_name: formData.pastorName.trim(),
            },
          },
        });

        if (signUpErr) {
          if (signUpErr.message?.toLowerCase().includes("already registered")) {
            resultNotice = `Your church is registered. Sign in at the Admin Portal with ${cleanEmail} and your password to activate Church Admin access.`;
          } else {
            resultNotice = `Your church is registered. Visit the Admin Portal and sign in with ${cleanEmail} and your password to finish portal setup.`;
          }
        } else if (authData.session) {
          const { error: claimErr } = await (ephemeral as any).rpc("claim_external_church_role", {
            p_password: cleanPassword,
          });
          if (!claimErr) {
            resultNotice = `Your encrypted Church Admin Portal login for ${cleanEmail} is active. Sign in at the Admin Portal anytime.`;
          } else {
            resultNotice = `Your account was created. Sign in at the Admin Portal with ${cleanEmail} and your password to complete activation.`;
          }
        } else {
          resultNotice = `We sent a verification link to ${cleanEmail}. Verify your email address, then sign in at the Admin Portal with your password.`;
        }
      } catch {
        resultNotice = `Your church is registered. Sign in at the Admin Portal with ${cleanEmail} and your password to activate Church Admin access.`;
      }

      setAuthNotice(resultNotice);
      setSubmitted(true);
      toast.success(`Church '${formData.churchName}' registered successfully!`);
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
            <span className="text-muted-foreground">Administrator Email:</span>
            <span className="font-semibold text-foreground">{formData.pastorEmail}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-muted-foreground">Follow-up Visibility:</span>
            <span className="font-semibold text-gold capitalize">
              {formData.privacyMode === "open" ? "Open (Call-Center Follow-up Enabled)" : "Masked (Pastor Confidential)"}
            </span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-muted-foreground">Portal Password Security:</span>
            <span className="font-mono text-emerald-400 font-semibold">Hashed &amp; Encrypted</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-body max-w-md mx-auto leading-relaxed">
          {authNotice}
        </p>

        <div className="pt-4 flex flex-wrap justify-center gap-4">
          <Button
            onClick={() => {
              setSubmitted(false);
              setAuthNotice("");
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
          <Link
            to="/admin"
            className="px-6 py-2.5 bg-gradient-gold text-navy font-bold font-body text-sm rounded-xl shadow-gold hover:opacity-95 transition-all"
          >
            Access Church Admin Portal &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 rounded-2xl bg-gold/10 border border-gold/30 flex items-start gap-3">
        <Shield className="w-5 h-5 text-gold shrink-0 mt-0.5" />
        <div className="text-xs text-foreground/90 font-body leading-relaxed">
          <span className="font-bold text-gold">External Church Privacy &amp; Account Security:</span> Choose whether your church member details are Masked or Open for central call-center follow-up. Your Admin Portal password is stored securely hashed so no one else can view it or log into your church account.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="churchName" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Church / Ministry Name *
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
          <Label htmlFor="pastorName" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Senior Pastor / Lead Minister *
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
          <Label htmlFor="pastorPhone" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pastor Contact Phone *
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
          <Label htmlFor="pastorEmail" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Church Administrator Email *
          </Label>
          <Input
            id="pastorEmail"
            type="email"
            placeholder="admin@churchdomain.org"
            value={formData.pastorEmail}
            onChange={(e) => setFormData({ ...formData, pastorEmail: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
            required
          />
          <p className="text-[11px] text-muted-foreground font-body">
            Used to sign in to the Church Admin Portal and receive inviter/attendee email alerts.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Church Location / Branch
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
          <Label htmlFor="target" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mobilization Target (Estimated Attendees)
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
          <Label htmlFor="authCode" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Admin Portal Password (min 6 characters) *
          </Label>
          <div className="relative">
            <Input
              id="authCode"
              type={showPassword ? "text" : "password"}
              minLength={6}
              placeholder="Create your portal password (min 6 chars)"
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
          <p className="text-[11px] text-muted-foreground font-body">
            Hashed immediately on submission—use this with your email to sign in at the Admin Portal.
          </p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="privacyMode" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Member Privacy &amp; Call-Center Follow-Up Mode
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
                <Shield className="w-3.5 h-3.5 text-gold" /> Masked Confidential
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Marks roster as Masked; central administrators can still manage follow-ups or switch between Masked and Open when coordinated.
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
                <Church className="w-3.5 h-3.5 text-gold" /> Open Call-Center Partnership
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Marks roster Open for immediate call-center follow-up, CSV outreach exports, and transport coordination.
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
