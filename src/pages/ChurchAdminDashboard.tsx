import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, UserCheck, Download, LogOut, Menu, X,
  CheckCircle2, Clock, Target, Pencil, Trash2
} from "lucide-react";
import logo from "@/assets/logo.png";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type MemberFilter = "all" | "confirmed" | "pending";

const ChurchAdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<MemberFilter>("all");

  const [churchId, setChurchId] = useState<string | null>(null);
  const [churchName, setChurchName] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [selectedChurchId, setSelectedChurchId] = useState("");
  const [assigningChurch, setAssigningChurch] = useState(false);

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

        setUserId(user.id);

        const { data: roles, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (roleError) throw roleError;

        if (roles?.some(r => r.role === "super_admin")) {
          navigate("/super-admin");
          return;
        }

        if (!roles?.some(r => r.role === "church_admin")) {
          navigate("/admin");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("church_id")
          .eq("user_id", user.id)
          .single();

        if (profileError) throw profileError;

        if (profile?.church_id) {
          setChurchId(profile.church_id);
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

  const { data: churches = [] } = useQuery({
    queryKey: ["church-admin-church-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("churches").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members", churchId],
    queryFn: async () => {
      if (!churchId) return [];
      const { data, error } = await supabase
        .from("members")
        .select("*, inviters(full_name)")
        .eq("church_id", churchId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!churchId,
  });

  const { data: inviters = [] } = useQuery({
    queryKey: ["inviters", churchId],
    queryFn: async () => {
      if (!churchId) return [];
      const { data, error } = await supabase
        .from("inviters")
        .select("*")
        .eq("church_id", churchId)
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!churchId,
  });

  const { data: church } = useQuery({
    queryKey: ["church", churchId],
    queryFn: async () => {
      if (!churchId) return null;
      const { data, error } = await supabase.from("churches").select("*").eq("id", churchId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!churchId,
  });

  useEffect(() => {
    if (church?.name) setChurchName(church.name);
  }, [church]);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayRegs = members.filter(m => m.created_at.startsWith(todayStr)).length;
  const confirmedCount = members.filter(m => m.confirmed).length;
  const pendingCount = members.filter(m => !m.confirmed).length;
  const target = church?.target || 100;
  const progress = Math.round((confirmedCount / target) * 100);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((m.inviters as any)?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "confirmed" && m.confirmed) ||
        (statusFilter === "pending" && !m.confirmed);

      return matchesSearch && matchesStatus;
    });
  }, [members, searchTerm, statusFilter]);

  const handleAssignChurch = async () => {
    if (!userId || !selectedChurchId) return;
    setAssigningChurch(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ church_id: selectedChurchId })
        .eq("user_id", userId);

      if (error) throw error;

      setChurchId(selectedChurchId);
      queryClient.invalidateQueries({ queryKey: ["church", selectedChurchId] });
      toast.success("Church linked successfully. Dashboard is now active.");
    } catch (error: any) {
      toast.error(error.message || "Failed to link church");
    } finally {
      setAssigningChurch(false);
    }
  };

  const handleConfirm = async (memberId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("members").update({ confirmed: !currentStatus }).eq("id", memberId);
    if (error) {
      toast.error("Failed to update.");
      return;
    }

    toast.success(!currentStatus ? "Member confirmed!" : "Confirmation removed.");
    queryClient.invalidateQueries({ queryKey: ["members", churchId] });
  };

  const handleConfirmAllPending = async () => {
    if (!churchId || pendingCount === 0) return;

    const { error } = await supabase
      .from("members")
      .update({ confirmed: true })
      .eq("church_id", churchId)
      .eq("confirmed", false);

    if (error) {
      toast.error("Failed to confirm all pending members.");
      return;
    }

    toast.success("All pending members have been confirmed.");
    queryClient.invalidateQueries({ queryKey: ["members", churchId] });
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
    queryClient.invalidateQueries({ queryKey: ["inviters", churchId] });
  };

  const handleSaveMember = async () => {
    if (!editingMember) return;

    const { error } = await supabase.from("members").update({
      full_name: editingMember.full_name,
      phone: editingMember.phone,
      email: editingMember.email,
      occupation: editingMember.occupation,
      location: editingMember.location,
    }).eq("id", editingMember.id);

    if (error) {
      toast.error("Failed to save.");
      return;
    }

    toast.success("Member updated!");
    setEditingMember(null);
    queryClient.invalidateQueries({ queryKey: ["members", churchId] });
  };

  const handleSaveInviter = async () => {
    if (!editingInviter) return;

    const { error } = await supabase.from("inviters").update({
      full_name: editingInviter.full_name,
      phone: editingInviter.phone,
      email: editingInviter.email,
    }).eq("id", editingInviter.id);

    if (error) {
      toast.error("Failed to save.");
      return;
    }

    toast.success("Inviter updated!");
    setEditingInviter(null);
    queryClient.invalidateQueries({ queryKey: ["inviters", churchId] });
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
    { id: "inviters", label: "Manage Inviters", icon: UserCheck },
    { id: "members", label: "Manage Members", icon: Users },
    { id: "export", label: "Data Export", icon: Download },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-border/50">
          <CardContent className="p-8 text-center space-y-2">
            <p className="font-display text-xl">Loading dashboard...</p>
            <p className="text-sm text-muted-foreground font-body">Please wait while we verify your admin access.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!churchId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-xl border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Finish Admin Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground font-body">
              Your church admin account is active, but no church is linked yet—select your church to unlock the dashboard.
            </p>

            <div className="space-y-2">
              <Label>Choose your church</Label>
              <Select value={selectedChurchId} onValueChange={setSelectedChurchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your church" />
                </SelectTrigger>
                <SelectContent>
                  {churches.map((churchOption) => (
                    <SelectItem key={churchOption.id} value={churchOption.id}>
                      {churchOption.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleAssignChurch}
                disabled={!selectedChurchId || assigningChurch}
                className="bg-gradient-gold text-accent-foreground hover:opacity-90"
              >
                {assigningChurch ? "Linking church..." : "Link Church"}
              </Button>
              <Button variant="outline" onClick={handleLogout}>Logout</Button>
            </div>
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
          <p className="text-xs text-primary-foreground/50 font-body truncate">{churchName || "Church Admin"}</p>
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
                activeTab === item.id
                  ? "bg-gold/15 text-gold"
                  : "text-primary-foreground/60 hover:bg-navy-light/50 hover:text-primary-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
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
                  { label: "Pending Confirmations", value: pendingCount, icon: CheckCircle2, color: "text-destructive" },
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

              <Card className="border-border/50 overflow-hidden">
                <CardHeader className="bg-gradient-gold pb-4">
                  <CardTitle className="font-display text-lg flex items-center gap-2 text-accent-foreground">
                    <Target className="h-5 w-5" /> Loading Target
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3 font-body">
                    <div>
                      <p className="text-4xl font-display font-bold">{confirmedCount} <span className="text-lg text-muted-foreground font-normal">/ {target}</span></p>
                      <p className="text-sm text-muted-foreground mt-1">confirmed members</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-display font-bold ${progress >= 100 ? "text-success" : progress >= 50 ? "text-accent" : "text-destructive"}`}>{progress}%</p>
                      <p className="text-xs text-muted-foreground">{progress >= 100 ? "🎉 Target reached!" : progress >= 50 ? "Halfway there!" : "Keep going!"}</p>
                    </div>
                  </div>
                  <Progress value={Math.min(progress, 100)} className="h-4 [&>div]:bg-gradient-gold rounded-full" />
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground font-body">
                    <span>0</span>
                    <span>{Math.round(target / 2)}</span>
                    <span>{target}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "inviters" && (
            <div className="animate-fade-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg">Inviters ({inviters.length})</h2>
                <Button variant="outline" size="sm" onClick={() => exportCSV(inviters as any, "inviters")} className="gap-2">
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
              </div>
              <Card className="border-border/50">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-center">Invites</TableHead>
                        <TableHead className="text-center">Confirmed</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
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
            <div className="space-y-4 animate-fade-up">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Input
                  placeholder="Search members or inviters..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")}>All</Button>
                  <Button variant={statusFilter === "confirmed" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("confirmed")}>Confirmed</Button>
                  <Button variant={statusFilter === "pending" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("pending")}>Pending</Button>
                  <Button size="sm" variant="outline" onClick={handleConfirmAllPending} disabled={pendingCount === 0}>Confirm All Pending</Button>
                  <Button variant="outline" size="sm" onClick={() => exportCSV(filteredMembers as any, "members")} className="gap-2 shrink-0">
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
                        <TableHead>Phone</TableHead>
                        <TableHead>Invited By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
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

          {activeTab === "export" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-up">
              {[
                { label: "Export Members", desc: "Download all member data", onClick: () => exportCSV(members as any, "members") },
                { label: "Export Pending", desc: "Only members awaiting confirmation", onClick: () => exportCSV(members.filter(m => !m.confirmed) as any, "pending-members") },
                { label: "Export Inviters", desc: "Download all inviter data", onClick: () => exportCSV(inviters as any, "inviters") },
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

export default ChurchAdminDashboard;
