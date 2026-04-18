import React, { useState } from 'react';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { DownloadIcon } from '../icons/DownloadIcon';

interface DepartmentHeaderProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenStats: () => void;
  onExportPDF: () => Promise<void>;
}

const DepartmentHeader: React.FC<DepartmentHeaderProps> = ({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onOpenStats,
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
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={onPrevMonth}
        className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transform hover:scale-105 transition-all-app"
        aria-label="Previous month"
      >
        <ArrowLeftIcon className="w-6 h-6" />
      </button>
      <h2 className="text-xl sm:text-2xl font-bold text-center text-slate-800 dark:text-slate-200">
        {`Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()}`}
      </h2>
      <div className="flex items-center space-x-2">
        <button
          onClick={onNextMonth}
          className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transform hover:scale-105 transition-all-app"
          aria-label="Next month"
        >
          <ArrowRightIcon className="w-6 h-6" />
        </button>
        <button
          onClick={onOpenStats}
          className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transform hover:scale-105 transition-all-app"
          aria-label="View Statistics"
          title="Xem thống kê"
        >
          <ChartBarIcon className="w-6 h-6" />
        </button>
        <button
          onClick={handlePDFExport}
          disabled={isExporting}
          className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transform hover:scale-105 transition-all-app disabled:opacity-50 disabled:cursor-wait"
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

export default DepartmentHeader;
