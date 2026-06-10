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
  { value: 'off', label: 'Nghỉ trực', hint: 'Xin nghỉ hoặc báo không trực được ngày này.' },
  { value: 'swap', label: 'Đổi trực', hint: 'Đề xuất đổi với ngày hoặc bác sĩ khác.' },
  { value: 'note', label: 'Ghi chú', hint: 'Gửi thông tin khác để người quản lý xem.' },
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
    if (!trimmedMessage) {
      setError('Vui lòng nhập nội dung yêu cầu.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        date: dateString,
        requestType,
        requesterDoctorName: requesterDoctorName.trim(),
        targetDate: requestType === 'swap' && targetDate ? targetDate : null,
        targetDoctorName: requestType === 'swap' && targetDoctorName ? targetDoctorName : null,
        message: trimmedMessage,
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
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-4">
          <div>
            <h3 id="shift-request-title" className="font-semibold text-slate-900 dark:text-white">
              Gửi yêu cầu trực
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{dateLabel}</p>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label
              htmlFor="shift-request-doctor"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
            >
              Bác sĩ gửi yêu cầu
            </label>
            <select
              ref={firstInputRef}
              id="shift-request-doctor"
              name="requesterDoctorName"
              value={requesterDoctorName}
              onChange={(event) => setRequesterDoctorName(event.target.value)}
              required
              className="w-full min-h-12 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Chọn bác sĩ</option>
              {doctorOptions.map((doctorName) => (
                <option key={doctorName} value={doctorName}>
                  {doctorName}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Loại yêu cầu
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {requestTypeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`rounded-xl border p-3 cursor-pointer transition-colors ${
                    requestType === option.value
                      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-indigo-200'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
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
                  <span className="block mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {option.hint}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {requestType === 'swap' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="shift-request-target-date"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  Ngày muốn đổi
                </label>
                <input
                  id="shift-request-target-date"
                  name="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(event) => setTargetDate(event.target.value)}
                  className="w-full min-h-12 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label
                  htmlFor="shift-request-target-doctor"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  Người muốn đổi
                </label>
                <input
                  id="shift-request-target-doctor"
                  name="targetDoctorName"
                  type="text"
                  value={targetDoctorName}
                  onChange={(event) => setTargetDoctorName(event.target.value)}
                  autoComplete="name"
                  className="w-full min-h-12 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="shift-request-message"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
            >
              Nội dung yêu cầu
            </label>
            <textarea
              id="shift-request-message"
              name="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              required
              maxLength={500}
              className="w-full px-3 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              placeholder="Ví dụ: Em xin nghỉ trực ngày này vì có việc gia đình..."
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tối đa 500 ký tự. Lịch chính chỉ thay đổi sau khi quản lý sắp xếp.
            </p>
          </div>

          <div>
            <label
              htmlFor="shift-request-contact"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
            >
              Liên hệ thêm nếu cần
            </label>
            <input
              id="shift-request-contact"
              name="contact"
              type="text"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              autoComplete="tel email"
              className="w-full min-h-12 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Số điện thoại hoặc email"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-11 px-5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-wait transition-colors"
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
