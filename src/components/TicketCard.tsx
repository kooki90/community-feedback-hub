import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { TypeBadge } from '@/components/TypeBadge';
import { VoteButtons } from '@/components/VoteButtons';
import { MediaPreview } from '@/components/MediaPreview';
import { Ticket } from '@/types/database';
import { MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

interface TicketCardProps {
  ticket: Ticket & { image_url?: string | null; video_url?: string | null };
  commentCount?: number;
  onVoteChange?: () => void;
}

export function TicketCard({ ticket, commentCount = 0, onVoteChange }: TicketCardProps) {
  return (
    <Card className="p-4 hover:border-primary/50 transition-colors">
      <div className="flex gap-4">
        <VoteButtons
          ticketId={ticket.id}
          upvotes={ticket.upvotes}
          downvotes={ticket.downvotes}
          onVoteChange={onVoteChange}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <TypeBadge type={ticket.type} />
            <StatusBadge status={ticket.status} />
          </div>
          
          <Link to={`/ticket/${ticket.id}`}>
            <h3 className="font-medium text-foreground hover:text-primary transition-colors mb-1">
              {ticket.title}
            </h3>
          </Link>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {ticket.description}
          </p>

          <MediaPreview imageUrl={ticket.image_url} videoUrl={ticket.video_url} />

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px] bg-secondary">
                  {ticket.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span>{ticket.profiles?.username || 'Unknown'}</span>
              <span>·</span>
              <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
            </div>
            
            <Link to={`/ticket/${ticket.id}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <MessageCircle className="h-4 w-4" />
              <span>{commentCount}</span>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
