import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Church, Award, Music } from "lucide-react";
import RegistrationForm from "@/components/RegistrationForm";
import InviterSignUpForm from "@/components/InviterSignUpForm";
import ExternalChurchForm from "@/components/ExternalChurchForm";
import DignitaryRegistrationForm from "@/components/DignitaryRegistrationForm";
import SpecialChoirForm from "@/components/SpecialChoirForm";
import Navbar from "@/components/Navbar";

const Register = () => {
    return (
        <div className="min-h-screen bg-background relative selection:bg-gold/30 selection:text-gold-light flex flex-col">
            <Navbar />

            <main className="flex-1 flex items-center justify-center pt-24 pb-16 px-4 relative overflow-hidden">
                {/* Decorative Backgrounds */}
                <div className="fixed top-1/4 left-0 w-[60%] h-[60%] bg-gold/5 rounded-full blur-[140px] pointer-events-none -z-10"></div>
                <div className="fixed bottom-0 right-0 w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none -z-10"></div>

                <div className="max-w-4xl w-full mx-auto relative z-10">
                    <div className="text-center mb-8 animate-fade-up">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-semibold uppercase tracking-widest mb-3">
                            Korle Bu Stands in Worship 2026
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-3">
                            Registration <span className="bg-gradient-gold bg-clip-text text-transparent italic">Hub</span>
                        </h1>
                        <p className="text-sm md:text-base text-muted-foreground font-body max-w-2xl mx-auto">
                            Reserve your place as an attendee, register an external church, onboard as an inviter, or register special VIP and choir delegations.
                        </p>
                    </div>

                    <Tabs defaultValue="attendee" className="animate-fade-up">
                        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto gap-1 bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-1.5 shadow-lg">
                            <TabsTrigger 
                                value="attendee" 
                                className="py-2.5 font-body font-semibold text-xs md:text-sm gap-1.5 rounded-xl data-[state=active]:bg-gradient-gold data-[state=active]:text-navy data-[state=active]:shadow-md transition-all whitespace-nowrap"
                            >
                                <Users className="h-4 w-4 shrink-0" />
                                <span>Attendee</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="inviter" 
                                className="py-2.5 font-body font-semibold text-xs md:text-sm gap-1.5 rounded-xl data-[state=active]:bg-gradient-gold data-[state=active]:text-navy data-[state=active]:shadow-md transition-all whitespace-nowrap"
                            >
                                <UserPlus className="h-4 w-4 shrink-0" />
                                <span>Inviter</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="church" 
                                className="py-2.5 font-body font-semibold text-xs md:text-sm gap-1.5 rounded-xl data-[state=active]:bg-gradient-gold data-[state=active]:text-navy data-[state=active]:shadow-md transition-all whitespace-nowrap"
                            >
                                <Church className="h-4 w-4 shrink-0" />
                                <span>External Church</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="dignitary" 
                                className="py-2.5 font-body font-semibold text-xs md:text-sm gap-1.5 rounded-xl data-[state=active]:bg-gradient-gold data-[state=active]:text-navy data-[state=active]:shadow-md transition-all whitespace-nowrap"
                            >
                                <Award className="h-4 w-4 shrink-0" />
                                <span>VIP Dignitary</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="choir" 
                                className="py-2.5 font-body font-semibold text-xs md:text-sm gap-1.5 rounded-xl data-[state=active]:bg-gradient-gold data-[state=active]:text-navy data-[state=active]:shadow-md transition-all whitespace-nowrap col-span-2 sm:col-span-1"
                            >
                                <Music className="h-4 w-4 shrink-0" />
                                <span>Special Choir</span>
                            </TabsTrigger>
                        </TabsList>

                        {/* 1. Attendee Registration */}
                        <TabsContent value="attendee" className="mt-6">
                            <Card className="border border-border/50 bg-card/85 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                                <CardHeader className="bg-gradient-to-b from-card/90 to-transparent border-b border-border/20 pb-6 pt-7 px-6 md:px-8">
                                    <CardTitle className="font-display text-2xl md:text-3xl text-foreground">Attendee Registration</CardTitle>
                                    <CardDescription className="font-body text-sm mt-1">Reserve your complimentary place at Korle Bu Stands in Worship 2026.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 md:p-8">
                                    <RegistrationForm />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* 2. Inviter Sign-Up */}
                        <TabsContent value="inviter" className="mt-6">
                            <Card className="border border-border/50 bg-card/85 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                                <CardHeader className="bg-gradient-to-b from-card/90 to-transparent border-b border-border/20 pb-6 pt-7 px-6 md:px-8">
                                    <CardTitle className="font-display text-2xl md:text-3xl text-foreground">Inviter Registration</CardTitle>
                                    <CardDescription className="font-body text-sm mt-1">Sign up as an inviter or soul-winner and mobilize souls for the event.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 md:p-8">
                                    <InviterSignUpForm />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* 3. External Church Registration */}
                        <TabsContent value="church" className="mt-6">
                            <Card className="border border-border/50 bg-card/85 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                                <CardHeader className="bg-gradient-to-b from-card/90 to-transparent border-b border-border/20 pb-6 pt-7 px-6 md:px-8">
                                    <CardTitle className="font-display text-2xl md:text-3xl text-foreground">Register External Church</CardTitle>
                                    <CardDescription className="font-body text-sm mt-1">Pastors and church leaders can register their ministry. Confidentiality and data privacy guaranteed.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 md:p-8">
                                    <ExternalChurchForm />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* 4. Dignitary Registration */}
                        <TabsContent value="dignitary" className="mt-6">
                            <Card className="border border-border/50 bg-card/85 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                                <CardHeader className="bg-gradient-to-b from-card/90 to-transparent border-b border-border/20 pb-6 pt-7 px-6 md:px-8">
                                    <CardTitle className="font-display text-2xl md:text-3xl text-foreground">VIP Dignitary Registration</CardTitle>
                                    <CardDescription className="font-body text-sm mt-1">Official protocol registration for government representatives, traditional rulers, and special guests.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 md:p-8">
                                    <DignitaryRegistrationForm />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* 5. Special Choir Registration */}
                        <TabsContent value="choir" className="mt-6">
                            <Card className="border border-border/50 bg-card/85 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                                <CardHeader className="bg-gradient-to-b from-card/90 to-transparent border-b border-border/20 pb-6 pt-7 px-6 md:px-8">
                                    <CardTitle className="font-display text-2xl md:text-3xl text-foreground">Special Choir Registration</CardTitle>
                                    <CardDescription className="font-body text-sm mt-1">Register visiting mass choirs, music teams, and worship ensembles with delegation headcounts.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 md:p-8">
                                    <SpecialChoirForm />
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
