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
import { NotificationsMenu } from "@/components/NotificationsMenu";

type AttendeeFilter = "all" | "confirmed" | "pending";

const ChurchAdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [dashboardProgramId, setDashboardProgramId] = useState<string>("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AttendeeFilter>("all");

  const [churchId, setChurchId] = useState<string | null>(null);
  const [churchName, setChurchName] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [selectedChurchId, setSelectedChurchId] = useState("");
  const [assigningChurch, setAssigningChurch] = useState(false);

  const [editingAttendee, setEditingAttendee] = useState<any>(null);
  const [editingInviter, setEditingInviter] = useState<any>(null);

  const [isAddingAttendee, setIsAddingAttendee] = useState(false);
  const [newAttendee, setNewAttendee] = useState<any>({ full_name: "", phone: "", email: "", occupation: "", location: "", date_of_birth: "", inviter_id: "none" });

  const [isAddingInviter, setIsAddingInviter] = useState(false);
  const [newInviter, setNewInviter] = useState<any>({ full_name: "", phone: "", email: "" });

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

        let { data: roles, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (roleError) throw roleError;

        // Auto-fix missing role
        if (!roles || roles.length === 0) {
          await supabase.from("user_roles").insert({
            user_id: user.id,
            role: "church_admin",
          });
          roles = [{ role: "church_admin" as any }];
        }

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

  
  const { data: programs = [] } = useQuery({
    queryKey: ["all-programs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("*").order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: attendees = [] } = useQuery({
    queryKey: ["attendees", churchId],
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

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["church-admin-audit-logs", userId],
    enabled: !!userId,
    queryFn: async () => {
      // First get the matching profile ID because audit_logs is keyed to profile ID
      const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", userId).single();
      if (!profile) return [];

      // Fetch only the logs generated by this exact admin
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*, profiles(full_name)")
        .eq("admin_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (church?.name) setChurchName(church.name);
  }, [church]);

  const programAttendees = useMemo(() => {
    if (dashboardProgramId === "all") return attendees;
    return attendees.filter(a => a.program_id === dashboardProgramId);
  }, [attendees, dashboardProgramId]);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayRegs = programAttendees.filter(m => m.created_at.startsWith(todayStr)).length;
  const confirmedCount = programAttendees.filter(m => m.confirmed).length;
  const pendingCount = programAttendees.filter(m => !m.confirmed).length;
  const target = church?.target || 100;
  const progress = Math.round((confirmedCount / target) * 100);

  const inviterLeaderboard = useMemo(() => {
    return inviters
      .map(inv => {
        const myInvites = programAttendees.filter(m => m.inviter_id === inv.id);
        const confirmed = myInvites.filter(m => m.confirmed).length;
        return {
          name: inv.full_name,
          invites: myInvites.length,
          confirmed: confirmed,
        };
      })
      .sort((a, b) => b.confirmed - a.confirmed)
      .slice(0, 5);
  }, [inviters, programAttendees]);

  const filteredAttendees = useMemo(() => {
    return programAttendees.filter((m) => {
      const matchesSearch =
        m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((m.inviters as any)?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesProgram = programFilter === "all" || m.program_id === programFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "confirmed" && m.confirmed) ||
        (statusFilter === "pending" && !m.confirmed);

      return matchesSearch && matchesStatus && matchesProgram;
    });
  }, [programAttendees, searchTerm, statusFilter]);

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

  const handleConfirm = async (attendeeId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("members").update({ confirmed: !currentStatus }).eq("id", attendeeId);
    if (error) {
      toast.error("Failed to update.");
      return;
    }

    toast.success(!currentStatus ? "Attendee confirmed!" : "Confirmation removed.");
    queryClient.invalidateQueries({ queryKey: ["attendees", churchId] });
  };

  const handleConfirmAllPending = async () => {
    if (!churchId || pendingCount === 0) return;

    const { error } = await supabase
      .from("members")
      .update({ confirmed: true })
      .eq("church_id", churchId)
      .eq("confirmed", false);

    if (error) {
      toast.error("Failed to confirm all pending attendees.");
      return;
    }

    toast.success("All pending attendees have been confirmed.");
    queryClient.invalidateQueries({ queryKey: ["attendees", churchId] });
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

  const handleDeleteAttendee = async (attendeeId: string) => {
    const shouldDelete = window.confirm("Delete this attendee? This cannot be undone.");
    if (!shouldDelete) return;

    const { error } = await supabase.from("members").delete().eq("id", attendeeId);

    if (error) {
      toast.error(error.message || "Failed to delete attendee.");
      return;
    }

    toast.success("Attendee deleted.");
    queryClient.invalidateQueries({ queryKey: ["attendees", churchId] });
    // Also invalidate inviters in case the count changed
    queryClient.invalidateQueries({ queryKey: ["inviters", churchId] });
  };

  const handleSaveAttendee = async () => {
    if (!editingAttendee) return;

    const { error } = await supabase.from("members").update({
      full_name: editingAttendee.full_name,
      phone: editingAttendee.phone,
      email: editingAttendee.email,
      occupation: editingAttendee.occupation,
      location: editingAttendee.location,
      date_of_birth: editingAttendee.date_of_birth || null,
      inviter_id: editingAttendee.inviter_id === "none" ? null : editingAttendee.inviter_id,
    }).eq("id", editingAttendee.id);

    if (error) {
      toast.error("Failed to save.");
      return;
    }

    toast.success("Attendee updated!");
    setEditingAttendee(null);
    queryClient.invalidateQueries({ queryKey: ["attendees", churchId] });
  };

  const handleCreateAttendee = async () => {
    if (!churchId || !newAttendee.full_name || !newAttendee.phone) {
      toast.error("Name and Phone are required.");
      return;
    }

    const { error } = await supabase.from("members").insert({
      church_id: churchId,
      full_name: newAttendee.full_name,
      phone: newAttendee.phone,
      email: newAttendee.email || null,
      occupation: newAttendee.occupation || null,
      location: newAttendee.location || null,
      date_of_birth: newAttendee.date_of_birth || null,
      inviter_id: newAttendee.inviter_id === "none" ? null : newAttendee.inviter_id,
      program_id: dashboardProgramId === "all" ? (programs.find((p:any) => p.is_active)?.id || null) : dashboardProgramId,
      confirmed: true, // Auto-confirm if added by admin
    });

    if (error) {
      toast.error("Failed to create attendee.");
      return;
    }

    toast.success("Attendee added!");
    setIsAddingAttendee(false);
    setNewAttendee({ full_name: "", phone: "", email: "", occupation: "", location: "", date_of_birth: "", inviter_id: "none" });
    queryClient.invalidateQueries({ queryKey: ["attendees", churchId] });
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

  const handleCreateInviter = async () => {
    if (!churchId || !newInviter.full_name || !newInviter.phone || !newInviter.email) {
      toast.error("Name, Email, and Phone are required.");
      return;
    }

    const { error } = await supabase.from("inviters").insert({
      church_id: churchId,
      full_name: newInviter.full_name,
      phone: newInviter.phone,
      email: newInviter.email,
    });

    if (error) {
      toast.error("Failed to create inviter.");
      return;
    }

    toast.success("Inviter added!");
    setIsAddingInviter(false);
    setNewInviter({ full_name: "", phone: "", email: "" });
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
    { id: "attendees", label: "Manage Attendees", icon: Users },
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
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-body text-sm transition-colors ${activeTab === item.id
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
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <h1 className="font-display font-bold text-lg capitalize">{activeTab.replace("-", " ")}</h1>
          </div>
                    <div className="flex items-center gap-4">
            {programs.length > 0 && (
              <Select value={dashboardProgramId} onValueChange={setDashboardProgramId}>
                <SelectTrigger className="w-[180px] bg-card border-gold/30">
                  <SelectValue placeholder="Select Program Database" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Global DB (All Programs)</SelectItem>
                  {programs.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <NotificationsMenu logs={auditLogs} isLoading={!auditLogs.length && authLoading} />
          </div>
        </header>

        <div className="p-4 md:p-6 max-w-6xl">
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fade-up">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Attendees", value: programAttendees.length, icon: Users, color: "text-gold" },
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
                      <p className="text-sm text-muted-foreground mt-1">confirmed attendees</p>
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

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-gold" /> Top Inviters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {inviterLeaderboard.map((inv, idx) => (
                      <div key={inv.name} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm ${idx === 0 ? "bg-gradient-gold text-accent-foreground" :
                          idx === 1 ? "bg-gold/20 text-gold" :
                            idx === 2 ? "bg-gold/10 text-gold-dark" : "bg-muted text-muted-foreground"
                          }`}>{idx + 1}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{inv.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{inv.invites} invites</p>
                          <p className="text-xs text-success">{inv.confirmed} confirmed</p>
                        </div>
                      </div>
                    ))}
                    {inviterLeaderboard.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No inviters active yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "inviters" && (
            <div className="animate-fade-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg">Inviters ({inviters.length})</h2>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => setIsAddingInviter(true)} className="gap-2 bg-gradient-gold text-accent-foreground hover:opacity-90">
                    Add Inviter
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportCSV(inviters as any, "inviters")} className="gap-2">
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

          {activeTab === "attendees" && (
            <div className="space-y-4 animate-fade-up">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Input
                  placeholder="Search attendees or inviters..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={() => setIsAddingAttendee(true)} className="gap-2 bg-gradient-gold text-accent-foreground hover:opacity-90">
                    Add Attendee
                  </Button>
                  <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")}>All</Button>
                  <Button variant={statusFilter === "confirmed" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("confirmed")}>Confirmed</Button>
                  <Button variant={statusFilter === "pending" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("pending")}>Pending</Button>
                  <Button size="sm" variant="outline" onClick={handleConfirmAllPending} disabled={pendingCount === 0}>Confirm All Pending</Button>
                  <Button variant="outline" size="sm" onClick={() => exportCSV(filteredAttendees as any, "attendees")} className="gap-2 shrink-0">
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
                      {filteredAttendees.map(m => (
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
                            <Button size="sm" variant="ghost" onClick={() => setEditingAttendee({ ...m, inviter_id: m.inviter_id || "none" })}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteAttendee(m.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
                { label: "Export Attendees", desc: "Download all attendee data", onClick: () => exportCSV(programAttendees as any, "attendees") },
                { label: "Export Pending", desc: "Only attendees awaiting confirmation", onClick: () => exportCSV(programAttendees.filter(m => !m.confirmed) as any, "pending-attendees") },
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

      <Dialog open={!!editingAttendee} onOpenChange={open => !open && setEditingAttendee(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Edit Attendee</DialogTitle></DialogHeader>
          {editingAttendee && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Full Name</Label><Input value={editingAttendee.full_name} onChange={e => setEditingAttendee((p: any) => ({ ...p, full_name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={editingAttendee.phone} onChange={e => setEditingAttendee((p: any) => ({ ...p, phone: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={editingAttendee.email || ""} onChange={e => setEditingAttendee((p: any) => ({ ...p, email: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Occupation</Label><Input value={editingAttendee.occupation || ""} onChange={e => setEditingAttendee((p: any) => ({ ...p, occupation: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Location</Label><Input value={editingAttendee.location || ""} onChange={e => setEditingAttendee((p: any) => ({ ...p, location: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={editingAttendee.date_of_birth || ""} onChange={e => setEditingAttendee((p: any) => ({ ...p, date_of_birth: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Invited By</Label>
                <Select value={editingAttendee.inviter_id} onValueChange={(val) => setEditingAttendee((p: any) => ({ ...p, inviter_id: val }))}>
                  <SelectTrigger><SelectValue placeholder="Select inviter" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Inviter</SelectItem>
                    {inviters.map(inv => (
                      <SelectItem key={inv.id} value={inv.id}>{inv.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAttendee(null)}>Cancel</Button>
            <Button onClick={handleSaveAttendee} className="bg-gradient-gold text-accent-foreground hover:opacity-90">Save</Button>
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

      <Dialog open={isAddingAttendee} onOpenChange={setIsAddingAttendee}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Add New Attendee</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Full Name *</Label><Input value={newAttendee.full_name} onChange={e => setNewAttendee((p: any) => ({ ...p, full_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Phone *</Label><Input value={newAttendee.phone} onChange={e => setNewAttendee((p: any) => ({ ...p, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={newAttendee.email} onChange={e => setNewAttendee((p: any) => ({ ...p, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Occupation</Label><Input value={newAttendee.occupation} onChange={e => setNewAttendee((p: any) => ({ ...p, occupation: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Location</Label><Input value={newAttendee.location} onChange={e => setNewAttendee((p: any) => ({ ...p, location: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={newAttendee.date_of_birth} onChange={e => setNewAttendee((p: any) => ({ ...p, date_of_birth: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Invited By</Label>
              <Select value={newAttendee.inviter_id} onValueChange={(val) => setNewAttendee((p: any) => ({ ...p, inviter_id: val }))}>
                <SelectTrigger><SelectValue placeholder="Select inviter" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Inviter</SelectItem>
                  {inviters.map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>{inv.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingAttendee(false)}>Cancel</Button>
            <Button onClick={handleCreateAttendee} className="bg-gradient-gold text-accent-foreground hover:opacity-90">Add Attendee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddingInviter} onOpenChange={setIsAddingInviter}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Add New Inviter</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Full Name *</Label><Input value={newInviter.full_name} onChange={e => setNewInviter((p: any) => ({ ...p, full_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Phone *</Label><Input value={newInviter.phone} onChange={e => setNewInviter((p: any) => ({ ...p, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email *</Label><Input value={newInviter.email} onChange={e => setNewInviter((p: any) => ({ ...p, email: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingInviter(false)}>Cancel</Button>
            <Button onClick={handleCreateInviter} className="bg-gradient-gold text-accent-foreground hover:opacity-90">Add Inviter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChurchAdminDashboard;
