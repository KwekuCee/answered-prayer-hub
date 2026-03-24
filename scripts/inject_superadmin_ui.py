import codecs

def inject_tabs():
    filepath = "src/pages/SuperAdminDashboard.tsx"
    with codecs.open(filepath, 'r', 'utf-8') as f:
        content = f.read()

    programs_panel = """
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
                      {editingProgram ? "Save" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
"""

    bus_panel = """
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
                      )})}
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
                if(!open) { setIsAddingBusPoint(false); setEditingBusPoint(null); }
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
                        onValueChange={v => editingBusPoint ? setEditingBusPoint({...editingBusPoint, program_id: v}) : setNewBusPoint({...newBusPoint, program_id: v})}
                      >
                        <SelectTrigger><SelectValue placeholder="Select Program" /></SelectTrigger>
                        <SelectContent>
                          {programs.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Route Region / Name</Label>
                      <Input 
                        placeholder="e.g. Accra Central" 
                        value={editingBusPoint ? editingBusPoint.name : newBusPoint.name}
                        onChange={e => editingBusPoint ? setEditingBusPoint({...editingBusPoint, name: e.target.value}) : setNewBusPoint({...newBusPoint, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Exact Pickup Location</Label>
                      <Textarea 
                        placeholder="e.g. Accra Mall Parking Lot" 
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
                      {editingBusPoint ? "Save" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
"""
    
    # Check if they exist to prevent double injection
    if 'activeTab === "programs"' not in content:
        # Find the activeTab === "audit_logs" block
        target = '          {activeTab === "audit_logs" && ('
        
        replacement = programs_panel + "\n" + bus_panel + "\n" + target
        content = content.replace(target, replacement)
        
        with codecs.open(filepath, 'w', 'utf-8') as f:
            f.write(content)
        print("Successfully injected UI.")
    else:
        print("Already injected.")

inject_tabs()
