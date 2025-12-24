import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
import { TypeBadge } from '@/components/TypeBadge';
import { VoteButtons } from '@/components/VoteButtons';
import { CommentSection } from '@/components/CommentSection';
import { AdminStatusUpdate } from '@/components/AdminStatusUpdate';
import { MediaPreview } from '@/components/MediaPreview';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Ticket, Profile } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Loader2, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface TicketWithProfile extends Omit<Ticket, 'profiles'> {
  profiles: Profile | null;
  image_url?: string | null;
  video_url?: string | null;
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
    if (!ticket || !confirm('Are you sure you want to delete this report?')) return;

    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', ticket.id);

    if (error) {
      toast.error('Failed to delete report');
    } else {
      toast.success('Report deleted');
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
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <Header />
      <main className="relative container mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to reports
        </Link>

        <div className="flex gap-6 h-[calc(100vh-180px)]">
          {/* Left side - Report details (fixed) */}
          <div className="flex-1 min-w-0">
            {isAdmin && (
              <AdminStatusUpdate
                ticketId={ticket.id}
                currentStatus={ticket.status}
                onStatusChange={fetchTicket}
              />
            )}

            <Card className="glass border-border/50 overflow-hidden mt-4">
              {/* Gradient accent */}
              <div className="h-1 bg-gradient-to-r from-primary via-purple-500 to-primary" />
              
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <TypeBadge type={ticket.type} />
                      <StatusBadge status={ticket.status} />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">{ticket.title}</h1>
                  </div>
                  <VoteButtons
                    ticketId={ticket.id}
                    upvotes={ticket.upvotes}
                    downvotes={ticket.downvotes}
                    onVoteChange={fetchTicket}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                
                <MediaPreview imageUrl={ticket.image_url} videoUrl={ticket.video_url} />
                
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-border">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground font-medium">
                        {ticket.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{ticket.profiles?.username || 'Unknown'}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>

                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right side - Comments (scrollable) */}
          <div className="w-[400px] flex-shrink-0 overflow-y-auto">
            {ticket.status !== 'rejected' ? (
              <CommentSection ticketId={ticket.id} />
            ) : (
              <Card className="glass border-border/50">
                <CardContent className="py-6 text-center text-muted-foreground">
                  This report has been rejected. Comments are disabled.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
