import React, { useRef } from 'react';
import { DownloadIcon } from '../icons/DownloadIcon';
import { ImportData } from '../../types';
import { ToastType } from '../../hooks/useToast';

interface DataManagerProps {
  onImport: (data: ImportData, onSuccess?: () => void) => void;
  dataToExport: ImportData;
  showToast: (message: string, type: ToastType) => void;
}

const DataManager: React.FC<DataManagerProps> = ({ onImport, dataToExport, showToast }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (!dataToExport) {
      showToast('Không có dữ liệu để xuất', 'error');
      return;
    }

    try {
      const jsonString = JSON.stringify(dataToExport, null, 2);
      // Use application/octet-stream to force download
      const blob = new Blob([jsonString], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().slice(0, 10);
      link.download = `schedule_config_${date}.json`;

      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('Đã xuất file thành công!', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Có lỗi xảy ra khi xuất file. Vui lòng thử lại.', 'error');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const data = JSON.parse(text);
          onImport(data, () => {
            showToast('Đã nhập dữ liệu thành công!', 'success');
          });
        } catch (error) {
          console.error('Error parsing JSON file:', error);
          showToast('File không hợp lệ hoặc bị lỗi. Vui lòng kiểm tra lại file JSON.', 'error');
        }
      };
      reader.readAsText(file);
    }
    // Reset the input value to allow importing the same file again
    if (event.target) {
      event.target.value = '';
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-200">Quản lý Dữ liệu</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 border-b border-slate-200/60 dark:border-slate-700/60 pb-4">
        Sao lưu và phục hồi dữ liệu cấu hình lịch trực.
      </p>

      <div className="flex gap-4">
        <button
          onClick={handleExport}
          className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 active:scale-95"
          aria-label="Xuất dữ liệu ra file JSON"
        >
          <DownloadIcon className="w-5 h-5 mr-2" />
          Xuất file
        </button>
        <button
          onClick={handleImportClick}
          className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 dark:focus:ring-slate-700 transition-all active:scale-95"
          aria-label="Nhập dữ liệu từ file JSON"
        >
          Nhập file
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/json"
          className="hidden"
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export default DataManager;
