import codecs
import re

def inject_programs_tab(filepath):
    with codecs.open(filepath, 'r', 'utf-8') as f:
        content = f.read()

    # 1. Imports: import { Calendar } from "lucide-react" if not present
    if 'Calendar,' not in content and 'Calendar ' not in content:
        import_match = re.search(r'import\s+\{([^}]+)\}\s+from\s+"lucide-react";', content, re.MULTILINE)
        if import_match:
            new_imports = import_match.group(1) + ", Calendar"
            content = content.replace(import_match.group(1), new_imports)

    # 2. Add queries and states
    query_insertion = """
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

  const activeProgram = programs.find((p: any) => p.is_active);

  const handleCreateProgram = async () => {
    if (!newProgram.name || !newProgram.location_name) {
      toast.error("Name and location are required.");
      return;
    }
    // Auto active if it is the first program
    const isFirst = programs.length === 0;
    const { error } = await supabase.from("programs").insert({...newProgram, is_active: isFirst});
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
      map_iframe_url: editingProgram.map_iframe_url,
      start_date: editingProgram.start_date || null
    }).eq("id", editingProgram.id);
    if (error) { toast.error("Failed."); return; }
    toast.success("Program updated!");
    setEditingProgram(null);
    queryClient.invalidateQueries({ queryKey: ["all-programs"] });
  };

  const handleDeleteProgram = async (id: string) => {
    if(!window.confirm("Delete this program? This cascades and deletes ALL attendees, bus routes, and inviters explicitly tied to this program! THIS CANNOT BE UNDONE.")) return;
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
"""
    if "all-programs" not in content:
        insert_marker = 'const { data: busPoints'
        # ensure we place it just before busPoints
        content = content.replace(insert_marker, query_insertion + "\n  " + insert_marker)

    # 3. Add to sidebar
    sidebar_btn = """
          <button
            onClick={() => setActiveTab("programs")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "programs" ? "bg-gradient-gold text-accent-foreground shadow-gold" : "text-muted-foreground hover:bg-card/50"
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="font-semibold font-body text-sm">Programs</span>
          </button>
"""
    if 'setActiveTab("programs")' not in content:
        bus_regex = re.compile(r'(<button\s+onClick=\{\(\) => setActiveTab\("bus-points"\)\}.*?</button>)', re.DOTALL)
        content = bus_regex.sub(sidebar_btn + '\n' + r'\1', content)

    # 4. Add the Content panel
    content_panel = """
        {activeTab === "programs" && (
          <div className="space-y-6 animate-fade-up">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <h2 className="text-3xl font-display font-bold text-foreground">Programs & Sessions</h2>
                <p className="text-muted-foreground font-body">Create events and manage the Active program shown on the website.</p>
              </div>
              <Button onClick={() => setIsAddingProgram(true)} className="bg-gradient-gold text-accent-foreground">
                <Calendar className="w-4 h-4 mr-2" /> Add Program
              </Button>
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
                        <TableCell className="text-muted-foreground">{prog.location_name}</TableCell>
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
              if(!open) { setIsAddingProgram(false); setEditingProgram(null); }
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
                      onChange={e => editingProgram ? setEditingProgram({...editingProgram, name: e.target.value}) : setNewProgram({...newProgram, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location Name</Label>
                    <Input 
                      placeholder="e.g. Prampram, Ghana" 
                      value={editingProgram ? editingProgram.location_name : newProgram.location_name}
                      onChange={e => editingProgram ? setEditingProgram({...editingProgram, location_name: e.target.value}) : setNewProgram({...newProgram, location_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Map Iframe URL</Label>
                    <Textarea 
                      placeholder="URL from Google Maps Embed (src attribute only)" 
                      value={editingProgram ? editingProgram.map_iframe_url : newProgram.map_iframe_url}
                      onChange={e => editingProgram ? setEditingProgram({...editingProgram, map_iframe_url: e.target.value}) : setNewProgram({...newProgram, map_iframe_url: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input 
                      type="date"
                      value={editingProgram ? editingProgram.start_date : newProgram.start_date}
                      onChange={e => editingProgram ? setEditingProgram({...editingProgram, start_date: e.target.value}) : setNewProgram({...newProgram, start_date: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsAddingProgram(false); setEditingProgram(null); }}>Cancel</Button>
                  <Button onClick={editingProgram ? handleSaveProgram : handleCreateProgram} className="bg-gold text-accent-foreground">
                    {editingProgram ? "Save Changes" : "Create Program"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
"""
    if 'activeTab === "programs"' not in content:
        bus_content_regex = re.compile(r'(\{activeTab === "bus-points" && \(\s*<div.*?</Dialog>\s*</div>\s*\)\})', re.DOTALL)
        content = bus_content_regex.sub(content_panel + '\n' + r'\1', content)

    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)

inject_programs_tab('src/pages/SuperAdminDashboard.tsx')
