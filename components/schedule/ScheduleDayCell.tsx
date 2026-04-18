import React, { memo } from 'react';
import { ScheduleCalendarDay, SelectedDoctor } from '../../types';
import { RefreshIcon } from '../icons/RefreshIcon';
import { START_DATE } from '../../constants';

interface ScheduleDayCellProps {
  day: ScheduleCalendarDay;
  selectedDoctor: SelectedDoctor | null;
  selectedTourDate: Date | null;
  onTourClick: (day: ScheduleCalendarDay) => void;
  onDoctorClick: (day: ScheduleCalendarDay, doctorIndex: number, doctorName: string) => void;
  onResetIconClick: (e: React.MouseEvent, date: Date) => void;
  isHoliday?: boolean;
}

const ScheduleDayCell: React.FC<ScheduleDayCellProps> = ({
  day,
  selectedDoctor,
  selectedTourDate,
  onTourClick,
  onDoctorClick,
  onResetIconClick,
  isHoliday = false,
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

  return (
    <div
      className={`
                relative p-2 rounded-xl border min-h-[130px] sm:min-h-[150px] transition-all duration-300 ease-out group
                ${day.isCurrentMonth
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
      <div className="flex items-center justify-end mb-2">
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
              <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isSelectedTour
                ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700'
                : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/50 group-hover/tour:bg-indigo-100 dark:group-hover/tour:bg-indigo-900/50'
                }`}>
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
                                            ${isSelected
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
