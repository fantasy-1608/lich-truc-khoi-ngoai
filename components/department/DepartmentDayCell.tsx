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
  variant?: 'grid' | 'list';
  showLabel?: boolean;
  colorTheme?: 'emerald' | 'sky' | 'violet' | 'blue';
}

const themeClasses = {
  emerald: {
    pill: 'text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/15 hover:bg-emerald-200 dark:hover:bg-emerald-500/25',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  sky: {
    pill: 'text-sky-800 dark:text-sky-300 bg-sky-100 dark:bg-sky-500/15 hover:bg-sky-200 dark:hover:bg-sky-500/25',
    icon: 'text-sky-600 dark:text-sky-400',
  },
  violet: {
    pill: 'text-violet-800 dark:text-violet-300 bg-violet-100 dark:bg-violet-500/15 hover:bg-violet-200 dark:hover:bg-violet-500/25',
    icon: 'text-violet-600 dark:text-violet-400',
  },
  blue: {
    pill: 'text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/15 hover:bg-blue-200 dark:hover:bg-blue-500/25',
    icon: 'text-blue-600 dark:text-blue-400',
  },
};

export const RoleAssignment: React.FC<RoleAssignmentProps> = ({
  role,
  label,
  assignments,
  onEdit,
  variant = 'grid',
  showLabel = true,
  colorTheme = 'blue',
}) => {
  const doctors = assignments?.[role] || [];
  const isList = variant === 'list';
  const theme = themeClasses[colorTheme];

  return (
    <div
      className={`group flex ${isList ? 'min-h-[24px] items-center' : 'min-h-[34px] items-center'}`}
    >
      {showLabel && (
        <span
          className={`shrink-0 font-semibold text-slate-500 dark:text-slate-400 ${isList ? 'w-24' : 'w-14'}`}
        >
          {label}:
        </span>
      )}
      <div className="flex min-w-0 flex-grow flex-wrap items-center gap-1">
        {doctors.length > 0 ? (
          doctors.map((doc) => (
            <span
              key={doc}
              onClick={onEdit}
              className={`font-medium px-1.5 py-0.5 rounded-md text-xs cursor-pointer transition-all-app ${theme.pill}`}
            >
              {doc}
            </span>
          ))
        ) : (
          <span className="text-slate-400 dark:text-slate-500 italic text-xs">Chưa có</span>
        )}
        <button
          onClick={onEdit}
          className="sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity ml-1 p-1 rounded-md bg-slate-100 sm:bg-transparent dark:bg-slate-700 sm:dark:bg-transparent hover:bg-slate-200 dark:hover:bg-slate-600"
          aria-label={`Thêm bác sĩ ${label}`}
        >
          <PlusIcon className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${theme.icon}`} />
        </button>
      </div>
    </div>
  );
};

interface DepartmentDayCellProps {
  day: CalendarDay;
  assignments: Partial<DepartmentAssignments> | undefined;
  onCallDoctors: string[] | undefined;
  showPkdv: boolean;
  onOpenEditor: (e: React.MouseEvent, date: Date, role: DepartmentRole) => void;
  isHoliday?: boolean;
  variant?: 'grid' | 'list';
  viewMode?: 'default' | 'card';
  hoveredDoctor?: string | null;
  onHoverDoctor?: (doctorName: string | null) => void;
}

const DepartmentDayCell: React.FC<DepartmentDayCellProps> = ({
  day,
  assignments,
  onCallDoctors,
  showPkdv,
  onOpenEditor,
  isHoliday = false,
  variant = 'grid',
  viewMode = 'card',
  hoveredDoctor = null,
  onHoverDoctor = () => {},
}) => {
  const isBeforeStartDate = day.date.getTime() < START_DATE.getTime();
  
  const isDoctorActiveHere = hoveredDoctor && (
    (onCallDoctors && onCallDoctors.includes(hoveredDoctor)) ||
    (assignments?.ungTruc && assignments.ungTruc.includes(hoveredDoctor)) ||
    (assignments?.pkdk && assignments.pkdk.includes(hoveredDoctor)) ||
    (assignments?.pkdv && assignments.pkdv.includes(hoveredDoctor))
  );

  const getDoctorHighlightClass = (doc: string, currentClasses: string) => {
    if (!hoveredDoctor) return currentClasses;
    if (hoveredDoctor === doc) {
      return 'bg-blue-600 text-white dark:bg-blue-500 border-blue-600 shadow-md transition-all duration-200 ring-2 ring-blue-500/30';
    }
    return 'opacity-20 filter blur-[0.2px] transition-all duration-300 pointer-events-none';
  };
  const isList = variant === 'list';
  const formattedDate = day.date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (isList && (!day.isCurrentMonth || isBeforeStartDate)) {
    return null;
  }

  if (isList) {
    return (
      <article
        className={`
          rounded-2xl border bg-white p-4 shadow-sm transition-all-app dark:bg-slate-800
          ${day.isWeekend ? 'border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700'}
          ${day.isToday ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900' : ''}
          ${isHoliday ? 'ring-2 ring-rose-400 ring-offset-2 dark:ring-offset-slate-900' : ''}
        `}
        id={`department-day-${getDateString(day.date)}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold capitalize text-slate-800 dark:text-slate-100">
              {formattedDate}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {day.isWeekend && (
                <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200">
                  Cuối tuần
                </span>
              )}
              {isHoliday && (
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900/50 dark:text-rose-200">
                  Lễ
                </span>
              )}
            </div>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
            {day.date.getDate()}
          </span>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          {onCallDoctors && (
            <section>
              <h4 className="mb-2 font-bold text-slate-600 dark:text-slate-300">Trực chính</h4>
              <div className="grid grid-cols-2 gap-2">
                {onCallDoctors.map((doctor, docIndex) => (
                  <div
                    key={docIndex}
                    className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <span className="text-xs font-semibold text-slate-400">{docIndex + 1}</span>
                    <span className="truncate font-medium" title={doctor}>
                      {doctor}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!day.isWeekend && (
            <section>
              <h4 className="mb-2 font-bold text-slate-600 dark:text-slate-300">Hoạt động khoa</h4>
              <div className="space-y-2">
                <RoleAssignment
                  role="ungTruc"
                  label="Ứng trực"
                  assignments={assignments}
                  onEdit={(e) => onOpenEditor(e, day.date, 'ungTruc')}
                  variant="list"
                />
                <RoleAssignment
                  role="pkdk"
                  label="PKĐK"
                  assignments={assignments}
                  onEdit={(e) => onOpenEditor(e, day.date, 'pkdk')}
                  variant="list"
                />
                {showPkdv && (
                  <RoleAssignment
                    role="pkdv"
                    label="PKDV"
                    assignments={assignments}
                    onEdit={(e) => onOpenEditor(e, day.date, 'pkdv')}
                    variant="list"
                  />
                )}
              </div>
            </section>
          )}
        </div>
      </article>
    );
  }

  if (viewMode === 'card') {
    const roleThemeClasses = {
      ungTruc: {
        dot: 'bg-emerald-500',
        bg: 'bg-emerald-50/60 dark:bg-emerald-950/20',
        border: 'border-emerald-100 dark:border-emerald-900/40',
        text: 'text-emerald-700 dark:text-emerald-400',
        pill: 'text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/15 hover:bg-emerald-200 dark:hover:bg-emerald-500/25',
      },
      pkdk: {
        dot: 'bg-sky-500',
        bg: 'bg-sky-50/60 dark:bg-sky-950/20',
        border: 'border-sky-100 dark:border-sky-900/40',
        text: 'text-sky-700 dark:text-sky-400',
        pill: 'text-sky-800 dark:text-sky-300 bg-sky-100 dark:bg-sky-500/15 hover:bg-sky-200 dark:hover:bg-sky-500/25',
      },
      pkdv: {
        dot: 'bg-violet-500',
        bg: 'bg-violet-50/60 dark:bg-violet-950/20',
        border: 'border-violet-100 dark:border-violet-900/40',
        text: 'text-violet-700 dark:text-violet-400',
        pill: 'text-violet-800 dark:text-violet-300 bg-violet-100 dark:bg-violet-500/15 hover:bg-violet-200 dark:hover:bg-violet-500/25',
      },
    };

    const roleInfo = [
      { role: 'ungTruc' as DepartmentRole, label: 'Ứng trực', theme: roleThemeClasses.ungTruc },
      { role: 'pkdk' as DepartmentRole, label: 'PKĐK', theme: roleThemeClasses.pkdk },
      ...(showPkdv ? [{ role: 'pkdv' as DepartmentRole, label: 'PKDV', theme: roleThemeClasses.pkdv }] : []),
    ];

    return (
      <div
        className={`
          relative p-3 rounded-xl border transition-all duration-300 transform flex flex-col justify-between min-h-[220px]
          ${day.isCurrentMonth ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-900/50'}
          ${day.isWeekend && day.isCurrentMonth ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}
          ${day.isToday ? 'border-2 border-blue-500 shadow-md ring-1 ring-blue-500/30' : 'border-slate-200 dark:border-slate-700'}
          ${isHoliday ? 'ring-2 ring-rose-400 ring-offset-1' : ''}
          ${isDoctorActiveHere ? 'border-blue-400 dark:border-blue-500 shadow-xl scale-[1.03] z-10 bg-blue-50/30 dark:bg-blue-950/15 ring-4 ring-blue-500/10' : ''}
          ${hoveredDoctor && !isDoctorActiveHere ? 'opacity-40 scale-[0.98]' : ''}
        `}
        id={`department-day-${getDateString(day.date)}`}
      >
        {/* Top Header Row of Day Card */}
        <div className="flex items-center justify-between mb-2">
          {isHoliday ? (
            <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-full font-bold">
              🎊 Lễ
            </span>
          ) : day.isWeekend ? (
            <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full font-semibold">
              T7/CN
            </span>
          ) : (
            <span />
          )}
          <span
            className={`
              text-xs sm:text-sm font-bold h-6 w-6 flex items-center justify-center rounded-full
              ${day.isToday ? 'bg-blue-500 text-white' : 'text-slate-700 dark:text-slate-300'}
            `}
          >
            {day.date.getDate()}
          </span>
        </div>

        {/* Content Section */}
        <div className="flex-grow space-y-3">
          {/* Trực chính - Simplified */}
          {day.isCurrentMonth && !isBeforeStartDate && onCallDoctors && onCallDoctors.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <div className="text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm leading-relaxed space-y-0.5">
                {(() => {
                  const chunks = [];
                  for (let i = 0; i < onCallDoctors.length; i += 2) {
                    chunks.push(onCallDoctors.slice(i, i + 2));
                  }
                  return chunks.map((rowDocs, rowIndex) => (
                    <div key={rowIndex} className="flex flex-wrap gap-x-1">
                      {rowDocs.map((doc, docIndex) => {
                        const isAbsoluteLast = (rowIndex * 2 + docIndex) === onCallDoctors.length - 1;
                        return (
                          <span 
                            key={doc} 
                            onMouseEnter={() => onHoverDoctor(doc)}
                            onMouseLeave={() => onHoverDoctor(null)}
                            className={`whitespace-nowrap px-1 rounded cursor-pointer transition-all duration-200 ${getDoctorHighlightClass(doc, "text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800")}`}
                          >
                            {doc}{!isAbsoluteLast ? ',' : ''}
                          </span>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {day.isCurrentMonth && isBeforeStartDate && (
            <div className="text-slate-400 dark:text-slate-500 text-center text-xs italic py-2">
              Chưa bắt đầu
            </div>
          )}

          {/* Hoạt động khoa roles inside the day card */}
          {day.isCurrentMonth && !isBeforeStartDate && !day.isWeekend && (
            <div className="space-y-2">
              {roleInfo.map(({ role, label, theme }) => {
                const docs = assignments?.[role] || [];
                return (
                  <div 
                    key={role} 
                    className={`group flex flex-col p-1.5 rounded-lg border ${theme.bg} ${theme.border} transition-all-app`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                        {label}
                      </span>
                      <button
                        onClick={(e) => onOpenEditor(e, day.date, role)}
                        className="sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                        aria-label={`Thêm bác sĩ ${label}`}
                      >
                        <PlusIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 min-h-[1.25rem]">
                      {docs.length > 0 ? (
                        docs.map((doc) => (
                          <span
                            key={doc}
                            onClick={(e) => onOpenEditor(e, day.date, role)}
                            onMouseEnter={() => onHoverDoctor(doc)}
                            onMouseLeave={() => onHoverDoctor(null)}
                            className={`font-semibold px-1.5 py-0.5 rounded text-xs cursor-pointer transition-all duration-200 truncate ${getDoctorHighlightClass(doc, theme.pill)}`}
                            title={doc}
                          >
                            {doc}
                          </span>
                        ))
                      ) : (
                        <span 
                          onClick={(e) => onOpenEditor(e, day.date, role)}
                          className="text-slate-400 dark:text-slate-500 italic text-xs cursor-pointer hover:underline"
                        >
                          Chưa có
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
                relative p-2 rounded-lg border transition-all duration-300 transform
                hover:shadow-lg hover:scale-[1.02] hover:z-10
                ${day.isCurrentMonth ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-900/50'}
                ${day.isWeekend && day.isCurrentMonth ? 'bg-indigo-50/70 dark:bg-indigo-900/20' : ''}
                ${day.isToday ? 'border-2 border-blue-500' : 'border-slate-200 dark:border-slate-700'}
                ${isHoliday ? 'ring-2 ring-rose-400 ring-offset-1' : ''}
                ${isDoctorActiveHere ? 'border-blue-400 dark:border-blue-500 shadow-md bg-blue-50/30 dark:bg-blue-950/15 scale-[1.01] z-10' : ''}
                ${hoveredDoctor && !isDoctorActiveHere ? 'opacity-40 scale-[0.98]' : ''}
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
          <>
            {onCallDoctors && (
              <div>
                <h5 className="font-bold text-slate-600 dark:text-slate-500 mb-1">Trực chính</h5>
                <ul className="space-y-0.5 text-slate-600 dark:text-slate-400 pl-2">
                  {onCallDoctors.map((doctor, docIndex) => (
                    <li 
                      key={docIndex} 
                      onMouseEnter={() => onHoverDoctor(doctor)}
                      onMouseLeave={() => onHoverDoctor(null)}
                      className={`truncate cursor-pointer transition-all duration-200 ${getDoctorHighlightClass(doctor, "text-slate-600 dark:text-slate-400")}`} 
                      title={doctor}
                    >
                      <span className="font-medium text-slate-400 dark:text-slate-500">
                        {docIndex + 1}.
                      </span>{' '}
                      {doctor}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : day.isCurrentMonth && isBeforeStartDate ? (
          <div className="text-slate-400 dark:text-slate-500 text-center mt-4">Chưa có lịch</div>
        ) : null}
      </div>
    </div>
  );
};

export default DepartmentDayCell;
