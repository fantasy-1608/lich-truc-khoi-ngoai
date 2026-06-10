import { supabase } from '../lib/supabase';
import { ShiftRequest, ShiftRequestCount, ShiftRequestDraft, ShiftRequestStatus } from '../types';

const SHIFT_REQUESTS_FILENAME = 'shift_requests.json';
const canFallbackToLocalStorage = import.meta.env.DEV;
const useLocalShiftRequestStorage = !supabase || import.meta.env.DEV;

let requestEditorEmail = '';

const getSupabaseClient = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
};

export const setShiftRequestEditorEmail = (email: string): void => {
  requestEditorEmail = email.trim();
};

export const clearShiftRequestEditorEmail = (): void => {
  requestEditorEmail = '';
};

const normalizeRequest = (request: unknown): ShiftRequest | null => {
  if (!request || typeof request !== 'object') return null;
  const value = request as Record<string, unknown>;

  if (
    typeof value.id !== 'string' ||
    typeof value.date !== 'string' ||
    typeof value.requestType !== 'string' ||
    typeof value.requesterDoctorName !== 'string' ||
    typeof value.message !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.createdAt !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    date: value.date,
    requestType: value.requestType as ShiftRequest['requestType'],
    requesterDoctorName: value.requesterDoctorName,
    targetDate: typeof value.targetDate === 'string' ? value.targetDate : null,
    targetDoctorName: typeof value.targetDoctorName === 'string' ? value.targetDoctorName : null,
    message: value.message,
    contact: typeof value.contact === 'string' ? value.contact : null,
    status: value.status as ShiftRequestStatus,
    reviewNote: typeof value.reviewNote === 'string' ? value.reviewNote : null,
    createdAt: value.createdAt,
    reviewedAt: typeof value.reviewedAt === 'string' ? value.reviewedAt : null,
  };
};

const fetchLocalRequests = async (): Promise<ShiftRequest[]> => {
  const res = await fetch(`/api/storage/${SHIFT_REQUESTS_FILENAME}`);
  if (!res.ok) return [];
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data.map(normalizeRequest).filter((request): request is ShiftRequest => Boolean(request));
};

