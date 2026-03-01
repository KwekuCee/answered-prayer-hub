import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { store } from "@/lib/store";
import { toast } from "sonner";
import { ArrowLeft, LogIn, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const AdminAuth = () => {
  const navigate = useNavigate();
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [regForm, setRegForm] = useState({
    fullName: "", username: "", email: "", phone: "",
    churchName: "", password: "", verifyPassword: "", authCode: "",
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const admins = store.getAdmins();
    const passwords = store.getPasswords();
    const admin = admins.find(a => a.username === loginForm.username || a.email === loginForm.username);
    if (!admin || passwords[admin.username] !== loginForm.password) {
      toast.error("Invalid credentials.");
      return;
    }
    store.setCurrentAdmin(admin);
    toast.success(`Welcome back, ${admin.fullName}!`);
    navigate(admin.isSuperAdmin ? "/super-admin" : "/church-admin");
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (regForm.password !== regForm.verifyPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!store.validateAuthCode(regForm.authCode)) {
      toast.error("Invalid authentication code.");
      return;
    }

    const admins = store.getAdmins();
    if (admins.find(a => a.username === regForm.username)) {
      toast.error("Username already taken.");
      return;
    }

    const churches = store.getChurches();
    let church = churches.find(c => c.name.toLowerCase() === regForm.churchName.trim().toLowerCase());
    if (!church) {
      church = { id: `c${Date.now()}`, name: regForm.churchName.trim(), target: 100, confirmed: 0 };
      churches.push(church);
      store.setChurches(churches);
    }

    const newAdmin = {
      id: `a${Date.now()}`,
      fullName: regForm.fullName.trim(),
      username: regForm.username.trim(),
      email: regForm.email.trim(),
      phone: regForm.phone.trim(),
      churchName: church.name,
      churchId: church.id,
      isSuperAdmin: false,
      createdAt: new Date().toISOString().split("T")[0],
    };
    admins.push(newAdmin);
    store.setAdmins(admins);
    store.setPassword(newAdmin.username, regForm.password);
    store.setCurrentAdmin(newAdmin);
    toast.success("Admin account created!");
    navigate("/church-admin");
  };

  return (
    <div className="min-h-screen bg-gradient-navy flex items-center justify-center p-4">
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
                    <Label className="text-primary-foreground/80">Username or Email</Label>
                    <Input value={loginForm.username} onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))} placeholder="username" className="bg-navy-light/50 border-gold/20 text-primary-foreground placeholder:text-primary-foreground/30" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-primary-foreground/80">Password</Label>
                    <Input type="password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" className="bg-navy-light/50 border-gold/20 text-primary-foreground placeholder:text-primary-foreground/30" required />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-gold text-accent-foreground font-semibold h-11">
                    Sign In
                  </Button>
                  <p className="text-xs text-primary-foreground/40 text-center font-body">
                    Demo: superadmin / admin123 or admingrace / admin123
                  </p>
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
                  <Button type="submit" className="w-full bg-gradient-gold text-accent-foreground font-semibold h-11">
                    Create Admin Account
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
