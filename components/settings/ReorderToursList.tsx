import React, { useState, useMemo } from 'react';
import { Tour, Doctor } from '../../types';
import { ArrowUpIcon } from '../icons/ArrowUpIcon';
import { ArrowDownIcon } from '../icons/ArrowDownIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';

interface ReorderToursListProps {
  allowReorder?: boolean;
  onRenameTour?: (id: string, name: string) => void;
  tours: Tour[];
  doctors: Doctor[];
  tourOrder: string[];
  onReorderTours: (newOrder: string[]) => void;
  onUpdateDoctorInTour: (tourId: string, doctorIndex: number, newDoctorId: string) => void;
  onAddDoctorToTour: (tourId: string) => void;
  onRemoveDoctorFromTour: (tourId: string, doctorIndex: number) => void;
}

const ReorderToursList: React.FC<ReorderToursListProps> = ({
  allowReorder = true,
  onRenameTour,
  tours,
  doctors,
  tourOrder,
  onReorderTours,
  onUpdateDoctorInTour,
  onAddDoctorToTour,
  onRemoveDoctorFromTour,
}) => {
  const [editingTourId, setEditingTourId] = useState<string | null>(null);
  const [doctorQuery, setDoctorQuery] = useState('');

  const toursById = useMemo(
    () =>
      tours.reduce(
        (acc, tour) => {
          acc[tour.id] = tour;
          return acc;
        },
        {} as Record<string, Tour>,
      ),
    [tours],
  );

  const doctorsById = useMemo(
    () =>
      doctors.reduce(
        (acc, doc) => {
          acc[doc.id] = doc;
          return acc;
        },
        {} as Record<string, Doctor>,
      ),
    [doctors],
  );

  const getTourName = (tourId: string): string => {
    const tour = toursById[tourId];
    if (!tour || tour.doctorIds.length === 0) return `Tua không tên`;
    // Find the first valid doctor to name the tour
    const firstDoctorId = tour.doctorIds.find((id) => id && doctorsById[id]);
    const doctor = firstDoctorId ? doctorsById[firstDoctorId] : undefined;
    return tour.name || (doctor ? doctor.name : `Tua #${tourId.slice(-2)}`);
  };

  const moveTour = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...tourOrder];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newOrder.length) return;

    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    onReorderTours(newOrder);
  };

  const handleTourClick = (tourId: string) => {
    setEditingTourId((current) => (current === tourId ? null : tourId));
  };

  return (
    <div>
      <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-200">
        Thành viên các tua
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 border-b border-slate-200/60 dark:border-slate-700/60 pb-4">
        Bấm Sửa thành viên để thay danh sách trong bản nháp.
      </p>

      <ul className="space-y-3">
        {tourOrder.map((tourId, index) => {
          const tour = toursById[tourId];
          if (!tour) return null;
          const isEditing = editingTourId === tourId;

          return (
            <li
              key={tourId}
              className={`flex flex-col p-3 rounded-xl transition-all duration-200 border ${isEditing ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-indigo-800'}`}
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleTourClick(tourId)}
                  className={`font-medium text-left transition-colors flex-grow ${isEditing ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                  aria-expanded={isEditing}
                >
                  <span className="inline-block w-6 text-slate-400 dark:text-slate-500 font-normal">
                    {index + 1}.
                  </span>
                  Tua {getTourName(tourId)} · {tour.doctorIds.length} bác sĩ
                  <span className="block text-sm text-slate-500 dark:text-slate-300">
                    {tour.doctorIds.map((id) => doctorsById[id]?.name || 'Chưa chọn').join(', ')}
                  </span>
                  <span className="block text-sm">
                    {isEditing ? 'Đóng phần sửa' : 'Sửa thành viên'}
                  </span>
                </button>
                {allowReorder && (
                  <div className="flex space-x-1">
                    <button
                      onClick={() => moveTour(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      aria-label="Move up"
                    >
                      <ArrowUpIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveTour(index, 'down')}
                      disabled={index === tourOrder.length - 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      aria-label="Move down"
                    >
                      <ArrowDownIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-800/50 space-y-3 animate-in slide-in-from-top-2 duration-200">
                  {onRenameTour && (
                    <label className="block text-sm">
                      Tên tua riêng
                      <input
                        className="block w-full p-2 border dark:bg-slate-800"
                        value={tour.name || ''}
                        placeholder={getTourName(tourId)}
                        onChange={(e) => onRenameTour(tourId, e.target.value)}
                      />
                    </label>
                  )}
                  <h4 className="text-xs font-semibold text-indigo-900/60 dark:text-indigo-100/60 uppercase tracking-wider mb-2">
                    Thành viên trong tua
                  </h4>
                  <label className="block text-sm">
                    Tìm bác sĩ
                    <input
                      type="search"
                      className="block w-full p-2 border dark:bg-slate-800"
                      value={doctorQuery}
                      onChange={(e) => setDoctorQuery(e.target.value)}
                      placeholder="Nhập tên bác sĩ…"
                    />
                  </label>
                  <div className="space-y-2">
                    {tour.doctorIds.map((doctorId, docIndex) => (
                      <div key={docIndex} className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-400 w-6 text-center">
                          {docIndex + 1}
                        </span>
                        <div className="flex-grow relative">
                          <select
                            aria-label={`Bác sĩ vị trí ${docIndex + 1} của tua ${getTourName(tourId)}`}
                            value={doctorId}
                            onChange={(e) => onUpdateDoctorInTour(tourId, docIndex, e.target.value)}
                            className="w-full p-2 pl-3 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none"
                          >
                            <option value="">-- Chọn bác sĩ --</option>
                            {doctors
                              .filter(
                                (doc) =>
                                  doc.id === doctorId ||
                                  doc.name
                                    .toLocaleLowerCase('vi')
                                    .includes(doctorQuery.toLocaleLowerCase('vi')),
                              )
                              .map((doc) => (
                                <option
                                  key={doc.id}
                                  value={doc.id}
                                  disabled={doc.id !== doctorId && tour.doctorIds.includes(doc.id)}
                                >
                                  {doc.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        {tour.doctorIds.length > 4 && (
                          <button
                            onClick={() => onRemoveDoctorFromTour(tourId, docIndex)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            aria-label="Xoá bác sĩ khỏi tua"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => onAddDoctorToTour(tourId)}
                    className="mt-2 w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Thêm bác sĩ vào tua
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ReorderToursList;
