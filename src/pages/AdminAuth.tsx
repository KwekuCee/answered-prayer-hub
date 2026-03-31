import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, LogIn, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const AUTH_CODE = "100PRAYER";

const AdminAuth = () => {
  const navigate = useNavigate();
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({
    fullName: "", username: "", email: "", phone: "",
    churchName: "", password: "", verifyPassword: "", authCode: "",
  });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });
      if (error) throw error;

      // Check role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      let { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);

      if (!roles || roles.length === 0) {
        await supabase.from("user_roles").insert({
          user_id: user.id,
          role: "church_admin",
        });
        roles = [{ role: "church_admin" as any }];
      }

      const isSuperAdmin = roles?.some(r => r.role === "super_admin");

      toast.success("Welcome back!");
      navigate(isSuperAdmin ? "/super-admin" : "/church-admin");
    } catch (err: any) {
      toast.error(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regForm.password !== regForm.verifyPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (regForm.authCode !== AUTH_CODE) {
      toast.error("Invalid authentication code.");
      return;
    }

    setLoading(true);
    try {
      // Find or create church
      const { data: existingChurch } = await supabase
        .from("churches")
        .select("id")
        .ilike("name", regForm.churchName.trim())
        .maybeSingle();

      let churchId: string;
      if (existingChurch) {
        churchId = existingChurch.id;
      } else {
        const { data: newChurch, error: cErr } = await supabase
          .from("churches")
          .insert({ name: regForm.churchName.trim() })
          .select("id")
          .single();
        if (cErr) throw cErr;
        churchId = newChurch.id;
      }

      // Sign up
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: regForm.email.trim(),
        password: regForm.password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            full_name: regForm.fullName.trim(),
            username: regForm.username.trim(),
          },
        },
      });
      if (authErr) throw authErr;

      if (authData.user) {
        // Update profile with phone and church
        await supabase.from("profiles").update({
          phone: regForm.phone.trim(),
          church_id: churchId,
        }).eq("user_id", authData.user.id);

        // Add church_admin role
        await supabase.from("user_roles").insert({
          user_id: authData.user.id,
          role: "church_admin" as const,
        });
      }

      toast.success("Admin account created! Please check your email to verify your account, then log in.");
      setRegForm({ fullName: "", username: "", email: "", phone: "", churchName: "", password: "", verifyPassword: "", authCode: "" });
    } catch (err: any) {
      toast.error(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-navy flex items-center justify-center p-4 admin-auth">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-gold-light hover:text-gold mb-6 font-body text-sm transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="text-center mb-8">
          <img src={logo} alt="100% Answered Prayer" className="w-48 mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-primary-foreground mb-1">Admin Access</h2>
          <p className="text-primary-foreground/60 font-body text-sm">Manage the 100% Answered Prayer program</p>
        </div>

        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2 h-11 bg-navy-light/50">
            <TabsTrigger value="login" className="text-primary-foreground/70 data-[state=active]:text-gold data-[state=active]:bg-navy-light font-body gap-2">
              <LogIn className="h-4 w-4" /> Login
            </TabsTrigger>
            <TabsTrigger value="register" className="text-primary-foreground/70 data-[state=active]:text-gold data-[state=active]:bg-navy-light font-body gap-2">
              <UserPlus className="h-4 w-4" /> Register
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="bg-card/5 border-gold/10 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-primary-foreground font-display">Welcome Back</CardTitle>
                <CardDescription className="text-primary-foreground/50 font-body">Sign in to your admin dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-primary-foreground/80">Email</Label>
                    <Input type="email" value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} placeholder="admin@email.com" className="bg-navy-light/50 border-gold/20 text-primary-foreground placeholder:text-primary-foreground/30" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-primary-foreground/80">Password</Label>
                    <Input type="password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" className="bg-navy-light/50 border-gold/20 text-primary-foreground placeholder:text-primary-foreground/30" required />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-accent-foreground font-semibold h-11">
                    {loading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card className="bg-card/5 border-gold/10 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-primary-foreground font-display">Create Account</CardTitle>
                <CardDescription className="text-primary-foreground/50 font-body">Register as a church admin</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-primary-foreground/80 text-xs">Full Name</Label>
                      <Input value={regForm.fullName} onChange={e => setRegForm(p => ({ ...p, fullName: e.target.value }))} className="bg-navy-light/50 border-gold/20 text-primary-foreground placeholder:text-primary-foreground/30 h-9" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-primary-foreground/80 text-xs">Username</Label>
                      <Input value={regForm.username} onChange={e => setRegForm(p => ({ ...p, username: e.target.value }))} className="bg-navy-light/50 border-gold/20 text-primary-foreground placeholder:text-primary-foreground/30 h-9" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-primary-foreground/80 text-xs">Email</Label>
                      <Input type="email" value={regForm.email} onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} className="bg-navy-light/50 border-gold/20 text-primary-foreground placeholder:text-primary-foreground/30 h-9" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-primary-foreground/80 text-xs">Phone</Label>
                      <Input value={regForm.phone} onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))} className="bg-navy-light/50 border-gold/20 text-primary-foreground placeholder:text-primary-foreground/30 h-9" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-primary-foreground/80 text-xs">Church Name</Label>
                    <Input value={regForm.churchName} onChange={e => setRegForm(p => ({ ...p, churchName: e.target.value }))} className="bg-navy-light/50 border-gold/20 text-primary-foreground placeholder:text-primary-foreground/30 h-9" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-primary-foreground/80 text-xs">Password</Label>
                      <Input type="password" value={regForm.password} onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))} className="bg-navy-light/50 border-gold/20 text-primary-foreground placeholder:text-primary-foreground/30 h-9" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-primary-foreground/80 text-xs">Verify Password</Label>
                      <Input type="password" value={regForm.verifyPassword} onChange={e => setRegForm(p => ({ ...p, verifyPassword: e.target.value }))} className="bg-navy-light/50 border-gold/20 text-primary-foreground placeholder:text-primary-foreground/30 h-9" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-primary-foreground/80 text-xs">Authentication Code</Label>
                    <Input type="password" value={regForm.authCode} onChange={e => setRegForm(p => ({ ...p, authCode: e.target.value }))} className="bg-navy-light/50 border-gold/20 text-primary-foreground placeholder:text-primary-foreground/30 h-9" required />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-accent-foreground font-semibold h-11">
                    {loading ? "Creating..." : "Create Admin Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminAuth;
