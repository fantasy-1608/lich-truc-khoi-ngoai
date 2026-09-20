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

      {(postDutyWarningCount > 0 || fatigueWarningCount > 0) && (
        <div className="warning-summary" aria-label="Tổng hợp cảnh báo">
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

      <div className="command-actions">
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
