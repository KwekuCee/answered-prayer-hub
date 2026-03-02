import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, UserCheck, Download, LogOut, Menu, X,
  CheckCircle2, Clock, TrendingUp, Target
} from "lucide-react";
import logo from "@/assets/logo.png";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const ChurchAdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [churchId, setChurchId] = useState<string | null>(null);
  const [churchName, setChurchName] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin"); return; }

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (roles?.some(r => r.role === "super_admin")) { navigate("/super-admin"); return; }
      if (!roles?.some(r => r.role === "church_admin")) { navigate("/admin"); return; }

      const { data: profile } = await supabase.from("profiles").select("church_id").eq("user_id", user.id).single();
      if (profile?.church_id) {
        setChurchId(profile.church_id);
        const { data: church } = await supabase.from("churches").select("name").eq("id", profile.church_id).single();
        setChurchName(church?.name || "");
      }
    };
    checkAuth();
  }, [navigate]);

  const { data: members = [] } = useQuery({
    queryKey: ["members", churchId],
    queryFn: async () => {
      if (!churchId) return [];
      const { data, error } = await supabase.from("members").select("*, inviters(full_name)").eq("church_id", churchId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!churchId,
  });

  const { data: inviters = [] } = useQuery({
    queryKey: ["inviters", churchId],
    queryFn: async () => {
      if (!churchId) return [];
      const { data, error } = await supabase.from("inviters").select("*").eq("church_id", churchId).order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!churchId,
  });

  const { data: church } = useQuery({
    queryKey: ["church", churchId],
    queryFn: async () => {
      if (!churchId) return null;
      const { data } = await supabase.from("churches").select("*").eq("id", churchId).single();
      return data;
    },
    enabled: !!churchId,
  });

  if (!churchId) return null;

  const todayStr = new Date().toISOString().split("T")[0];
  const todayRegs = members.filter(m => m.created_at.startsWith(todayStr)).length;
  const confirmedCount = members.filter(m => m.confirmed).length;
  const target = church?.target || 100;
  const progress = Math.round((confirmedCount / target) * 100);

  const handleConfirm = async (memberId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("members").update({ confirmed: !currentStatus }).eq("id", memberId);
    if (error) { toast.error("Failed to update."); return; }
    toast.success(!currentStatus ? "Member confirmed!" : "Confirmation removed.");
    queryClient.invalidateQueries({ queryKey: ["members", churchId] });
  };

  const exportCSV = (data: Record<string, any>[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).filter(k => typeof data[0][k] !== "object");
    const csv = [headers.join(","), ...data.map(row => headers.map(h => `"${row[h] ?? ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename}.csv exported!`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin");
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "inviters", label: "Manage Inviters", icon: UserCheck },
    { id: "members", label: "Manage Members", icon: Users },
    { id: "export", label: "Data Export", icon: Download },
  ];

  const filteredMembers = members.filter(m =>
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ((m.inviters as any)?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`${sidebarOpen ? "w-64" : "w-0 overflow-hidden"} bg-gradient-navy text-primary-foreground transition-all duration-300 flex flex-col fixed lg:relative h-screen z-40`}>
        <div className="p-5 border-b border-gold/10">
          <img src={logo} alt="100% Answered Prayer" className="w-28 mb-2" />
          <p className="text-xs text-primary-foreground/50 font-body truncate">{churchName}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-body text-sm transition-colors ${activeTab === item.id ? "bg-gold/15 text-gold" : "text-primary-foreground/60 hover:bg-navy-light/50 hover:text-primary-foreground"}`}>
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

      <main className="flex-1 min-h-screen">
        <header className="h-14 border-b border-border flex items-center px-4 gap-4 bg-card">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <h1 className="font-display font-bold text-lg capitalize">{activeTab.replace("-", " ")}</h1>
        </header>

        <div className="p-4 md:p-6 max-w-6xl">
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fade-up">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Members", value: members.length, icon: Users, color: "text-gold" },
                  { label: "Total Inviters", value: inviters.length, icon: UserCheck, color: "text-success" },
                  { label: "Today's Registrations", value: todayRegs, icon: Clock, color: "text-accent" },
                  { label: "Confirmed", value: confirmedCount, icon: CheckCircle2, color: "text-success" },
                ].map(stat => (
                  <Card key={stat.label} className="border-border/50">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground font-body uppercase tracking-wide">{stat.label}</span>
                        <stat.icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                      <p className="text-3xl font-display font-bold">{stat.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-gold" /> Loading Target Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2 font-body text-sm">
                    <span>{confirmedCount} confirmed</span>
                    <span className="text-muted-foreground">Target: {target}</span>
                  </div>
                  <Progress value={progress} className="h-3 [&>div]:bg-gradient-gold" />
                  <p className="text-xs text-muted-foreground mt-2 font-body">{progress}% complete</p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "inviters" && (
            <div className="animate-fade-up">
              <Card className="border-border/50">
                <CardHeader><CardTitle className="font-display text-lg">Inviters ({inviters.length})</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead>
                        <TableHead className="text-center">Invites</TableHead><TableHead className="text-center">Confirmed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inviters.map(inv => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.full_name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{inv.email}</TableCell>
                          <TableCell className="text-sm">{inv.phone}</TableCell>
                          <TableCell className="text-center"><Badge variant="secondary">{inv.invite_count}</Badge></TableCell>
                          <TableCell className="text-center"><Badge className="bg-success/10 text-success border-0">{inv.confirmed_count}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "members" && (
            <div className="space-y-4 animate-fade-up">
              <Input placeholder="Search members or inviters..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-sm" />
              <Card className="border-border/50">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Invited By</TableHead>
                        <TableHead>Date</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.full_name}</TableCell>
                          <TableCell className="text-sm">{m.phone}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{(m.inviters as any)?.full_name || "—"}</TableCell>
                          <TableCell className="text-sm">{m.created_at.split("T")[0]}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={m.confirmed ? "bg-success/10 text-success border-0" : "bg-muted text-muted-foreground border-0"}>
                              {m.confirmed ? "Confirmed" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button size="sm" variant={m.confirmed ? "outline" : "default"} onClick={() => handleConfirm(m.id, m.confirmed)}
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

          {activeTab === "export" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-up">
              {[
                { label: "Export Members", desc: "Download all member data", onClick: () => exportCSV(members as any, "members") },
                { label: "Export Inviters", desc: "Download all inviter data", onClick: () => exportCSV(inviters as any, "inviters") },
                { label: "Export Attendance", desc: "Download confirmed members", onClick: () => exportCSV(members.filter(m => m.confirmed) as any, "attendance") },
              ].map(item => (
                <Card key={item.label} className="border-border/50 cursor-pointer hover:shadow-lg transition-shadow" onClick={item.onClick}>
                  <CardContent className="p-6 text-center">
                    <Download className="h-8 w-8 mx-auto mb-3 text-gold" />
                    <h3 className="font-display font-bold mb-1">{item.label}</h3>
                    <p className="text-sm text-muted-foreground font-body">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ChurchAdminDashboard;
