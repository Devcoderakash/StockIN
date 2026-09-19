/**
 * src/features/settings/services/settingsService.ts
 *
 * Dedicated Supabase service layer for Business Settings operations
 */

import { supabase } from '@/lib/supabase/client';
import type { BusinessSettings } from '@/types';

export interface DbBusinessSettings {
  user_id: string;
  settings: Record<string, unknown>;
  updated_at?: string | null;
}

export function dbToSettings(r: DbBusinessSettings | null): BusinessSettings | null {
  if (!r || !r.settings) return null;
  return r.settings as unknown as BusinessSettings;
}

export async function fetchBusinessSettings(userId: string): Promise<BusinessSettings | null> {
  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .eq('user_id', userId)
    .limit(1);

  if (error) {
    console.error('[SettingsService] fetchBusinessSettings:', error.message);
    throw error;
  }

  if (data && data.length > 0) {
    return dbToSettings(data[0] as DbBusinessSettings);
  }
  return null;
}

export async function upsertBusinessSettings(userId: string, settings: BusinessSettings): Promise<void> {
  const { error } = await supabase.from('business_settings').upsert(
    {
      user_id:    userId,
      settings:   settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    console.error('[SettingsService] upsertBusinessSettings:', error.message);
    throw error;
  }
}
