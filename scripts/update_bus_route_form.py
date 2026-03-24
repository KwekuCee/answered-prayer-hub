import codecs
import re

def update_bus_route_form():
    filepath = "src/pages/SuperAdminDashboard.tsx"
    with codecs.open(filepath, 'r', 'utf-8') as f:
        content = f.read()

    # 1. Replace Route Region / Name Input with Select
    old_region_input = """                    <div className="space-y-2">
                      <Label>Route Region / Name</Label>
                      <Input 
                        placeholder="e.g. Accra Central" 
                        value={editingBusPoint ? editingBusPoint.name : newBusPoint.name}
                        onChange={e => editingBusPoint ? setEditingBusPoint({...editingBusPoint, name: e.target.value}) : setNewBusPoint({...newBusPoint, name: e.target.value})}
                      />
                    </div>"""
    
    new_region_select = """                    <div className="space-y-2">
                      <Label>Route/Region Name</Label>
                      <Select 
                        value={editingBusPoint ? editingBusPoint.name : newBusPoint.name}
                        onValueChange={v => editingBusPoint ? setEditingBusPoint({...editingBusPoint, name: v}) : setNewBusPoint({...newBusPoint, name: v})}
                      >
                        <SelectTrigger><SelectValue placeholder="Select Region/Route" /></SelectTrigger>
                        <SelectContent className="max-h-60">
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
                    </div>"""
    
    # Try multiple ways to replace if exact string fails due to whitespace
    if "Route Region / Name" in content:
        # We can use regex to find the block
        content = re.sub(
            r'<div className="space-y-2">\s*<Label>Route Region / Name</Label>\s*<Input[^>]+/>\s*</div>',
            new_region_select,
            content
        )
    
    if "e.g. 6:00 AM" in content:
        # We can use regex to find the time input
        new_time_input = """<Input type="time" value={editingBusPoint ? editingBusPoint.departure_time : newBusPoint.departure_time} onChange={e => editingBusPoint ? setEditingBusPoint({...editingBusPoint, departure_time: e.target.value}) : setNewBusPoint({...newBusPoint, departure_time: e.target.value})} />"""
        content = re.sub(
            r'<Input\s+placeholder="e\.g\. 6:00 AM"[^>]+/>',
            new_time_input,
            content
        )

    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)
    print("Bus Route Form updated.")

update_bus_route_form()
