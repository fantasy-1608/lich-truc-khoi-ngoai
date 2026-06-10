import React, { useMemo, useState } from 'react';
import { ShiftRequest, ShiftRequestStatus, ShiftRequestType } from '../../types';

interface ShiftRequestsPanelProps {
  canManage: boolean;
  isLoading: boolean;
  requests: ShiftRequest[];
  onGoToDate: (date: string) => void;
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

const statusStyles: Record<ShiftRequestStatus, string> = {
  pending:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
  in_review:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  resolved:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
  rejected:
    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

const filterOptions: Array<ShiftRequestStatus | 'all'> = [
  'pending',
  'in_review',
  'resolved',
  'rejected',
  'all',
];

const formatDate = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const ShiftRequestsPanel: React.FC<ShiftRequestsPanelProps> = ({
  canManage,
  isLoading,
  requests,
  onGoToDate,
  onUpdateReview,
}) => {
  const [filter, setFilter] = useState<ShiftRequestStatus | 'all'>('pending');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredRequests = useMemo(() => {
    const nextRequests =
      filter === 'all' ? requests : requests.filter((request) => request.status === filter);
    return [...nextRequests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [filter, requests]);

  const visibleCount = filteredRequests.length;
  const pendingCount = requests.filter(
    (request) => request.status === 'pending' || request.status === 'in_review',
  ).length;

  const handleUpdate = async (request: ShiftRequest, status: ShiftRequestStatus) => {
    setUpdatingId(request.id);
    try {
      await onUpdateReview(request.id, status, reviewNotes[request.id] || request.reviewNote || '');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!canManage) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Yêu cầu chờ xử lý</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Mở khóa chỉnh sửa để xem và đánh giá yêu cầu đổi/nghỉ trực.
            </p>
          </div>
          {pendingCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">
              {pendingCount}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Yêu cầu chờ xử lý</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isLoading ? 'Đang tải yêu cầu...' : `${visibleCount} yêu cầu đang hiển thị.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Lọc trạng thái yêu cầu">
          {filterOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filter === option
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
              }`}
            >
              {option === 'all' ? 'Tất cả' : statusLabels[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {!isLoading && filteredRequests.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Chưa có yêu cầu ở trạng thái này.
          </div>
        )}

        {filteredRequests.map((request) => (
          <article
            key={request.id}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {requestTypeLabels[request.requestType]}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyles[request.status]}`}
                  >
                    {statusLabels[request.status]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                  <span className="font-semibold">{request.requesterDoctorName}</span> gửi cho ngày{' '}
                  <span className="font-semibold">{formatDate(request.date)}</span>
                  {request.targetDate ? (
                    <>
                      {' '}
                      muốn đổi với ngày{' '}
                      <span className="font-semibold">{formatDate(request.targetDate)}</span>
                    </>
                  ) : null}
                  {request.targetDoctorName ? (
                    <>
                      {' '}
                      / <span className="font-semibold">{request.targetDoctorName}</span>
                    </>
                  ) : null}
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                  {request.message}
                </p>
                {request.contact && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Liên hệ: {request.contact}
                  </p>
                )}
                {request.reviewNote && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Phản hồi: {request.reviewNote}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onGoToDate(request.date)}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                Đi tới ngày
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
              <label className="block">
                <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Ghi chú phản hồi
                </span>
                <input
                  type="text"
                  value={reviewNotes[request.id] ?? request.reviewNote ?? ''}
                  onChange={(event) =>
                    setReviewNotes((current) => ({ ...current, [request.id]: event.target.value }))
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
        ))}
      </div>
    </div>
  );
};

export default ShiftRequestsPanel;
