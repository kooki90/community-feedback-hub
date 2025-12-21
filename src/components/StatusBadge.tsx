import { Badge } from '@/components/ui/badge';
import { TicketStatus } from '@/types/database';
import { Clock, CheckCircle, Play, XCircle, Loader2 } from 'lucide-react';

const statusConfig: Record<TicketStatus, { label: string; className: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pending',
    className: 'bg-secondary/80 text-muted-foreground border-border hover:bg-secondary',
    icon: <Clock className="h-3 w-3" />
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
    icon: <Loader2 className="h-3 w-3 animate-spin" />
  },
  accepted: {
    label: 'Accepted',
    className: 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30',
    icon: <Play className="h-3 w-3" />
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30',
    icon: <CheckCircle className="h-3 w-3" />
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-destructive/20 text-red-400 border-destructive/30 hover:bg-destructive/30',
    icon: <XCircle className="h-3 w-3" />
  }
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const config = statusConfig[status];
  
  return (
    <Badge variant="outline" className={`gap-1.5 font-medium ${config.className}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
