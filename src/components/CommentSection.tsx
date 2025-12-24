import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Send, Trash2, Image, MessageCircle, Reply, X, Smile, Pencil, Check, CheckCheck } from 'lucide-react';

interface CommentSectionProps {
  ticketId: string;
}

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

interface ReadReceipt {
  user_id: string;
  username: string;
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
  readBy?: ReadReceipt[];
  isOptimistic?: boolean;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export function CommentSection({ ticketId }: CommentSectionProps) {
  const { user } = useAuthContext();
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [newComment, setNewComment] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [showImageInput, setShowImageInput] = useState(false);
  const [replyingTo, setReplyingTo] = useState<CommentWithProfile | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [profilesMap, setProfilesMap] = useState<Map<string, Profile>>(new Map());
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchComments = useCallback(async (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const commentIds = data.map((c) => c.id);

      if (commentIds.length === 0) {
        setComments([]);
        if (isInitial) setInitialLoading(false);
        return;
      }

      const [reactionsResult, readsResult] = await Promise.all([
        supabase.from('comment_reactions').select('*').in('comment_id', commentIds),
        supabase.from('comment_reads').select('comment_id,user_id').in('comment_id', commentIds),
      ]);

      const readUserIds = [...new Set((readsResult.data || []).map((r: any) => r.user_id))];
      const profileUserIds = [...new Set([...userIds, ...readUserIds])];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', profileUserIds);

      const newProfilesMap = new Map(profilesData?.map((p) => [p.user_id, p]) || []);
      setProfilesMap(newProfilesMap);

      // Mentions list is loaded separately, but keep a small fallback cache
      setAllProfiles((prev) => (prev.length ? prev : profilesData || []));
      
      const reactionsByComment = new Map<string, any[]>();
      reactionsResult.data?.forEach((r: any) => {
        if (!reactionsByComment.has(r.comment_id)) {
          reactionsByComment.set(r.comment_id, []);
        }
        reactionsByComment.get(r.comment_id)!.push(r);
      });

      const readsByComment = new Map<string, ReadReceipt[]>();
      (readsResult.data || []).forEach((r: any) => {
        if (!readsByComment.has(r.comment_id)) {
          readsByComment.set(r.comment_id, []);
        }
        const profile = newProfilesMap.get(r.user_id);
        readsByComment.get(r.comment_id)!.push({
          user_id: r.user_id,
          username: profile?.username || 'Unknown',
        });
      });

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
          profiles: newProfilesMap.get(c.user_id) || null,
          replies: [] as CommentWithProfile[],
          reactions,
          readBy: readsByComment.get(c.id) || []
        };
      });

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
      if (isInitial) setTimeout(scrollToBottom, 100);

      // Mark comments as read (background)
      if (user && commentIds.length > 0) {
        try {
          const session = await supabase.auth.getSession();
          const currentReadsRes = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/comment_reads?user_id=eq.${user.id}&comment_id=in.(${commentIds.join(',')})`,
            {
              headers: {
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                'Authorization': `Bearer ${session.data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
              }
            }
          );
          const currentReads = await currentReadsRes.json();
          const readCommentIds = Array.isArray(currentReads) ? currentReads.map((r: any) => r.comment_id) : [];
          
          const unreadComments = data.filter(c => 
            c.user_id !== user.id && !readCommentIds.includes(c.id)
          );
          
