import { useMemo } from 'react';
import { HolidayCalendarDay, HolidayScheduleData } from '../types';

export const useHolidayCalendarGrid = (
  holidaySchedule: HolidayScheduleData,
  getDoctorsForDate: (date: Date) => string[] | undefined,
): HolidayCalendarDay[] => {
  return useMemo(() => {
    if (!holidaySchedule.startDate || !holidaySchedule.endDate) {
      return [];
    }

    const startDate = new Date(holidaySchedule.startDate);
    const endDate = new Date(holidaySchedule.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: HolidayCalendarDay[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Helper to get YYYY-MM-DD in local time
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Get original doctors from main schedule
      const originalDoctors = getDoctorsForDate(new Date(currentDate)) || [];

      // Get holiday overrides or use original
      const holidayDoctors = holidaySchedule.doctorOverrides[dateStr] || originalDoctors;

      const isModified = !!holidaySchedule.doctorOverrides[dateStr];

      days.push({
        date: new Date(currentDate),
        isCurrentMonth: true, // Always true for holiday view
        isToday: currentDate.getTime() === today.getTime(),
        isWeekend,
        doctors: holidayDoctors,
        originalDoctors,
        isModified,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  }, [holidaySchedule, getDoctorsForDate]);
};
