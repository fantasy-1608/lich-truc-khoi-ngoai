import React, { useState } from 'react';
import { SelectedDoctor } from '../../types';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { CalendarIcon } from '../icons/CalendarIcon';
import { FatigueAlertIcon } from '../icons/FatigueAlertIcon';

interface ScheduleHeaderProps {
  currentDate: Date;
  selectedDoctor: SelectedDoctor | null;
  selectedShiftDate: Date | null;
  doctorQuery: string;
  doctorNames: string[];
  postDutyWarningCount: number;
  fatigueWarningCount: number;
  onDoctorQueryChange: (value: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onCancelSelection: () => void;
  onOpenStats: () => void;
  onExportPDF: () => Promise<void>;
  onExportICS: () => void;
  myDoctorName?: string | null;
  onOpenMySchedule?: () => void;
  onOpenSafetyChecker?: () => void;
}

const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  currentDate,
  selectedDoctor,
  selectedShiftDate,
  doctorQuery,
  doctorNames,
  postDutyWarningCount,
  fatigueWarningCount,
  onDoctorQueryChange,
  onPrevMonth,
  onNextMonth,
  onCancelSelection,
  onOpenStats,
  onExportPDF,
  onExportICS,
  myDoctorName,
  onOpenMySchedule,
  onOpenSafetyChecker,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handlePDFExport = async () => {
    setIsExporting(true);
    try {
      await onExportPDF();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="schedule-command-bar" aria-label="Điều khiển lịch tháng">
      <div className="month-controller">
        <button
          type="button"
          onClick={onPrevMonth}
          className="command-icon"
          aria-label="Tháng trước"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h2 className="month-title">
          Tháng {currentDate.getMonth() + 1}, {currentDate.getFullYear()}
        </h2>
        <button type="button" onClick={onNextMonth} className="command-icon" aria-label="Tháng sau">
          <ArrowRightIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="doctor-search-group flex items-center gap-1.5">
        <label className="doctor-search">
          <span className="sr-only">Tìm bác sĩ trong lịch tháng</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={doctorQuery}
            onChange={(event) => onDoctorQueryChange(event.target.value)}
            list="schedule-doctor-names"
            placeholder="Tìm bác sĩ trong lịch tháng…"
          />
          <datalist id="schedule-doctor-names">
            {doctorNames.map((name) => (
              <option value={name} key={name} />
            ))}
          </datalist>
        </label>
        {doctorQuery && (
          <button
            type="button"
            onClick={() => onDoctorQueryChange('')}
            className="px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs shrink-0 flex items-center gap-1"
            title="Xóa tiêu điểm, trở lại xem toàn bộ lịch"
            aria-label="Trở lại xem toàn bộ lịch"
          >
            <span>✕</span>
            <span className="hidden sm:inline">Trở lại</span>
          </button>
        )}
      </div>

      {(postDutyWarningCount > 0 || fatigueWarningCount > 0) && (
        <div
          className={`warning-summary ${onOpenSafetyChecker ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
          aria-label="Tổng hợp cảnh báo"
          role={onOpenSafetyChecker ? 'button' : undefined}
          tabIndex={onOpenSafetyChecker ? 0 : undefined}
          onClick={onOpenSafetyChecker}
          onKeyDown={(e) => {
            if (onOpenSafetyChecker && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onOpenSafetyChecker();
            }
          }}
          title={onOpenSafetyChecker ? 'Nhấp để mở Trợ lý An toàn Nghỉ ngơi' : undefined}
        >
          {postDutyWarningCount > 0 && (
            <span className="warning-counter is-critical">
              <FatigueAlertIcon className="h-4 w-4" />
              <strong>{postDutyWarningCount}</strong>
              <span>Ra trực</span>
            </span>
          )}
          {fatigueWarningCount > 0 && (
            <span className="warning-counter is-warning">
              <FatigueAlertIcon className="h-4 w-4" />
              <strong>{fatigueWarningCount}</strong>
              <span>Mới ra trực</span>
            </span>
          )}
        </div>
      )}

      {postDutyWarningCount === 0 && fatigueWarningCount === 0 && onOpenSafetyChecker && (
        <button
          type="button"
          onClick={onOpenSafetyChecker}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors shadow-xs"
          title="Nhấp để xem báo cáo an toàn nghỉ ngơi"
        >
          <span>🛡️</span>
          <span className="hidden sm:inline">An toàn 100%</span>
        </button>
      )}

      <div className="command-actions">
        {onOpenMySchedule && (
          <button
            type="button"
            onClick={onOpenMySchedule}
            className="my-schedule-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-teal-600/40 bg-teal-50 text-teal-900 dark:bg-teal-950/60 dark:border-teal-600/60 dark:text-teal-200 font-extrabold text-xs sm:text-sm hover:bg-teal-100 dark:hover:bg-teal-900/80 transition-colors shadow-xs"
            aria-label="Mở Lịch của tôi"
            title="Xem lịch trực cá nhân của tôi"
          >
            <span className="text-sm">👤</span>
            <span className="max-w-[120px] truncate">
              {myDoctorName ? myDoctorName : 'Lịch của tôi'}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={onOpenStats}
          className="command-icon"
          aria-label="Xem thống kê"
          title="Xem thống kê"
        >
          <ChartBarIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onExportICS}
          className="command-icon"
          aria-label="Lưu vào lịch điện thoại"
          title="Lưu vào lịch điện thoại (.ics)"
        >
          <CalendarIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handlePDFExport}
          disabled={isExporting}
          className="command-icon"
          aria-label="Xuất PDF"
          title="Xuất PDF"
        >
          {isExporting ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <DownloadIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {(selectedDoctor || selectedShiftDate) && (
        <div className="selection-status">
          <span>
            {selectedDoctor ? (
              <>
                Đã chọn <strong>{selectedDoctor.doctorName}</strong>
              </>
            ) : (
              <>
                Đã chọn tua ngày <strong>{selectedShiftDate?.toLocaleDateString('vi-VN')}</strong>
              </>
            )}
          </span>
          <button type="button" onClick={onCancelSelection}>
            Hủy chọn
          </button>
        </div>
      )}
    </section>
  );
};

export default ScheduleHeader;
