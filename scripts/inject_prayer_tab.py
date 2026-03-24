import codecs
import re

def inject_prayer_tab():
    filepath = "src/pages/SuperAdminDashboard.tsx"
    with codecs.open(filepath, 'r', 'utf-8') as f:
        content = f.read()

    # 1. Add Heart icon
    if 'Heart,' not in content and 'Heart ' not in content:
        import_match = re.search(r'import\s+\{([^}]+)\}\s+from\s+"lucide-react";', content, re.MULTILINE)
        if import_match:
            new_imports = import_match.group(1) + ", Heart"
            content = content.replace(import_match.group(1), new_imports)

    # 2. Add queries and states
    query_insertion = """
  const { data: prayerPoints = [], refetch: refetchPrayerPoints } = useQuery({
    queryKey: ["all-prayer-points"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prayer_points").select("*, programs(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleDeletePrayerPoint = async (id: string) => {
    if(!window.confirm("Delete this prayer request?")) return;
    const { error } = await supabase.from("prayer_points").delete().eq("id", id);
    if (error) { toast.error("Failed."); return; }
    toast.success("Deleted.");
    queryClient.invalidateQueries({ queryKey: ["all-prayer-points"] });
  };
"""
    if "all-prayer-points" not in content:
        insert_marker = 'const confirmedTotal ='
        content = content.replace(insert_marker, query_insertion + "\n  " + insert_marker)

    # 3. Add to sidebar navItems
    if 'id: "prayer-points"' not in content:
        content = content.replace(
            '{ id: "audit_logs",',
            '{ id: "prayer-points", label: "Prayer Requests", icon: Heart },\n    { id: "audit_logs",'
        )

    # 4. Add the Content panel
    prayer_panel = """
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
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prayerPoints.map((pp: any) => (
                        <TableRow key={pp.id}>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(pp.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium text-foreground">{pp.name || "Anonymous"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{(pp.programs as any)?.name || "All Sessions"}</TableCell>
                          <TableCell className="max-w-md whitespace-pre-wrap">{pp.request}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="destructive" size="sm" onClick={() => handleDeletePrayerPoint(pp.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
"""
    if 'activeTab === "prayer-points"' not in content:
        target = '          {activeTab === "audit_logs" && ('
        content = content.replace(target, prayer_panel + "\n" + target)

    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)

inject_prayer_tab()
