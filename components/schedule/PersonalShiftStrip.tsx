import React from 'react';
import { ScheduleCalendarDay } from '../../types';
import { CalendarIcon } from '../icons/CalendarIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';

interface Props {
  doctorNames: string[];
  selectedName: string;
  onSelectName: (name: string) => void;
  active: boolean;
  onToggle: () => void;
  days: ScheduleCalendarDay[];
  onOpenSchedule: () => void;
  onJumpToDate: (date: Date) => void;
}

export default function PersonalShiftStrip({
  doctorNames,
  selectedName,
  onSelectName,
  active,
  onToggle,
  days,
  onOpenSchedule,
  onJumpToDate,
}: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = days.find((day) => day.date >= today);
  return (
    <section
      className="personal-shift-strip"
      data-has-selection={selectedName ? 'true' : 'false'}
      aria-label="Ca của tôi"
    >
      <div className="personal-identity">
        <span className="personal-mark" aria-hidden="true">
          <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
        <label htmlFor="personal-roster-name">
          <strong className={selectedName ? 'hidden sm:inline' : ''}>Ca của tôi</strong>
          <select
            id="personal-roster-name"
            value={selectedName}
            onChange={(event) => onSelectName(event.target.value)}
          >
            <option value="">Chọn tên của bạn</option>
            {selectedName && !doctorNames.includes(selectedName) && (
              <option value={selectedName}>{selectedName}</option>
            )}
            {doctorNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={`personal-summary ${selectedName ? '' : 'is-empty-hint'}`} role="status">
        {selectedName ? (
          <>
            <strong>{days.length} ca</strong>
            <span className="hidden sm:inline">trong tháng đang xem</span>
          </>
        ) : (
          <span>Chọn tên một lần, xem ca nhanh mỗi ngày.</span>
        )}
      </div>
      {selectedName && upcoming && (
        <button
          type="button"
          className="next-shift-link"
          onClick={() => onJumpToDate(upcoming.date)}
        >
          <span>
            <span className="sm:hidden">Tiếp:</span>
            <span className="hidden sm:inline">Ca sắp tới</span>{' '}
            <strong>
              {upcoming.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
            </strong>
          </span>
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      )}
      <div className="personal-actions">
        <button
          type="button"
          className="personal-spotlight"
          aria-pressed={active && !!selectedName}
          aria-label="Đánh dấu ca của tôi"
          disabled={!selectedName}
          onClick={onToggle}
        >
          <span className="spotlight-dot" aria-hidden="true" />
          <span className="sm:hidden">Đánh dấu</span>
          <span className="hidden sm:inline">Đánh dấu ca của tôi</span>
        </button>
        <button
          type="button"
          className="personal-detail"
          aria-label="Xem chi tiết ca của tôi"
          onClick={onOpenSchedule}
        >
          <span className="sm:hidden">Chi tiết</span>
          <span className="hidden sm:inline">Xem chi tiết</span>
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
