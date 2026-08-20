import { describe, expect, it, vi } from 'vitest';
import { runRecoverableScheduleSave } from '../utils/scheduleSaveRecovery';

const intendedData = {
  tourOverrides: { '2026-09-01': 'tour-a' },
  doctorOverrides: { '2026-09-01': ['doctor-1', 'doctor-2'] },
};

const doNotWait = async (): Promise<void> => undefined;

describe('runRecoverableScheduleSave', () => {
  it('returns a successful save without performing a recovery read', async () => {
    const execute = vi.fn(async () => ({
      data: '2026-08-20T02:23:00.000Z',
      error: null,
      status: 200,
    }));
    const loadSavedRecord = vi.fn();

    await expect(
      runRecoverableScheduleSave({ execute, loadSavedRecord, intendedData }),
    ).resolves.toBe('2026-08-20T02:23:00.000Z');

    expect(execute).toHaveBeenCalledOnce();
    expect(loadSavedRecord).not.toHaveBeenCalled();
  });

  it('recognizes a committed save after a 504 without writing twice', async () => {
    const execute = vi.fn(async () => ({
      data: null,
      error: { message: 'Gateway Timeout' },
      status: 504,
    }));
    const loadSavedRecord = vi.fn(async () => ({
      data: {
        doctorOverrides: { '2026-09-01': ['doctor-1', 'doctor-2'] },
        tourOverrides: { '2026-09-01': 'tour-a' },
      },
      updatedAt: '2026-08-20T02:23:08.000Z',
    }));

    await expect(
      runRecoverableScheduleSave({ execute, loadSavedRecord, intendedData }),
    ).resolves.toBe('2026-08-20T02:23:08.000Z');

    expect(execute).toHaveBeenCalledOnce();
    expect(loadSavedRecord).toHaveBeenCalledOnce();
  });

  it('retries a gateway timeout once when the intended data was not saved', async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'Gateway Timeout' }, status: 504 })
      .mockResolvedValueOnce({ data: '2026-08-20T02:23:09.000Z', error: null, status: 200 });
    const loadSavedRecord = vi.fn(async () => ({
      data: { tourOverrides: {} },
      updatedAt: '2026-08-18T16:32:59.000Z',
    }));

    await expect(
      runRecoverableScheduleSave({
        execute,
        loadSavedRecord,
        intendedData,
        waitBeforeRetry: doNotWait,
      }),
    ).resolves.toBe('2026-08-20T02:23:09.000Z');

    expect(execute).toHaveBeenCalledTimes(2);
    expect(loadSavedRecord).toHaveBeenCalledOnce();
  });

  it('preserves genuine write-conflict errors without retrying them', async () => {
    const conflictError = { code: '40001', message: 'schedule_conflict' };
    const execute = vi.fn(async () => ({ data: null, error: conflictError, status: 409 }));
    const loadSavedRecord = vi.fn();

    await expect(
      runRecoverableScheduleSave({ execute, loadSavedRecord, intendedData }),
    ).rejects.toBe(conflictError);

    expect(execute).toHaveBeenCalledOnce();
    expect(loadSavedRecord).not.toHaveBeenCalled();
  });

  it('does not retry permission failures or other permanent errors', async () => {
    const permissionError = { code: '42501', message: 'not_authorized' };
    const execute = vi.fn(async () => ({ data: null, error: permissionError, status: 403 }));
    const loadSavedRecord = vi.fn();

    await expect(
      runRecoverableScheduleSave({ execute, loadSavedRecord, intendedData }),
    ).rejects.toBe(permissionError);

    expect(execute).toHaveBeenCalledOnce();
    expect(loadSavedRecord).not.toHaveBeenCalled();
  });

  it('recovers when the retry reports a conflict after the original write committed', async () => {
    const conflictError = { code: '40001', message: 'schedule_conflict' };
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'Gateway Timeout' }, status: 504 })
      .mockResolvedValueOnce({ data: null, error: conflictError, status: 409 });
    const loadSavedRecord = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary network failure'))
      .mockResolvedValueOnce({
        data: intendedData,
        updatedAt: '2026-08-20T02:23:08.000Z',
      });

    await expect(
      runRecoverableScheduleSave({
        execute,
        loadSavedRecord,
        intendedData,
        isConflictError: (error) =>
          typeof error === 'object' && error !== null && 'code' in error && error.code === '40001',
        waitBeforeRetry: doNotWait,
      }),
    ).resolves.toBe('2026-08-20T02:23:08.000Z');

    expect(execute).toHaveBeenCalledTimes(2);
    expect(loadSavedRecord).toHaveBeenCalledTimes(2);
  });

  it('retries a thrown network error once', async () => {
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ data: '2026-08-20T02:23:09.000Z', error: null, status: 200 });
    const loadSavedRecord = vi.fn(async () => ({ data: null, updatedAt: null }));

    await expect(
      runRecoverableScheduleSave({
        execute,
        loadSavedRecord,
        intendedData,
        waitBeforeRetry: doNotWait,
      }),
    ).resolves.toBe('2026-08-20T02:23:09.000Z');

    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('recognizes a network failure returned with HTTP status zero', async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch' },
        status: 0,
      })
      .mockResolvedValueOnce({ data: '2026-08-20T02:23:09.000Z', error: null, status: 200 });
    const loadSavedRecord = vi.fn(async () => ({ data: null, updatedAt: null }));

    await expect(
      runRecoverableScheduleSave({
        execute,
        loadSavedRecord,
        intendedData,
        waitBeforeRetry: doNotWait,
      }),
    ).resolves.toBe('2026-08-20T02:23:09.000Z');

    expect(execute).toHaveBeenCalledTimes(2);
  });
});
