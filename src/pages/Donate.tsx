import { useState } from "react";
import Navbar from "@/components/Navbar";
import { usePaystackPayment } from "react-paystack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Gift, Coins } from "lucide-react";
import { toast } from "sonner";

// Since no specific key was provided, we use a generic placeholder or test key
// For real integration, this should be in .env (e.g., VITE_PAYSTACK_PUBLIC_KEY)
const PAYSTACK_TEST_KEY = "pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const Donate = () => {
    const [amount, setAmount] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [name, setName] = useState<string>("");

    const config = {
        reference: (new Date()).getTime().toString(),
        email: email,
        amount: parseInt(amount) * 100, // Paystack expects amount in pesewas/kobo
        publicKey: PAYSTACK_TEST_KEY,
        currency: "GHS",
        metadata: {
            custom_fields: [
                {
                    display_name: "Donor Name",
                    variable_name: "donor_name",
                    value: name
                }
            ]
        }
    };

    const initializePayment = usePaystackPayment(config);

    const onSuccess = (reference: any) => {
        console.log("Payment complete! Reference:", reference);
        toast.success("Thank you for your generous donation! God bless you.");
        setAmount("");
        setEmail("");
        setName("");
    };

    const onClose = () => {
        console.log("Payment popup closed");
        toast.info("Payment window closed.");
    };

    const handleDonate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !amount || !name) {
            toast.error("Please fill in all fields to proceed.");
            return;
        }
        if (parseInt(amount) < 1) {
            toast.error("Please enter a valid amount.");
            return;
        }

        // This won't work perfectly in Prod without real keys, but handles the UI flow
        if (PAYSTACK_TEST_KEY.includes("xxxxxxxx")) {
            toast.success("Test Mode: Simulation successful! Thank you for your pledge.");
            return;
        }

        // @ts-ignore - react-paystack typedefs often mismatch on the initializePayment arguments
        initializePayment(onSuccess, onClose);
    };

    // Pre-set amounts
    const presetAmounts = [50, 100, 200, 500];

    return (
        <div className="min-h-screen bg-background relative selection:bg-gold/30 selection:text-gold-light flex flex-col">
            <Navbar />

            <main className="flex-1 flex items-center justify-center pt-24 pb-12 px-4 relative overflow-hidden">
                <div className="fixed top-1/4 left-0 w-[60%] h-[60%] bg-gold/5 rounded-full blur-[140px] pointer-events-none -z-10"></div>

                <div className="max-w-4xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
                    <div className="space-y-6 animate-fade-right">
                        <div className="inline-flex items-center justify-center p-3 bg-gold/10 rounded-2xl mb-4">
                            <Heart className="w-8 h-8 text-gold" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-tight">
                            Partner With Us to <span className="bg-gradient-gold bg-clip-text text-transparent">Spread the Word</span>
                        </h1>
                        <p className="text-lg text-muted-foreground font-body leading-relaxed">
                            Your generous giving helps us organize these life-changing camp meetings, provide free transportation, and ensure the gospel reaches every corner.
                        </p>
                        <div className="flex items-center gap-4 text-sm font-semibold text-foreground/80">
                            <div className="flex items-center gap-2"><Coins className="w-4 h-4 text-gold" /> Secure Payment</div>
                            <div className="flex items-center gap-2"><Gift className="w-4 h-4 text-gold" /> One-time</div>
                        </div>
                    </div>

                    <div className="animate-fade-left">
                        <Card className="border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                            <CardHeader className="bg-gradient-to-b from-card/90 to-transparent border-b border-border/20 pb-6 pt-8 px-6 md:px-8">
                                <CardTitle className="font-display text-2xl">Make a Donation</CardTitle>
                                <CardDescription className="text-base mt-2">Enter your details and the amount you wish to give.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 md:p-8 space-y-6">
                                <form onSubmit={handleDonate} className="space-y-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" required />
                                    </div>
                                    <div className="space-y-3">
                                        <Label>Select Amount (GHS)</Label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {presetAmounts.map(preset => (
                                                <Button
                                                    key={preset}
                                                    type="button"
                                                    variant={amount === preset.toString() ? "default" : "outline"}
                                                    className={amount === preset.toString() ? "bg-gold text-navy hover:bg-gold-light" : ""}
                                                    onClick={() => setAmount(preset.toString())}
                                                >
                                                    {preset}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="custom-amount">Or Enter Custom Amount</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₵</span>
                                            <Input
                                                id="custom-amount"
                                                type="number"
                                                min="1"
                                                value={amount}
                                                onChange={e => setAmount(e.target.value)}
                                                className="pl-8"
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <Button type="submit" className="w-full bg-gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90 transition-opacity h-12 text-base mt-4">
                                        Donate {amount ? `₵${amount}` : "Now"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Donate;
