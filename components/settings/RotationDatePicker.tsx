import { useRef, useState } from 'react';
import { addDays, parseDate } from '../../utils/rotation';

interface Props {
  value: string;
  min: string;
  initialMonth: string;
  onChange: (date: string) => void;
}
const monthLabel = (month: string) => `Tháng ${Number(month.slice(5))}, ${month.slice(0, 4)}`;
const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function RotationDatePicker({ value, min, initialMonth, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const [month, setMonth] = useState(
    value.slice(0, 7) || [initialMonth, min.slice(0, 7)].sort().at(-1)!,
  );
  const cells = useRef<Record<string, HTMLButtonElement | null>>({});
  const first = parseDate(`${month}-01`);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const changeMonth = (step: number) => {
    setMonth(iso(new Date(first.getFullYear(), first.getMonth() + step, 1)).slice(0, 7));
  };
  return (
    <div className="rotation-date-picker">
      <span id="rotation-date-label">Ngày áp dụng</span>
      <button
        type="button"
        ref={trigger}
        className="rotation-date-trigger"
        aria-labelledby="rotation-date-label rotation-date-value"
        aria-expanded={open}
        aria-controls="rotation-date-calendar"
        onClick={() => {
          if (value) setMonth(value.slice(0, 7));
          setOpen(!open);
        }}
      >
        <span id="rotation-date-value">
          {value
            ? parseDate(value).toLocaleDateString('vi-VN', {
                weekday: 'long',
                day: 'numeric',
                month: 'numeric',
                year: 'numeric',
              })
            : 'Chọn ngày áp dụng'}
        </span>
        <span aria-hidden="true">▦</span>
      </button>
      {open && (
        <div
          id="rotation-date-calendar"
          className="rotation-date-calendar"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              e.currentTarget.parentElement
                ?.querySelector<HTMLButtonElement>('.rotation-date-trigger')
                ?.focus();
            }
          }}
        >
          <div className="rotation-calendar-heading">
            <button
              type="button"
              aria-label="Tháng trước"
              disabled={month <= min.slice(0, 7)}
              onClick={() => changeMonth(-1)}
            >
              ‹
            </button>
            <strong aria-live="polite">{monthLabel(month)}</strong>
            <button type="button" aria-label="Tháng sau" onClick={() => changeMonth(1)}>
              ›
            </button>
          </div>
          <div className="rotation-calendar-grid">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
              <span className="rotation-weekday" key={day}>
                {day}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span aria-hidden="true" key={`empty-${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, '0')}`;
              const weekend = [0, 6].includes(parseDate(date).getDay());
              return (
                <button
                  type="button"
                  key={date}
                  ref={(el) => {
                    cells.current[date] = el;
                  }}
                  disabled={date < min}
                  aria-label={parseDate(date).toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                  })}
                  aria-pressed={date === value}
                  className={`${weekend ? 'rotation-calendar-weekend' : ''} ${date === value ? 'rotation-calendar-selected' : ''}`}
                  onKeyDown={(e) => {
                    const steps: Record<string, number> = {
                      ArrowLeft: -1,
                      ArrowRight: 1,
                      ArrowUp: -7,
                      ArrowDown: 7,
                    };
                    if (e.key in steps) {
                      const target = addDays(date, steps[e.key]);
                      const button = cells.current[target];
                      if (button && !button.disabled) {
                        e.preventDefault();
                        button.focus();
                      }
                    }
                  }}
                  onClick={() => {
                    onChange(date);
                    setOpen(false);
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <p className="rotation-calendar-help">T7, CN: cuối tuần · Ngày bị khóa không thể chọn.</p>
          <p className="rotation-calendar-help">
            Chọn ngày rồi bấm “Xem trước” để kiểm tra cảnh báo. Chưa ghi thay đổi.
          </p>
        </div>
      )}
    </div>
  );
}
