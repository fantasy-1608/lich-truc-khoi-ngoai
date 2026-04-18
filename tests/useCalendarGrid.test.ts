import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCalendarGrid } from '../hooks/useCalendarGrid';
import { Doctor, Tour } from '../types';

// Test data
const testDoctorsById: Record<string, Doctor> = {
  'doc-a': { id: 'doc-a', name: 'Dr. A', isCtch: false },
  'doc-b': { id: 'doc-b', name: 'Dr. B', isCtch: false },
  'doc-c': { id: 'doc-c', name: 'Dr. C', isCtch: false },
  'doc-d': { id: 'doc-d', name: 'Dr. D', isCtch: false },
};

const testToursById: Record<string, Tour> = {
  'tour-1': { id: 'tour-1', doctorIds: ['doc-a', 'doc-b'] },
  'tour-2': { id: 'tour-2', doctorIds: ['doc-c', 'doc-d'] },
};

const testTourOrder = ['tour-1', 'tour-2'];

// Helper to get date string in same format as useCalendarGrid
const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

describe('useCalendarGrid', () => {
  describe('Basic functionality', () => {
    it('should return an array of calendar days', () => {
      const currentDate = new Date(2025, 10, 1); // November 2025
      const getDoctorsForDate = () => [];

      const { result } = renderHook(() =>
        useCalendarGrid(
          currentDate,
          testDoctorsById,
          testToursById,
          testTourOrder,
          {},
          {},
          getDoctorsForDate,
          null,
        ),
      );

      expect(Array.isArray(result.current)).toBe(true);
      expect(result.current.length).toBeGreaterThan(0);
    });

    it('should have 7 days per row (week structure)', () => {
      const currentDate = new Date(2025, 10, 1);
      const getDoctorsForDate = () => [];

      const { result } = renderHook(() =>
        useCalendarGrid(
          currentDate,
          testDoctorsById,
          testToursById,
          testTourOrder,
          {},
          {},
          getDoctorsForDate,
          null,
        ),
      );

      // Calendar should have multiple of 7 days (complete weeks)
      expect(result.current.length % 7).toBe(0);
    });

    it('should mark today correctly', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const getDoctorsForDate = () => [];
      const { result } = renderHook(() =>
        useCalendarGrid(
          today,
          testDoctorsById,
          testToursById,
          testTourOrder,
          {},
          {},
          getDoctorsForDate,
          null,
        ),
      );

      const todayDay = result.current.find((day) => day.isToday);
      expect(todayDay).toBeDefined();
      expect(todayDay?.date.getDate()).toBe(today.getDate());
    });

    it('should mark weekends correctly', () => {
      const currentDate = new Date(2025, 10, 1);
      const getDoctorsForDate = () => [];

      const { result } = renderHook(() =>
        useCalendarGrid(
          currentDate,
          testDoctorsById,
          testToursById,
          testTourOrder,
          {},
          {},
          getDoctorsForDate,
          null,
        ),
      );

      result.current.forEach((day) => {
        const dayOfWeek = day.date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        expect(day.isWeekend).toBe(isWeekend);
      });
    });

    it('should distinguish current month days from adjacent months', () => {
      const currentDate = new Date(2025, 10, 1); // November
      const getDoctorsForDate = () => [];

      const { result } = renderHook(() =>
        useCalendarGrid(
          currentDate,
          testDoctorsById,
          testToursById,
          testTourOrder,
          {},
          {},
          getDoctorsForDate,
          null,
        ),
      );

      const currentMonthDays = result.current.filter((day) => day.isCurrentMonth);

      // November 2025 has 30 days
      expect(currentMonthDays.length).toBe(30);

      currentMonthDays.forEach((day) => {
        expect(day.date.getMonth()).toBe(10); // November is month 10
      });
    });
  });

  describe('Doctor assignments', () => {
    it('should assign doctors from tour for current month days', () => {
      const currentDate = new Date(2025, 10, 1);
      const getDoctorsForDate = () =>
        testToursById['tour-1'].doctorIds.map((id) => testDoctorsById[id]?.name);

      const { result } = renderHook(() =>
        useCalendarGrid(
          currentDate,
          testDoctorsById,
          testToursById,
          testTourOrder,
          {},
          {},
          getDoctorsForDate,
          null,
        ),
      );

      const currentMonthDays = result.current.filter((day) => day.isCurrentMonth);
      const daysWithDoctors = currentMonthDays.filter(
        (day) => day.doctors && day.doctors.length > 0,
      );

      expect(daysWithDoctors.length).toBeGreaterThan(0);
      daysWithDoctors.forEach((day) => {
        expect(day.doctors).toBeDefined();
        expect(Array.isArray(day.doctors)).toBe(true);
      });
    });
  });

  describe('Overrides', () => {
    it('should apply doctor overrides when provided', () => {
      const currentDate = new Date(2025, 10, 1);
      // Create overrideDate using same method as useCalendarGrid
      const nov1Date = new Date(2025, 10, 1);
      nov1Date.setHours(0, 0, 0, 0);
      const overrideDate = getDateString(nov1Date);
      const overrideDoctors = ['Dr. Override1', 'Dr. Override2'];

      const { result } = renderHook(() =>
        useCalendarGrid(
          currentDate,
          testDoctorsById,
          testToursById,
          testTourOrder,
          { [overrideDate]: overrideDoctors },
          {},
          () => overrideDoctors,
          null,
        ),
      );

      const nov1 = result.current.find((day) => day.isCurrentMonth && day.date.getDate() === 1);

      expect(nov1?.doctors).toEqual(overrideDoctors);
      expect(nov1?.isModified).toBe(true);
    });

    it('should apply tour overrides when provided', () => {
      const currentDate = new Date(2025, 10, 1);
      // Create overrideDate using same method as useCalendarGrid
      const nov1Date = new Date(2025, 10, 1);
      nov1Date.setHours(0, 0, 0, 0);
      const overrideDate = getDateString(nov1Date);

      const { result } = renderHook(() =>
        useCalendarGrid(
          currentDate,
          testDoctorsById,
          testToursById,
          testTourOrder,
          {},
          { [overrideDate]: 'tour-2' },
          (date) => {
            const dateStr = getDateString(date);
            if (dateStr === overrideDate)
              return testToursById['tour-2'].doctorIds.map((id) => testDoctorsById[id]?.name);
            return [];
          },
          null,
        ),
      );

      const nov1 = result.current.find((day) => day.isCurrentMonth && day.date.getDate() === 1);

      // Should have tour-2 doctors (Dr. C, Dr. D)
      expect(nov1?.doctors).toContain('Dr. C');
      expect(nov1?.doctors).toContain('Dr. D');
      expect(nov1?.isModified).toBe(true);
    });

    it('should mark modified days correctly', () => {
      const currentDate = new Date(2025, 10, 1);

      // Create date strings using same method as useCalendarGrid
      const day5Date = new Date(2025, 10, 5);
      day5Date.setHours(0, 0, 0, 0);
      const day5Str = getDateString(day5Date);

      const day10Date = new Date(2025, 10, 10);
      day10Date.setHours(0, 0, 0, 0);
      const day10Str = getDateString(day10Date);

      const { result } = renderHook(() =>
        useCalendarGrid(
          currentDate,
          testDoctorsById,
          testToursById,
          testTourOrder,
          { [day5Str]: ['Override'] },
          { [day10Str]: 'tour-2' },
          (date) => {
            const dateStr = getDateString(date);
            if (dateStr === day5Str) return ['Override'];
            if (dateStr === day10Str)
              return testToursById['tour-2'].doctorIds.map((id) => testDoctorsById[id]?.name);
            return [];
          },
          null,
        ),
      );

      const day5 = result.current.find((day) => day.isCurrentMonth && day.date.getDate() === 5);
      const day10 = result.current.find((day) => day.isCurrentMonth && day.date.getDate() === 10);
      const day15 = result.current.find((day) => day.isCurrentMonth && day.date.getDate() === 15);

      expect(day5?.isModified).toBe(true);
      expect(day10?.isModified).toBe(true);
      expect(day15?.isModified).toBe(false);
    });
  });
});
