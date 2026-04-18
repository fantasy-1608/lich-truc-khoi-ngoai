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
  onClose: () => void;
}

const SCORING = {
  TRUC_CHINH: 2.0,
  UNG_TRUC: 1.0,
  PK: 1.5,
};

const StatsModal: React.FC<StatsModalProps> = ({
  currentDate,
  departmentAssignments,
  allDoctors,
  getDoctorsForDate,
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
        data.trucChinh * SCORING.TRUC_CHINH +
        data.ungTruc * SCORING.UNG_TRUC +
        data.pkdk * SCORING.PK +
        data.pkdv * SCORING.PK;

      if (data.totalScore > 0) {
        activeStats[doc] = data;
        totalScoreSum += data.totalScore;
      }
    });

    const avg =
      Object.keys(activeStats).length > 0 ? totalScoreSum / Object.keys(activeStats).length : 0;

    return { stats: activeStats, averageScore: avg };
  }, [currentDate, departmentAssignments, allDoctors, getDoctorsForDate]);

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/30 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col transition-all-app duration-200 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Thống kê & Cân bằng công việc
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Tháng {currentDate.getMonth() + 1}/{currentDate.getFullYear()} (ĐTB:{' '}
              {averageScore.toFixed(1)}đ)
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-all-app"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-400 border-b dark:border-amber-900/30">
          <span className="font-bold uppercase mr-2">Hệ số điểm:</span>
          Trực chính: {SCORING.TRUC_CHINH}đ | Ứng trực: {SCORING.UNG_TRUC}đ | PK: {SCORING.PK}đ.
        </div>

        <div className="p-4 overflow-y-auto">
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
              {Object.keys(stats).length > 0 ? (
                Object.entries(stats)
                  .sort((a, b) => b[1].totalScore - a[1].totalScore)
                  .map(([doctor, data]) => {
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
                          {isBusy && (
                            <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] rounded animate-pulse">
                              Quá tải
                            </span>
                          )}
                          {isLight && (
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
                  })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">
                    Không có dữ liệu thống kê cho tháng này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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
      </div>
    </div>
  );
};

export default StatsModal;
