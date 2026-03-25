import { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

const QrScanner = () => {
    const navigate = useNavigate();
    const [processing, setProcessing] = useState(false);
    const [lastScannedId, setLastScannedId] = useState<string | null>(null);
    const [scanResult, setScanResult] = useState<{ success: boolean; message: string; name?: string } | null>(null);
    const [hasPermission, setHasPermission] = useState(false);

    // Check auth
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Please login as an admin first.");
                navigate("/admin");
                return;
            }
            const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
            const isAuthorized = roles?.some(r => r.role === "super_admin" || r.role === "church_admin");
            if (!isAuthorized) {
                toast.error("Unauthorized access.");
                navigate("/");
            } else {
                setHasPermission(true);
            }
        };
        checkAuth();
    }, [navigate]);

    const handleScan = async (texts: { rawValue: string }[]) => {
        if (processing || texts.length === 0) return;

        const scannedId = texts[0].rawValue;
        // Debounce exact same ID for 5 seconds to prevent spam
        if (scannedId === lastScannedId) return;

        setProcessing(true);
        setLastScannedId(scannedId);

        try {
            // Fetch attendee
            const { data: member, error: fetchError } = await supabase
                .from("members")
                .select("id, full_name, checked_in")
                .eq("id", scannedId)
                .maybeSingle();

            if (fetchError || !member) {
                setScanResult({ success: false, message: "Invalid ticket or QR code not found." });
                playSound(false);
                return;
            }

            if (member.checked_in) {
                setScanResult({ success: true, message: "Already checked in!", name: member.full_name });
                playSound(false);
                return;
            }

            // Perform check-in
            const { error: updateError } = await supabase
                .from("members")
                .update({ checked_in: true, check_in_time: new Date().toISOString() })
                .eq("id", scannedId);

            if (updateError) throw updateError;

            setScanResult({ success: true, message: "Checked in successfully!", name: member.full_name });
            playSound(true);

        } catch (err: any) {
            console.error(err);
            setScanResult({ success: false, message: "An error occurred during check-in." });
            playSound(false);
        } finally {
            setProcessing(false);
            // Clear last scanned ID after 3 seconds
            setTimeout(() => setLastScannedId(null), 3000);
            // Clear result message after 5 seconds
            setTimeout(() => setScanResult(null), 5000);
        }
    };

    const playSound = (success: boolean) => {
        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(context.destination);

            if (success) {
                oscillator.type = "sine";
                oscillator.frequency.setValueAtTime(880, context.currentTime); // High beep
                gainNode.gain.setValueAtTime(0.1, context.currentTime);
                oscillator.start();
                oscillator.stop(context.currentTime + 0.1);
            } else {
                oscillator.type = "sawtooth";
                oscillator.frequency.setValueAtTime(200, context.currentTime); // Low buzz
                gainNode.gain.setValueAtTime(0.1, context.currentTime);
                oscillator.start();
                oscillator.stop(context.currentTime + 0.3);
            }
        } catch (e) {
            // Audio context might be blocked by browser policy without user interaction, ignore safely
        }
    };

    if (!hasPermission) return null;

    return (
        <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-card/10 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden">

                <div className="flex items-center gap-4 mb-6 relative z-10">
                    <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-full bg-navy/50 border-gold/30">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-xl font-display font-bold text-foreground">QR Scanner</h1>
                        <p className="text-sm text-muted-foreground font-body">Point camera at Attendee QR Code</p>
                    </div>
                </div>

                <div className="aspect-square bg-black rounded-2xl overflow-hidden relative border-2 border-gold/30 shadow-inner z-10">
                    <Scanner
                        onScan={handleScan}
                        formats={["qr_code"]}
                        components={{
                            audio: false,
                            onOff: true,
                            torch: true,
                            zoom: true,
                            finder: true,
                        }}
                    />
                    {processing && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                            <span className="text-gold font-body font-bold animate-pulse">Processing...</span>
                        </div>
                    )}
                </div>

                {scanResult && (
                    <div className={`mt-6 p-4 rounded-xl border flex items-start gap-4 animate-fade-up ${scanResult.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        {scanResult.success ? (
                            <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                        ) : (
                            <XCircle className="w-8 h-8 text-red-500 shrink-0" />
                        )}
                        <div>
                            <h3 className={`font-bold font-display ${scanResult.success ? 'text-green-500' : 'text-red-500'}`}>
                                {scanResult.message}
                            </h3>
                            {scanResult.name && (
                                <p className="text-sm text-foreground/80 mt-1">{scanResult.name}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QrScanner;
