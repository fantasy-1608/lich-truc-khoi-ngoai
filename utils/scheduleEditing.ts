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

  // Explicitly reopen November only while it is the current month.
  if (month === '2026-11' && currentMonth === '2026-11') return false;

  // All other current/past months retain the existing freeze policy.
  return month <= currentMonth;
};
