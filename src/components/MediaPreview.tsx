import { useState } from 'react';
import { Image, Play, X, ExternalLink } from 'lucide-react';

interface MediaPreviewProps {
  imageUrl?: string | null;
  videoUrl?: string | null;
  className?: string;
}

export function MediaPreview({ imageUrl, videoUrl, className = '' }: MediaPreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxContent, setLightboxContent] = useState<{ type: 'image' | 'video'; url: string } | null>(null);

  const openLightbox = (type: 'image' | 'video', url: string) => {
    setLightboxContent({ type, url });
    setLightboxOpen(true);
  };

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const isYouTube = videoUrl && getYouTubeId(videoUrl);

  if (!imageUrl && !videoUrl) return null;

  return (
    <>
      <div className={`flex gap-2 flex-wrap ${className}`}>
        {imageUrl && (
          <button
            onClick={() => openLightbox('image', imageUrl)}
            className="relative group overflow-hidden rounded-lg border border-border/50 hover:border-primary/50 transition-all"
          >
            <img
              src={imageUrl}
              alt="Attached media"
              className="h-32 w-auto max-w-[200px] object-cover transition-transform group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Image className="h-6 w-6 text-primary" />
            </div>
          </button>
        )}

        {videoUrl && (
          isYouTube ? (
            <button
              onClick={() => openLightbox('video', videoUrl)}
              className="relative group overflow-hidden rounded-lg border border-border/50 hover:border-primary/50 transition-all"
            >
              <img
                src={`https://img.youtube.com/vi/${getYouTubeId(videoUrl)}/mqdefault.jpg`}
                alt="Video thumbnail"
                className="h-32 w-auto object-cover"
              />
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center group-hover:bg-background/40 transition-colors">
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center glow-sm">
                  <Play className="h-6 w-6 text-primary-foreground ml-1" />
                </div>
              </div>
            </button>
          ) : (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-32 px-6 flex items-center gap-2 rounded-lg border border-border/50 hover:border-primary/50 bg-secondary/50 transition-all text-muted-foreground hover:text-foreground"
            >
              <Play className="h-5 w-5" />
              <span className="text-sm">View Video</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          )
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && lightboxContent && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          {lightboxContent.type === 'image' ? (
            <img
              src={lightboxContent.url}
              alt="Full size"
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
              <iframe
                src={`https://www.youtube.com/embed/${getYouTubeId(lightboxContent.url)}?autoplay=1`}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
