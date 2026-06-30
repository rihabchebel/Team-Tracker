// src/lib/supabaseClient.ts
import { supabase } from './supabase';

// Re-export supabase for convenience
export { supabase };

// Helper functions for common operations
export const supabaseClient = {
  // Users
  getUsers: async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data;
  },
  
  createUser: async (user: any) => {
    const { data, error } = await supabase.from('users').insert(user).select().single();
    if (error) throw error;
    return data;
  },
  
  updateUser: async (id: string, updates: any) => {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  
  deleteUser: async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  },

  // Projects
  getProjects: async () => {
    const { data, error } = await supabase.from('projects').select('*');
    if (error) throw error;
    return data;
  },
  
  getProjectById: async (id: string) => {
    const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  
  getProjectWithDetails: async (id: string) => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        sub_projects (*),
        team_members (
          *,
          users (*)
        )
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Task Logs
  getTaskLogs: async () => {
    const { data, error } = await supabase
      .from('task_logs')
      .select('*, users(name, email), projects(name)')
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  
  createTaskLog: async (log: any) => {
    const { data, error } = await supabase.from('task_logs').insert(log).select().single();
    if (error) throw error;
    return data;
  },
};