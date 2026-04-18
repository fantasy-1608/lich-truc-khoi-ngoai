import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getNextMonthDate } from '../utils/date';
import {
  Doctor,
  Tour,
  DepartmentRole,
  DepartmentAssignments,
  ImportData,
  HolidayScheduleData,
} from '../types';
import { INITIAL_DOCTORS, INITIAL_TOURS, INITIAL_TOUR_ORDER } from '../components/data';
import { START_DATE } from '../constants';

// Helper to get date string in YYYY-MM-DD format using local time components
const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Storage file path (via Vite API)
// STORAGE_URL removed as it was unused

interface ScheduleData {
  doctors: Doctor[];
  tours: Tour[];
  tourOrder: string[];
  tourOverrides: Record<string, string>;
  doctorOverrides: Record<string, string[]>;
  showPkdv: boolean;
  departmentAssignments: Record<string, Partial<DepartmentAssignments>>;
  holidaySchedule: HolidayScheduleData;
  rotationStartDate: string | null; // New field
  lastSaved: string | null;
}

const DEFAULT_HOLIDAY_SCHEDULE: HolidayScheduleData = {
  startDate: null,
  endDate: null,
  holidayTourId: undefined,
  holidayInsertionIndex: undefined,
  doctorOverrides: {},
};

const DEFAULT_DATA: ScheduleData = {
  doctors: INITIAL_DOCTORS,
  tours: INITIAL_TOURS,
  tourOrder: INITIAL_TOUR_ORDER,
  tourOverrides: {},
  doctorOverrides: {},
  showPkdv: true,
  departmentAssignments: {},
  holidaySchedule: DEFAULT_HOLIDAY_SCHEDULE,
  rotationStartDate: getDateString(START_DATE), // Use local date format, not ISO
  lastSaved: null,
};

interface UseScheduleDataOptions {
  onError?: (message: string) => void;
  onSaveSuccess?: () => void;
}

