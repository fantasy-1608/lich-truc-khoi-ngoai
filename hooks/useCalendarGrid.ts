import { useMemo } from 'react';
import { Doctor, Tour, ScheduleCalendarDay } from '../types';
import { START_DATE } from '../constants';

export const useCalendarGrid = (
  currentDate: Date,
  doctorsById: Record<string, Doctor>,
  toursById: Record<string, Tour>,
  tourOrder: string[],
  doctorOverrides: Record<string, string[]>,
  tourOverrides: Record<string, string>,
  getDoctorsForDate: (date: Date) => string[] | undefined,
  rotationStartDate: string | null,
) => {
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const days: ScheduleCalendarDay[] = [];

    // Monday is 0, Sunday is 6
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

    // Days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        doctors: undefined,
        tourName: undefined,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isModified: false,
      });
    }

    // Days of current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);

      // Helper to get YYYY-MM-DD in local time (match useScheduleData)
      const dYear = date.getFullYear();
      const dMonth = String(date.getMonth() + 1).padStart(2, '0');
      const dDay = String(date.getDate()).padStart(2, '0');
      const dateString = `${dYear}-${dMonth}-${dDay}`;

      // Use centralized getDoctorsForDate
      const doctors = getDoctorsForDate(date);

      // We still want to show the tour name if possible
      // Logic for tour name (main tour)
      let tourId: string | undefined;
      const hasTourOverride = !!tourOverrides[dateString];
      if (hasTourOverride) {
        tourId = tourOverrides[dateString];
      } else {
        const rotationStartDateParsed = rotationStartDate ? new Date(rotationStartDate) : START_DATE;
        const startDateRaw = date < rotationStartDateParsed ? START_DATE : rotationStartDateParsed;
        const startDate = new Date(
          startDateRaw.getFullYear(),
          startDateRaw.getMonth(),
          startDateRaw.getDate(),
        );
        const diffTime = date.getTime() - startDate.getTime();
        if (diffTime >= 0) {
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const tourIndex = diffDays % tourOrder.length;
          tourId = tourOrder[tourIndex];
        }
      }

      let tourName: string | undefined;
      if (tourId === 'reinforcement') {
        tourName = 'trực tăng cường';
      } else if (doctors && doctors.length > 0) {
        tourName = doctors[0];
      } else {
        const tour = tourId ? toursById[tourId] : undefined;
        const firstDoctorId = tour?.doctorIds[0];
        tourName = firstDoctorId ? doctorsById[firstDoctorId]?.name : undefined;
      }

      const hasDoctorOverride = !!doctorOverrides[dateString];

      days.push({
        date,
        doctors,
        tourName,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isModified: hasTourOverride || hasDoctorOverride,
      });
    }

    // Days from next month
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        doctors: undefined,
        tourName: undefined,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isModified: false,
      });
    }

    return days;
  }, [
    currentDate,
    doctorsById,
    toursById,
    tourOrder,
    doctorOverrides,
    tourOverrides,
    getDoctorsForDate,
    rotationStartDate,
  ]);
};
