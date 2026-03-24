import codecs
import re

def silo_superadmin():
    filepath = "src/pages/SuperAdminDashboard.tsx"
    with codecs.open(filepath, 'r', 'utf-8') as f:
        content = f.read()

    # 1. State Injection
    state_injection = """  const [activeTab, setActiveTab] = useState("overview");
  const [dashboardProgramId, setDashboardProgramId] = useState<string>("all");"""
    content = content.replace('  const [activeTab, setActiveTab] = useState("overview");', state_injection)

    # 2. Header Injection
    header_injection = """          <div className="flex items-center gap-4">
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
          </div>"""
    
    content = re.sub(
        r'<div className="flex items-center gap-4">\s*<NotificationsMenu[^>]+/>\s*</div>',
        header_injection,
        content
    )

    # 3. Compute `programAttendees` right after `prayerPoints` query block (around line 313)
    memo_injection = """  const programAttendees = useMemo(() => {
    if (dashboardProgramId === "all") return attendees;
    return attendees.filter(a => a.program_id === dashboardProgramId);
  }, [attendees, dashboardProgramId]);

  const confirmedTotal = programAttendees"""
    
    content = content.replace('  const confirmedTotal = attendees', memo_injection)

    # 4. Replace `attendees.` and `attendees,` in ALL computation blocks
    # Carefully replace it where it computes stats.
    # We will replace `attendees` with `programAttendees` in these specific Memos:
    content = content.replace('attendees.filter((m) => m.confirmed).length', 'programAttendees.filter((m) => m.confirmed).length')
    content = content.replace('attendees.filter((m) => !m.confirmed).length', 'programAttendees.filter((m) => !m.confirmed).length')
    
    content = content.replace('const churchAttendees = attendees.filter', 'const churchAttendees = programAttendees.filter')
    content = content.replace(', [churches, attendees]);', ', [churches, programAttendees]);')
    
    content = content.replace('attendees.filter(m => m.inviter_id === inv.id)', 'programAttendees.filter(m => m.inviter_id === inv.id)')
    content = content.replace(', [inviters, attendees]);', ', [inviters, programAttendees]);')
    
    content = content.replace('return attendees.filter((m) => {', 'return programAttendees.filter((m) => {')
    content = content.replace(', [attendees, attendeeSearch, attendeeFilter, attendeeChurchFilter]', ', [programAttendees, attendeeSearch, attendeeFilter, attendeeChurchFilter]')
    
    content = content.replace('overallConversionRate = attendees.length > 0', 'overallConversionRate = programAttendees.length > 0')
    content = content.replace('(confirmedTotal / attendees.length) * 100', '(confirmedTotal / programAttendees.length) * 100')
    
    content = content.replace('sortedAttendees = [...attendees].sort', 'sortedAttendees = [...programAttendees].sort')
    content = content.replace('attendees.forEach(m => {', 'programAttendees.forEach(m => {')
    
    # 5. Fix `handleCreateAttendee` payload to include `program_id` if not "all"
    payload_replacement = """      date_of_birth: newAttendee.date_of_birth || null,
      inviter_id: newAttendee.inviter_id === "none" ? null : newAttendee.inviter_id,
      program_id: dashboardProgramId === "all" ? (programs.find((p:any) => p.is_active)?.id || null) : dashboardProgramId,
      confirmed: true,"""
    content = content.replace('      inviter_id: newAttendee.inviter_id === "none" ? null : newAttendee.inviter_id,\n      confirmed: true,', payload_replacement)

    # Wait, the string '      inviter_id: newAttendee.inviter_id === "none" ? null : newAttendee.inviter_id,\n      confirmed: true,' might not match perfectly if there's carriage returns.
    content = re.sub(
        r'inviter_id: newAttendee.inviter_id === "none" \? null : newAttendee.inviter_id,\s*confirmed: true,',
        r'inviter_id: newAttendee.inviter_id === "none" ? null : newAttendee.inviter_id,\n      program_id: dashboardProgramId === "all" ? (programs.find((p:any) => p.is_active)?.id || null) : dashboardProgramId,\n      confirmed: true,',
        content
    )

    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)
    print("Silo injected for SuperAdmin Dashboard successfully")

silo_superadmin()
