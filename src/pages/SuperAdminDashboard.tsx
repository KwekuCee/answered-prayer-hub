import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { store } from "@/lib/store";
import { Admin } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  LayoutDashboard, Church, Shield, UserCheck, Users, Trophy,
  LogOut, Menu, X, TrendingUp, Target, Crown, Medal
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const GOLD_COLORS = ["hsl(40,70%,50%)", "hsl(40,60%,60%)", "hsl(40,50%,70%)", "hsl(40,40%,75%)"];

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const current = store.getCurrentAdmin();
    if (!current || !current.isSuperAdmin) { navigate("/admin"); return; }
    setAdmin(current);
  }, [navigate]);

  if (!admin) return null;

  const members = store.getMembers();
  const inviters = store.getInviters();
  const churches = store.getChurches();
  const admins = store.getAdmins();
  const confirmedTotal = members.filter(m => m.confirmed).length;

  // Leaderboard data
  const churchLeaderboard = churches
    .map(c => ({
      name: c.name,
      members: members.filter(m => m.churchId === c.id).length,
      confirmed: members.filter(m => m.churchId === c.id && m.confirmed).length,
      target: c.target,
    }))
    .sort((a, b) => b.confirmed - a.confirmed);

  const inviterLeaderboard = inviters
    .map(inv => ({
      name: inv.fullName,
      church: inv.churchName,
      invites: members.filter(m => m.inviterId === inv.id).length,
      confirmed: members.filter(m => m.inviterId === inv.id && m.confirmed).length,
    }))
    .sort((a, b) => b.confirmed - a.confirmed)
    .slice(0, 10);

  const handleConfirm = (memberId: string) => {
    const all = store.getMembers();
    const idx = all.findIndex(m => m.id === memberId);
    if (idx >= 0) {
      all[idx].confirmed = !all[idx].confirmed;
      store.setMembers(all);
      toast.success(all[idx].confirmed ? "Confirmed!" : "Removed.");
      setActiveTab(t => t); // force re-render
    }
  };

  const handleLogout = () => { store.setCurrentAdmin(null); navigate("/admin"); };

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "churches", label: "Manage Churches", icon: Church },
    { id: "admins", label: "Manage Admins", icon: Shield },
    { id: "inviters", label: "Manage Inviters", icon: UserCheck },
    { id: "members", label: "Manage Members", icon: Users },
    { id: "leaderboard", label: "Leaderboards", icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-0 overflow-hidden"} bg-gradient-navy text-primary-foreground transition-all duration-300 flex flex-col fixed lg:relative h-screen z-40`}>
        <div className="p-5 border-b border-gold/10">
          <h2 className="font-display text-lg font-bold text-gold flex items-center gap-2">
            <Crown className="h-5 w-5" /> Super Admin
          </h2>
          <p className="text-xs text-primary-foreground/50 font-body mt-1">Full system access</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-body text-sm transition-colors ${
                activeTab === item.id ? "bg-gold/15 text-gold" : "text-primary-foreground/60 hover:bg-navy-light/50"
              }`}
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gold/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-body text-sm text-primary-foreground/50 hover:text-destructive transition-colors">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen">
        <header className="h-14 border-b border-border flex items-center px-4 gap-4 bg-card">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <h1 className="font-display font-bold text-lg capitalize">{activeTab.replace("-", " ")}</h1>
        </header>

        <div className="p-4 md:p-6 max-w-7xl">
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fade-up">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Members", value: members.length, icon: Users },
                  { label: "Total Inviters", value: inviters.length, icon: UserCheck },
                  { label: "Churches", value: churches.length, icon: Church },
                  { label: "Confirmed", value: confirmedTotal, icon: TrendingUp },
                ].map(s => (
                  <Card key={s.label} className="border-border/50">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground font-body uppercase tracking-wide">{s.label}</span>
                        <s.icon className="h-4 w-4 text-gold" />
                      </div>
                      <p className="text-3xl font-display font-bold">{s.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Church progress */}
              <Card className="border-border/50">
                <CardHeader><CardTitle className="font-display text-lg">Church Progress</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {churchLeaderboard.map(c => (
                    <div key={c.name}>
                      <div className="flex justify-between text-sm font-body mb-1">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-muted-foreground">{c.confirmed}/{c.target}</span>
                      </div>
                      <Progress value={(c.confirmed / c.target) * 100} className="h-2 [&>div]:bg-gradient-gold" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "churches" && (
            <div className="animate-fade-up">
              <Card className="border-border/50">
                <CardHeader><CardTitle className="font-display text-lg">All Churches</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Church Name</TableHead>
                        <TableHead className="text-center">Target</TableHead>
                        <TableHead className="text-center">Members</TableHead>
                        <TableHead className="text-center">Confirmed</TableHead>
                        <TableHead className="text-center">Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {churchLeaderboard.map(c => (
                        <TableRow key={c.name}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-center">{c.target}</TableCell>
                          <TableCell className="text-center">{c.members}</TableCell>
                          <TableCell className="text-center"><Badge className="bg-success/10 text-success border-0">{c.confirmed}</Badge></TableCell>
                          <TableCell className="text-center">{Math.round((c.confirmed / c.target) * 100)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "admins" && (
            <div className="animate-fade-up">
              <Card className="border-border/50">
                <CardHeader><CardTitle className="font-display text-lg">All Admins</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Church</TableHead>
                        <TableHead className="text-center">Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admins.map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.fullName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{a.username}</TableCell>
                          <TableCell className="text-sm">{a.churchName}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={a.isSuperAdmin ? "bg-gradient-gold text-accent-foreground border-0" : "bg-muted text-muted-foreground border-0"}>
                              {a.isSuperAdmin ? "Super Admin" : "Church Admin"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "inviters" && (
            <div className="animate-fade-up">
              <Card className="border-border/50">
                <CardHeader><CardTitle className="font-display text-lg">All Inviters ({inviters.length})</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Church</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-center">Invites</TableHead>
                        <TableHead className="text-center">Confirmed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inviters.map(inv => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.fullName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{inv.churchName}</TableCell>
                          <TableCell className="text-sm">{inv.phone}</TableCell>
                          <TableCell className="text-center"><Badge variant="secondary">{inv.inviteCount}</Badge></TableCell>
                          <TableCell className="text-center"><Badge className="bg-success/10 text-success border-0">{inv.confirmedCount}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "members" && (
            <div className="animate-fade-up">
              <Card className="border-border/50">
                <CardHeader><CardTitle className="font-display text-lg">All Members ({members.length})</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Church</TableHead>
                        <TableHead>Invited By</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.fullName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{m.churchName}</TableCell>
                          <TableCell className="text-sm">{m.inviterName}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={m.confirmed ? "bg-success/10 text-success border-0" : "bg-muted text-muted-foreground border-0"}>
                              {m.confirmed ? "Confirmed" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button size="sm" variant={m.confirmed ? "outline" : "default"} onClick={() => handleConfirm(m.id)}
                              className={!m.confirmed ? "bg-gradient-gold text-accent-foreground hover:opacity-90" : ""}>
                              {m.confirmed ? "Undo" : "Confirm"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "leaderboard" && (
            <div className="space-y-6 animate-fade-up">
              {/* Church leaderboard chart */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-gold" /> Most Active Churches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={churchLeaderboard}>
                        <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: "DM Sans" }} />
                        <YAxis tick={{ fontSize: 12, fontFamily: "DM Sans" }} />
                        <Tooltip contentStyle={{ fontFamily: "DM Sans", borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                        <Bar dataKey="confirmed" radius={[6, 6, 0, 0]}>
                          {churchLeaderboard.map((_, i) => (
                            <Cell key={i} fill={GOLD_COLORS[i % GOLD_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Inviters */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Medal className="h-5 w-5 text-gold" /> Top Inviters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {inviterLeaderboard.map((inv, idx) => (
                      <div key={inv.name} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm ${
                          idx === 0 ? "bg-gradient-gold text-accent-foreground" :
                          idx === 1 ? "bg-gold/20 text-gold" :
                          idx === 2 ? "bg-gold/10 text-gold-dark" : "bg-muted text-muted-foreground"
                        }`}>{idx + 1}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{inv.name}</p>
                          <p className="text-xs text-muted-foreground">{inv.church}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{inv.invites} invites</p>
                          <p className="text-xs text-success">{inv.confirmed} confirmed</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
