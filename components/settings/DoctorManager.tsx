import React, { useState } from 'react';
import { Doctor } from '../../types';
import { TrashIcon } from '../icons/TrashIcon';
import { PlusIcon } from '../icons/PlusIcon';

interface DoctorManagerProps {
  doctors: Doctor[];
  onAddDoctor: (name: string, isCtch: boolean) => void;
  onRemoveDoctor: (id: string) => void;
  onUpdateDoctor: (id: string, updatedDoctor: Partial<Omit<Doctor, 'id'>>) => void;
}

const DoctorManager: React.FC<DoctorManagerProps> = ({
  doctors,
  onAddDoctor,
  onRemoveDoctor,
  onUpdateDoctor,
}) => {
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newDoctorIsCtch, setNewDoctorIsCtch] = useState(false);

  const handleAddClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDoctorName.trim()) {
      onAddDoctor(newDoctorName, newDoctorIsCtch);
      setNewDoctorName('');
      setNewDoctorIsCtch(false);
    }
  };

  // Calculate doctor counts
  const totalDoctors = doctors.length;
  const ctchDoctors = doctors.filter((d) => d.isCtch).length;

  return (
    <div>
      <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-200 border-b border-slate-200/60 dark:border-slate-700/60 pb-4 flex items-center gap-3">
        <span>Danh sách Bác sĩ</span>
        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2.5 py-1 rounded-full">
          {totalDoctors} - {ctchDoctors} CTCH
        </span>
      </h3>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 mb-6 custom-scrollbar">
        {doctors.map((doctor) => (
          <div
            key={doctor.id}
            className="group flex items-center gap-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200"
          >
            <input
              type="text"
              value={doctor.name}
              onChange={(e) => onUpdateDoctor(doctor.id, { name: e.target.value })}
              className="flex-grow bg-transparent border-none focus:ring-0 p-0 text-sm font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400"
            />
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
              <input
                type="checkbox"
                checked={doctor.isCtch}
                onChange={(e) => onUpdateDoctor(doctor.id, { isCtch: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Khoa CTCH</span>
            </label>
            <button
              onClick={() => onRemoveDoctor(doctor.id)}
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label={`Remove ${doctor.name}`}
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleAddClick}
        className="pt-4 border-t border-slate-200/60 dark:border-slate-700/60"
      >
        <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
          Thêm bác sĩ mới
        </h4>
        <div className="flex items-center gap-3">
          <div className="flex-grow relative">
            <input
              type="text"
              value={newDoctorName}
              onChange={(e) => setNewDoctorName(e.target.value)}
              placeholder="Nhập tên bác sĩ..."
              className="w-full pl-4 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap px-2">
            <input
              type="checkbox"
              checked={newDoctorIsCtch}
              onChange={(e) => setNewDoctorIsCtch(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>CTCH</span>
          </label>
          <button
            type="submit"
            disabled={!newDoctorName.trim()}
            className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40"
            aria-label="Thêm bác sĩ"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default DoctorManager;
