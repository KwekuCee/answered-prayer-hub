import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, UserCheck, Download, LogOut, Menu, X,
  CheckCircle2, Clock, Target, Pencil, Trash2, Search, PlusCircle,
  ChevronLeft, ChevronRight, Sparkles, Building2, Trophy, ArrowUpRight
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
  const [inviterSearchTerm, setInviterSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AttendeeFilter>("all");

  // Pagination states
  const [attendeePage, setAttendeePage] = useState(1);
  const attendeesPerPage = 10;

  const [inviterPage, setInviterPage] = useState(1);
  const invitersPerPage = 10;

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
      try {
        const { data } = await supabase.from("churches").select("id, name").order("name");
        return data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["all-programs"],
    queryFn: async () => {
      try {
        const { data } = await supabase.from("programs").select("*").order("start_date", { ascending: false });
        return data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: attendees = [] } = useQuery({
    queryKey: ["attendees", churchId],
    queryFn: async () => {
      if (!churchId) return [];
      try {
        const { data } = await supabase
          .from("members")
          .select("*, inviters(full_name)")
          .eq("church_id", churchId)
          .order("created_at", { ascending: false });
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: !!churchId,
  });

  const { data: inviters = [] } = useQuery({
    queryKey: ["inviters", churchId],
    queryFn: async () => {
      if (!churchId) return [];
      try {
        const { data } = await supabase
          .from("inviters")
          .select("*")
          .eq("church_id", churchId)
          .order("full_name");
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: !!churchId,
  });

  const { data: church } = useQuery({
    queryKey: ["church", churchId],
    queryFn: async () => {
      if (!churchId) return null;
      try {
        const { data } = await supabase.from("churches").select("*").eq("id", churchId).maybeSingle();
        return data || null;
      } catch {
        return null;
      }
    },
    enabled: !!churchId,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["church-admin-audit-logs", userId],
    enabled: !!userId,
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("audit_logs")
          .select("*, profiles(*)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);
        return data || [];
      } catch {
        return [];
      }
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
        ((m.inviters as any)?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.phone || "").includes(searchTerm);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "confirmed" && m.confirmed) ||
        (statusFilter === "pending" && !m.confirmed);

      return matchesSearch && matchesStatus;
    });
  }, [programAttendees, searchTerm, statusFilter]);

  // Paginated Attendees
  const paginatedAttendees = useMemo(() => {
    const start = (attendeePage - 1) * attendeesPerPage;
    return filteredAttendees.slice(start, start + attendeesPerPage);
  }, [filteredAttendees, attendeePage]);

  const attendeeTotalPages = Math.ceil(filteredAttendees.length / attendeesPerPage);

  // Paginated Inviters
  const filteredInviters = useMemo(() => {
    return inviters.filter((inv) =>
      inv.full_name.toLowerCase().includes(inviterSearchTerm.toLowerCase()) ||
      (inv.email || "").toLowerCase().includes(inviterSearchTerm.toLowerCase()) ||
      (inv.phone || "").includes(inviterSearchTerm)
    );
  }, [inviters, inviterSearchTerm]);

  const paginatedInviters = useMemo(() => {
    const start = (inviterPage - 1) * invitersPerPage;
    return filteredInviters.slice(start, start + invitersPerPage);
  }, [filteredInviters, inviterPage]);

  const inviterTotalPages = Math.ceil(filteredInviters.length / invitersPerPage);

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
      toast.error("Failed to update status.");
      return;
    }

    toast.success(!currentStatus ? "Attendee confirmed!" : "Confirmation status updated.");
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
    const shouldDelete = window.confirm("Delete this inviter? This action cannot be undone.");
    if (!shouldDelete) return;

    const { error } = await supabase.from("inviters").delete().eq("id", inviterId);

    if (error) {
      toast.error(error.message || "Failed to delete inviter.");
      return;
    }

    toast.success("Inviter deleted successfully.");
    queryClient.invalidateQueries({ queryKey: ["inviters", churchId] });
  };

  const handleDeleteAttendee = async (attendeeId: string) => {
    const shouldDelete = window.confirm("Delete this attendee? This action cannot be undone.");
    if (!shouldDelete) return;

    const { error } = await supabase.from("members").delete().eq("id", attendeeId);

    if (error) {
      toast.error(error.message || "Failed to delete attendee.");
      return;
    }

    toast.success("Attendee record removed.");
    queryClient.invalidateQueries({ queryKey: ["attendees", churchId] });
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
      toast.error("Failed to save changes.");
      return;
    }

    toast.success("Attendee details updated!");
    setEditingAttendee(null);
    queryClient.invalidateQueries({ queryKey: ["attendees", churchId] });
  };

  const handleCreateAttendee = async () => {
    if (!churchId || !newAttendee.full_name || !newAttendee.phone) {
      toast.error("Full Name and Phone number are required.");
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
      program_id: dashboardProgramId === "all" ? (programs.find((p: any) => p.is_active)?.id || null) : dashboardProgramId,
      confirmed: true, // Auto-confirm when added manually by admin
    });

    if (error) {
      toast.error("Failed to add attendee.");
      return;
    }

    toast.success("Attendee registered successfully!");
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
      toast.error("Failed to save changes.");
      return;
    }

    toast.success("Inviter details updated!");
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

    toast.success("Inviter registered!");
    setIsAddingInviter(false);
    setNewInviter({ full_name: "", phone: "", email: "" });
    queryClient.invalidateQueries({ queryKey: ["inviters", churchId] });
  };

  const exportCSV = (data: Record<string, any>[], filename: string) => {
    if (!data.length) {
      toast.error("No data available to export.");
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

    toast.success(`${filename}.csv exported successfully!`);
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
      <div className="min-h-screen bg-background flex items-center justify-center px-4 selection:bg-gold/30 selection:text-gold">
        <Card className="w-full max-w-md border-gold/30 bg-card/80 backdrop-blur-xl shadow-2xl rounded-3xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto text-gold animate-spin">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">Loading Dashboard</h2>
          <p className="text-sm text-muted-foreground font-body">Verifying your church administration credentials...</p>
        </Card>
      </div>
    );
  }

  if (!churchId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 selection:bg-gold/30 selection:text-gold">
        <Card className="w-full max-w-lg border-gold/30 bg-card/80 backdrop-blur-xl shadow-2xl rounded-3xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto text-gold mb-2">
              <Building2 className="w-8 h-8" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Finish Admin Setup</h2>
            <p className="text-sm text-muted-foreground font-body leading-relaxed">
              Your church admin account is active, but no church is linked yet. Select your church below to unlock your dashboard.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-zinc-300">Choose Your Church</Label>
            <Select value={selectedChurchId} onValueChange={setSelectedChurchId}>
              <SelectTrigger className="bg-zinc-900 border-border/60 h-11 text-foreground">
                <SelectValue placeholder="Select church from list" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-gold/30 text-foreground">
                {churches.map((churchOption) => (
                  <SelectItem key={churchOption.id} value={churchOption.id}>
                    {churchOption.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleAssignChurch}
              disabled={!selectedChurchId || assigningChurch}
              className="flex-1 bg-gradient-gold text-navy font-bold h-11 rounded-2xl shadow-gold hover:shadow-gold/80"
            >
              {assigningChurch ? "Linking Church..." : "Link Church & Activate"}
            </Button>
            <Button variant="outline" onClick={handleLogout} className="border-border/60 rounded-2xl h-11">
              Logout
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex selection:bg-gold/30 selection:text-gold text-foreground">
      {/* Sidebar Navigation */}
      <aside className={`${sidebarOpen ? "w-64" : "w-0 overflow-hidden"} bg-zinc-950 border-r border-border/50 transition-all duration-300 flex flex-col fixed inset-y-0 left-0 z-40`}>
        <div className="p-6 border-b border-border/50 space-y-3">
          <img src={logo} alt="Korle Bu Stands in Worship" className="w-36 drop-shadow" />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gold/10 border border-gold/30 text-gold text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5 shrink-0 text-gold" />
            <span className="truncate">{churchName || "Church Admin"}</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-body text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-gold text-navy shadow-gold font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-zinc-900/80"
                }`}
              >
                <item.icon className={`h-4 w-4 ${isActive ? "text-navy" : "text-gold"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-body text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors font-semibold"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className={`${sidebarOpen ? "lg:ml-64" : "lg:ml-0"} flex-1 min-h-screen transition-all duration-300 flex flex-col`}>
        {/* Header Bar */}
        <header className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-card/80 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-xl border border-border/50 text-foreground hover:bg-zinc-900">
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div>
              <h1 className="font-display font-bold text-xl capitalize text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold" />
                {activeTab.replace("-", " ")}
              </h1>
              <p className="text-xs text-muted-foreground font-body">Management dashboard for {churchName}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {programs.length > 0 && (
              <Select value={dashboardProgramId} onValueChange={setDashboardProgramId}>
                <SelectTrigger className="w-[200px] bg-zinc-900 border-gold/30 rounded-xl text-xs text-foreground">
                  <SelectValue placeholder="Select Program" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-gold/30 text-foreground">
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

        {/* Tab Content */}
        <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8 flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-fade-up">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: "Total Attendees", value: programAttendees.length, icon: Users, sub: "Registered under church" },
                  { label: "Total Inviters", value: inviters.length, icon: UserCheck, sub: "Active soul winners" },
                  { label: "Today's Registrations", value: todayRegs, icon: Clock, sub: "New entries today" },
                  { label: "Pending Confirmations", value: pendingCount, icon: CheckCircle2, sub: "Awaiting verification" },
                ].map((stat) => (
                  <Card key={stat.label} className="bg-card/80 backdrop-blur-xl border-border/60 hover:border-gold/40 hover:shadow-gold/10 transition-all rounded-3xl p-6 group">
                    <CardContent className="p-0 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-body uppercase font-bold tracking-wider">{stat.label}</span>
                        <div className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
                          <stat.icon className="h-5 w-5" />
                        </div>
                      </div>
                      <p className="text-3xl md:text-4xl font-display font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground font-body">{stat.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Progress & Target Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <Card className="lg:col-span-7 bg-card/80 backdrop-blur-xl border-gold/30 rounded-3xl overflow-hidden shadow-xl">
                  <CardHeader className="bg-gradient-gold p-6">
                    <CardTitle className="font-display text-xl flex items-center gap-2.5 text-navy font-bold">
                      <Target className="h-6 w-6" /> Church Mobilization Target
                    </CardTitle>
                    <CardDescription className="text-navy/80 font-body text-xs">
                      Tracking verified attendance toward our goal of {target} members
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-8 space-y-6">
                    <div className="flex items-end justify-between font-body">
                      <div>
                        <div className="text-4xl md:text-5xl font-display font-bold text-foreground">
                          {confirmedCount} <span className="text-lg text-muted-foreground font-normal">/ {target}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Confirmed Attendees</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-4xl font-display font-bold ${progress >= 100 ? "text-emerald-400" : progress >= 50 ? "text-gold" : "text-amber-400"}`}>
                          {progress}%
                        </div>
                        <p className="text-xs text-muted-foreground font-medium mt-1">
                          {progress >= 100 ? "🎉 Target Surpassed!" : progress >= 50 ? "Over 50% Goal Reached!" : "Mobilization Ongoing"}
                        </p>
                      </div>
                    </div>

                    <Progress value={Math.min(progress, 100)} className="h-4 bg-zinc-900 [&>div]:bg-gradient-gold rounded-full" />

                    <div className="flex justify-between text-xs text-muted-foreground font-body font-semibold border-t border-border/40 pt-4">
                      <span>0 Start</span>
                      <span>{Math.round(target / 2)} Midpoint</span>
                      <span>{target} Target Goal</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Inviters Leaderboard */}
                <Card className="lg:col-span-5 bg-card/80 backdrop-blur-xl border-border/60 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="font-display text-lg flex items-center gap-2 text-foreground">
                      <Trophy className="h-5 w-5 text-gold" /> Top Soul Winners & Inviters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-3 flex-1">
                    {inviterLeaderboard.map((inv, idx) => (
                      <div key={inv.name} className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-zinc-900/80 border border-border/40">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-display font-bold text-xs ${
                          idx === 0 ? "bg-gradient-gold text-navy shadow-gold" :
                          idx === 1 ? "bg-gold/20 text-gold border border-gold/30" :
                          "bg-zinc-800 text-muted-foreground"
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate text-foreground">{inv.name}</p>
                          <p className="text-xs text-muted-foreground">{inv.invites} total invites</p>
                        </div>
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs">
                          {inv.confirmed} confirmed
                        </Badge>
                      </div>
                    ))}

                    {inviterLeaderboard.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm font-body">
                        No active inviter stats yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: INVITERS */}
          {activeTab === "inviters" && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search inviters..."
                    value={inviterSearchTerm}
                    onChange={(e) => { setInviterSearchTerm(e.target.value); setInviterPage(1); }}
                    className="pl-10 bg-zinc-900 border-border/60 rounded-2xl h-11 text-sm"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={() => setIsAddingInviter(true)} className="bg-gradient-gold text-navy font-bold rounded-2xl gap-2 shadow-gold hover:shadow-gold/80 h-11 px-5">
                    <PlusCircle className="h-4 w-4" /> Add Inviter
                  </Button>
                  <Button variant="outline" onClick={() => exportCSV(inviters as any, "inviters")} className="border-border/60 rounded-2xl gap-2 h-11">
                    <Download className="h-4 w-4" /> Export CSV
                  </Button>
                </div>
              </div>

              <Card className="bg-card/80 backdrop-blur-xl border-border/60 rounded-3xl shadow-2xl overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-zinc-900/90 border-b border-border/60">
                      <TableRow>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Full Name</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Email</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Phone</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Invites</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Confirmed</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedInviters.map((inv) => (
                        <TableRow key={inv.id} className="hover:bg-zinc-900/50 border-b border-border/40">
                          <TableCell className="font-semibold text-foreground text-sm">{inv.full_name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{inv.email || "—"}</TableCell>
                          <TableCell className="text-sm text-foreground">{inv.phone || "—"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="border-gold/40 text-gold bg-gold/5">
                              {inv.invite_count || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                              {inv.confirmed_count || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setEditingInviter({ ...inv })} className="hover:text-gold rounded-lg">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteInviter(inv.id)} className="hover:text-red-400 rounded-lg">
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}

                      {filteredInviters.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                            No inviter records found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>

                {/* Inviter Pagination Controls */}
                {inviterTotalPages > 1 && (
                  <div className="p-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Showing Page <strong>{inviterPage}</strong> of <strong>{inviterTotalPages}</strong> ({filteredInviters.length} total)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={inviterPage === 1}
                        onClick={() => setInviterPage(p => Math.max(1, p - 1))}
                        className="rounded-xl border-border/60"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={inviterPage >= inviterTotalPages}
                        onClick={() => setInviterPage(p => Math.min(inviterTotalPages, p + 1))}
                        className="rounded-xl border-border/60"
                      >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 3: ATTENDEES */}
          {activeTab === "attendees" && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search attendee name or inviter..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setAttendeePage(1); }}
                    className="pl-10 bg-zinc-900 border-border/60 rounded-2xl h-11 text-sm"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => setIsAddingAttendee(true)} className="bg-gradient-gold text-navy font-bold rounded-2xl gap-2 shadow-gold hover:shadow-gold/80 h-11 px-4 text-xs">
                    <PlusCircle className="h-4 w-4" /> Add Attendee
                  </Button>
                  <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => { setStatusFilter("all"); setAttendeePage(1); }} className="rounded-xl text-xs">All</Button>
                  <Button variant={statusFilter === "confirmed" ? "default" : "outline"} size="sm" onClick={() => { setStatusFilter("confirmed"); setAttendeePage(1); }} className="rounded-xl text-xs">Confirmed</Button>
                  <Button variant={statusFilter === "pending" ? "default" : "outline"} size="sm" onClick={() => { setStatusFilter("pending"); setAttendeePage(1); }} className="rounded-xl text-xs">Pending</Button>
                  <Button size="sm" variant="outline" onClick={handleConfirmAllPending} disabled={pendingCount === 0} className="rounded-xl text-xs">Confirm All Pending</Button>
                  <Button variant="outline" size="sm" onClick={() => exportCSV(filteredAttendees as any, "attendees")} className="rounded-xl gap-1.5 text-xs">
                    <Download className="h-4 w-4" /> CSV
                  </Button>
                </div>
              </div>

              <Card className="bg-card/80 backdrop-blur-xl border-border/60 rounded-3xl shadow-2xl overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-zinc-900/90 border-b border-border/60">
                      <TableRow>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Attendee Name</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Phone</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Invited By</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Status</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAttendees.map((m) => (
                        <TableRow key={m.id} className="hover:bg-zinc-900/50 border-b border-border/40">
                          <TableCell className="font-semibold text-foreground text-sm">{m.full_name}</TableCell>
                          <TableCell className="text-sm text-foreground font-mono">{m.phone || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{(m.inviters as any)?.full_name || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{m.created_at.split("T")[0]}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={m.confirmed ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-amber-500/40 text-amber-400 bg-amber-500/10"}>
                              {m.confirmed ? "Confirmed" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button size="sm" variant="ghost" onClick={() => setEditingAttendee({ ...m, inviter_id: m.inviter_id || "none" })} className="hover:text-gold rounded-lg">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteAttendee(m.id)} className="hover:text-red-400 rounded-lg">
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </Button>
                              <Button
                                size="sm"
                                variant={m.confirmed ? "outline" : "default"}
                                onClick={() => handleConfirm(m.id, m.confirmed)}
                                className={!m.confirmed ? "bg-gradient-gold text-navy font-bold rounded-xl text-xs px-3" : "rounded-xl text-xs"}
                              >
                                {m.confirmed ? "Undo" : "Confirm"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}

                      {filteredAttendees.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                            No attendee records match your query.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>

                {/* Attendee Pagination Controls */}
                {attendeeTotalPages > 1 && (
                  <div className="p-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Page <strong>{attendeePage}</strong> of <strong>{attendeeTotalPages}</strong> ({filteredAttendees.length} records)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={attendeePage === 1}
                        onClick={() => setAttendeePage(p => Math.max(1, p - 1))}
                        className="rounded-xl border-border/60"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={attendeePage >= attendeeTotalPages}
                        onClick={() => setAttendeePage(p => Math.min(attendeeTotalPages, p + 1))}
                        className="rounded-xl border-border/60"
                      >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 4: EXPORT */}
          {activeTab === "export" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-up">
              {[
                { label: "Export All Attendees", desc: "Download full database of registered attendees for your church", onClick: () => exportCSV(programAttendees as any, "attendees") },
                { label: "Export Pending Only", desc: "Download records awaiting verification and follow-up", onClick: () => exportCSV(programAttendees.filter(m => !m.confirmed) as any, "pending-attendees") },
                { label: "Export Inviter Roster", desc: "Download all inviter profiles and mobilization stats", onClick: () => exportCSV(inviters as any, "inviters") },
              ].map((item) => (
                <Card
                  key={item.label}
                  className="bg-card/80 backdrop-blur-xl border border-border/60 hover:border-gold/40 hover:shadow-gold/15 transition-all duration-300 rounded-3xl p-8 cursor-pointer text-center space-y-4 group"
                  onClick={item.onClick}
                >
                  <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mx-auto group-hover:scale-110 transition-transform">
                    <Download className="h-7 w-7" />
                  </div>
                  <h3 className="font-display font-bold text-xl text-foreground group-hover:text-gold transition-colors">{item.label}</h3>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">{item.desc}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* DIALOG 1: Edit Attendee */}
      <Dialog open={!!editingAttendee} onOpenChange={open => !open && setEditingAttendee(null)}>
        <DialogContent className="bg-zinc-950 border-gold/40 text-foreground rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">Edit Attendee Details</DialogTitle>
          </DialogHeader>
          {editingAttendee && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5"><Label className="text-xs">Full Name</Label><Input value={editingAttendee.full_name} onChange={e => setEditingAttendee((p: any) => ({ ...p, full_name: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={editingAttendee.phone} onChange={e => setEditingAttendee((p: any) => ({ ...p, phone: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={editingAttendee.email || ""} onChange={e => setEditingAttendee((p: any) => ({ ...p, email: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Occupation</Label><Input value={editingAttendee.occupation || ""} onChange={e => setEditingAttendee((p: any) => ({ ...p, occupation: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Location</Label><Input value={editingAttendee.location || ""} onChange={e => setEditingAttendee((p: any) => ({ ...p, location: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Date of Birth</Label><Input type="date" value={editingAttendee.date_of_birth || ""} onChange={e => setEditingAttendee((p: any) => ({ ...p, date_of_birth: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
              <div className="space-y-1.5">
                <Label className="text-xs">Invited By</Label>
                <Select value={editingAttendee.inviter_id} onValueChange={(val) => setEditingAttendee((p: any) => ({ ...p, inviter_id: val }))}>
                  <SelectTrigger className="bg-zinc-900 border-border/60"><SelectValue placeholder="Select inviter" /></SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-gold/30">
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
            <Button variant="outline" onClick={() => setEditingAttendee(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSaveAttendee} className="bg-gradient-gold text-navy font-bold rounded-xl shadow-gold">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Edit Inviter */}
      <Dialog open={!!editingInviter} onOpenChange={open => !open && setEditingInviter(null)}>
        <DialogContent className="bg-zinc-950 border-gold/40 text-foreground rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">Edit Inviter Details</DialogTitle>
          </DialogHeader>
          {editingInviter && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5"><Label className="text-xs">Full Name</Label><Input value={editingInviter.full_name} onChange={e => setEditingInviter((p: any) => ({ ...p, full_name: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={editingInviter.phone} onChange={e => setEditingInviter((p: any) => ({ ...p, phone: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={editingInviter.email} onChange={e => setEditingInviter((p: any) => ({ ...p, email: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingInviter(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSaveInviter} className="bg-gradient-gold text-navy font-bold rounded-xl shadow-gold">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Add Attendee */}
      <Dialog open={isAddingAttendee} onOpenChange={setIsAddingAttendee}>
        <DialogContent className="bg-zinc-950 border-gold/40 text-foreground rounded-3xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">Add New Attendee</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Register an attendee directly under your church profile</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Full Name *</Label><Input value={newAttendee.full_name} onChange={e => setNewAttendee((p: any) => ({ ...p, full_name: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Phone *</Label><Input value={newAttendee.phone} onChange={e => setNewAttendee((p: any) => ({ ...p, phone: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={newAttendee.email} onChange={e => setNewAttendee((p: any) => ({ ...p, email: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Occupation</Label><Input value={newAttendee.occupation} onChange={e => setNewAttendee((p: any) => ({ ...p, occupation: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Location</Label><Input value={newAttendee.location} onChange={e => setNewAttendee((p: any) => ({ ...p, location: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Date of Birth</Label><Input type="date" value={newAttendee.date_of_birth} onChange={e => setNewAttendee((p: any) => ({ ...p, date_of_birth: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Invited By</Label>
              <Select value={newAttendee.inviter_id} onValueChange={(val) => setNewAttendee((p: any) => ({ ...p, inviter_id: val }))}>
                <SelectTrigger className="bg-zinc-900 border-border/60"><SelectValue placeholder="Select inviter" /></SelectTrigger>
                <SelectContent className="bg-zinc-950 border-gold/30">
                  <SelectItem value="none">No Inviter</SelectItem>
                  {inviters.map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>{inv.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingAttendee(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreateAttendee} className="bg-gradient-gold text-navy font-bold rounded-xl shadow-gold">Add Attendee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: Add Inviter */}
      <Dialog open={isAddingInviter} onOpenChange={setIsAddingInviter}>
        <DialogContent className="bg-zinc-950 border-gold/40 text-foreground rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">Add New Inviter</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Register an inviter to track their member invitations</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Full Name *</Label><Input value={newInviter.full_name} onChange={e => setNewInviter((p: any) => ({ ...p, full_name: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Phone *</Label><Input value={newInviter.phone} onChange={e => setNewInviter((p: any) => ({ ...p, phone: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Email *</Label><Input value={newInviter.email} onChange={e => setNewInviter((p: any) => ({ ...p, email: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingInviter(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreateInviter} className="bg-gradient-gold text-navy font-bold rounded-xl shadow-gold">Add Inviter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChurchAdminDashboard;
