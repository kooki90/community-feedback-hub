import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { TypeBadge } from '@/components/TypeBadge';
import { VoteButtons } from '@/components/VoteButtons';
import { Ticket } from '@/types/database';
import { MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

interface TicketCardProps {
  ticket: Ticket;
  commentCount?: number;
  onVoteChange?: () => void;
}

export function TicketCard({ ticket, commentCount = 0, onVoteChange }: TicketCardProps) {
  return (
    <Card className="group transition-all hover:shadow-md hover:border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link to={`/ticket/${ticket.id}`}>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {ticket.title}
              </h3>
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <TypeBadge type={ticket.type} />
              <StatusBadge status={ticket.status} />
            </div>
          </div>
          <VoteButtons
            ticketId={ticket.id}
            upvotes={ticket.upvotes}
            downvotes={ticket.downvotes}
            onVoteChange={onVoteChange}
          />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {ticket.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                {ticket.profiles?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {ticket.profiles?.username || 'Unknown'}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </span>
          </div>
          <Link to={`/ticket/${ticket.id}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{commentCount}</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
