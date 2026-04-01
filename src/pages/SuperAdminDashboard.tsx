import { useEffect, useMemo, useState, useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  LayoutDashboard, Church, Shield, UserCheck, Users, Trophy, Download,
  LogOut, Menu, X, TrendingUp, Target, Medal, Pencil, Trash2, PieChart as PieChartIcon, Activity, MapPin, MessageCircle, Eye, History, Mail
  , Bus, Calendar
  , Heart
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie, Legend } from "recharts";
import { format, parseISO, startOfMonth } from "date-fns";
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
  const [attendeePage, setAttendeePage] = useState(1);
  const itemsPerPage = 20;

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

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
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
        console.error("Error fetching resources:", error);
        throw error;
      }
      return data;
    },
  });

  useEffect(() => {
    if (resourcesError) {
      console.error("Resources query error:", resourcesError);
      toast.error("Failed to load resources");
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
    // Auto active if it is the first program
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
    // Turn all off
    await supabase.from("programs").update({ is_active: false }).neq("id", id);
    // Turn this one on
    const { error } = await supabase.from("programs").update({ is_active: true }).eq("id", id);
    if (error) { toast.error("Failed."); return; }
    toast.success("Active program updated! Website will now display this program.");
    queryClient.invalidateQueries({ queryKey: ["all-programs"] });
  };

  const handleDeactivateAllPrograms = async () => {
    if (!window.confirm("Deactivate all programs? This will disable new data writes until a program is activated.")) return;
    // PostgREST rejects an update without a WHERE clause; update each program individually.
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
    // First ensure the program is deactivated
    const { error: e1 } = await supabase.from("programs").update({ is_active: false }).eq("id", id);
    if (e1) { toast.error("Failed to deactivate program: " + (e1.message || e1)); return; }

    // Try to set completed_at if the column exists. If it doesn't, ignore that error.
    try {
      const { error: e2 } = await supabase.from("programs").update({ completed_at: new Date().toISOString() }).eq("id", id);
      if (e2) {
        // If the column doesn't exist, that's fine — program is still deactivated and retrievable.
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
  const liveViewersRef = useRef<number>(0);

  useEffect(() => {
    if (activeTab !== "live-analytics") return;

    const fetchChats = async () => {
      const { data } = await supabase.from("live_chats").select("*").order("created_at", { ascending: false }).limit(50);
      if (data) setLiveChats(data);
    };
    fetchChats();

    const chatSub = supabase.channel('admin_live_chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_chats' }, payload => {
        if (payload.eventType === 'INSERT') {
          setLiveChats(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setLiveChats(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
        }
      }).subscribe();

    const presenceChannel = supabase.channel('stream-room');

    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      setLiveViewers(Object.keys(state).length);
    });

    presenceChannel.on('presence', { event: 'join' }, (payload: any) => {
      try {
        const key = payload.key;
        setTotalJoins((n) => n + 1);
        setUniqueViewerIds((ids) => new Set(ids).add(key));
        // Persist presence join event
        (async () => {
          try {
            await supabase.from('live_presence_events').insert({
              program_id: activeProgram?.id || null,
              viewer_key: key,
              event: 'join',
              created_at: new Date().toISOString()
            });
          } catch (e) {
            console.debug('failed to persist join event', e);
          }
        })();
      } catch (e) {
        console.debug('presence join handler error', e);
      }
    });

    presenceChannel.on('presence', { event: 'leave' }, (payload: any) => {
      try {
        setTotalLeaves((n) => n + 1);
        const key = payload.key;
        // Persist presence leave event
        (async () => {
          try {
            await supabase.from('live_presence_events').insert({
              program_id: activeProgram?.id || null,
              viewer_key: key,
              event: 'leave',
              created_at: new Date().toISOString()
            });
          } catch (e) {
            console.debug('failed to persist leave event', e);
          }
        })();
      } catch (e) {
        console.debug('presence leave handler error', e);
      }
    }).subscribe();

    // Periodically sample the current presence count every minute and persist it
    let sampleTimer: any = null;
    const startSampling = () => {
      sampleTimer = setInterval(async () => {
        try {
          if (!activeProgram) return;
          const count = liveViewersRef.current || 0;
          await supabase.from('live_presence_samples').insert({ program_id: activeProgram?.id || null, count, recorded_at: new Date().toISOString() });
        } catch (e) {
          console.debug('failed to persist presence sample', e);
        }
      }, 60_000);
    };

    startSampling();

    return () => {
      supabase.removeChannel(chatSub);
      supabase.removeChannel(presenceChannel);
      if (sampleTimer) clearInterval(sampleTimer);
    };
  }, [activeTab]);

  useEffect(() => {
    liveViewersRef.current = liveViewers;
  }, [liveViewers]);

  const exportLiveAnalytics = () => {
    // Build CSV: first a summary, then chat rows
    const rows: string[] = [];
    rows.push(['Metric', 'Value'].join(','));
    rows.push(['Active Viewers', String(liveViewers)].join(','));
    rows.push(['Total Joined', String(totalJoins)].join(','));
    rows.push(['Total Left', String(totalLeaves)].join(','));
    rows.push(['Unique Viewers', String(uniqueViewerIds.size)].join(','));
    rows.push(['', ''].join(','));
    rows.push('Chats');
    rows.push(['id', 'user_name', 'created_at', 'message', 'is_deleted'].join(','));
    for (const c of liveChats) {
      const safeMsg = String(c.message || '').replace(/\n|\r|,/g, ' ');
      rows.push([c.id, (c.user_name || '').replace(/,/g, ''), c.created_at, safeMsg, String(!!c.is_deleted)].join(','));
    }
    rows.push(['', ''].join(','));
    rows.push('Presence Events');
    rows.push(['id', 'viewer_key', 'event', 'metadata', 'created_at'].join(','));
    try {
      // fetch persisted events
      (async () => {
        const { data: events } = await supabase.from('live_presence_events').select('*').order('created_at', { ascending: true }).limit(5000).throwOnError();
        for (const e of events || []) {
          rows.push([e.id, (e.viewer_key || '').replace(/,/g, ''), e.event, JSON.stringify(e.metadata || {}).replace(/,/g, ' '), e.created_at].join(','));
        }
        rows.push(['', ''].join(','));
        rows.push('Presence Samples');
        rows.push(['id', 'count', 'recorded_at'].join(','));
        const { data: samples } = await supabase.from('live_presence_samples').select('*').order('recorded_at', { ascending: true }).limit(5000).throwOnError();
        for (const s of samples || []) {
          rows.push([s.id, String(s.count), s.recorded_at].join(','));
        }
        rows.push(['', ''].join(','));
        rows.push('Participants');
        rows.push(['id', 'viewer_key', 'name', 'contact', 'location', 'program_id', 'joined_at'].join(','));
        const { data: participants } = await supabase.from('live_participants').select('*').order('joined_at', { ascending: true }).limit(5000).throwOnError();
        for (const p of participants || []) {
          rows.push([p.id, (p.viewer_key || ''), (p.name || '').replace(/,/g, ''), (p.contact || '').replace(/,/g, ''), (p.location || '').replace(/,/g, ''), p.program_id || '', p.joined_at].join(','));
        }
        const csv2 = rows.join('\n');
        const blob2 = new Blob([csv2], { type: 'text/csv;charset=utf-8;' });
        const url2 = URL.createObjectURL(blob2);
        const a2 = document.createElement('a');
        a2.href = url2;
        a2.download = `live-analytics-${new Date().toISOString()}.csv`;
        a2.click();
        URL.revokeObjectURL(url2);
      })();
    } catch (err) {
      // fallback: already downloaded chat+summary
    }
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `live-analytics-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteChat = async (id: string, isDeleted: boolean) => {
    const { error } = await supabase.from("live_chats").update({ is_deleted: !isDeleted }).eq("id", id);
    if (error) toast.error("Action failed.");
    else toast.success("Message moderated.");
  };

  // Sync local state when settings load
  useEffect(() => {
    if (liveStreamSettings) {
      setStreamUrl(liveStreamSettings.url || "");
    }
  }, [liveStreamSettings]);

  const handleToggleStream = async (isActive: boolean) => {
    if (!liveStreamSettings?.id) {
      const { error } = await supabase.from("live_stream_settings").insert({ is_active: isActive, url: streamUrl });
      if (error) { toast.error("Init failed: " + error.message); return; }
      toast.success(isActive ? "Stream initialized and LIVE!" : "Stream initialized Offline.");
      refetchLiveStream();
      return;
    }
    const { error } = await supabase.from("live_stream_settings").update({ is_active: isActive, url: streamUrl }).eq("id", liveStreamSettings.id);
    if (error) { toast.error("Failed to toggle: " + error.message); return; }
    toast.success(isActive ? "Stream is now LIVE!" : "Stream is now Offline.");
    refetchLiveStream();
  };

  const handleSaveStreamUrl = async () => {
    if (!liveStreamSettings?.id) {
      const { error } = await supabase.from("live_stream_settings").insert({ is_active: liveStreamSettings?.is_active || false, url: streamUrl });
      if (error) { toast.error("Init failed: " + error.message); return; }
      toast.success("Stream URL explicitly created and updated.");
      setIsEditingStream(false);
      refetchLiveStream();
      return;
    }
    const { error } = await supabase.from("live_stream_settings").update({ url: streamUrl }).eq("id", liveStreamSettings.id);
    if (error) { toast.error("Failed to save URL: " + error.message); return; }
    toast.success("Stream URL updated.");
    setIsEditingStream(false);
    refetchLiveStream();
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

  const confirmedTotal = programAttendees.filter((m) => m.confirmed).length;
  const pendingTotal = programAttendees.filter((m) => !m.confirmed).length;

  const churchLeaderboard = useMemo(() => {
    return churches
      .map(c => {
        const churchAttendees = programAttendees.filter(m => m.church_id === c.id);
        const confirmedCnt = churchAttendees.filter(m => m.confirmed).length;
        const pendingCnt = churchAttendees.length - confirmedCnt;
        const ratio = churchAttendees.length > 0 ? Math.round((confirmedCnt / churchAttendees.length) * 100) : 0;

        return {
          id: c.id,
          name: c.name,
          attendees: churchAttendees.length,
          confirmed: confirmedCnt,
          pending: pendingCnt,
          ratio: ratio,
          target: c.target,
        };
      })
      .sort((a, b) => b.confirmed - a.confirmed);
  }, [churches, programAttendees]);

  const inviterLeaderboard = useMemo(() => {
    return inviters
      .map(inv => ({
        name: inv.full_name,
        church: (inv.churches as any)?.name || "",
        invites: programAttendees.filter(m => m.inviter_id === inv.id).length,
        confirmed: attendees.filter(m => m.inviter_id === inv.id && m.confirmed).length,
      }))
      .sort((a, b) => b.confirmed - a.confirmed)
      .slice(0, 10);
  }, [inviters, programAttendees]);

  const filteredChurches = useMemo(() => {
    return churchLeaderboard.filter((c) => c.name.toLowerCase().includes(churchSearch.toLowerCase()));
  }, [churchLeaderboard, churchSearch]);

  const filteredInviters = useMemo(() => {
    return inviters.filter((inv) => {
      const matchesSearch = inv.full_name.toLowerCase().includes(inviterSearch.toLowerCase()) ||
        ((inv.churches as any)?.name || "").toLowerCase().includes(inviterSearch.toLowerCase());

      const matchesChurch = inviterChurchFilter === "all" || inv.church_id === inviterChurchFilter;

      return matchesSearch && matchesChurch;
    }).map(inv => {
      // Calculate real-time stats from attendees array
      const myInvites = programAttendees.filter(m => m.inviter_id === inv.id);
      return {
        ...inv,
        real_invite_count: myInvites.length,
        real_confirmed_count: myInvites.filter(m => m.confirmed).length
      };
    });
  }, [inviters, inviterSearch, inviterChurchFilter, attendees]);

  const filteredAttendees = useMemo(() => {
    return programAttendees.filter((m) => {
      const matchesSearch =
        m.full_name.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        ((m.churches as any)?.name || "").toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        ((m.inviters as any)?.full_name || "").toLowerCase().includes(attendeeSearch.toLowerCase());

      const matchesStatus =
        attendeeFilter === "all" ||
        (attendeeFilter === "confirmed" && m.confirmed) ||
        (attendeeFilter === "pending" && !m.confirmed);

      const matchesChurch = attendeeChurchFilter === "all" || m.church_id === attendeeChurchFilter;

      return matchesSearch && matchesStatus && matchesChurch;
    });
  }, [programAttendees, attendeeSearch, attendeeFilter, attendeeChurchFilter]);

  // Pagination for attendees
  const paginatedAttendees = useMemo(() => {
    const startIndex = (attendeePage - 1) * itemsPerPage;
    return filteredAttendees.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAttendees, attendeePage]);

  const totalAttendeePages = Math.ceil(filteredAttendees.length / itemsPerPage);

  // Reset pagination when searching/filtering
  useEffect(() => {
    setAttendeePage(1);
    setSelectedAttendees(new Set());
  }, [attendeeSearch, attendeeFilter, attendeeChurchFilter]);

  // --- Analytics Processing ---

  // Conversion Rates
  const overallConversionRate = programAttendees.length > 0
    ? Math.round((confirmedTotal / programAttendees.length) * 100)
    : 0;

  // Monthly Growth Data
  const monthlyGrowth = useMemo(() => {
    const counts: Record<string, { name: string, attendees: number, confirmed: number }> = {};

    // Sort attendees chronologically from earliest to latest just in case
    const sortedAttendees = [...programAttendees].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    sortedAttendees.forEach((m) => {
      // Group by month
      if (!m.created_at) return;
      const date = parseISO(m.created_at);
      if (isNaN(date.getTime())) return; // Guard against 'Invalid Date' crashing format()

      const monthYear = format(startOfMonth(date), "MMM yyyy");

      if (!counts[monthYear]) {
        counts[monthYear] = { name: monthYear, attendees: 0, confirmed: 0 };
      }
      counts[monthYear].attendees += 1;
      if (m.confirmed) counts[monthYear].confirmed += 1;
    });

    return Object.values(counts);
  }, [attendees]);

  // Geographic Distribution
  const geographicDistribution = useMemo(() => {
    const locations: Record<string, number> = {};
    programAttendees.forEach(m => {
      const loc = m.location?.trim() || "Unknown";
      locations[loc] = (locations[loc] || 0) + 1;
    });

    return Object.entries(locations)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 locations
  }, [attendees]);

  const unassignedAdmins = admins.filter((a) => {
    const isChurchAdmin = (a.roles || []).some((r: any) => r.role === "church_admin");
    return isChurchAdmin && !a.church_id;
  }).length;

  const logAction = async (action: string, targetType: string, targetId: string, details: any = null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("audit_logs").insert({
      user_id: user.id, // Ensure your policies and defaults handle this securely
      action,
      target_type: targetType,
      target_id: targetId,
      details
    });
    queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
  };

  const handleConfirm = async (attendeeId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const { error } = await supabase.from("members").update({ confirmed: newStatus }).eq("id", attendeeId);
    if (error) {
      toast.error("Failed.");
      return;
    }
    toast.success(newStatus ? "Confirmed!" : "Removed.");
    await logAction(newStatus ? "confirm_attendee" : "unconfirm_attendee", "attendee", attendeeId);
    queryClient.invalidateQueries({ queryKey: ["all-attendees"] });
  };

  const handleBulkConfirm = async () => {
    if (selectedAttendees.size === 0) return;
    const { error } = await supabase
      .from("members")
      .update({ confirmed: true })
      .in("id", Array.from(selectedAttendees));

    if (error) {
      toast.error("Failed to bulk confirm.");
      return;
    }
    toast.success(`${selectedAttendees.size} attendees confirmed.`);

    // Log bulk confirmation
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "bulk_confirm_attendees",
        target_type: "attendee",
        details: { count: selectedAttendees.size, ids: Array.from(selectedAttendees) }
      });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }

    setSelectedAttendees(new Set());
    queryClient.invalidateQueries({ queryKey: ["all-attendees"] });
  };

  const handleBulkDelete = async () => {
    if (selectedAttendees.size === 0) return;
    const shouldDelete = window.confirm(`Delete ${selectedAttendees.size} attendees? THIS CANNOT BE UNDONE.`);
    if (!shouldDelete) return;

    const { error } = await supabase
      .from("members")
      .delete()
      .in("id", Array.from(selectedAttendees));

    if (error) {
      toast.error("Failed to bulk delete attendees.");
      return;
    }

    toast.success(`${selectedAttendees.size} attendees deleted.`);

    // Log bulk delete
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("audit_logs").insert({
        admin_id: user.id,
        action: "bulk_delete_attendees",
        target_type: "attendee",
        details: { count: selectedAttendees.size }
      });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }

    setSelectedAttendees(new Set());
    queryClient.invalidateQueries({ queryKey: ["all-attendees"] });
    queryClient.invalidateQueries({ queryKey: ["all-inviters"] });
    queryClient.invalidateQueries({ queryKey: ["all-churches"] });
  };

  const handleConfirmAllPending = async () => {
    if (pendingTotal === 0) return;

    const { error } = await supabase
      .from("members")
      .update({ confirmed: true })
      .eq("confirmed", false);

    if (error) {
      toast.error("Failed to confirm all pending attendees.");
      return;
    }

    toast.success("All pending attendees confirmed.");
    queryClient.invalidateQueries({ queryKey: ["all-attendees"] });
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

  const handleDeleteAttendee = async (attendeeId: string) => {
    const shouldDelete = window.confirm("Delete this attendee? This cannot be undone.");
    if (!shouldDelete) return;

    const { error } = await supabase.from("members").delete().eq("id", attendeeId);

    if (error) {
      toast.error(error.message || "Failed to delete attendee.");
      return;
    }

    toast.success("Attendee deleted.");
    await logAction("delete_attendee", "attendee", attendeeId);
    queryClient.invalidateQueries({ queryKey: ["all-attendees"] });
    queryClient.invalidateQueries({ queryKey: ["all-inviters"] });
    queryClient.invalidateQueries({ queryKey: ["all-churches"] });
  };

  const handleDeleteChurch = async (churchId: string) => {
    const shouldDelete = window.confirm("Delete this church? This will delete all associated attendees and inviters. THIS CANNOT BE UNDONE.");
    if (!shouldDelete) return;

    try {
      const { error } = await supabase.rpc("delete_church_secure", { target_church_id: churchId });
      if (error) {
        console.error(error);
        toast.error(error.message || "Failed to delete church.");
        return;
      }
      toast.success("Church deleted.");
      await logAction("delete_church", "church", churchId);
      queryClient.invalidateQueries({ queryKey: ["all-churches"] });
      queryClient.invalidateQueries({ queryKey: ["all-attendees"] });
      queryClient.invalidateQueries({ queryKey: ["all-inviters"] });
      queryClient.invalidateQueries({ queryKey: ["all-admins"] });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An unexpected error occurred.");
    }
  };

  const handleSaveAdmin = async () => {
    if (!editingAdmin) return;

    // 1. Update Profile (Church ID)
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ church_id: editingAdmin.church_id === "none" ? null : editingAdmin.church_id })
      .eq("id", editingAdmin.id);

    if (profileError) {
      toast.error("Failed to update admin profile.");
      return;
    }

    // 2. Manage Roles (Super Admin toggle)
    const isCurrentlySuper = editingAdmin.original_is_super;
    const isNowSuper = editingAdmin.is_super;

    if (isCurrentlySuper !== isNowSuper) {
      if (isNowSuper) {
        // Grant super_admin
        await supabase.from("user_roles").insert({ user_id: editingAdmin.user_id, role: "super_admin" });
        await logAction("grant_super_admin", "admin_role", editingAdmin.user_id);
      } else {
        // Revoke super_admin
        await supabase.from("user_roles").delete().match({ user_id: editingAdmin.user_id, role: "super_admin" });
        await logAction("revoke_super_admin", "admin_role", editingAdmin.user_id);
      }
    }

    // Log church reassignment if it changed
    if (editingAdmin.church_id !== editingAdmin.original_church_id) {
      await logAction("reassign_church", "admin_role", editingAdmin.user_id, { new_church_id: editingAdmin.church_id });
    }

    toast.success("Admin access updated!");
    setEditingAdmin(null);
    queryClient.invalidateQueries({ queryKey: ["all-admins"] });
  };

  const handleDeleteAdmin = async (targetUserId: string) => {
    const shouldDelete = window.confirm("Delete this admin? THIS CANNOT BE UNDONE. Their login and profile will be permanently removed.");
    if (!shouldDelete) return;

    try {
      const { error } = await supabase.rpc("delete_admin_user", { target_user_id: targetUserId });
      if (error) {
        toast.error(error.message || "Failed to delete admin.");
        return;
      }
      toast.success("Admin successfully deleted.");
      queryClient.invalidateQueries({ queryKey: ["all-admins"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    }
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

  const handleCreateChurch = async () => {
    if (!newChurch.name) {
      toast.error("Church name is required.");
      return;
    }

    const { error } = await supabase.from("churches").insert({
      name: newChurch.name,
      target: newChurch.target,
    });

    if (error) {
      toast.error("Failed to create church.");
      return;
    }

    toast.success("Church created!");
    setIsAddingChurch(false);
    setNewChurch({ name: "", target: 100 });
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
        inviter_id: editingAttendee.inviter_id === "none" ? null : editingAttendee.inviter_id,
        church_id: editingAttendee.church_id,
      })
      .eq("id", editingAttendee.id);

    if (error) {
      toast.error("Failed.");
      return;
    }

    toast.success("Attendee updated!");
    setEditingAttendee(null);
    queryClient.invalidateQueries({ queryKey: ["all-attendees"] });
  };

  const handleCreateAttendee = async () => {
    if (!newAttendee.church_id || !newAttendee.full_name || !newAttendee.phone) {
      toast.error("Church, Name, and Phone are required.");
      return;
    }

    const { error } = await supabase.from("members").insert({
      church_id: newAttendee.church_id,
      full_name: newAttendee.full_name,
      phone: newAttendee.phone,
      email: newAttendee.email || null,
      occupation: newAttendee.occupation || null,
      location: newAttendee.location || null,
      date_of_birth: newAttendee.date_of_birth || null,
      inviter_id: newAttendee.inviter_id === "none" ? null : newAttendee.inviter_id,
      program_id: dashboardProgramId === "all" ? (programs.find((p: any) => p.is_active)?.id || null) : dashboardProgramId,
      confirmed: true, // Auto-confirm
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
      toast.error("Failed.");
      return;
    }

    toast.success("Inviter updated!");
    setEditingInviter(null);
    queryClient.invalidateQueries({ queryKey: ["all-inviters"] });
  };

  const handleCreateInviter = async () => {
    if (!newInviter.church_id || !newInviter.full_name || !newInviter.phone || !newInviter.email) {
      toast.error("Church, Name, Email, and Phone are required.");
      return;
    }

    const { error } = await supabase.from("inviters").insert({
      church_id: newInviter.church_id,
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
    setNewInviter({ church_id: "", full_name: "", phone: "", email: "" });
    queryClient.invalidateQueries({ queryKey: ["all-inviters"] });
  };

  const openEmailModal = (recipients: any[]) => {
    // Only extract valid emails to send to, but do not block the modal from opening.
    const validEmails = recipients.map(r => r.email).filter(e => e && e.trim() !== "");
    setEmailRecipients(validEmails);
    setEmailSubject("");
    setEmailBody("");
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailSubject || !emailBody) {
      toast.error("Subject and message are required.");
      return;
    }

    setIsSendingEmail(true);
    try {
      // 1. Direct Frontend Fetch to our Secure Vercel Backend Proxy

      const response = await fetch("/api/send_prayer_mail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Answered Prayer Hub",
          to: emailRecipients, // Handled automatically by our Gmail SMTP proxy
          subject: emailSubject,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Inter', Helvetica, Arial, sans-serif;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
                <tr>
                  <td align="center">
                    <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 40px 30px; text-align: center;">
                          <img src="https://answered-prayer-hub.web.app/logo.png" alt="100% Answered Prayer" style="max-height: 80px; width: auto; margin: 0 auto; display: block;" onerror="this.src='https://placehold.co/100x100/1e1b4b/D4AF37?text=AP'" />
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 40px 30px;">
                          <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">${emailSubject}</h2>
                          <div style="color: #4b5563; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${emailBody}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
        }),
      });

      let rawResponse = await response.text();
      let data;
      try {
        data = JSON.parse(rawResponse);
      } catch (e) {
        throw new Error(`Server returned non-JSON format: ${rawResponse.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(data.message || data.error?.message || JSON.stringify(data));
      }

      toast.success(`Bulk Email dispatched successfully to ${emailRecipients.length} recipients!`);
      await logAction("send_bulk_email", "system", "multiple", { count: emailRecipients.length, subject: emailSubject });
      setIsEmailModalOpen(false);
    } catch (err: any) {
      toast.error(`Failed to dispatch RPC bulk mail: ${err.message}`);
    } finally {
      setIsSendingEmail(false);
    }
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

  const handleCreateTestimonial = async () => {
    const { error } = await supabase.from("testimonials").insert([{ ...newTestimonial }]);
    if (error) { toast.error("Failed to add testimonial"); return; }
    toast.success("Testimonial added");
    setIsAddingTestimonial(false);
    setNewTestimonial({ author_name: "", church_name: "", content: "", is_approved: true });
    queryClient.invalidateQueries({ queryKey: ["live-testimonials"] });
  };

  const handleUpdateTestimonial = async () => {
    if (!editingTestimonial) return;
    const { error } = await supabase.from("testimonials").update({
      author_name: editingTestimonial.author_name,
      church_name: editingTestimonial.church_name,
      content: editingTestimonial.content,
      is_approved: editingTestimonial.is_approved
    }).eq("id", editingTestimonial.id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Testimonial updated");
    setEditingTestimonial(null);
    queryClient.invalidateQueries({ queryKey: ["live-testimonials"] });
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!window.confirm("Delete testimonial? THIS CANNOT BE UNDONE.")) return;
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) { toast.error("Failed to delete testimonial."); return; }
    toast.success("Testimonial deleted.");
    queryClient.invalidateQueries({ queryKey: ["live-testimonials"] });
  };

  const handleUploadResource = async (file: File) => {
    if (!file) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `resources/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('resources')
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Failed to upload file");
      throw uploadError;
    }

    return { fileName, filePath, fileSize: file.size, mimeType: file.type };
  };

  const handleCreateResource = async () => {
    if (!newResource.title) {
      toast.error("Title is required.");
      return;
    }

    const fileInput = document.getElementById('resource-file') as HTMLInputElement;
    if (!fileInput?.files?.[0]) {
      toast.error("Please select a file to upload.");
      return;
    }

    setUploadingFile(true);
    try {
      const fileData = await handleUploadResource(fileInput.files[0]);

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("resources").insert({
        ...newResource,
        file_name: fileData.fileName,
        file_path: fileData.filePath,
        file_size: fileData.fileSize,
        mime_type: fileData.mimeType,
        file_type: getFileType(fileData.mimeType),
        uploaded_by: user?.id,
      });

      if (error) throw error;

      toast.success("Resource uploaded successfully!");
      setIsAddingResource(false);
      setNewResource({ title: "", description: "", category: "general", is_public: true });
      if (fileInput) fileInput.value = "";
      queryClient.invalidateQueries({ queryKey: ["all-resources"] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to create resource.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSaveResource = async () => {
    if (!editingResource) return;

    const { error } = await supabase.from("resources").update({
      title: editingResource.title,
      description: editingResource.description,
      category: editingResource.category,
      is_public: editingResource.is_public,
    }).eq("id", editingResource.id);

    if (error) { toast.error("Failed to update resource."); return; }
    toast.success("Resource updated!");
    setEditingResource(null);
    queryClient.invalidateQueries({ queryKey: ["all-resources"] });
    queryClient.invalidateQueries({ queryKey: ["resources"] });
  };

  const handleDeleteResource = async (id: string) => {
    if (!window.confirm("Delete resource? This will also delete the file from storage. THIS CANNOT BE UNDONE.")) return;

    // First get the resource to know the file path
    const { data: resource } = await supabase.from("resources").select("file_path").eq("id", id).single();

    if (resource) {
      // Delete from storage
      await supabase.storage.from('resources').remove([resource.file_path]);
    }

    // Delete from database
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) { toast.error("Failed to delete resource."); return; }
    toast.success("Resource deleted.");
    queryClient.invalidateQueries({ queryKey: ["all-resources"] });
    queryClient.invalidateQueries({ queryKey: ["resources"] });
  };

  const getFileType = (mimeType: string) => {
    if (mimeType.startsWith('application/pdf')) return 'pdf';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('image/')) return 'image';
    return 'document';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "churches", label: "Manage Churches", icon: Church },
    { id: "admins", label: "Manage Admins", icon: Shield },
    { id: "inviters", label: "Manage Inviters", icon: UserCheck },
    { id: "attendees", label: "Manage Attendees", icon: Users },
    { id: "leaderboard", label: "Leaderboards", icon: Trophy },
    { id: "testimonials", label: "Manage Testimonials", icon: MessageCircle },
    { id: "resources", label: "Manage Resources", icon: Download },
    { id: "programs", label: "Events & Locations", icon: Calendar },
    { id: "bus-points", label: "Bus Routes", icon: Bus },
    { id: "prayer-points", label: "Prayer Requests", icon: Heart },
    { id: "live-analytics", label: "Live Analytics", icon: Activity },
    { id: "audit_logs", label: "Audit Logs", icon: History },
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
    <div className="h-screen bg-background flex">
      <aside className={`${sidebarOpen ? "w-64" : "w-0 overflow-hidden"} bg-gradient-navy text-primary-foreground transition-all duration-300 flex flex-col fixed lg:relative h-full z-40 top-0 left-0`}>
        <div className="p-5 border-b border-gold/10">
          <img src={logo} alt="100% Answered Prayer" className="w-28 mb-2" />
          <p className="text-xs text-primary-foreground/50 font-body mt-1">Super Admin</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto max-h-screen">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-body text-sm transition-colors ${activeTab === item.id ? "bg-gold/15 text-gold" : "text-primary-foreground/60 hover:bg-navy-light/50"
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
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <h1 className="font-display font-bold text-lg capitalize">{activeTab.replace("-", " ")}</h1>
          </div>
          <div className="flex items-center gap-4">
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
            <NotificationsMenu logs={auditLogs} isLoading={!auditLogs.length && authLoading} />
          </div>
        </header>

        <div className="p-4 md:p-6 max-w-7xl">
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fade-up">
              {/* Top Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                {[
                  { label: "Total Attendees", value: attendees.length, icon: Users },
                  { label: "Pending", value: pendingTotal, icon: Target },
                  { label: "Conversion Rate", value: `${overallConversionRate}%`, icon: Activity },
                  { label: "Total Inviters", value: inviters.length, icon: UserCheck },
                  { label: "Churches", value: churches.length, icon: Church },
                  { label: "Unassigned Admins", value: unassignedAdmins, icon: Shield },
                ].map((s, idx) => (
                  <Card key={idx} className="border-border/50">
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

              {/* Streaming Settings Area */}
              <Card className="border-border/50 border-gold/30 bg-gold/5">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-gold" /> Live Stream Configuration
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{liveStreamSettings?.is_active ? "🟢 Stream is Live" : "⚫ Stream is Offline"}</span>
                      <Switch
                        checked={liveStreamSettings?.is_active || false}
                        onCheckedChange={handleToggleStream}
                      />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                    <div className="flex-1 space-y-2 w-full">
                      <Label htmlFor="stream_url">Stream URL (YouTube/Vimeo Embed or Link)</Label>
                      {isEditingStream ? (
                        <Input
                          id="stream_url"
                          value={streamUrl}
                          onChange={(e) => setStreamUrl(e.target.value)}
                          placeholder="e.g. https://www.youtube.com/embed/xxxxx"
                        />
                      ) : (
                        <div className="text-sm font-mono bg-background/50 p-2 rounded border border-border/50 truncate">
                          {liveStreamSettings?.url || "No URL configured"}
                        </div>
                      )}
                    </div>
                    {isEditingStream ? (
                      <div className="flex gap-2">
                        <Button onClick={handleSaveStreamUrl} className="bg-gold text-navy hover:bg-gold-light">Save</Button>
                        <Button variant="outline" onClick={() => { setIsEditingStream(false); setStreamUrl(liveStreamSettings?.url || ""); }}>Cancel</Button>
                      </div>
                    ) : (
                      <Button variant="secondary" onClick={() => setIsEditingStream(true)} className="gap-2">
                        <Pencil className="w-4 h-4" /> Edit URL
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Analytics Section 1: Growth & Top Locations */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="border-border/50 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-gold" /> Attendeeship Growth
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyGrowth} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: "DM Sans" }} />
                          <YAxis tick={{ fontSize: 12, fontFamily: "DM Sans" }} />
                          <Tooltip contentStyle={{ fontFamily: "DM Sans", borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                          <Legend wrapperStyle={{ fontSize: 13, fontFamily: 'DM Sans', paddingTop: 10 }} />
                          <Line type="monotone" name="Total Invites" dataKey="attendees" stroke="hsl(var(--gold-dark))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line type="monotone" name="Confirmed" dataKey="confirmed" stroke="hsl(var(--success))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-gold" /> Top Locations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={geographicDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {geographicDistribution.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={GOLD_COLORS[index % GOLD_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontFamily: "DM Sans", borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                          <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'DM Sans' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Analytics Section 2: Church Progress */}
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="font-display text-lg">Church Progress against Targets</CardTitle>
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
                    className="w-48"
                  />
                  <Button size="sm" onClick={() => setIsAddingChurch(true)} className="gap-2 bg-gradient-gold text-accent-foreground hover:opacity-90">
                    Add Church
                  </Button>
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
                        <TableHead className="text-center">Attendees</TableHead>
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
                          <TableCell className="text-center">{c.attendees}</TableCell>
                          <TableCell className="text-center"><Badge className="bg-success/10 text-success border-0">{c.confirmed}</Badge></TableCell>
                          <TableCell className="text-center">
                            <Badge variant={c.confirmed >= c.target ? "default" : "secondary"}>
                              {Math.round((c.confirmed / c.target) * 100)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center space-x-1">
                            <Button size="sm" variant="ghost" onClick={() => setEditingChurch({ id: c.id, name: c.name, target: c.target })}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteChurch(c.id)}>
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
                        <TableHead className="text-center">Actions</TableHead>
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
                            <TableCell className="text-center space-x-1">
                              <Button size="sm" variant="ghost" onClick={() => setEditingAdmin({ ...a, church_id: a.church_id || "none", original_church_id: a.church_id, is_super: isSuperAdmin, original_is_super: isSuperAdmin })}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {!isSuperAdmin && (
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteAdmin(a.user_id)}>
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              )}
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
                    className="w-48"
                  />
                  <Select value={inviterChurchFilter} onValueChange={setInviterChurchFilter}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="All Churches" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Churches</SelectItem>
                      {churches.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => setIsAddingInviter(true)} className="gap-2 bg-gradient-gold text-accent-foreground hover:opacity-90">
                    Add Inviter
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEmailModal(filteredInviters)} className="gap-2 text-indigo-500 border-indigo-200 hover:bg-indigo-50">
                    <Mail className="h-4 w-4" /> Email All
                  </Button>
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
                          <TableCell className="text-center"><Badge variant="secondary">{inv.real_invite_count}</Badge></TableCell>
                          <TableCell className="text-center"><Badge className="bg-success/10 text-success border-0">{inv.real_confirmed_count}</Badge></TableCell>
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
            <div className="animate-fade-up space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display font-bold text-lg">All Attendees ({filteredAttendees.length})</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={attendeeSearch}
                    onChange={(e) => setAttendeeSearch(e.target.value)}
                    placeholder="Search attendee... (Name, Church, Inviter)"
                    className="w-56"
                  />
                  <Select value={attendeeChurchFilter} onValueChange={setAttendeeChurchFilter}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="All Churches" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Churches</SelectItem>
                      {churches.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => setIsAddingAttendee(true)} className="gap-2 bg-gradient-gold text-accent-foreground hover:opacity-90">
                    Add Attendee
                  </Button>
                  <Button size="sm" onClick={() => navigate("/admin/scanner")} className="gap-2 bg-indigo-500 text-white hover:bg-indigo-600">
                    <MapPin className="w-4 h-4" /> QR Scanner
                  </Button>
                  <Button variant={attendeeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setAttendeeFilter("all")}>All</Button>
                  <Button variant={attendeeFilter === "confirmed" ? "default" : "outline"} size="sm" onClick={() => setAttendeeFilter("confirmed")}>Confirmed</Button>
                  <Button variant={attendeeFilter === "pending" ? "default" : "outline"} size="sm" onClick={() => setAttendeeFilter("pending")}>Pending</Button>
                  <Button variant="outline" size="sm" onClick={() => exportCSV(filteredAttendees as any, "attendees")} className="gap-2">
                    <Download className="h-4 w-4" /> CSV
                  </Button>
                </div>
              </div>

              {selectedAttendees.size > 0 && (
                <div className="bg-muted border border-border/50 rounded-lg p-3 flex items-center justify-between animate-fade-in shadow-sm">
                  <span className="text-sm font-medium">{selectedAttendees.size} attendees selected</span>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedAttendees(new Set())}>Clear Selection</Button>
                    <Button size="sm" variant="outline" onClick={() => openEmailModal(
                      attendees.filter(m => selectedAttendees.has(m.id))
                    )} className="text-indigo-500 border-indigo-200 hover:bg-indigo-50"><Mail className="h-4 w-4 mr-2" /> Email Selected</Button>
                    <Button size="sm" onClick={handleBulkConfirm} className="bg-success text-success-foreground hover:bg-success/90">Confirm Selected</Button>
                    <Button size="sm" variant="destructive" onClick={handleBulkDelete}>Delete Selected</Button>
                  </div>
                </div>
              )}

              <Card className="border-border/50">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={paginatedAttendees.length > 0 && paginatedAttendees.every(m => selectedAttendees.has(m.id))}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedAttendees);
                              if (checked) {
                                paginatedAttendees.forEach(m => newSet.add(m.id));
                              } else {
                                paginatedAttendees.forEach(m => newSet.delete(m.id));
                              }
                              setSelectedAttendees(newSet);
                            }}
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Church</TableHead>
                        <TableHead>Invited By</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Check-In</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAttendees.map(m => (
                        <TableRow key={m.id} className={selectedAttendees.has(m.id) ? "bg-muted/50" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={selectedAttendees.has(m.id)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedAttendees);
                                if (checked) newSet.add(m.id);
                                else newSet.delete(m.id);
                                setSelectedAttendees(newSet);
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{m.full_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{(m.churches as any)?.name || ""}</TableCell>
                          <TableCell className="text-sm">{(m.inviters as any)?.full_name || "—"}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={m.confirmed ? "bg-success/10 text-success border-0 hover:bg-success/20 transition-colors" : "bg-muted text-muted-foreground border-0"}>
                              {m.confirmed ? "Confirmed" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={m.checked_in ? "bg-blue-600 text-white border-0" : "bg-muted text-muted-foreground border-0"}>
                              {m.checked_in ? "Checked In" : "Absent"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center space-x-1">
                            <Button size="sm" variant="ghost" onClick={() => setViewingAttendee(m)}>
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
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

                  {/* Pagination Controls */}
                  {totalAttendeePages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-border/50">
                      <p className="text-sm text-muted-foreground">
                        Showing {(attendeePage - 1) * itemsPerPage + 1} to {Math.min(attendeePage * itemsPerPage, filteredAttendees.length)} of {filteredAttendees.length}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAttendeePage(p => Math.max(1, p - 1))}
                          disabled={attendeePage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm font-medium px-2">Page {attendeePage} of {totalAttendeePages}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAttendeePage(p => Math.min(totalAttendeePages, p + 1))}
                          disabled={attendeePage === totalAttendeePages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "testimonials" && (
            <div className="animate-fade-up space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display font-bold text-lg">Manage Testimonials</h2>
                <Button size="sm" onClick={() => setIsAddingTestimonial(true)} className="gap-2 bg-gradient-gold text-accent-foreground hover:opacity-90">
                  Add Testimonial
                </Button>
              </div>
              <Card className="border-border/50">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Author</TableHead>
                        <TableHead>Church</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testimonials.map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium whitespace-nowrap">{t.author_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{t.church_name || "—"}</TableCell>
                          <TableCell className="text-sm max-w-sm truncate" title={t.content}>
                            {t.content}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={t.is_approved ? "bg-success/10 text-success border-0" : "bg-muted text-muted-foreground border-0"}>
                              {t.is_approved ? "Approved" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center space-x-1 whitespace-nowrap">
                            <Button size="sm" variant="ghost" onClick={() => setEditingTestimonial(t)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteTestimonial(t.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {testimonials.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No testimonials found. Add one to show on the carousel.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "resources" && (
            <div className="animate-fade-up space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display font-bold text-lg">Manage Resources</h2>
                <div className="flex items-center gap-2">
                  <Input
                    value={resourceSearch}
                    onChange={(e) => setResourceSearch(e.target.value)}
                    placeholder="Search resources..."
                    className="w-48"
                  />
                  <Select value={resourceCategoryFilter} onValueChange={setResourceCategoryFilter}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="All Categories" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="prayer_guide">Prayer Guide</SelectItem>
                      <SelectItem value="study_material">Study Material</SelectItem>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="testimony">Testimony</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => setIsAddingResource(true)} className="gap-2 bg-gradient-gold text-accent-foreground hover:opacity-90">
                    Upload Resource
                  </Button>
                </div>
              </div>
              <Card className="border-border/50">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Downloads</TableHead>
                        <TableHead className="text-center">Public</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resources
                        .filter(r =>
                          (resourceCategoryFilter === "all" || r.category === resourceCategoryFilter) &&
                          (resourceSearch === "" || r.title.toLowerCase().includes(resourceSearch.toLowerCase()) || r.description.toLowerCase().includes(resourceSearch.toLowerCase()))
                        )
                        .map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">
                              <div>
                                <div className="font-medium">{r.title}</div>
                                {r.description && <div className="text-sm text-muted-foreground truncate max-w-xs">{r.description}</div>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {r.file_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="capitalize">{r.category.replace('_', ' ')}</TableCell>
                            <TableCell>{formatFileSize(r.file_size)}</TableCell>
                            <TableCell className="text-center">{r.download_count}</TableCell>
                            <TableCell className="text-center">
                              <Badge className={r.is_public ? "bg-success/10 text-success border-0" : "bg-muted text-muted-foreground border-0"}>
                                {r.is_public ? "Yes" : "No"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center space-x-1 whitespace-nowrap">
                              <Button size="sm" variant="ghost" onClick={() => window.open(`${supabase.supabaseUrl}/storage/v1/object/public/resources/${r.file_path}`, '_blank')}>
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingResource(r)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteResource(r.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      {resources.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No resources uploaded yet. Upload your first resource to get started.
                          </TableCell>
                        </TableRow>
                      )}
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
                  <CardTitle className="font-display text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-gold" /> Church Health & Conversion
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={churchLeaderboard} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: "DM Sans" }} />
                        <YAxis tick={{ fontSize: 12, fontFamily: "DM Sans" }} />
                        <Tooltip
                          contentStyle={{ fontFamily: "DM Sans", borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                          formatter={(value, name) => [value, name === 'confirmed' ? 'Confirmed' : 'Pending']}
                        />
                        <Legend wrapperStyle={{ fontFamily: "DM Sans", fontSize: "12px", paddingTop: "10px" }} />
                        <Bar dataKey="confirmed" stackId="a" fill="hsl(var(--success))" name="Confirmed" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="pending" stackId="a" fill="hsl(var(--destructive))" name="Pending" radius={[4, 4, 0, 0]} />
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
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm ${idx === 0 ? "bg-gradient-gold text-accent-foreground" :
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
                { label: "Export Attendees", desc: "All attendee records", onClick: () => exportCSV(attendees as any, "all-attendees") },
                { label: "Export Inviters", desc: "All inviter records", onClick: () => exportCSV(inviters as any, "all-inviters") },
                { label: "Export Churches", desc: "All church data", onClick: () => exportCSV(churches as any, "churches") },
                { label: "Export Admins", desc: "All admin accounts", onClick: () => exportCSV(admins as any, "admins") },
                { label: "Export Live Viewers", desc: "Online participants", onClick: () => exportCSV(liveParticipants as any, "live-participants") },
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


          {activeTab === "programs" && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-bold text-foreground">Programs & Sessions</h2>
                  <p className="text-muted-foreground font-body">Create events and manage the Active program shown on the website.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={() => setIsAddingProgram(true)} className="bg-gradient-gold text-accent-foreground">
                    <Calendar className="w-4 h-4 mr-2" /> Add Program
                  </Button>
                  {activeProgram ? (
                    <Button variant="outline" onClick={handleDeactivateAllPrograms} className="text-destructive border-destructive/30">
                      Deactivate All
                    </Button>
                  ) : (
                    <Badge variant="outline">No Active Program</Badge>
                  )}
                </div>
              </div>

              <Card className="bg-card/40 backdrop-blur-xl border-border/50">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Program Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {programs.map((prog: any) => (
                        <TableRow key={prog.id} className={prog.is_active ? "bg-gold/10" : ""}>
                          <TableCell className="font-medium text-foreground">{prog.name}</TableCell>
                          <TableCell className="text-muted-foreground truncate max-w-[150px]">{prog.location_name}</TableCell>
                          <TableCell>{prog.start_date || "TBD"}</TableCell>
                          <TableCell>
                            {prog.is_active ? (
                              <Badge className="bg-green-500 hover:bg-green-600">Active Online</Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {!prog.is_active && (
                              <Button variant="outline" size="sm" onClick={() => handleSetProgramActive(prog.id)} className="text-green-500 border-green-500/30 hover:bg-green-500/10">
                                Set Active
                              </Button>
                            )}
                            {prog.is_active ? (
                              <Button variant="secondary" size="sm" onClick={() => handleMarkProgramCompleted(prog.id)}>
                                Mark Completed
                              </Button>
                            ) : null}
                            <Button variant="outline" size="sm" onClick={() => setEditingProgram(prog)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteProgram(prog.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {programs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No programs configured.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Dialog open={isAddingProgram || !!editingProgram} onOpenChange={(open) => {
                if (!open) { setIsAddingProgram(false); setEditingProgram(null); }
              }}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingProgram ? "Edit Program" : "Add Program"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Program Name</Label>
                      <Input
                        placeholder="e.g. 100% Answered Prayer - April 2026"
                        value={editingProgram ? editingProgram.name : newProgram.name}
                        onChange={e => editingProgram ? setEditingProgram({ ...editingProgram, name: e.target.value }) : setNewProgram({ ...newProgram, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location Name</Label>
                      <Input
                        placeholder="e.g. Prampram, Ghana"
                        value={editingProgram ? editingProgram.location_name : newProgram.location_name}
                        onChange={e => editingProgram ? setEditingProgram({ ...editingProgram, location_name: e.target.value }) : setNewProgram({ ...newProgram, location_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Map Iframe URL</Label>
                      <Textarea
                        placeholder="URL from Google Maps Embed (src attribute only)"
                        value={editingProgram ? editingProgram.map_iframe_url : newProgram.map_iframe_url}
                        onChange={e => editingProgram ? setEditingProgram({ ...editingProgram, map_iframe_url: e.target.value }) : setNewProgram({ ...newProgram, map_iframe_url: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={editingProgram ? editingProgram.start_date : newProgram.start_date}
                        onChange={e => editingProgram ? setEditingProgram({ ...editingProgram, start_date: e.target.value }) : setNewProgram({ ...newProgram, start_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setIsAddingProgram(false); setEditingProgram(null); }}>Cancel</Button>
                    <Button onClick={editingProgram ? handleSaveProgram : handleCreateProgram} className="bg-gold text-accent-foreground">
                      {editingProgram ? "Save" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}


          {activeTab === "live-analytics" && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-bold text-foreground">Live Stream Analytics</h2>
                  <p className="text-muted-foreground font-body">Monitor real-time viewer presence and moderate the live chat.</p>
                </div>
                <div className="flex items-center gap-2 bg-gold/10 px-4 py-2 rounded-lg border border-gold/20">
                  <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                  <div className="text-left">
                    <div className="font-bold text-gold-light">{liveViewers} Active Viewers</div>
                    <div className="text-xs text-muted-foreground">Total joined: {totalJoins} • Left: {totalLeaves} • Unique: {uniqueViewerIds.size}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="col-span-1 lg:col-span-2 bg-card/40 backdrop-blur-xl border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-gold" /> Live Chat Feed</CardTitle>
                    <div className="ml-auto">
                      <Button onClick={() => exportLiveAnalytics()} size="sm" className="ml-2">Export</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[600px] overflow-y-auto pr-4 space-y-4 custom-scrollbar">
                      {liveChats.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">No messages in the chat yet.</div>
                      ) : (
                        liveChats.map((chat) => (
                          <div key={chat.id} className={`p-4 rounded-xl border transition-colors ${chat.is_deleted ? 'bg-destructive/10 border-destructive/20 opacity-50' : 'bg-background/50 border-border/50 hover:border-gold/30'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gold-light">{chat.user_name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(chat.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteChat(chat.id, chat.is_deleted)}
                                className={chat.is_deleted ? "text-green-500 hover:text-green-400 hover:bg-green-500/10" : "text-destructive hover:bg-destructive/10"}
                              >
                                {chat.is_deleted ? "Restore" : "Delete"}
                              </Button>
                            </div>
                            <p className="text-foreground font-body">{chat.message}</p>
                            {chat.is_deleted && <span className="text-xs text-destructive font-bold mt-2 block">This message is hidden from public view.</span>}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card className="bg-card/40 backdrop-blur-xl border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Stream Health</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                        <span className="text-muted-foreground">Chat Velocity</span>
                        <span className="font-bold">{liveChats.filter(c => new Date(c.created_at).getTime() > Date.now() - 60000).length} msgs/min</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                        <span className="text-muted-foreground">Total Messages</span>
                        <span className="font-bold">{liveChats.length}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                        <span className="text-muted-foreground">Status</span>
                        <Badge className={liveStreamSettings?.is_active ? "bg-green-500" : "bg-destructive"}>
                          {liveStreamSettings?.is_active ? "Broadcasting" : "Offline"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/40 backdrop-blur-xl border-border/50 h-[320px] flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-lg">Online Viewers</CardTitle>
                      <Badge className="bg-gold/20 text-gold-light">{liveParticipants.length}</Badge>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                      <div className="space-y-3">
                        {liveParticipants.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No online viewers registered yet.</p>
                        ) : (
                          liveParticipants.map((p: any) => (
                            <div key={p.viewer_key} className="flex justify-between items-start border-b border-border/40 pb-2">
                              <div>
                                <p className="font-bold text-sm text-foreground">{p.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{p.contact || "N/A"}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
                                  <MapPin className="w-3 h-3" /> {p.location || "Unknown"}
                                </p>
                                <p className="text-[10px] text-muted-foreground/50 mt-1">
                                  {new Date(p.created_at).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/40 backdrop-blur-xl border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Viewer Retention (Samples)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {presenceSamples.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No samples recorded yet.</div>
                      ) : (
                        <div style={{ width: '100%', height: 180 }}>
                          <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={presenceSamples.map((s: any) => ({
                              recorded_at: s.recorded_at,
                              count: s.count
                            }))}>
                              <XAxis dataKey="recorded_at" tickFormatter={(d) => {
                                try { return format(parseISO(String(d)), 'HH:mm'); } catch { return String(d); }
                              }} />
                              <YAxis allowDecimals={false} />
                              <Tooltip labelFormatter={(v) => {
                                try { return format(parseISO(String(v)), 'yyyy-MM-dd HH:mm:ss'); } catch { return String(v); }
                              }} />
                              <Line type="monotone" dataKey="count" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="bg-card/40 backdrop-blur-xl border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Suggestions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                        <li>Viewer retention graph (1-minute intervals) — capture presence counts periodically.</li>
                        <li>Peak concurrent viewers with timestamps.</li>
                        <li>Sentiment analysis on chat messages (quick score) for moderation insights.</li>
                        <li>Export full session logs (chat + presence events) for external analysis.</li>
                        <li>Allow CSV/JSON webhook export to analytics provider.</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {activeTab === "bus-points" && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-bold text-foreground">Bus Routes</h2>
                  <p className="text-muted-foreground font-body">Manage free bus services for attendees. These attach to the active program.</p>
                </div>
                <Button onClick={() => setIsAddingBusPoint(true)} className="bg-gradient-gold text-accent-foreground">
                  <Bus className="w-4 h-4 mr-2" /> Add Bus Route
                </Button>
              </div>

              <Card className="bg-card/40 backdrop-blur-xl border-border/50">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Program</TableHead>
                        <TableHead>Target Area</TableHead>
                        <TableHead>Location Details</TableHead>
                        <TableHead>Departure</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {busPoints.map((bp: any) => {
                        const progName = programs.find((p: any) => p.id === bp.program_id)?.name || "Unknown";
                        return (
                          <TableRow key={bp.id}>
                            <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate" title={progName}>{progName}</TableCell>
                            <TableCell className="font-medium text-foreground">{bp.name}</TableCell>
                            <TableCell className="text-muted-foreground">{bp.location}</TableCell>
                            <TableCell>{bp.departure_time}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button variant="outline" size="sm" onClick={() => setEditingBusPoint(bp)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteBusPoint(bp.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {busPoints.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No bus routes configured.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Dialog open={isAddingBusPoint || !!editingBusPoint} onOpenChange={(open) => {
                if (!open) { setIsAddingBusPoint(false); setEditingBusPoint(null); }
              }}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingBusPoint ? "Edit Bus Route" : "Add Bus Route"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Program</Label>
                      <Select
                        value={editingBusPoint ? editingBusPoint.program_id : newBusPoint.program_id || programs[0]?.id}
                        onValueChange={v => editingBusPoint ? setEditingBusPoint({ ...editingBusPoint, program_id: v }) : setNewBusPoint({ ...newBusPoint, program_id: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select Program" /></SelectTrigger>
                        <SelectContent>
                          {programs.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Route/Region Name</Label>
                      <Select
                        value={editingBusPoint ? editingBusPoint.name : newBusPoint.name}
                        onValueChange={v => editingBusPoint ? setEditingBusPoint({ ...editingBusPoint, name: v }) : setNewBusPoint({ ...newBusPoint, name: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select Region/Route" /></SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                          {[
                            "Ahafo Region", "Ashanti Region", "Bono Region", "Bono East Region",
                            "Central Region", "Eastern Region", "Greater Accra Region", "North East Region",
                            "Northern Region", "Oti Region", "Savannah Region", "Upper East Region",
                            "Upper West Region", "Volta Region", "Western Region", "Western North Region",
                            "International Route", "Other Route"
                          ].map(region => (
                            <SelectItem key={region} value={region}>{region}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Exact Pickup Location</Label>
                      <Textarea
                        placeholder="e.g. Accra Mall Parking Lot"
                        value={editingBusPoint ? editingBusPoint.location : newBusPoint.location}
                        onChange={e => editingBusPoint ? setEditingBusPoint({ ...editingBusPoint, location: e.target.value }) : setNewBusPoint({ ...newBusPoint, location: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Departure Time</Label>
                      <Input
                        type="time"
                        value={editingBusPoint ? editingBusPoint.departure_time : newBusPoint.departure_time}
                        onChange={e => editingBusPoint ? setEditingBusPoint({ ...editingBusPoint, departure_time: e.target.value }) : setNewBusPoint({ ...newBusPoint, departure_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setIsAddingBusPoint(false); setEditingBusPoint(null); }}>Cancel</Button>
                    <Button onClick={editingBusPoint ? handleSaveBusPoint : handleCreateBusPoint} className="bg-gold text-accent-foreground">
                      {editingBusPoint ? "Save" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}


          {activeTab === "prayer-points" && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-bold text-foreground">Prayer Requests</h2>
                  <p className="text-muted-foreground font-body">Review and manage submitted prayer points from attendees.</p>
                </div>
                <Button variant="outline" onClick={() => exportCSV(prayerPoints as any, "prayer_requests")} className="gap-2">
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
              </div>

              <Card className="bg-card/40 backdrop-blur-xl border-border/50">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Submitter</TableHead>
                        <TableHead>Event Program</TableHead>
                        <TableHead>Prayer Request</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prayerPoints.map((pp: any) => (
                        <TableRow key={pp.id}>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(pp.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium text-foreground">{pp.name || "Anonymous"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{(pp.programs as any)?.name || "All Sessions"}</TableCell>
                          <TableCell className="max-w-md">
                            <p className="text-sm font-body truncate">{pp.request}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={pp.status === "prayed_for" ? "default" : "outline"} className={pp.status === "prayed_for" ? "bg-green-600" : "text-yellow-600 border-yellow-600"}>
                              {pp.status === "prayed_for" ? "Prayed For" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleTogglePrayerPointStatus(pp.id, pp.status || 'pending')} className="h-8">
                                {pp.status === "prayed_for" ? "Revert" : "Mark Prayed"}
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeletePrayerPoint(pp.id)} className="h-8 w-8 p-0">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {prayerPoints.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No prayer requests submitted yet.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "audit_logs" && (
            <div className="animate-fade-up space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display font-bold text-lg">System Audit Logs</h2>
                <Button variant="outline" size="sm" onClick={() => exportCSV(auditLogs as any, "audit_logs")} className="gap-2">
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
              </div>
              <Card className="border-border/50">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date / Time</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Action Taken</TableHead>
                        <TableHead>Target Type</TableHead>
                        <TableHead>Target ID</TableHead>
                        <TableHead className="w-48">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAudit.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            <span className="font-medium text-muted-foreground">
                              {log.created_at ? format(new Date(log.created_at), "MMM d, yyyy") : "Unknown"}
                            </span>
                            <br />
                            <span className="text-xs text-muted-foreground/70">
                              {log.created_at ? format(new Date(log.created_at), "h:mm a") : ""}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{log.profiles?.full_name || "Unknown"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {log.action.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize text-sm">{log.target_type.replace(/_/g, " ")}</TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[120px]" title={log.target_id}>
                            {log.target_id || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {log.details ? JSON.stringify(log.details) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {auditLogs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No recent audit logs available.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {auditTotalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-border/50 bg-card/30">
                      <Button variant="outline" size="sm" onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage === 1}>Previous</Button>
                      <span className="text-sm text-muted-foreground font-medium">Page {auditPage} of {auditTotalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))} disabled={auditPage === auditTotalPages}>Next</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <Dialog open={!!viewingAttendee} onOpenChange={open => !open && setViewingAttendee(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display text-xl">Attendee Details</DialogTitle></DialogHeader>
          {viewingAttendee && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div>
                  <h3 className="text-2xl font-bold font-display">{viewingAttendee.full_name}</h3>
                  <p className="text-muted-foreground">{viewingAttendee.churches?.name || "No Church Assigned"}</p>
                </div>
                <Badge className={viewingAttendee.confirmed ? "bg-success/10 text-success border-0" : "bg-muted text-muted-foreground border-0"}>
                  {viewingAttendee.confirmed ? "Confirmed" : "Pending"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Phone Number</p>
                  <a
                    href={`https://wa.me/${viewingAttendee.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 font-medium hover:text-green-500 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" /> {viewingAttendee.phone}
                  </a>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Email</p>
                  <p className="font-medium">{viewingAttendee.email || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Occupation</p>
                  <p className="font-medium">{viewingAttendee.occupation || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Location</p>
                  <p className="font-medium">{viewingAttendee.location || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Date of Birth</p>
                  <p className="font-medium">{viewingAttendee.date_of_birth ? format(new Date(viewingAttendee.date_of_birth), "PPP") : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Invited By</p>
                  <p className="font-medium">{viewingAttendee.inviters?.full_name || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Registered On</p>
                  <p className="font-medium">{format(new Date(viewingAttendee.created_at), "PPP 'at' p")}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingAttendee(null)} className="w-full">Close Modal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingAdmin} onOpenChange={open => !open && setEditingAdmin(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Manage Admin Access</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground mb-4">
            <p>Update assigning churches or grant global Super Admin access for <strong>{editingAdmin?.full_name}</strong>.</p>
          </div>
          {editingAdmin && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Assigned Church</Label>
                <Select value={editingAdmin.church_id} onValueChange={(val) => setEditingAdmin((p: any) => ({ ...p, church_id: val }))}>
                  <SelectTrigger><SelectValue placeholder="Select church" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Church (Unassigned)</SelectItem>
                    {churches.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">If unassigned, they cannot view specific church attendee records.</p>
              </div>

              <div className="flex items-center space-x-3 border p-4 rounded-lg bg-muted/30">
                <Checkbox
                  id="super-admin-cb"
                  checked={editingAdmin.is_super}
                  onCheckedChange={(checked) => setEditingAdmin((p: any) => ({ ...p, is_super: !!checked }))}
                />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="super-admin-cb" className="font-bold text-gold">Grant Super Admin Rights</Label>
                  <p className="text-xs text-muted-foreground">Allows full access to this entire dashboard, all churches, and all attendees.</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditingAdmin(null)}>Cancel</Button>
            <Button onClick={handleSaveAdmin} className="bg-gradient-gold text-accent-foreground hover:opacity-90">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <Dialog open={!!editingAttendee} onOpenChange={open => !open && setEditingAttendee(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Edit Attendee</DialogTitle></DialogHeader>
          {editingAttendee && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Church</Label>
                <Select value={editingAttendee.church_id} onValueChange={(val) => setEditingAttendee((p: any) => ({ ...p, church_id: val }))}>
                  <SelectTrigger><SelectValue placeholder="Select church" /></SelectTrigger>
                  <SelectContent>
                    {churches.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
              <div className="space-y-2">
                <Label>Church</Label>
                <Select value={editingInviter.church_id} onValueChange={(val) => setEditingInviter((p: any) => ({ ...p, church_id: val }))}>
                  <SelectTrigger><SelectValue placeholder="Select church" /></SelectTrigger>
                  <SelectContent>
                    {churches.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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

      <Dialog open={isAddingChurch} onOpenChange={setIsAddingChurch}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Add New Church</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Church Name *</Label><Input value={newChurch.name} onChange={e => setNewChurch((p: any) => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Target *</Label><Input type="number" value={newChurch.target} onChange={e => setNewChurch((p: any) => ({ ...p, target: parseInt(e.target.value) || 0 }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingChurch(false)}>Cancel</Button>
            <Button onClick={handleCreateChurch} className="bg-gradient-gold text-accent-foreground hover:opacity-90">Add Church</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddingAttendee} onOpenChange={setIsAddingAttendee}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Add New Attendee</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Church *</Label>
              <Select value={newAttendee.church_id} onValueChange={(val) => setNewAttendee((p: any) => ({ ...p, church_id: val }))}>
                <SelectTrigger><SelectValue placeholder="Select church" /></SelectTrigger>
                <SelectContent>
                  {churches.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
            <div className="space-y-2">
              <Label>Church *</Label>
              <Select value={newInviter.church_id} onValueChange={(val) => setNewInviter((p: any) => ({ ...p, church_id: val }))}>
                <SelectTrigger><SelectValue placeholder="Select church" /></SelectTrigger>
                <SelectContent>
                  {churches.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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

      <Dialog open={isAddingTestimonial} onOpenChange={setIsAddingTestimonial}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">Add Testimonial</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Author Name *</Label><Input value={newTestimonial.author_name} onChange={e => setNewTestimonial((p: any) => ({ ...p, author_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Church (Optional)</Label><Input value={newTestimonial.church_name} onChange={e => setNewTestimonial((p: any) => ({ ...p, church_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Content *</Label><Textarea value={newTestimonial.content} onChange={e => setNewTestimonial((p: any) => ({ ...p, content: e.target.value }))} /></div>
            <div className="flex items-center space-x-2">
              <Switch id="approved" checked={newTestimonial.is_approved} onCheckedChange={(c) => setNewTestimonial({ ...newTestimonial, is_approved: c })} />
              <Label htmlFor="approved">Approve Immediately</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingTestimonial(false)}>Cancel</Button>
            <Button onClick={handleCreateTestimonial} className="bg-gradient-gold text-accent-foreground hover:opacity-90">Save Testimonial</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTestimonial} onOpenChange={(open) => !open && setEditingTestimonial(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">Edit Testimonial</DialogTitle></DialogHeader>
          {editingTestimonial && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Author Name *</Label><Input value={editingTestimonial.author_name} onChange={e => setEditingTestimonial((p: any) => ({ ...p, author_name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Church</Label><Input value={editingTestimonial.church_name || ""} onChange={e => setEditingTestimonial((p: any) => ({ ...p, church_name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Content *</Label><Textarea value={editingTestimonial.content} onChange={e => setEditingTestimonial((p: any) => ({ ...p, content: e.target.value }))} /></div>
              <div className="flex items-center space-x-2">
                <Switch id="edit-approved" checked={editingTestimonial.is_approved} onCheckedChange={(c) => setEditingTestimonial((p: any) => ({ ...p, is_approved: c }))} />
                <Label htmlFor="edit-approved">Approve to display</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTestimonial(null)}>Cancel</Button>
            <Button onClick={handleUpdateTestimonial} className="bg-gradient-gold text-accent-foreground hover:opacity-90">Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Mail className="h-5 w-5 text-indigo-500" /> Send Email Notification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              {emailRecipients.length > 0 ? (
                <>Sending to <strong>{emailRecipients.length}</strong> recipient(s). (Users without emails were skipped.)</>
              ) : (
                <span className="text-destructive font-bold">Warning: None of the selected users currently have an email address stored in the system. Sending this will do nothing.</span>
              )}
            </div>
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                placeholder="e.g. Welcome to Answered Prayer Hub!"
              />
            </div>
            <div className="space-y-2">
              <Label>Message Body</Label>
              <Textarea
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                placeholder="Type your message here..."
                rows={6}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailModalOpen(false)} disabled={isSendingEmail}>Cancel</Button>
            <Button
              onClick={handleSendEmail}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              disabled={isSendingEmail || emailRecipients.length === 0}
            >
              {isSendingEmail ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* CREATE TESTIMONIAL MODAL */}
      <Dialog open={isAddingTestimonial} onOpenChange={setIsAddingTestimonial}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add Testimonial</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="author" className="font-body font-semibold">Author Name *</Label>
              <Input
                id="author"
                placeholder="e.g. Sarah Jenkins"
                value={newTestimonial.author_name}
                onChange={(e) => setNewTestimonial({ ...newTestimonial, author_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="church" className="font-body font-semibold">Church (Optional)</Label>
              <Input
                id="church"
                placeholder="e.g. Grace Chapel"
                value={newTestimonial.church_name}
                onChange={(e) => setNewTestimonial({ ...newTestimonial, church_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content" className="font-body font-semibold">Testimonial Content *</Label>
              <Textarea
                id="content"
                placeholder="Write the testimony here..."
                value={newTestimonial.content}
                onChange={(e) => setNewTestimonial({ ...newTestimonial, content: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="approved"
                checked={newTestimonial.is_approved}
                onCheckedChange={(checked) => setNewTestimonial({ ...newTestimonial, is_approved: checked })}
              />
              <Label htmlFor="approved" className="font-body">Approve immediately</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingTestimonial(false)} className="font-body">Cancel</Button>
            <Button onClick={handleCreateTestimonial} className="bg-gradient-gold text-accent-foreground font-body hover:opacity-90">
              Save Testimonial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT TESTIMONIAL MODAL */}
      <Dialog open={!!editingTestimonial} onOpenChange={(open) => !open && setEditingTestimonial(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Testimonial</DialogTitle>
          </DialogHeader>
          {editingTestimonial && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-author" className="font-body font-semibold">Author Name *</Label>
                <Input
                  id="edit-author"
                  value={editingTestimonial.author_name}
                  onChange={(e) => setEditingTestimonial({ ...editingTestimonial, author_name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-church" className="font-body font-semibold">Church</Label>
                <Input
                  id="edit-church"
                  value={editingTestimonial.church_name || ""}
                  onChange={(e) => setEditingTestimonial({ ...editingTestimonial, church_name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-content" className="font-body font-semibold">Testimonial Content *</Label>
                <Textarea
                  id="edit-content"
                  value={editingTestimonial.content}
                  onChange={(e) => setEditingTestimonial({ ...editingTestimonial, content: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-approved"
                  checked={editingTestimonial.is_approved}
                  onCheckedChange={(checked) => setEditingTestimonial({ ...editingTestimonial, is_approved: checked })}
                />
                <Label htmlFor="edit-approved" className="font-body">Approved to display</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTestimonial(null)} className="font-body">Cancel</Button>
            <Button onClick={handleUpdateTestimonial} className="bg-gradient-gold text-accent-foreground font-body hover:opacity-90">
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Resource Dialog */}
      <Dialog open={isAddingResource} onOpenChange={setIsAddingResource}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Upload Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={newResource.title}
                onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                placeholder="Resource title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newResource.description}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                placeholder="Brief description (optional)"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newResource.category} onValueChange={(value) => setNewResource({ ...newResource, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="prayer_guide">Prayer Guide</SelectItem>
                  <SelectItem value="study_material">Study Material</SelectItem>
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="testimony">Testimony</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File *</Label>
              <Input
                id="resource-file"
                type="file"
                accept=".pdf,.mp3,.mp4,.avi,.mov,.doc,.docx,.txt,.jpg,.png,.jpeg"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="add-public"
                checked={newResource.is_public}
                onCheckedChange={(checked) => setNewResource({ ...newResource, is_public: checked })}
              />
              <Label htmlFor="add-public" className="font-body">Public (visible to all users)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingResource(false)} className="font-body">Cancel</Button>
            <Button onClick={handleCreateResource} disabled={uploadingFile} className="bg-gradient-gold text-accent-foreground font-body hover:opacity-90">
              {uploadingFile ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Resource Dialog */}
      <Dialog open={!!editingResource} onOpenChange={(open) => !open && setEditingResource(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Resource</DialogTitle>
          </DialogHeader>
          {editingResource && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={editingResource.title}
                  onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                  placeholder="Resource title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingResource.description}
                  onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                  placeholder="Brief description (optional)"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editingResource.category} onValueChange={(value) => setEditingResource({ ...editingResource, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="prayer_guide">Prayer Guide</SelectItem>
                    <SelectItem value="study_material">Study Material</SelectItem>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="testimony">Testimony</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-public"
                  checked={editingResource.is_public}
                  onCheckedChange={(checked) => setEditingResource({ ...editingResource, is_public: checked })}
                />
                <Label htmlFor="edit-public" className="font-body">Public (visible to all users)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingResource(null)} className="font-body">Cancel</Button>
            <Button onClick={handleSaveResource} className="bg-gradient-gold text-accent-foreground font-body hover:opacity-90">
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminDashboard;
