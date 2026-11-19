/**
 * Returns a new Date object set to the 1st day of the current month
 * relative to the current local time.
 */
export const getCurrentMonthDate = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

/**
 * Returns a new Date object set to the 1st day of the next month
 * relative to the current local time.
 */
export const getNextMonthDate = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
};

export const isCompactScheduleViewport = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (window.innerWidth < 720) return true;
  return Boolean(window.matchMedia?.('(max-width: 719px)').matches);
};

export const getInitialScheduleMonthDate = (
  preferCurrentMonth = isCompactScheduleViewport(),
): Date => (preferCurrentMonth ? getCurrentMonthDate() : getNextMonthDate());
