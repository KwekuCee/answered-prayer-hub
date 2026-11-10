import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Music, Users, Phone, Mail, Church, Calendar, UserCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export const SpecialChoirForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    choirName: "",
    churchId: "",
    churchNameCustom: "",
    leaderName: "",
    leaderPhone: "",
    leaderEmail: "",
    estimatedMembers: "25",
    instrumentRequirements: "",
    rehearsalSchedule: "",
  });

  const { data: churches = [] } = useQuery({
    queryKey: ["churches-list"],
    queryFn: async () => {
      try {
        const { data } = await supabase.from("churches").select("id, name, is_external").order("name");
        return data || [];
      } catch {
        return [];
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.choirName.trim()) {
      toast.error("Please enter the choir or music ministry name.");
      return;
    }
    if (!formData.leaderName.trim()) {
      toast.error("Please enter the Choir Director / Music Leader's name.");
      return;
    }
    if (!formData.leaderPhone.trim()) {
      toast.error("Please provide a contact phone number for the leader.");
      return;
    }

    setLoading(true);
    try {
      const selectedChurch = churches.find(c => c.id === formData.churchId);
      const churchNameResolved = selectedChurch ? selectedChurch.name : (formData.churchNameCustom.trim() || null);
      const count = parseInt(formData.estimatedMembers, 10) || 1;

      // 1. Insert into special_choirs table
      const { data: choir, error: choirError } = await supabase
        .from("special_choirs")
        .insert({
          choir_name: formData.choirName.trim(),
          church_id: selectedChurch ? selectedChurch.id : null,
          church_name: churchNameResolved,
          leader_name: formData.leaderName.trim(),
          leader_phone: formData.leaderPhone.trim(),
          leader_email: formData.leaderEmail.trim() || null,
          estimated_members: count,
          confirmed_members: count,
          instrument_requirements: formData.instrumentRequirements.trim() || null,
          rehearsal_schedule: formData.rehearsalSchedule.trim() || null,
          status: "confirmed",
        })
        .select()
        .single();

      if (choirError) throw choirError;

      // 2. Also register the leader into members table flagged as category 'choir_member'
      try {
        await supabase.from("members").insert({
          full_name: `${formData.leaderName.trim()} (Director - ${formData.choirName.trim()})`,
          phone: formData.leaderPhone.trim(),
          email: formData.leaderEmail.trim() || null,
          category: "choir_member",
          occupation: "Music Director / Choir Leader",
          location: churchNameResolved,
          church_id: selectedChurch ? selectedChurch.id : null,
          choir_delegation_id: choir.id,
          confirmed: true,
        });
      } catch (e) {
        console.warn("Choir leader member registration note:", e);
      }

      setSubmitted(true);
      toast.success(`Choir '${formData.choirName}' registered successfully with ${count} singers!`);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      console.error("Special choir registration error:", err);
      const msg = err instanceof Error ? err.message : "Failed to register choir";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-10 space-y-6 animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-gold/20 border border-gold/40 text-gold flex items-center justify-center mx-auto shadow-gold">
          <Music className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-display font-bold text-foreground">Special Choir Registered</h3>
          <p className="text-muted-foreground font-body text-sm max-w-md mx-auto">
            <span className="font-semibold text-foreground">{formData.choirName}</span> is registered with {formData.estimatedMembers} confirmed vocalists.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-gold/30 text-left max-w-md mx-auto text-xs space-y-2 font-body">
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-muted-foreground">Music Director:</span>
            <span className="font-semibold text-foreground">{formData.leaderName}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-muted-foreground">Confirmed Delegation:</span>
            <span className="font-semibold text-gold font-mono">{formData.estimatedMembers} Singers</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-muted-foreground">Leader Contact:</span>
            <span className="font-medium text-foreground">{formData.leaderPhone}</span>
          </div>
        </div>

        <div className="pt-4 flex justify-center">
          <Button
            onClick={() => {
              setSubmitted(false);
              setFormData({
                choirName: "",
                churchId: "",
                churchNameCustom: "",
                leaderName: "",
                leaderPhone: "",
                leaderEmail: "",
                estimatedMembers: "25",
                instrumentRequirements: "",
                rehearsalSchedule: "",
              });
            }}
            variant="outline"
            className="border-gold/30 hover:border-gold"
          >
            Register Another Choir
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 rounded-2xl bg-gold/10 border border-gold/30 flex items-start gap-3">
        <Music className="w-5 h-5 text-gold shrink-0 mt-0.5" />
        <div className="text-xs text-foreground/90 font-body leading-relaxed">
          <span className="font-bold text-gold">Visiting Choir & Worship Team Registration:</span> Register guest choirs, campus fellowships, and youth music ensembles. Headcount is credited to the total mobilization scoreboard and forwarded to sound engineering.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="choirName" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-gold" /> Choir / Music Ministry Name *
          </Label>
          <Input
            id="choirName"
            placeholder="e.g., Heavenly Voices Choir / Legon Inter-Halls Mass Choir"
            value={formData.choirName}
            onChange={(e) => setFormData({ ...formData, choirName: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Church className="w-3.5 h-3.5 text-gold" /> Affiliated Church / Fellowship
          </Label>
          <Select
            value={formData.churchId}
            onValueChange={(val) => setFormData({ ...formData, churchId: val })}
          >
            <SelectTrigger className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body">
              <SelectValue placeholder="Select church (or other below)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- Independent / Not on List --</SelectItem>
              {churches.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} {c.is_external ? "(External Church)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(!formData.churchId || formData.churchId === "none") && (
          <div className="space-y-2">
            <Label htmlFor="customChurch" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Church Name (If not in dropdown)
            </Label>
            <Input
              id="customChurch"
              placeholder="e.g., Methodist Church Ghana, Wesley Cathedral"
              value={formData.churchNameCustom}
              onChange={(e) => setFormData({ ...formData, churchNameCustom: e.target.value })}
              className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="leaderName" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-gold" /> Choir Leader / Music Director *
          </Label>
          <Input
            id="leaderName"
            placeholder="e.g., Minister David Ofori"
            value={formData.leaderName}
            onChange={(e) => setFormData({ ...formData, leaderName: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="leaderPhone" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-gold" /> Leader Phone Number *
          </Label>
          <Input
            id="leaderPhone"
            type="tel"
            placeholder="024 123 4567"
            value={formData.leaderPhone}
            onChange={(e) => setFormData({ ...formData, leaderPhone: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="leaderEmail" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-gold" /> Leader Email (Optional)
          </Label>
          <Input
            id="leaderEmail"
            type="email"
            placeholder="director@choir.org"
            value={formData.leaderEmail}
            onChange={(e) => setFormData({ ...formData, leaderEmail: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimatedMembers" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-gold" /> Number of Choir Members *
          </Label>
          <Input
            id="estimatedMembers"
            type="number"
            min="1"
            max="500"
            value={formData.estimatedMembers}
            onChange={(e) => setFormData({ ...formData, estimatedMembers: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
            required
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="instrumentReqs" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Instruments / Technical Sound Rider (Optional)
          </Label>
          <Input
            id="instrumentReqs"
            placeholder="e.g., 4 wireless mics, keyboard line-in, bass guitar DI box"
            value={formData.instrumentRequirements}
            onChange={(e) => setFormData({ ...formData, instrumentRequirements: e.target.value })}
            className="h-12 bg-background/50 border-border/60 focus:border-gold rounded-xl font-body"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-13 bg-gradient-gold text-navy font-bold font-body text-base rounded-xl shadow-gold hover:opacity-95 transition-all mt-4"
      >
        {loading ? "Registering Choir..." : "Register Special Choir"}
      </Button>
    </form>
  );
};

export default SpecialChoirForm;
