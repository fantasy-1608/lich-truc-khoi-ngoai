import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  DepartmentAssignments,
  Doctor,
  HolidayScheduleData,
  ScheduleSnapshotEntry,
  Tour,
} from '../types';

const BASE_FILENAME = 'schedule_base.json';
const BASE_ID = 'default';
const EDITOR_EMAIL_STORAGE_KEY = 'schedule-editor-email';

let editorEmail = '';
sessionStorage.removeItem(EDITOR_EMAIL_STORAGE_KEY);

export interface ScheduleBaseStorageData {
  doctors?: Doctor[];
  tours?: Tour[];
  tourOrder?: string[];
  showPkdv?: boolean;
  rotationStartDate?: string | null;
  holidaySchedule?: HolidayScheduleData;
  lastSaved?: string | null;
}

export interface ScheduleMonthStorageData {
  tourOverrides?: Record<string, string>;
  doctorOverrides?: Record<string, string[]>;
  scheduleSnapshots?: Record<string, ScheduleSnapshotEntry>;
  departmentAssignments?: Record<string, Partial<DepartmentAssignments>>;
  holidaySchedule?: HolidayScheduleData;
}

export interface ScheduleStorageRecord<T> {
  data: T | null;
  updatedAt: string | null;
}

export class ScheduleConflictError extends Error {
  constructor() {
    super('schedule_conflict');
    this.name = 'ScheduleConflictError';
  }
}

const monthFromFilename = (filename: string): string => {
  const match = filename.match(/^schedule_(\d{4})_(\d{2})\.json$/);
  if (!match) {
    throw new Error(`Invalid schedule month filename: ${filename}`);
  }
  return `${match[1]}-${match[2]}`;
};

const filenameFromMonth = (month: string): string => {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid schedule month: ${month}`);
  }
  return `schedule_${match[1]}_${match[2]}.json`;
};

const isScheduleConflictError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: string; message?: string };
  return value.code === '40001' || value.message === 'schedule_conflict';
};

const throwStorageError = (error: unknown): never => {
  if (isScheduleConflictError(error)) {
    throw new ScheduleConflictError();
  }
  throw error;
};

export const setScheduleEditorEmail = (email: string): void => {
  editorEmail = email.trim();
};

export const clearScheduleEditorEmail = (): void => {
  editorEmail = '';
  sessionStorage.removeItem(EDITOR_EMAIL_STORAGE_KEY);
};

export const verifyScheduleEditorEmail = async (email: string): Promise<boolean> => {
  if (!supabase) return true;

  const { data, error } = await supabase.rpc('is_schedule_editor', {
    input_email: email.trim(),
  });

  if (error) throw error;
  return data === true;
};

const fetchLocalJson = async <T>(filename: string): Promise<T | null> => {
  const res = await fetch(`/api/storage/${filename}`);
  if (!res.ok) return null;
  return (await res.json()) as T;
};

const saveLocalJson = async (filename: string, data: unknown): Promise<void> => {
  const res = await fetch(`/api/storage/${filename}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data, null, 2),
  });
  if (!res.ok) {
    throw new Error(`Could not save ${filename}`);
  }
};

export const loadBaseScheduleData = async (): Promise<
  ScheduleStorageRecord<ScheduleBaseStorageData>
> => {
  if (!supabase) {
    return {
      data: await fetchLocalJson<ScheduleBaseStorageData>(BASE_FILENAME),
      updatedAt: null,
    };
  }

  const { data, error } = await supabase
    .from('schedule_base')
    .select('data, updated_at')
    .eq('id', BASE_ID)
    .maybeSingle();

  if (error) throw error;
  return {
    data: (data?.data as ScheduleBaseStorageData | undefined) ?? null,
    updatedAt: (data?.updated_at as string | undefined) ?? null,
  };
};

export const saveBaseScheduleData = async (
  data: ScheduleBaseStorageData,
  expectedUpdatedAt: string | null,
): Promise<string | null> => {
  if (!supabase) {
    await saveLocalJson(BASE_FILENAME, data);
    return null;
  }

  if (!editorEmail) {
    throw new Error('Missing editor email');
  }

  const { data: updatedAt, error } = await supabase.rpc('save_schedule_base_if_current_by_email', {
    input_email: editorEmail,
    input_data: data,
    expected_updated_at: expectedUpdatedAt,
  });

  if (error) throwStorageError(error);
  return (updatedAt as string | null) ?? null;
};

export const loadMonthScheduleData = async (
  filename: string,
): Promise<ScheduleStorageRecord<ScheduleMonthStorageData>> => {
  if (!supabase) {
    return {
      data: await fetchLocalJson<ScheduleMonthStorageData>(filename),
      updatedAt: null,
    };
  }

  const month = monthFromFilename(filename);
  const { data, error } = await supabase
    .from('schedule_months')
    .select('data, updated_at')
    .eq('month', month)
    .maybeSingle();

  if (error) throw error;
  return {
    data: (data?.data as ScheduleMonthStorageData | undefined) ?? null,
    updatedAt: (data?.updated_at as string | undefined) ?? null,
  };
};

export const saveMonthScheduleData = async (
  filename: string,
  data: ScheduleMonthStorageData,
  expectedUpdatedAt: string | null,
): Promise<string | null> => {
  if (!supabase) {
    await saveLocalJson(filename, data);
    return null;
  }

  if (!editorEmail) {
    throw new Error('Missing editor email');
  }

  const month = monthFromFilename(filename);
  const { data: updatedAt, error } = await supabase.rpc('save_schedule_month_if_current_by_email', {
    input_email: editorEmail,
    input_month: month,
    input_data: data,
    expected_updated_at: expectedUpdatedAt,
  });

  if (error) throwStorageError(error);
  return (updatedAt as string | null) ?? null;
};

interface ScheduleChangeHandlers {
  currentMonthFilename: string;
  onBaseChange: (record: ScheduleStorageRecord<ScheduleBaseStorageData>) => void;
  onMonthChange: (
    filename: string,
    record: ScheduleStorageRecord<ScheduleMonthStorageData>,
  ) => void;
}

export const subscribeToScheduleChanges = ({
  currentMonthFilename,
  onBaseChange,
  onMonthChange,
}: ScheduleChangeHandlers): RealtimeChannel | null => {
  if (!supabase) return null;

  const currentMonth = monthFromFilename(currentMonthFilename);

  return supabase
    .channel(`schedule-sync:${currentMonth}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'schedule_base',
        filter: `id=eq.${BASE_ID}`,
      },
      (payload) => {
        const row = payload.new as { data?: ScheduleBaseStorageData; updated_at?: string } | null;
        if (!row) return;
        onBaseChange({
          data: row.data ?? null,
          updatedAt: row.updated_at ?? null,
        });
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'schedule_months',
        filter: `month=eq.${currentMonth}`,
      },
      (payload) => {
        const row = payload.new as {
          month?: string;
          data?: ScheduleMonthStorageData;
          updated_at?: string;
        } | null;
        if (!row?.month) return;
        onMonthChange(filenameFromMonth(row.month), {
          data: row.data ?? null,
          updatedAt: row.updated_at ?? null,
        });
      },
    )
    .subscribe();
};
