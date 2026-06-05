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

const monthFromFilename = (filename: string): string => {
  const match = filename.match(/^schedule_(\d{4})_(\d{2})\.json$/);
  if (!match) {
    throw new Error(`Invalid schedule month filename: ${filename}`);
  }
  return `${match[1]}-${match[2]}`;
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

export const loadBaseScheduleData = async (): Promise<ScheduleBaseStorageData | null> => {
  if (!supabase) {
    return fetchLocalJson<ScheduleBaseStorageData>(BASE_FILENAME);
  }

  const { data, error } = await supabase
    .from('schedule_base')
    .select('data')
    .eq('id', BASE_ID)
    .maybeSingle();

  if (error) throw error;
  return (data?.data as ScheduleBaseStorageData | undefined) ?? null;
};

export const saveBaseScheduleData = async (data: ScheduleBaseStorageData): Promise<void> => {
  if (!supabase) {
    await saveLocalJson(BASE_FILENAME, data);
    return;
  }

  if (!editorEmail) {
    throw new Error('Missing editor email');
  }

  const { error } = await supabase.rpc('save_schedule_base_by_email', {
    input_email: editorEmail,
    input_data: data,
  });

  if (error) throw error;
};

export const loadMonthScheduleData = async (
  filename: string,
): Promise<ScheduleMonthStorageData | null> => {
  if (!supabase) {
    return fetchLocalJson<ScheduleMonthStorageData>(filename);
  }

  const month = monthFromFilename(filename);
  const { data, error } = await supabase
    .from('schedule_months')
    .select('data')
    .eq('month', month)
    .maybeSingle();

  if (error) throw error;
  return (data?.data as ScheduleMonthStorageData | undefined) ?? null;
};

export const saveMonthScheduleData = async (
  filename: string,
  data: ScheduleMonthStorageData,
): Promise<void> => {
  if (!supabase) {
    await saveLocalJson(filename, data);
    return;
  }

  if (!editorEmail) {
    throw new Error('Missing editor email');
  }

  const month = monthFromFilename(filename);
  const { error } = await supabase.rpc('save_schedule_month_by_email', {
    input_email: editorEmail,
    input_month: month,
    input_data: data,
  });

  if (error) throw error;
};
