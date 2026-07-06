import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScheduleData } from '../hooks/useScheduleData';

vi.mock('../services/scheduleStorage', () => ({
  ScheduleConflictError: class ScheduleConflictError extends Error {},
  loadBaseScheduleData: vi.fn(async () => ({ data: null, updatedAt: null })),
  loadMonthScheduleData: vi.fn(async () => ({ data: null, updatedAt: null })),
  saveBaseScheduleData: vi.fn(async () => null),
  saveMonthScheduleData: vi.fn(async () => null),
  subscribeToScheduleChanges: vi.fn(() => ({ unsubscribe: vi.fn() })),
  loadCachedBaseData: vi.fn(() => null),
  loadCachedMonthData: vi.fn(() => null),
}));

describe('useScheduleData', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 6, 6));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('freezes the visible month before changing the global tour order', async () => {
    const { result } = renderHook(() =>
      useScheduleData({
        canWrite: true,
      }),
    );

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    const reversedOrder = [...result.current.tourOrder].reverse();

    act(() => {
      result.current.handleReorderTours(reversedOrder);
    });

    await waitFor(() => {
      expect(result.current.scheduleSnapshots['2026-08-01']).toBeDefined();
      expect(result.current.scheduleSnapshots['2026-08-31']).toBeDefined();
    });

    expect(result.current.scheduleSnapshots['2026-08-01'].doctors.length).toBeGreaterThan(0);
    expect(result.current.scheduleSnapshots['2026-08-31'].doctors.length).toBeGreaterThan(0);
    expect(result.current.tourOrder).toEqual(reversedOrder);
  });
});
