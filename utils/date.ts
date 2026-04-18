/**
 * Returns a new Date object set to the 1st day of the next month
 * relative to the current local time.
 */
export const getNextMonthDate = (): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
};
