import React, { memo } from 'react';
import { ScheduleCalendarDay, SelectedDoctor } from '../../types';
import { RefreshIcon } from '../icons/RefreshIcon';
import { START_DATE } from '../../constants';
import { PlusIcon } from '../icons/PlusIcon';

interface ScheduleDayCellProps {
  day: ScheduleCalendarDay;
  selectedDoctor: SelectedDoctor | null;
  selectedTourDate: Date | null;
  onTourClick: (day: ScheduleCalendarDay) => void;
  onDoctorClick: (day: ScheduleCalendarDay, doctorIndex: number, doctorName: string) => void;
  onResetIconClick: (e: React.MouseEvent, date: Date) => void;
  onRequestClick: (day: ScheduleCalendarDay) => void;
  onViewRequestsClick: (day: ScheduleCalendarDay) => void;
  pendingRequestCount?: number;
  canManageRequests?: boolean;
  isHoliday?: boolean;
  variant?: 'grid' | 'list';
}

const ScheduleDayCell: React.FC<ScheduleDayCellProps> = ({
  day,
  selectedDoctor,
  selectedTourDate,
  onTourClick,
  onDoctorClick,
  onResetIconClick,
  onRequestClick,
  onViewRequestsClick,
  pendingRequestCount = 0,
  canManageRequests = false,
  isHoliday = false,
  variant = 'grid',
}) => {
  const isBeforeStartDate = day.date.getTime() < START_DATE.getTime();
  const isSelectedTour = selectedTourDate?.getTime() === day.date.getTime();

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

  if (variant === 'list') {
    if (!day.isCurrentMonth || isBeforeStartDate || !day.doctors) return null;

    return (
      <article
        className={`
          rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 p-3 shadow-sm
          ${day.isToday ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : ''}
          ${isHoliday ? 'ring-2 ring-rose-400 ring-offset-1' : ''}
        `}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{dateLabel}</p>
            <button
              type="button"
              onClick={() => onTourClick(day)}
              className={`mt-1 inline-flex items-center px-2 py-1 rounded-md text-xs font-bold border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isSelectedTour
                  ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700'
                  : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/50'
              }`}
              aria-label={`Tua ${day.tourName}. Nhấn để chọn hoán đổi cả tua`}
            >
              Tua {day.tourName}
            </button>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onRequestClick(day)}
              className="inline-flex items-center gap-1 min-h-9 px-3 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-semibold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/35 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label={`Gửi yêu cầu trực cho ngày ${day.date.getDate()}`}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Yêu cầu
            </button>
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
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2" aria-label="Danh sách bác sĩ trực">
          {day.doctors.map((doctor, docIndex) => {
            const isSelected =
              selectedDoctor?.date.getTime() === day.date.getTime() &&
              selectedDoctor.doctorIndex === docIndex;
            return (
              <button
                key={docIndex}
                type="button"
                onClick={() => onDoctorClick(day, docIndex, doctor)}
                className={`relative min-h-10 pl-8 pr-2 py-2 rounded-lg text-left text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isSelected
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
                aria-label={`${doctor}, bác sĩ số ${docIndex + 1}. Nhấn để chọn hoán đổi`}
              >
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  {docIndex + 1}
                </span>
                <span className="block truncate font-medium">{doctor}</span>
              </button>
            );
          })}
        </div>
      </article>
    );
  }

  return (
    <div
      className={`
                relative p-2 rounded-xl border min-h-[130px] sm:min-h-[150px] transition-all duration-300 ease-out group
                ${
                  day.isCurrentMonth
                    ? 'bg-white/60 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800'
                    : 'bg-slate-50/30 dark:bg-slate-900/30 border-transparent'
                }
                ${day.isWeekend && day.isCurrentMonth ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}
                ${day.isToday ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 z-10' : ''}
                ${isSelectedTour ? 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-slate-900 z-10' : ''}
                ${isHoliday ? 'ring-2 ring-rose-400 ring-offset-1 z-10' : ''}
            `}
      role="gridcell"
      aria-label={dateLabel}
      aria-selected={isSelectedTour}
      aria-current={day.isToday ? 'date' : undefined}
    >
      {day.isModified && (
        <button
          className="absolute top-2 left-2 p-1 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors z-20 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
          aria-label={`Khôi phục lịch gốc cho ngày ${day.date.getDate()}`}
          title="Lịch đã được thay đổi. Nhấp để tùy chỉnh."
          onClick={(e) => onResetIconClick(e, day.date)}
        >
          <RefreshIcon className="h-3.5 w-3.5" />
        </button>
      )}
      {/* Holiday indicator */}
      {isHoliday && (
        <span className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-full font-medium z-20">
          🎊 Lễ
        </span>
      )}
      <div className="flex items-start justify-between gap-1 mb-2">
        {day.isCurrentMonth && !isBeforeStartDate && day.doctors ? (
          <div className="flex items-center gap-1 min-h-7">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRequestClick(day);
              }}
              className={`
                inline-flex items-center gap-1 min-h-7 px-1.5 sm:px-2 rounded-full border border-emerald-200 dark:border-emerald-800
                bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300
                hover:bg-emerald-100 dark:hover:bg-emerald-900/35 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1
                transition-all duration-150
                sm:opacity-0 sm:-translate-y-0.5 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:focus-visible:opacity-100 sm:focus-visible:translate-y-0
                ${pendingRequestCount > 0 ? 'max-lg:opacity-100 max-lg:translate-y-0' : ''}
              `}
              aria-label={`Gửi yêu cầu trực cho ngày ${day.date.getDate()}`}
              title="Gửi yêu cầu đổi/nghỉ trực"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              <span className="hidden lg:inline text-[11px] font-semibold">Yêu cầu</span>
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
                className={`min-h-7 px-2 rounded-full border text-[11px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ${
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
                {pendingRequestCount} yêu cầu
              </button>
            )}
          </div>
        ) : (
          <span aria-hidden="true" />
        )}
        <span
          className={`
                    text-xs sm:text-sm font-semibold transition-colors rounded-full w-7 h-7 flex items-center justify-center
                    ${day.isCurrentMonth ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600'}
                    ${day.isToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : ''}
                `}
        >
          {day.date.getDate()}
        </span>
      </div>

      <div className="space-y-1.5">
        {day.isCurrentMonth && !isBeforeStartDate && day.doctors ? (
          <>
            <div
              className="group/tour cursor-pointer mb-1"
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
                className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isSelectedTour
                    ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700'
                    : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/50 group-hover/tour:bg-indigo-100 dark:group-hover/tour:bg-indigo-900/50'
                }`}
              >
                Tua {day.tourName}
              </div>
            </div>
            <div className="space-y-1" role="list" aria-label="Danh sách bác sĩ trực">
              {day.doctors.map((doctor, docIndex) => {
                const isSelected =
                  selectedDoctor?.date.getTime() === day.date.getTime() &&
                  selectedDoctor.doctorIndex === docIndex;
                return (
                  <div
                    key={docIndex}
                    onClick={() => onDoctorClick(day, docIndex, doctor)}
                    onKeyDown={(e) => handleKeyDown(e, () => onDoctorClick(day, docIndex, doctor))}
                    tabIndex={0}
                    role="button"
                    aria-label={`${doctor}, bác sĩ số ${docIndex + 1}. Nhấn để chọn hoán đổi`}
                    aria-pressed={isSelected}
                    className={`
                                            relative pl-6 pr-2 py-1 rounded-lg text-xs sm:text-sm cursor-pointer transition-all duration-200 border
                                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1
                                            ${
                                              isSelected
                                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 shadow-sm'
                                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-sm'
                                            }
                                        `}
                    title={doctor}
                  >
                    <span
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-slate-500"
                      aria-hidden="true"
                    >
                      {docIndex + 1}
                    </span>
                    <span className="truncate block font-medium">{doctor}</span>
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
