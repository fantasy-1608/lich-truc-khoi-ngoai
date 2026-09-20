import React, { useState } from 'react';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { CalendarIcon } from '../icons/CalendarIcon';

interface DepartmentHeaderProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenStats: () => void;
  onExportPDF: () => Promise<void>;
  onExportICS: () => void;
}

const DepartmentHeader: React.FC<DepartmentHeaderProps> = ({
  currentDate,
  onPrevMonth,
  onNextMonth,
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
    <div className="department-command-bar">
      <button onClick={onPrevMonth} className="command-icon" aria-label="Tháng trước">
        <ArrowLeftIcon className="w-6 h-6" />
      </button>
      <h2 className="month-title">
        {`Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()}`}
      </h2>
      <div className="command-actions">
        <button onClick={onNextMonth} className="command-icon" aria-label="Tháng sau">
          <ArrowRightIcon className="w-6 h-6" />
        </button>
        <button
          onClick={onOpenStats}
          className="command-icon"
          aria-label="Xem thống kê"
          title="Xem thống kê"
        >
          <ChartBarIcon className="w-6 h-6" />
        </button>
        <button
          onClick={onExportICS}
          className="command-icon"
          aria-label="Lưu vào lịch điện thoại"
          title="Lưu vào lịch điện thoại (.ics)"
        >
          <CalendarIcon className="w-6 h-6" />
        </button>
        <button
          onClick={handlePDFExport}
          disabled={isExporting}
          className="command-icon"
          aria-label="Xuất PDF"
          title="Xuất ra file PDF"
        >
          {isExporting ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900 dark:border-slate-100"></div>
          ) : (
            <DownloadIcon className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  );
};

export default DepartmentHeader;
