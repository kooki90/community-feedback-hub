import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface VoteButtonsProps {
  ticketId: string;
  upvotes: number;
  downvotes: number;
  onVoteChange?: () => void;
}

export function VoteButtons({ ticketId, upvotes, downvotes, onVoteChange }: VoteButtonsProps) {
  const { user } = useAuthContext();
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserVote();
    }
  }, [user, ticketId]);

  const fetchUserVote = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('ticket_id', ticketId)
      .eq('user_id', user.id)
      .maybeSingle();
    
    setUserVote(data?.vote_type as 'up' | 'down' | null);
  };

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!user) {
      toast.error('Please sign in to vote');
      return;
    }

    setLoading(true);
    try {
      if (userVote === voteType) {
        await supabase
          .from('votes')
          .delete()
          .eq('ticket_id', ticketId)
          .eq('user_id', user.id);
        setUserVote(null);
      } else if (userVote) {
        await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('ticket_id', ticketId)
          .eq('user_id', user.id);
        setUserVote(voteType);
      } else {
        await supabase
          .from('votes')
          .insert({ ticket_id: ticketId, user_id: user.id, vote_type: voteType });
        setUserVote(voteType);
      }
      onVoteChange?.();
    } catch (error) {
      toast.error('Failed to vote');
    } finally {
      setLoading(false);
    }
  };

  const score = upvotes - downvotes;

  return (
    <div className="flex flex-col items-center gap-1 px-2">
      <Button
        variant="ghost"
        size="icon"
        disabled={loading}
        onClick={() => handleVote('up')}
        className={`h-8 w-8 rounded-full transition-all ${
          userVote === 'up' 
            ? 'bg-primary/20 text-primary hover:bg-primary/30' 
            : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
        }`}
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>
      <span className={`text-sm font-bold tabular-nums ${
        score > 0 ? 'text-primary' : score < 0 ? 'text-destructive' : 'text-muted-foreground'
      }`}>
        {score > 0 ? `+${score}` : score}
      </span>
      <Button
        variant="ghost"
        size="icon"
        disabled={loading}
        onClick={() => handleVote('down')}
        className={`h-8 w-8 rounded-full transition-all ${
          userVote === 'down' 
            ? 'bg-destructive/20 text-destructive hover:bg-destructive/30' 
            : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
        }`}
      >
        <ThumbsDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