const saveLocalRequests = async (requests: ShiftRequest[]): Promise<void> => {
  const res = await fetch(`/api/storage/${SHIFT_REQUESTS_FILENAME}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requests, null, 2),
  });

  if (!res.ok) {
    throw new Error('Could not save shift requests');
  }
};

const isMissingSupabaseRequestSchema = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: string; message?: string };
  return (
    value.code === 'PGRST202' ||
    value.code === 'PGRST205' ||
    value.code === '42P01' ||
    Boolean(value.message?.includes('shift_requests'))
  );
};

const toShiftRequest = (row: Record<string, unknown>): ShiftRequest => ({
  id: String(row.id),
  date: String(row.date),
  requestType: String(row.request_type) as ShiftRequest['requestType'],
  requesterDoctorName: String(row.requester_doctor_name),
  targetDate: typeof row.target_date === 'string' ? row.target_date : null,
  targetDoctorName: typeof row.target_doctor_name === 'string' ? row.target_doctor_name : null,
  message: String(row.message ?? ''),
  contact: typeof row.contact === 'string' ? row.contact : null,
  status: String(row.status) as ShiftRequestStatus,
  reviewNote: typeof row.review_note === 'string' ? row.review_note : null,
  createdAt: String(row.created_at),
  reviewedAt: typeof row.reviewed_at === 'string' ? row.reviewed_at : null,
});

export const loadShiftRequestCounts = async (): Promise<ShiftRequestCount[]> => {
  if (useLocalShiftRequestStorage) {
    const requests = await fetchLocalRequests();
    const counts = requests.reduce<Record<string, number>>((acc, request) => {
      if (request.status === 'pending' || request.status === 'in_review') {
        acc[request.date] = (acc[request.date] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(counts).map(([date, pendingCount]) => ({ date, pendingCount }));
  }

  const client = getSupabaseClient();
  const { data, error } = await client.rpc('get_shift_request_counts');
  if (error) {
    if (canFallbackToLocalStorage && isMissingSupabaseRequestSchema(error)) {
      const requests = await fetchLocalRequests();
      const counts = requests.reduce<Record<string, number>>((acc, request) => {
        if (request.status === 'pending' || request.status === 'in_review') {
          acc[request.date] = (acc[request.date] || 0) + 1;
        }
        return acc;
      }, {});

      return Object.entries(counts).map(([date, pendingCount]) => ({ date, pendingCount }));
    }
    throw error;
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    date: String(row.date),
    pendingCount: Number(row.pending_count ?? 0),
  }));
};

export const loadShiftRequestsForEditor = async (): Promise<ShiftRequest[]> => {
  if (useLocalShiftRequestStorage) {
    return fetchLocalRequests();
  }

  if (!requestEditorEmail) {
    return [];
  }

  const client = getSupabaseClient();
  const { data, error } = await client.rpc('list_shift_requests_by_email', {
    input_email: requestEditorEmail,
  });
  if (error) {
    if (canFallbackToLocalStorage && isMissingSupabaseRequestSchema(error)) {
      return fetchLocalRequests();
    }
    throw error;
  }

  return ((data ?? []) as Record<string, unknown>[]).map(toShiftRequest);
};

export const createShiftRequest = async (draft: ShiftRequestDraft): Promise<ShiftRequest> => {
  const now = new Date().toISOString();

  if (useLocalShiftRequestStorage) {
    const requests = await fetchLocalRequests();
    const request: ShiftRequest = {
      id: `shift-request-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      ...draft,
      targetDate: draft.targetDate || null,
      targetDoctorName: draft.targetDoctorName || null,
      contact: draft.contact || null,
      status: 'pending',
      reviewNote: null,
      createdAt: now,
      reviewedAt: null,
    };
    await saveLocalRequests([request, ...requests]);
    return request;
  }

  const client = getSupabaseClient();
  const { data, error } = await client.rpc('submit_shift_request', {
    input_date: draft.date,
    input_request_type: draft.requestType,
    input_requester_doctor_name: draft.requesterDoctorName,
    input_target_date: draft.targetDate || null,
    input_target_doctor_name: draft.targetDoctorName || null,
    input_message: draft.message,
    input_contact: draft.contact || null,
  });

  if (error) {
    if (canFallbackToLocalStorage && isMissingSupabaseRequestSchema(error)) {
      const requests = await fetchLocalRequests();
      const request: ShiftRequest = {
        id: `shift-request-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        ...draft,
        targetDate: draft.targetDate || null,
        targetDoctorName: draft.targetDoctorName || null,
        contact: draft.contact || null,
        status: 'pending',
        reviewNote: null,
        createdAt: now,
        reviewedAt: null,
      };
      await saveLocalRequests([request, ...requests]);
      return request;
    }
    throw error;
  }
  return toShiftRequest(data as Record<string, unknown>);
};

export const updateShiftRequestReview = async (
  id: string,
  status: ShiftRequestStatus,
  reviewNote: string,
): Promise<ShiftRequest> => {
  const reviewedAt = new Date().toISOString();

  if (useLocalShiftRequestStorage) {
    const requests = await fetchLocalRequests();
    const nextRequests = requests.map((request) =>
      request.id === id
        ? {
            ...request,
            status,
            reviewNote: reviewNote.trim() || null,
            reviewedAt,
          }
        : request,
    );
    await saveLocalRequests(nextRequests);
    const updated = nextRequests.find((request) => request.id === id);
    if (!updated) throw new Error('Shift request not found');
    return updated;
  }

  if (!requestEditorEmail) {
    throw new Error('Missing editor email');
  }

  const client = getSupabaseClient();
  const { data, error } = await client.rpc('review_shift_request_by_email', {
    input_email: requestEditorEmail,
    input_id: id,
    input_status: status,
    input_review_note: reviewNote.trim() || null,
  });

  if (error) {
    if (canFallbackToLocalStorage && isMissingSupabaseRequestSchema(error)) {
      const requests = await fetchLocalRequests();
      const nextRequests = requests.map((request) =>
        request.id === id
          ? {
              ...request,
              status,
              reviewNote: reviewNote.trim() || null,
              reviewedAt,
            }
          : request,
      );
      await saveLocalRequests(nextRequests);
      const updated = nextRequests.find((request) => request.id === id);
      if (!updated) throw new Error('Shift request not found');
      return updated;
    }
    throw error;
  }
  return toShiftRequest(data as Record<string, unknown>);
};
