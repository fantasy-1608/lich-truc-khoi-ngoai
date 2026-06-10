import React, { useState, useRef } from 'react';
import { getNextMonthDate } from '../../utils/date';
import {
  Tour,
  SelectedDoctor,
  ResetPopoverState,
  ScheduleCalendarDay,
  Doctor,
  HolidayScheduleData,
  ScheduleSnapshotEntry,
  ShiftRequest,
  ShiftRequestDraft,
  ShiftRequestStatus,
} from '../../types';
import { useCalendarGrid } from '../../hooks/useCalendarGrid';
import ScheduleHeader from './ScheduleHeader';
import ScheduleDayCell from './ScheduleDayCell';
import ReplaceDoctorPopup from './ReplaceDoctorPopup';
import ResetPopover from './ResetPopover';
import { exportScheduleToPDF } from '../../utils/export';
import ShiftRequestModal from './ShiftRequestModal';
import ShiftRequestsPanel from './ShiftRequestsPanel';
import DayShiftRequestsModal from './DayShiftRequestsModal';

interface ScheduleViewProps {
  tours: Tour[];
  tourOrder: string[];
  tourOverrides: Record<string, string>;
  doctorOverrides: Record<string, string[]>;
  scheduleSnapshots: Record<string, ScheduleSnapshotEntry>;
  allDoctors: Doctor[];
  doctorsById: Record<string, Doctor>;
  toursById: Record<string, Tour>;
  getDoctorsForDate: (date: Date) => string[] | undefined;
  rotationStartDate: string | null;
  onSwapTours: (date1: Date, date2: Date) => void;
  onSwapDoctors: (
    selection1: { date: Date; doctorIndex: number },
    selection2: { date: Date; doctorIndex: number },
  ) => void;
  onReplaceDoctor: (selection: { date: Date; doctorIndex: number }, newDoctorName: string) => void;
  onResetOverrides: (date: Date) => void;
  onViewDateChange?: (date: Date) => void;
  holidaySchedule?: HolidayScheduleData;
  canManageShiftRequests: boolean;
  shiftRequests: ShiftRequest[];
  shiftRequestsLoading: boolean;
  pendingRequestCountsByDate: Record<string, number>;
  onSubmitShiftRequest: (draft: ShiftRequestDraft) => Promise<void>;
  onUpdateShiftRequestReview: (
    id: string,
    status: ShiftRequestStatus,
    reviewNote: string,
  ) => Promise<void>;
}

