import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScheduleData } from '../hooks/useScheduleData';
import base from '../data/schedule_base.json';
import { RotationVersion } from '../types';
import { loadBaseScheduleData, loadMonthScheduleData } from '../services/scheduleStorage';

vi.mock('../services/scheduleStorage', () => ({
  ScheduleConflictError: class ScheduleConflictError extends Error {},
  loadBaseScheduleData: vi.fn(async () => ({ data: null, updatedAt: null })),
  loadMonthScheduleData: vi.fn(async () => ({ data: null, updatedAt: null })),
  saveBaseScheduleData: vi.fn(async () => null),
  saveMonthScheduleData: vi.fn(async () => null),
  subscribeToScheduleChanges: vi.fn(() => ({ unsubscribe: vi.fn() })),
  loadCachedBaseData: vi.fn(() => null),
  loadCachedMonthData: vi.fn(() => null),
  appendRotationVersion: vi.fn(),
}));

describe('useScheduleData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadBaseScheduleData).mockResolvedValue({ data: null, updatedAt: null });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 7, 6)); // August 6, 2026
  });

  it('keeps adopted historical months stable and exposes the effective roster and tour label', async () => {
    vi.setSystemTime(new Date(2026, 11, 8));
    const roster = {
      ...base.rotationConfig.baseline,
      doctors: base.doctors.map((d) =>
        d.name === 'Bs. Tiến' ? { ...d, name: 'Bs. Tiến mới' } : d,
      ),
      tours: base.tours.map((t) => (t.id === 'tour-2' ? { ...t, name: 'Tua Ngoại' } : t)),
    };
    const version: RotationVersion = {
      id: 'test-member',
      effectiveDate: '2026-11-06',
      kind: 'members',
      roster,
      cycleMonth: '2026-11',
      createdAt: '2026-10-08T00:00:00Z',
      createdBy: 'test',
    };
    vi.mocked(loadBaseScheduleData).mockResolvedValue({
      data: { ...base, rotationConfig: { ...base.rotationConfig, versions: [version] } },
      updatedAt: 'stamp',
    });
    const { result } = renderHook(() => useScheduleData({ canWrite: false }));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.handleSetViewDate(new Date(2026, 10, 1)));
    expect(result.current.getDoctorsForDate(new Date(2026, 10, 11))).toContain('Bs. Tiến mới');
    expect(result.current.getDoctorsForDate(new Date(2026, 10, 3))).toContain('Bs. Tiến');
    expect(result.current.getDoctorsForDate(new Date(2026, 3, 1))).toBeUndefined();
    expect(result.current.getTourNameForDate(new Date(2026, 10, 12))).toBe('Tua Ngoại');
    expect(result.current.availableDoctors.some((d) => d.name === 'Bs. Tiến mới')).toBe(true);
  });
  it('loads the previous month for recovery warnings at the month boundary', async () => {
    const { result } = renderHook(() => useScheduleData({ canWrite: false }));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    await waitFor(() => {
      expect(loadMonthScheduleData).toHaveBeenCalledWith('schedule_2026_09.json');
      expect(loadMonthScheduleData).toHaveBeenCalledWith('schedule_2026_08.json');
    });
  });

  it('allows November assignments while still rejecting October and read-only writes', async () => {
    vi.setSystemTime(new Date('2026-11-01T00:00:00+07:00'));
    const onError = vi.fn();
    const { result, rerender } = renderHook(
      ({ canWrite }) => useScheduleData({ canWrite, onError }),
      { initialProps: { canWrite: true } },
    );
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.handleSetViewDate(new Date(2026, 10, 1)));
    await waitFor(() =>
      expect(loadMonthScheduleData).toHaveBeenCalledWith('schedule_2026_11.json'),
    );
    act(() => result.current.handleAddDoctorToDate(new Date(2026, 10, 15), 'Test November'));
    expect(result.current.getDoctorsForDate(new Date(2026, 10, 15))).toContain('Test November');

    const octoberBefore = result.current.getDoctorsForDate(new Date(2026, 9, 31));
    act(() => result.current.handleAddDoctorToDate(new Date(2026, 9, 31), 'Test October'));
    expect(onError).toHaveBeenLastCalledWith(expect.stringContaining('đóng băng'));
    expect(result.current.getDoctorsForDate(new Date(2026, 9, 31))).toEqual(octoberBefore);

    rerender({ canWrite: false });
    act(() => result.current.handleAddDoctorToDate(new Date(2026, 10, 15), 'Test read only'));
    expect(result.current.getDoctorsForDate(new Date(2026, 10, 15))).not.toContain(
      'Test read only',
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects legacy global reorder instead of recalculating historic schedules', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useScheduleData({ canWrite: true, onError }));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const old = [...result.current.tourOrder];
    act(() => result.current.handleReorderTours([...old].reverse()));
    expect(result.current.tourOrder).toEqual(old);
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('Xoay tua'));
  });
});
