import { useState, useCallback, useEffect } from 'react';
import { WorkoutTemplate, Exercise } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  fetchTemplates,
  upsertTemplate,
  deleteTemplateRemote,
} from '../lib/templateService';

const TEMPLATES_STORAGE_KEY = 'workout-planner-templates';

function loadTemplatesLocal(): WorkoutTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveTemplatesLocal(templates: WorkoutTemplate[]) {
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

function generateId(): string {
  return `tmpl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useTemplateStore(userId?: string) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(loadTemplatesLocal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(() => !!isSupabaseConfigured);

  // ── Sync from cloud on user change ──
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsHydrating(false);
      return;
    }

    if (!userId) {
      // Wylogowanie – wyczyść lokalne dane
      saveTemplatesLocal([]);
      setTemplates([]);
      setIsHydrating(false);
      return;
    }

    const syncFromCloud = async () => {
      setLoading(true);
      try {
        const cloudTemplates = await fetchTemplates(userId);
        saveTemplatesLocal(cloudTemplates);
        setTemplates(cloudTemplates);
      } catch (err) {
        console.error('[TemplateStore] Sync error:', err);
        setError('Nie udało się zsynchronizować szablonów');
      } finally {
        setLoading(false);
        setIsHydrating(false);
      }
    };

    syncFromCloud();
  }, [userId]);

  // ── Mutations ──
  const addTemplate = useCallback(async (template: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newTemplate: WorkoutTemplate = {
      ...template,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };

    setTemplates(prev => {
      const next = [...prev, newTemplate];
      saveTemplatesLocal(next);
      return next;
    });

    if (userId && isSupabaseConfigured) {
      try {
        await upsertTemplate(userId, newTemplate);
      } catch (err) {
        console.error('[TemplateStore] addTemplate cloud error:', err);
      }
    }

    return newTemplate;
  }, [userId]);

  const updateTemplate = useCallback(async (updated: WorkoutTemplate) => {
    const now = new Date().toISOString();
    const templateWithTime = { ...updated, updatedAt: now };

    setTemplates(prev => {
      const next = prev.map(t => t.id === updated.id ? templateWithTime : t);
      saveTemplatesLocal(next);
      return next;
    });

    if (userId && isSupabaseConfigured) {
      try {
        await upsertTemplate(userId, templateWithTime);
      } catch (err) {
        console.error('[TemplateStore] updateTemplate cloud error:', err);
      }
    }
  }, [userId]);

  const deleteTemplate = useCallback(async (id: string) => {
    console.log('[TemplateStore] deleteTemplate called with id:', id);

    // Safety check: validate ID
    if (!id || typeof id !== 'string') {
      console.error('[TemplateStore] Invalid template ID:', id);
      return;
    }

    setTemplates(prev => {
      const toDelete = prev.find(t => t.id === id);
      console.log('[TemplateStore] Template to delete:', toDelete);
      console.log('[TemplateStore] All templates before delete:', prev.map(t => ({ id: t.id, name: t.name })));

      // Safety: count how many would be deleted
      const matchingCount = prev.filter(t => t.id === id).length;
      if (matchingCount === 0) {
        console.warn('[TemplateStore] No template found with ID:', id);
        return prev; // Don't modify state
      }
      if (matchingCount > 1) {
        console.error('[TemplateStore] CRITICAL: Multiple templates with same ID:', id, 'count:', matchingCount);
      }

      const next = prev.filter(t => t.id !== id);
      console.log('[TemplateStore] Templates after delete:', next.map(t => ({ id: t.id, name: t.name })));

      if (next.length === prev.length) {
        console.warn('[TemplateStore] No template was deleted - ID not found:', id);
      }

      saveTemplatesLocal(next);
      return next;
    });

    if (userId && isSupabaseConfigured) {
      try {
        await deleteTemplateRemote(userId, id);
        console.log('[TemplateStore] Cloud delete succeeded for:', id);
      } catch (err) {
        console.error('[TemplateStore] deleteTemplate cloud error:', err);
      }
    }
  }, [userId]);

  const refreshTemplates = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) return;
    setLoading(true);
    try {
      const cloudTemplates = await fetchTemplates(userId);
      saveTemplatesLocal(cloudTemplates);
      setTemplates(cloudTemplates);
      setError(null);
    } catch (err) {
      console.error('[TemplateStore] refresh error:', err);
      setError('Nie udało się odświeżyć szablonów');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ── Helpers ──
  const getTemplate = useCallback((id: string) => templates.find(t => t.id === id), [templates]);

  return {
    templates,
    loading,
    error,
    isHydrating,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    refreshTemplates,
    getTemplate,
  };
}