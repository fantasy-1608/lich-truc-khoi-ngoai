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
  showAddDoctorShortcut: boolean;
  onTogglePkdvVisibility: () => void;
  onToggleAddDoctorShortcut: () => void;
  rotationStartDate: string | null;
  onSetRotationStartDate: (date: string | null) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  showPkdv,
  showAddDoctorShortcut,
  onTogglePkdvVisibility,
  onToggleAddDoctorShortcut,
  rotationStartDate,
}) => {
  return (
    <div>
      <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-200">Cấu hình chung</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 border-b border-slate-200/60 dark:border-slate-700/60 pb-4">
        Thiết lập các thông số cơ bản và tùy chọn hiển thị.
      </p>

      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Điểm neo lịch hiện tại: {rotationStartDate || getDateString(START_DATE)}. Đổi thứ tự qua
          mục Xoay tua định kỳ, không đổi điểm neo.
        </p>

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

        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
          <div>
            <label
              htmlFor="add-doctor-shortcut-toggle"
              className="font-medium text-slate-800 dark:text-slate-200 block"
            >
              Hiện nút thêm BS từng ngày
            </label>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Bật khi cần thêm bác sĩ tăng cường cho một ngày riêng lẻ
            </span>
          </div>
          <label
            htmlFor="add-doctor-shortcut-toggle"
            className="relative inline-flex items-center cursor-pointer"
          >
            <input
              type="checkbox"
              id="add-doctor-shortcut-toggle"
              className="sr-only peer"
              checked={showAddDoctorShortcut}
              onChange={onToggleAddDoctorShortcut}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
