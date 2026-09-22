import React, { useMemo, useState } from 'react';
import { ScheduleCalendarDay } from '../../types';
import { XIcon } from '../icons/XIcon';
import { FatigueAlertIcon } from '../icons/FatigueAlertIcon';

interface SafetyViolationItem {
  type: 'critical' | 'warning';
  doctor: string;
  day: ScheduleCalendarDay;
  previousShiftDate: Date;
  daysBetween: number;
}

interface RestSafetyCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendarGrid: ScheduleCalendarDay[];
  currentDate: Date;
  onJumpToDate: (date: Date) => void;
  onDoctorClick?: (day: ScheduleCalendarDay, doctorIndex: number, doctorName: string) => void;
  canEdit?: boolean;
}

export const RestSafetyCheckerModal: React.FC<RestSafetyCheckerModalProps> = ({
  isOpen,
  onClose,
  calendarGrid,
  currentDate,
  onJumpToDate,
  onDoctorClick,
  canEdit = false,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'critical' | 'warning'>('all');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Extract all rest & fatigue violations in the month
  const violations = useMemo<SafetyViolationItem[]>(() => {
    const list: SafetyViolationItem[] = [];

    calendarGrid.forEach((day) => {
      if (!day.isCurrentMonth || !day.doctors) return;

      // 1. Critical: Post-duty warnings (Duty on Day N and Day N-1)
      day.postDutyWarningDoctors.forEach((doctor) => {
        const prevDate = new Date(day.date);
        prevDate.setDate(prevDate.getDate() - 1);
        list.push({
          type: 'critical',
          doctor,
          day,
          previousShiftDate: prevDate,
          daysBetween: 0,
        });
      });

      // 2. Warning: Fatigue warnings (Duty on Day N and Day N-2)
      day.fatigueWarningDoctors.forEach((doctor) => {
        const prevDate = new Date(day.date);
        prevDate.setDate(prevDate.getDate() - 2);
        list.push({
          type: 'warning',
          doctor,
          day,
          previousShiftDate: prevDate,
          daysBetween: 1,
        });
      });
    });

    // Sort by date ascending, then critical first
    return list.sort((a, b) => {
      const timeDiff = a.day.date.getTime() - b.day.date.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.type === 'critical' ? -1 : 1;
    });
  }, [calendarGrid]);

  const criticalViolations = useMemo(
    () => violations.filter((v) => v.type === 'critical'),
    [violations],
  );
  const fatigueViolations = useMemo(
    () => violations.filter((v) => v.type === 'warning'),
    [violations],
  );

  const filteredViolations = useMemo(() => {
    if (filterType === 'critical') return criticalViolations;
    if (filterType === 'warning') return fatigueViolations;
    return violations;
  }, [filterType, violations, criticalViolations, fatigueViolations]);

  if (!isOpen) return null;

  const handleJump = (date: Date) => {
    onJumpToDate(date);
    onClose();
  };

  const handleCopyReport = () => {
    const monthStr = `Tháng ${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
    let text = `📋 BÁO CÁO KIỂM TOÁN AN TOÀN NGHỈ NGƠI - ${monthStr}\n`;
    text += `Đơn vị: Khối Ngoại\n`;
    text += `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}\n\n`;

    if (violations.length === 0) {
      text += `✅ 100% Kíp trực trong tháng đảm bảo thời gian nghỉ ngơi an toàn theo chuẩn lâm sàng.\n`;
    } else {
      text += `⚠️ Phát hiện ${violations.length} trường hợp cần lưu ý (${criticalViolations.length} trực liền ngày, ${fatigueViolations.length} nghỉ ngắn):\n\n`;

      if (criticalViolations.length > 0) {
        text += `🔴 TRỰC LIỀN 2 NGÀY (Cực kỳ nghiêm trọng - Không có thời gian ra trực):\n`;
        criticalViolations.forEach((item, idx) => {
          const dateStr = item.day.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
          const prevStr = item.previousShiftDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
          text += `  ${idx + 1}. ${item.doctor}: Trực ngày ${prevStr} ➔ Trực tiếp ngày ${dateStr} (Tua ${item.day.tourName || 'N/A'})\n`;
        });
        text += `\n`;
      }

      if (fatigueViolations.length > 0) {
        text += `🟡 NGHỈ NGẮN 1 NGÀY (Mới ra trực 1 ngày đã trực lại):\n`;
        fatigueViolations.forEach((item, idx) => {
          const dateStr = item.day.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
          const prevStr = item.previousShiftDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
          text += `  ${idx + 1}. ${item.doctor}: Trực ngày ${prevStr} ➔ Trực lại ngày ${dateStr} (Chỉ nghỉ 1 ngày)\n`;
        });
      }
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 p-0 sm:p-4 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="safety-checker-title"
    >
      <div
        className="w-full max-w-xl rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <span className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Modal Header */}
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-extrabold text-base">
              🛡️
            </span>
            <div className="min-w-0">
              <h2 id="safety-checker-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                Trợ lý An toàn Nghỉ ngơi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Rà soát phục hồi kíp trực · Tháng {currentDate.getMonth() + 1}, {currentDate.getFullYear()}
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

        {/* Status Banner */}
        <div className="p-4 sm:px-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40">
          {violations.length === 0 ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-3.5 dark:border-emerald-700/60 dark:bg-emerald-950/40 flex items-start gap-3">
              <span className="text-xl">✅</span>
              <div>
                <h3 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-200">
                  100% Đạt chuẩn an toàn nghỉ ngơi!
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
                  Không phát hiện bác sĩ nào bị xếp trực 2 ngày liên tiếp hoặc thiếu thời gian phục hồi sau ca trực 24h.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-rose-300 bg-rose-50/80 p-3.5 dark:border-rose-700/60 dark:bg-rose-950/40 flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h3 className="text-sm font-extrabold text-rose-950 dark:text-rose-200">
                  Phát hiện {violations.length} ca vi phạm cần lưu ý
                </h3>
                <p className="text-xs text-rose-900 dark:text-rose-300 mt-0.5 leading-relaxed">
                  Gồm <strong>{criticalViolations.length} ca trực liền ngày</strong> (chưa ra trực) và{' '}
                  <strong>{fatigueViolations.length} ca nghỉ ngắn 1 ngày</strong>. Hãy kiểm tra và điều chỉnh trước khi công bố lịch.
                </p>
              </div>
            </div>
          )}

          {/* Filter Pills if violations exist */}
          {violations.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                  filterType === 'all'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Tất cả ({violations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('critical')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                  filterType === 'critical'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                }`}
              >
                🔴 Trực liền ngày ({criticalViolations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('warning')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                  filterType === 'warning'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                }`}
              >
                🟡 Nghỉ ngắn ({fatigueViolations.length})
              </button>
            </div>
          )}
        </div>

        {/* Modal List Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 space-y-2.5">
          {filteredViolations.map((item, index) => {
            const isCritical = item.type === 'critical';
            const dateStr = item.day.date.toLocaleDateString('vi-VN', {
              weekday: 'short',
              day: '2-digit',
              month: '2-digit',
            });
            const prevStr = item.previousShiftDate.toLocaleDateString('vi-VN', {
              weekday: 'short',
              day: '2-digit',
              month: '2-digit',
            });

            return (
              <div
                key={`${item.doctor}-${item.day.date.toISOString()}-${index}`}
                className={`rounded-xl border p-3.5 transition-all ${
                  isCritical
                    ? 'border-rose-300 bg-rose-50/40 dark:border-rose-800/70 dark:bg-rose-950/20'
                    : 'border-amber-300 bg-amber-50/40 dark:border-amber-800/70 dark:bg-amber-950/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        {item.doctor}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-extrabold ${
                          isCritical
                            ? 'bg-rose-100 text-rose-950 border border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-700'
                            : 'bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700'
                        }`}
                      >
                        <FatigueAlertIcon className="h-3.5 w-3.5" />
                        {isCritical ? 'Trực 2 ngày liên tiếp' : 'Nghỉ 1 ngày trực lại'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Ca trước: <strong>{prevStr}</strong> ➔ Ca này: <strong>{dateStr}</strong>{' '}
                      {item.day.tourName && `(Tua ${item.day.tourName})`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleJump(item.day.date)}
                    className="shrink-0 rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-100 dark:border-teal-700 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900 transition-colors"
                    title="Nhảy đến ô ngày này trên lịch"
                  >
                    Xem ô lịch
                  </button>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="leading-snug">
                    {isCritical
                      ? '⚠️ Bác sĩ chưa ra trực sau ca 24h, nguy cơ kiệt sức cao.'
                      : 'ℹ️ Nên bố trí thêm 1 ngày nghỉ trước khi vào ca trực mới nếu có thể.'}
                  </span>

                  {canEdit && onDoctorClick && item.day.doctors && (
                    <button
                      type="button"
                      onClick={() => {
                        const docIdx = item.day.doctors?.indexOf(item.doctor) ?? -1;
                        if (docIdx !== -1) {
                          onDoctorClick(item.day, docIdx, item.doctor);
                          onClose();
                        }
                      }}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 ml-2"
                    >
                      Đổi bác sĩ ca này
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Action Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 px-4 py-3 sm:px-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyReport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <span>{copiedNotification ? 'Đã sao chép! ✓' : '📋 Sao chép báo cáo kiểm toán'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-xs sm:text-sm font-bold shadow-xs transition-colors"
          >
            Đóng
          </button>
        </footer>
      </div>
    </div>
  );
};

export default RestSafetyCheckerModal;
