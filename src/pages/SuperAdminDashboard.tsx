import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  LayoutDashboard, Church, Shield, UserCheck, Users, Trophy, Download,
  LogOut, Menu, X, TrendingUp, Target, Medal, Pencil, Trash2, Activity, MapPin, MessageCircle, Eye, Mail, Bus, Calendar, Heart, PlusCircle, Search, ChevronLeft, ChevronRight, Sparkles, Video, CheckCircle2, ShieldAlert, FileText, Check
  History, Clock,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie, Legend } from "recharts";
import logo from "@/assets/logo.png";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NotificationsMenu } from "@/components/NotificationsMenu";

type AttendeeFilter = "all" | "confirmed" | "pending";

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
  const [dashboardProgramId, setDashboardProgramId] = useState<string>("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  const [churchSearch, setChurchSearch] = useState("");
  const [inviterSearch, setInviterSearch] = useState("");
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [attendeeFilter, setAttendeeFilter] = useState<AttendeeFilter>("all");
  const [attendeeChurchFilter, setAttendeeChurchFilter] = useState("all");
  const [inviterChurchFilter, setInviterChurchFilter] = useState("all");

  // Pagination states
  const [attendeePage, setAttendeePage] = useState(1);
  const itemsPerPage = 12;

  const [churchPage, setChurchPage] = useState(1);
  const churchItemsPerPage = 10;

  const [inviterPage, setInviterPage] = useState(1);
  const inviterItemsPerPage = 10;

  const [prayerPointPage, setPrayerPointPage] = useState(1);
  const prayerPointsPerPage = 10;

  const [testimonialPage, setTestimonialPage] = useState(1);
  const testimonialsPerPage = 10;

  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set());

  const [editingChurch, setEditingChurch] = useState<any>(null);
  const [editingAttendee, setEditingAttendee] = useState<any>(null);
  const [editingInviter, setEditingInviter] = useState<any>(null);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [editingTestimonial, setEditingTestimonial] = useState<any>(null);
  const [editingResource, setEditingResource] = useState<any>(null);
  const [viewingAttendee, setViewingAttendee] = useState<any>(null);

  const [isAddingTestimonial, setIsAddingTestimonial] = useState(false);
  const [newTestimonial, setNewTestimonial] = useState({ author_name: "", church_name: "", content: "", is_approved: true });

  const [isAddingChurch, setIsAddingChurch] = useState(false);
  const [newChurch, setNewChurch] = useState({ name: "", target: 100 });

  const [isAddingAttendee, setIsAddingAttendee] = useState(false);
  const [newAttendee, setNewAttendee] = useState<any>({ church_id: "", full_name: "", phone: "", email: "", occupation: "", location: "", date_of_birth: "", inviter_id: "none" });

  const [isAddingInviter, setIsAddingInviter] = useState(false);
  const [newInviter, setNewInviter] = useState<any>({ church_id: "", full_name: "", phone: "", email: "" });

  const [isAddingResource, setIsAddingResource] = useState(false);
  const [newResource, setNewResource] = useState({ title: "", description: "", category: "general", is_public: true });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceCategoryFilter, setResourceCategoryFilter] = useState("all");

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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
          toast.error("Super Admin access required.");
          navigate("/church-admin");
          return;
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to load super admin dashboard");
        navigate("/admin");
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const { data: attendees = [] } = useQuery({
    queryKey: ["all-attendees"],
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

  const { data: auditLogs = [], isLoading: auditLogsLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const userIds = [...new Set((data || []).map((l: any) => l.user_id).filter(Boolean))];
      let profileMap: Record<string, { full_name: string; email: string }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);
        (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
      }
      return (data || []).map((log: any) => ({
        ...log,
        profiles: profileMap[log.user_id] || null,
      }));
    },
  });

  const [auditPage, setAuditPage] = useState(1);
  const itemsPerAuditPage = 15;
  const paginatedAudit = useMemo(() => {
    return auditLogs.slice((auditPage - 1) * itemsPerAuditPage, auditPage * itemsPerAuditPage);
  }, [auditLogs, auditPage]);
  const auditTotalPages = Math.ceil(auditLogs.length / itemsPerAuditPage);

  const { data: liveParticipants = [] } = useQuery({
    queryKey: ["live-participants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_participants")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: testimonials = [] } = useQuery({
    queryKey: ["live-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: resources = [], error: resourcesError } = useQuery({
    queryKey: ["all-resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("Resources table note:", error);
        return [];
      }
      return data || [];
    },
  });

  useEffect(() => {
    if (resourcesError && (resourcesError as { code?: string }).code !== 'PGRST205' && !resourcesError.message?.includes('schema cache')) {
      console.warn("Resources query note:", resourcesError);
    }
  }, [resourcesError]);

  const { data: programs = [], refetch: refetchPrograms } = useQuery({
    queryKey: ["all-programs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("*").order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [isAddingProgram, setIsAddingProgram] = useState(false);
  const [newProgram, setNewProgram] = useState({ name: "", location_name: "", map_iframe_url: "", start_date: "" });
  const [editingProgram, setEditingProgram] = useState<any>(null);

  const normalizeMapIframeUrl = (value: string) => {
    if (!value) return "";
    let clean = value.trim();
    const srcMatch = clean.match(/src\s*=\s*["']([^"']+)["']/i);
    if (srcMatch) {
      clean = srcMatch[1];
    }
    clean = clean.replace(/^src\s*=\s*/i, "");
    if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
      clean = clean.slice(1, -1);
    }
    return clean;
  };

  const activeProgram = programs.find((p: any) => p.is_active);

  const handleCreateProgram = async () => {
    if (!newProgram.name || !newProgram.location_name) {
      toast.error("Name and location are required.");
      return;
    }
    const isFirst = programs.length === 0;
    const payload = {
      ...newProgram,
      map_iframe_url: normalizeMapIframeUrl(newProgram.map_iframe_url),
      is_active: isFirst,
    };
    const { error } = await supabase.from("programs").insert(payload);
    if (error) { toast.error("Failed."); return; }
    toast.success("Program created!");
    setIsAddingProgram(false);
    setNewProgram({ name: "", location_name: "", map_iframe_url: "", start_date: "" });
    queryClient.invalidateQueries({ queryKey: ["all-programs"] });
  };

  const handleSaveProgram = async () => {
    if (!editingProgram) return;
    const { error } = await supabase.from("programs").update({
      name: editingProgram.name,
      location_name: editingProgram.location_name,
      map_iframe_url: normalizeMapIframeUrl(editingProgram.map_iframe_url),
      start_date: editingProgram.start_date || null
    }).eq("id", editingProgram.id);
    if (error) { toast.error("Failed."); return; }
    toast.success("Program updated!");
    setEditingProgram(null);
    queryClient.invalidateQueries({ queryKey: ["all-programs"] });
  };

  const handleDeleteProgram = async (id: string) => {
    if (!window.confirm("Delete this program? This cascades and deletes ALL attendees, bus routes, and inviters explicitly tied to this program! THIS CANNOT BE UNDONE.")) return;
    const { error } = await supabase.from("programs").delete().eq("id", id);
    if (error) { toast.error("Failed."); return; }
    toast.success("Program deleted.");
    queryClient.invalidateQueries({ queryKey: ["all-programs"] });
  };

  const handleSetProgramActive = async (id: string) => {
    await supabase.from("programs").update({ is_active: false }).neq("id", id);
    const { error } = await supabase.from("programs").update({ is_active: true }).eq("id", id);
    if (error) { toast.error("Failed."); return; }
    toast.success("Active program updated! Website will now display this program.");
    queryClient.invalidateQueries({ queryKey: ["all-programs"] });
  };

  const handleDeactivateAllPrograms = async () => {
    if (!window.confirm("Deactivate all programs? This will disable new data writes until a program is activated.")) return;
    try {
      const { data: rows, error: selErr } = await supabase.from('programs').select('id');
      if (selErr) { toast.error('Failed to fetch programs: ' + (selErr.message || selErr)); return; }
      for (const r of rows || []) {
        const { error: upErr } = await supabase.from('programs').update({ is_active: false }).eq('id', r.id);
        if (upErr) {
          console.debug('Failed to deactivate program', r.id, upErr.message || upErr);
        }
      }
      toast.success('All programs deactivated. Writes are now disabled until a program is activated.');
      queryClient.invalidateQueries({ queryKey: ['all-programs'] });
    } catch (err) {
      toast.error('Failed to deactivate programs: ' + (err as any).message || err);
    }
  };

  const handleMarkProgramCompleted = async (id: string) => {
    if (!window.confirm("Mark this program as completed? This will deactivate it but keep the record.")) return;
    const { error: e1 } = await supabase.from("programs").update({ is_active: false }).eq("id", id);
    if (e1) { toast.error("Failed to deactivate program: " + (e1.message || e1)); return; }

    try {
      const { error: e2 } = await supabase.from("programs").update({ completed_at: new Date().toISOString() }).eq("id", id);
      if (e2) {
        console.debug('completed_at update skipped or failed:', e2.message || e2);
      }
    } catch (err) {
      console.debug('completed_at update threw:', err);
    }

    toast.success("Program marked completed and deactivated.");
    queryClient.invalidateQueries({ queryKey: ["all-programs"] });
  };

  const { data: busPoints = [], refetch: refetchBusPoints } = useQuery({
    queryKey: ["all-bus-points"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bus_points").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const [isAddingBusPoint, setIsAddingBusPoint] = useState(false);
  const [newBusPoint, setNewBusPoint] = useState<{ name: string, location: string, departure_time: string, program_id?: string }>({ name: "", location: "", departure_time: "" });
  const [editingBusPoint, setEditingBusPoint] = useState<any>(null);

  const handleCreateBusPoint = async () => {
    if (!newBusPoint.name || !newBusPoint.location) {
      toast.error("Name and location are required.");
      return;
    }
    const payload = { ...newBusPoint, program_id: newBusPoint.program_id || programs[0]?.id };
    const { error } = await supabase.from("bus_points").insert(payload);
    if (error) { toast.error("Failed."); return; }
    toast.success("Bus Route created!");
    setIsAddingBusPoint(false);
    setNewBusPoint({ name: "", location: "", departure_time: "" });
    queryClient.invalidateQueries({ queryKey: ["all-bus-points"] });
  };

  const handleSaveBusPoint = async () => {
    if (!editingBusPoint) return;
    const { error } = await supabase.from("bus_points").update({
      name: editingBusPoint.name,
      location: editingBusPoint.location,
      departure_time: editingBusPoint.departure_time,
      program_id: editingBusPoint.program_id
    }).eq("id", editingBusPoint.id);
    if (error) { toast.error("Failed."); return; }
    toast.success("Bus Route updated!");
    setEditingBusPoint(null);
    queryClient.invalidateQueries({ queryKey: ["all-bus-points"] });
  };

  const handleDeleteBusPoint = async (id: string) => {
    if (!window.confirm("Delete bus route?")) return;
    const { error } = await supabase.from("bus_points").delete().eq("id", id);
    if (error) { toast.error("Failed."); return; }
    toast.success("Deleted.");
    queryClient.invalidateQueries({ queryKey: ["all-bus-points"] });
  };

  const { data: liveStreamSettings, refetch: refetchLiveStream } = useQuery({
    queryKey: ["live-stream"],
    queryFn: async () => {
      const { data, error } = await supabase.from("live_stream_settings").select("*").order("updated_at", { ascending: false }).limit(1);
      if (error) throw error;
      return data?.[0] || null;
    },
  });

  const { data: presenceSamples = [], refetch: refetchPresenceSamples } = useQuery({
    queryKey: ["live-presence-samples", activeProgram?.id],
    queryFn: async () => {
      if (activeProgram?.id) {
        const { data, error } = await supabase.from("live_presence_samples").select("*").eq("program_id", activeProgram.id).order("recorded_at", { ascending: true }).limit(1000);
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from("live_presence_samples").select("*").order("recorded_at", { ascending: true }).limit(1000);
      if (error) throw error;
      return data;
    },
    enabled: activeTab === "live-analytics",
  });

  const [isEditingStream, setIsEditingStream] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");

  const [liveChats, setLiveChats] = useState<any[]>([]);
  const [liveViewers, setLiveViewers] = useState(0);
  const [totalJoins, setTotalJoins] = useState(0);
  const [totalLeaves, setTotalLeaves] = useState(0);
  const [uniqueViewerIds, setUniqueViewerIds] = useState<Set<string>>(new Set());

  const channelRef = useRef<any>(null);

  useEffect(() => {
    const fetchRecentChats = async () => {
      const { data } = await supabase
        .from("live_chats")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setLiveChats(data.reverse());
    };
    fetchRecentChats();

    const channel = supabase.channel("ksw-live-stream-admin", {
      config: { presence: { key: `admin-${Math.random().toString(36).substring(2, 9)}` } }
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        let count = 0;
        const currentIds = new Set<string>();
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          count += presences.length;
          presences.forEach((p) => {
            if (p.viewerId) currentIds.add(p.viewerId);
          });
        });
        setLiveViewers(count);
        setUniqueViewerIds((prev) => {
          const next = new Set(prev);
          currentIds.forEach((id) => next.add(id));
          return next;
        });
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        setTotalJoins((prev) => prev + newPresences.length);
        newPresences.forEach((p: any) => {
          if (p.viewerId) setUniqueViewerIds((prev) => new Set(prev).add(p.viewerId));
        });
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        setTotalLeaves((prev) => prev + leftPresences.length);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_chats" }, (payload) => {
        setLiveChats((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateStreamUrl = async () => {
    if (!liveStreamSettings?.id) {
      const { error } = await supabase.from("live_stream_settings").insert({ stream_url: streamUrl, is_active: true });
      if (error) { toast.error("Failed."); return; }
    } else {
      const { error } = await supabase.from("live_stream_settings").update({ stream_url: streamUrl, updated_at: new Date().toISOString() }).eq("id", liveStreamSettings.id);
      if (error) { toast.error("Failed."); return; }
    }
    toast.success("Stream URL updated!");
    setIsEditingStream(false);
    refetchLiveStream();
  };

  const handleToggleStreamActive = async () => {
    const nextState = !liveStreamSettings?.is_active;
    if (!liveStreamSettings?.id) {
      const { error } = await supabase.from("live_stream_settings").insert({ stream_url: "", is_active: nextState });
      if (error) { toast.error("Failed."); return; }
    } else {
      const { error } = await supabase.from("live_stream_settings").update({ is_active: nextState, updated_at: new Date().toISOString() }).eq("id", liveStreamSettings.id);
      if (error) { toast.error("Failed."); return; }
    }
    toast.success(nextState ? "Live Stream activated!" : "Live Stream deactivated.");
    refetchLiveStream();
  };

  const handleDeleteChat = async (id: string) => {
    const { error } = await supabase.from("live_chats").delete().eq("id", id);
    if (error) { toast.error("Failed."); return; }
    setLiveChats((prev) => prev.filter((c) => c.id !== id));
    toast.success("Message deleted.");
  };

  const { data: prayerPoints = [], refetch: refetchPrayerPoints } = useQuery({
    queryKey: ["all-prayer-points"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prayer_points").select("*, programs(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleDeletePrayerPoint = async (id: string) => {
    if (!window.confirm("Delete this prayer request?")) return;
    const { error } = await supabase.from("prayer_points").delete().eq("id", id);
    if (error) { toast.error("Failed."); return; }
    toast.success("Deleted.");
    queryClient.invalidateQueries({ queryKey: ["all-prayer-points"] });
  };

  const handleTogglePrayerPointStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "pending" ? "prayed_for" : "pending";
    const { error } = await supabase.from("prayer_points").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error("Failed to update status."); return; }
    toast.success(newStatus === "prayed_for" ? "Marked as Prayed For!" : "Marked as Pending.");
    queryClient.invalidateQueries({ queryKey: ["all-prayer-points"] });
  };

  const programAttendees = useMemo(() => {
    if (dashboardProgramId === "all") return attendees;
    return attendees.filter(a => a.program_id === dashboardProgramId);
  }, [attendees, dashboardProgramId]);

  const filteredAttendees = useMemo(() => {
    return programAttendees.filter((m) => {
      const matchesSearch =
        m.full_name.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        ((m.inviters as any)?.full_name || "").toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        ((m.churches as any)?.name || "").toLowerCase().includes(attendeeSearch.toLowerCase());

      const matchesStatus =
        attendeeFilter === "all" ||
        (attendeeFilter === "confirmed" && m.confirmed) ||
        (attendeeFilter === "pending" && !m.confirmed);

      const matchesChurch =
        attendeeChurchFilter === "all" || m.church_id === attendeeChurchFilter;

      return matchesSearch && matchesStatus && matchesChurch;
    });
  }, [programAttendees, attendeeSearch, attendeeFilter, attendeeChurchFilter]);

  const paginatedAttendees = useMemo(() => {
    const start = (attendeePage - 1) * itemsPerPage;
    return filteredAttendees.slice(start, start + itemsPerPage);
  }, [filteredAttendees, attendeePage]);

  const attendeeTotalPages = Math.ceil(filteredAttendees.length / itemsPerPage);

  const filteredChurches = useMemo(() => {
    return churches.filter((c) =>
      c.name.toLowerCase().includes(churchSearch.toLowerCase())
    );
  }, [churches, churchSearch]);

  const paginatedChurches = useMemo(() => {
    const start = (churchPage - 1) * churchItemsPerPage;
    return filteredChurches.slice(start, start + churchItemsPerPage);
  }, [filteredChurches, churchPage]);

  const churchTotalPages = Math.ceil(filteredChurches.length / churchItemsPerPage);

  const filteredInviters = useMemo(() => {
    return inviters.filter((inv) => {
      const matchesSearch =
        inv.full_name.toLowerCase().includes(inviterSearch.toLowerCase()) ||
        ((inv.churches as any)?.name || "").toLowerCase().includes(inviterSearch.toLowerCase());

      const matchesChurch =
        inviterChurchFilter === "all" || inv.church_id === inviterChurchFilter;

      return matchesSearch && matchesChurch;
    });
  }, [inviters, inviterSearch, inviterChurchFilter]);

  const paginatedInviters = useMemo(() => {
    const start = (inviterPage - 1) * inviterItemsPerPage;
    return filteredInviters.slice(start, start + inviterItemsPerPage);
  }, [filteredInviters, inviterPage]);

  const inviterTotalPages = Math.ceil(filteredInviters.length / inviterItemsPerPage);

  const paginatedPrayerPoints = useMemo(() => {
    const start = (prayerPointPage - 1) * prayerPointsPerPage;
    return prayerPoints.slice(start, start + prayerPointsPerPage);
  }, [prayerPoints, prayerPointPage]);

  const prayerPointTotalPages = Math.ceil(prayerPoints.length / prayerPointsPerPage);

  const paginatedTestimonials = useMemo(() => {
    const start = (testimonialPage - 1) * testimonialsPerPage;
    return testimonials.slice(start, start + testimonialsPerPage);
  }, [testimonials, testimonialPage]);

  const testimonialTotalPages = Math.ceil(testimonials.length / testimonialsPerPage);

  const filteredResources = useMemo(() => {
    return resources.filter((res: any) => {
      const matchesSearch =
        res.title.toLowerCase().includes(resourceSearch.toLowerCase()) ||
        (res.description || "").toLowerCase().includes(resourceSearch.toLowerCase());
      const matchesCategory =
        resourceCategoryFilter === "all" || res.category === resourceCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [resources, resourceSearch, resourceCategoryFilter]);

  const totalAttendeesCount = programAttendees.length;
  const totalConfirmed = programAttendees.filter((m) => m.confirmed).length;
  const totalPending = totalAttendeesCount - totalConfirmed;

  const totalChurchTarget = churches.reduce((sum, c) => sum + (c.target || 0), 0);
  const overallTargetProgress = totalChurchTarget > 0 ? Math.round((totalConfirmed / totalChurchTarget) * 100) : 0;

  const churchLeaderboard = useMemo(() => {
    return churches
      .map((c) => {
        const churchMembers = programAttendees.filter((m) => m.church_id === c.id);
        const confirmed = churchMembers.filter((m) => m.confirmed).length;
        const target = c.target || 100;
        const pct = Math.round((confirmed / target) * 100);
        return {
          id: c.id,
          name: c.name,
          registered: churchMembers.length,
          confirmed,
          target,
          pct,
        };
      })
      .sort((a, b) => b.confirmed - a.confirmed);
  }, [churches, programAttendees]);

  const inviterLeaderboard = useMemo(() => {
    return inviters
      .map((inv) => {
        const invMembers = programAttendees.filter((m) => m.inviter_id === inv.id);
        const confirmed = invMembers.filter((m) => m.confirmed).length;
        return {
          id: inv.id,
          name: inv.full_name,
          churchName: (inv.churches as any)?.name || "—",
          invites: invMembers.length,
          confirmed,
        };
      })
      .sort((a, b) => b.confirmed - a.confirmed)
      .slice(0, 10);
  }, [inviters, programAttendees]);

  const chartData = useMemo(() => {
    return churchLeaderboard.slice(0, 8).map((c) => ({
      name: c.name.length > 15 ? c.name.slice(0, 12) + "..." : c.name,
      Confirmed: c.confirmed,
      Target: c.target,
    }));
  }, [churchLeaderboard]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAttendees(new Set(paginatedAttendees.map((m) => m.id)));
    } else {
      setSelectedAttendees(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const next = new Set(selectedAttendees);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedAttendees(next);
  };

  const handleBulkConfirm = async () => {
    if (!selectedAttendees.size) return;
    const ids = Array.from(selectedAttendees);

    const { error } = await supabase
      .from("members")
      .update({ confirmed: true })
      .in("id", ids);

    if (error) {
      toast.error("Bulk confirm failed.");
      return;
    }

    toast.success(`${ids.length} attendees confirmed!`);
    setSelectedAttendees(new Set());
    queryClient.invalidateQueries({ queryKey: ["all-attendees"] });
  };

  const handleBulkDelete = async () => {
    if (!selectedAttendees.size) return;
    if (!window.confirm(`Delete ${selectedAttendees.size} selected attendees? This cannot be undone.`)) return;

    const ids = Array.from(selectedAttendees);
    const { error } = await supabase.from("members").delete().in("id", ids);

    if (error) {
      toast.error("Bulk delete failed.");
      return;
    }

    toast.success(`${ids.length} attendees deleted!`);
    setSelectedAttendees(new Set());
    queryClient.invalidateQueries({ queryKey: ["all-attendees"] });
  };

  const handleConfirmSingle = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("members")
      .update({ confirmed: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status.");
      return;
    }

    toast.success(!currentStatus ? "Attendee confirmed!" : "Confirmation removed.");
    queryClient.invalidateQueries({ queryKey: ["all-attendees"] });
  };

  const handleSaveChurch = async () => {
    if (!editingChurch) return;
    const { error } = await supabase
      .from("churches")
      .update({ name: editingChurch.name, target: editingChurch.target })
      .eq("id", editingChurch.id);

    if (error) {
      toast.error("Failed to save church.");
      return;
    }

    toast.success("Church updated!");
    setEditingChurch(null);
    queryClient.invalidateQueries({ queryKey: ["all-churches"] });
  };

  const handleCreateChurch = async () => {
    if (!newChurch.name) {
      toast.error("Church name is required.");
      return;
    }

    const { error } = await supabase.from("churches").insert(newChurch);

    if (error) {
      toast.error("Failed to create church.");
      return;
    }

    toast.success("Church created!");
    setIsAddingChurch(false);
    setNewChurch({ name: "", target: 100 });
    queryClient.invalidateQueries({ queryKey: ["all-churches"] });
  };

  const handleDeleteChurch = async (id: string) => {
    if (!window.confirm("Delete this church? WARNING: This cascades and deletes ALL attendees and inviters linked to this church!")) return;

    const { error } = await supabase.from("churches").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete church.");
      return;
    }

    toast.success("Church deleted!");
    queryClient.invalidateQueries({ queryKey: ["all-churches"] });
  };

  const handleSaveAttendee = async () => {
    if (!editingAttendee) return;
    const { error } = await supabase
      .from("members")
      .update({
        full_name: editingAttendee.full_name,
        phone: editingAttendee.phone,
        email: editingAttendee.email,
        occupation: editingAttendee.occupation,
        location: editingAttendee.location,
        date_of_birth: editingAttendee.date_of_birth || null,
        church_id: editingAttendee.church_id,
        inviter_id: editingAttendee.inviter_id === "none" ? null : editingAttendee.inviter_id,
      })
      .eq("id", editingAttendee.id);

    if (error) {
      toast.error("Failed to save attendee.");
      return;
    }

    toast.success("Attendee updated!");
    setEditingAttendee(null);
    queryClient.invalidateQueries({ queryKey: ["all-attendees"] });
  };

  const handleCreateAttendee = async () => {
    if (!newAttendee.full_name || !newAttendee.phone || !newAttendee.church_id) {
      toast.error("Name, Phone, and Church are required.");
      return;
    }

    const { error } = await supabase.from("members").insert({
      ...newAttendee,
      email: newAttendee.email || null,
      occupation: newAttendee.occupation || null,
      location: newAttendee.location || null,
      date_of_birth: newAttendee.date_of_birth || null,
      inviter_id: newAttendee.inviter_id === "none" ? null : newAttendee.inviter_id,
      program_id: dashboardProgramId === "all" ? (programs.find((p: any) => p.is_active)?.id || null) : dashboardProgramId,
      confirmed: true,
    });

    if (error) {
      toast.error("Failed to create attendee.");
      return;
    }

    toast.success("Attendee added!");
    setIsAddingAttendee(false);
    setNewAttendee({ church_id: "", full_name: "", phone: "", email: "", occupation: "", location: "", date_of_birth: "", inviter_id: "none" });
    queryClient.invalidateQueries({ queryKey: ["all-attendees"] });
  };

  const handleDeleteAttendee = async (id: string) => {
    if (!window.confirm("Delete this attendee?")) return;
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete attendee.");
      return;
    }
    toast.success("Attendee deleted!");
    queryClient.invalidateQueries({ queryKey: ["all-attendees"] });
  };

  const handleSaveInviter = async () => {
    if (!editingInviter) return;
    const { error } = await supabase
      .from("inviters")
      .update({
        full_name: editingInviter.full_name,
        phone: editingInviter.phone,
        email: editingInviter.email,
        church_id: editingInviter.church_id,
      })
      .eq("id", editingInviter.id);

    if (error) {
      toast.error("Failed to save inviter.");
      return;
    }

    toast.success("Inviter updated!");
    setEditingInviter(null);
    queryClient.invalidateQueries({ queryKey: ["all-inviters"] });
  };

  const handleCreateInviter = async () => {
    if (!newInviter.full_name || !newInviter.phone || !newInviter.email || !newInviter.church_id) {
      toast.error("Name, Phone, Email, and Church are required.");
      return;
    }

    const { error } = await supabase.from("inviters").insert(newInviter);

    if (error) {
      toast.error("Failed to create inviter.");
      return;
    }

    toast.success("Inviter created!");
    setIsAddingInviter(false);
    setNewInviter({ church_id: "", full_name: "", phone: "", email: "" });
    queryClient.invalidateQueries({ queryKey: ["all-inviters"] });
  };

  const handleDeleteInviter = async (id: string) => {
    if (!window.confirm("Delete this inviter?")) return;
    const { error } = await supabase.from("inviters").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete inviter.");
      return;
    }
    toast.success("Inviter deleted!");
    queryClient.invalidateQueries({ queryKey: ["all-inviters"] });
  };

  const handleSaveAdminRole = async () => {
    if (!editingAdmin) return;
    toast.success("Admin profiles & roles updated.");
    setEditingAdmin(null);
    queryClient.invalidateQueries({ queryKey: ["all-admins"] });
  };

  const handleCreateTestimonial = async () => {
    if (!newTestimonial.content) {
      toast.error("Content is required.");
      return;
    }
    const { error } = await supabase.from("testimonials").insert([{
      author_name: newTestimonial.author_name || "Anonymous",
      church_name: newTestimonial.church_name || null,
      content: newTestimonial.content,
      is_approved: newTestimonial.is_approved,
    }]);

    if (error) {
      toast.error("Failed to add testimonial.");
      return;
    }

    toast.success("Testimonial added!");
    setIsAddingTestimonial(false);
    setNewTestimonial({ author_name: "", church_name: "", content: "", is_approved: true });
    queryClient.invalidateQueries({ queryKey: ["live-testimonials"] });
  };

  const handleToggleTestimonialApproved = async (id: string, current: boolean) => {
    const { error } = await supabase.from("testimonials").update({ is_approved: !current }).eq("id", id);
    if (error) { toast.error("Failed."); return; }
    toast.success(!current ? "Testimonial Approved for public website!" : "Testimonial Hidden.");
    queryClient.invalidateQueries({ queryKey: ["live-testimonials"] });
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!window.confirm("Delete this testimonial?")) return;
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) { toast.error("Failed."); return; }
    toast.success("Deleted.");
    queryClient.invalidateQueries({ queryKey: ["live-testimonials"] });
  };

  const handleCreateResource = async (file: File | null) => {
    if (!newResource.title) {
      toast.error("Title is required.");
      return;
    }

    setUploadingFile(true);
    let file_path = "";
    let file_name = "";
    let file_size = 0;
    let file_type = "pdf";

    if (file) {
      file_name = file.name;
      file_size = file.size;
      file_type = file.name.split('.').pop() || 'pdf';
      file_path = `${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage.from("resources").upload(file_path, file);
      if (uploadError) {
        toast.error("Failed to upload file to storage: " + uploadError.message);
        setUploadingFile(false);
        return;
      }
    }

    const { error } = await supabase.from("resources").insert({
      title: newResource.title,
      description: newResource.description,
      category: newResource.category,
      is_public: newResource.is_public,
      file_path,
      file_name,
      file_size,
      file_type,
    });

    setUploadingFile(false);

    if (error) {
      toast.error("Failed to save resource record.");
      return;
    }

    toast.success("Resource uploaded successfully!");
    setIsAddingResource(false);
    setNewResource({ title: "", description: "", category: "general", is_public: true });
    queryClient.invalidateQueries({ queryKey: ["all-resources"] });
  };

  const handleDeleteResource = async (res: any) => {
    if (!window.confirm("Delete this resource file?")) return;

    if (res.file_path) {
      await supabase.storage.from("resources").remove([res.file_path]);
    }

    const { error } = await supabase.from("resources").delete().eq("id", res.id);
    if (error) { toast.error("Failed to delete resource."); return; }
    toast.success("Resource deleted.");
    queryClient.invalidateQueries({ queryKey: ["all-resources"] });
  };

  const handleSendEmailBroadcast = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Subject and message body are required.");
      return;
    }

    setIsSendingEmail(true);
    let successCount = 0;
    let failCount = 0;

    for (const recipientEmail of emailRecipients) {
      try {
        const { error } = await supabase.functions.invoke("send-general-email", {
          body: {
            to: recipientEmail,
            subject: emailSubject,
            html: emailBody.replace(/\n/g, "<br>"),
          },
        });
        if (error) failCount++;
        else successCount++;
      } catch {
        failCount++;
      }
    }

    setIsSendingEmail(false);
    setIsEmailModalOpen(false);
    toast.success(`Broadcast Sent! ${successCount} delivered successfully, ${failCount} failed.`);
    setEmailSubject("");
    setEmailBody("");
    setEmailRecipients([]);
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
    { id: "overview", label: "Overview Analytics", icon: LayoutDashboard },
    { id: "churches", label: "Manage Churches", icon: Church },
    { id: "inviters", label: "Manage Inviters", icon: UserCheck },
    { id: "attendees", label: "Manage Attendees", icon: Users },
    { id: "programs", label: "Program Seasons", icon: Calendar },
    { id: "bus", label: "Bus Services", icon: Bus },
    { id: "live-stream", label: "Live Broadcast", icon: Video },
    { id: "prayer-points", label: "Private Prayer Points", icon: ShieldAlert },
    { id: "testimonials", label: "Testimonial Reviews", icon: MessageCircle },
    { id: "resources", label: "Digital Library", icon: FileText },
    { id: "admins", label: "System Admins", icon: Shield },
    { id: "audit-logs", label: "Audit Logs", icon: History },
    { id: "export", label: "Data Export Center", icon: Download },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 selection:bg-gold/30 selection:text-gold">
        <Card className="w-full max-w-md border-gold/30 bg-card/80 backdrop-blur-xl shadow-2xl rounded-3xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto text-gold animate-spin">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">Loading Executive Portal</h2>
          <p className="text-sm text-muted-foreground font-body">Verifying Super Admin authorization...</p>
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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-gold text-navy font-bold text-xs shadow-gold">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Super Admin Portal</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-body text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-gold text-navy shadow-gold font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-zinc-900/80"
                }`}
              >
                <item.icon className={`h-4 w-4 ${isActive ? "text-navy" : "text-gold"}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl font-body text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors font-semibold"
          >
            <LogOut className="h-4 w-4" /> Sign Out
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
              <p className="text-xs text-muted-foreground font-body">Executive Management Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {programs.length > 0 && (
              <Select value={dashboardProgramId} onValueChange={setDashboardProgramId}>
                <SelectTrigger className="w-[200px] bg-zinc-900 border-gold/30 rounded-xl text-xs text-foreground">
                  <SelectValue placeholder="Select Program Database" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-gold/30 text-foreground">
                  <SelectItem value="all">Global DB (All Programs)</SelectItem>
                  {programs.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <NotificationsMenu logs={auditLogs} isLoading={auditLogsLoading} />
          </div>
        </header>

        {/* Tab Content Area */}
        <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8 flex-1">

          {/* TAB 1: OVERVIEW ANALYTICS */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-fade-up">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: "Total Registrations", value: totalAttendeesCount, icon: Users, sub: "Across all participating churches" },
                  { label: "Confirmed Attendance", value: totalConfirmed, icon: CheckCircle2, sub: "Verified & confirmed attendees" },
                  { label: "Pending Verification", value: totalPending, icon: Clock, sub: "Awaiting confirmation" },
                  { label: "Participating Churches", value: churches.length, icon: Church, sub: "Active church centers" },
                ].map((stat) => (
                  <Card key={stat.label} className="bg-card/80 backdrop-blur-xl border-border/60 hover:border-gold/40 hover:shadow-gold/15 transition-all rounded-3xl p-6 group">
                    <CardContent className="p-0 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-body uppercase font-bold tracking-wider">{stat.label}</span>
                        <div className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
                          <stat.icon className="h-5 w-5" />
                        </div>
                      </div>
                      <p className="text-3xl md:text-4xl font-display font-bold text-foreground">{stat.value.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground font-body">{stat.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Progress & Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <Card className="lg:col-span-8 bg-card/80 backdrop-blur-xl border-border/60 rounded-3xl p-6 shadow-xl space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-bold text-xl text-foreground">Church Mobilization Comparison</h3>
                      <p className="text-xs text-muted-foreground font-body">Confirmed vs Target numbers by church</p>
                    </div>
                    <Badge variant="outline" className="border-gold/40 text-gold bg-gold/5 text-xs">
                      Top Centers
                    </Badge>
                  </div>

                  <div className="h-[300px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} />
                        <YAxis stroke="#a1a1aa" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: "#09090b", borderColor: "#d4af37", borderRadius: "1rem", color: "#fff" }} />
                        <Bar dataKey="Confirmed" fill="#d4af37" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="Target" fill="#27272a" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Overall Target Card */}
                <Card className="lg:col-span-4 bg-card/80 backdrop-blur-xl border-gold/30 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6">
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                      <Target className="w-6 h-6" />
                    </div>
                    <h3 className="font-display font-bold text-xl text-foreground">Overall Mobilization Target</h3>
                    <p className="text-xs text-muted-foreground font-body">Progress toward total church target</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-end justify-between">
                      <div className="text-4xl font-display font-bold text-foreground">
                        {totalConfirmed} <span className="text-sm font-normal text-muted-foreground">/ {totalChurchTarget}</span>
                      </div>
                      <div className="text-2xl font-bold text-gold">{overallTargetProgress}%</div>
                    </div>
                    <Progress value={Math.min(overallTargetProgress, 100)} className="h-3.5 bg-zinc-900 [&>div]:bg-gradient-gold rounded-full" />
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/90 border border-border/40 text-xs text-muted-foreground space-y-1">
                    <div className="font-semibold text-foreground">Campaign Status</div>
                    <div>{overallTargetProgress >= 100 ? "🎉 Mobilization Goal Achieved!" : "Active Mobilization Campaign in Progress"}</div>
                  </div>
                </Card>
              </div>

              {/* Church Leaderboard Ranking Table */}
              <Card className="bg-card/80 backdrop-blur-xl border-border/60 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-xl text-foreground flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-gold" /> Participating Church Leaderboard
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => exportCSV(churchLeaderboard as any, "church-rankings")} className="rounded-xl border-border/60 text-xs gap-1.5">
                    <Download className="w-4 h-4" /> Export CSV
                  </Button>
                </div>

                <Table>
                  <TableHeader className="bg-zinc-900/90 border-b border-border/60">
                    <TableRow>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Rank</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Church Name</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Registered</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Confirmed</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Target</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Achievement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {churchLeaderboard.map((c, idx) => (
                      <TableRow key={c.id} className="hover:bg-zinc-900/50 border-b border-border/40">
                        <TableCell className="font-bold font-display text-sm">
                          <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs ${
                            idx === 0 ? "bg-gradient-gold text-navy font-bold shadow-gold" :
                            idx === 1 ? "bg-gold/20 text-gold border border-gold/30" : "bg-zinc-800 text-muted-foreground"
                          }`}>
                            {idx + 1}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground text-sm">{c.name}</TableCell>
                        <TableCell className="text-center font-mono text-sm">{c.registered}</TableCell>
                        <TableCell className="text-center font-mono text-sm font-bold text-gold">{c.confirmed}</TableCell>
                        <TableCell className="text-center font-mono text-sm text-muted-foreground">{c.target}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={c.pct >= 100 ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-gold/40 text-gold bg-gold/10"}>
                            {c.pct}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* TAB 2: CHURCHES */}
          {activeTab === "churches" && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search churches..."
                    value={churchSearch}
                    onChange={(e) => { setChurchSearch(e.target.value); setChurchPage(1); }}
                    className="pl-10 bg-zinc-900 border-border/60 rounded-2xl h-11 text-sm"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={() => setIsAddingChurch(true)} className="bg-gradient-gold text-navy font-bold rounded-2xl gap-2 shadow-gold hover:shadow-gold/80 h-11 px-5">
                    <PlusCircle className="h-4 w-4" /> Add Church Center
                  </Button>
                  <Button variant="outline" onClick={() => exportCSV(churches as any, "churches")} className="border-border/60 rounded-2xl gap-2 h-11">
                    <Download className="h-4 w-4" /> Export CSV
                  </Button>
                </div>
              </div>

              <Card className="bg-card/80 backdrop-blur-xl border-border/60 rounded-3xl shadow-2xl overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-zinc-900/90 border-b border-border/60">
                      <TableRow>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Church Center Name</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Target Goal</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedChurches.map((c) => (
                        <TableRow key={c.id} className="hover:bg-zinc-900/50 border-b border-border/40">
                          <TableCell className="font-semibold text-foreground text-sm">{c.name}</TableCell>
                          <TableCell className="text-center font-mono font-bold text-gold text-sm">{c.target || 100}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button size="sm" variant="ghost" onClick={() => setEditingChurch({ ...c })} className="hover:text-gold rounded-lg">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteChurch(c.id)} className="hover:text-red-400 rounded-lg">
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}

                      {filteredChurches.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                            No church centers found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>

                {churchTotalPages > 1 && (
                  <div className="p-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Page <strong>{churchPage}</strong> of <strong>{churchTotalPages}</strong> ({filteredChurches.length} churches)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={churchPage === 1} onClick={() => setChurchPage(p => Math.max(1, p - 1))} className="rounded-xl border-border/60">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled={churchPage >= churchTotalPages} onClick={() => setChurchPage(p => Math.min(churchTotalPages, p + 1))} className="rounded-xl border-border/60">
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 3: INVITERS */}
          {activeTab === "inviters" && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search inviter name or church..."
                      value={inviterSearch}
                      onChange={(e) => { setInviterSearch(e.target.value); setInviterPage(1); }}
                      className="pl-10 bg-zinc-900 border-border/60 rounded-2xl h-11 text-sm"
                    />
                  </div>
                  <Select value={inviterChurchFilter} onValueChange={(v) => { setInviterChurchFilter(v); setInviterPage(1); }}>
                    <SelectTrigger className="w-[180px] bg-zinc-900 border-border/60 rounded-2xl h-11 text-xs">
                      <SelectValue placeholder="All Churches" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-gold/30">
                      <SelectItem value="all">All Churches</SelectItem>
                      {churches.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={() => setIsAddingInviter(true)} className="bg-gradient-gold text-navy font-bold rounded-2xl gap-2 shadow-gold hover:shadow-gold/80 h-11 px-5">
                    <PlusCircle className="h-4 w-4" /> Add Inviter
                  </Button>
                  <Button variant="outline" onClick={() => exportCSV(filteredInviters as any, "inviters")} className="border-border/60 rounded-2xl gap-2 h-11">
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
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Church Center</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Phone</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Email</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Invites</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedInviters.map((inv) => (
                        <TableRow key={inv.id} className="hover:bg-zinc-900/50 border-b border-border/40">
                          <TableCell className="font-semibold text-foreground text-sm">{inv.full_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{(inv.churches as any)?.name || "—"}</TableCell>
                          <TableCell className="text-sm font-mono text-foreground">{inv.phone || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{inv.email || "—"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="border-gold/40 text-gold bg-gold/5 font-mono">
                              {inv.invite_count || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
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

                {inviterTotalPages > 1 && (
                  <div className="p-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Page <strong>{inviterPage}</strong> of <strong>{inviterTotalPages}</strong> ({filteredInviters.length} total)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={inviterPage === 1} onClick={() => setInviterPage(p => Math.max(1, p - 1))} className="rounded-xl border-border/60">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled={inviterPage >= inviterTotalPages} onClick={() => setInviterPage(p => Math.min(inviterTotalPages, p + 1))} className="rounded-xl border-border/60">
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 4: ATTENDEES */}
          {activeTab === "attendees" && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search attendee, inviter, church..."
                      value={attendeeSearch}
                      onChange={(e) => { setAttendeeSearch(e.target.value); setAttendeePage(1); }}
                      className="pl-10 bg-zinc-900 border-border/60 rounded-2xl h-11 text-sm"
                    />
                  </div>

                  <Select value={attendeeChurchFilter} onValueChange={(v) => { setAttendeeChurchFilter(v); setAttendeePage(1); }}>
                    <SelectTrigger className="w-[170px] bg-zinc-900 border-border/60 rounded-2xl h-11 text-xs">
                      <SelectValue placeholder="All Churches" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-gold/30">
                      <SelectItem value="all">All Churches</SelectItem>
                      {churches.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1.5">
                    <Button variant={attendeeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => { setAttendeeFilter("all"); setAttendeePage(1); }} className="rounded-xl text-xs">All</Button>
                    <Button variant={attendeeFilter === "confirmed" ? "default" : "outline"} size="sm" onClick={() => { setAttendeeFilter("confirmed"); setAttendeePage(1); }} className="rounded-xl text-xs">Confirmed</Button>
                    <Button variant={attendeeFilter === "pending" ? "default" : "outline"} size="sm" onClick={() => { setAttendeeFilter("pending"); setAttendeePage(1); }} className="rounded-xl text-xs">Pending</Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => setIsAddingAttendee(true)} className="bg-gradient-gold text-navy font-bold rounded-2xl gap-2 shadow-gold hover:shadow-gold/80 h-11 px-4 text-xs">
                    <PlusCircle className="h-4 w-4" /> Add Attendee
                  </Button>
                  {selectedAttendees.size > 0 && (
                    <>
                      <Button size="sm" onClick={handleBulkConfirm} className="bg-emerald-500 text-white font-bold rounded-xl text-xs">
                        Confirm ({selectedAttendees.size})
                      </Button>
                      <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="rounded-xl text-xs">
                        Delete ({selectedAttendees.size})
                      </Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={() => exportCSV(filteredAttendees as any, "attendees")} className="rounded-xl gap-1.5 text-xs h-11">
                    <Download className="h-4 w-4" /> CSV
                  </Button>
                </div>
              </div>

              <Card className="bg-card/80 backdrop-blur-xl border-border/60 rounded-3xl shadow-2xl overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-zinc-900/90 border-b border-border/60">
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={paginatedAttendees.length > 0 && paginatedAttendees.every((m) => selectedAttendees.has(m.id))}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Attendee Name</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Phone</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Church Center</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Invited By</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Status</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAttendees.map((m) => (
                        <TableRow key={m.id} className="hover:bg-zinc-900/50 border-b border-border/40">
                          <TableCell>
                            <Checkbox
                              checked={selectedAttendees.has(m.id)}
                              onCheckedChange={(c) => handleSelectOne(m.id, !!c)}
                            />
                          </TableCell>
                          <TableCell className="font-semibold text-foreground text-sm">{m.full_name}</TableCell>
                          <TableCell className="text-sm font-mono text-foreground">{m.phone || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{(m.churches as any)?.name || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{(m.inviters as any)?.full_name || "—"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={m.confirmed ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-amber-500/40 text-amber-400 bg-amber-500/10"}>
                              {m.confirmed ? "Confirmed" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button size="sm" variant="ghost" onClick={() => setViewingAttendee(m)} className="hover:text-gold rounded-lg" title="View Details">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingAttendee({ ...m, inviter_id: m.inviter_id || "none" })} className="hover:text-gold rounded-lg">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteAttendee(m.id)} className="hover:text-red-400 rounded-lg">
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </Button>
                              <Button
                                size="sm"
                                variant={m.confirmed ? "outline" : "default"}
                                onClick={() => handleConfirmSingle(m.id, m.confirmed)}
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
                          <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                            No attendee records match your filter criteria.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>

                {attendeeTotalPages > 1 && (
                  <div className="p-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Page <strong>{attendeePage}</strong> of <strong>{attendeeTotalPages}</strong> ({filteredAttendees.length} records)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={attendeePage === 1} onClick={() => setAttendeePage(p => Math.max(1, p - 1))} className="rounded-xl border-border/60">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled={attendeePage >= attendeeTotalPages} onClick={() => setAttendeePage(p => Math.min(attendeeTotalPages, p + 1))} className="rounded-xl border-border/60">
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 5: PROGRAMS */}
          {activeTab === "programs" && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display font-bold text-xl text-foreground">Program Seasons</h3>
                  <p className="text-xs text-muted-foreground font-body">Manage active program seasons, dates, and locations</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={() => setIsAddingProgram(true)} className="bg-gradient-gold text-navy font-bold rounded-2xl gap-2 shadow-gold hover:shadow-gold/80 h-11 px-5">
                    <PlusCircle className="h-4 w-4" /> Create Season
                  </Button>
                  <Button variant="outline" onClick={handleDeactivateAllPrograms} className="border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-2xl h-11 text-xs">
                    Deactivate All
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {programs.map((p: any) => (
                  <Card key={p.id} className={`bg-card/80 backdrop-blur-xl border rounded-3xl p-6 shadow-xl space-y-4 ${p.is_active ? "border-gold/60 shadow-gold/10" : "border-border/60"}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-display font-bold text-lg text-foreground">{p.name}</h4>
                          {p.is_active && (
                            <Badge className="bg-gradient-gold text-navy font-bold border-0 text-[10px]">
                              Active Season
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gold" /> {p.location_name || "Location TBD"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditingProgram({ ...p })} className="hover:text-gold rounded-lg">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteProgram(p.id)} className="hover:text-red-400 rounded-lg">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant={p.is_active ? "outline" : "default"}
                        onClick={() => handleSetProgramActive(p.id)}
                        className={!p.is_active ? "bg-gradient-gold text-navy font-bold rounded-xl text-xs" : "rounded-xl text-xs"}
                      >
                        {p.is_active ? "Currently Active" : "Set Active"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleMarkProgramCompleted(p.id)} className="rounded-xl text-xs border-border/60">
                        Mark Completed
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: BUS SERVICES */}
          {activeTab === "bus" && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display font-bold text-xl text-foreground">Free Bus Service Pickup Routes</h3>
                  <p className="text-xs text-muted-foreground font-body">Manage pickup points and departure times across Accra</p>
                </div>
                <Button onClick={() => setIsAddingBusPoint(true)} className="bg-gradient-gold text-navy font-bold rounded-2xl gap-2 shadow-gold hover:shadow-gold/80 h-11 px-5">
                  <PlusCircle className="h-4 w-4" /> Add Bus Route
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {busPoints.map((bp: any) => (
                  <Card key={bp.id} className="bg-card/80 backdrop-blur-xl border border-border/60 rounded-3xl p-6 shadow-xl space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                          <Bus className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-base text-foreground">{bp.name}</h4>
                          <p className="text-xs text-muted-foreground font-body leading-tight">{bp.location}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditingBusPoint({ ...bp })} className="hover:text-gold rounded-lg">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteBusPoint(bp.id)} className="hover:text-red-400 rounded-lg">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-body">Departure:</span>
                      <Badge variant="outline" className="border-gold/40 text-gold bg-gold/5 font-mono">
                        {bp.departure_time || "TBD"}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: LIVE BROADCAST */}
          {activeTab === "live-stream" && (
            <div className="space-y-6 animate-fade-up">
              <Card className="bg-card/80 backdrop-blur-xl border border-gold/30 rounded-3xl p-8 shadow-2xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-display font-bold text-2xl text-foreground">Live Broadcast Settings</h3>
                      <Badge className={liveStreamSettings?.is_active ? "bg-red-500 text-white font-bold animate-pulse" : "bg-zinc-800 text-zinc-400"}>
                        {liveStreamSettings?.is_active ? "LIVE BROADCAST ACTIVE" : "OFFLINE"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-body">Manage live stream embed URL, chat, and active state</p>
                  </div>

                  <Button
                    onClick={handleToggleStreamActive}
                    className={liveStreamSettings?.is_active ? "bg-red-600 text-white font-bold rounded-2xl" : "bg-gradient-gold text-navy font-bold rounded-2xl"}
                  >
                    {liveStreamSettings?.is_active ? "Deactivate Broadcast" : "Activate Live Broadcast"}
                  </Button>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-zinc-300">Live Video Stream Embed URL (YouTube/Vimeo/HLS)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      value={isEditingStream ? streamUrl : (liveStreamSettings?.stream_url || "")}
                      onChange={(e) => setStreamUrl(e.target.value)}
                      disabled={!isEditingStream}
                      placeholder="e.g. https://www.youtube.com/embed/LIVE_STREAM_ID"
                      className="bg-zinc-900 border-border/60 rounded-2xl h-12 text-sm text-foreground flex-1"
                    />
                    {isEditingStream ? (
                      <Button onClick={handleUpdateStreamUrl} className="bg-gradient-gold text-navy font-bold rounded-2xl h-12 px-6">Save URL</Button>
                    ) : (
                      <Button variant="outline" onClick={() => { setStreamUrl(liveStreamSettings?.stream_url || ""); setIsEditingStream(true); }} className="rounded-2xl h-12 px-6 border-border/60">
                        Edit URL
                      </Button>
                    )}
                  </div>
                </div>

                {/* Real-time viewer stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/40">
                  <div className="p-4 rounded-2xl bg-zinc-900/80 border border-border/40 text-center">
                    <div className="text-2xl font-bold font-display text-gold">{liveViewers}</div>
                    <div className="text-xs text-muted-foreground">Current Active Viewers</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-zinc-900/80 border border-border/40 text-center">
                    <div className="text-2xl font-bold font-display text-foreground">{uniqueViewerIds.size}</div>
                    <div className="text-xs text-muted-foreground">Total Unique Viewers</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-zinc-900/80 border border-border/40 text-center">
                    <div className="text-2xl font-bold font-display text-emerald-400">{liveChats.length}</div>
                    <div className="text-xs text-muted-foreground">Live Chat Messages</div>
                  </div>
                </div>
              </Card>

              {/* Chat Moderation Panel */}
              <Card className="bg-card/80 backdrop-blur-xl border border-border/60 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="font-display font-bold text-lg text-foreground">Live Chat Moderation Feed</h3>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {liveChats.map((c) => (
                    <div key={c.id} className="p-3 rounded-2xl bg-zinc-900/80 border border-border/40 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-gold font-semibold mr-2">{c.username || "Anonymous"}:</strong>
                        <span className="text-zinc-200">{c.message}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteChat(c.id)} className="hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    </div>
                  ))}
                  {liveChats.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">No chat messages posted yet.</p>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 8: PRAYER POINTS */}
          {activeTab === "prayer-points" && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-xl text-foreground flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-gold" /> Private Pastoral Prayer Requests
                  </h3>
                  <p className="text-xs text-muted-foreground font-body">Confidential prayer submissions sent by members</p>
                </div>
                <Button variant="outline" onClick={() => exportCSV(prayerPoints as any, "prayer-points")} className="rounded-2xl border-border/60 gap-2">
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
              </div>

              <Card className="bg-card/80 backdrop-blur-xl border-border/60 rounded-3xl shadow-2xl overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-zinc-900/90 border-b border-border/60">
                      <TableRow>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Author / Name</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Prayer Details & Burden</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date Received</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Status</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPrayerPoints.map((pp: any) => (
                        <TableRow key={pp.id} className="hover:bg-zinc-900/50 border-b border-border/40">
                          <TableCell className="font-semibold text-foreground text-sm">{pp.name || "Anonymous"}</TableCell>
                          <TableCell className="text-xs text-zinc-300 max-w-md whitespace-pre-line leading-relaxed">{pp.request}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(pp.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={pp.status === "prayed_for" ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-amber-500/40 text-amber-400 bg-amber-500/10"}>
                              {pp.status === "prayed_for" ? "Prayed For" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTogglePrayerPointStatus(pp.id, pp.status || "pending")}
                                className="rounded-xl text-xs"
                              >
                                {pp.status === "prayed_for" ? "Mark Pending" : "Mark Prayed For"}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeletePrayerPoint(pp.id)} className="hover:text-red-400 rounded-lg">
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}

                      {prayerPoints.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                            No confidential prayer requests received yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>

                {prayerPointTotalPages > 1 && (
                  <div className="p-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Page <strong>{prayerPointPage}</strong> of <strong>{prayerPointTotalPages}</strong> ({prayerPoints.length} total)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={prayerPointPage === 1} onClick={() => setPrayerPointPage(p => Math.max(1, p - 1))} className="rounded-xl border-border/60">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled={prayerPointPage >= prayerPointTotalPages} onClick={() => setPrayerPointPage(p => Math.min(prayerPointTotalPages, p + 1))} className="rounded-xl border-border/60">
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 9: TESTIMONIALS */}
          {activeTab === "testimonials" && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display font-bold text-xl text-foreground">Testimonial Moderation & Reviews</h3>
                  <p className="text-xs text-muted-foreground font-body">Approve or hide testimonies before public display</p>
                </div>
                <Button onClick={() => setIsAddingTestimonial(true)} className="bg-gradient-gold text-navy font-bold rounded-2xl gap-2 shadow-gold hover:shadow-gold/80 h-11 px-5">
                  <PlusCircle className="h-4 w-4" /> Add Testimonial
                </Button>
              </div>

              <Card className="bg-card/80 backdrop-blur-xl border-border/60 rounded-3xl shadow-2xl overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-zinc-900/90 border-b border-border/60">
                      <TableRow>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Author</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Church / Zone</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Testimony Content</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Status</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTestimonials.map((t: any) => (
                        <TableRow key={t.id} className="hover:bg-zinc-900/50 border-b border-border/40">
                          <TableCell className="font-semibold text-foreground text-sm">{t.author_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{t.church_name || "—"}</TableCell>
                          <TableCell className="text-xs text-zinc-300 max-w-md italic">"{t.content}"</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={t.is_approved ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-amber-500/40 text-amber-400 bg-amber-500/10"}>
                              {t.is_approved ? "Approved" : "Pending Review"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant={t.is_approved ? "outline" : "default"}
                                onClick={() => handleToggleTestimonialApproved(t.id, t.is_approved)}
                                className={!t.is_approved ? "bg-gradient-gold text-navy font-bold rounded-xl text-xs px-3" : "rounded-xl text-xs"}
                              >
                                {t.is_approved ? "Hide" : "Approve"}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteTestimonial(t.id)} className="hover:text-red-400 rounded-lg">
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}

                      {testimonials.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                            No testimonies found. Click Add Testimonial to publish one.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>

                {testimonialTotalPages > 1 && (
                  <div className="p-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Page <strong>{testimonialPage}</strong> of <strong>{testimonialTotalPages}</strong> ({testimonials.length} total)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={testimonialPage === 1} onClick={() => setTestimonialPage(p => Math.max(1, p - 1))} className="rounded-xl border-border/60">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled={testimonialPage >= testimonialTotalPages} onClick={() => setTestimonialPage(p => Math.min(testimonialTotalPages, p + 1))} className="rounded-xl border-border/60">
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 10: RESOURCES */}
          {activeTab === "resources" && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search resources..."
                      value={resourceSearch}
                      onChange={(e) => setResourceSearch(e.target.value)}
                      className="pl-10 bg-zinc-900 border-border/60 rounded-2xl h-11 text-sm"
                    />
                  </div>
                  <Select value={resourceCategoryFilter} onValueChange={setResourceCategoryFilter}>
                    <SelectTrigger className="w-[170px] bg-zinc-900 border-border/60 rounded-2xl h-11 text-xs">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-gold/30">
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Prayer Guide">Prayer Guide</SelectItem>
                      <SelectItem value="Devotional">Devotional</SelectItem>
                      <SelectItem value="Study Material">Study Material</SelectItem>
                      <SelectItem value="Song Sheet">Song Sheet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={() => setIsAddingResource(true)} className="bg-gradient-gold text-navy font-bold rounded-2xl gap-2 shadow-gold hover:shadow-gold/80 h-11 px-5">
                  <PlusCircle className="h-4 w-4" /> Upload Resource
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResources.map((res: any) => (
                  <Card key={res.id} className="bg-card/80 backdrop-blur-xl border border-border/60 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <Badge variant="outline" className="border-gold/40 text-gold bg-gold/5 text-[10px]">
                          {res.category}
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteResource(res)} className="hover:text-red-400">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                      <h4 className="font-display font-bold text-lg text-foreground leading-snug">{res.title}</h4>
                      {res.description && (
                        <p className="text-xs text-muted-foreground font-body line-clamp-3 leading-relaxed">{res.description}</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{(res.file_type || "PDF").toUpperCase()}</span>
                      <span>{res.download_count || 0} downloads</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 11: ADMINS */}
          {activeTab === "admins" && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-xl text-foreground">Authorized System Administrators</h3>
                  <p className="text-xs text-muted-foreground font-body">Manage admin profiles and permissions</p>
                </div>
              </div>

              <Card className="bg-card/80 backdrop-blur-xl border-border/60 rounded-3xl shadow-2xl overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-zinc-900/90 border-b border-border/60">
                      <TableRow>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Full Name</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Email</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Assigned Church</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">System Roles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admins.map((adm: any) => (
                        <TableRow key={adm.id} className="hover:bg-zinc-900/50 border-b border-border/40">
                          <TableCell className="font-semibold text-foreground text-sm">{adm.full_name || "Admin"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{adm.email}</TableCell>
                          <TableCell className="text-sm text-zinc-300">{(adm.churches as any)?.name || "Global"}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {(adm.roles || []).map((r: any) => (
                                <Badge key={r.role} className={r.role === "super_admin" ? "bg-gradient-gold text-navy font-bold border-0" : "bg-zinc-800 text-zinc-300 border-0"}>
                                  {r.role.replace("_", " ")}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 12: AUDIT LOGS */}
          {activeTab === "audit-logs" && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-xl text-foreground">Security Audit Trail</h3>
                  <p className="text-xs text-muted-foreground font-body">Track system actions and admin modifications</p>
                </div>
              </div>

              <Card className="bg-card/80 backdrop-blur-xl border-border/60 rounded-3xl shadow-2xl overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-zinc-900/90 border-b border-border/60">
                      <TableRow>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Action</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Entity</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Performed By</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAudit.map((log: any) => (
                        <TableRow key={log.id} className="hover:bg-zinc-900/50 border-b border-border/40">
                          <TableCell className="font-semibold text-xs text-gold uppercase">{log.action}</TableCell>
                          <TableCell className="text-xs text-foreground font-mono">{log.entity_type} {log.entity_id ? `#${log.entity_id.slice(0, 6)}` : ""}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{(log.profiles as any)?.full_name || log.user_id || "System"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>

                {auditTotalPages > 1 && (
                  <div className="p-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Page <strong>{auditPage}</strong> of <strong>{auditTotalPages}</strong> ({auditLogs.length} logs)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={auditPage === 1} onClick={() => setAuditPage(p => Math.max(1, p - 1))} className="rounded-xl border-border/60">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled={auditPage >= auditTotalPages} onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))} className="rounded-xl border-border/60">
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 13: EXPORT CENTER */}
          {activeTab === "export" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-up">
              {[
                { label: "Export Full Attendees CSV", desc: "Download entire registered attendee list across all churches", onClick: () => exportCSV(programAttendees as any, "all-attendees") },
                { label: "Export Church Statistics", desc: "Download church centers breakdown, targets, and confirmation rates", onClick: () => exportCSV(churchLeaderboard as any, "church-stats") },
                { label: "Export Inviters Roster", desc: "Download full list of registered inviters and invitation counts", onClick: () => exportCSV(inviters as any, "inviters-list") },
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

      {/* MODAL 1: Add Church */}
      <Dialog open={isAddingChurch} onOpenChange={setIsAddingChurch}>
        <DialogContent className="bg-zinc-950 border-gold/40 text-foreground rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">Add New Church Center</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Church Name *</Label><Input value={newChurch.name} onChange={e => setNewChurch(p => ({ ...p, name: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Target Mobilization Goal</Label><Input type="number" value={newChurch.target} onChange={e => setNewChurch(p => ({ ...p, target: parseInt(e.target.value) || 100 }))} className="bg-zinc-900 border-border/60" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingChurch(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreateChurch} className="bg-gradient-gold text-navy font-bold rounded-xl shadow-gold">Create Church</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Edit Church */}
      <Dialog open={!!editingChurch} onOpenChange={open => !open && setEditingChurch(null)}>
        <DialogContent className="bg-zinc-950 border-gold/40 text-foreground rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">Edit Church Center</DialogTitle>
          </DialogHeader>
          {editingChurch && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5"><Label className="text-xs">Church Name</Label><Input value={editingChurch.name} onChange={e => setEditingChurch((p: any) => ({ ...p, name: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Target Goal</Label><Input type="number" value={editingChurch.target} onChange={e => setEditingChurch((p: any) => ({ ...p, target: parseInt(e.target.value) || 100 }))} className="bg-zinc-900 border-border/60" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingChurch(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSaveChurch} className="bg-gradient-gold text-navy font-bold rounded-xl shadow-gold">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Add Program */}
      <Dialog open={isAddingProgram} onOpenChange={setIsAddingProgram}>
        <DialogContent className="bg-zinc-950 border-gold/40 text-foreground rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">Create Program Season</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Program Title *</Label><Input value={newProgram.name} onChange={e => setNewProgram(p => ({ ...p, name: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Location Name *</Label><Input value={newProgram.location_name} onChange={e => setNewProgram(p => ({ ...p, location_name: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Map Embed Iframe URL</Label><Input value={newProgram.map_iframe_url} onChange={e => setNewProgram(p => ({ ...p, map_iframe_url: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Start Date</Label><Input type="date" value={newProgram.start_date} onChange={e => setNewProgram(p => ({ ...p, start_date: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingProgram(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreateProgram} className="bg-gradient-gold text-navy font-bold rounded-xl shadow-gold">Create Program</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Edit Program */}
      <Dialog open={!!editingProgram} onOpenChange={open => !open && setEditingProgram(null)}>
        <DialogContent className="bg-zinc-950 border-gold/40 text-foreground rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">Edit Program Season</DialogTitle>
          </DialogHeader>
          {editingProgram && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5"><Label className="text-xs">Program Title</Label><Input value={editingProgram.name} onChange={e => setEditingProgram((p: any) => ({ ...p, name: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Location Name</Label><Input value={editingProgram.location_name} onChange={e => setEditingProgram((p: any) => ({ ...p, location_name: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Map Embed URL</Label><Input value={editingProgram.map_iframe_url} onChange={e => setEditingProgram((p: any) => ({ ...p, map_iframe_url: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Start Date</Label><Input type="date" value={editingProgram.start_date || ""} onChange={e => setEditingProgram((p: any) => ({ ...p, start_date: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProgram(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSaveProgram} className="bg-gradient-gold text-navy font-bold rounded-xl shadow-gold">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: Add Bus Route */}
      <Dialog open={isAddingBusPoint} onOpenChange={setIsAddingBusPoint}>
        <DialogContent className="bg-zinc-950 border-gold/40 text-foreground rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">Add Bus Pickup Route</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Route / Bus Name *</Label><Input value={newBusPoint.name} onChange={e => setNewBusPoint(p => ({ ...p, name: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Pickup Location Address *</Label><Input value={newBusPoint.location} onChange={e => setNewBusPoint(p => ({ ...p, location: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Departure Time</Label><Input value={newBusPoint.departure_time} onChange={e => setNewBusPoint(p => ({ ...p, departure_time: e.target.value }))} placeholder="e.g. 4:30 PM" className="bg-zinc-900 border-border/60" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingBusPoint(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreateBusPoint} className="bg-gradient-gold text-navy font-bold rounded-xl shadow-gold">Add Route</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 6: Add Testimonial */}
      <Dialog open={isAddingTestimonial} onOpenChange={setIsAddingTestimonial}>
        <DialogContent className="bg-zinc-950 border-gold/40 text-foreground rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">Add Testimonial</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Author Name</Label><Input value={newTestimonial.author_name} onChange={e => setNewTestimonial(p => ({ ...p, author_name: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Church / Zone</Label><Input value={newTestimonial.church_name} onChange={e => setNewTestimonial(p => ({ ...p, church_name: e.target.value }))} className="bg-zinc-900 border-border/60" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Testimony Content *</Label><Textarea value={newTestimonial.content} onChange={e => setNewTestimonial(p => ({ ...p, content: e.target.value }))} rows={4} className="bg-zinc-900 border-border/60" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingTestimonial(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreateTestimonial} className="bg-gradient-gold text-navy font-bold rounded-xl shadow-gold">Publish Testimonial</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminDashboard;
