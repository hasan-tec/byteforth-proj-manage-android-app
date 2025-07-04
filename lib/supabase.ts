import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Web-compatible storage implementation
const storage = Platform.OS === 'web' 
  ? {
      getItem: (key: string) => {
        if (typeof localStorage === 'undefined') return null;
        return localStorage.getItem(key);
      },
      setItem: (key: string, value: string) => {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(key, value);
      },
      removeItem: (key: string) => {
        if (typeof localStorage === 'undefined') return;
        localStorage.removeItem(key);
      },
    }
  : AsyncStorage;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database helper functions
export const dbHelpers = {
  // Profile operations
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Database['public']['Tables']['profiles']['Update']>) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Project operations
  async getProjects(userId?: string) {
    let query = supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (userId) {
      query = query.eq('created_by', userId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createProject(project: Database['public']['Tables']['projects']['Insert']) {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...project,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateProject(projectId: string, updates: Database['public']['Tables']['projects']['Update']) {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteProject(projectId: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
    
    if (error) throw error;
  },

  // Milestone operations
  async getMilestones(projectId?: string) {
    let query = supabase
      .from('milestones')
      .select(`
        *,
        project:projects(name)
      `)
      .order('order_index', { ascending: true });
    
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createMilestone(milestone: Database['public']['Tables']['milestones']['Insert']) {
    const { data, error } = await supabase
      .from('milestones')
      .insert({
        ...milestone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateMilestone(milestoneId: string, updates: Database['public']['Tables']['milestones']['Update']) {
    const { data, error } = await supabase
      .from('milestones')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', milestoneId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Outsourcing operations
  async getOutsourcing(projectId?: string) {
    let query = supabase
      .from('outsourcing')
      .select(`
        *,
        project:projects(name)
      `)
      .order('created_at', { ascending: false });
    
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createOutsourcing(outsourcing: Database['public']['Tables']['outsourcing']['Insert']) {
    const { data, error } = await supabase
      .from('outsourcing')
      .insert({
        ...outsourcing,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateOutsourcing(outsourcingId: string, updates: Database['public']['Tables']['outsourcing']['Update']) {
    const { data, error } = await supabase
      .from('outsourcing')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', outsourcingId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Payment operations
  async getPayments(projectId?: string) {
    let query = supabase
      .from('payments')
      .select(`
        *,
        project:projects(name),
        outsourcing:outsourcing(part_name)
      `)
      .order('due_date', { ascending: true });
    
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createPayment(payment: Database['public']['Tables']['payments']['Insert']) {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        ...payment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updatePayment(paymentId: string, updates: Database['public']['Tables']['payments']['Update']) {
    const { data, error } = await supabase
      .from('payments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', paymentId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Activity log operations
  async getActivityLogs(userId?: string, limit = 50) {
    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        profile:profiles(full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createActivityLog(log: Database['public']['Tables']['activity_logs']['Insert']) {
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        ...log,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Real-time subscriptions
  subscribeToProjects(callback: (payload: any) => void) {
    return supabase
      .channel('projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, callback)
      .subscribe();
  },

  subscribeToMilestones(projectId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`milestones:${projectId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'milestones',
        filter: `project_id=eq.${projectId}`
      }, callback)
      .subscribe();
  },

  subscribeToPayments(callback: (payload: any) => void) {
    return supabase
      .channel('payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, callback)
      .subscribe();
  },

  subscribeToActivityLogs(callback: (payload: any) => void) {
    return supabase
      .channel('activity_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, callback)
      .subscribe();
  },
};