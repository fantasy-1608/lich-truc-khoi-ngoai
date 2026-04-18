import React, { useState, useCallback } from 'react';
import { HolidayScheduleData, Doctor, Tour } from '../../types';
import { useHolidayCalendarGrid } from '../../hooks/useHolidayCalendarGrid';
import { RefreshIcon } from '../icons/RefreshIcon';
import { XIcon } from '../icons/XIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { exportHolidayToPDF } from '../../utils/export';

// Helper to get date string in YYYY-MM-DD format using local time components
const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface HolidayScheduleViewProps {
  holidaySchedule: HolidayScheduleData;
  allDoctors: Doctor[];
  tours: Tour[];
  getDoctorsForDate: (date: Date) => string[] | undefined;
  onSetHolidayPeriod: (startDate: string | null, endDate: string | null) => void;
  onSetHolidayTour: (tourId: string | undefined) => void;
  onSetHolidayInsertionIndex: (index: number) => void;
  onUpdateHolidayDoctors: (dateStr: string, doctors: string[]) => void;
  onResetHolidayDay: (dateStr: string) => void;
}

const HolidayScheduleView: React.FC<HolidayScheduleViewProps> = ({
  holidaySchedule,
  allDoctors,
  tours,
  getDoctorsForDate,
  onSetHolidayPeriod,
  onSetHolidayTour,
  onSetHolidayInsertionIndex,
  onUpdateHolidayDoctors,
  onResetHolidayDay,
}) => {
  const [startDateInput, setStartDateInput] = useState(holidaySchedule.startDate || '');
  const [endDateInput, setEndDateInput] = useState(holidaySchedule.endDate || '');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const calendarGrid = useHolidayCalendarGrid(holidaySchedule, getDoctorsForDate);

  const handleApplyPeriod = useCallback(() => {
    if (startDateInput && endDateInput) {
      // Validate dates
      if (new Date(startDateInput) > new Date(endDateInput)) {
        alert('Lỗi: Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc!');
        return;
      }
      // Warn if period is too long
      const daysDiff = Math.floor(
        (new Date(endDateInput).getTime() - new Date(startDateInput).getTime()) /
        (1000 * 60 * 60 * 24),
      );
      if (daysDiff > 30) {
        const confirm = window.confirm(
          `Kỳ nghỉ lễ kéo dài ${daysDiff + 1} ngày. Bạn có chắc chắn muốn tiếp tục?`,
        );
        if (!confirm) return;
      }
      onSetHolidayPeriod(startDateInput, endDateInput);
    }
  }, [startDateInput, endDateInput, onSetHolidayPeriod]);

  const handleClearPeriod = useCallback(() => {
    setStartDateInput('');
    setEndDateInput('');
    onSetHolidayPeriod(null, null);
  }, [onSetHolidayPeriod]);

  const handleAddDoctor = useCallback(
    (dateStr: string, doctorName: string) => {
      const currentDoctors =
        holidaySchedule.doctorOverrides[dateStr] || getDoctorsForDate(new Date(dateStr)) || [];
      if (currentDoctors.length >= 6) return;
      if (currentDoctors.includes(doctorName)) return;
      onUpdateHolidayDoctors(dateStr, [...currentDoctors, doctorName]);
    },
    [holidaySchedule.doctorOverrides, getDoctorsForDate, onUpdateHolidayDoctors],
  );

  const handleRemoveDoctor = useCallback(
    (dateStr: string, doctorIndex: number) => {
      const currentDoctors =
        holidaySchedule.doctorOverrides[dateStr] || getDoctorsForDate(new Date(dateStr)) || [];
      const newDoctors = currentDoctors.filter((_, i) => i !== doctorIndex);
      onUpdateHolidayDoctors(dateStr, newDoctors);
    },
    [holidaySchedule.doctorOverrides, getDoctorsForDate, onUpdateHolidayDoctors],
  );

  const handleExportPDF = useCallback(async () => {
    if (!holidaySchedule.startDate || !holidaySchedule.endDate) return;
    try {
      await exportHolidayToPDF(calendarGrid, holidaySchedule.startDate, holidaySchedule.endDate);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [calendarGrid, holidaySchedule]);

  // Format date for display
  const formatDateDisplay = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Get day name
  const getDayName = (date: Date) => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[date.getDay()];
  };

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 mt-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>🎊</span>
            <span>Lịch Trực Lễ Tết</span>
          </h2>
          {holidaySchedule.startDate && holidaySchedule.endDate ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {formatDateDisplay(holidaySchedule.startDate)} →{' '}
              {formatDateDisplay(holidaySchedule.endDate)}
              <span className="ml-2 text-indigo-500">({calendarGrid.length} ngày)</span>
            </p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Chọn khoảng thời gian để phân công trực
            </p>
          )}
        </div>

        {/* Export button */}
        {calendarGrid.length > 0 && (
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl font-medium shadow-lg shadow-rose-500/25 transition-all"
          >
            <DownloadIcon className="h-4 w-4" />
            <span>Xuất PDF</span>
          </button>
        )}
      </div>

      {/* Date Range Picker */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800/80 dark:to-slate-800/60 rounded-2xl p-5 mb-6 border border-indigo-100 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
          <span>📅</span>
          <span>Chọn kỳ nghỉ lễ</span>
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Từ ngày
            </label>
            <input
              type="date"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Đến ngày
            </label>
            <input
              type="date"
              value={endDateInput}
              onChange={(e) => setEndDateInput(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyPeriod}
              disabled={!startDateInput || !endDateInput}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25 disabled:shadow-none"
            >
              Áp dụng
            </button>
            {holidaySchedule.startDate && (
              <button
                onClick={handleClearPeriod}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-all"
              >
                Xóa
              </button>
            )}
          </div>
        </div>

        {/* Holiday Tour Selection */}
        <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <span>🔄</span>
            <span>Cấu hình Tua trực lễ (5 tua)</span>
          </h4>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <select
              value={holidaySchedule.holidayTourId || ''}
              onChange={(e) => onSetHolidayTour(e.target.value || undefined)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm min-w-[200px]"
            >
              <option value="">-- Chọn tua lễ (Tua 5) --</option>
              <option value="reinforcement">Tua trực tăng cường</option>
              {tours.map((tour) => (
                <option key={tour.id} value={tour.id}>
                  {tour.id} ({tour.doctorIds.length} BS)
                </option>
              ))}
            </select>

            <select
              value={holidaySchedule.holidayInsertionIndex ?? tours.length}
              onChange={(e) => onSetHolidayInsertionIndex(Number(e.target.value))}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm min-w-[200px]"
            >
              <option value={0}>Vị trí đầu tiên (Trước Tua 1)</option>
              {tours.map((_, index) => (
                <option key={index + 1} value={index + 1}>
                  Sau Tua {tours[index]?.id} (Vị trí {index + 2})
                </option>
              ))}
            </select>

            <p className="text-xs text-slate-500 max-w-lg">
              Khi chọn tua lễ, hệ thống sẽ tự động xoay tua 5 ngày trong khoảng thời gian lễ đã
              chọn. Hết lễ sẽ tự động quay về quy trình 4 tua thông thường.
            </p>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {calendarGrid.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {calendarGrid.map((day) => {
            const dateStr = getDateString(day.date);
            const isSelected = selectedDay === dateStr;
            const dayName = getDayName(day.date);

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-lg shadow-indigo-500/20'
                  : day.isModified
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                    : day.isWeekend
                      ? 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-indigo-300'
                  }`}
              >
                {/* Day header */}
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-lg font-bold ${day.isToday
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : day.isWeekend
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-800 dark:text-slate-100'
                        }`}
                    >
                      {day.date.getDate()}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${day.isWeekend
                        ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                    >
                      {dayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {day.isModified && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onResetHolidayDay(dateStr);
                        }}
                        className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg transition-colors"
                        title="Reset về lịch gốc"
                      >
                        <RefreshIcon className="h-4 w-4 text-amber-600" />
                      </button>
                    )}
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {day.doctors.length}/6
                    </span>
                  </div>
                </div>

                {/* Doctor list */}
                <div className="space-y-1.5">
                  {day.doctors.map((doc, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        {i + 1}
                      </span>
                      <span className="truncate flex-1">{doc}</span>
                      {isSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveDoctor(dateStr, i);
                          }}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/50 rounded transition-colors"
                        >
                          <XIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add doctor dropdown - only when selected */}
                  {day.doctors.length < 6 && isSelected && (
                    <select
                      className="w-full mt-2 px-3 py-2 text-sm rounded-lg border border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddDoctor(dateStr, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      defaultValue=""
                    >
                      <option value="">+ Thêm bác sĩ...</option>
                      {allDoctors
                        .filter((d) => {
                          const normalizedName = d.name.trim().toLowerCase();
                          return !day.doctors.some(
                            (assignedName) => assignedName.trim().toLowerCase() === normalizedName,
                          );
                        })
                        .map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-2xl p-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Chưa có lịch trực lễ tết
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Chọn khoảng thời gian ở trên để bắt đầu phân công
          </p>
        </div>
      )}

      {/* Instructions */}
      {calendarGrid.length > 0 && (
        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
            💡 <strong>Hướng dẫn:</strong> Click vào ô ngày để thêm/xóa bác sĩ trực • Tối đa 6 bác
            sĩ/ngày •
            <span className="inline-flex items-center gap-1 ml-1">
              <span className="w-3 h-3 rounded-full bg-amber-400"></span> Đã chỉnh sửa
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

export default HolidayScheduleView;
