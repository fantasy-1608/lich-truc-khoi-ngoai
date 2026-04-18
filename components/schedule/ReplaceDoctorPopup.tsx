import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Doctor, SelectedDoctor } from '../../types';
import { XIcon } from '../icons/XIcon';

interface ReplaceDoctorPopupProps {
  allDoctors: Doctor[];
  selectedDoctor: SelectedDoctor;
  onReplaceClick: (newDoctorName: string) => void;
  onClose: () => void;
}

const ReplaceDoctorPopup: React.FC<ReplaceDoctorPopupProps> = ({
  allDoctors,
  selectedDoctor,
  onReplaceClick,
  onClose,
}) => {
  const [doctorFilter, setDoctorFilter] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableDoctors = useMemo(() => {
    const sortedDocs = [...allDoctors].sort((a, b) => a.name.localeCompare(b.name));
    return sortedDocs.filter((doc) => doc.name !== selectedDoctor.doctorName);
  }, [allDoctors, selectedDoctor]);

  const filteredDoctors = useMemo(() => {
    if (!doctorFilter) return availableDoctors;
    return availableDoctors.filter((doc) =>
      doc.name.toLowerCase().includes(doctorFilter.toLowerCase()),
    );
  }, [availableDoctors, doctorFilter]);

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleReplace = (doctorName: string) => {
    onReplaceClick(doctorName);
    onClose();
  };

  // Format date for display
  const dateStr = selectedDoctor.date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={popupRef}
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              Thay thế bác sĩ trực
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{dateStr}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <XIcon className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
            Thay{' '}
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {selectedDoctor.doctorName}
            </span>{' '}
            bằng:
          </p>

          {/* Search input */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Tìm bác sĩ..."
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />

          {/* Doctor list */}
          <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            {filteredDoctors.length > 0 ? (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredDoctors.map((doc) => (
                  <li key={doc.id}>
                    <button
                      onClick={() => handleReplace(doc.name)}
                      className="w-full text-left px-4 py-3 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 focus:bg-indigo-50 dark:focus:bg-indigo-900/30 focus:outline-none transition-colors flex items-center gap-3"
                    >
                      <span className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                        {doc.name.charAt(0)}
                      </span>
                      <span>{doc.name}</span>
                      {doc.isCtch && (
                        <span className="ml-auto text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">
                          CTCH
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                Không tìm thấy bác sĩ
              </p>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Click vào bác sĩ để thay thế, hoặc nhấn ESC để hủy
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReplaceDoctorPopup;
