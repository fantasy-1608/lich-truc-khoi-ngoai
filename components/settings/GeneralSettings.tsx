import React from 'react';
import { START_DATE } from '../../constants';

// Helper to get date string in YYYY-MM-DD format using local time components
const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface GeneralSettingsProps {
  showPkdv: boolean;
  onTogglePkdvVisibility: () => void;
  rotationStartDate: string | null;
  onSetRotationStartDate: (date: string | null) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  showPkdv,
  onTogglePkdvVisibility,
  rotationStartDate,
  onSetRotationStartDate,
}) => {
  // Format the date for input[type="date"] (YYYY-MM-DD)
  // If rotationStartDate is null, use the constant START_DATE default
  const defaultDate = START_DATE;
  const currentDateVal = rotationStartDate ? new Date(rotationStartDate) : defaultDate;

  // Handles timezone offset issues for display
  // We want to display the local date string "YYYY-MM-DD"
  const formatDateForInput = (date: Date) => {
    // This trick ensures we get the YYYY-MM-DD of the local time
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return getDateString(localDate);
  };

  const inputValue = formatDateForInput(currentDateVal);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      onSetRotationStartDate(null);
      return;
    }
    // e.target.value is YYYY-MM-DD
    // new Date(val) will parse it as UTC if no timezone info, or local if browser specific.
    // To ensure we store a consistent YYYY-MM-DD string representing the local date,
    // we parse it and then format it back using getDateString.
    const date = new Date(val);
    onSetRotationStartDate(getDateString(date));
  };

  return (
    <div>
      <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-200">Cấu hình chung</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 border-b border-slate-200/60 dark:border-slate-700/60 pb-4">
        Thiết lập các thông số cơ bản và tùy chọn hiển thị.
      </p>

      <div className="space-y-4">
        {/* Rotation Start Date Setting */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
          <label className="block mb-2 font-medium text-slate-800 dark:text-slate-200">
            Ngày bắt đầu xoay tua
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Chọn ngày mốc để tính toán thứ tự tua trực.
            </span>
            <input
              type="date"
              value={inputValue}
              onChange={handleDateChange}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* PKDV Visibility Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
          <div>
            <label
              htmlFor="pkdv-toggle"
              className="font-medium text-slate-800 dark:text-slate-200 block"
            >
              Hiển thị mục PKDV
            </label>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Bật/tắt hiển thị dòng Phòng khám dịch vụ
            </span>
          </div>
          <label htmlFor="pkdv-toggle" className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="pkdv-toggle"
              className="sr-only peer"
              checked={showPkdv}
              onChange={onTogglePkdvVisibility}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
