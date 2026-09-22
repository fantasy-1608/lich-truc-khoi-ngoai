import React, { memo, useState } from 'react';
import { ScheduleCalendarDay, SelectedDoctor } from '../../types';
import { StaffChangeIcon } from '../icons/StaffChangeIcon';
import { START_DATE } from '../../constants';
import { PlusIcon } from '../icons/PlusIcon';
import { FatigueAlertIcon } from '../icons/FatigueAlertIcon';

interface ScheduleDayCellProps {
  day: ScheduleCalendarDay;
  selectedDoctor: SelectedDoctor | null;
  selectedTourDate: Date | null;
  onTourClick: (day: ScheduleCalendarDay) => void;
  onDoctorClick: (day: ScheduleCalendarDay, doctorIndex: number, doctorName: string) => void;
  onAddDoctorClick: (day: ScheduleCalendarDay) => void;
  onResetIconClick: (e: React.MouseEvent, date: Date) => void;
  onRequestClick: (day: ScheduleCalendarDay) => void;
  onViewRequestsClick: (day: ScheduleCalendarDay) => void;
  pendingRequestCount?: number;
  canManageRequests?: boolean;
  showAddDoctorShortcut?: boolean;
  isHoliday?: boolean;
  variant?: 'grid' | 'list';
  hoveredDoctor?: string | null;
  onHoverDoctor?: (doctorName: string | null) => void;
}

