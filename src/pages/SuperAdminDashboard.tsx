import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  LayoutDashboard, Church, Shield, UserCheck, Users, Trophy, Download,
  LogOut, Menu, X, TrendingUp, Target, Medal, Pencil, Trash2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import logo from "@/assets/logo.png";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type MemberFilter = "all" | "confirmed" | "pending";

const GOLD_COLORS = [
  "hsl(var(--gold))",
  "hsl(var(--gold-light))",
  "hsl(var(--gold-dark))",
  "hsl(var(--accent))",
];

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  const [churchSearch, setChurchSearch] = useState("");
  const [inviterSearch, setInviterSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");

  const [editingChurch, setEditingChurch] = useState<any>(null);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editingInviter, setEditingInviter] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      setAuthLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/admin");
          return;
        }

        const { data: roles, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (error) throw error;

        if (!roles?.some(r => r.role === "super_admin")) {
          navigate("/admin");
          return;
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to load dashboard");
        navigate("/admin");
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const { data: members = [] } = useQuery({
    queryKey: ["all-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*, inviters(full_name), churches(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: inviters = [] } = useQuery({
    queryKey: ["all-inviters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inviters")
        .select("*, churches(name)")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: churches = [] } = useQuery({
    queryKey: ["all-churches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("churches").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: admins = [] } = useQuery({
    queryKey: ["all-admins"],
    queryFn: async () => {
      const { data: profilesData, error } = await supabase.from("profiles").select("*, churches(name)");
      if (error) throw error;

      const { data: rolesData } = await supabase.from("user_roles").select("user_id, role");

      return (profilesData || []).map((p) => ({
        ...p,
        roles: (rolesData || []).filter((r) => r.user_id === p.user_id),
      }));
    },
  });

  const confirmedTotal = members.filter((m) => m.confirmed).length;
  const pendingTotal = members.filter((m) => !m.confirmed).length;

  const churchLeaderboard = useMemo(() => {
    return churches
      .map(c => ({
        id: c.id,
        name: c.name,
        members: members.filter(m => m.church_id === c.id).length,
        confirmed: members.filter(m => m.church_id === c.id && m.confirmed).length,
        target: c.target,
      }))
      .sort((a, b) => b.confirmed - a.confirmed);
  }, [churches, members]);

  const inviterLeaderboard = useMemo(() => {
    return inviters
      .map(inv => ({
        name: inv.full_name,
        church: (inv.churches as any)?.name || "",
        invites: members.filter(m => m.inviter_id === inv.id).length,
        confirmed: members.filter(m => m.inviter_id === inv.id && m.confirmed).length,
      }))
      .sort((a, b) => b.confirmed - a.confirmed)
      .slice(0, 10);
  }, [inviters, members]);

  const filteredChurches = useMemo(() => {
    return churchLeaderboard.filter((c) => c.name.toLowerCase().includes(churchSearch.toLowerCase()));
  }, [churchLeaderboard, churchSearch]);

  const filteredInviters = useMemo(() => {
    return inviters.filter((inv) =>
      inv.full_name.toLowerCase().includes(inviterSearch.toLowerCase()) ||
      ((inv.churches as any)?.name || "").toLowerCase().includes(inviterSearch.toLowerCase())
    );
  }, [inviters, inviterSearch]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        m.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        ((m.churches as any)?.name || "").toLowerCase().includes(memberSearch.toLowerCase()) ||
        ((m.inviters as any)?.full_name || "").toLowerCase().includes(memberSearch.toLowerCase());

      const matchesStatus =
        memberFilter === "all" ||
        (memberFilter === "confirmed" && m.confirmed) ||
        (memberFilter === "pending" && !m.confirmed);

      return matchesSearch && matchesStatus;
    });
  }, [members, memberSearch, memberFilter]);

  const unassignedAdmins = admins.filter((a) => {
    const isChurchAdmin = (a.roles || []).some((r: any) => r.role === "church_admin");
    return isChurchAdmin && !a.church_id;
  }).length;

  const handleConfirm = async (memberId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("members").update({ confirmed: !currentStatus }).eq("id", memberId);
    if (error) {
      toast.error("Failed.");
      return;
    }
    toast.success(!currentStatus ? "Confirmed!" : "Removed.");
    queryClient.invalidateQueries({ queryKey: ["all-members"] });
  };

  const handleConfirmAllPending = async () => {
    if (pendingTotal === 0) return;

    const { error } = await supabase
      .from("members")
      .update({ confirmed: true })
      .eq("confirmed", false);

    if (error) {
      toast.error("Failed to confirm all pending members.");
      return;
    }

    toast.success("All pending members confirmed.");
    queryClient.invalidateQueries({ queryKey: ["all-members"] });
  };

  const handleDeleteInviter = async (inviterId: string) => {
    const shouldDelete = window.confirm("Delete this inviter? This cannot be undone.");
    if (!shouldDelete) return;

    const { error } = await supabase.from("inviters").delete().eq("id", inviterId);
    if (error) {
      toast.error(error.message || "Failed to delete inviter.");
      return;
    }

    toast.success("Inviter deleted.");
    queryClient.invalidateQueries({ queryKey: ["all-inviters"] });
  };

  const handleSaveChurch = async () => {
    if (!editingChurch) return;
    const { error } = await supabase
      .from("churches")
      .update({ name: editingChurch.name, target: editingChurch.target })
      .eq("id", editingChurch.id);

    if (error) {
      toast.error("Failed to save.");
      return;
    }

    toast.success("Church updated!");
    setEditingChurch(null);
    queryClient.invalidateQueries({ queryKey: ["all-churches"] });
  };

  const handleSaveMember = async () => {
    if (!editingMember) return;

    const { error } = await supabase
      .from("members")
      .update({
        full_name: editingMember.full_name,
        phone: editingMember.phone,
        email: editingMember.email,
        occupation: editingMember.occupation,
        location: editingMember.location,
      })
      .eq("id", editingMember.id);

    if (error) {
      toast.error("Failed.");
      return;
    }

    toast.success("Member updated!");
    setEditingMember(null);
    queryClient.invalidateQueries({ queryKey: ["all-members"] });
  };

  const handleSaveInviter = async () => {
    if (!editingInviter) return;

    const { error } = await supabase
      .from("inviters")
      .update({
        full_name: editingInviter.full_name,
        phone: editingInviter.phone,
        email: editingInviter.email,
      })
      .eq("id", editingInviter.id);

    if (error) {
      toast.error("Failed.");
      return;
    }

    toast.success("Inviter updated!");
    setEditingInviter(null);
    queryClient.invalidateQueries({ queryKey: ["all-inviters"] });
  };

  const exportCSV = (data: Record<string, any>[], filename: string) => {
    if (!data.length) {
      toast.error("No data to export.");
      return;
    }

    const headers = Object.keys(data[0]).filter((k) => typeof data[0][k] !== "object");
    const csv = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`${filename}.csv exported!`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin");
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "churches", label: "Manage Churches", icon: Church },
    { id: "admins", label: "Manage Admins", icon: Shield },
    { id: "inviters", label: "Manage Inviters", icon: UserCheck },
    { id: "members", label: "Manage Members", icon: Users },
    { id: "leaderboard", label: "Leaderboards", icon: Trophy },
    { id: "export", label: "Data Export", icon: Download },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-border/50">
          <CardContent className="p-8 text-center space-y-2">
            <p className="font-display text-xl">Loading dashboard...</p>
            <p className="text-sm text-muted-foreground font-body">Verifying super admin access.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`${sidebarOpen ? "w-64" : "w-0 overflow-hidden"} bg-gradient-navy text-primary-foreground transition-all duration-300 flex flex-col fixed lg:relative h-screen z-40`}>
        <div className="p-5 border-b border-gold/10">
          <img src={logo} alt="100% Answered Prayer" className="w-28 mb-2" />
          <p className="text-xs text-primary-foreground/50 font-body mt-1">Super Admin</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: "Total Members", value: members.length, icon: Users },
                  { label: "Total Inviters", value: inviters.length, icon: UserCheck },
                  { label: "Churches", value: churches.length, icon: Church },
                  { label: "Pending", value: pendingTotal, icon: Target },
                  { label: "Unassigned Admins", value: unassignedAdmins, icon: Shield },
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

              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="font-display text-lg">Church Progress</CardTitle>
                  <Button size="sm" variant="outline" onClick={handleConfirmAllPending} disabled={pendingTotal === 0}>Confirm All Pending</Button>
                </CardHeader>
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
            <div className="animate-fade-up space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display font-bold text-lg">All Churches</h2>
                <div className="flex items-center gap-2">
                  <Input
                    value={churchSearch}
                    onChange={(e) => setChurchSearch(e.target.value)}
                    placeholder="Search church..."
                    className="w-56"
                  />
                  <Button variant="outline" size="sm" onClick={() => exportCSV(filteredChurches as any, "churches")} className="gap-2">
                    <Download className="h-4 w-4" /> Export CSV
                  </Button>
                </div>
              </div>
              <Card className="border-border/50">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Church Name</TableHead>
                        <TableHead className="text-center">Target</TableHead>
                        <TableHead className="text-center">Members</TableHead>
                        <TableHead className="text-center">Confirmed</TableHead>
                        <TableHead className="text-center">Progress</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredChurches.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-center">{c.target}</TableCell>
                          <TableCell className="text-center">{c.members}</TableCell>
                          <TableCell className="text-center"><Badge className="bg-success/10 text-success border-0">{c.confirmed}</Badge></TableCell>
                          <TableCell className="text-center">
                            <Badge variant={c.confirmed >= c.target ? "default" : "secondary"}>
                              {Math.round((c.confirmed / c.target) * 100)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button size="sm" variant="ghost" onClick={() => setEditingChurch({ id: c.id, name: c.name, target: c.target })}>
                              <Pencil className="h-3.5 w-3.5" />
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

          {activeTab === "admins" && (
            <div className="animate-fade-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg">All Admins</h2>
                <Button variant="outline" size="sm" onClick={() => exportCSV(admins as any, "admins")} className="gap-2">
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
              </div>
              <Card className="border-border/50">
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
                      {admins.map(a => {
                        const roles = a.roles || [];
                        const isSuperAdmin = roles.some((r: any) => r.role === "super_admin");
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{a.full_name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{a.username}</TableCell>
                            <TableCell className="text-sm">{(a.churches as any)?.name || "Unassigned"}</TableCell>
                            <TableCell className="text-center">
                              <Badge className={isSuperAdmin ? "bg-gradient-gold text-accent-foreground border-0" : "bg-muted text-muted-foreground border-0"}>
                                {isSuperAdmin ? "Super Admin" : "Church Admin"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "inviters" && (
            <div className="animate-fade-up space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display font-bold text-lg">All Inviters ({filteredInviters.length})</h2>
                <div className="flex items-center gap-2">
                  <Input
                    value={inviterSearch}
                    onChange={(e) => setInviterSearch(e.target.value)}
                    placeholder="Search inviter or church..."
                    className="w-64"
                  />
                  <Button variant="outline" size="sm" onClick={() => exportCSV(filteredInviters as any, "inviters")} className="gap-2">
                    <Download className="h-4 w-4" /> Export CSV
                  </Button>
                </div>
              </div>
              <Card className="border-border/50">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Church</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-center">Invites</TableHead>
                        <TableHead className="text-center">Confirmed</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInviters.map(inv => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.full_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{(inv.churches as any)?.name || ""}</TableCell>
                          <TableCell className="text-sm">{inv.phone}</TableCell>
                          <TableCell className="text-center"><Badge variant="secondary">{inv.invite_count}</Badge></TableCell>
                          <TableCell className="text-center"><Badge className="bg-success/10 text-success border-0">{inv.confirmed_count}</Badge></TableCell>
                          <TableCell className="text-center space-x-1">
                            <Button size="sm" variant="ghost" onClick={() => setEditingInviter({ ...inv })}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteInviter(inv.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
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

          {activeTab === "members" && (
            <div className="animate-fade-up space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display font-bold text-lg">All Members ({filteredMembers.length})</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search member, church, inviter..."
                    className="w-72"
                  />
                  <Button variant={memberFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setMemberFilter("all")}>All</Button>
                  <Button variant={memberFilter === "confirmed" ? "default" : "outline"} size="sm" onClick={() => setMemberFilter("confirmed")}>Confirmed</Button>
                  <Button variant={memberFilter === "pending" ? "default" : "outline"} size="sm" onClick={() => setMemberFilter("pending")}>Pending</Button>
                  <Button variant="outline" size="sm" onClick={handleConfirmAllPending} disabled={pendingTotal === 0}>Confirm All Pending</Button>
                  <Button variant="outline" size="sm" onClick={() => exportCSV(filteredMembers as any, "members")} className="gap-2">
                    <Download className="h-4 w-4" /> Export CSV
                  </Button>
                </div>
              </div>
              <Card className="border-border/50">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Church</TableHead>
                        <TableHead>Invited By</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.full_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{(m.churches as any)?.name || ""}</TableCell>
                          <TableCell className="text-sm">{(m.inviters as any)?.full_name || "—"}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={m.confirmed ? "bg-success/10 text-success border-0" : "bg-muted text-muted-foreground border-0"}>
                              {m.confirmed ? "Confirmed" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center space-x-1">
                            <Button size="sm" variant="ghost" onClick={() => setEditingMember({ ...m })}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant={m.confirmed ? "outline" : "default"}
                              onClick={() => handleConfirm(m.id, m.confirmed)}
                              className={!m.confirmed ? "bg-gradient-gold text-accent-foreground hover:opacity-90" : ""}
                            >
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

          {activeTab === "export" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
              {[
                { label: "Export Members", desc: "All member records", onClick: () => exportCSV(members as any, "all-members") },
                { label: "Export Inviters", desc: "All inviter records", onClick: () => exportCSV(inviters as any, "all-inviters") },
                { label: "Export Churches", desc: "All church data", onClick: () => exportCSV(churches as any, "churches") },
                { label: "Export Admins", desc: "All admin accounts", onClick: () => exportCSV(admins as any, "admins") },
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

      <Dialog open={!!editingChurch} onOpenChange={open => !open && setEditingChurch(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Edit Church</DialogTitle></DialogHeader>
          {editingChurch && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Church Name</Label><Input value={editingChurch.name} onChange={e => setEditingChurch((p: any) => ({ ...p, name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Loading Target</Label><Input type="number" value={editingChurch.target} onChange={e => setEditingChurch((p: any) => ({ ...p, target: parseInt(e.target.value) || 0 }))} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingChurch(null)}>Cancel</Button>
            <Button onClick={handleSaveChurch} className="bg-gradient-gold text-accent-foreground hover:opacity-90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMember} onOpenChange={open => !open && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Edit Member</DialogTitle></DialogHeader>
          {editingMember && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Full Name</Label><Input value={editingMember.full_name} onChange={e => setEditingMember((p: any) => ({ ...p, full_name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={editingMember.phone} onChange={e => setEditingMember((p: any) => ({ ...p, phone: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={editingMember.email || ""} onChange={e => setEditingMember((p: any) => ({ ...p, email: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Occupation</Label><Input value={editingMember.occupation || ""} onChange={e => setEditingMember((p: any) => ({ ...p, occupation: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Location</Label><Input value={editingMember.location || ""} onChange={e => setEditingMember((p: any) => ({ ...p, location: e.target.value }))} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
            <Button onClick={handleSaveMember} className="bg-gradient-gold text-accent-foreground hover:opacity-90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingInviter} onOpenChange={open => !open && setEditingInviter(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Edit Inviter</DialogTitle></DialogHeader>
          {editingInviter && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Full Name</Label><Input value={editingInviter.full_name} onChange={e => setEditingInviter((p: any) => ({ ...p, full_name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={editingInviter.phone} onChange={e => setEditingInviter((p: any) => ({ ...p, phone: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={editingInviter.email} onChange={e => setEditingInviter((p: any) => ({ ...p, email: e.target.value }))} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingInviter(null)}>Cancel</Button>
            <Button onClick={handleSaveInviter} className="bg-gradient-gold text-accent-foreground hover:opacity-90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminDashboard;
