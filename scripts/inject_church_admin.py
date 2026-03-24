import codecs
import re

def inject_church_admin(filepath):
    try:
        with codecs.open(filepath, 'r', 'utf-8') as f:
            content = f.read()

        # 1. State for programFilter
        if "programFilter" not in content:
            content = content.replace(
                'const [attendeeFilter, setAttendeeFilter] = useState<AttendeeFilter>("all");',
                'const [attendeeFilter, setAttendeeFilter] = useState<AttendeeFilter>("all");\n  const [programFilter, setProgramFilter] = useState("all");'
            )

        # 2. Query for programs
        programs_query = """
  const { data: programs = [] } = useQuery({
    queryKey: ["all-programs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("*").order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
"""
        if "all-programs" not in content:
            # Insert before attendees query
            content = content.replace('const { data: attendees = [] } = useQuery', programs_query + '\n  const { data: attendees = [] } = useQuery')

        # 3. filteredAttendees matchesProgram
        if "matchesProgram" not in content:
            if "const matchesStatus =" in content:
                content = content.replace(
                    'const matchesStatus =',
                    'const matchesProgram = programFilter === "all" || m.program_id === programFilter;\n      const matchesStatus ='
                )
                
                # Try replacing both versions just in case
                content = content.replace(
                    'return matchesSearch && matchesStatus && matchesChurch;',
                    'return matchesSearch && matchesStatus && matchesChurch && matchesProgram;'
                )
                content = content.replace(
                    'return matchesSearch && matchesStatus;',
                    'return matchesSearch && matchesStatus && matchesProgram;'
                )

        # 4. Inject Select UI
        select_ui = """
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="All Programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
"""
        if "value={programFilter}" not in content:
            content = content.replace(
                '<Select value={attendeeFilter}',
                select_ui + '\n          <Select value={attendeeFilter}'
            )

        with codecs.open(filepath, 'w', 'utf-8') as f:
            f.write(content)
        print("ChurchAdminDashboard.tsx updated.")
    except Exception as e:
        print(f"Failed ChurchAdminDashboard.tsx update: {e}")

inject_church_admin('src/pages/ChurchAdminDashboard.tsx')
