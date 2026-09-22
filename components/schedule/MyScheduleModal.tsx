import React, { useMemo, useState, useEffect } from 'react';
import { Doctor, ScheduleCalendarDay, DepartmentAssignments } from '../../types';
import { XIcon } from '../icons/XIcon';
import { CalendarIcon } from '../icons/CalendarIcon';
import { FatigueAlertIcon } from '../icons/FatigueAlertIcon';
import { generateDoctorICS, downloadICSFile } from '../../utils/icsExport';

interface MyScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  allDoctors: Doctor[];
  calendarGrid: ScheduleCalendarDay[];
  currentDate: Date;
  myDoctorName: string | null;
  onSelectMyDoctor: (doctorName: string) => void;
  onSpotlightDoctor: (doctorName: string) => void;
  onRequestShiftChange?: (day: ScheduleCalendarDay, doctorName: string) => void;
  onJumpToDate?: (date: Date) => void;
  getDoctorsForDate?: (date: Date) => string[] | undefined;
  departmentAssignments?: Record<string, Partial<DepartmentAssignments>>;
}

export const MyScheduleModal: React.FC<MyScheduleModalProps> = ({
  isOpen,
  onClose,
  allDoctors,
  calendarGrid,
  currentDate,
  myDoctorName,
  onSelectMyDoctor,
  onSpotlightDoctor,
  onRequestShiftChange,
  onJumpToDate,
  getDoctorsForDate = () => undefined,
  departmentAssignments = {},
}) => {
  const [isChangingDoctor, setIsChangingDoctor] = useState(false);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Auto open selection if no doctor saved yet
  useEffect(() => {
    if (isOpen && !myDoctorName) {
      setIsChangingDoctor(true);
    } else {
      setIsChangingDoctor(false);
    }
  }, [isOpen, myDoctorName]);

  // Filter shifts in current month for this doctor
  const myShiftsInMonth = useMemo(() => {
    if (!myDoctorName) return [];
    return calendarGrid.filter(
      (day) =>
        day.isCurrentMonth &&
        day.doctors &&
        day.doctors.some((d) => d.trim().toLowerCase() === myDoctorName.trim().toLowerCase()),
    );
  }, [calendarGrid, myDoctorName]);

  // Find next shift relative to today
  const nextShift = useMemo(() => {
    if (myShiftsInMonth.length === 0) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Look for first shift today or in future
    const upcoming = myShiftsInMonth.find((day) => {
      const shiftDate = new Date(day.date);
      shiftDate.setHours(0, 0, 0, 0);
      return shiftDate >= now;
    });

    return upcoming || myShiftsInMonth[0];
  }, [myShiftsInMonth]);

  // Countdown text for next shift
  const nextShiftCountdown = useMemo(() => {
    if (!nextShift) return '';
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const shiftDate = new Date(nextShift.date);
    shiftDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((shiftDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hôm nay trực!';
    if (diffDays === 1) return 'Ngày mai trực';
    if (diffDays > 1) return `Còn ${diffDays} ngày nữa`;
    return 'Ca gần nhất';
  }, [nextShift]);

  // Doctor search in picker
  const filteredDoctors = useMemo(() => {
    if (!doctorSearchQuery.trim()) return allDoctors;
    const q = doctorSearchQuery.toLowerCase();
    return allDoctors.filter((doc) => doc.name.toLowerCase().includes(q));
  }, [allDoctors, doctorSearchQuery]);

  if (!isOpen) return null;

  const handleExportMyICS = () => {
    if (!myDoctorName) return;
    const icsContent = generateDoctorICS(
      myDoctorName,
      calendarGrid,
      getDoctorsForDate,
      departmentAssignments,
    );
    const cleanName = myDoctorName.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    downloadICSFile(`Lich_truc_${cleanName}_T${month}_${currentDate.getFullYear()}.ics`, icsContent);
  };

  const handleSpotlight = () => {
    if (myDoctorName) {
      onSpotlightDoctor(myDoctorName);
      onClose();
    }
  };

  const handleJump = (date: Date) => {
    if (onJumpToDate) {
      onJumpToDate(date);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 p-0 sm:p-4 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-schedule-title"
    >
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag bar handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <span className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Modal Header */}
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-extrabold text-base">
              👤
            </span>
            <div className="min-w-0">
              <h2 id="my-schedule-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                Lịch trực của tôi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Tháng {currentDate.getMonth() + 1}, {currentDate.getFullYear()}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label="Đóng"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </header>

        {/* Doctor Identity Header / Switcher */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-4 py-2.5 sm:px-5 flex items-center justify-between gap-3">
          {myDoctorName && !isChangingDoctor ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">Bác sĩ:</span>
                <span className="font-extrabold text-sm text-teal-700 dark:text-teal-300 truncate">
                  {myDoctorName}
                </span>
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-700">
                  {myShiftsInMonth.length} ca trực
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsChangingDoctor(true)}
                className="text-xs font-bold text-teal-700 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200 hover:underline shrink-0 py-1 px-2"
              >
                Đổi bác sĩ
              </button>
            </>
          ) : (
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Chọn tên của bạn để xem lịch riêng:
                </span>
                {myDoctorName && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectMyDoctor('');
                        setIsChangingDoctor(false);
                      }}
                      className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold"
                      title="Xóa thông tin bác sĩ đã lưu trên máy này"
                    >
                      Xóa lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChangingDoctor(false)}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:underline font-semibold"
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </div>
              <input
                type="search"
                value={doctorSearchQuery}
                onChange={(e) => setDoctorSearchQuery(e.target.value)}
                placeholder="Tìm tên bác sĩ..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                autoFocus
              />
              <div className="max-h-40 overflow-y-auto grid grid-cols-2 gap-1.5 pt-1">
                {filteredDoctors.map((doc) => (
                  <button
                    type="button"
                    key={doc.id}
                    onClick={() => {
                      onSelectMyDoctor(doc.name);
                      setIsChangingDoctor(false);
                      setDoctorSearchQuery('');
                    }}
                    className={`text-left px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors border ${
                      myDoctorName === doc.name
                        ? 'bg-teal-600 text-white border-teal-700'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-teal-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {doc.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Body - Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 space-y-4">
          {myDoctorName ? (
            <>
              {/* Next Shift Hero Card */}
              {nextShift && (
                <div className="rounded-xl border-2 border-teal-500/70 bg-gradient-to-br from-teal-50/90 to-emerald-50/50 dark:from-teal-950/60 dark:to-slate-900/90 p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-teal-600 text-white shadow-xs">
                      ⚡ {nextShiftCountdown}
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Ca trực kế tiếp
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                      {nextShift.date.toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </span>
                    {nextShift.tourName && (
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-indigo-100 text-indigo-950 border border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-500/70">
                        Tua {nextShift.tourName}
                      </span>
                    )}
                  </div>

                  {nextShift.doctors && (
                    <div className="pt-2 border-t border-teal-200/80 dark:border-teal-800/60 text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                        Kíp trực cùng ngày:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {nextShift.doctors.map((d, i) => (
                          <span
                            key={d}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                              d === myDoctorName
                                ? 'bg-teal-600 text-white font-extrabold shadow-xs ring-1 ring-teal-400/60'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {i + 1}. {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Monthly Schedule Timeline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Toàn bộ ca trực trong tháng ({myShiftsInMonth.length})
                  </h3>
                </div>

                {myShiftsInMonth.length > 0 ? (
                  <div className="space-y-2.5">
                    {myShiftsInMonth.map((day) => {
                      const isSunday = day.date.getDay() === 0;
                      const isSaturday = day.date.getDay() === 6;
                      const isPostDuty = day.postDutyWarningDoctors.includes(myDoctorName);
                      const isFatigue = day.fatigueWarningDoctors.includes(myDoctorName);

                      return (
                        <div
                          key={day.date.toISOString()}
                          className={`rounded-xl border p-3.5 transition-all shadow-xs ${
                            day.isToday
                              ? 'border-teal-500 bg-teal-50/70 dark:border-teal-500/80 dark:bg-teal-950/40'
                              : 'border-slate-200 bg-white dark:border-slate-700/80 dark:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`text-sm font-extrabold tracking-tight ${
                                  isSunday
                                    ? 'text-rose-700 dark:text-rose-300'
                                    : isSaturday
                                      ? 'text-sky-700 dark:text-sky-300'
                                      : 'text-slate-900 dark:text-slate-100'
                                }`}
                              >
                                {day.date.toLocaleDateString('vi-VN', {
                                  weekday: 'short',
                                  day: '2-digit',
                                  month: '2-digit',
                                })}
                              </span>
                              {day.isToday && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-teal-600 text-white shadow-xs">
                                  Hôm nay
                                </span>
                              )}
                              {isPostDuty && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-950 border border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-700">
                                  <FatigueAlertIcon className="h-3 w-3" /> Ra trực
                                </span>
                              )}
                              {isFatigue && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700">
                                  <FatigueAlertIcon className="h-3 w-3" /> Nghỉ ngắn
                                </span>
                              )}
                            </div>

                            {day.tourName && (
                              <span className="px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-indigo-100 text-indigo-950 border border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-500/70">
                                Tua {day.tourName}
                              </span>
                            )}
                          </div>

                          {day.doctors && (
                            <div className="mt-2.5 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                              <span className="truncate font-medium">
                                Kíp {day.doctors.length} BS:{' '}
                                <span className="text-slate-600 dark:text-slate-300">
                                  {day.doctors.filter((d) => d !== myDoctorName).join(', ')}
                                </span>
                              </span>
                              <div className="flex items-center gap-2.5 shrink-0 ml-2">
                                <button
                                  type="button"
                                  onClick={() => handleJump(day.date)}
                                  className="text-xs font-bold text-teal-700 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200 hover:underline px-1 py-0.5"
                                  title="Xem ngày này trên lịch tháng"
                                >
                                  Xem ô lịch
                                </button>
                                {onRequestShiftChange && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onRequestShiftChange(day, myDoctorName);
                                      onClose();
                                    }}
                                    className="text-xs font-bold text-indigo-700 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-200 hover:underline px-1 py-0.5"
                                  >
                                    Đổi ca
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-xs">
                    Không có ca trực nào trong tháng này.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400 text-sm">
              Vui lòng chọn tên bác sĩ ở trên để hiển thị lịch cá nhân.
            </div>
          )}
        </div>

        {/* Modal Action Footer - Mobile Thumb Friendly */}
        {myDoctorName && (
          <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 px-4 py-3 sm:px-5 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportMyICS}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 text-xs sm:text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              <CalendarIcon className="h-4 w-4" />
              <span>Lưu vào lịch điện thoại (.ics)</span>
            </button>

            <button
              type="button"
              onClick={handleSpotlight}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold py-2.5 px-4 text-xs sm:text-sm transition-colors"
            >
              <span>Xem trên lưới tháng</span>
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};

export default MyScheduleModal;
