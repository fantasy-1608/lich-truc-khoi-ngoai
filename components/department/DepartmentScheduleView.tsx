import React, { useState, useMemo } from 'react';
import { getNextMonthDate } from '../../utils/date';
import { Doctor, DepartmentRole, DepartmentAssignments, HolidayScheduleData } from '../../types';
import { useDepartmentCalendarGrid } from '../../hooks/useDepartmentCalendarGrid';
import DepartmentHeader from './DepartmentHeader';
import DepartmentDayCell from './DepartmentDayCell';
import StatsModal from './StatsModal';
import AssignmentPopover from './AssignmentPopover';

import { exportDepartmentToPDF } from '../../utils/export';

// Helper to get date string in YYYY-MM-DD format using local time components
const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface DepartmentScheduleViewProps {
  allDoctors: Doctor[];
  showPkdv: boolean;
  departmentAssignments: Record<string, Partial<DepartmentAssignments>>;
  onUpdateDepartmentAssignments: (date: Date, role: DepartmentRole, doctors: string[]) => void;
  getDoctorsForDate: (date: Date) => string[] | undefined;
  holidaySchedule?: HolidayScheduleData;
}

interface EditingState {
  date: Date;
  role: DepartmentRole;
  target: HTMLElement;
}

const DepartmentScheduleView: React.FC<DepartmentScheduleViewProps> = (props) => {
  const {
    allDoctors,
    showPkdv,
    departmentAssignments,
    onUpdateDepartmentAssignments,
    getDoctorsForDate,
  } = props;

  // Helper to check if a date is within holiday period
  const isHolidayDate = (date: Date): boolean => {
    const hs = props.holidaySchedule;
    if (!hs?.startDate || !hs?.endDate) return false;
    const start = new Date(hs.startDate);
    const end = new Date(hs.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const check = new Date(date);
    check.setHours(0, 0, 0, 0);
    return check >= start && check <= end;
  };

  const [currentDate, setCurrentDate] = useState(getNextMonthDate());
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  const calendarGrid = useDepartmentCalendarGrid(currentDate);

  const ctchDoctors = useMemo(() => {
    return allDoctors.filter((doc) => doc.isCtch).sort((a, b) => a.name.localeCompare(b.name));
  }, [allDoctors]);

  // Removed unused doctorNames useMemo

  const handleOpenEditor = (e: React.MouseEvent, date: Date, role: DepartmentRole) => {
    setEditing({ date, role, target: e.currentTarget as HTMLElement });
  };

  const handlePopoverSave = (doctors: string[]) => {
    if (editing) {
      onUpdateDepartmentAssignments(editing.date, editing.role, doctors);
      setEditing(null);
    }
  };

  const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-lg shadow-lg mt-20">
      <DepartmentHeader
        currentDate={currentDate}
        onPrevMonth={() =>
          setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
        }
        onNextMonth={() =>
          setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
        }
        onOpenStats={() => setIsStatsModalOpen(true)}
        onExportPDF={async () =>
          exportDepartmentToPDF(
            calendarGrid,
            currentDate,
            departmentAssignments,
            getDoctorsForDate,
            showPkdv,
          )
        }
      />

      <div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center font-semibold text-sm text-slate-500 dark:text-slate-400 py-2 max-sm:hidden"
            >
              {day}
            </div>
          ))}
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center font-semibold text-sm text-slate-500 dark:text-slate-400 py-2 sm:hidden"
            >
              {day.charAt(0)}
            </div>
          ))}

          {calendarGrid.map((day, index) => (
            <DepartmentDayCell
              key={index}
              day={day}
              assignments={departmentAssignments[getDateString(day.date)]}
              onCallDoctors={getDoctorsForDate(day.date)}
              showPkdv={showPkdv}
              onOpenEditor={handleOpenEditor}
              isHoliday={isHolidayDate(day.date)}
            />
          ))}
        </div>
      </div>
      {isStatsModalOpen && (
        <StatsModal
          currentDate={currentDate}
          departmentAssignments={departmentAssignments}
          allDoctors={allDoctors.filter((d) => d.isCtch).map((d) => d.name)}
          getDoctorsForDate={getDoctorsForDate}
          onClose={() => setIsStatsModalOpen(false)}
        />
      )}
      {editing && (
        <AssignmentPopover
          editingState={editing}
          assignmentDoctors={ctchDoctors.map((d) => d.name)}
          getDoctorsForDate={getDoctorsForDate}
          departmentAssignments={departmentAssignments}
          onSave={handlePopoverSave}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
};

export default DepartmentScheduleView;
