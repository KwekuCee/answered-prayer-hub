import { useEffect, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Church } from "lucide-react";
import logo from "@/assets/logo.png";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const VerifyEmail = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState<"verifying" | "success" | "error" | "onboarding">("verifying");
    const [errorMessage, setErrorMessage] = useState("");
    const [selectedChurch, setSelectedChurch] = useState("");
    const [userId, setUserId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const { data: churches = [] } = useQuery({
        queryKey: ["churches-list"],
        queryFn: async () => {
            const { data, error } = await supabase.from("churches").select("id, name").order("name");
            if (error) throw error;
            return data;
        },
        enabled: status === "onboarding" || status === "success",
    });

    useEffect(() => {
        const checkSessionAndHash = async () => {
            const hash = location.hash;
            let checkSession = true;

            if (hash) {
                const hashParams = new URLSearchParams(hash.substring(1));
                const error = hashParams.get("error");
                const errorDesc = hashParams.get("error_description");

                if (error) {
                    setStatus("error");
                    setErrorMessage(errorDesc?.replace(/\+/g, " ") || "Verification link is invalid or has expired.");
                    checkSession = false;
                }
            }

            if (checkSession) {
                // Check if user is logged in
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    setUserId(session.user.id);
                    // Check if they have a church assigned
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("church_id")
                        .eq("user_id", session.user.id)
                        .maybeSingle();

                    if (profile && !profile.church_id) {
                        setStatus("onboarding");
                    } else {
                        setStatus("success");
                    }
                } else {
                    // No session yet, might be verifying or they just landed here without logging in
                    // If there's no error but also no session, they might need to log in to complete onboarding
                    setStatus("success");
                }
            }
        };

        checkSessionAndHash();

        // Listen for auth state changes (e.g., if the hash processes and triggers a login event)
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session) {
                setUserId(session.user.id);
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("church_id")
                    .eq("user_id", session.user.id)
                    .maybeSingle();

                if (profile && !profile.church_id) {
                    setStatus("onboarding");
                } else {
                    setStatus("success");
                }
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [location]);

    const handleCompleteProfile = async () => {
        if (!selectedChurch) {
            toast.error("Please select a church.");
            return;
        }
        if (!userId) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ church_id: selectedChurch })
                .eq("user_id", userId);

            if (error) throw error;

            toast.success("Profile completed successfully!");
            setStatus("success");
            navigate("/admin"); // Log them in to the admin dashboard
        } catch (error: any) {
            toast.error(error.message || "Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-background relative selection:bg-gold/30 selection:text-gold-light flex flex-col">
            <Navbar />

            <main className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="fixed top-1/4 left-0 w-[60%] h-[60%] bg-gold/5 rounded-full blur-[140px] pointer-events-none -z-10"></div>
                <div className="fixed bottom-0 right-0 w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none -z-10"></div>

                <div className="w-full max-w-md relative z-10 animate-fade-up">
                    <div className="text-center mb-8">
                        <img src={logo} alt="100% Answered Prayer" className="w-48 mx-auto mb-6" />
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                            Account <span className="bg-gradient-gold bg-clip-text text-transparent">Setup</span>
                        </h1>
                    </div>

                    <Card className="border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                        <CardHeader className="text-center pb-2 pt-8">
                            {status === "verifying" && (
                                <div className="mx-auto w-16 h-16 border-4 border-gold/20 border-t-gold rounded-full animate-spin mb-4"></div>
                            )}
                            {status === "success" && (
                                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            )}
                            {status === "error" && (
                                <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                            )}
                            {status === "onboarding" && (
                                <Church className="w-16 h-16 text-gold mx-auto mb-4" />
                            )}

                            <CardTitle className="font-display text-2xl">
                                {status === "verifying" ? "Verifying..." :
                                    status === "success" ? "Setup Complete!" :
                                        status === "onboarding" ? "Select Your Church" : "Verification Failed"}
                            </CardTitle>

                            <CardDescription className="font-body text-base mt-2">
                                {status === "verifying" ? "Please wait while we check your account status..." :
                                    status === "success" ? "Your account is fully set up. You can now access your admin dashboard." :
                                        status === "onboarding" ? "Please assign your initial church to complete your admin profile." :
                                            errorMessage}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            {status === "onboarding" && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-foreground/80">Church Selection</Label>
                                        <Select value={selectedChurch} onValueChange={setSelectedChurch}>
                                            <SelectTrigger className="bg-background/50 border-input"><SelectValue placeholder="Select your church" /></SelectTrigger>
                                            <SelectContent>
                                                {churches.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button onClick={handleCompleteProfile} disabled={saving} className="w-full bg-gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90 transition-opacity h-12 text-base mt-4">
                                        {saving ? "Saving..." : "Complete Setup"}
                                    </Button>
                                    <p className="text-xs text-muted-foreground text-center mt-4">
                                        If your church is not listed, you can ask a Super Admin to add it for you.
                                    </p>
                                </div>
                            )}

                            {status === "success" && (
                                <Link to="/admin">
                                    <Button className="w-full bg-gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90 transition-opacity h-12 text-base">
                                        Go to Dashboard
                                    </Button>
                                </Link>
                            )}

                            {status === "error" && (
                                <Link to="/admin">
                                    <Button variant="outline" className="w-full font-semibold border-gold/50 text-gold hover:bg-gold/10 transition-colors h-12 text-base">
                                        Return to Login
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            <footer className="py-8 border-t border-border/50 text-center bg-background/50 backdrop-blur-sm z-10 mt-auto">
                <p className="text-sm text-muted-foreground font-body font-medium">
                    © {new Date().getFullYear()} 100% Answered Prayer. All rights reserved.
                </p>
            </footer>
        </div>
    );
};

export default VerifyEmail;
