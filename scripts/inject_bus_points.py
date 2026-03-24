import codecs
import re

def inject_bus_points(filepath):
    with codecs.open(filepath, 'r', 'utf-8') as f:
        content = f.read()

    # 1. Imports: import { Bus } from "lucide-react" if not present
    if 'Bus,' not in content and 'Bus ' not in content:
        import_match = re.search(r'import\s+\{([^}]+)\}\s+from\s+"lucide-react";', content, re.MULTILINE)
        if import_match:
            new_imports = import_match.group(1) + ", Bus"
            content = content.replace(import_match.group(1), new_imports)

    # 2. Add queries and states
    query_insertion = """
  const { data: busPoints = [], refetch: refetchBusPoints } = useQuery({
    queryKey: ["all-bus-points"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bus_points").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const [isAddingBusPoint, setIsAddingBusPoint] = useState(false);
  const [newBusPoint, setNewBusPoint] = useState({ name: "", location: "", departure_time: "" });
  const [editingBusPoint, setEditingBusPoint] = useState<any>(null);

  const handleCreateBusPoint = async () => {
    if (!newBusPoint.name || !newBusPoint.location) {
      toast.error("Name and location are required.");
      return;
    }
    const { error } = await supabase.from("bus_points").insert(newBusPoint);
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
      departure_time: editingBusPoint.departure_time
    }).eq("id", editingBusPoint.id);
    if (error) { toast.error("Failed."); return; }
    toast.success("Bus Route updated!");
    setEditingBusPoint(null);
    queryClient.invalidateQueries({ queryKey: ["all-bus-points"] });
  };

  const handleDeleteBusPoint = async (id: string) => {
    if(!window.confirm("Delete bus route?")) return;
    const { error } = await supabase.from("bus_points").delete().eq("id", id);
    if (error) { toast.error("Failed."); return; }
    toast.success("Deleted.");
    queryClient.invalidateQueries({ queryKey: ["all-bus-points"] });
  };
"""
    if "all-bus-points" not in content:
        # Insert before confirmedTotal
        insert_marker = 'const confirmedTotal ='
        content = content.replace(insert_marker, query_insertion + "\n  " + insert_marker)

    # 3. Add to sidebar
    sidebar_btn = """
          <button
            onClick={() => setActiveTab("bus-points")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "bus-points" ? "bg-gradient-gold text-accent-foreground shadow-gold" : "text-muted-foreground hover:bg-card/50"
            }`}
          >
            <Bus className="w-5 h-5" />
            <span className="font-semibold font-body text-sm">Bus Routes</span>
          </button>
"""
    if 'setActiveTab("bus-points")' not in content:
        # Regex to find testimonials sidebar button
        testim_regex = re.compile(r'(<button\s+onClick=\{\(\) => setActiveTab\("testimonials"\)\}.*?</button>)', re.DOTALL)
        content = testim_regex.sub(r'\1' + '\n' + sidebar_btn, content)

    # 4. Add the Content panel
    content_panel = """
        {activeTab === "bus-points" && (
          <div className="space-y-6 animate-fade-up">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <h2 className="text-3xl font-display font-bold text-foreground">Bus Routes</h2>
                <p className="text-muted-foreground font-body">Manage free bus services for attendees.</p>
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
                      <TableHead>Target Area / Name</TableHead>
                      <TableHead>Location Details</TableHead>
                      <TableHead>Departure Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {busPoints.map((bp: any) => (
                      <TableRow key={bp.id}>
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
                    ))}
                    {busPoints.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No bus routes configured.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Dialog open={isAddingBusPoint || !!editingBusPoint} onOpenChange={(open) => {
              if(!open) { setIsAddingBusPoint(false); setEditingBusPoint(null); }
            }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingBusPoint ? "Edit Bus Route" : "Add Bus Route"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Route Name</Label>
                    <Input 
                      placeholder="e.g. Accra Central Bus" 
                      value={editingBusPoint ? editingBusPoint.name : newBusPoint.name}
                      onChange={e => editingBusPoint ? setEditingBusPoint({...editingBusPoint, name: e.target.value}) : setNewBusPoint({...newBusPoint, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pickup Location</Label>
                    <Textarea 
                      placeholder="Exact pickup location details" 
                      value={editingBusPoint ? editingBusPoint.location : newBusPoint.location}
                      onChange={e => editingBusPoint ? setEditingBusPoint({...editingBusPoint, location: e.target.value}) : setNewBusPoint({...newBusPoint, location: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Departure Time</Label>
                    <Input 
                      placeholder="e.g. 6:00 AM" 
                      value={editingBusPoint ? editingBusPoint.departure_time : newBusPoint.departure_time}
                      onChange={e => editingBusPoint ? setEditingBusPoint({...editingBusPoint, departure_time: e.target.value}) : setNewBusPoint({...newBusPoint, departure_time: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsAddingBusPoint(false); setEditingBusPoint(null); }}>Cancel</Button>
                  <Button onClick={editingBusPoint ? handleSaveBusPoint : handleCreateBusPoint} className="bg-gold text-accent-foreground">
                    {editingBusPoint ? "Save Changes" : "Create Route"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
"""
    if 'activeTab === "bus-points"' not in content:
        # Insert after testimonials tab content
        testim_content_regex = re.compile(r'(\{activeTab === "testimonials" && \(\s*<div.*?</Dialog>\s*</div>\s*\)\})', re.DOTALL)
        content = testim_content_regex.sub(r'\1' + '\n' + content_panel, content)

    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)

inject_bus_points('src/pages/SuperAdminDashboard.tsx')
