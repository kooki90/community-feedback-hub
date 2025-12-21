import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { TicketCard } from '@/components/TicketCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Ticket, TicketType, TicketStatus, Profile } from '@/types/database';
import { Search, Bug, Lightbulb, Sparkles, Loader2, Zap, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

interface TicketWithProfile extends Omit<Ticket, 'profiles'> {
  profiles: Profile | null;
  comment_count: number;
  image_url?: string | null;
  video_url?: string | null;
}

export default function Index() {
  const { user } = useAuthContext();
  const [tickets, setTickets] = useState<TicketWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TicketType | 'all'>('all');

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
    return matchesSearch && matchesType;
  });

  const stats = {
    bugs: tickets.filter(t => t.type === 'bug').length,
    suggestions: tickets.filter(t => t.type === 'suggestion').length,
    features: tickets.filter(t => t.type === 'feature').length
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <Header />
      
      <main className="relative container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-primary" />
            Community-driven feedback platform
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Bug Tracker</span>
            <span className="text-foreground"> & Feedback</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Report bugs, share suggestions, request features, and vote on ideas. 
            Your voice shapes the product.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{stats.bugs}</div>
            <div className="text-xs text-muted-foreground">Bugs</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{stats.suggestions}</div>
            <div className="text-xs text-muted-foreground">Suggestions</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.features}</div>
            <div className="text-xs text-muted-foreground">Features</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12 glass border-border/50 focus:border-primary/50"
            />
          </div>
          {user && (
            <Link to="/submit">
              <Button className="h-12 px-6 gap-2 glow-sm">
                <Sparkles className="h-4 w-4" />
                Submit Ticket
              </Button>
            </Link>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Button 
            variant={typeFilter === 'all' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setTypeFilter('all')}
            className={typeFilter === 'all' ? 'glow-sm' : 'glass border-border/50'}
          >
            All
          </Button>
          <Button 
            variant={typeFilter === 'bug' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setTypeFilter('bug')}
            className={typeFilter === 'bug' ? 'bg-red-500 hover:bg-red-600' : 'glass border-border/50'}
          >
            <Bug className="h-4 w-4 mr-1.5" />
            Bugs
          </Button>
          <Button 
            variant={typeFilter === 'suggestion' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setTypeFilter('suggestion')}
            className={typeFilter === 'suggestion' ? 'bg-amber-500 hover:bg-amber-600' : 'glass border-border/50'}
          >
            <Lightbulb className="h-4 w-4 mr-1.5" />
            Suggestions
          </Button>
          <Button 
            variant={typeFilter === 'feature' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setTypeFilter('feature')}
            className={typeFilter === 'feature' ? '' : 'glass border-border/50'}
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            Features
          </Button>
        </div>

        {/* Tickets Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-muted-foreground">Loading tickets...</span>
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-20">
            <div className="glass inline-block rounded-2xl p-12">
              <Bug className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
              <p className="text-muted-foreground mb-6">
                {tickets.length === 0 ? 'Be the first to submit a ticket!' : 'Try adjusting your search or filters.'}
              </p>
              {user && (
                <Link to="/submit">
                  <Button className="glow-sm">Submit First Ticket</Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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
