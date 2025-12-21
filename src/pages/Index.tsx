import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { TicketCard } from '@/components/TicketCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Ticket, TicketType, TicketStatus, Profile } from '@/types/database';
import { Search, Bug, Lightbulb, Sparkles, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

interface TicketWithProfile extends Omit<Ticket, 'profiles'> {
  profiles: Profile | null;
  comment_count: number;
}

export default function Index() {
  const { user } = useAuthContext();
  const [tickets, setTickets] = useState<TicketWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TicketType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel('tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => fetchTickets())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchTickets = async () => {
    const { data: ticketsData } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (ticketsData) {
      const userIds = [...new Set(ticketsData.map(t => t.user_id))];
      const ticketIds = ticketsData.map(t => t.id);
      
      const [{ data: profiles }, { data: comments }] = await Promise.all([
        supabase.from('profiles').select('*').in('user_id', userIds),
        supabase.from('comments').select('ticket_id')
      ]);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const commentCounts = new Map<string, number>();
      comments?.forEach(c => {
        commentCounts.set(c.ticket_id, (commentCounts.get(c.ticket_id) || 0) + 1);
      });

      const ticketsWithData = ticketsData.map(t => ({
        ...t,
        profiles: profileMap.get(t.user_id) || null,
        comment_count: commentCounts.get(t.id) || 0
      }));

      setTickets(ticketsWithData);
    }
    setLoading(false);
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(search.toLowerCase()) ||
                          ticket.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || ticket.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Bug & Feature Tracker</h1>
          <p className="text-muted-foreground">Report bugs, suggest improvements, and vote on ideas</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {user && (
            <Link to="/submit">
              <Button className="w-full sm:w-auto">Submit Ticket</Button>
            </Link>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Button variant={typeFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter('all')}>All</Button>
          <Button variant={typeFilter === 'bug' ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter('bug')}><Bug className="h-4 w-4 mr-1" />Bugs</Button>
          <Button variant={typeFilter === 'suggestion' ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter('suggestion')}><Lightbulb className="h-4 w-4 mr-1" />Suggestions</Button>
          <Button variant={typeFilter === 'feature' ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter('feature')}><Sparkles className="h-4 w-4 mr-1" />Features</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {tickets.length === 0 ? 'No tickets yet. Be the first to submit one!' : 'No tickets match your filters.'}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTickets.map(ticket => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                commentCount={ticket.comment_count}
                onVoteChange={fetchTickets}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
