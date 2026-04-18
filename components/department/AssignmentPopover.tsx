import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DepartmentRole, DepartmentAssignments } from '../../types';

// Helper to get date string in YYYY-MM-DD format using local time components
const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface EditingState {
  date: Date;
  role: DepartmentRole;
  target: HTMLElement;
}

interface AssignmentPopoverProps {
  editingState: EditingState;
  assignmentDoctors: string[];
  departmentAssignments: Record<string, Partial<DepartmentAssignments>>;
  getDoctorsForDate: (date: Date) => string[] | undefined;
  onSave: (selectedDoctors: string[]) => void;
  onCancel: () => void;
}

const AssignmentPopover: React.FC<AssignmentPopoverProps> = ({
  editingState,
  assignmentDoctors,
  departmentAssignments,
  getDoctorsForDate,
  onSave,
  onCancel,
}) => {
  const { date, role, target } = editingState;
  const dateString = getDateString(date);
  const initialDoctors = departmentAssignments[dateString]?.[role] || [];

  const [isVisible, setIsVisible] = useState(false);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>(initialDoctors);
  const popoverRef = useRef<HTMLDivElement>(null);

  const availableDoctors = useMemo(() => {
    const onCallToday = getDoctorsForDate(date) || [];
    const yesterday = new Date(date);
    yesterday.setDate(date.getDate() - 1);
    const onCallYesterday = getDoctorsForDate(yesterday) || [];

    const currentAssignments = departmentAssignments[dateString] || {};
    const assignedToOtherRolesToday = Object.entries(currentAssignments)
      .filter(([key]) => key !== role)
      .flatMap(([, doctors]) => doctors);

    const unavailableDoctors = [...onCallToday, ...onCallYesterday, ...assignedToOtherRolesToday];

    const normalizedUnavailable = new Set(unavailableDoctors.map((d) => d.trim().toLowerCase()));

    return assignmentDoctors.filter((doc) => {
      const normalizedDoc = doc.trim().toLowerCase();
      return !normalizedUnavailable.has(normalizedDoc);
    });
  }, [date, role, getDoctorsForDate, departmentAssignments, assignmentDoctors, dateString]);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 0);
    if (popoverRef.current) {
      const popoverEl = popoverRef.current;
      const targetRect = target.getBoundingClientRect();

      let top = targetRect.bottom + window.scrollY + 8;
      let left = targetRect.left + window.scrollX;

      if (left + popoverEl.offsetWidth > window.innerWidth - 10)
        left = window.innerWidth - popoverEl.offsetWidth - 10;
      if (top + popoverEl.offsetHeight > window.innerHeight - 10)
        top = targetRect.top + window.scrollY - popoverEl.offsetHeight - 8;
      if (left < 10) left = 10;

      popoverEl.style.left = `${left}px`;
      popoverEl.style.top = `${top}px`;
    }
    return () => clearTimeout(timer);
  }, [target]);

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(onCancel, 200);
  };

  const handleSave = () => {
    onSave(selectedDoctors);
  };

  const handleDoctorToggle = (doctor: string) => {
    const limit = role === 'pkdv' ? 1 : 2;
    const isSelected = selectedDoctors.includes(doctor);

    if (limit === 1) {
      setSelectedDoctors(isSelected ? [] : [doctor]);
    } else {
      if (isSelected) {
        setSelectedDoctors((current) => current.filter((d) => d !== doctor));
      } else if (selectedDoctors.length < limit) {
        setSelectedDoctors((current) => [...current, doctor]);
      }
    }
  };

  const roleLabels: Record<DepartmentRole, string> = {
    ungTruc: 'Ứng trực',
    pkdk: 'PKĐK',
    pkdv: 'PKDV',
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-20 bg-black/20 transition-opacity ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleCancel}
        aria-hidden="true"
      ></div>
      <div
        ref={popoverRef}
        className={`absolute z-30 bg-white dark:bg-slate-800 rounded-lg shadow-xl border dark:border-slate-600 p-3 text-sm w-64 transition-all-app ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="popover-title"
      >
        <h4 id="popover-title" className="font-semibold mb-2 text-slate-800 dark:text-slate-200">
          Chọn bác sĩ cho {roleLabels[role]}
        </h4>
        <div className="max-h-64 overflow-y-auto pr-1 my-2 space-y-1">
          {availableDoctors.length > 0 ? (
            availableDoctors.map((doc) => {
              const isSelected = selectedDoctors.includes(doc);
              const limit = role === 'pkdv' ? 1 : 2;
              const isLimitReached = limit > 1 && selectedDoctors.length >= limit && !isSelected;

              return (
                <label
                  key={doc}
                  className={`flex items-center space-x-2 p-2 rounded-md transition-colors ${isLimitReached ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isLimitReached}
                    onChange={() => handleDoctorToggle(doc)}
                    className={`h-4 w-4 text-blue-600 bg-slate-100 border-slate-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 transition-all-app ${limit === 1 ? 'rounded-full' : 'rounded'}`}
                  />
                  <span className="text-slate-700 dark:text-slate-300">{doc}</span>
                </label>
              );
            })
          ) : (
            <p className="text-center text-slate-500 dark:text-slate-400 py-4 text-xs">
              Không có bác sĩ nào phù hợp.
            </p>
          )}
        </div>
        <div className="flex justify-end space-x-2 pt-2 border-t dark:border-slate-700">
          <button
            onClick={handleCancel}
            className="px-3 py-1 rounded text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all-app"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-all-app"
          >
            Lưu
          </button>
        </div>
      </div>
    </>
  );
};

export default AssignmentPopover;
