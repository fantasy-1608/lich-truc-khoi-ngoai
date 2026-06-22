import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Doctor, ShiftRequestDraft, ShiftRequestType } from '../../types';
import { XIcon } from '../icons/XIcon';

interface ShiftRequestModalProps {
  date: Date;
  doctorsOnDate: string[];
  allDoctors: Doctor[];
  onClose: () => void;
  onSubmit: (draft: ShiftRequestDraft) => Promise<void>;
}

const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const requestTypeOptions: Array<{ value: ShiftRequestType; label: string; hint: string }> = [
  { value: 'off', label: 'Xin nghỉ', hint: 'Báo không trực được ngày này.' },
  { value: 'swap', label: 'Đổi trực', hint: 'Xin đổi sang ngày hoặc bác sĩ khác.' },
  { value: 'note', label: 'Ghi chú', hint: 'Nhắn điều khác cho người quản lý.' },
];

const ShiftRequestModal: React.FC<ShiftRequestModalProps> = ({
  date,
  doctorsOnDate,
  allDoctors,
  onClose,
  onSubmit,
}) => {
  const [requestType, setRequestType] = useState<ShiftRequestType>('off');
  const [requesterDoctorName, setRequesterDoctorName] = useState(doctorsOnDate[0] || '');
  const [targetDate, setTargetDate] = useState('');
  const [targetDoctorName, setTargetDoctorName] = useState('');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLSelectElement>(null);

  const dateString = getDateString(date);
  const dateLabel = date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const shortDateLabel = date.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  });
  const messagePlaceholder =
    requestType === 'off'
      ? 'Có thể bỏ trống nếu chỉ cần báo nghỉ.'
      : requestType === 'swap'
        ? 'Ví dụ: Em muốn đổi sang ca phù hợp trong tuần này.'
        : 'Nhập nội dung cần nhắn cho người quản lý.';

  const doctorOptions = useMemo(() => {
    const names = new Set<string>();
    doctorsOnDate.forEach((name) => names.add(name));
    allDoctors.forEach((doctor) => names.add(doctor.name));
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [allDoctors, doctorsOnDate]);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedMessage = message.trim();
    if (!requesterDoctorName.trim()) {
      setError('Vui lòng chọn bác sĩ gửi yêu cầu.');
      return;
    }
    if (requestType === 'note' && !trimmedMessage) {
      setError('Vui lòng nhập nội dung ghi chú.');
      return;
    }

    const fallbackMessage =
      requestType === 'off'
        ? `Xin nghỉ trực ngày ${dateLabel}.`
        : `Xin đổi trực ngày ${dateLabel}${targetDate ? ` sang ngày ${targetDate}` : ''}${
            targetDoctorName.trim() ? ` với ${targetDoctorName.trim()}` : ''
          }.`;

    setIsSubmitting(true);
    try {
      await onSubmit({
        date: dateString,
        requestType,
        requesterDoctorName: requesterDoctorName.trim(),
        targetDate: requestType === 'swap' && targetDate ? targetDate : null,
        targetDoctorName: requestType === 'swap' && targetDoctorName ? targetDoctorName : null,
        message: trimmedMessage || fallbackMessage,
        contact: contact.trim() || null,
      });
      onClose();
    } catch {
      setError('Không thể gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="drawer-backdrop fixed inset-0 z-[70] flex items-end sm:items-stretch sm:justify-end bg-slate-950/45 backdrop-blur-[2px] p-0"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={dialogRef}
        className="drawer-panel w-full sm:w-[460px] lg:w-[520px] max-h-[92vh] sm:max-h-none sm:h-full overflow-y-auto bg-white dark:bg-slate-800 shadow-2xl rounded-t-2xl sm:rounded-none sm:rounded-l-2xl border border-slate-200 dark:border-slate-700"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-request-title"
      >
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-4 sm:px-5 sm:py-4">
          <div>
            <h3 id="shift-request-title" className="text-base font-bold text-slate-900 dark:text-white">
              Gửi yêu cầu trực
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{shortDateLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Đóng form yêu cầu"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 sm:p-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/35">
            <label
              htmlFor="shift-request-doctor"
              className="block text-sm font-bold text-slate-800 dark:text-slate-100 mb-1.5"
            >
              Tôi là
            </label>
            <select
              ref={firstInputRef}
              id="shift-request-doctor"
              name="requesterDoctorName"
              value={requesterDoctorName}
              onChange={(event) => setRequesterDoctorName(event.target.value)}
              required
              className="w-full min-h-12 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Chọn bác sĩ</option>
              {doctorOptions.map((doctorName) => (
                <option key={doctorName} value={doctorName}>
                  {doctorName}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/35">
            <legend className="px-1 text-sm font-bold text-slate-800 dark:text-slate-100">
              Tôi muốn
            </legend>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {requestTypeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`min-h-[76px] rounded-xl border p-3 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-indigo-500 ${
                    requestType === option.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/35 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-200 hover:border-indigo-200 dark:hover:border-indigo-800'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="radio"
                      name="requestType"
                      value={option.value}
                      checked={requestType === option.value}
                      onChange={() => setRequestType(option.value)}
                      className="accent-indigo-600"
                    />
                    {option.label}
                  </span>
                  <span className="block mt-1 text-xs leading-snug text-slate-500 dark:text-slate-400">
                    {option.hint}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {requestType === 'swap' && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/25">
              <p className="mb-3 text-sm font-bold text-indigo-800 dark:text-indigo-200">
                Muốn đổi với
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="shift-request-target-date"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  Ngày khác
                </label>
                <input
                  id="shift-request-target-date"
                  name="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(event) => setTargetDate(event.target.value)}
                  enterKeyHint="next"
                  className="w-full min-h-12 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label
                  htmlFor="shift-request-target-doctor"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  Bác sĩ nếu biết
                </label>
                <input
                  id="shift-request-target-doctor"
                  name="targetDoctorName"
                  type="text"
                  value={targetDoctorName}
                  onChange={(event) => setTargetDoctorName(event.target.value)}
                  autoComplete="name"
                  enterKeyHint="next"
                  className="w-full min-h-12 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Không bắt buộc"
                />
              </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/35">
            <label
              htmlFor="shift-request-message"
              className="block text-sm font-bold text-slate-800 dark:text-slate-100 mb-1.5"
            >
              Ghi thêm {requestType === 'note' ? '' : '(không bắt buộc)'}
            </label>
            <textarea
              id="shift-request-message"
              name="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={3}
              required={requestType === 'note'}
              maxLength={500}
              className="w-full px-3 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              placeholder={messagePlaceholder}
              enterKeyHint="done"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {requestType === 'note'
                ? 'Cần nhập nội dung để người quản lý biết việc cần xử lý.'
                : 'Có thể gửi ngay nếu không cần giải thích thêm.'}
            </p>
          </div>

          <details className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/35">
            <summary className="cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-200">
              Thêm liên hệ
            </summary>
            <div className="mt-3">
              <label
                htmlFor="shift-request-contact"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
              >
                Số điện thoại hoặc email
              </label>
              <input
                id="shift-request-contact"
                name="contact"
                type="text"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                autoComplete="tel email"
                inputMode="text"
                enterKeyHint="done"
                className="w-full min-h-12 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Không bắt buộc"
              />
            </div>
          </details>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-700 dark:bg-slate-800/95 sm:-mx-5 sm:-mb-5 sm:flex-row sm:justify-end sm:p-5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-12 px-5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-wait transition-colors"
            >
              {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftRequestModal;
