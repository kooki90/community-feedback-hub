export type TicketType = 'bug' | 'suggestion' | 'feature';
export type TicketStatus = 'pending' | 'in_progress' | 'accepted' | 'resolved' | 'rejected';

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  user_id: string;
  title: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface Comment {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

export interface Vote {
  id: string;
  ticket_id: string;
  user_id: string;
  vote_type: 'up' | 'down';
  created_at: string;
}
