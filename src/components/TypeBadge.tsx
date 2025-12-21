import { Badge } from '@/components/ui/badge';
import { TicketType } from '@/types/database';
import { Bug, Lightbulb, Sparkles } from 'lucide-react';

const typeConfig: Record<TicketType, { label: string; className: string; icon: React.ReactNode }> = {
  bug: {
    label: 'Bug',
    className: 'bg-destructive/20 text-destructive border-destructive/30',
    icon: <Bug className="h-3 w-3" />
  },
  suggestion: {
    label: 'Suggestion',
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    icon: <Lightbulb className="h-3 w-3" />
  },
  feature: {
    label: 'Feature',
    className: 'bg-primary/20 text-primary border-primary/30',
    icon: <Sparkles className="h-3 w-3" />
  }
};

export function TypeBadge({ type }: { type: TicketType }) {
  const config = typeConfig[type];
  
  return (
    <Badge variant="outline" className={`gap-1 ${config.className}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
