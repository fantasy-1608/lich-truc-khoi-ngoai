import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getNextMonthDate } from '../utils/date';
import { isScheduleDateFrozen } from '../utils/scheduleEditing';
import {
  Doctor,
  Tour,
  DepartmentRole,
  DepartmentAssignments,
  ImportData,
  HolidayScheduleData,
  ScheduleSnapshotEntry,
  RotationConfig,
  RotationVersion,
  RotationRoster,
} from '../types';
import { INITIAL_DOCTORS, INITIAL_TOURS, INITIAL_TOUR_ORDER } from '../components/data';
import { START_DATE } from '../constants';
import {
  dateKey,
  resolveDay,
  rosterAt,
  earliestRotationDate,
  validateRoster,
  previewRotation,
} from '../utils/rotation';
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
  appendRotationVersion,
} from '../services/scheduleStorage';

// Helper to get date string in YYYY-MM-DD format using local time components
const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  rotationConfig?: RotationConfig;
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
  const [rotationConfig, setRotationConfig] = useState<RotationConfig | undefined>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentViewDate, setCurrentViewDate] = useState<Date>(getNextMonthDate());
  const loadedMonthsRef = useRef<Set<string>>(new Set());
  const modifiedMonthsRef = useRef<Set<string>>(new Set()); // Track months that need saving
  const baseModifiedRef = useRef(false);
  const baseUpdatedAtRef = useRef<string | null>(null);
  const monthUpdatedAtRef = useRef<Record<string, string | null>>({});
  const skipNextAutoSaveRef = useRef(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stabilize callbacks
  const onErrorRef = useRef(onError);
  const onSaveSuccessRef = useRef(onSaveSuccess);
  useEffect(() => {
    onErrorRef.current = onError;
    onSaveSuccessRef.current = onSaveSuccess;
  }, [onError, onSaveSuccess]);

  const ensureCanWrite = useCallback(() => {
    if (canWrite) return true;
    onErrorRef.current?.('Bạn đang ở chế độ chỉ xem. Hãy đăng nhập để chỉnh sửa lịch.');
    return false;
  }, [canWrite]);

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
    setRotationConfig(data.rotationConfig);
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

  // Load the visible month and its previous month. The previous month is needed for
  // recovery warnings on the first two days of the visible month.
  useEffect(() => {
    if (!enabled) return;

    const previousMonthDate = new Date(
      currentViewDate.getFullYear(),
      currentViewDate.getMonth() - 1,
      1,
    );
    const filenames = [getMonthKey(currentViewDate), getMonthKey(previousMonthDate)];

    // 1. Instant: apply cached month data
    filenames.forEach((filename) => {
      if (!loadedMonthsRef.current.has(filename)) {
        const cached = loadCachedMonthData(filename);
        if (cached?.data) {
          applyMonthData(filename, cached.data);
          monthUpdatedAtRef.current[filename] = cached.updatedAt;
        }
      }
    });

    // 2. Background: fetch fresh from Supabase
    const loadMonthlyData = async () => {
      await Promise.all(
        filenames.map(async (filename) => {
          if (loadedMonthsRef.current.has(filename)) return;

          try {
            const record = await loadMonthScheduleData(filename);
            monthUpdatedAtRef.current[filename] = record.updatedAt;
            applyMonthData(filename, record.data);
            loadedMonthsRef.current.add(filename);
          } catch {
            onErrorRef.current?.('Không tải được dữ liệu tháng. Hãy tải lại trước khi chỉnh sửa.');
          }
        }),
      );
    };
    void loadMonthlyData();
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
          onSaveSuccessRef.current?.();
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
          onSaveSuccessRef.current?.();
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
  }, [applyBaseData, applyMonthData, canWrite, currentViewDate, enabled, isLoaded]);

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
      rotationConfig,
      lastSaved: new Date().toISOString(),
    };

    try {
      // 2. Save Monthly Data (Overrides)
      // Save frozen month data before global rotation changes so a failed month save
      // cannot leave older schedules recomputed from a newer tour order.
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

      // Save Base
      if (shouldSaveBase) {
        conflictFilename = null;
        const updatedAt = await saveBaseScheduleData(baseData, baseUpdatedAtRef.current);
        baseUpdatedAtRef.current = updatedAt;
        baseModifiedRef.current = false;
      }

      onSaveSuccessRef.current?.();
    } catch (error) {
      console.error('Failed to save:', error);
      onErrorRef.current?.(
        error instanceof ScheduleConflictError
          ? 'Dữ liệu đã được cập nhật từ máy khác. Ứng dụng sẽ tải bản mới nhất để tránh ghi đè.'
          : error instanceof Error && error.message === 'Missing editor email'
            ? 'Lịch đang khóa. Bấm biểu tượng ổ khóa và nhập email để chỉnh sửa.'
            : 'Không thể lưu dữ liệu. Vui lòng thử lại.',
      );

      if (error instanceof ScheduleConflictError) {
        const filename = conflictFilename ?? getMonthKey(currentViewDate);
        modifiedMonthsRef.current.delete(filename); // Ensure we don't loop if recovery fails

        try {
          const [baseRecord, monthRecord] = await Promise.all([
            loadBaseScheduleData(),
            loadMonthScheduleData(filename),
          ]);
          skipNextAutoSaveRef.current = true;
          baseUpdatedAtRef.current = baseRecord.updatedAt;
          monthUpdatedAtRef.current[filename] = monthRecord.updatedAt;
          baseModifiedRef.current = false;
          applyBaseData(baseRecord.data);
          applyMonthData(filename, monthRecord.data);
        } catch (recoveryError) {
          console.error('Failed to recover from conflict:', recoveryError);
        }
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
    rotationConfig,
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

  const baseRoster: RotationRoster = useMemo(
    () => ({ doctors, tours, tourOrder, rotationStartDate, holidaySchedule }),
    [doctors, tours, tourOrder, rotationStartDate, holidaySchedule],
  );
  const activeRotationConfig = useMemo(
    () => rotationConfig ?? { baseline: baseRoster, versions: [] },
    [rotationConfig, baseRoster],
  );
  const getDoctorsForDate = useCallback(
    (date: Date): string[] | undefined => {
      const key = dateKey(date);
      const today = new Date();
      const historical = date < new Date(today.getFullYear(), today.getMonth(), 1);
      if (
        historical &&
        !(
          activeRotationConfig.baselineEffectiveDate &&
          key >= activeRotationConfig.baselineEffectiveDate
        ) &&
        !scheduleSnapshots[key] &&
        !doctorOverrides[key] &&
        !activeRotationConfig.baseline.holidaySchedule.doctorOverrides[key]
      )
        return undefined;
      const resolved = resolveDay(key, activeRotationConfig, {
        doctorOverrides,
        tourOverrides,
        scheduleSnapshots,
      });
      return resolved.doctors.length ? resolved.doctors : undefined;
    },
    [activeRotationConfig, doctorOverrides, tourOverrides, scheduleSnapshots],
  );

  const getTourNameForDate = useCallback(
    (date: Date) =>
      getDoctorsForDate(date)
        ? resolveDay(dateKey(date), activeRotationConfig, {
            doctorOverrides,
            tourOverrides,
            scheduleSnapshots,
          }).tourName
        : undefined,
    [getDoctorsForDate, activeRotationConfig, doctorOverrides, tourOverrides, scheduleSnapshots],
  );
  const displayRoster = rosterAt(
    activeRotationConfig,
    dateKey(new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 1, 0)),
  );
  const availableDoctors = displayRoster.doctors;
  const displayDoctorsById = useMemo(
    () => Object.fromEntries(availableDoctors.map((d) => [d.id, d])),
    [availableDoctors],
  );
  const displayToursById = useMemo(
    () => Object.fromEntries(displayRoster.tours.map((t) => [t.id, t])),
    [displayRoster.tours],
  );

  const handleApplyRotationVersion = useCallback(
    async (
      version: RotationVersion,
      expectedBase: string | null,
      expectedMonths: Record<string, string | null>,
      monthData: ScheduleMonthStorageData,
    ) => {
      if (!ensureCanWrite()) throw new Error('Hãy mở khóa chỉnh sửa trước khi áp dụng.');
      if (baseModifiedRef.current || modifiedMonthsRef.current.size)
        throw new Error('Có dữ liệu đang chờ lưu. Hãy đợi lưu xong rồi xem trước lại.');
      if (version.effectiveDate < earliestRotationDate())
        throw new Error('Không được thay cấu hình của tháng đã chốt.');
      validateRoster(version.roster);
      const check = previewRotation(activeRotationConfig, version, monthData);
      if (check.warnings.some((w) => w.kind === 'consecutive') && !version.exceptionReason?.trim())
        throw new Error('Trực hai ngày liên tiếp cần xác nhận ngoại lệ và lý do.');
      const saved = await appendRotationVersion(
        activeRotationConfig.baseline,
        version,
        expectedBase,
        expectedMonths,
      );
      // The direct RPC is read back before updating the UI; no optimistic success.
      applyBaseData(saved.data);
      baseUpdatedAtRef.current = saved.updatedAt;
      onSaveSuccessRef.current?.();
    },
    [activeRotationConfig, ensureCanWrite, applyBaseData],
  );

  const isDateFrozen = useCallback((date: Date): boolean => isScheduleDateFrozen(date), []);

  const handleSwapTours = useCallback(
    (date1: Date, date2: Date) => {
      if (!ensureCanWrite()) return;
      if (isDateFrozen(date1) || isDateFrozen(date2)) {
        onErrorRef.current?.('Lịch ngày này đã đóng băng, không thể chỉnh sửa.');
        return;
      }

      const getEffectiveTourId = (date: Date): string | undefined => {
        return resolveDay(dateKey(date), activeRotationConfig, {
          tourOverrides,
          doctorOverrides,
          scheduleSnapshots,
        }).tourId;
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
      const first = resolveDay(date1Str, activeRotationConfig, {
        tourOverrides,
        doctorOverrides,
        scheduleSnapshots,
      });
      const second = resolveDay(date2Str, activeRotationConfig, {
        tourOverrides,
        doctorOverrides,
        scheduleSnapshots,
      });
      setScheduleSnapshots((current) => ({
        ...current,
        [date1Str]: { doctors: second.doctors, tourId: second.tourId, tourName: second.tourName },
        [date2Str]: { doctors: first.doctors, tourId: first.tourId, tourName: first.tourName },
      }));
    },
    [
      tourOverrides,
      doctorOverrides,
      scheduleSnapshots,
      activeRotationConfig,
      ensureCanWrite,
      markMonthModified,
      isDateFrozen,
    ],
  );

  const handleSwapDoctors = useCallback(
    (
      selection1: { date: Date; doctorIndex: number },
      selection2: { date: Date; doctorIndex: number },
    ) => {
      if (!ensureCanWrite()) return;
      if (isDateFrozen(selection1.date) || isDateFrozen(selection2.date)) {
        onErrorRef.current?.('Lịch ngày này đã đóng băng, không thể chỉnh sửa.');
        return;
      }

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
    [getDoctorsForDate, ensureCanWrite, markMonthModified, isDateFrozen],
  );

  const handleReplaceDoctor = useCallback(
    (selection: { date: Date; doctorIndex: number }, newDoctorName: string) => {
      if (!ensureCanWrite()) return;
      if (isDateFrozen(selection.date)) {
        onErrorRef.current?.('Lịch ngày này đã đóng băng, không thể chỉnh sửa.');
        return;
      }

      const dateStr = getDateString(selection.date);
      const doctorsOnDate = getDoctorsForDate(selection.date);
      if (!doctorsOnDate) return;
      const newDoctors = [...doctorsOnDate];
      newDoctors[selection.doctorIndex] = newDoctorName;
      markMonthModified(dateStr);
      setDoctorOverrides((current) => ({ ...current, [dateStr]: newDoctors }));
    },
    [getDoctorsForDate, ensureCanWrite, markMonthModified, isDateFrozen],
  );

  const handleAddDoctorToDate = useCallback(
    (date: Date, doctorName: string) => {
      if (!ensureCanWrite()) return;
      if (isDateFrozen(date)) {
        onErrorRef.current?.('Lịch ngày này đã đóng băng, không thể chỉnh sửa.');
        return;
      }

      const dateStr = getDateString(date);
      const doctorsOnDate = getDoctorsForDate(date);
      if (!doctorsOnDate || doctorsOnDate.includes(doctorName)) return;

      markMonthModified(dateStr);
      setDoctorOverrides((current) => ({
        ...current,
        [dateStr]: [...doctorsOnDate, doctorName],
      }));
    },
    [ensureCanWrite, getDoctorsForDate, markMonthModified, isDateFrozen],
  );

  const handleResetOverrides = useCallback(
    (date: Date) => {
      if (!ensureCanWrite()) return;
      if (isDateFrozen(date)) {
        onErrorRef.current?.('Lịch ngày này đã đóng băng, không thể chỉnh sửa.');
        return;
      }

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
      setScheduleSnapshots((current) => {
        const next = { ...current };
        delete next[dateStr];
        return next;
      });
    },
    [ensureCanWrite, markMonthModified, isDateFrozen],
  );

  const handleUpdateDoctorInTour = useCallback(
    (_tourId: string, _index: number, _doctorId: string) => {
      void [_tourId, _index, _doctorId];
      onErrorRef.current?.('Hãy dùng bản nháp cấu hình có ngày hiệu lực trong Cài đặt.');
    },
    [],
  );
  const handleReorderTours = useCallback((_order: string[]) => {
    void [_order];
    onErrorRef.current?.('Hãy dùng Xoay tua định kỳ; không thay cấu hình dùng chung của lịch cũ.');
  }, []);
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

  const handleAddDoctor = useCallback((_name: string, _isCtch: boolean) => {
    void [_name, _isCtch];
    onErrorRef.current?.('Hãy dùng bản nháp thành viên có ngày hiệu lực trong Cài đặt.');
  }, []);

  const handleRemoveDoctor = useCallback((_id: string) => {
    void [_id];
    onErrorRef.current?.('Hãy dùng bản nháp thành viên có ngày hiệu lực trong Cài đặt.');
  }, []);

  const handleUpdateDoctor = useCallback((_id: string, _updates: Partial<Omit<Doctor, 'id'>>) => {
    void [_id, _updates];
    onErrorRef.current?.('Hãy dùng bản nháp thành viên có ngày hiệu lực trong Cài đặt.');
  }, []);

  const handleAddDoctorToTour = useCallback((_tourId: string) => {
    void [_tourId];
    onErrorRef.current?.('Hãy dùng bản nháp thành viên có ngày hiệu lực trong Cài đặt.');
  }, []);

  const handleRemoveDoctorFromTour = useCallback((_tourId: string, _index: number) => {
    void [_tourId, _index];
    onErrorRef.current?.('Hãy dùng bản nháp thành viên có ngày hiệu lực trong Cài đặt.');
  }, []);

  const handleUpdateDepartmentAssignments = useCallback(
    (date: Date, role: DepartmentRole, doctors: string[]) => {
      if (!ensureCanWrite()) return;
      if (isDateFrozen(date)) {
        onErrorRef.current?.('Lịch ngày này đã đóng băng, không thể chỉnh sửa.');
        return;
      }

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
    [ensureCanWrite, markMonthModified, isDateFrozen],
  );

  const handleImportData = useCallback(
    (data: ImportData, onSuccess?: () => void) => {
      if (!ensureCanWrite()) return;

      if (data.doctors || data.tours || data.tourOrder || data.rotationConfig) {
        onErrorRef.current?.(
          'Không nhập đè cấu hình tua. Hãy tạo phiên bản có ngày hiệu lực; lịch cũ được giữ nguyên.',
        );
        return;
      }

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

  const handleSetRotationStartDate = useCallback((_date: string | null) => {
    void [_date];
    onErrorRef.current?.('Hãy dùng bản nháp thành viên có ngày hiệu lực trong Cài đặt.');
  }, []);

  return {
    historicalCoverage: {
      month: dateKey(currentViewDate).slice(0, 7),
      isHistorical: currentViewDate < new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      fixedDays:
        activeRotationConfig.baselineEffectiveDate &&
        dateKey(currentViewDate).slice(0, 7) >=
          activeRotationConfig.baselineEffectiveDate.slice(0, 7)
          ? new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 1, 0).getDate()
          : Object.keys({ ...scheduleSnapshots, ...doctorOverrides }).filter((k) =>
              k.startsWith(dateKey(currentViewDate).slice(0, 7)),
            ).length,
      totalDays: new Date(
        currentViewDate.getFullYear(),
        currentViewDate.getMonth() + 1,
        0,
      ).getDate(),
    },
    rotationConfig: activeRotationConfig,
    handleApplyRotationVersion,
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
    doctorsById: displayDoctorsById,
    toursById: displayToursById,
    availableDoctors,
    getTourNameForDate,
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
