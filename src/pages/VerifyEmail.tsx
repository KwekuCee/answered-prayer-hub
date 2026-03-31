import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import logo from "@/assets/logo.png";
import Navbar from "@/components/Navbar";

const VerifyEmail = () => {
    const location = useLocation();
    const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        // Supabase redirects to this URL with hash fragments on successful/failed verification
        const hash = location.hash;

        if (hash) {
            const hashParams = new URLSearchParams(hash.substring(1));
            const error = hashParams.get("error");
            const errorDesc = hashParams.get("error_description");
            const accessToken = hashParams.get("access_token");
            const type = hashParams.get("type");

            if (error) {
                setStatus("error");
                setErrorMessage(errorDesc?.replace(/\+/g, " ") || "Verification link is invalid or has expired.");
            } else if (accessToken || type === "signup" || type === "recovery") {
                setStatus("success");
            } else {
                // Unknown hash state, but assumed successful if no error is present
                setStatus("success");
            }
        } else {
            // If they just land on the page directly without a hash, we assume success 
            // since they clicked the link, but normally Supabase adds a hash.
            setStatus("success");
        }
    }, [location]);

    return (
        <div className="min-h-screen bg-background relative selection:bg-gold/30 selection:text-gold-light flex flex-col">
            <Navbar />

            <main className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
                {/* Decorative Backgrounds matching homepage */}
                <div className="fixed top-1/4 left-0 w-[60%] h-[60%] bg-gold/5 rounded-full blur-[140px] pointer-events-none -z-10"></div>
                <div className="fixed bottom-0 right-0 w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none -z-10"></div>

                <div className="w-full max-w-md relative z-10 animate-fade-up">
                    <div className="text-center mb-8">
                        <img src={logo} alt="100% Answered Prayer" className="w-48 mx-auto mb-6" />
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                            Account <span className="bg-gradient-gold bg-clip-text text-transparent">Verification</span>
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

                            <CardTitle className="font-display text-2xl">
                                {status === "verifying" ? "Verifying..." :
                                    status === "success" ? "Email Verified!" : "Verification Failed"}
                            </CardTitle>

                            <CardDescription className="font-body text-base mt-2">
                                {status === "verifying" ? "Please wait while we verify your email..." :
                                    status === "success" ? "Your email has been successfully verified. You can now access your dashboard." :
                                        errorMessage}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 text-center">
                            {status !== "verifying" && (
                                <Link to="/admin">
                                    <Button className="w-full bg-gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90 transition-opacity h-12 text-base">
                                        Go to Login
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
