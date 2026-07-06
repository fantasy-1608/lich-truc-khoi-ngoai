import React, { useState, useEffect, useMemo } from 'react';
import { DepartmentAssignments } from '../../types';

// Helper to get date string in YYYY-MM-DD format using local time components
const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
import { XIcon } from '../icons/XIcon';

type Stats = Record<
  string,
  { trucChinh: number; ungTruc: number; pkdk: number; pkdv: number; totalScore: number }
>;

interface StatsModalProps {
  currentDate: Date;
  departmentAssignments: Record<string, Partial<DepartmentAssignments>>;
  allDoctors: string[];
  getDoctorsForDate: (date: Date) => string[] | undefined;
  title?: string;
  mode?: 'score' | 'directOnly';
  onClose: () => void;
}

const SCORING = {
  TRUC_CHINH: 2.0,
  UNG_TRUC: 1.0,
  PK: 1.5,
};

const getDirectCountThresholds = (maxDirectShifts: number) => ({
  target: Math.max(1, Math.ceil(maxDirectShifts * 0.85)),
  average: Math.max(1, Math.ceil(maxDirectShifts * 0.6)),
});

const getDirectCountTone = (
  count: number,
  thresholds: ReturnType<typeof getDirectCountThresholds>,
): string => {
  if (count >= thresholds.target) {
    return 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700/70 dark:bg-emerald-900/40 dark:text-emerald-200';
  }
  if (count >= thresholds.average) {
    return 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-700/70 dark:bg-amber-900/40 dark:text-amber-200';
  }
  return 'border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-700/70 dark:bg-rose-900/40 dark:text-rose-200';
};

const getDirectCountBarTone = (
  count: number,
  thresholds: ReturnType<typeof getDirectCountThresholds>,
): string => {
  if (count >= thresholds.target) return 'bg-emerald-500 dark:bg-emerald-400';
  if (count >= thresholds.average) return 'bg-amber-500 dark:bg-amber-400';
  return 'bg-rose-500 dark:bg-rose-400';
};

