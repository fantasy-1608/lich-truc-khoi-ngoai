import React, { useState, useEffect, useRef } from 'react';
import { ResetPopoverState } from '../../types';

interface ResetPopoverProps {
  popoverState: ResetPopoverState;
  onConfirm: () => void;
  onCancel: () => void;
}

const ResetPopover: React.FC<ResetPopoverProps> = ({ popoverState, onConfirm, onCancel }) => {
  const [isVisible, setIsVisible] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The `doctorNames` useMemo was not present in this component, so no change is needed for that.
    // The `setTimeout` already has a cleanup function.
    const timer = setTimeout(() => setIsVisible(true), 10);
    if (popoverRef.current) {
      const targetRect = popoverState.target.getBoundingClientRect();
      const popoverEl = popoverRef.current;

      let top = targetRect.bottom + window.scrollY + 8;
      let left =
        targetRect.left + window.scrollX + targetRect.width / 2 - popoverEl.offsetWidth / 2;

      if (left < 10) left = 10;
      if (left + popoverEl.offsetWidth > window.innerWidth - 10) {
        left = window.innerWidth - popoverEl.offsetWidth - 10;
      }
      if (top + popoverEl.offsetHeight > window.innerHeight - 10) {
        top = targetRect.top + window.scrollY - popoverEl.offsetHeight - 8;
      }

      popoverEl.style.top = `${top}px`;
      popoverEl.style.left = `${left}px`;
    }
    return () => clearTimeout(timer);
  }, [popoverState]);

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(onCancel, 200); // Wait for animation
  };

  const handleConfirm = () => {
    setIsVisible(false);
    setTimeout(onConfirm, 200);
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-20 bg-black/20 transition-opacity ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleCancel}
        aria-hidden="true"
      ></div>
      <div
        ref={popoverRef}
        className={`absolute z-30 bg-white dark:bg-slate-800 rounded-lg shadow-xl border dark:border-slate-600 p-3 text-sm min-w-[220px] transition-all-app ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-dialog-title"
      >
        <h4
          id="reset-dialog-title"
          className="font-semibold mb-2 text-slate-800 dark:text-slate-200"
        >
          Xóa thay đổi?
        </h4>
        <p className="mb-3 text-slate-600 dark:text-slate-400">
          Hoàn tác lịch trực của ngày{' '}
          <span className="font-bold">{popoverState.date.toLocaleDateString('vi-VN')}</span> về mặc
          định.
        </p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={handleCancel}
            className="px-3 py-1 rounded text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all-app"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition-all-app"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </>
  );
};

export default ResetPopover;
