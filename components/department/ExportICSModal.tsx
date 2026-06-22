import React, { useState } from 'react';
import { Doctor } from '../../types';
import { XIcon } from '../icons/XIcon';
import { DownloadIcon } from '../icons/DownloadIcon';

interface ExportICSModalProps {
  isOpen: boolean;
  onClose: () => void;
  allDoctors: Doctor[];
  onExport: (doctorName: string) => void;
}

const ExportICSModal: React.FC<ExportICSModalProps> = ({
  isOpen,
  onClose,
  allDoctors,
  onExport,
}) => {
  const [selectedDoctorName, setSelectedDoctorName] = useState<string>('');

  if (!isOpen) return null;

  const handleExport = () => {
    if (selectedDoctorName) {
      onExport(selectedDoctorName);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Xuất lịch cá nhân (.ics)
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Chọn bác sĩ:
            </label>
            <select
              value={selectedDoctorName}
              onChange={(e) => setSelectedDoctorName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">-- Chọn bác sĩ --</option>
              {allDoctors.map((doc) => (
                <option key={doc.id} value={doc.name}>
                  Bs. {doc.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Lịch tải về sẽ bao gồm tất cả các ca trực (trực chính, ứng trực, khám...) của bác sĩ trong tháng đang hiển thị.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Hủy
          </button>
          <button
            onClick={handleExport}
            disabled={!selectedDoctorName}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DownloadIcon className="w-4 h-4" />
            Tải về
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportICSModal;
