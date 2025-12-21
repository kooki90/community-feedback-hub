import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { TicketStatus } from '@/types/database';
import { toast } from 'sonner';
import { Shield, Loader2 } from 'lucide-react';

interface AdminStatusUpdateProps {
  ticketId: string;
  currentStatus: TicketStatus;
  onStatusChange?: () => void;
}

const statusOptions: { value: TicketStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' }
];

export function AdminStatusUpdate({ ticketId, currentStatus, onStatusChange }: AdminStatusUpdateProps) {
  const [status, setStatus] = useState<TicketStatus>(currentStatus);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (status === currentStatus) return;

    setLoading(true);
    const { error } = await supabase
      .from('tickets')
      .update({ status })
      .eq('id', ticketId);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success('Status updated');
      onStatusChange?.();
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl glass border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 text-primary">
        <Shield className="h-5 w-5" />
        <span className="font-medium">Admin Controls</span>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <Select value={status} onValueChange={(v) => setStatus(v as TicketStatus)}>
          <SelectTrigger className="w-40 glass border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass border-border/50">
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          onClick={handleUpdate} 
          disabled={loading || status === currentStatus}
          size="sm"
          className="glow-sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
        </Button>
      </div>
    </div>
  );
}
