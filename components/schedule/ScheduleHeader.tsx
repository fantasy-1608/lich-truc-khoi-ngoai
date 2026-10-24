import React, { useEffect, useRef, useState } from 'react';
import ScheduleCommandPalette from './ScheduleCommandPalette';
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
  onToday?: () => void;
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
  onToday,
  onCancelSelection,
  onOpenStats,
  onExportPDF,
  onExportICS,
  myDoctorName,
  onOpenMySchedule,
  onOpenSafetyChecker,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<'idle' | 'success' | 'error'>('idle');
  const exportBusy = useRef(false);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(resultTimer.current);
    };
  }, []);

  const handlePDFExport = async () => {
    if (exportBusy.current) return;
    exportBusy.current = true;
    clearTimeout(resultTimer.current);
    setExportResult('idle');
    setIsExporting(true);
    try {
      await onExportPDF();
      if (!mounted.current) return;
      setExportResult('success');
      resultTimer.current = setTimeout(() => setExportResult('idle'), 3000);
    } catch {
      if (mounted.current) setExportResult('error');
    } finally {
      exportBusy.current = false;
      if (mounted.current) setIsExporting(false);
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
        {onToday && (
          <button type="button" onClick={onToday} className="today-button">
            Hôm nay
          </button>
        )}
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
          className="shimmer-shield tactile-elevation inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-400/80 bg-emerald-50 text-emerald-950 dark:border-emerald-600/70 dark:bg-emerald-950/40 dark:text-emerald-200 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-xs"
          title="Nhấp để xem báo cáo an toàn nghỉ ngơi"
        >
          <FatigueAlertIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Không có cảnh báo</span>
        </button>
      )}

      <div className="command-actions">
        <ScheduleCommandPalette
          commands={[
            ...doctorNames.map((name) => ({
              id: `person-${name}`,
              label: name,
              detail: 'Đánh dấu các ca trong tháng',
              run: () => onDoctorQueryChange(name),
            })),
            { id: 'previous', label: 'Tháng trước', detail: 'Điều hướng lịch', run: onPrevMonth },
            { id: 'next', label: 'Tháng sau', detail: 'Điều hướng lịch', run: onNextMonth },
            ...(onToday
              ? [{ id: 'today', label: 'Hôm nay', detail: 'Trở về tháng hiện tại', run: onToday }]
              : []),
            ...(onOpenMySchedule
              ? [
                  {
                    id: 'personal',
                    label: 'Ca của tôi',
                    detail: 'Xem lịch cá nhân',
                    run: onOpenMySchedule,
                  },
                ]
              : []),
            { id: 'stats', label: 'Thống kê', detail: 'Xem phân bố ca trực', run: onOpenStats },
            {
              id: 'ics',
              label: 'Lưu vào lịch điện thoại',
              detail: 'Xuất lịch ICS',
              run: onExportICS,
            },
            {
              id: 'pdf',
              label: 'Xuất PDF',
              detail: 'Tạo bản lịch để tải về',
              run: () => {
                void handlePDFExport();
              },
            },
            {
              id: 'clear',
              label: 'Xem toàn bộ lịch',
              detail: 'Xóa tìm kiếm',
              run: () => onDoctorQueryChange(''),
            },
          ]}
        />
        {onOpenMySchedule && (
          <button
            type="button"
            onClick={onOpenMySchedule}
            className="my-schedule-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-teal-600/40 bg-teal-50 text-teal-900 dark:bg-teal-950/60 dark:border-teal-600/60 dark:text-teal-200 font-extrabold text-xs sm:text-sm hover:bg-teal-100 dark:hover:bg-teal-900/80 transition-colors shadow-xs"
            aria-label="Mở Lịch của tôi"
            title="Xem lịch trực cá nhân của tôi"
          >
            <CalendarIcon className="h-4 w-4" />
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
          className="command-icon pdf-export-button"
          data-export-state={isExporting ? 'busy' : exportResult}
          aria-busy={isExporting}
          aria-label={
            isExporting
              ? 'Đang tạo PDF'
              : exportResult === 'success'
                ? 'Đã tạo PDF'
                : exportResult === 'error'
                  ? 'Thử xuất PDF lại'
                  : 'Xuất PDF'
          }
          title={
            isExporting ? 'Đang tạo PDF' : exportResult === 'success' ? 'Đã tạo PDF' : 'Xuất PDF'
          }
        >
          {exportResult === 'success' ? (
            <svg className="pdf-success-check" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m5 12 4 4L19 6" />
            </svg>
          ) : (
            <DownloadIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      {exportResult === 'error' && (
        <p className="pdf-export-feedback" role="alert">
          Chưa tạo được PDF. Hãy thử lại bằng nút xuất lịch.
        </p>
      )}
      <span className="sr-only" role="status">
        {isExporting
          ? 'Đang tạo PDF'
          : exportResult === 'success'
            ? 'Đã tạo PDF và gửi yêu cầu tải về trình duyệt.'
            : ''}
      </span>

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
