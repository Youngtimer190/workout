/**
 * Template service – zarządza szablonami treningów w Supabase.
 * Działa na kluczu `anon` z sesją użytkownika – pod ochroną RLS.
 */
import { supabase, isSupabaseConfigured } from './supabase';
import { WorkoutTemplate } from '../types';

export async function fetchTemplates(userId: string): Promise<WorkoutTemplate[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('[templateService] fetchTemplates error:', error);
    return [];
  }
  // Map database fields to frontend interface
  // DB: id (UUID), template_id (string), created_at, updated_at
  // Frontend: id (template_id), createdAt, updatedAt
  return (data ?? []).map(row => ({
    id: row.template_id,
    name: row.name,
    description: row.description ?? '',
    exercises: row.exercises ?? [],
    color: row.color ?? 'bg-violet-500',
    category: row.category ?? 'Custom',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })) as WorkoutTemplate[];
}

export async function upsertTemplate(userId: string, template: WorkoutTemplate): Promise<Error | null> {
  if (!isSupabaseConfigured) return null;
  const { error } = await supabase.from('workout_templates').upsert(
    {
      user_id: userId,
      template_id: template.id,
      name: template.name,
      description: template.description,
      exercises: template.exercises,
      color: template.color,
      category: template.category,
      created_at: template.createdAt,
      updated_at: template.updatedAt,
    },
    { onConflict: 'user_id,template_id' }
  );
  if (error) {
    console.error('[templateService] upsertTemplate error:', error);
    return new Error(error.message);
  }
  return null;
}

export async function deleteTemplateRemote(userId: string, templateId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase
    .from('workout_templates')
    .delete()
    .eq('user_id', userId)
    .eq('template_id', templateId);
}