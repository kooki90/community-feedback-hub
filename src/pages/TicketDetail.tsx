import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
import { TypeBadge } from '@/components/TypeBadge';
import { VoteButtons } from '@/components/VoteButtons';
import { CommentSection } from '@/components/CommentSection';
import { AdminStatusUpdate } from '@/components/AdminStatusUpdate';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Ticket, Profile } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface TicketWithProfile extends Omit<Ticket, 'profiles'> {
  profiles: Profile | null;
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthContext();
  const [ticket, setTicket] = useState<TicketWithProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchTicket();
    }
  }, [id]);

  const fetchTicket = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      toast.error('Ticket not found');
      navigate('/');
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user_id)
        .maybeSingle();
      
      setTicket({ ...data, profiles: profile } as TicketWithProfile);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!ticket || !confirm('Are you sure you want to delete this ticket?')) return;

    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', ticket.id);

    if (error) {
      toast.error('Failed to delete ticket');
    } else {
      toast.success('Ticket deleted');
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  const isOwner = user?.id === ticket.user_id;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to tickets
        </Link>

        <div className="max-w-3xl mx-auto space-y-6">
          {isAdmin && (
            <AdminStatusUpdate
              ticketId={ticket.id}
              currentStatus={ticket.status}
              onStatusChange={fetchTicket}
            />
          )}

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <TypeBadge type={ticket.type} />
                    <StatusBadge status={ticket.status} />
                  </div>
                  <h1 className="text-2xl font-bold text-foreground">{ticket.title}</h1>
                </div>
                <VoteButtons
                  ticketId={ticket.id}
                  upvotes={ticket.upvotes}
                  downvotes={ticket.downvotes}
                  onVoteChange={fetchTicket}
                />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap mb-6">{ticket.description}</p>
              
              <div className="flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                      {ticket.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{ticket.profiles?.username || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>

                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <CommentSection ticketId={ticket.id} />
        </div>
      </main>
    </div>
  );
}