const StatsModal: React.FC<StatsModalProps> = ({
  currentDate,
  departmentAssignments,
  allDoctors,
  getDoctorsForDate,
  title = 'Thống kê & Cân bằng công việc',
  mode = 'score',
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200); // Wait for animation
  };

  const { stats, averageScore } = useMemo(() => {
    const stats: Stats = {};
    allDoctors.forEach((doc) => {
      stats[doc] = { trucChinh: 0, ungTruc: 0, pkdk: 0, pkdv: 0, totalScore: 0 };
    });

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month, day);
      const dateString = getDateString(date);

      // 1. Tính Trực chính
      const onCallDocs = getDoctorsForDate(date) || [];
      onCallDocs.forEach((doc) => {
        if (stats[doc]) stats[doc].trucChinh++;
      });

      // 2. Tính Hoạt động khoa
      const assignments = departmentAssignments[dateString];
      if (assignments) {
        (assignments.ungTruc || []).forEach((doc) => {
          if (stats[doc]) stats[doc].ungTruc++;
        });
        (assignments.pkdk || []).forEach((doc) => {
          if (stats[doc]) stats[doc].pkdk++;
        });
        (assignments.pkdv || []).forEach((doc) => {
          if (stats[doc]) stats[doc].pkdv++;
        });
      }
    }

    // 3. Tính Điểm tổng kết cho từng BS
    let totalScoreSum = 0;
    const activeStats: Stats = {};

    Object.entries(stats).forEach(([doc, data]) => {
      data.totalScore =
        mode === 'directOnly'
          ? data.trucChinh
          : data.trucChinh * SCORING.TRUC_CHINH +
            data.ungTruc * SCORING.UNG_TRUC +
            data.pkdk * SCORING.PK +
            data.pkdv * SCORING.PK;

      if ((mode === 'directOnly' ? data.trucChinh : data.totalScore) > 0) {
        activeStats[doc] = data;
        totalScoreSum += data.totalScore;
      }
    });

    const avg =
      Object.keys(activeStats).length > 0 ? totalScoreSum / Object.keys(activeStats).length : 0;

    return { stats: activeStats, averageScore: avg };
  }, [currentDate, departmentAssignments, allDoctors, getDoctorsForDate, mode]);

  const sortedStats = useMemo(
    () =>
      Object.entries(stats).sort((a, b) =>
        mode === 'directOnly' ? b[1].trucChinh - a[1].trucChinh : b[1].totalScore - a[1].totalScore,
      ),
    [stats, mode],
  );

  const maxDirectShifts = useMemo(
    () => Math.max(1, ...sortedStats.map(([, data]) => data.trucChinh)),
    [sortedStats],
  );

  const directCountThresholds = useMemo(
    () => getDirectCountThresholds(maxDirectShifts),
    [maxDirectShifts],
  );

  const directCountGroups = useMemo(() => {
    if (mode !== 'directOnly') return [];

    return [
      {
        key: 'target',
        label: 'Đạt chỉ tiêu',
        dotClass: 'bg-emerald-500',
        headerClass:
          'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-200',
        items: sortedStats.filter(([, data]) => data.trucChinh >= directCountThresholds.target),
      },
      {
        key: 'average',
        label: 'Trung bình',
        dotClass: 'bg-amber-500',
        headerClass:
          'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-200',
        items: sortedStats.filter(
          ([, data]) =>
            data.trucChinh >= directCountThresholds.average &&
            data.trucChinh < directCountThresholds.target,
        ),
      },
      {
        key: 'low',
        label: 'Quá ít',
        dotClass: 'bg-rose-500',
        headerClass:
          'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/60 dark:bg-rose-900/20 dark:text-rose-200',
        items: sortedStats.filter(([, data]) => data.trucChinh < directCountThresholds.average),
      },
    ];
  }, [directCountThresholds, mode, sortedStats]);

  const emptyColSpan = mode === 'directOnly' ? 2 : 6;

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/30 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full ${mode === 'directOnly' ? 'max-w-5xl' : 'max-w-2xl'} max-h-[85vh] flex flex-col transition-all-app duration-200 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Tháng {currentDate.getMonth() + 1}/{currentDate.getFullYear()}
              {mode === 'score' && <> (ĐTB: {averageScore.toFixed(1)}đ)</>}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-all-app"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {mode === 'score' && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-400 border-b dark:border-amber-900/30">
            <span className="font-bold uppercase mr-2">Hệ số điểm:</span>
            Trực chính: {SCORING.TRUC_CHINH}đ | Ứng trực: {SCORING.UNG_TRUC}đ | PK: {SCORING.PK}đ.
          </div>
        )}

        <div className="p-4 overflow-y-auto">
          {Object.keys(stats).length === 0 ? (
            <div className="px-6 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Không có dữ liệu thống kê cho tháng này.
            </div>
          ) : mode === 'directOnly' ? (
            <div className="grid gap-3 lg:grid-cols-3">
              {directCountGroups.map((group) => (
                <section
                  key={group.key}
                  aria-label={group.label}
                  className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className={`border-b px-3 py-2.5 text-xs font-bold ${group.headerClass}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${group.dotClass}`}
                        aria-hidden="true"
                      />
                      <span className="shrink-0">{group.items.length} BS</span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {group.items.map(([doctor, data]) => (
                      <div
                        key={doctor}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900 dark:text-white">
                            {doctor}
                          </div>
                          <div
                            className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
                            aria-hidden="true"
                          >
                            <div
                              className={`h-full rounded-full ${getDirectCountBarTone(
                                data.trucChinh,
                                directCountThresholds,
                              )}`}
                              style={{
                                width: `${Math.max((data.trucChinh / maxDirectShifts) * 100, 8)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span
                          className={`inline-flex min-w-12 justify-center rounded-full border px-2.5 py-1 text-sm font-bold ${getDirectCountTone(
                            data.trucChinh,
                            directCountThresholds,
                          )}`}
                        >
                          {data.trucChinh}/{maxDirectShifts}
                        </span>
                      </div>
                    ))}
                    {group.items.length === 0 && (
                      <div className="px-3 py-4 text-sm italic text-slate-400">
                        Không có bác sĩ trong nhóm này.
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-3 sticky left-0 bg-slate-50 dark:bg-slate-700">
                    Bác sĩ
                  </th>
                  <th scope="col" className="px-2 py-3 text-center">
                    Trực
                  </th>
                  <th scope="col" className="px-2 py-3 text-center">
                    ƯT
                  </th>
                  <th scope="col" className="px-2 py-3 text-center">
                    ĐK
                  </th>
                  <th scope="col" className="px-2 py-3 text-center">
                    DV
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Tổng điểm
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedStats.map(([doctor, data]) => {
                  const isBusy = data.totalScore > averageScore * 1.25;
                  const isLight = data.totalScore < averageScore * 0.75;

                  return (
                    <tr
                      key={doctor}
                      className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                    >
                      <th
                        scope="row"
                        className="px-4 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white sticky left-0 bg-white dark:bg-slate-800"
                      >
                        {doctor}
                        {mode === 'score' && isBusy && (
                          <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] rounded animate-pulse">
                            Quá tải
                          </span>
                        )}
                        {mode === 'score' && isLight && (
                          <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[10px] rounded">
                            Ít việc
                          </span>
                        )}
                      </th>
                      <td className="px-2 py-4 text-center">{data.trucChinh}</td>
                      <td className="px-2 py-4 text-center">{data.ungTruc}</td>
                      <td className="px-2 py-4 text-center">{data.pkdk}</td>
                      <td className="px-2 py-4 text-center">{data.pkdv}</td>
                      <td
                        className={`px-4 py-4 text-right font-bold ${isBusy ? 'text-red-500' : isLight ? 'text-blue-500' : 'text-slate-700 dark:text-slate-300'}`}
                      >
                        {data.totalScore.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {mode === 'score' && (
          <div className="p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center text-xs">
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                <span>{'>'} 25% ĐTB</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                <span>{'<'} 25% ĐTB</span>
              </div>
            </div>
            <p className="italic text-slate-400">Sắp xếp theo thứ tự ưu tiên công việc</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsModal;
