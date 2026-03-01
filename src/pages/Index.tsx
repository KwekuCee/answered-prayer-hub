import HeroSection from "@/components/HeroSection";
import MemberRegistrationForm from "@/components/MemberRegistrationForm";
import InviterSignUpForm from "@/components/InviterSignUpForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />

      {/* Registration Section */}
      <section id="register" className="py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10 animate-fade-up">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
              Get Started
            </h2>
            <p className="text-muted-foreground font-body">
              Register as a member or sign up as an inviter to bring others into the program.
            </p>
          </div>

          <Tabs defaultValue="member" className="animate-fade-up">
            <TabsList className="grid w-full grid-cols-2 h-12 bg-muted">
              <TabsTrigger value="member" className="font-body font-semibold text-sm gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <Users className="h-4 w-4" />
                Member Registration
              </TabsTrigger>
              <TabsTrigger value="inviter" className="font-body font-semibold text-sm gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <UserPlus className="h-4 w-4" />
                Sign Up as Inviter
              </TabsTrigger>
            </TabsList>

            <TabsContent value="member">
              <Card className="border-border/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="font-display text-xl">Member Registration</CardTitle>
                  <CardDescription className="font-body">Fill in your details to register for 100% Answered Prayer.</CardDescription>
                </CardHeader>
                <CardContent>
                  <MemberRegistrationForm />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inviter">
              <Card className="border-border/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="font-display text-xl">Inviter Registration</CardTitle>
                  <CardDescription className="font-body">Sign up to become an inviter and help grow the movement.</CardDescription>
                </CardHeader>
                <CardContent>
                  <InviterSignUpForm />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border text-center">
        <p className="text-sm text-muted-foreground font-body">
          © 2026 100% Answered Prayer. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Index;
