import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, LogIn, UserPlus, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const AUTH_CODE = "100PRAYER";

const AdminAuth = () => {
  const navigate = useNavigate();
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({
    fullName: "", username: "", email: "", phone: "",
    password: "", verifyPassword: "", authCode: "",
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

      toast.success("Welcome back, Administrator!");
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
        // Update profile with phone
        await supabase.from("profiles").update({
          phone: regForm.phone.trim(),
        }).eq("user_id", authData.user.id);

        // Add church_admin role
        await supabase.from("user_roles").insert({
          user_id: authData.user.id,
          role: "church_admin" as const,
        });

        if (authData.session) {
          toast.success("Account created successfully!");
          navigate("/verify-email");
          return;
        }
      }

      toast.success("Admin account created! Please check your email to verify your account, then log in.");
      setRegForm({ fullName: "", username: "", email: "", phone: "", password: "", verifyPassword: "", authCode: "" });
    } catch (err: any) {
      toast.error(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-4 selection:bg-gold/30 selection:text-gold">
      {/* Background glow effects */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-gold/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-gold hover:underline font-body text-sm transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Homepage
        </Link>

        <div className="text-center space-y-3">
          <img src={logo} alt="Korle Bu Stands in Worship" className="w-44 md:w-52 mx-auto drop-shadow" />
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">Admin Portal</h2>
          <p className="text-muted-foreground font-body text-sm">Korle Bu Stands in Worship Management System</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-zinc-900 border border-border/60 rounded-2xl p-1">
            <TabsTrigger value="login" className="rounded-xl text-zinc-400 data-[state=active]:text-navy data-[state=active]:bg-gradient-gold data-[state=active]:font-bold font-body text-xs gap-2 transition-all">
              <LogIn className="h-4 w-4" /> Sign In
            </TabsTrigger>
            <TabsTrigger value="register" className="rounded-xl text-zinc-400 data-[state=active]:text-navy data-[state=active]:bg-gradient-gold data-[state=active]:font-bold font-body text-xs gap-2 transition-all">
              <UserPlus className="h-4 w-4" /> Register Admin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="bg-card/80 backdrop-blur-xl border border-gold/30 rounded-3xl shadow-2xl overflow-hidden mt-3">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-xl font-display font-bold text-foreground">Welcome Back</CardTitle>
                <CardDescription className="text-muted-foreground font-body text-xs">Sign in with your authorized admin credentials</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-300">Email Address</Label>
                    <Input type="email" value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} placeholder="admin@ksw.org" className="bg-zinc-900/80 border-border/60 focus:border-gold h-11 text-foreground text-sm" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-300">Password</Label>
                    <Input type="password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" className="bg-zinc-900/80 border-border/60 focus:border-gold h-11 text-foreground text-sm" required />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-navy font-bold h-12 rounded-2xl shadow-gold hover:shadow-gold/80 transition-all mt-2">
                    {loading ? "Signing In..." : "Sign In To Dashboard"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card className="bg-card/80 backdrop-blur-xl border border-gold/30 rounded-3xl shadow-2xl overflow-hidden mt-3">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-xl font-display font-bold text-foreground">Create Admin Account</CardTitle>
                <CardDescription className="text-muted-foreground font-body text-xs">Authorized church administrator registration</CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-zinc-300">Full Name</Label>
                      <Input value={regForm.fullName} onChange={e => setRegForm(p => ({ ...p, fullName: e.target.value }))} className="bg-zinc-900/80 border-border/60 focus:border-gold h-10 text-foreground text-xs" required />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-zinc-300">Username</Label>
                      <Input value={regForm.username} onChange={e => setRegForm(p => ({ ...p, username: e.target.value }))} className="bg-zinc-900/80 border-border/60 focus:border-gold h-10 text-foreground text-xs" required />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-zinc-300">Email</Label>
                      <Input type="email" value={regForm.email} onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} className="bg-zinc-900/80 border-border/60 focus:border-gold h-10 text-foreground text-xs" required />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-zinc-300">Phone</Label>
                      <Input value={regForm.phone} onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))} className="bg-zinc-900/80 border-border/60 focus:border-gold h-10 text-foreground text-xs" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-zinc-300">Password</Label>
                      <Input type="password" value={regForm.password} onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))} className="bg-zinc-900/80 border-border/60 focus:border-gold h-10 text-foreground text-xs" required />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-zinc-300">Verify Password</Label>
                      <Input type="password" value={regForm.verifyPassword} onChange={e => setRegForm(p => ({ ...p, verifyPassword: e.target.value }))} className="bg-zinc-900/80 border-border/60 focus:border-gold h-10 text-foreground text-xs" required />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-gold" /> Admin Authentication Code
                    </Label>
                    <Input type="password" value={regForm.authCode} onChange={e => setRegForm(p => ({ ...p, authCode: e.target.value }))} placeholder="Enter security code" className="bg-zinc-900/80 border-border/60 focus:border-gold h-10 text-foreground text-xs" required />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-navy font-bold h-11 rounded-2xl shadow-gold hover:shadow-gold/80 transition-all mt-1">
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
