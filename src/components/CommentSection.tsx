import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { MediaPreview } from '@/components/MediaPreview';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Profile } from '@/types/database';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Send, Trash2, Image, MessageCircle, Reply, X, Smile } from 'lucide-react';

interface CommentSectionProps {
  ticketId: string;
}

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
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
  reactions?: Reaction[];
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export function CommentSection({ ticketId }: CommentSectionProps) {
  const { user } = useAuthContext();
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [newComment, setNewComment] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [replyingTo, setReplyingTo] = useState<CommentWithProfile | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    fetchComments();

    // Set up realtime for comments
    const commentsChannel = supabase
      .channel('comments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `ticket_id=eq.${ticketId}` },
        () => fetchComments()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comment_reactions' },
        () => fetchComments()
      )
      .subscribe();

    // Set up presence for typing indicators
    const presenceChannel = supabase.channel(`typing:${ticketId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users: string[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.typing && p.username && p.user_id !== user?.id) {
              users.push(p.username);
            }
          });
        });
        setTypingUsers(users);
      })
      .subscribe();

    channelRef.current = presenceChannel;

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [ticketId, user?.id]);

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const commentIds = data.map(c => c.id);

      const [profilesResult, reactionsResult] = await Promise.all([
        supabase.from('profiles').select('*').in('user_id', userIds),
        supabase.from('comment_reactions').select('*').in('comment_id', commentIds)
      ]);

      const profileMap = new Map(profilesResult.data?.map(p => [p.user_id, p]) || []);
      
      // Group reactions by comment
      const reactionsByComment = new Map<string, any[]>();
      reactionsResult.data?.forEach(r => {
        if (!reactionsByComment.has(r.comment_id)) {
          reactionsByComment.set(r.comment_id, []);
        }
        reactionsByComment.get(r.comment_id)!.push(r);
      });

      // Build threaded comments with reactions
      const commentsWithProfiles = data.map(c => {
        const commentReactions = reactionsByComment.get(c.id) || [];
        const emojiGroups = new Map<string, { count: number; users: string[]; hasReacted: boolean }>();
        
        commentReactions.forEach(r => {
          if (!emojiGroups.has(r.emoji)) {
            emojiGroups.set(r.emoji, { count: 0, users: [], hasReacted: false });
          }
          const group = emojiGroups.get(r.emoji)!;
          group.count++;
          group.users.push(r.user_id);
          if (r.user_id === user?.id) group.hasReacted = true;
        });

        const reactions = Array.from(emojiGroups.entries()).map(([emoji, data]) => ({
          emoji,
          ...data
        }));

        return {
          ...c,
          profiles: profileMap.get(c.user_id) || null,
          replies: [] as CommentWithProfile[],
          reactions
        };
      });

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

  const handleTyping = async () => {
    if (!user || !channelRef.current) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .maybeSingle();

    await channelRef.current.track({
      user_id: user.id,
      username: profile?.username || 'Someone',
      typing: true
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      await channelRef.current?.track({
        user_id: user.id,
        username: profile?.username || 'Someone',
        typing: false
      });
    }, 2000);
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

  const handleReaction = async (commentId: string, emoji: string, hasReacted: boolean) => {
    if (!user) {
      toast.error('Sign in to react');
      return;
    }

    if (hasReacted) {
      await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
    } else {
      await supabase
        .from('comment_reactions')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          emoji
        });
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
            
            {/* Reactions display */}
            {comment.reactions && comment.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {comment.reactions.map((reaction) => (
                  <button
                    key={reaction.emoji}
                    onClick={() => handleReaction(comment.id, reaction.emoji, reaction.hasReacted)}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
                      reaction.hasReacted 
                        ? 'bg-primary/20 border border-primary/50' 
                        : 'bg-muted/50 border border-border/30 hover:bg-muted'
                    }`}
                  >
                    <span>{reaction.emoji}</span>
                    <span className="text-[10px] text-muted-foreground">{reaction.count}</span>
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-1 mt-0.5">
              {user && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                    >
                      <Smile className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" side="top">
                    <div className="flex gap-1">
                      {EMOJI_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            const existing = comment.reactions?.find(r => r.emoji === emoji);
                            handleReaction(comment.id, emoji, existing?.hasReacted || false);
                          }}
                          className="text-lg hover:scale-125 transition-transform p-1"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
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
                onChange={(e) => {
                  setNewComment(e.target.value);
                  handleTyping();
                }}
                className="min-h-[80px] resize-none glass border-border/50 focus:border-primary/50"
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
                  {replyingTo ? 'Reply' : 'Send'}
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

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>
            {typingUsers.length === 1 
              ? `${typingUsers[0]} is typing...`
              : `${typingUsers.slice(0, 2).join(', ')}${typingUsers.length > 2 ? ` and ${typingUsers.length - 2} more` : ''} are typing...`
            }
          </span>
        </div>
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