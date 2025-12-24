-- Create comment read receipts table (if missing)
CREATE TABLE IF NOT EXISTS public.comment_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_comment_reads_comment_id ON public.comment_reads (comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reads_user_id ON public.comment_reads (user_id);

-- Enable RLS
ALTER TABLE public.comment_reads ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Read receipts are viewable by everyone" ON public.comment_reads;
CREATE POLICY "Read receipts are viewable by everyone"
ON public.comment_reads
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can mark comments as read" ON public.comment_reads;
CREATE POLICY "Authenticated users can mark comments as read"
ON public.comment_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own read receipts" ON public.comment_reads;
CREATE POLICY "Users can delete their own read receipts"
ON public.comment_reads
FOR DELETE
USING (auth.uid() = user_id);

-- Ensure only comment owner can edit their comment (fixes edit not updating)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments"
ON public.comments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
