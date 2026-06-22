import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getNextMonthDate } from '../utils/date';
import {
  Doctor,
  Tour,
  DepartmentRole,
  DepartmentAssignments,
  ImportData,
  HolidayScheduleData,
  ScheduleSnapshotEntry,
} from '../types';
import { INITIAL_DOCTORS, INITIAL_TOURS, INITIAL_TOUR_ORDER } from '../components/data';
import { START_DATE } from '../constants';
import {
  ScheduleConflictError,
  ScheduleBaseStorageData,
  ScheduleMonthStorageData,
  loadBaseScheduleData,
  loadMonthScheduleData,
  saveBaseScheduleData,
  saveMonthScheduleData,
  subscribeToScheduleChanges,
  loadCachedBaseData,
  loadCachedMonthData,
} from '../services/scheduleStorage';

// Helper to get date string in YYYY-MM-DD format using local time components
const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDateString = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getMonthKeyFromDateString = (dateString: string): string =>
  `schedule_${dateString.substring(0, 4)}_${dateString.substring(5, 7)}.json`;

const isDateStringInMonthFilename = (dateString: string, filename: string): boolean =>
  getMonthKeyFromDateString(dateString) === filename;

const withoutMonthEntries = <T>(entries: Record<string, T>, filename: string): Record<string, T> =>
  Object.fromEntries(
    Object.entries(entries).filter(
      ([dateString]) => !isDateStringInMonthFilename(dateString, filename),
    ),
  );

// Read-only polling interval (60 seconds) — uses simple fetch instead of WebSocket
const READ_ONLY_POLL_INTERVAL = 60_000;

// Storage file path (via Vite API)
// STORAGE_URL removed as it was unused

interface ScheduleData {
  doctors: Doctor[];
  tours: Tour[];
  tourOrder: string[];
  tourOverrides: Record<string, string>;
  doctorOverrides: Record<string, string[]>;
  scheduleSnapshots: Record<string, ScheduleSnapshotEntry>;
  showPkdv: boolean;
  showAddDoctorShortcut: boolean;
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
  scheduleSnapshots: {},
  showPkdv: true,
  showAddDoctorShortcut: false,
  departmentAssignments: {},
  holidaySchedule: DEFAULT_HOLIDAY_SCHEDULE,
  rotationStartDate: getDateString(START_DATE), // Use local date format, not ISO
  lastSaved: null,
};

interface UseScheduleDataOptions {
  onError?: (message: string) => void;
  onSaveSuccess?: () => void;
  enabled?: boolean;
  canWrite?: boolean;
}

