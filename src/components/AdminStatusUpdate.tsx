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
import { Shield } from 'lucide-react';

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
    <div className="flex items-center gap-3 p-4 bg-accent/50 rounded-lg border border-accent">
      <Shield className="h-5 w-5 text-accent-foreground" />
      <span className="text-sm font-medium text-foreground">Admin Controls</span>
      <Select value={status} onValueChange={(v) => setStatus(v as TicketStatus)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
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
      >
        Update
      </Button>
    </div>
  );
}
