-- Create table for comment reactions
CREATE TABLE public.comment_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Reactions are viewable by everyone" 
ON public.comment_reactions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add reactions" 
ON public.comment_reactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions" 
ON public.comment_reactions FOR DELETE 
USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_comment_reactions_comment_id ON public.comment_reactions(comment_id);

-- Enable realtime for typing indicators
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_reactions;