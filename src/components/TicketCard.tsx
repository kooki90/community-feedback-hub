import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { TypeBadge } from '@/components/TypeBadge';
import { VoteButtons } from '@/components/VoteButtons';
import { MediaPreview } from '@/components/MediaPreview';
import { Ticket } from '@/types/database';
import { MessageCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

interface TicketCardProps {
  ticket: Ticket & { image_url?: string | null; video_url?: string | null };
  commentCount?: number;
  onVoteChange?: () => void;
}

export function TicketCard({ ticket, commentCount = 0, onVoteChange }: TicketCardProps) {
  return (
    <Card className="glass-hover group relative overflow-hidden">
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-purple-500 to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <TypeBadge type={ticket.type} />
              <StatusBadge status={ticket.status} />
            </div>
            <Link to={`/ticket/${ticket.id}`}>
              <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {ticket.title}
              </h3>
            </Link>
          </div>
          <VoteButtons
            ticketId={ticket.id}
            upvotes={ticket.upvotes}
            downvotes={ticket.downvotes}
            onVoteChange={onVoteChange}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {ticket.description}
        </p>

        <MediaPreview imageUrl={ticket.image_url} videoUrl={ticket.video_url} />

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-3">
            <Avatar className="h-7 w-7 ring-2 ring-border">
              <AvatarFallback className="text-xs bg-secondary text-secondary-foreground font-medium">
                {ticket.profiles?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">{ticket.profiles?.username || 'Unknown'}</span>
              <span>•</span>
              <Clock className="h-3 w-3" />
              <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
            </div>
          </div>
          <Link 
            to={`/ticket/${ticket.id}`} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs font-medium">{commentCount}</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
