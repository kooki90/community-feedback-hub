import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { MediaPreview } from '@/components/MediaPreview';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Profile } from '@/types/database';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Send, Trash2, Image, MessageCircle, Reply, X } from 'lucide-react';

interface CommentSectionProps {
  ticketId: string;
}

interface CommentWithProfile {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  created_at: string;
  image_url?: string | null;
  parent_id?: string | null;
  profiles: Profile | null;
  replies?: CommentWithProfile[];
}

export function CommentSection({ ticketId }: CommentSectionProps) {
  const { user } = useAuthContext();
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [newComment, setNewComment] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [replyingTo, setReplyingTo] = useState<CommentWithProfile | null>(null);

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
      
      // Build threaded comments
      const commentsWithProfiles = data.map(c => ({
        ...c,
        profiles: profileMap.get(c.user_id) || null,
        replies: [] as CommentWithProfile[]
      }));

      // Organize into parent-child structure
      const commentMap = new Map<string, CommentWithProfile>();
      commentsWithProfiles.forEach(c => commentMap.set(c.id, c));
      
      const rootComments: CommentWithProfile[] = [];
      commentsWithProfiles.forEach(c => {
        if (c.parent_id && commentMap.has(c.parent_id)) {
          const parent = commentMap.get(c.parent_id)!;
          if (!parent.replies) parent.replies = [];
          parent.replies.push(c);
        } else if (!c.parent_id) {
          rootComments.push(c);
        }
      });

      setComments(rootComments);
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
        image_url: imageUrl.trim() || null,
        parent_id: replyingTo?.id || null
      });

    if (error) {
      toast.error('Failed to post comment');
    } else {
      setNewComment('');
      setImageUrl('');
      setShowImageInput(false);
      setReplyingTo(null);
      toast.success(replyingTo ? 'Reply posted' : 'Comment posted');
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

  const CommentItem = ({ comment, isReply = false }: { comment: CommentWithProfile; isReply?: boolean }) => (
    <div className={`${isReply ? 'ml-10' : ''}`}>
      <div className="flex items-start gap-2">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-primary/80 to-purple-600/80 text-primary-foreground text-xs font-medium">
            {comment.profiles?.username?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="inline-block max-w-[85%]">
            <div className="bg-card/80 rounded-2xl rounded-tl-sm px-3 py-2 border border-border/30">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-foreground">{comment.profiles?.username || 'Unknown'}</span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
              
              {comment.image_url && (
                <MediaPreview imageUrl={comment.image_url} className="mt-1.5" />
              )}
            </div>
            
            <div className="flex items-center gap-1 mt-0.5">
              {user && !isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                  onClick={() => setReplyingTo(comment)}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}
              {user?.id === comment.user_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(comment.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Render replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-1.5 space-y-1.5">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
      </div>

      {user && (
        <Card className="glass border-border/50">
          <CardContent className="pt-4">
            {replyingTo && (
              <div className="flex items-center justify-between bg-muted/30 rounded-md p-2 mb-3">
                <span className="text-sm text-muted-foreground">
                  Replying to <span className="font-medium text-foreground">{replyingTo.profiles?.username}</span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setReplyingTo(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
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
                  {replyingTo ? 'Post Reply' : 'Post Comment'}
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

      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No comments yet. Be the first to share your thoughts!
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </div>
  );
}