import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Shield, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Ticket, Profile, TicketStatus } from '@/types/database';
import { StatusBadge } from '@/components/StatusBadge';
import { TypeBadge } from '@/components/TypeBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';

interface TicketWithProfile extends Ticket {
  profiles: Profile | null;
}

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tickets, setTickets] = useState<TicketWithProfile[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    if (token) {
      setIsAuthenticated(true);
      fetchTickets();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { username, password }
      });

      if (error) throw error;

      if (data.success) {
        sessionStorage.setItem('admin_token', data.token);
        setIsAuthenticated(true);
        toast.success('Welcome, Admin!');
        fetchTickets();
      } else {
        toast.error(data.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setTickets([]);
    toast.success('Logged out');
  };

  const fetchTickets = async () => {
    setTicketsLoading(true);
    const { data: ticketsData } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (ticketsData) {
      const userIds = [...new Set(ticketsData.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const ticketsWithProfiles = ticketsData.map(t => ({
        ...t,
        profiles: profileMap.get(t.user_id) || null
      }));

      setTickets(ticketsWithProfiles);
    }
    setTicketsLoading(false);
  };

  const updateStatus = async (ticketId: string, status: TicketStatus) => {
    const { error } = await supabase
      .from('tickets')
      .update({ status })
      .eq('id', ticketId);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success('Status updated');
      fetchTickets();
    }
  };

  const deleteTicket = async (ticketId: string) => {
    // Optimistic update
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', ticketId);

    if (error) {
      toast.error('Failed to delete ticket');
      fetchTickets(); // Revert on error
    } else {
      toast.success('Ticket deleted');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle>Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">Admin Panel</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm">View Site</Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Manage Reports</h1>

        {ticketsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <TypeBadge type={ticket.type} />
                      <StatusBadge status={ticket.status} />
                    </div>
                    <Link to={`/ticket/${ticket.id}`} className="font-medium hover:text-primary">
                      {ticket.title}
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1">
                      by {ticket.profiles?.username || 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={ticket.status}
                      onValueChange={(value: TicketStatus) => updateStatus(ticket.id, value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteTicket(ticket.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {tickets.length === 0 && (
              <p className="text-center text-muted-foreground py-12">No reports yet</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
