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

  const roleLabels: Record<DepartmentRole, string> = {
    ungTruc: 'Ứng trực',
    pkdk: 'PKĐK',
    pkdv: 'PKDV',
  };

  const doctorConflictMap = useMemo(() => {
    const onCallToday = getDoctorsForDate(date) || [];
    const yesterday = new Date(date);
    yesterday.setDate(date.getDate() - 1);
    const onCallYesterday = getDoctorsForDate(yesterday) || [];

    const currentAssignments = departmentAssignments[dateString] || {};
    const map = new Map<string, string>();

    onCallToday.forEach((doc) => {
      map.set(doc.trim().toLowerCase(), 'Trực chính hôm nay');
    });

    onCallYesterday.forEach((doc) => {
      const key = doc.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, 'Trực hôm qua');
      }
    });

    (Object.entries(currentAssignments) as [DepartmentRole, string[] | undefined][]).forEach(
      ([otherRole, docs]) => {
        if (otherRole !== role && Array.isArray(docs)) {
          docs.forEach((doc) => {
            const key = doc.trim().toLowerCase();
            if (!map.has(key)) {
              map.set(key, `Đã xếp ${roleLabels[otherRole] || otherRole}`);
            }
          });
        }
      },
    );

    return map;
  }, [date, role, getDoctorsForDate, departmentAssignments, dateString]);

  // Split doctors into selectable (available or currently selected) and unavailable (busy/already assigned)
  const { availableDoctors, unavailableDoctors } = useMemo(() => {
    const seen = new Set<string>();
    const allDoctors: string[] = [];

    assignmentDoctors.forEach((doc) => {
      const key = doc.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        allDoctors.push(doc);
      }
    });

    selectedDoctors.forEach((doc) => {
      const key = doc.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        allDoctors.push(doc);
      }
    });

    const available: string[] = [];
    const unavailable: string[] = [];

    allDoctors.forEach((doc) => {
      const isSelected = selectedDoctors.includes(doc);
      const conflict = doctorConflictMap.get(doc.trim().toLowerCase());
      if (isSelected || !conflict) {
        available.push(doc);
      } else {
        unavailable.push(doc);
      }
    });

    // In available list: currently selected doctors go first, then alphabetical
    available.sort((a, b) => {
      const aSelected = selectedDoctors.includes(a);
      const bSelected = selectedDoctors.includes(b);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.localeCompare(b, 'vi');
    });

    // In unavailable list: sort alphabetical
    unavailable.sort((a, b) => a.localeCompare(b, 'vi'));

    return { availableDoctors: available, unavailableDoctors: unavailable };
  }, [assignmentDoctors, selectedDoctors, doctorConflictMap]);

  const conflictedSelectedDoctors = useMemo(() => {
    return selectedDoctors.filter((doc) => doctorConflictMap.has(doc.trim().toLowerCase()));
  }, [selectedDoctors, doctorConflictMap]);

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

  const handleClearAll = () => {
    setSelectedDoctors([]);
  };

  const handleRemoveConflicts = () => {
    const conflictedKeys = new Set(
      conflictedSelectedDoctors.map((doc) => doc.trim().toLowerCase()),
    );
    setSelectedDoctors((current) =>
      current.filter((doc) => !conflictedKeys.has(doc.trim().toLowerCase())),
    );
  };

  const renderDoctorItem = (doc: string) => {
    const isSelected = selectedDoctors.includes(doc);
    const conflict = doctorConflictMap.get(doc.trim().toLowerCase());
    const limit = role === 'pkdv' ? 1 : 2;
    const isLimitReached = limit > 1 && selectedDoctors.length >= limit && !isSelected;
    const isDisabled = isSelected ? false : isLimitReached || Boolean(conflict);

    return (
      <label
        key={doc}
        className={`flex items-center justify-between p-2 rounded-md transition-colors ${
          isDisabled
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
      >
        <div className="flex items-center space-x-2 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            disabled={isDisabled}
            onChange={() => handleDoctorToggle(doc)}
            className={`h-4 w-4 text-blue-600 bg-slate-100 border-slate-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 transition-all-app ${
              limit === 1 ? 'rounded-full' : 'rounded'
            }`}
          />
          <span
            className={`truncate ${
              isSelected && conflict
                ? 'font-semibold text-rose-600 dark:text-rose-400'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {doc}
          </span>
        </div>
        {conflict && (
          <span
            className={`text-[11px] px-1.5 py-0.5 rounded font-medium shrink-0 ml-2 ${
              isSelected
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
            }`}
          >
            {conflict}
          </span>
        )}
      </label>
    );
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
        className={`absolute z-30 bg-white dark:bg-slate-800 rounded-lg shadow-xl border dark:border-slate-600 p-3 text-sm w-72 sm:w-80 transition-all-app ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="popover-title"
      >
        <div className="flex items-center justify-between mb-2">
          <h4 id="popover-title" className="font-semibold text-slate-800 dark:text-slate-200">
            Chọn bác sĩ cho {roleLabels[role]}
          </h4>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Tối đa: {role === 'pkdv' ? 1 : 2}
          </span>
        </div>

        {conflictedSelectedDoctors.length > 0 && (
          <div className="mb-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="shrink-0">⚠️</span>
              <span className="truncate">
                Trùng lịch: <strong>{conflictedSelectedDoctors.join(', ')}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemoveConflicts}
              className="text-xs font-semibold text-amber-900 dark:text-amber-200 underline hover:no-underline shrink-0"
            >
              Gỡ trùng
            </button>
          </div>
        )}

        <div className="max-h-64 overflow-y-auto pr-1 my-2 space-y-1">
          {availableDoctors.length > 0 ? (
            availableDoctors.map((doc) => renderDoctorItem(doc))
          ) : (
            <p className="text-center text-slate-500 dark:text-slate-400 py-3 text-xs">
              Không có bác sĩ khả dụng.
            </p>
          )}

          {unavailableDoctors.length > 0 && (
            <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700/60">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Đã có lịch khác ({unavailableDoctors.length})
              </div>
              <div className="space-y-1">
                {unavailableDoctors.map((doc) => renderDoctorItem(doc))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between pt-2 border-t dark:border-slate-700">
          <button
            type="button"
            onClick={handleClearAll}
            disabled={selectedDoctors.length === 0}
            className="px-2 py-1 text-xs rounded font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
          >
            Xóa tất cả
          </button>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1 rounded text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all-app"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-all-app font-medium"
            >
              Lưu
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AssignmentPopover;