export const useScheduleData = (options: UseScheduleDataOptions = {}) => {
  const { onError, onSaveSuccess, enabled = true, canWrite = true } = options;

  const [doctors, setDoctors] = useState<Doctor[]>(DEFAULT_DATA.doctors);
  const [tours, setTours] = useState<Tour[]>(DEFAULT_DATA.tours);
  const [tourOrder, setTourOrder] = useState<string[]>(DEFAULT_DATA.tourOrder);
  const [tourOverrides, setTourOverrides] = useState<Record<string, string>>({});
  const [doctorOverrides, setDoctorOverrides] = useState<Record<string, string[]>>({});
  const [scheduleSnapshots, setScheduleSnapshots] = useState<Record<string, ScheduleSnapshotEntry>>(
    {},
  );
  const [showPkdv, setShowPkdv] = useState<boolean>(true);
  const [showAddDoctorShortcut, setShowAddDoctorShortcut] = useState<boolean>(false);
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
  const baseModifiedRef = useRef(false);
  const baseUpdatedAtRef = useRef<string | null>(null);
  const monthUpdatedAtRef = useRef<Record<string, string | null>>({});
  const skipNextAutoSaveRef = useRef(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const ensureCanWrite = useCallback(() => {
    if (canWrite) return true;
    onError?.('Bạn đang ở chế độ chỉ xem. Hãy đăng nhập để chỉnh sửa lịch.');
    return false;
  }, [canWrite, onError]);

  // Helper to get storage key for a month
  const getMonthKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `schedule_${year}_${month}.json`;
  };

  const markBaseModified = useCallback(() => {
    baseModifiedRef.current = true;
  }, []);

  const markMonthModified = useCallback((dateString: string) => {
    modifiedMonthsRef.current.add(getMonthKeyFromDateString(dateString));
  }, []);

  const markMonthsModifiedFromRecord = useCallback(
    (record?: Record<string, unknown>) => {
      if (!record) return;
      Object.keys(record).forEach((dateString) => markMonthModified(dateString));
    },
    [markMonthModified],
  );

  const applyBaseData = useCallback((data: ScheduleBaseStorageData | null) => {
    if (!data) return;
    if (Array.isArray(data.doctors) && data.doctors.length > 0) setDoctors(data.doctors);
    if (Array.isArray(data.tours) && data.tours.length > 0) setTours(data.tours);
    if (Array.isArray(data.tourOrder) && data.tourOrder.length > 0) {
      setTourOrder(data.tourOrder);
    }
    if (typeof data.showPkdv === 'boolean') setShowPkdv(data.showPkdv);
    if (typeof data.showAddDoctorShortcut === 'boolean') {
      setShowAddDoctorShortcut(data.showAddDoctorShortcut);
    }
    if (typeof data.rotationStartDate === 'string') setRotationStartDate(data.rotationStartDate);
    if (data.holidaySchedule) setHolidaySchedule(data.holidaySchedule);
  }, []);

  const applyMonthData = useCallback((filename: string, data: ScheduleMonthStorageData | null) => {
    setTourOverrides((prev) => ({
      ...withoutMonthEntries(prev, filename),
      ...(data?.tourOverrides ?? {}),
    }));
    setDoctorOverrides((prev) => ({
      ...withoutMonthEntries(prev, filename),
      ...(data?.doctorOverrides ?? {}),
    }));
    setScheduleSnapshots((prev) => ({
      ...withoutMonthEntries(prev, filename),
      ...(data?.scheduleSnapshots ?? {}),
    }));
    setDepartmentAssignments((prev) => ({
      ...withoutMonthEntries(prev, filename),
      ...(data?.departmentAssignments ?? {}),
    }));

    if (data?.holidaySchedule?.startDate) {
      setHolidaySchedule(data.holidaySchedule);
    }
  }, []);

  // Load Base Data on mount — cache-first, then revalidate
  useEffect(() => {
    if (!enabled) {
      setIsLoaded(false);
      return;
    }

    // 1. Instant: apply cached data if available
    const cached = loadCachedBaseData();
    if (cached?.data) {
      applyBaseData(cached.data);
      baseUpdatedAtRef.current = cached.updatedAt;
    }

    // 2. Background: fetch fresh data from Supabase
    const loadBaseData = async () => {
      try {
        const record = await loadBaseScheduleData();
        baseUpdatedAtRef.current = record.updatedAt;
        applyBaseData(record.data);
      } catch {
        console.log('No base data found, using defaults');
      } finally {
        setIsLoaded(true);
      }
    };
    loadBaseData();
  }, [applyBaseData, enabled]);

  // Load Monthly Data when currentViewDate changes — cache-first
  useEffect(() => {
    if (!enabled) return;

    const filename = getMonthKey(currentViewDate);

    // 1. Instant: apply cached month data
    if (!loadedMonthsRef.current.has(filename)) {
      const cached = loadCachedMonthData(filename);
      if (cached?.data) {
        applyMonthData(filename, cached.data);
        monthUpdatedAtRef.current[filename] = cached.updatedAt;
      }
    }

    // 2. Background: fetch fresh from Supabase
    const loadMonthlyData = async () => {
      if (loadedMonthsRef.current.has(filename)) return;

      try {
        const record = await loadMonthScheduleData(filename);
        monthUpdatedAtRef.current[filename] = record.updatedAt;
        applyMonthData(filename, record.data);
        loadedMonthsRef.current.add(filename);
      } catch {
        // File might not exist yet, that's fine
        loadedMonthsRef.current.add(filename);
      }
    };
    loadMonthlyData();
  }, [applyMonthData, currentViewDate, enabled]);

  // Item 6: Editors use realtime WebSocket; read-only users use lightweight polling
  useEffect(() => {
    if (!enabled || !isLoaded) return;

    const filename = getMonthKey(currentViewDate);

    // Editors: use persistent realtime subscription (existing behavior)
    if (canWrite) {
      const channel = subscribeToScheduleChanges({
        currentMonthFilename: filename,
        onBaseChange: (record) => {
          if (record.updatedAt && record.updatedAt === baseUpdatedAtRef.current) return;
          if (baseModifiedRef.current) return;

          skipNextAutoSaveRef.current = true;
          baseUpdatedAtRef.current = record.updatedAt;
          baseModifiedRef.current = false;
          applyBaseData(record.data);
          onSaveSuccess?.();
        },
        onMonthChange: (changedFilename, record) => {
          if (record.updatedAt && record.updatedAt === monthUpdatedAtRef.current[changedFilename]) {
            return;
          }
          if (modifiedMonthsRef.current.has(changedFilename)) return;

          skipNextAutoSaveRef.current = true;
          monthUpdatedAtRef.current[changedFilename] = record.updatedAt;
          modifiedMonthsRef.current.delete(changedFilename);
          loadedMonthsRef.current.add(changedFilename);
          applyMonthData(changedFilename, record.data);
          onSaveSuccess?.();
        },
      });

      return () => {
        if (channel) {
          void channel.unsubscribe();
        }
      };
    }

    // Read-only users: lightweight polling (no WebSocket connection)
    const poll = async () => {
      try {
        const [baseRecord, monthRecord] = await Promise.all([
          loadBaseScheduleData(),
          loadMonthScheduleData(filename),
        ]);

        if (baseRecord.updatedAt !== baseUpdatedAtRef.current) {
          baseUpdatedAtRef.current = baseRecord.updatedAt;
          applyBaseData(baseRecord.data);
        }
        if (monthRecord.updatedAt !== monthUpdatedAtRef.current[filename]) {
          monthUpdatedAtRef.current[filename] = monthRecord.updatedAt;
          applyMonthData(filename, monthRecord.data);
        }
      } catch {
        // Silently ignore polling errors
      }
    };

    const intervalId = setInterval(poll, READ_ONLY_POLL_INTERVAL);
    return () => clearInterval(intervalId);
  }, [applyBaseData, applyMonthData, canWrite, currentViewDate, enabled, isLoaded, onSaveSuccess]);

  // Save data to file (debounced) - INTELLIGENT SAVE
  const saveData = useCallback(async () => {
    const dirtyMonths = Array.from(modifiedMonthsRef.current);
    const shouldSaveBase = baseModifiedRef.current;
    if (!shouldSaveBase && dirtyMonths.length === 0) return;
    let conflictFilename: string | null = null;

    // 1. Save Base Data (Global Settings)
    const baseData: Partial<ScheduleData> = {
      doctors,
      tours,
      tourOrder,
      showPkdv,
      showAddDoctorShortcut,
      holidaySchedule,
      rotationStartDate,
      lastSaved: new Date().toISOString(),
    };

    try {
      // Save Base
      if (shouldSaveBase) {
        conflictFilename = null;
        const updatedAt = await saveBaseScheduleData(baseData, baseUpdatedAtRef.current);
        baseUpdatedAtRef.current = updatedAt;
        baseModifiedRef.current = false;
      }

      // 2. Save Monthly Data (Overrides)
      for (const filename of dirtyMonths) {
        conflictFilename = filename;
        const content: ScheduleMonthStorageData = {};

        const addMonthEntries = <T>(
          source: Record<string, T>,
          key: keyof ScheduleMonthStorageData,
        ) => {
          const entries = Object.entries(source).filter(([dateString]) =>
            isDateStringInMonthFilename(dateString, filename),
          );
          if (entries.length > 0) {
            (content as Record<string, unknown>)[key] = Object.fromEntries(entries);
          }
        };

        addMonthEntries(tourOverrides, 'tourOverrides');
        addMonthEntries(doctorOverrides, 'doctorOverrides');
        addMonthEntries(scheduleSnapshots, 'scheduleSnapshots');
        addMonthEntries(departmentAssignments, 'departmentAssignments');

        const updatedAt = await saveMonthScheduleData(
          filename,
          content,
          monthUpdatedAtRef.current[filename] ?? null,
        );
        monthUpdatedAtRef.current[filename] = updatedAt;
        modifiedMonthsRef.current.delete(filename);
      }

      onSaveSuccess?.();
    } catch (error) {
      console.error('Failed to save:', error);
      onError?.(
        error instanceof ScheduleConflictError
          ? 'Dữ liệu đã được cập nhật từ máy khác. Ứng dụng sẽ tải bản mới nhất để tránh ghi đè.'
          : error instanceof Error && error.message === 'Missing editor email'
            ? 'Lịch đang khóa. Bấm biểu tượng ổ khóa và nhập email để chỉnh sửa.'
            : 'Không thể lưu dữ liệu. Vui lòng thử lại.',
      );

      if (error instanceof ScheduleConflictError) {
        const filename = conflictFilename ?? getMonthKey(currentViewDate);
        const [baseRecord, monthRecord] = await Promise.all([
          loadBaseScheduleData(),
          loadMonthScheduleData(filename),
        ]);
        skipNextAutoSaveRef.current = true;
        baseUpdatedAtRef.current = baseRecord.updatedAt;
        monthUpdatedAtRef.current[filename] = monthRecord.updatedAt;
        baseModifiedRef.current = false;
        modifiedMonthsRef.current.delete(filename);
        applyBaseData(baseRecord.data);
        applyMonthData(filename, monthRecord.data);
      }
    }
  }, [
    applyBaseData,
    applyMonthData,
    doctors,
    tours,
    tourOrder,
    tourOverrides,
    doctorOverrides,
    scheduleSnapshots,
    showPkdv,
    showAddDoctorShortcut,
    departmentAssignments,
    holidaySchedule,
    rotationStartDate,
    currentViewDate,
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
    if (!enabled || !isLoaded || !canWrite) return; // Don't save before initial load
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

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
    scheduleSnapshots,
    showPkdv,
    departmentAssignments,
    holidaySchedule,
    isLoaded,
    enabled,
    canWrite,
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

      // 4. Priority: Frozen monthly snapshot
      if (scheduleSnapshots[dateString]) {
        return scheduleSnapshots[dateString].doctors;
      }

      // Define effective start date for calculations
      // If date is before rotationStartDate, fall back to START_DATE
      const rotationStartDateParsed = rotationStartDate
        ? parseLocalDateString(rotationStartDate)
        : START_DATE;
      const startDateRaw = date < rotationStartDateParsed ? START_DATE : rotationStartDateParsed;
      const startDate = new Date(
        startDateRaw.getFullYear(),
        startDateRaw.getMonth(),
        startDateRaw.getDate(),
      );

      // Check for Holiday Schedule
      const holidayStart = holidaySchedule.startDate
        ? parseLocalDateString(holidaySchedule.startDate)
        : null;
      const holidayEnd = holidaySchedule.endDate
        ? parseLocalDateString(holidaySchedule.endDate)
        : null;
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
        const rawInsertionIndex =
          holidaySchedule.holidayInsertionIndex !== undefined
            ? holidaySchedule.holidayInsertionIndex
            : tourOrder.length; // Default to end
        const insertionIndex = Math.max(0, Math.min(rawInsertionIndex, tourOrder.length));

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
    [
      tourOrder,
      toursById,
      doctorsById,
      doctorOverrides,
      tourOverrides,
      scheduleSnapshots,
      holidaySchedule,
      rotationStartDate,
    ],
  );

  const handleSwapTours = useCallback(
    (date1: Date, date2: Date) => {
      if (!ensureCanWrite()) return;

      const getEffectiveTourId = (date: Date): string | undefined => {
        const dateString = getDateString(date);
        if (tourOverrides[dateString]) return tourOverrides[dateString];
        if (scheduleSnapshots[dateString]?.tourId) return scheduleSnapshots[dateString].tourId;

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

      markMonthModified(date1Str);
      markMonthModified(date2Str);
      setTourOverrides((current) => ({ ...current, [date1Str]: tourId2, [date2Str]: tourId1 }));
    },
    [
      tourOverrides,
      scheduleSnapshots,
      tourOrder,
      rotationStartDate,
      ensureCanWrite,
      markMonthModified,
    ],
  );

  const handleSwapDoctors = useCallback(
    (
      selection1: { date: Date; doctorIndex: number },
      selection2: { date: Date; doctorIndex: number },
    ) => {
      if (!ensureCanWrite()) return;

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

      markMonthModified(date1Str);
      markMonthModified(date2Str);
      setDoctorOverrides((current) => ({
        ...current,
        [date1Str]: newDoctors1,
        [date2Str]: newDoctors2,
      }));
    },
    [getDoctorsForDate, ensureCanWrite, markMonthModified],
  );

  const handleReplaceDoctor = useCallback(
    (selection: { date: Date; doctorIndex: number }, newDoctorName: string) => {
      if (!ensureCanWrite()) return;

      const dateStr = getDateString(selection.date);
      const doctorsOnDate = getDoctorsForDate(selection.date);
      if (!doctorsOnDate) return;
      const newDoctors = [...doctorsOnDate];
      newDoctors[selection.doctorIndex] = newDoctorName;
      markMonthModified(dateStr);
      setDoctorOverrides((current) => ({ ...current, [dateStr]: newDoctors }));
    },
    [getDoctorsForDate, ensureCanWrite, markMonthModified],
  );

  const handleAddDoctorToDate = useCallback(
    (date: Date, doctorName: string) => {
      if (!ensureCanWrite()) return;

      const dateStr = getDateString(date);
      const doctorsOnDate = getDoctorsForDate(date);
      if (!doctorsOnDate || doctorsOnDate.includes(doctorName)) return;

      markMonthModified(dateStr);
      setDoctorOverrides((current) => ({
        ...current,
        [dateStr]: [...doctorsOnDate, doctorName],
      }));
    },
    [ensureCanWrite, getDoctorsForDate, markMonthModified],
  );

  const handleResetOverrides = useCallback(
    (date: Date) => {
      if (!ensureCanWrite()) return;

      const dateStr = getDateString(date);
      markMonthModified(dateStr);

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
    },
    [ensureCanWrite, markMonthModified],
  );

  const handleUpdateDoctorInTour = useCallback(
    (tourId: string, doctorIndex: number, newDoctorId: string) => {
      if (!ensureCanWrite()) return;

      markBaseModified();
      setTours((current) =>
        current.map((t) =>
          t.id === tourId
            ? { ...t, doctorIds: t.doctorIds.map((d, i) => (i === doctorIndex ? newDoctorId : d)) }
            : t,
        ),
      );
    },
    [ensureCanWrite, markBaseModified],
  );

  const getStandardTourIdForDate = useCallback(
    (date: Date): string | undefined => {
      const startDate = rotationStartDate
        ? parseLocalDateString(rotationStartDate)
        : new Date(START_DATE);
      startDate.setHours(0, 0, 0, 0);

      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);

      const diffTime = checkDate.getTime() - startDate.getTime();
      if (diffTime < 0 || tourOrder.length === 0) return undefined;

      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return tourOrder[diffDays % tourOrder.length];
    },
    [rotationStartDate, tourOrder],
  );

  const freezeScheduleBefore = useCallback(
    (exclusiveEndDate: Date) => {
      const startDate = rotationStartDate
        ? parseLocalDateString(rotationStartDate)
        : new Date(START_DATE);
      startDate.setHours(0, 0, 0, 0);

      const boundaryDate = new Date(
        exclusiveEndDate.getFullYear(),
        exclusiveEndDate.getMonth(),
        exclusiveEndDate.getDate(),
      );
      boundaryDate.setHours(0, 0, 0, 0);

      if (boundaryDate <= startDate) return;

      const snapshotsToAdd: Record<string, ScheduleSnapshotEntry> = {};
      const iterDate = new Date(startDate);

      while (iterDate < boundaryDate) {
        const dateStr = getDateString(iterDate);

        if (!scheduleSnapshots[dateStr]) {
          const doctorsForDate = getDoctorsForDate(iterDate);
          if (doctorsForDate && doctorsForDate.length > 0) {
            const tourId = tourOverrides[dateStr] || getStandardTourIdForDate(iterDate);
            snapshotsToAdd[dateStr] = {
              doctors: doctorsForDate,
              tourId,
              tourName: doctorsForDate[0],
            };
          }
        }

        iterDate.setDate(iterDate.getDate() + 1);
      }

      if (Object.keys(snapshotsToAdd).length > 0) {
        markMonthsModifiedFromRecord(snapshotsToAdd);
        setScheduleSnapshots((current) => ({ ...current, ...snapshotsToAdd }));
      }
    },
    [
      rotationStartDate,
      scheduleSnapshots,
      tourOverrides,
      getDoctorsForDate,
      getStandardTourIdForDate,
      markMonthsModifiedFromRecord,
    ],
  );

  const handleReorderTours = useCallback(
    (newOrder: string[]) => {
      if (!ensureCanWrite()) return;
      const isSameOrder =
        newOrder.length === tourOrder.length &&
        newOrder.every((tourId, index) => tourId === tourOrder[index]);
      if (isSameOrder) return;

      const currentMonthStart = new Date(
        currentViewDate.getFullYear(),
        currentViewDate.getMonth(),
        1,
      );
      freezeScheduleBefore(currentMonthStart);
      markBaseModified();
      setTourOrder(newOrder);
    },
    [currentViewDate, ensureCanWrite, freezeScheduleBefore, markBaseModified, tourOrder],
  );
  const handleTogglePkdvVisibility = useCallback(() => {
    if (!ensureCanWrite()) return;
    markBaseModified();
    setShowPkdv((current) => !current);
  }, [ensureCanWrite, markBaseModified]);

  const handleToggleAddDoctorShortcut = useCallback(() => {
    if (!ensureCanWrite()) return;
    markBaseModified();
    setShowAddDoctorShortcut((current) => !current);
  }, [ensureCanWrite, markBaseModified]);

  const handleAddDoctor = useCallback(
    (name: string, isCtch: boolean) => {
      if (!ensureCanWrite()) return;

      if (name.trim()) {
        const newDoctor: Doctor = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: name.trim(),
          isCtch,
        };
        markBaseModified();
        setDoctors((current) => [...current, newDoctor]);
      }
    },
    [ensureCanWrite, markBaseModified],
  );

  const handleRemoveDoctor = useCallback(
    (id: string) => {
      if (!ensureCanWrite()) return;

      markBaseModified();
      setDoctors((current) => current.filter((d) => d.id !== id));
      setTours((current) =>
        current.map((t) => ({
          ...t,
          doctorIds: t.doctorIds.map((docId) => (docId === id ? '' : docId)),
        })),
      );
    },
    [ensureCanWrite, markBaseModified],
  );

  const handleUpdateDoctor = useCallback(
    (id: string, updatedDoctor: Partial<Omit<Doctor, 'id'>>) => {
      if (!ensureCanWrite()) return;

      markBaseModified();
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
    [ensureCanWrite, markBaseModified],
  );

  const handleAddDoctorToTour = useCallback(
    (tourId: string) => {
      if (!ensureCanWrite()) return;

      markBaseModified();
      setTours((current) =>
        current.map((t) => (t.id === tourId ? { ...t, doctorIds: [...t.doctorIds, ''] } : t)),
      );
    },
    [ensureCanWrite, markBaseModified],
  );

  const handleRemoveDoctorFromTour = useCallback(
    (tourId: string, doctorIndex: number) => {
      if (!ensureCanWrite()) return;

      markBaseModified();
      setTours((current) =>
        current.map((t) =>
          t.id === tourId
            ? { ...t, doctorIds: t.doctorIds.filter((_, i) => i !== doctorIndex) }
            : t,
        ),
      );
    },
    [ensureCanWrite, markBaseModified],
  );

  const handleUpdateDepartmentAssignments = useCallback(
    (date: Date, role: DepartmentRole, doctors: string[]) => {
      if (!ensureCanWrite()) return;

      const dateStr = getDateString(date);
      markMonthModified(dateStr);
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
    [ensureCanWrite, markMonthModified],
  );

  const handleImportData = useCallback(
    (data: ImportData, onSuccess?: () => void) => {
      if (!ensureCanWrite()) return;

      if (
        data.doctors ||
        data.tours ||
        data.tourOrder ||
        typeof data.showPkdv === 'boolean' ||
        typeof data.showAddDoctorShortcut === 'boolean' ||
        data.holidaySchedule
      ) {
        markBaseModified();
      }
      markMonthsModifiedFromRecord(data.tourOverrides);
      markMonthsModifiedFromRecord(data.doctorOverrides);
      markMonthsModifiedFromRecord(data.scheduleSnapshots);
      markMonthsModifiedFromRecord(data.departmentAssignments);

      if (data.doctors) setDoctors(data.doctors);
      if (data.tours) setTours(data.tours);
      if (data.tourOrder) setTourOrder(data.tourOrder);
      if (data.tourOverrides) setTourOverrides(data.tourOverrides);
      if (data.doctorOverrides) setDoctorOverrides(data.doctorOverrides);
      if (data.scheduleSnapshots) setScheduleSnapshots(data.scheduleSnapshots);
      if (typeof data.showPkdv === 'boolean') setShowPkdv(data.showPkdv);
      if (typeof data.showAddDoctorShortcut === 'boolean') {
        setShowAddDoctorShortcut(data.showAddDoctorShortcut);
      }
      if (data.departmentAssignments) setDepartmentAssignments(data.departmentAssignments);
      if (data.holidaySchedule) setHolidaySchedule(data.holidaySchedule);
      if (onSuccess) {
        onSuccess();
      }
    },
    [ensureCanWrite, markBaseModified, markMonthsModifiedFromRecord],
  );

  // Holiday Schedule Handlers
  const handleSetHolidayPeriod = useCallback(
    (startDate: string | null, endDate: string | null) => {
      if (!ensureCanWrite()) return;

      markBaseModified();
      setHolidaySchedule((current) => ({
        ...current,
        startDate,
        endDate,
        // Reset overrides when period changes
        doctorOverrides: {},
      }));
    },
    [ensureCanWrite, markBaseModified],
  );

  const handleUpdateHolidayDoctors = useCallback(
    (dateStr: string, doctors: string[]) => {
      if (!ensureCanWrite()) return;

      // Max 6 doctors
      const limitedDoctors = doctors.slice(0, 6);
      markBaseModified();
      setHolidaySchedule((current) => ({
        ...current,
        doctorOverrides: {
          ...current.doctorOverrides,
          [dateStr]: limitedDoctors,
        },
      }));
    },
    [ensureCanWrite, markBaseModified],
  );

  const handleSetHolidayTour = useCallback(
    (tourId: string | undefined) => {
      if (!ensureCanWrite()) return;

      markBaseModified();
      setHolidaySchedule((current) => ({
        ...current,
        holidayTourId: tourId,
      }));
    },
    [ensureCanWrite, markBaseModified],
  );

  const handleSetHolidayInsertionIndex = useCallback(
    (index: number) => {
      if (!ensureCanWrite()) return;

      markBaseModified();
      setHolidaySchedule((current) => ({
        ...current,
        holidayInsertionIndex: index,
      }));
    },
    [ensureCanWrite, markBaseModified],
  );

  const handleResetHolidayDay = useCallback(
    (dateStr: string) => {
      if (!ensureCanWrite()) return;

      markBaseModified();
      setHolidaySchedule((current) => {
        const nextOverrides = { ...current.doctorOverrides };
        delete nextOverrides[dateStr];
        return {
          ...current,
          doctorOverrides: nextOverrides,
        };
      });
    },
    [ensureCanWrite, markBaseModified],
  );

  const handleSetRotationStartDate = useCallback(
    (newDateStr: string | null) => {
      if (!ensureCanWrite()) return;

      if (!newDateStr) {
        markBaseModified();
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
          markMonthsModifiedFromRecord(overridesToAdd);
          setTourOverrides((prev) => ({ ...prev, ...overridesToAdd }));
        }
      }

      markBaseModified();
      setRotationStartDate(newDateStr);
    },
    [
      rotationStartDate,
      tourOverrides,
      tourOrder,
      ensureCanWrite,
      markBaseModified,
      markMonthsModifiedFromRecord,
    ],
  );

  return {
    doctors,
    tours,
    tourOrder,
    tourOverrides,
    doctorOverrides,
    scheduleSnapshots,
    showPkdv,
    showAddDoctorShortcut,
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
    handleAddDoctorToDate,
    handleResetOverrides,
    handleUpdateDoctorInTour,
    handleReorderTours,
    handleTogglePkdvVisibility,
    handleToggleAddDoctorShortcut,
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
