import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { TicketCard } from '@/components/TicketCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Ticket, TicketType, Profile } from '@/types/database';
import { Search, Bug, Lightbulb, Sparkles, Loader2 } from 'lucide-react';
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
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-primary">LimeHelpDesk</h1>
          <p className="text-muted-foreground">
            Report bugs, share suggestions, and request features
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-8">
          <div className="bg-card rounded-lg p-3 text-center border border-border">
            <div className="text-xl font-bold text-destructive">{stats.bugs}</div>
            <div className="text-xs text-muted-foreground">Bugs</div>
          </div>
          <div className="bg-card rounded-lg p-3 text-center border border-border">
            <div className="text-xl font-bold text-warning">{stats.suggestions}</div>
            <div className="text-xs text-muted-foreground">Suggestions</div>
          </div>
          <div className="bg-card rounded-lg p-3 text-center border border-border">
            <div className="text-xl font-bold text-primary">{stats.features}</div>
            <div className="text-xs text-muted-foreground">Features</div>
          </div>
        </div>

        {/* Search and Submit */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {user && (
            <Link to="/submit">
              <Button className="w-full sm:w-auto">Submit Report</Button>
            </Link>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button 
            variant={typeFilter === 'all' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setTypeFilter('all')}
          >
            All
          </Button>
          <Button 
            variant={typeFilter === 'bug' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setTypeFilter('bug')}
            className={typeFilter === 'bug' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            <Bug className="h-4 w-4 mr-1" />
            Bugs
          </Button>
          <Button 
            variant={typeFilter === 'suggestion' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setTypeFilter('suggestion')}
            className={typeFilter === 'suggestion' ? 'bg-warning hover:bg-warning/90 text-warning-foreground' : ''}
          >
            <Lightbulb className="h-4 w-4 mr-1" />
            Suggestions
          </Button>
          <Button 
            variant={typeFilter === 'feature' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setTypeFilter('feature')}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Features
          </Button>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">
              {tickets.length === 0 ? 'No reports yet. Be the first!' : 'No matching reports found.'}
            </p>
            {user && tickets.length === 0 && (
              <Link to="/submit">
                <Button>Submit First Report</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
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