const ScheduleDayCell: React.FC<ScheduleDayCellProps> = ({
  day,
  selectedDoctor,
  selectedTourDate,
  onTourClick,
  onDoctorClick,
  onAddDoctorClick,
  onResetIconClick,
  onRequestClick,
  onViewRequestsClick,
  pendingRequestCount = 0,
  canManageRequests = false,
  showAddDoctorShortcut = false,
  isHoliday = false,
  variant = 'grid',
  hoveredDoctor = null,
  onHoverDoctor = () => {},
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isBeforeStartDate = day.date.getTime() < START_DATE.getTime();
  const isSelectedTour = selectedTourDate?.getTime() === day.date.getTime();
  const hasTopBadge = day.isModified || isHoliday;
  const hasPostDutyWarning = day.postDutyWarningDoctors.length > 0;
  const hasFatigueWarning = day.fatigueWarningDoctors.some(
    (doctor) => !day.postDutyWarningDoctors.includes(doctor),
  );
  const hasRecoveryWarning = hasPostDutyWarning || hasFatigueWarning;
  const isDoctorActiveHere = Boolean(hoveredDoctor && day.doctors?.includes(hoveredDoctor));
  const dateLabel = day.date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  const getDoctorWarning = (doctor: string) => {
    if (day.postDutyWarningDoctors.includes(doctor)) {
      return {
        label: 'Ra trực',
        title: `${doctor} cũng trực ngày hôm trước và đang trong ngày ra trực.`,
        badgeClass:
          'border-rose-400 bg-rose-100 text-rose-950 font-bold dark:border-rose-500/70 dark:bg-rose-950 dark:text-rose-200',
        rowClass:
          'border-rose-400 bg-rose-50/90 text-rose-950 font-semibold dark:border-rose-600/70 dark:bg-rose-950/60 dark:text-rose-100',
      };
    }

    if (day.fatigueWarningDoctors.includes(doctor)) {
      return {
        label: 'Mới ra trực',
        title: `${doctor} trực cách đây 2 ngày và mới có 1 ngày ra trực. Cân nhắc bố trí thêm thời gian nghỉ.`,
        badgeClass:
          'border-amber-400 bg-amber-100 text-amber-950 font-bold dark:border-amber-500/70 dark:bg-amber-950 dark:text-amber-200',
        rowClass:
          'border-amber-400 bg-amber-50/90 text-amber-950 font-semibold dark:border-amber-600/70 dark:bg-amber-950/60 dark:text-amber-100',
      };
    }

    return null;
  };

  const getDoctorRowClass = (doctor: string, isSelected: boolean, defaultClass: string): string => {
    if (hoveredDoctor === doctor) {
      return 'border-blue-600 bg-blue-600 text-white shadow-md ring-2 ring-blue-500/40 dark:border-blue-400 dark:bg-blue-600 dark:text-white dark:ring-blue-400/50';
    }
    if (hoveredDoctor) {
      return `${defaultClass} opacity-20 blur-[0.2px]`;
    }
    if (isSelected) {
      return 'border-emerald-500 bg-emerald-100 text-emerald-950 shadow-sm ring-2 ring-emerald-500/30 font-semibold dark:border-emerald-400 dark:bg-emerald-950/80 dark:text-emerald-200 dark:ring-emerald-400/30';
    }
    return getDoctorWarning(doctor)?.rowClass || defaultClass;
  };

  const dateKey = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;

  if (variant === 'list') {
    if (!day.isCurrentMonth || isBeforeStartDate || !day.doctors) return null;

    return (
      <article
        data-date={dateKey}
        className={`
          rounded-xl border bg-white/90 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/70 p-3 shadow-sm
          ${day.isToday ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : ''}
          ${isHoliday ? 'ring-2 ring-rose-400 ring-offset-1' : ''}
          ${hasPostDutyWarning ? 'border-rose-300 dark:border-rose-700' : hasFatigueWarning ? 'border-amber-300 dark:border-amber-700' : ''}
          ${isDoctorActiveHere ? 'border-blue-400 shadow-md ring-2 ring-blue-500/20 dark:border-blue-500' : ''}
          ${hoveredDoctor && !isDoctorActiveHere ? 'opacity-50' : ''}
        `}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="min-w-0 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Thu gọn' : 'Mở chi tiết'} ${dateLabel}`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[15px] font-bold text-slate-900 dark:text-white">
                {dateLabel}
              </span>
              {day.isToday && (
                <span className="shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
                  Hôm nay
                </span>
              )}
              {isHoliday && (
                <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
                  Lễ
                </span>
              )}
              {hasRecoveryWarning && (
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${hasPostDutyWarning ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-200' : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200'}`}
                >
                  <FatigueAlertIcon className="h-3 w-3" />
                  {hasPostDutyWarning ? 'Có BS ra trực' : 'Trực lại quá sớm'}
                </span>
              )}
            </span>

            <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span
                className={`shrink-0 rounded-md border px-2 py-0.5 font-bold ${
                  isSelectedTour
                    ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500 dark:text-white'
                    : 'border-indigo-300 bg-indigo-100/90 text-indigo-950 dark:border-indigo-500/70 dark:bg-indigo-950 dark:text-indigo-200'
                }`}
              >
                Tua {day.tourName}
              </span>
              <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                {day.doctors.map((doctor, index) => `${index + 1} ${doctor}`).join(' · ')}
              </span>
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-1.5">
            {showAddDoctorShortcut && (
              <button
                type="button"
                onClick={() => onAddDoctorClick(day)}
                className="grid h-9 min-w-9 place-items-center rounded-full border border-teal-300 bg-teal-50 px-2 text-xs font-bold text-teal-800 transition-colors hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
                aria-label={`Thêm bác sĩ trực cho ngày ${day.date.getDate()}`}
              >
                BS
              </button>
            )}
            {day.isModified && (
              <button
                className="reset-override-button grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-amber-600 transition-colors hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                aria-label={`Khôi phục lịch gốc cho ngày ${day.date.getDate()}`}
                title="Lịch đã được thay đổi. Nhấp để tùy chỉnh."
                onClick={(e) => onResetIconClick(e, day.date)}
              >
                <StaffChangeIcon className="h-4 w-4" />
                <span className="reset-override-label sr-only">Đã chỉnh</span>
              </button>
            )}
            {pendingRequestCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (canManageRequests) onViewRequestsClick(day);
                }}
                className={`grid h-9 min-w-9 place-items-center rounded-full border px-2 text-xs font-bold ${
                  canManageRequests
                    ? 'border-amber-500 bg-amber-500 text-white'
                    : 'border-amber-200 bg-amber-100 text-amber-700'
                }`}
                aria-label={
                  canManageRequests
                    ? `Xem ${pendingRequestCount} yêu cầu chờ cho ngày ${day.date.getDate()}`
                    : `Có ${pendingRequestCount} yêu cầu chờ cho ngày ${day.date.getDate()}. Mở khóa để xem chi tiết.`
                }
              >
                {pendingRequestCount}
              </button>
            )}
            <button
              type="button"
              onClick={() => onRequestClick(day)}
              className="grid h-9 w-9 place-items-center rounded-full border border-emerald-300 bg-emerald-50 text-emerald-800 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
              aria-label={`Gửi yêu cầu trực cho ngày ${day.date.getDate()}`}
              title="Gửi yêu cầu đổi/nghỉ trực"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
            <div className="mb-2 flex justify-center">
              <button
                type="button"
                onClick={() => onTourClick(day)}
                className={`inline-flex items-center justify-center rounded-md border px-3 py-1 text-xs sm:text-sm font-extrabold shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isSelectedTour
                    ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500 dark:text-white'
                    : 'border-indigo-300 bg-indigo-100/90 text-indigo-950 hover:bg-indigo-200 hover:border-indigo-400 dark:border-indigo-500/70 dark:bg-indigo-950 dark:text-indigo-200 dark:hover:bg-indigo-900'
                }`}
                aria-label={`Tua ${day.tourName}. Nhấn để chọn hoán đổi cả tua`}
              >
                Tua {day.tourName}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2" aria-label="Danh sách bác sĩ trực">
              {day.doctors.map((doctor, docIndex) => {
                const isSelected =
                  selectedDoctor?.date.getTime() === day.date.getTime() &&
                  selectedDoctor.doctorIndex === docIndex;
                const doctorWarning = getDoctorWarning(doctor);
                return (
                  <button
                    key={docIndex}
                    type="button"
                    onClick={() => onDoctorClick(day, docIndex, doctor)}
                    onMouseEnter={() => onHoverDoctor(doctor)}
                    onMouseLeave={() => onHoverDoctor(null)}
                    onFocus={() => onHoverDoctor(doctor)}
                    onBlur={() => onHoverDoctor(null)}
                    className={`relative min-h-10 rounded-md border py-2 pl-8 pr-2 text-left text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500 ${getDoctorRowClass(doctor, isSelected, 'border-slate-300 bg-white text-slate-900 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100')}`}
                    data-doctor-focused={hoveredDoctor === doctor ? 'true' : undefined}
                    aria-label={`${doctor}, bác sĩ số ${docIndex + 1}${doctorWarning ? `, cảnh báo ${doctorWarning.label.toLocaleLowerCase('vi-VN')}` : ''}. Nhấn để chọn hoán đổi`}
                  >
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 dark:text-slate-400">
                      {docIndex + 1}
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="block min-w-0 flex-1 truncate font-semibold text-slate-900 dark:text-slate-100">{doctor}</span>
                      {doctorWarning && (
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs font-bold ${doctorWarning.badgeClass}`}
                          title={doctorWarning.title}
                        >
                          <FatigueAlertIcon className="h-3 w-3" />
                          {doctorWarning.label}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {pendingRequestCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (canManageRequests) onViewRequestsClick(day);
                }}
                className={`min-h-8 px-3 rounded-full border text-xs font-bold ${
                  canManageRequests
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-amber-100 border-amber-200 text-amber-700'
                }`}
                aria-label={
                  canManageRequests
                    ? `Xem ${pendingRequestCount} yêu cầu chờ cho ngày ${day.date.getDate()}`
                    : `Có ${pendingRequestCount} yêu cầu chờ cho ngày ${day.date.getDate()}. Mở khóa để xem chi tiết.`
                }
              >
                {pendingRequestCount} yêu cầu
              </button>
            )}
          </div>
        )}
      </article>
    );
  }

  return (
    <div
      className={`
                relative p-2 rounded-xl border min-h-[130px] sm:min-h-[150px] transition-all duration-300 ease-out group
                ${
                  day.isCurrentMonth
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 hover:shadow-md hover:border-teal-400 dark:hover:border-teal-500'
                    : 'bg-slate-100/60 dark:bg-slate-950/60 border-transparent'
                }
                ${day.isWeekend && day.isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-900/50' : ''}
                ${day.isToday ? 'ring-2 ring-teal-500 ring-offset-2 dark:ring-offset-slate-900 z-10' : ''}
                ${isSelectedTour ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 z-10' : ''}
                ${isHoliday ? 'ring-2 ring-rose-400 ring-offset-1 z-10' : ''}
                ${isDoctorActiveHere ? 'border-teal-500 shadow-md ring-2 ring-teal-500/20 dark:border-teal-400 z-10' : ''}
                ${hoveredDoctor && !isDoctorActiveHere ? 'opacity-50' : ''}
            `}
      role="gridcell"
      aria-label={dateLabel}
      aria-selected={isSelectedTour}
      aria-current={day.isToday ? 'date' : undefined}
      data-date={dateKey}
      data-current-month={day.isCurrentMonth ? 'true' : 'false'}
      data-weekend={day.isWeekend ? 'true' : 'false'}
      data-sunday={day.date.getDay() === 0 ? 'true' : 'false'}
      data-saturday={day.date.getDay() === 6 ? 'true' : 'false'}
      data-today={day.isToday ? 'true' : 'false'}
      data-doctor-active={isDoctorActiveHere ? 'true' : 'false'}
    >
      {day.isModified && (
        <button
          className="reset-override-button absolute top-2 left-2 p-1 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors z-20 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
          aria-label={`Khôi phục lịch gốc cho ngày ${day.date.getDate()}`}
          title="Lịch đã được thay đổi. Nhấp để tùy chỉnh."
          onClick={(e) => onResetIconClick(e, day.date)}
        >
          <StaffChangeIcon className="h-3.5 w-3.5" />
          <span className="reset-override-label sr-only">Đã chỉnh</span>
        </button>
      )}
      {/* Holiday indicator */}
      {isHoliday && (
        <span className="absolute top-1.5 left-1.5 text-xs px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-full font-medium z-20">
          🎊 Lễ
        </span>
      )}
      <div className="flex items-start justify-between gap-1 mb-2">
        {day.isCurrentMonth && !isBeforeStartDate && day.doctors ? (
          <div className={`flex min-h-7 items-center gap-1 ${hasTopBadge ? 'ml-8' : ''}`}>
            {showAddDoctorShortcut && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddDoctorClick(day);
                }}
                className="
                  inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-1.5 text-indigo-700
                  transition-all duration-150 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1
                  dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/35
                  sm:-translate-y-0.5 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:focus-visible:translate-y-0 sm:focus-visible:opacity-100
                "
                aria-label={`Thêm bác sĩ trực cho ngày ${day.date.getDate()}`}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                <span className="hidden xl:inline text-xs font-semibold">BS</span>
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRequestClick(day);
              }}
              className={`
                inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 text-emerald-700
                hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1
                dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/35
                transition-all duration-150
                sm:-translate-y-0.5 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:focus-visible:translate-y-0 sm:focus-visible:opacity-100
                ${pendingRequestCount > 0 ? 'max-lg:opacity-100 max-lg:translate-y-0' : ''}
              `}
              aria-label={`Gửi yêu cầu trực cho ngày ${day.date.getDate()}`}
              title="Gửi yêu cầu đổi/nghỉ trực"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              <span className="hidden xl:inline text-xs font-semibold">Yêu cầu</span>
            </button>
            {pendingRequestCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (canManageRequests) {
                    onViewRequestsClick(day);
                  }
                }}
                className={`h-7 min-w-7 rounded-full border px-2 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ${
                  canManageRequests
                    ? 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600'
                    : 'bg-amber-100 border-amber-200 text-amber-700 cursor-default'
                }`}
                aria-label={
                  canManageRequests
                    ? `Xem ${pendingRequestCount} yêu cầu chờ cho ngày ${day.date.getDate()}`
                    : `Có ${pendingRequestCount} yêu cầu chờ cho ngày ${day.date.getDate()}. Mở khóa để xem chi tiết.`
                }
                title={
                  canManageRequests
                    ? 'Xem ai đã gửi yêu cầu trong ngày này'
                    : 'Mở khóa chỉnh sửa để xem ai đã gửi yêu cầu'
                }
              >
                {pendingRequestCount}
              </button>
            )}
          </div>
        ) : (
          <span aria-hidden="true" />
        )}
        <span
          className={`
            text-sm sm:text-base font-bold transition-colors rounded-full w-7 h-7 flex items-center justify-center
            ${day.isCurrentMonth ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-600 font-medium'}
            ${day.isToday ? 'bg-teal-600 text-white font-extrabold shadow-sm shadow-teal-500/30 dark:bg-teal-500 dark:text-slate-950' : ''}
          `}
        >
          {day.date.getDate()}
        </span>
      </div>

      <div className="space-y-1.5">
        {day.isCurrentMonth && !isBeforeStartDate && day.doctors ? (
          <>
            <div
              className="group/tour cursor-pointer my-1.5 flex justify-center"
              onClick={(e) => {
                e.stopPropagation();
                onTourClick(day);
              }}
              onKeyDown={(e) => handleKeyDown(e, () => onTourClick(day))}
              tabIndex={0}
              role="button"
              aria-label={`Tua ${day.tourName}. Nhấn để chọn hoán đổi cả tua`}
              title={`Tua ${day.tourName}. Click để chọn đổi cả tua.`}
            >
              <div
                className={`inline-flex max-w-full items-center justify-center px-3.5 py-1 rounded-md text-xs sm:text-sm font-extrabold tracking-wide border shadow-xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isSelectedTour
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-500/40 dark:bg-indigo-500 dark:border-indigo-400 dark:text-white'
                    : 'bg-indigo-100/90 border-indigo-300 text-indigo-950 group-hover/tour:bg-indigo-200 group-hover/tour:border-indigo-400 group-hover/tour:shadow-xs dark:bg-indigo-950 dark:border-indigo-500/70 dark:text-indigo-200 dark:group-hover/tour:bg-indigo-900 dark:group-hover/tour:border-indigo-400'
                }`}
              >
                <span className="truncate">Tua {day.tourName}</span>
              </div>
            </div>
            <div className="space-y-1" role="list" aria-label="Danh sách bác sĩ trực">
              {day.doctors.map((doctor, docIndex) => {
                const isSelected =
                  selectedDoctor?.date.getTime() === day.date.getTime() &&
                  selectedDoctor.doctorIndex === docIndex;
                const doctorWarning = getDoctorWarning(doctor);
                return (
                  <div
                    key={docIndex}
                    onClick={() => onDoctorClick(day, docIndex, doctor)}
                    onKeyDown={(e) => handleKeyDown(e, () => onDoctorClick(day, docIndex, doctor))}
                    onMouseEnter={() => onHoverDoctor(doctor)}
                    onMouseLeave={() => onHoverDoctor(null)}
                    onFocus={() => onHoverDoctor(doctor)}
                    onBlur={() => onHoverDoctor(null)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${doctor}, bác sĩ số ${docIndex + 1}${doctorWarning ? `, cảnh báo ${doctorWarning.label.toLocaleLowerCase('vi-VN')}` : ''}. Nhấn để chọn hoán đổi`}
                    aria-pressed={isSelected}
                    data-doctor-focused={hoveredDoctor === doctor ? 'true' : undefined}
                    className={`
                      relative pl-5 pr-1.5 py-1 rounded-md text-xs sm:text-sm cursor-pointer transition-all duration-150 border
                      focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1
                      ${getDoctorRowClass(
                        doctor,
                        isSelected,
                        'bg-white text-slate-900 border-slate-300 hover:border-teal-500 hover:bg-teal-50/60 shadow-xs dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:border-teal-400 dark:hover:bg-slate-700/80',
                      )}
                    `}
                    title={doctorWarning?.title || doctor}
                  >
                    <span
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 dark:text-slate-400"
                      aria-hidden="true"
                    >
                      {docIndex + 1}
                    </span>
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="min-w-0 flex-1 truncate font-semibold text-slate-900 dark:text-slate-100">{doctor}</span>
                      {doctorWarning && (
                        <span
                          className={`inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs font-bold ${doctorWarning.badgeClass}`}
                        >
                          <FatigueAlertIcon className="h-3 w-3" />
                          {doctorWarning.label}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : day.isCurrentMonth && isBeforeStartDate ? (
          <div className="text-slate-400/50 dark:text-slate-600 text-center mt-4 text-xs font-medium italic">
            Chưa có lịch
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default memo(ScheduleDayCell);
