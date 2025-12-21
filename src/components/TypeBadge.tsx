import { Badge } from '@/components/ui/badge';
import { TicketType } from '@/types/database';
import { Bug, Lightbulb, Sparkles } from 'lucide-react';

const typeConfig: Record<TicketType, { label: string; className: string; icon: React.ReactNode }> = {
  bug: {
    label: 'Bug',
    className: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
    icon: <Bug className="h-3 w-3" />
  },
  suggestion: {
    label: 'Suggestion',
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30',
    icon: <Lightbulb className="h-3 w-3" />
  },
  feature: {
    label: 'Feature',
    className: 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30',
    icon: <Sparkles className="h-3 w-3" />
  }
};

export function TypeBadge({ type }: { type: TicketType }) {
  const config = typeConfig[type];
  
  return (
    <Badge variant="outline" className={`gap-1.5 font-medium ${config.className}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
