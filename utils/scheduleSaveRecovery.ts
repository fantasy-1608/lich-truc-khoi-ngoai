const TRANSIENT_SAVE_STATUS_CODES = new Set([408, 502, 503, 504, 520, 522, 524]);
const SAVE_RECOVERY_RETRY_DELAY_MS = 750;

interface ScheduleSaveResponse {
  data: unknown;
  error: unknown;
  status?: number;
}

interface SavedScheduleRecord<T> {
  data: T | null;
  updatedAt: string | null;
}

interface RecoverableScheduleSaveOptions<T> {
  execute: () => PromiseLike<ScheduleSaveResponse>;
  loadSavedRecord: () => Promise<SavedScheduleRecord<T>>;
  intendedData: T;
  isConflictError?: (error: unknown) => boolean;
  waitBeforeRetry?: () => Promise<void>;
}

const getErrorStatus = (error: unknown, responseStatus?: number): number | undefined => {
  if (typeof responseStatus === 'number') return responseStatus;
  if (!error || typeof error !== 'object') return undefined;

  const value = error as { status?: unknown; statusCode?: unknown };
  const status = value.status ?? value.statusCode;
  const parsedStatus = typeof status === 'string' ? Number(status) : status;

  return typeof parsedStatus === 'number' && Number.isFinite(parsedStatus)
    ? parsedStatus
    : undefined;
};

const isTransientSaveFailure = (error: unknown, responseStatus?: number): boolean => {
  const status = getErrorStatus(error, responseStatus);
  if (status !== undefined && status !== 0) return TRANSIENT_SAVE_STATUS_CODES.has(status);
  if (!error || typeof error !== 'object') return false;

  const value = error as { code?: unknown; message?: unknown };
  const code = typeof value.code === 'string' ? value.code.toUpperCase() : '';
  const message = typeof value.message === 'string' ? value.message : '';

  return (
    ['FETCH_ERROR', 'NETWORK_ERROR', 'ETIMEDOUT', 'ECONNRESET'].includes(code) ||
    /failed to fetch|fetch failed|network|load failed|gateway timeout|timed out/i.test(message)
  );
};

const isEquivalentJson = (left: unknown, right: unknown): boolean => {
  if (left === right) return true;
  if (left === null || right === null) return false;
  if (typeof left !== 'object' || typeof right !== 'object') return false;

  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => isEquivalentJson(value, right[index]))
    );
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();

  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) => key === rightKeys[index] && isEquivalentJson(leftRecord[key], rightRecord[key]),
    )
  );
};

const waitForSaveRecovery = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, SAVE_RECOVERY_RETRY_DELAY_MS));

export const runRecoverableScheduleSave = async <T>({
  execute,
  loadSavedRecord,
  intendedData,
  isConflictError,
  waitBeforeRetry = waitForSaveRecovery,
}: RecoverableScheduleSaveOptions<T>): Promise<string | null> => {
  const trySave = async (): Promise<ScheduleSaveResponse> => {
    try {
      return await execute();
    } catch (error) {
      return { data: null, error };
    }
  };

  const getAlreadySavedTimestamp = async (): Promise<string | null> => {
    try {
      const record = await loadSavedRecord();
      return record.updatedAt && isEquivalentJson(record.data, intendedData)
        ? record.updatedAt
        : null;
    } catch {
      return null;
    }
  };

  const firstAttempt = await trySave();
  if (!firstAttempt.error) return (firstAttempt.data as string | null) ?? null;
  if (!isTransientSaveFailure(firstAttempt.error, firstAttempt.status)) throw firstAttempt.error;

  // A gateway timeout does not tell us whether Postgres committed the write.
  // Read first so a completed write is not sent again with an outdated version.
  const alreadySavedTimestamp = await getAlreadySavedTimestamp();
  if (alreadySavedTimestamp) return alreadySavedTimestamp;

  await waitBeforeRetry();

  const retryAttempt = await trySave();
  if (!retryAttempt.error) return (retryAttempt.data as string | null) ?? null;

  if (
    isTransientSaveFailure(retryAttempt.error, retryAttempt.status) ||
    isConflictError?.(retryAttempt.error)
  ) {
    const recoveredTimestamp = await getAlreadySavedTimestamp();
    if (recoveredTimestamp) return recoveredTimestamp;
  }

  throw retryAttempt.error;
};
