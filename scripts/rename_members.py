import os
import codecs

def process_file(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    with codecs.open(filepath, 'r', 'utf-8') as f:
        content = f.read()

    # Replace uppercase and lowercase
    content = content.replace('Member', 'Attendee')
    content = content.replace('Members', 'Attendees')
    content = content.replace('member', 'attendee')
    content = content.replace('members', 'attendees')

    # Revert database table queries
    content = content.replace('from("attendees")', 'from("members")')
    content = content.replace("from('attendees')", "from('members')")
    content = content.replace('from(`attendees`)', 'from(`members`)')
    
    # Any other specific reverts if needed
    
    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)
    
    print(f"Processed: {filepath}")

# Update Dashboards
process_file('src/pages/ChurchAdminDashboard.tsx')
process_file('src/pages/SuperAdminDashboard.tsx')
