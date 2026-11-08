import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus } from "lucide-react";
import RegistrationForm from "@/components/RegistrationForm";
import InviterSignUpForm from "@/components/InviterSignUpForm";
import Navbar from "@/components/Navbar";

const Register = () => {
    return (
        <div className="min-h-screen bg-background relative selection:bg-gold/30 selection:text-gold-light flex flex-col">
            <Navbar />

            <main className="flex-1 flex items-center justify-center pt-24 pb-12 px-4 relative overflow-hidden">
                {/* Decorative Backgrounds */}
                <div className="fixed top-1/4 left-0 w-[60%] h-[60%] bg-gold/5 rounded-full blur-[140px] pointer-events-none -z-10"></div>
                <div className="fixed bottom-0 right-0 w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none -z-10"></div>

                <div className="max-w-3xl w-full mx-auto relative z-10">
                    <div className="text-center mb-10 animate-fade-up">
                        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
                            Get <span className="bg-gradient-gold bg-clip-text text-transparent">Started</span>
                        </h1>
                        <p className="text-lg text-muted-foreground font-body">
                            Register as an attendee or sign up as an inviter to bring others into the program.
                        </p>
                    </div>

                    <Tabs defaultValue="attendee" className="animate-fade-up">
                        <TabsList className="grid w-full grid-cols-2 h-14 bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl p-1 shadow-lg">
                            <TabsTrigger value="attendee" className="font-body font-semibold text-sm md:text-base gap-2 rounded-lg data-[state=active]:bg-gradient-gold data-[state=active]:text-accent-foreground data-[state=active]:shadow-md transition-all">
                                <Users className="h-4 w-4 md:w-5 md:h-5" />
                                Attendee Registration
                            </TabsTrigger>
                            <TabsTrigger value="inviter" className="font-body font-semibold text-sm md:text-base gap-2 rounded-lg data-[state=active]:bg-gradient-gold data-[state=active]:text-accent-foreground data-[state=active]:shadow-md transition-all">
                                <UserPlus className="h-4 w-4 md:w-5 md:h-5" />
                                Sign Up as Inviter
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="attendee" className="mt-6">
                            <Card className="border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                                <CardHeader className="bg-gradient-to-b from-card/90 to-transparent border-b border-border/20 pb-8 pt-8 px-6 md:px-8">
                                    <CardTitle className="font-display text-2xl md:text-3xl">Attendee Registration</CardTitle>
                                    <CardDescription className="font-body text-base mt-2">Fill in your details to reserve your place at Korle Bu Stands in Worship.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 md:p-8">
                                    <RegistrationForm />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="inviter" className="mt-6">
                            <Card className="border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                                <CardHeader className="bg-gradient-to-b from-card/90 to-transparent border-b border-border/20 pb-8 pt-8 px-6 md:px-8">
                                    <CardTitle className="font-display text-2xl md:text-3xl">Inviter Registration</CardTitle>
                                    <CardDescription className="font-body text-base mt-2">Sign up to become an inviter and help grow the movement.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 md:p-8">
                                    <InviterSignUpForm />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>

            <footer className="py-8 border-t border-border/50 text-center bg-background/50 backdrop-blur-sm z-10 mt-auto">
                <p className="text-sm text-muted-foreground font-body font-medium">
                    © {new Date().getFullYear()} Korle Bu Stands in Worship. All rights reserved. | Developed by <a href="https://primehaven.tech" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light hover:underline transition-colors font-semibold">Prime Haven</a>
                </p>
            </footer>
        </div>
    );
};

export default Register;
