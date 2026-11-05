const scheduleMonthFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const isScheduleDateFrozen = (date: Date, now = new Date()): boolean => {
  // Calendar cells represent local dates; the lock clock follows the server's VN timezone.
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const currentMonth = scheduleMonthFormatter.format(now).slice(0, 7);

  // Current and past months are frozen; only upcoming months remain editable.
  return month <= currentMonth;
};
