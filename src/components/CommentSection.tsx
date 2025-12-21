import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { MediaPreview } from '@/components/MediaPreview';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Comment, Profile } from '@/types/database';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Send, Trash2, Image, MessageCircle } from 'lucide-react';

interface CommentSectionProps {
  ticketId: string;
}

interface CommentWithProfile extends Omit<Comment, 'profiles'> {
  profiles: Profile | null;
  image_url?: string | null;
}

export function CommentSection({ ticketId }: CommentSectionProps) {
  const { user } = useAuthContext();
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [newComment, setNewComment] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel('comments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `ticket_id=eq.${ticketId}` },
        () => fetchComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const commentsWithProfiles = data.map(c => ({
        ...c,
        profiles: profileMap.get(c.user_id) || null
      }));
      setComments(commentsWithProfiles as CommentWithProfile[]);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    const { error } = await supabase
      .from('comments')
      .insert({
        ticket_id: ticketId,
        user_id: user.id,
        content: newComment.trim(),
        image_url: imageUrl.trim() || null
      });

    if (error) {
      toast.error('Failed to post comment');
    } else {
      setNewComment('');
      setImageUrl('');
      setShowImageInput(false);
      toast.success('Comment posted');
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      toast.error('Failed to delete comment');
    } else {
      toast.success('Comment deleted');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
      </div>

      {user && (
        <Card className="glass border-border/50">
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[100px] resize-none glass border-border/50 focus:border-primary/50"
              />
              
              {showImageInput && (
                <Input
                  placeholder="Image URL (optional)"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="glass border-border/50"
                />
              )}

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImageInput(!showImageInput)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Image className="h-4 w-4 mr-2" />
                  {showImageInput ? 'Hide' : 'Add'} Image
                </Button>
                
                <Button type="submit" disabled={submitting || !newComment.trim()} className="gap-2 glow-sm">
                  <Send className="h-4 w-4" />
                  Post Comment
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!user && (
        <Card className="glass border-border/50">
          <CardContent className="py-6 text-center text-muted-foreground">
            Sign in to leave a comment
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No comments yet. Be the first to share your thoughts!
          </div>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="glass-hover border-border/50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 ring-2 ring-border shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-primary/80 to-purple-600/80 text-primary-foreground text-sm font-medium">
                      {comment.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{comment.profiles?.username || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                    
                    {comment.image_url && (
                      <MediaPreview imageUrl={comment.image_url} className="mt-2" />
                    )}
                  </div>
                  {user?.id === comment.user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
