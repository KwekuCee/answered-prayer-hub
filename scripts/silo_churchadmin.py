import codecs
import re

def silo_churchadmin():
    filepath = "src/pages/ChurchAdminDashboard.tsx"
    with codecs.open(filepath, 'r', 'utf-8') as f:
        content = f.read()

    # 1. State Injection
    state_injection = """  const [activeTab, setActiveTab] = useState("overview");
  const [dashboardProgramId, setDashboardProgramId] = useState<string>("all");"""
    content = content.replace('  const [activeTab, setActiveTab] = useState("overview");', state_injection)

    # 2. Header Injection
    header_injection = """          <div className="flex items-center gap-4">
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
          </div>"""
    
    content = re.sub(
        r'<div className="flex items-center gap-4">\s*<NotificationsMenu[^>]+/>\s*</div>',
        header_injection,
        content
    )

    # 3. Compute programAttendees
    memo_injection = """  const programAttendees = useMemo(() => {
    if (dashboardProgramId === "all") return attendees;
    return attendees.filter(a => a.program_id === dashboardProgramId);
  }, [attendees, dashboardProgramId]);

  const todayStr = new Date().toISOString().split("T")[0];"""
    
    # Replace `const todayStr = ...`
    content = content.replace('  const todayStr = new Date().toISOString().split("T")[0];', memo_injection)

    # 4. Replace attendees with programAttendees in targeted computations
    content = content.replace('todayRegs = attendees.filter', 'todayRegs = programAttendees.filter')
    content = content.replace('confirmedCount = attendees.filter', 'confirmedCount = programAttendees.filter')
    content = content.replace('pendingCount = attendees.filter', 'pendingCount = programAttendees.filter')
    
    content = content.replace('inviters, attendees', 'inviters, programAttendees')
    content = content.replace('myInvites = attendees.filter', 'myInvites = programAttendees.filter')
    
    content = content.replace('filteredAttendees = useMemo(() => {', 'filteredAttendees = useMemo(() => {') # keep same
    content = content.replace('return attendees.filter((m) => {', 'return programAttendees.filter((m) => {')
    content = content.replace(', [attendees, searchTerm', ', [programAttendees, searchTerm')
    
    # Update Stats Array display
    content = content.replace('label: "Total Attendees", value: attendees.length', 'label: "Total Attendees", value: programAttendees.length')

    # 5. Fix `handleCreateAttendee` payload to include `program_id` if not "all"
    content = re.sub(
        r'inviter_id: newAttendee.inviter_id === "none" \? null : newAttendee.inviter_id,\s*confirmed: true,',
        r'inviter_id: newAttendee.inviter_id === "none" ? null : newAttendee.inviter_id,\n      program_id: dashboardProgramId === "all" ? (programs.find((p:any) => p.is_active)?.id || null) : dashboardProgramId,\n      confirmed: true,',
        content
    )
    
    # Wait, ChurchAdmin might export ALL raw attendees instead of programAttendees in the export button
    # Replace exportCSV(attendees as any, "attendees")
    content = content.replace('exportCSV(attendees as any, "attendees")', 'exportCSV(programAttendees as any, "attendees")')
    content = content.replace('exportCSV(attendees.filter', 'exportCSV(programAttendees.filter')

    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)
    print("Silo injected for ChurchAdmin Dashboard successfully")

silo_churchadmin()
