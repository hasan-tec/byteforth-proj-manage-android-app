export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Project, 'id' | 'created_at'>>;
      };
      milestones: {
        Row: Milestone;
        Insert: Omit<Milestone, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Milestone, 'id' | 'created_at'>>;
      };
      outsourcing: {
        Row: Outsourcing;
        Insert: Omit<Outsourcing, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Outsourcing, 'id' | 'created_at'>>;
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Payment, 'id' | 'created_at'>>;
      };
      activity_logs: {
        Row: ActivityLog;
        Insert: Omit<ActivityLog, 'id' | 'created_at'>;
        Update: never;
      };
    };
  };
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'founder' | 'co_founder';
  avatar_url?: string;
  push_token?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  total_budget: number;
  description?: string;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  price: number;
  status: 'pending' | 'approved' | 'rejected' | 'withdrew' | 'completed';
  description?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  project?: Project;
}

export interface Outsourcing {
  id: string;
  project_id: string;
  part_name: string;
  price: number;
  person_name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  payment_status: 'unpaid' | 'paid' | 'partially_paid';
  created_at: string;
  updated_at: string;
  project?: Project;
}

export interface Payment {
  id: string;
  project_id: string;
  outsourcing_id?: string;
  recipient_name: string;
  recipient_email?: string;
  amount: number;
  description: string;
  status: 'needs_to_be_paid' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  paid_date?: string;
  payment_method?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  project?: Project;
  outsourcing?: Outsourcing;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: 'project' | 'milestone' | 'outsourcing' | 'user' | 'payment';
  resource_id: string;
  description: string;
  created_at: string;
  profile?: Profile;
}