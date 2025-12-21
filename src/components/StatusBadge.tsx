import { Badge } from '@/components/ui/badge';
import { TicketStatus } from '@/types/database';
import { Clock, CheckCircle, Play, XCircle, Loader2 } from 'lucide-react';

const statusConfig: Record<TicketStatus, { label: string; className: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pending',
    className: 'bg-muted text-muted-foreground border-muted',
    icon: <Clock className="h-3 w-3" />
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-accent text-accent-foreground border-accent',
    icon: <Loader2 className="h-3 w-3 animate-spin" />
  },
  accepted: {
    label: 'Accepted',
    className: 'bg-primary/20 text-primary border-primary/30',
    icon: <Play className="h-3 w-3" />
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    icon: <CheckCircle className="h-3 w-3" />
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-destructive/20 text-destructive border-destructive/30',
    icon: <XCircle className="h-3 w-3" />
  }
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const config = statusConfig[status];
  
  return (
    <Badge variant="outline" className={`gap-1 ${config.className}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
