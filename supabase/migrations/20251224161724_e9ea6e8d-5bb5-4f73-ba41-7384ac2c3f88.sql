-- Add parent_id column for comment replies
ALTER TABLE public.comments 
ADD COLUMN parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

-- Create index for faster parent lookups
CREATE INDEX idx_comments_parent_id ON public.comments(parent_id);