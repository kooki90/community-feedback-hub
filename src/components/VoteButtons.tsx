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
        // Remove vote
        await supabase
          .from('votes')
          .delete()
          .eq('ticket_id', ticketId)
          .eq('user_id', user.id);
        setUserVote(null);
      } else if (userVote) {
        // Change vote
        await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('ticket_id', ticketId)
          .eq('user_id', user.id);
        setUserVote(voteType);
      } else {
        // New vote
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

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={loading}
        onClick={() => handleVote('up')}
        className={`h-8 gap-1 px-2 ${userVote === 'up' ? 'text-primary bg-primary/10' : ''}`}
      >
        <ThumbsUp className="h-4 w-4" />
        <span className="text-xs font-medium">{upvotes}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={loading}
        onClick={() => handleVote('down')}
        className={`h-8 gap-1 px-2 ${userVote === 'down' ? 'text-destructive bg-destructive/10' : ''}`}
      >
        <ThumbsDown className="h-4 w-4" />
        <span className="text-xs font-medium">{downvotes}</span>
      </Button>
    </div>
  );
}
