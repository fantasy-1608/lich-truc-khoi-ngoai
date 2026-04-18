export interface Doctor {
  id: string;
  name: string;
  isCtch: boolean; // Thuộc khoa Chấn thương chỉnh hình
}

export interface Tour {
  id: string;
  doctorIds: string[];
}

export enum View {
  SCHEDULE = 'schedule',
  DEPARTMENT_SCHEDULE = 'department_schedule',
  HOLIDAY_SCHEDULE = 'holiday_schedule',
  SETTINGS = 'settings',
}

export type DepartmentRole = 'ungTruc' | 'pkdk' | 'pkdv';

export interface DepartmentAssignments {
  ungTruc: string[];
  pkdk: string[];
  pkdv: string[];
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export interface ScheduleCalendarDay extends CalendarDay {
  doctors: string[] | undefined;
  tourName: string | undefined;
  isModified: boolean;
}

export interface HolidayCalendarDay extends CalendarDay {
  doctors: string[];
  originalDoctors: string[]; // Từ lịch khối ngoại
  isModified: boolean;
}

export interface SelectedDoctor {
  date: Date;
  doctorIndex: number;
  doctorName: string;
}

export interface ResetPopoverState {
  date: Date;
  target: HTMLElement;
}

// Holiday Schedule Data
export interface HolidayScheduleData {
  startDate: string | null; // "2025-01-28"
  endDate: string | null; // "2025-02-02"
  holidayTourId?: string; // ID of the tour used for holiday rotation (5th tour)
  holidayInsertionIndex?: number; // Index to insert the holiday tour (0 to tourOrder.length)
  doctorOverrides: Record<string, string[]>; // Max 6 doctors per day
}

// Interface for importing/exporting data
export interface ImportData {
  doctors?: Doctor[];
  tours?: Tour[];
  tourOrder?: string[];
  tourOverrides?: Record<string, string>;
  doctorOverrides?: Record<string, string[]>;
  showPkdv?: boolean;
  departmentAssignments?: Record<string, Partial<DepartmentAssignments>>;
  holidaySchedule?: HolidayScheduleData;
}
