import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Doctor, ScheduleCalendarDay } from '../../types';
import { XIcon } from '../icons/XIcon';

interface AddDoctorPopupProps {
  allDoctors: Doctor[];
  day: ScheduleCalendarDay;
  onAddClick: (doctorName: string) => void;
  onClose: () => void;
}

const AddDoctorPopup: React.FC<AddDoctorPopupProps> = ({
  allDoctors,
  day,
  onAddClick,
  onClose,
}) => {
  const [doctorFilter, setDoctorFilter] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentDoctors = day.doctors ?? [];
  const availableDoctors = useMemo(() => {
    const assigned = new Set(currentDoctors);
    return [...allDoctors]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((doctor) => !assigned.has(doctor.name));
  }, [allDoctors, currentDoctors]);

  const filteredDoctors = useMemo(() => {
    const query = doctorFilter.trim().toLowerCase();
    if (!query) return availableDoctors;
    return availableDoctors.filter((doctor) => doctor.name.toLowerCase().includes(query));
  }, [availableDoctors, doctorFilter]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleAdd = (doctorName: string) => {
    onAddClick(doctorName);
    onClose();
  };

  const dateLabel = day.date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="drawer-backdrop fixed inset-0 z-50 flex items-end bg-slate-950/45 backdrop-blur-[2px] sm:items-stretch sm:justify-end">
      <div
        ref={popupRef}
        className="drawer-panel relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800 sm:h-full sm:max-h-none sm:w-[420px] sm:rounded-none sm:rounded-l-2xl lg:w-[480px]"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Thêm bác sĩ trực</h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{dateLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Đóng"
          >
            <XIcon className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-900/20 dark:text-indigo-200">
            Chỉ thêm bác sĩ cho ngày này. Các ngày khác cùng tua không thay đổi.
          </div>

          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Chọn bác sĩ thêm vào danh sách trực
          </label>
          <input
            ref={inputRef}
            type="text"
            placeholder="Tìm bác sĩ..."
            value={doctorFilter}
            onChange={(event) => setDoctorFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900"
          />

          <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
            {filteredDoctors.length > 0 ? (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredDoctors.map((doctor) => (
                  <li key={doctor.id}>
                    <button
                      type="button"
                      onClick={() => handleAdd(doctor.name)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-slate-700 transition-colors hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none dark:text-slate-200 dark:hover:bg-indigo-900/30 dark:focus:bg-indigo-900/30"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                        {doctor.name.charAt(0)}
                      </span>
                      <span>{doctor.name}</span>
                      {doctor.isCtch && (
                        <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          CTCH
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-slate-500 dark:text-slate-400">
                Không còn bác sĩ phù hợp để thêm
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-900/50">
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Dùng nút đặt lại trong ô ngày để quay về lịch gốc
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddDoctorPopup;