          if (unreadComments.length > 0) {
            await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/comment_reads`,
              {
                method: 'POST',
                headers: {
                  'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  'Authorization': `Bearer ${session.data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify(unreadComments.map(c => ({ comment_id: c.id, user_id: user.id })))
              }
            );
          }
        } catch (err) {
          console.log('Could not mark comments as read:', err);
        }
      }
    }
    if (isInitial) setInitialLoading(false);
  }, [ticketId, user]);

  useEffect(() => {
    fetchComments(true);

    const channel = supabase
      .channel(`ticket-comments:${ticketId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `ticket_id=eq.${ticketId}` },
        () => fetchComments(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comment_reactions' },
        () => fetchComments(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comment_reads' },
        () => fetchComments(false)
      )
      .subscribe();

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
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
    };
  }, [ticketId, user?.id, fetchComments]);

  const handleTyping = async () => {
    if (!user || !channelRef.current) return;

    const profile = profilesMap.get(user.id);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);
    handleTyping();

    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1].toLowerCase());
      setShowMentions(true);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const filteredProfiles = allProfiles.filter(p => 
    p.username.toLowerCase().includes(mentionQuery) && p.user_id !== user?.id
  ).slice(0, 5);

  const insertMention = (username: string) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = newComment.slice(0, cursorPos);
    const textAfterCursor = newComment.slice(cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const newText = textBeforeCursor.slice(0, -mentionMatch[0].length) + `@${username} ` + textAfterCursor;
      setNewComment(newText);
    }
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredProfiles.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredProfiles.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredProfiles.length) % filteredProfiles.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredProfiles[mentionIndex].username);
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    }
  };

  // Optimistic submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const profile = profilesMap.get(user.id) || allProfiles.find(p => p.user_id === user.id);
    
    const optimisticComment: CommentWithProfile = {
      id: tempId,
      ticket_id: ticketId,
      user_id: user.id,
      content: newComment.trim(),
      created_at: new Date().toISOString(),
      image_url: imageUrl.trim() || null,
      parent_id: replyingTo?.id || null,
      profiles: profile || null,
      replies: [],
      reactions: [],
      readBy: [],
      isOptimistic: true
    };

    // Add optimistically
    if (replyingTo) {
      setComments(prev => prev.map(c => {
        if (c.id === replyingTo.id) {
          return { ...c, replies: [...(c.replies || []), optimisticComment] };
        }
        return c;
      }));
    } else {
      setComments(prev => [...prev, optimisticComment]);
    }

    setNewComment('');
    setImageUrl('');
    setShowImageInput(false);
    setReplyingTo(null);
    setTimeout(scrollToBottom, 50);

    const insertData: any = {
      ticket_id: ticketId,
      user_id: user.id,
      content: optimisticComment.content,
      image_url: optimisticComment.image_url,
    };

    if (optimisticComment.parent_id) {
      insertData.parent_id = optimisticComment.parent_id;
    }

    const { data: inserted, error } = await supabase
      .from('comments')
      .insert(insertData)
      .select('*')
      .maybeSingle();

    if (error || !inserted) {
      console.error('Comment insert error:', error);
      toast.error('Failed to post comment');
      // Remove optimistic comment on error
      if (optimisticComment.parent_id) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === optimisticComment.parent_id) {
              return { ...c, replies: (c.replies || []).filter((r) => r.id !== tempId) };
            }
            return c;
          })
        );
      } else {
        setComments((prev) => prev.filter((c) => c.id !== tempId));
      }
      return;
    }

    // Replace optimistic comment with server row (keeps UI instant but removes "sending" state)
    if (optimisticComment.parent_id) {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === optimisticComment.parent_id) {
            return {
              ...c,
              replies: (c.replies || []).map((r) =>
                r.id === tempId
                  ? {
                      ...r,
                      id: inserted.id,
                      created_at: inserted.created_at,
                      image_url: inserted.image_url,
                      parent_id: inserted.parent_id,
                      isOptimistic: false,
                    }
                  : r
              ),
            };
          }
          return c;
        })
      );
    } else {
      setComments((prev) =>
        prev.map((c) =>
          c.id === tempId
            ? {
                ...c,
                id: inserted.id,
                created_at: inserted.created_at,
                image_url: inserted.image_url,
                parent_id: inserted.parent_id,
                isOptimistic: false,
              }
            : c
        )
      );
    }
  };

  // Optimistic edit
  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    const originalContent = comments.find(c => c.id === commentId)?.content || 
      comments.flatMap(c => c.replies || []).find(r => r.id === commentId)?.content;

    // Update optimistically
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, content: editContent.trim() };
      }
      if (c.replies) {
        return { ...c, replies: c.replies.map(r => r.id === commentId ? { ...r, content: editContent.trim() } : r) };
      }
      return c;
    }));

    setEditingId(null);
    setEditContent('');

    const { error } = await supabase
      .from('comments')
      .update({ content: editContent.trim() })
      .eq('id', commentId);

    if (error) {
      console.error('Edit error:', error);
      toast.error('Failed to edit comment');
      // Revert on error
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return { ...c, content: originalContent || '' };
        }
        if (c.replies) {
          return { ...c, replies: c.replies.map(r => r.id === commentId ? { ...r, content: originalContent || '' } : r) };
        }
        return c;
      }));
    }
  };

  // Optimistic delete
  const handleDelete = async (commentId: string) => {
    const deletedComment = comments.find(c => c.id === commentId) || 
      comments.flatMap(c => c.replies || []).find(r => r.id === commentId);
    const parentId = deletedComment?.parent_id;

    // Remove optimistically
    if (parentId) {
      setComments(prev => prev.map(c => {
        if (c.id === parentId) {
          return { ...c, replies: (c.replies || []).filter(r => r.id !== commentId) };
        }
        return c;
      }));
    } else {
      setComments(prev => prev.filter(c => c.id !== commentId));
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete comment');
      // Restore on error
      if (deletedComment) {
        if (parentId) {
          setComments(prev => prev.map(c => {
            if (c.id === parentId) {
              return { ...c, replies: [...(c.replies || []), deletedComment] };
            }
            return c;
          }));
        } else {
          setComments(prev => [...prev, deletedComment]);
        }
      }
    }
  };

  // Optimistic reaction
  const handleReaction = async (commentId: string, emoji: string, hasReacted: boolean) => {
    if (!user) {
      toast.error('Sign in to react');
      return;
    }

    // Update optimistically
    setComments(prev => prev.map(c => {
      const updateReactions = (comment: CommentWithProfile): CommentWithProfile => {
        if (comment.id === commentId) {
          const reactions = [...(comment.reactions || [])];
          const existingIdx = reactions.findIndex(r => r.emoji === emoji);
          
          if (hasReacted) {
            // Remove reaction
            if (existingIdx >= 0) {
              reactions[existingIdx] = {
                ...reactions[existingIdx],
                count: reactions[existingIdx].count - 1,
                users: reactions[existingIdx].users.filter(u => u !== user.id),
                hasReacted: false
              };
              if (reactions[existingIdx].count === 0) {
                reactions.splice(existingIdx, 1);
              }
            }
          } else {
            // Add reaction
            if (existingIdx >= 0) {
              reactions[existingIdx] = {
                ...reactions[existingIdx],
                count: reactions[existingIdx].count + 1,
                users: [...reactions[existingIdx].users, user.id],
                hasReacted: true
              };
            } else {
              reactions.push({ emoji, count: 1, users: [user.id], hasReacted: true });
            }
          }
          return { ...comment, reactions };
        }
        return comment;
      };

      const updated = updateReactions(c);
      if (updated.replies) {
        return { ...updated, replies: updated.replies.map(updateReactions) };
      }
      return updated;
    }));

    // Sync with server
    if (hasReacted) {
      const { error } = await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
      
      if (error) {
        console.error('Remove reaction error:', error);
        fetchComments(false); // Revert by refetching
      }
    } else {
      const { error } = await supabase
        .from('comment_reactions')
        .insert({ comment_id: commentId, user_id: user.id, emoji });
      
      if (error) {
        console.error('Add reaction error:', error);
        fetchComments(false); // Revert by refetching
      }
    }
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        const mentioned = allProfiles.find(p => p.username.toLowerCase() === username.toLowerCase());
        if (mentioned) {
          return (
            <span key={i} className="text-primary font-medium bg-primary/10 rounded px-1">
              {part}
            </span>
          );
        }
      }
      return part;
    });
  };

  const CommentItem = ({ comment, isReply = false }: { comment: CommentWithProfile; isReply?: boolean }) => {
    const isEditing = editingId === comment.id;
    const isOwner = user?.id === comment.user_id;
    const readByOthers = comment.readBy?.filter(r => r.user_id !== comment.user_id) || [];

    return (
      <div className={`${isReply ? 'ml-10' : ''} ${comment.isOptimistic ? 'opacity-70' : ''}`}>
        <div className="flex items-start gap-2">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-primary/80 to-purple-600/80 text-primary-foreground text-xs font-medium">
              {comment.profiles?.username?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="inline-block max-w-[85%]">
              <div className={`rounded-2xl px-3 py-2 border border-border/30 ${
                isOwner 
                  ? 'bg-primary/20 rounded-tr-sm' 
                  : 'bg-card/80 rounded-tl-sm'
              }`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-foreground">{comment.profiles?.username || 'Unknown'}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                
                {isEditing ? (
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="h-7 text-sm"
                      autoFocus
                    />
                    <Button size="sm" className="h-7 px-2" onClick={() => handleEdit(comment.id)}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingId(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{renderContent(comment.content)}</p>
                )}
                
                {comment.image_url && !isEditing && (
                  <MediaPreview imageUrl={comment.image_url} className="mt-1.5" />
                )}
              </div>

              {isOwner && readByOthers.length > 0 && (
                <div className="flex items-center gap-1 mt-0.5 ml-1">
                  <CheckCheck className="h-3 w-3 text-primary" />
                  <span className="text-[10px] text-muted-foreground">
                    Seen by {readByOthers.length === 1 
                      ? readByOthers[0].username 
                      : `${readByOthers.length} people`}
                  </span>
                </div>
              )}
              
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
                {user && !comment.isOptimistic && (
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
                {user && !isReply && !comment.isOptimistic && (
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
                {isOwner && !isEditing && !comment.isOptimistic && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => {
                      setEditingId(comment.id);
                      setEditContent(comment.content);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                {isOwner && !comment.isOptimistic && (
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

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-1.5 space-y-1.5">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[600px]">
      <div className="flex items-center gap-2 pb-3 border-b border-border/50">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {initialLoading ? (
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
        <div ref={messagesEndRef} />
      </div>

      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
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

      {user ? (
        <Card className="glass border-border/50 mt-auto shrink-0">
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
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  placeholder={replyingTo ? "Write a reply... (use @ to mention)" : "Write a comment... (use @ to mention)"}
                  value={newComment}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="min-h-[60px] resize-none glass border-border/50 focus:border-primary/50 pr-2"
                />
                
                {showMentions && filteredProfiles.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-1 w-64 bg-popover border border-border rounded-md shadow-lg z-50">
                    {filteredProfiles.map((profile, index) => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => insertMention(profile.username)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/50 ${
                          index === mentionIndex ? 'bg-muted/50' : ''
                        }`}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-primary/20 text-xs">
                            {profile.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>@{profile.username}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
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
                
                <Button type="submit" disabled={!newComment.trim()} className="gap-2 glow-sm">
                  <Send className="h-4 w-4" />
                  {replyingTo ? 'Reply' : 'Send'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass border-border/50 mt-auto shrink-0">
          <CardContent className="py-6 text-center text-muted-foreground">
            Sign in to leave a comment
          </CardContent>
        </Card>
      )}
    </div>
  );
}
