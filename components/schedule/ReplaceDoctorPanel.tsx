import React, { useState, useMemo } from 'react';
import { Doctor, SelectedDoctor } from '../../types';

interface ReplaceDoctorPanelProps {
  allDoctors: Doctor[];
  selectedDoctor: SelectedDoctor;
  onReplaceClick: (newDoctorName: string) => void;
}

const ReplaceDoctorPanel: React.FC<ReplaceDoctorPanelProps> = ({
  allDoctors,
  selectedDoctor,
  onReplaceClick,
}) => {
  const [doctorFilter, setDoctorFilter] = useState('');

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

  return (
    <div className="my-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
      <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">
        Chọn bác sĩ để thay thế cho{' '}
        <span className="text-blue-600 dark:text-blue-400">{selectedDoctor.doctorName}</span>
      </h4>
      <div className="relative">
        <input
          type="text"
          placeholder="Tìm và chọn bác sĩ..."
          value={doctorFilter}
          onChange={(e) => setDoctorFilter(e.target.value)}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all-app"
        />
        <div className="mt-2 max-h-48 overflow-y-auto pr-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900">
          {filteredDoctors.length > 0 ? (
            <ul className="space-y-1 p-1">
              {filteredDoctors.map((doc) => (
                <li key={doc.id}>
                  <button
                    onClick={() => onReplaceClick(doc.name)}
                    className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 focus:bg-blue-100 dark:focus:bg-blue-900/50 focus:outline-none transition-colors"
                  >
                    {doc.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-slate-500 dark:text-slate-400 py-4">
              Không tìm thấy bác sĩ nào.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReplaceDoctorPanel;
