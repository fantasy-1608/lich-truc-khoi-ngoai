import React from 'react';
import { CalendarDay, DepartmentRole, DepartmentAssignments } from '../../types';
import { START_DATE } from '../../constants';
import { PlusIcon } from '../icons/PlusIcon';

// Helper to get date string in YYYY-MM-DD format using local time components
const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface RoleAssignmentProps {
  role: DepartmentRole;
  label: string;
  assignments: Partial<DepartmentAssignments> | undefined;
  onEdit: (e: React.MouseEvent) => void;
}

const RoleAssignment: React.FC<RoleAssignmentProps> = ({ role, label, assignments, onEdit }) => {
  const doctors = assignments?.[role] || [];
  return (
    <li className="flex items-start group min-h-[24px]">
      <span className="font-semibold text-slate-500 dark:text-slate-400 w-14 shrink-0">
        {label}:
      </span>
      <div className="flex-grow flex items-center flex-wrap gap-1">
        {doctors.length > 0 ? (
          doctors.map((doc) => (
            <span
              key={doc}
              onClick={onEdit}
              className="text-blue-600 dark:text-blue-400 font-medium bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded-full text-xs cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/80 transition-colors"
            >
              {doc}
            </span>
          ))
        ) : (
          <span className="text-slate-400 dark:text-slate-500 italic text-xs">Chưa có</span>
        )}
        <button
          onClick={onEdit}
          className="sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity ml-1.5 p-1 rounded-full bg-slate-100 sm:bg-transparent dark:bg-slate-700 sm:dark:bg-transparent hover:bg-slate-200 dark:hover:bg-slate-600"
          aria-label={`Thêm bác sĩ ${label}`}
        >
          <PlusIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400" />
        </button>
      </div>
    </li>
  );
};

interface DepartmentDayCellProps {
  day: CalendarDay;
  assignments: Partial<DepartmentAssignments> | undefined;
  onCallDoctors: string[] | undefined;
  showPkdv: boolean;
  onOpenEditor: (e: React.MouseEvent, date: Date, role: DepartmentRole) => void;
  isHoliday?: boolean;
}

const DepartmentDayCell: React.FC<DepartmentDayCellProps> = ({
  day,
  assignments,
  onCallDoctors,
  showPkdv,
  onOpenEditor,
  isHoliday = false,
}) => {
  const isBeforeStartDate = day.date.getTime() < START_DATE.getTime();

  return (
    <div
      className={`
                relative p-2 rounded-lg border min-h-[180px] sm:min-h-[200px] transition-all-app transform
                hover:shadow-lg hover:scale-[1.02] hover:z-10
                ${day.isCurrentMonth ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-900/50'}
                ${day.isWeekend && day.isCurrentMonth ? 'bg-indigo-50/70 dark:bg-indigo-900/20' : ''}
                ${day.isToday ? 'border-2 border-blue-500' : 'border-slate-200 dark:border-slate-700'}
                ${isHoliday ? 'ring-2 ring-rose-400 ring-offset-1' : ''}
            `}
      id={`department-day-${getDateString(day.date)}`}
    >
      {/* Holiday indicator */}
      {isHoliday && (
        <span className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-full font-medium">
          🎊 Lễ
        </span>
      )}
      <span
        className={`
                absolute top-1.5 right-1.5 text-xs sm:text-sm font-semibold transition-colors
                ${day.isCurrentMonth ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}
                ${day.isToday ? 'bg-blue-500 text-white rounded-full h-6 w-6 flex items-center justify-center' : ''}
            `}
      >
        {day.date.getDate()}
      </span>

      <div className="mt-6 text-xs sm:text-sm">
        {day.isCurrentMonth && !isBeforeStartDate ? (
          <div className="space-y-2">
            {onCallDoctors && (
              <div>
                <h5 className="font-bold text-slate-600 dark:text-slate-500 mb-1">Trực chính</h5>
                <ul className="space-y-0.5 text-slate-600 dark:text-slate-400 pl-2">
                  {onCallDoctors.map((doctor, docIndex) => (
                    <li key={docIndex} className="truncate" title={doctor}>
                      <span className="font-medium text-slate-400 dark:text-slate-500">
                        {docIndex + 1}.
                      </span>{' '}
                      {doctor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!day.isWeekend && (
              <div>
                <div className="border-t my-2 border-slate-200 dark:border-slate-700"></div>
                <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                  <RoleAssignment
                    role="ungTruc"
                    label="Ứng trực"
                    assignments={assignments}
                    onEdit={(e) => onOpenEditor(e, day.date, 'ungTruc')}
                  />
                  <RoleAssignment
                    role="pkdk"
                    label="PKĐK"
                    assignments={assignments}
                    onEdit={(e) => onOpenEditor(e, day.date, 'pkdk')}
                  />
                  {showPkdv && (
                    <RoleAssignment
                      role="pkdv"
                      label="PKDV"
                      assignments={assignments}
                      onEdit={(e) => onOpenEditor(e, day.date, 'pkdv')}
                    />
                  )}
                </ul>
              </div>
            )}
          </div>
        ) : day.isCurrentMonth && isBeforeStartDate ? (
          <div className="text-slate-400 dark:text-slate-500 text-center mt-4">Chưa có lịch</div>
        ) : null}
      </div>
    </div>
  );
};

export default DepartmentDayCell;