export const useScheduleData = (options: UseScheduleDataOptions = {}) => {
  const { onError, onSaveSuccess } = options;

  const [doctors, setDoctors] = useState<Doctor[]>(DEFAULT_DATA.doctors);
  const [tours, setTours] = useState<Tour[]>(DEFAULT_DATA.tours);
  const [tourOrder, setTourOrder] = useState<string[]>(DEFAULT_DATA.tourOrder);
  const [tourOverrides, setTourOverrides] = useState<Record<string, string>>({});
  const [doctorOverrides, setDoctorOverrides] = useState<Record<string, string[]>>({});
  const [showPkdv, setShowPkdv] = useState<boolean>(true);
  const [departmentAssignments, setDepartmentAssignments] = useState<
    Record<string, Partial<DepartmentAssignments>>
  >({});
  const [holidaySchedule, setHolidaySchedule] =
    useState<HolidayScheduleData>(DEFAULT_HOLIDAY_SCHEDULE);
  const [rotationStartDate, setRotationStartDate] = useState<string | null>(
    DEFAULT_DATA.rotationStartDate,
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentViewDate, setCurrentViewDate] = useState<Date>(getNextMonthDate());
  const loadedMonthsRef = useRef<Set<string>>(new Set());
  const modifiedMonthsRef = useRef<Set<string>>(new Set()); // Track months that need saving

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to get storage key for a month
  const getMonthKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `schedule_${year}_${month}.json`;
  };

  // Load Base Data on mount
  useEffect(() => {
    const loadBaseData = async () => {
      try {
        const res = await fetch('/api/storage/schedule_base.json');
        if (res.ok) {
          const data: ScheduleData = await res.json();
          if (data.doctors?.length > 0) setDoctors(data.doctors);
          if (data.tours?.length > 0) setTours(data.tours);
          if (data.tourOrder?.length > 0) setTourOrder(data.tourOrder);
          if (typeof data.showPkdv === 'boolean') setShowPkdv(data.showPkdv);
          if (data.rotationStartDate) setRotationStartDate(data.rotationStartDate);
          if (data.holidaySchedule) setHolidaySchedule(data.holidaySchedule);
          // Don't overwrite overrides from base, only global settings
        }
      } catch {
        console.log('No base data found, using defaults');
      } finally {
        setIsLoaded(true);
      }
    };
    loadBaseData();
  }, []);

  // Load Monthly Data when currentViewDate changes
  useEffect(() => {
    const loadMonthlyData = async () => {
      const filename = getMonthKey(currentViewDate);
      if (loadedMonthsRef.current.has(filename)) return; // Already loaded

      try {
        const res = await fetch(`/api/storage/${filename}`);
        if (res.ok) {
          const data = await res.json();
          // Merge overrides
          setTourOverrides((prev) => ({ ...prev, ...data.tourOverrides }));
          setDoctorOverrides((prev) => ({ ...prev, ...data.doctorOverrides }));
          setDepartmentAssignments((prev) => ({ ...prev, ...data.departmentAssignments }));
          // Merge holiday if exists (might need better strategy for multi-month holidays)
          if (data.holidaySchedule) {
            // For now, simple merge/replace if dates match or are relevant
            // Ideally holiday data should perhaps be in base or its own file if it spans months?
            // Or just load it and let latest wins? Let's check dates.
            if (data.holidaySchedule.startDate) {
              setHolidaySchedule(data.holidaySchedule);
            }
          }
          loadedMonthsRef.current.add(filename);
        }
      } catch {
        // File might not exist yet, that's fine
      }
    };
    loadMonthlyData();
  }, [currentViewDate]);

  // Save data to file (debounced) - INTELLIGENT SAVE
  const saveData = useCallback(async () => {
    // 1. Save Base Data (Global Settings)
    const baseData: Partial<ScheduleData> = {
      doctors,
      tours,
      tourOrder,
      showPkdv,
      rotationStartDate,
      lastSaved: new Date().toISOString(),
    };

    try {
      // Save Base
      await fetch('/api/storage/schedule_base.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseData, null, 2),
      });

      // 2. Save Monthly Data (Overrides)
      // We need to group overrides by month to save to correct files
      // Use map to partition data
      const changesByMonth: Record<string, any> = {};

      // Helper to partition
      const addToPartition = (
        dateStr: string,
        data: any,
        type: 'tourOverrides' | 'doctorOverrides' | 'departmentAssignments',
      ) => {
        // Parse dateStr (YYYY-MM-DD) directly to avoid timezone shifts
        const parts = dateStr.split('-');
        if (parts.length !== 3) return;
        const year = parts[0];
        const month = parts[1];
        const filename = `schedule_${year}_${month}.json`;

        if (!changesByMonth[filename]) changesByMonth[filename] = {};
        if (!changesByMonth[filename][type]) changesByMonth[filename][type] = {};

        changesByMonth[filename][type][dateStr] = data;
      };

      Object.entries(tourOverrides).forEach(([k, v]) => addToPartition(k, v, 'tourOverrides'));
      Object.entries(doctorOverrides).forEach(([k, v]) => addToPartition(k, v, 'doctorOverrides'));
      Object.entries(departmentAssignments).forEach(([k, v]) =>
        addToPartition(k, v, 'departmentAssignments'),
      );

      // Save each month file
      // NOTE: This approach rewrites the file with ONLY the current in-memory overrides for that month.
      // Since we load the file on view, in-memory should be complete for that month.
      // However, if we haven't viewed a month, we might overwrite it with partial data if we aren't careful?
      // Wait: 'tourOverrides' state contains ALL loaded overrides.
      // If we haven't loaded Jan 2026, tourOverrides won't have Jan 2026 data.
      // So saving Jan 2026 file based on empty state would be BAD if we just overwrote.
      // We must only save if we have changes or merge?
      // BETTER STRATEGY: only save the 'currentViewDate' month file?
      // Or: Only save partitions that we have touched?
      // Safe approach: For each month partition in our `changesByMonth`, we SHOULD first read the file, merge, then write?
      // OR: Assume `tourOverrides` accumulates everything we've seen.
      // If we simply write `changesByMonth['schedule_2026_01.json']`, we might lose data if `tourOverrides` doesn't have it?
      // `tourOverrides` ONLY has what we loaded.
      // If we visited Jan, loaded valid data. Then went to Feb. Jan data is still in `tourOverrides`.
      // So writing Jan file from `tourOverrides` is safe provided we loaded it.
      // If we NEVER loaded March, `tourOverrides` has no March data. Writing empty March file?
      // `addToPartition` iterates keys of `tourOverrides`. If no keys for March, no March file entry created.
      // So we only write files for months we have data for. SAFE.

      // Also save holiday schedule if it falls in a month?
      // Holiday schedule spans days. Maybe keep in separate file or just base?
      // Plan: Keep Holiday in Base for now as it's rare and usually single active event.
      // Updated Base Data to include holidaySchedule
      const baseDataWithHoliday = { ...baseData, holidaySchedule };
      await fetch('/api/storage/schedule_base.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseDataWithHoliday, null, 2),
      });

      for (const [filename, content] of Object.entries(changesByMonth)) {
        await fetch(`/api/storage/${filename}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(content, null, 2),
        });
      }

      // Also save any months that were modified but now have no overrides
      for (const filename of modifiedMonthsRef.current) {
        if (!changesByMonth[filename]) {
          // This month was modified but has no remaining overrides, save empty object
          await fetch(`/api/storage/${filename}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}, null, 2),
          });
        }
      }
      modifiedMonthsRef.current.clear(); // Clear after successful save

      onSaveSuccess?.();
    } catch (error) {
      console.error('Failed to save:', error);
      onError?.('Không thể lưu dữ liệu. Vui lòng thử lại.');
    }
  }, [
    doctors,
    tours,
    tourOrder,
    tourOverrides,
    doctorOverrides,
    showPkdv,
    departmentAssignments,
    holidaySchedule,
    rotationStartDate,
    onError,
    onSaveSuccess,
  ]);

  // Auto-save logic remains similar

  // EXPOSE setCurrentViewDate
  const handleSetViewDate = useCallback((date: Date) => {
    setCurrentViewDate(date);
  }, []);

  // ... existing UseEffect for autosave ...

  // Auto-save when data changes (debounced 1 second)
  useEffect(() => {
    if (!isLoaded) return; // Don't save before initial load

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(saveData, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    doctors,
    tours,
    tourOrder,
    tourOverrides,
    doctorOverrides,
    showPkdv,
    departmentAssignments,
    holidaySchedule,
    isLoaded,
    saveData,
  ]);

  const doctorsById = useMemo(
    () =>
      doctors.reduce(
        (acc, doc) => {
          acc[doc.id] = doc;
          return acc;
        },
        {} as Record<string, Doctor>,
      ),
    [doctors],
  );
  const toursById = useMemo(
    () =>
      tours.reduce(
        (acc, tour) => {
          acc[tour.id] = tour;
          return acc;
        },
        {} as Record<string, Tour>,
      ),
    [tours],
  );

  const getDoctorsForDate = useCallback(
    (date: Date): string[] | undefined => {
      // Helper to get YYYY-MM-DD in local time
      const dateString = getDateString(date);

      // 1. Priority: Manual Doctor Override (Global)
      if (doctorOverrides[dateString]) {
        return doctorOverrides[dateString];
      }

      // 2. Priority: Holiday Doctor Override
      if (holidaySchedule.doctorOverrides[dateString]) {
        return holidaySchedule.doctorOverrides[dateString];
      }

      // 3. Priority: Manual Tour Override (Global)
      if (tourOverrides[dateString]) {
        const tourId = tourOverrides[dateString];
        const tour = tourId ? toursById[tourId] : undefined;
        return tour?.doctorIds.map((id) => doctorsById[id]?.name).filter(Boolean) as string[];
      }

      // Define effective start date for calculations
      // If date is before rotationStartDate, fall back to START_DATE
      const rotationStartDateParsed = rotationStartDate ? new Date(rotationStartDate) : START_DATE;
      const startDateRaw = date < rotationStartDateParsed ? START_DATE : rotationStartDateParsed;
      const startDate = new Date(
        startDateRaw.getFullYear(),
        startDateRaw.getMonth(),
        startDateRaw.getDate(),
      );

      // Check for Holiday Schedule
      const holidayStart = holidaySchedule.startDate ? new Date(holidaySchedule.startDate) : null;
      const holidayEnd = holidaySchedule.endDate ? new Date(holidaySchedule.endDate) : null;
      const holidayTourId = holidaySchedule.holidayTourId;

      if (holidayStart && holidayEnd && holidayTourId) {
        holidayStart.setHours(0, 0, 0, 0);
        holidayEnd.setHours(0, 0, 0, 0);
        const currentDate = new Date(date);
        currentDate.setHours(0, 0, 0, 0);

        // CASE 1: Before Holiday -> Standard 4-tour logic
        if (currentDate < holidayStart) {
          const diffTime = currentDate.getTime() - startDate.getTime();
          if (diffTime >= 0) {
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const tourIndex = diffDays % tourOrder.length;
            const tourId = tourOrder[tourIndex];
            return toursById[tourId]?.doctorIds
              .map((id) => doctorsById[id]?.name)
              .filter(Boolean) as string[];
          }
        }

        // Create the 5-tour list with custom insertion
        const insertionIndex =
          holidaySchedule.holidayInsertionIndex !== undefined
            ? holidaySchedule.holidayInsertionIndex
            : tourOrder.length; // Default to end

        const holidayTourOrder = [...tourOrder];
        holidayTourOrder.splice(insertionIndex, 0, holidayTourId);

        // CASE 2: During Holiday -> 5-tour logic (Standard Tours + Holiday Tour)
        if (currentDate >= holidayStart && currentDate <= holidayEnd) {
          // Calculate the last tour index before holiday started
          const diffTimePre = holidayStart.getTime() - startDate.getTime();
          const diffDaysPre = Math.floor(diffTimePre / (1000 * 60 * 60 * 24));

          // Calculate displacement into the holiday
          const diffTimeInHoliday = currentDate.getTime() - holidayStart.getTime();
          const diffDaysInHoliday = Math.floor(diffTimeInHoliday / (1000 * 60 * 60 * 24));

          const standardStartIndex = diffDaysPre % tourOrder.length;
          const standardTourId = tourOrder[standardStartIndex];

          // Find where this standard tour is in the new 5-tour order
          // This ensures we start counting from the correct "logical" tour
          const adjustedStartIndex = holidayTourOrder.indexOf(standardTourId);

          // Current index in 5-tour rotation
          const currentIndex = (adjustedStartIndex + diffDaysInHoliday) % holidayTourOrder.length;
          const tourId = holidayTourOrder[currentIndex];

          if (tourId === 'reinforcement') return []; // Reinforcement tour is empty

          return toursById[tourId]?.doctorIds
            .map((id) => doctorsById[id]?.name)
            .filter(Boolean) as string[];
        }

        // CASE 3: After Holiday -> Return to 4-tour logic
        if (currentDate > holidayEnd) {
          const diffTimePre = holidayStart.getTime() - startDate.getTime();
          const diffDaysPre = Math.floor(diffTimePre / (1000 * 60 * 60 * 24));

          const holidayDuration =
            Math.floor((holidayEnd.getTime() - holidayStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

          const standardStartIndex = diffDaysPre % tourOrder.length;
          const standardTourId = tourOrder[standardStartIndex];
          const adjustedStartIndex = holidayTourOrder.indexOf(standardTourId);

          // Index of the LAST day of holiday in the 5-tour cycle
          const lastHolidayIndex =
            (adjustedStartIndex + holidayDuration - 1) % holidayTourOrder.length;
          // lastHolidayTourId removed as it was unused

          // We need to find the "logical next" tour in the standard 4-tour cycle.
          const nextIndex5 = (lastHolidayIndex + 1) % holidayTourOrder.length;
          const nextTourId5 = holidayTourOrder[nextIndex5];

          let nextStandardIndex = -1;

          if (nextTourId5 === holidayTourId) {
            // If next is the holiday tour, skip it and take the one after
            const nextNextIndex5 = (nextIndex5 + 1) % holidayTourOrder.length;
            nextStandardIndex = tourOrder.indexOf(holidayTourOrder[nextNextIndex5]);
          } else {
            nextStandardIndex = tourOrder.indexOf(nextTourId5);
          }

          // Fallback: if tour not found, start from beginning
          if (nextStandardIndex === -1) {
            nextStandardIndex = 0;
          }

          const daysSinceHolidayEnd = Math.floor(
            (currentDate.getTime() - holidayEnd.getTime()) / (1000 * 60 * 60 * 24),
          ); // 1 for first day

          const effectiveIndex = (nextStandardIndex + (daysSinceHolidayEnd - 1)) % tourOrder.length;
          const tourId = tourOrder[effectiveIndex];
          return toursById[tourId]?.doctorIds
            .map((id) => doctorsById[id]?.name)
            .filter(Boolean) as string[];
        }
      }

      // Default Standard Logic (Fallback if no holiday configured)
      const diffTime = date.getTime() - startDate.getTime();

      if (diffTime >= 0) {
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const tourIndex = diffDays % tourOrder.length;
        const tourId = tourOrder[tourIndex];
        return toursById[tourId]?.doctorIds
          .map((id) => doctorsById[id]?.name)
          .filter(Boolean) as string[];
      }

      return undefined;
    },
    [tourOrder, toursById, doctorsById, doctorOverrides, tourOverrides, holidaySchedule, rotationStartDate],
  );

  const handleSwapTours = useCallback(
    (date1: Date, date2: Date) => {
      const getEffectiveTourId = (date: Date): string | undefined => {
        const dateString = getDateString(date);
        if (tourOverrides[dateString]) return tourOverrides[dateString];

        // Parse rotationStartDate as local date (YYYY-MM-DD format)
        let startDate: Date;
        if (rotationStartDate) {
          const [y, m, d] = rotationStartDate.split('-').map(Number);
          startDate = new Date(y, m - 1, d);
        } else {
          startDate = START_DATE;
        }
        startDate.setHours(0, 0, 0, 0);

        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        const diffTime = checkDate.getTime() - startDate.getTime();
        if (diffTime >= 0) {
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          return tourOrder[diffDays % tourOrder.length];
        }
        return undefined;
      };

      const date1Str = getDateString(date1);
      const date2Str = getDateString(date2);
      const tourId1 = getEffectiveTourId(date1);
      const tourId2 = getEffectiveTourId(date2);

      if (!tourId1 || !tourId2) {
        return;
      }

      setTourOverrides((current) => ({ ...current, [date1Str]: tourId2, [date2Str]: tourId1 }));
    },
    [tourOverrides, tourOrder, rotationStartDate],
  );

  const handleSwapDoctors = useCallback(
    (
      selection1: { date: Date; doctorIndex: number },
      selection2: { date: Date; doctorIndex: number },
    ) => {
      const date1Str = getDateString(selection1.date);
      const date2Str = getDateString(selection2.date);

      const doctors1 = getDoctorsForDate(selection1.date);
      const doctors2 = getDoctorsForDate(selection2.date);

      if (!doctors1 || !doctors2) return;

      const newDoctors1 = [...doctors1];
      const newDoctors2 = date1Str === date2Str ? newDoctors1 : [...doctors2];

      [newDoctors1[selection1.doctorIndex], newDoctors2[selection2.doctorIndex]] = [
        newDoctors2[selection2.doctorIndex],
        newDoctors1[selection1.doctorIndex],
      ];

      setDoctorOverrides((current) => ({
        ...current,
        [date1Str]: newDoctors1,
        [date2Str]: newDoctors2,
      }));
    },
    [getDoctorsForDate],
  );

  const handleReplaceDoctor = useCallback(
    (selection: { date: Date; doctorIndex: number }, newDoctorName: string) => {
      const dateStr = getDateString(selection.date);
      const doctorsOnDate = getDoctorsForDate(selection.date);
      if (!doctorsOnDate) return;
      const newDoctors = [...doctorsOnDate];
      newDoctors[selection.doctorIndex] = newDoctorName;
      setDoctorOverrides((current) => ({ ...current, [dateStr]: newDoctors }));
    },
    [getDoctorsForDate],
  );

  const handleResetOverrides = useCallback((date: Date) => {
    const dateStr = getDateString(date);
    const monthKey = `schedule_${dateStr.substring(0, 4)}_${dateStr.substring(5, 7)}.json`;
    modifiedMonthsRef.current.add(monthKey); // Mark month as modified

    setTourOverrides((current) => {
      const next = { ...current };
      delete next[dateStr];
      return next;
    });
    setDoctorOverrides((current) => {
      const next = { ...current };
      delete next[dateStr];
      return next;
    });
  }, []);

  const handleUpdateDoctorInTour = useCallback(
    (tourId: string, doctorIndex: number, newDoctorId: string) => {
      setTours((current) =>
        current.map((t) =>
          t.id === tourId
            ? { ...t, doctorIds: t.doctorIds.map((d, i) => (i === doctorIndex ? newDoctorId : d)) }
            : t,
        ),
      );
    },
    [],
  );

  const handleReorderTours = useCallback((newOrder: string[]) => setTourOrder(newOrder), []);
  const handleTogglePkdvVisibility = useCallback(() => setShowPkdv((current) => !current), []);

  const handleAddDoctor = useCallback((name: string, isCtch: boolean) => {
    if (name.trim()) {
      const newDoctor: Doctor = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        isCtch,
      };
      setDoctors((current) => [...current, newDoctor]);
    }
  }, []);

  const handleRemoveDoctor = useCallback((id: string) => {
    setDoctors((current) => current.filter((d) => d.id !== id));
    setTours((current) =>
      current.map((t) => ({
        ...t,
        doctorIds: t.doctorIds.map((docId) => (docId === id ? '' : docId)),
      })),
    );
  }, []);

  const handleUpdateDoctor = useCallback(
    (id: string, updatedDoctor: Partial<Omit<Doctor, 'id'>>) => {
      setDoctors((current) =>
        current.map((d) => {
          if (d.id === id) {
            const updates = { ...updatedDoctor };
            if (updates.name !== undefined) {
              updates.name = updates.name.trim();
            }
            return { ...d, ...updates };
          }
          return d;
        }),
      );
    },
    [],
  );

  const handleAddDoctorToTour = useCallback((tourId: string) => {
    setTours((current) =>
      current.map((t) => (t.id === tourId ? { ...t, doctorIds: [...t.doctorIds, ''] } : t)),
    );
  }, []);

  const handleRemoveDoctorFromTour = useCallback((tourId: string, doctorIndex: number) => {
    setTours((current) =>
      current.map((t) =>
        t.id === tourId ? { ...t, doctorIds: t.doctorIds.filter((_, i) => i !== doctorIndex) } : t,
      ),
    );
  }, []);

  const handleUpdateDepartmentAssignments = useCallback(
    (date: Date, role: DepartmentRole, doctors: string[]) => {
      const dateStr = getDateString(date);
      console.log(`[useScheduleData] Updating ${role} on ${dateStr}:`, doctors);
      setDepartmentAssignments((current) => {
        const newAssignmentsForDate = { ...(current[dateStr] || {}), [role]: doctors };
        const isEmpty = Object.values(newAssignmentsForDate).every(
          (arr) => !arr || (Array.isArray(arr) && arr.length === 0),
        );
        if (isEmpty) {
          const next = { ...current };
          delete next[dateStr];
          return next;
        }
        const updated = { ...current, [dateStr]: newAssignmentsForDate };
        console.log('[useScheduleData] New departmentAssignments:', updated);
        return updated;
      });
    },
    [],
  );

  const handleImportData = useCallback((data: ImportData, onSuccess?: () => void) => {
    if (data.doctors) setDoctors(data.doctors);
    if (data.tours) setTours(data.tours);
    if (data.tourOrder) setTourOrder(data.tourOrder);
    if (data.tourOverrides) setTourOverrides(data.tourOverrides);
    if (data.doctorOverrides) setDoctorOverrides(data.doctorOverrides);
    if (typeof data.showPkdv === 'boolean') setShowPkdv(data.showPkdv);
    if (data.departmentAssignments) setDepartmentAssignments(data.departmentAssignments);
    if (data.holidaySchedule) setHolidaySchedule(data.holidaySchedule);
    if (onSuccess) {
      onSuccess();
    }
  }, []);

  // Holiday Schedule Handlers
  const handleSetHolidayPeriod = useCallback((startDate: string | null, endDate: string | null) => {
    setHolidaySchedule((current) => ({
      ...current,
      startDate,
      endDate,
      // Reset overrides when period changes
      doctorOverrides: {},
    }));
  }, []);

  const handleUpdateHolidayDoctors = useCallback((dateStr: string, doctors: string[]) => {
    // Max 6 doctors
    const limitedDoctors = doctors.slice(0, 6);
    setHolidaySchedule((current) => ({
      ...current,
      doctorOverrides: {
        ...current.doctorOverrides,
        [dateStr]: limitedDoctors,
      },
    }));
  }, []);

  const handleSetHolidayTour = useCallback((tourId: string | undefined) => {
    setHolidaySchedule((current) => ({
      ...current,
      holidayTourId: tourId,
    }));
  }, []);

  const handleSetHolidayInsertionIndex = useCallback((index: number) => {
    setHolidaySchedule((current) => ({
      ...current,
      holidayInsertionIndex: index,
    }));
  }, []);

  const handleResetHolidayDay = useCallback((dateStr: string) => {
    setHolidaySchedule((current) => {
      const nextOverrides = { ...current.doctorOverrides };
      delete nextOverrides[dateStr];
      return {
        ...current,
        doctorOverrides: nextOverrides,
      };
    });
  }, []);

  const handleSetRotationStartDate = useCallback(
    (newDateStr: string | null) => {
      if (!newDateStr) {
        setRotationStartDate(null);
        return;
      }

      const currentStartDateStr = rotationStartDate || START_DATE.toISOString();
      const currentStartDate = new Date(currentStartDateStr);
      const newStartDate = new Date(newDateStr);

      // Only freeze history if we are moving the start date forward in time
      if (newStartDate > currentStartDate) {
        const overridesToAdd: Record<string, string> = {};
        const iterDate = new Date(currentStartDate);

        // Iterate day by day from current start date up to (but not including) the new start date
        // Stop 1 day early to avoid freezing the "current" day of the new start date (due to key overlap)
        const limitDate = new Date(newStartDate);
        limitDate.setDate(limitDate.getDate() - 1);

        while (iterDate < limitDate) {
          // Construct a Local Date equivalent to match the key generation logic in getDoctorsForDate
          // (which uses date.toISOString() on a Local Date, potentially causing a shift)
          const localEquivalent = new Date(
            iterDate.getFullYear(),
            iterDate.getMonth(),
            iterDate.getDate(),
          );
          const dateStr = getDateString(localEquivalent);

          // If there's already an override, keep it. If not, calculate the tour.
          if (!tourOverrides[dateStr]) {
            // Calculate tour based on CURRENT settings
            const diffTime = iterDate.getTime() - currentStartDate.getTime();
            if (diffTime >= 0) {
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              const tourIndex = diffDays % tourOrder.length;
              const tourId = tourOrder[tourIndex];
              overridesToAdd[dateStr] = tourId;
            }
          }
          // Move to next day
          iterDate.setDate(iterDate.getDate() + 1);
        }

        // Apply overrides and update start date
        if (Object.keys(overridesToAdd).length > 0) {
          setTourOverrides((prev) => ({ ...prev, ...overridesToAdd }));
        }
      }

      setRotationStartDate(newDateStr);
    },
    [rotationStartDate, tourOverrides, tourOrder],
  );

  return {
    doctors,
    tours,
    tourOrder,
    tourOverrides,
    doctorOverrides,
    showPkdv,
    departmentAssignments,
    holidaySchedule,
    rotationStartDate,
    doctorsById,
    toursById,
    isLoaded,
    getDoctorsForDate,
    handleSwapTours,
    handleSwapDoctors,
    handleReplaceDoctor,
    handleResetOverrides,
    handleUpdateDoctorInTour,
    handleReorderTours,
    handleTogglePkdvVisibility,
    handleUpdateDepartmentAssignments,
    handleAddDoctor,
    handleRemoveDoctor,
    handleUpdateDoctor,
    handleAddDoctorToTour,
    handleRemoveDoctorFromTour,
    handleImportData,
    handleSetHolidayPeriod,
    handleSetHolidayTour,
    handleSetHolidayInsertionIndex,
    handleUpdateHolidayDoctors,
    handleResetHolidayDay,
    handleSetRotationStartDate,
    handleSetViewDate,
  };
};
