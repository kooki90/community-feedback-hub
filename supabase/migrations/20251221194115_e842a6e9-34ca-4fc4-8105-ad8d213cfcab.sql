-- Add media URL fields to tickets
ALTER TABLE public.tickets 
ADD COLUMN image_url TEXT,
ADD COLUMN video_url TEXT;

-- Add media URL to comments
ALTER TABLE public.comments
ADD COLUMN image_url TEXT;