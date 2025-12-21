import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { TicketType } from '@/types/database';
import { toast } from 'sonner';
import { Bug, Lightbulb, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { z } from 'zod';

const ticketSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description must be less than 2000 characters'),
  type: z.enum(['bug', 'suggestion', 'feature'])
});

const typeOptions = [
  { value: 'bug' as TicketType, label: 'Bug Report', icon: Bug, description: 'Report something broken' },
  { value: 'suggestion' as TicketType, label: 'Suggestion', icon: Lightbulb, description: 'Share an improvement idea' },
  { value: 'feature' as TicketType, label: 'Feature Request', icon: Sparkles, description: 'Request a new feature' }
];

export default function Submit() {
  const navigate = useNavigate();
  const { user, loading } = useAuthContext();
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'bug' as TicketType
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
        type: formData.type
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
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to tickets
        </Link>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Submit a Ticket</CardTitle>
            <CardDescription>
              Report a bug, suggest an improvement, or request a new feature
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Type</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {typeOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: option.value })}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          formData.type === option.value
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Icon className={`h-5 w-5 mb-2 ${formData.type === option.value ? 'text-primary' : 'text-muted-foreground'}`} />
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
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Provide details about the bug, suggestion, or feature request..."
                  className="min-h-[150px]"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={formLoading} className="flex-1">
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Ticket'}
                </Button>
                <Link to="/">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
