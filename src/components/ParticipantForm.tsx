import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ParticipantForm({ viewers, viewerKey, onParticipantSaved }: { viewers: number, viewerKey: string, onParticipantSaved: (name: string) => void }) {
  const [name, setName] = useState(localStorage.getItem('chatName') || '');
  const [contact, setContact] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e?: any) => {
    e?.preventDefault?.();
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    setSaving(true);
    try {
      const payload = { viewer_key: viewerKey || Math.random().toString(), name: name.trim(), contact: contact.trim() || null, location: location.trim() || null };
      await supabase.from('live_participants').upsert(payload, { onConflict: ['viewer_key'] });
      localStorage.setItem('chatName', name.trim());
      if (!localStorage.getItem('viewer_key')) localStorage.setItem('viewer_key', payload.viewer_key);
      onParticipantSaved(name.trim());
      toast.success('Saved');
    } catch (err: any) {
      console.debug(err);
      toast.error('Failed to save participant');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="flex-1 h-9 text-sm" />
        <Input placeholder="Contact" value={contact} onChange={e => setContact(e.target.value)} className="w-36 h-9 text-sm" />
      </div>
      <div className="flex gap-2">
        <Input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} className="flex-1 h-9 text-sm" />
        <Button onClick={handleSave} disabled={saving} className="w-28">{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </div>
  );
}
