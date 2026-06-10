import React, { useEffect, useState } from 'react';
import { ShiftRequest, ShiftRequestStatus, ShiftRequestType } from '../../types';
import { XIcon } from '../icons/XIcon';

interface DayShiftRequestsModalProps {
  date: string;
  requests: ShiftRequest[];
  onClose: () => void;
  onUpdateReview: (id: string, status: ShiftRequestStatus, reviewNote: string) => Promise<void>;
}

const statusLabels: Record<ShiftRequestStatus, string> = {
  pending: 'Chờ xử lý',
  in_review: 'Đang xem',
  resolved: 'Đã xử lý',
  rejected: 'Từ chối',
};

const requestTypeLabels: Record<ShiftRequestType, string> = {
  off: 'Nghỉ trực',
  swap: 'Đổi trực',
  note: 'Ghi chú',
};

const formatDate = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const DayShiftRequestsModal: React.FC<DayShiftRequestsModalProps> = ({
  date,
  requests,
  onClose,
  onUpdateReview,
}) => {
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdate = async (request: ShiftRequest, status: ShiftRequestStatus) => {
    setUpdatingId(request.id);
    try {
      await onUpdateReview(request.id, status, reviewNotes[request.id] || request.reviewNote || '');
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      className="drawer-backdrop fixed inset-0 z-[75] flex items-end sm:items-stretch sm:justify-end bg-slate-950/45 backdrop-blur-[2px] p-0"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        className="drawer-panel w-full sm:w-[520px] lg:w-[620px] max-h-[92vh] sm:max-h-none sm:h-full overflow-y-auto bg-white dark:bg-slate-800 shadow-2xl rounded-t-2xl sm:rounded-none sm:rounded-l-2xl border border-slate-200 dark:border-slate-700"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-shift-requests-title"
      >
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-4">
          <div>
            <h3
              id="day-shift-requests-title"
              className="font-semibold text-slate-900 dark:text-white"
            >
              Yêu cầu trong ngày
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(date)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Đóng danh sách yêu cầu"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {requests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Không còn yêu cầu chờ xử lý trong ngày này.
            </div>
          ) : (
            requests.map((request) => (
              <article
                key={request.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {request.requesterDoctorName}
                  </span>
                  <span className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 text-xs font-semibold">
                    {requestTypeLabels[request.requestType]}
                  </span>
                  <span className="rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-xs font-semibold">
                    {statusLabels[request.status]}
                  </span>
                </div>

                {request.targetDate || request.targetDoctorName ? (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Muốn đổi với{' '}
                    {request.targetDate ? (
                      <span className="font-semibold">{formatDate(request.targetDate)}</span>
                    ) : null}
                    {request.targetDoctorName ? (
                      <>
                        {' '}
                        / <span className="font-semibold">{request.targetDoctorName}</span>
                      </>
                    ) : null}
                  </p>
                ) : null}

                <p className="mt-2 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                  {request.message}
                </p>
                {request.contact && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Liên hệ: {request.contact}
                  </p>
                )}

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                  <label className="block">
                    <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Ghi chú phản hồi
                    </span>
                    <input
                      type="text"
                      value={reviewNotes[request.id] ?? request.reviewNote ?? ''}
                      onChange={(event) =>
                        setReviewNotes((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ví dụ: Đã đổi với Bs. ..."
                    />
                  </label>
                  <div className="flex flex-wrap items-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdate(request, 'in_review')}
                      disabled={updatingId === request.id}
                      className="h-10 px-3 rounded-lg border border-blue-200 text-blue-700 dark:text-blue-300 dark:border-blue-800 text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-60"
                    >
                      Đang xem
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate(request, 'resolved')}
                      disabled={updatingId === request.id}
                      className="h-10 px-3 rounded-lg border border-emerald-200 text-emerald-700 dark:text-emerald-300 dark:border-emerald-800 text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-60"
                    >
                      Đã xử lý
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate(request, 'rejected')}
                      disabled={updatingId === request.id}
                      className="h-10 px-3 rounded-lg border border-slate-300 text-slate-600 dark:text-slate-300 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DayShiftRequestsModal;