const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateString = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const ScheduleView: React.FC<ScheduleViewProps> = (props) => {
  const {
    tourOrder,
    tourOverrides,
    doctorOverrides,
    scheduleSnapshots,
    onSwapTours,
    onSwapDoctors,
    allDoctors,
    onReplaceDoctor,
    onResetOverrides,
    doctorsById,
    toursById,
    getDoctorsForDate,
    rotationStartDate,
    onViewDateChange,
    holidaySchedule,
    canManageShiftRequests,
    shiftRequests,
    shiftRequestsLoading,
    pendingRequestCountsByDate,
    onSubmitShiftRequest,
    onUpdateShiftRequestReview,
  } = props;

  const isHolidayDate = (date: Date): boolean => {
    if (!holidaySchedule?.startDate || !holidaySchedule?.endDate) return false;
    const start = new Date(holidaySchedule.startDate);
    const end = new Date(holidaySchedule.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const check = new Date(date);
    check.setHours(0, 0, 0, 0);
    return check >= start && check <= end;
  };

  const [currentDate, setCurrentDate] = useState(getNextMonthDate());
  const [selectedDoctor, setSelectedDoctor] = useState<SelectedDoctor | null>(null);
  const [selectedTourDate, setSelectedTourDate] = useState<Date | null>(null);
  const [resetPopover, setResetPopover] = useState<ResetPopoverState | null>(null);
  const [requestDay, setRequestDay] = useState<ScheduleCalendarDay | null>(null);
  const [requestsDate, setRequestsDate] = useState<string | null>(null);

  const calendarRef = useRef<HTMLDivElement>(null);

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(newDate);
    onViewDateChange?.(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
    onViewDateChange?.(newDate);
  };

  const calendarGrid = useCalendarGrid(
    currentDate,
    doctorsById,
    toursById,
    tourOrder,
    doctorOverrides,
    tourOverrides,
    getDoctorsForDate,
    rotationStartDate,
    scheduleSnapshots,
  );

  const handleTourClick = (day: ScheduleCalendarDay) => {
    if (!day.doctors) return;
    setSelectedDoctor(null);

    if (!selectedTourDate) {
      setSelectedTourDate(day.date);
    } else {
      if (selectedTourDate.getTime() === day.date.getTime()) {
        setSelectedTourDate(null);
      } else {
        onSwapTours(selectedTourDate, day.date);
        setSelectedTourDate(null);
      }
    }
  };

  const handleDoctorClick = (day: ScheduleCalendarDay, doctorIndex: number, doctorName: string) => {
    if (!day.doctors) return;
    setSelectedTourDate(null);

    const currentSelection = { date: day.date, doctorIndex, doctorName };

    if (!selectedDoctor) {
      setSelectedDoctor(currentSelection);
    } else {
      if (
        selectedDoctor.date.getTime() === day.date.getTime() &&
        selectedDoctor.doctorIndex === doctorIndex
      ) {
        setSelectedDoctor(null);
      } else {
        onSwapDoctors(
          { date: selectedDoctor.date, doctorIndex: selectedDoctor.doctorIndex },
          { date: day.date, doctorIndex },
        );
        setSelectedDoctor(null);
      }
    }
  };

  const handleReplaceClick = (newDoctorName: string) => {
    if (selectedDoctor) {
      onReplaceDoctor(
        { date: selectedDoctor.date, doctorIndex: selectedDoctor.doctorIndex },
        newDoctorName,
      );
      setSelectedDoctor(null);
    }
  };

  const cancelSelection = () => {
    setSelectedDoctor(null);
    setSelectedTourDate(null);
  };

  const handleResetIconClick = (e: React.MouseEvent, date: Date) => {
    e.stopPropagation();
    if (resetPopover?.target === e.currentTarget) {
      setResetPopover(null);
    } else {
      setResetPopover({ date, target: e.currentTarget as HTMLElement });
    }
  };

  const confirmReset = () => {
    if (resetPopover) {
      onResetOverrides(resetPopover.date);
      setResetPopover(null);
    }
  };

  const handleRequestClick = (day: ScheduleCalendarDay) => {
    if (!day.doctors) return;
    setSelectedDoctor(null);
    setSelectedTourDate(null);
    setRequestDay(day);
  };

  const handleViewRequestsClick = (day: ScheduleCalendarDay) => {
    if (!canManageShiftRequests) return;
    setRequestsDate(getDateString(day.date));
  };

  const handleGoToRequestDate = (dateString: string) => {
    const nextDate = parseDateString(dateString);
    const monthDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
    setCurrentDate(monthDate);
    onViewDateChange?.(monthDate);
  };

  const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
  const currentMonthDays = calendarGrid.filter((day) => day.isCurrentMonth);

  return (
    <>
      <div className="glass-card rounded-3xl p-6 sm:p-8 mt-32 sm:mt-20">
        <ScheduleHeader
          currentDate={currentDate}
          selectedDoctor={selectedDoctor}
          selectedShiftDate={selectedTourDate}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onCancelSelection={cancelSelection}
          onExportPDF={async () => exportScheduleToPDF(calendarGrid, currentDate)}
        />

        <div
          ref={calendarRef}
          className="hidden sm:block bg-white/50 dark:bg-slate-800/50 rounded-2xl p-4 shadow-inner overflow-x-auto"
        >
          <div className="min-w-[720px] sm:min-w-0">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center font-bold text-sm text-indigo-900/70 dark:text-indigo-100/70 py-2 uppercase tracking-wider"
                >
                  <span>{day}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarGrid.map((day, index) => (
                <ScheduleDayCell
                  key={index}
                  day={day}
                  selectedDoctor={selectedDoctor}
                  selectedTourDate={selectedTourDate}
                  onTourClick={handleTourClick}
                  onDoctorClick={handleDoctorClick}
                  onResetIconClick={handleResetIconClick}
                  onRequestClick={handleRequestClick}
                  onViewRequestsClick={handleViewRequestsClick}
                  pendingRequestCount={pendingRequestCountsByDate[getDateString(day.date)] || 0}
                  canManageRequests={canManageShiftRequests}
                  isHoliday={isHolidayDate(day.date)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="sm:hidden mt-4 space-y-3">
          {currentMonthDays.map((day, index) => (
            <ScheduleDayCell
              key={index}
              day={day}
              selectedDoctor={selectedDoctor}
              selectedTourDate={selectedTourDate}
              onTourClick={handleTourClick}
              onDoctorClick={handleDoctorClick}
              onResetIconClick={handleResetIconClick}
              onRequestClick={handleRequestClick}
              onViewRequestsClick={handleViewRequestsClick}
              pendingRequestCount={pendingRequestCountsByDate[getDateString(day.date)] || 0}
              canManageRequests={canManageShiftRequests}
              isHoliday={isHolidayDate(day.date)}
              variant="list"
            />
          ))}
        </div>

        <ShiftRequestsPanel
          canManage={canManageShiftRequests}
          isLoading={shiftRequestsLoading}
          requests={shiftRequests}
          onGoToDate={handleGoToRequestDate}
          onUpdateReview={onUpdateShiftRequestReview}
        />
      </div>

      {resetPopover && (
        <ResetPopover
          popoverState={resetPopover}
          onConfirm={confirmReset}
          onCancel={() => setResetPopover(null)}
        />
      )}

      {selectedDoctor && (
        <ReplaceDoctorPopup
          allDoctors={allDoctors}
          selectedDoctor={selectedDoctor}
          onReplaceClick={handleReplaceClick}
          onClose={cancelSelection}
        />
      )}

      {requestDay && requestDay.doctors && (
        <ShiftRequestModal
          date={requestDay.date}
          doctorsOnDate={requestDay.doctors}
          allDoctors={allDoctors}
          onClose={() => setRequestDay(null)}
          onSubmit={onSubmitShiftRequest}
        />
      )}

      {requestsDate && (
        <DayShiftRequestsModal
          date={requestsDate}
          requests={shiftRequests.filter(
            (request) =>
              request.date === requestsDate &&
              (request.status === 'pending' || request.status === 'in_review'),
          )}
          onClose={() => setRequestsDate(null)}
          onUpdateReview={onUpdateShiftRequestReview}
        />
      )}
    </>
  );
};

export default ScheduleView;
