import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { TicketType } from '@/types/database';
import { toast } from 'sonner';
import { Bug, Lightbulb, Sparkles, Loader2, ArrowLeft, Image, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { z } from 'zod';

const ticketSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description must be less than 2000 characters'),
  type: z.enum(['bug', 'suggestion', 'feature']),
  image_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  video_url: z.string().url('Invalid URL').optional().or(z.literal(''))
});

const typeOptions = [
  { value: 'bug' as TicketType, label: 'Bug Report', icon: Bug, description: 'Report something broken', color: 'text-red-400 border-red-500/30 bg-red-500/10' },
  { value: 'suggestion' as TicketType, label: 'Suggestion', icon: Lightbulb, description: 'Share an improvement', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { value: 'feature' as TicketType, label: 'Feature Request', icon: Sparkles, description: 'Request new feature', color: 'text-primary border-primary/30 bg-primary/10' }
];

export default function Submit() {
  const navigate = useNavigate();
  const { user, loading } = useAuthContext();
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'bug' as TicketType,
    image_url: '',
    video_url: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = ticketSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    if (!user) return;

    setFormLoading(true);
    const { error, data } = await supabase
      .from('tickets')
      .insert({
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        image_url: formData.image_url.trim() || null,
        video_url: formData.video_url.trim() || null
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to submit ticket');
    } else {
      toast.success('Ticket submitted successfully!');
      navigate(`/ticket/${data.id}`);
    }
    setFormLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <Header />
      <main className="relative container mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to tickets
        </Link>

        <Card className="max-w-2xl mx-auto glass border-border/50">
          <CardHeader>
            <CardTitle className="text-2xl gradient-text">Submit a Ticket</CardTitle>
            <CardDescription>
              Report a bug, suggest an improvement, or request a new feature
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label>Type</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {typeOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = formData.type === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: option.value })}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          isSelected
                            ? `${option.color} ring-2 ring-current/30`
                            : 'border-border/50 hover:border-border bg-secondary/30'
                        }`}
                      >
                        <Icon className={`h-5 w-5 mb-2 ${isSelected ? '' : 'text-muted-foreground'}`} />
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Brief summary of the issue or idea"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-12 glass border-border/50 focus:border-primary/50"
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Provide details about the bug, suggestion, or feature request..."
                  className="min-h-[150px] glass border-border/50 focus:border-primary/50"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="image_url" className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    Image URL (optional)
                  </Label>
                  <Input
                    id="image_url"
                    placeholder="https://example.com/image.png"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="glass border-border/50 focus:border-primary/50"
                  />
                  {errors.image_url && <p className="text-sm text-destructive">{errors.image_url}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video_url" className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    Video URL (optional)
                  </Label>
                  <Input
                    id="video_url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    className="glass border-border/50 focus:border-primary/50"
                  />
                  {errors.video_url && <p className="text-sm text-destructive">{errors.video_url}</p>}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={formLoading} className="flex-1 h-12 glow-sm">
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Ticket'}
                </Button>
                <Link to="/">
                  <Button type="button" variant="outline" className="h-12 glass border-border/50">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
