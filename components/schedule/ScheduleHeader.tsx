import React, { useState } from 'react';
import { SelectedDoctor } from '../../types';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { DownloadIcon } from '../icons/DownloadIcon';

interface ScheduleHeaderProps {
  currentDate: Date;
  selectedDoctor: SelectedDoctor | null;
  selectedShiftDate: Date | null;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onCancelSelection: () => void;
  onExportPDF: () => Promise<void>;
}

const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  currentDate,
  selectedDoctor,
  selectedShiftDate,
  onPrevMonth,
  onNextMonth,
  onCancelSelection,
  onExportPDF,
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
    <div className="mb-3 grid grid-cols-[44px_1fr_88px] items-center sm:mb-4">
      <button
        onClick={onPrevMonth}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-600 transition-all-app hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 sm:h-10 sm:w-10 sm:hover:scale-105"
        aria-label="Previous month"
      >
        <ArrowLeftIcon className="h-6 w-6" />
      </button>
      <div className="min-w-0 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200">
          {`Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()}`}
        </h2>
        {selectedDoctor && (
          <div className="flex items-center justify-center space-x-2 mt-1 text-sm text-green-600 dark:text-green-400">
            <span>
              Đã chọn <span className="font-bold">{selectedDoctor.doctorName}</span>. Chọn bác sĩ
              khác để hoán đổi, hoặc chọn từ danh sách bên dưới để thay thế.
            </span>
            <button
              onClick={onCancelSelection}
              className="font-semibold underline hover:text-green-700 dark:hover:text-green-300 shrink-0"
            >
              Hủy
            </button>
          </div>
        )}
        {selectedShiftDate && (
          <div className="flex items-center justify-center space-x-2 mt-1 text-sm text-purple-600 dark:text-purple-400">
            <span>
              Đã chọn tua ngày{' '}
              <span className="font-bold">{selectedShiftDate.toLocaleDateString('vi-VN')}</span>.
              Chọn một tua khác để hoán đổi.
            </span>
            <button
              onClick={onCancelSelection}
              className="font-semibold underline hover:text-purple-700 dark:hover:text-purple-300 shrink-0"
            >
              Hủy
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={onNextMonth}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-600 transition-all-app hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 sm:h-10 sm:w-10 sm:hover:scale-105"
          aria-label="Next month"
        >
          <ArrowRightIcon className="h-6 w-6" />
        </button>
        <button
          onClick={handlePDFExport}
          disabled={isExporting}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-600 transition-all-app hover:bg-slate-100 disabled:cursor-wait disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700 sm:h-10 sm:w-10 sm:hover:scale-105"
          aria-label="Export to PDF"
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

export default ScheduleHeader;
