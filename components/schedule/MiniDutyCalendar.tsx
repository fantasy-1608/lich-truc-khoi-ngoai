import React, { useState } from 'react';

interface Props {
  month: Date;
  doctorName: string;
  dutyDates: Date[];
  selectedDate?: string;
  onSelectDate: (date: Date) => void;
}

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function MiniDutyCalendar({
  month,
  doctorName,
  dutyDates,
  selectedDate,
  onSelectDate,
}: Props) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const todayKey = dateKey(new Date());
  const days = new Set(
    dutyDates
      .filter((date) => date.getFullYear() === year && date.getMonth() === monthIndex)
      .map((date) => date.getDate()),
  );
  const [focusDay, setFocusDay] = useState(() => {
    const selected = Array.from({ length: dayCount }, (_, index) => index + 1).find(
      (day) => dateKey(new Date(year, monthIndex, day)) === selectedDate,
    );
    return selected || 1;
  });

  return (
    <section className="mini-duty-calendar" aria-label={`Lịch mini của ${doctorName}`}>
      <h4 className="mini-duty-title">
        Tháng {monthIndex + 1}, {year}
      </h4>
      <div className="mini-duty-weekdays" aria-hidden="true">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mini-duty-grid" role="group" aria-label="Các ngày trong tháng">
        {Array.from({ length: offset }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden="true" />
        ))}
        {Array.from({ length: dayCount }, (_, index) => {
          const day = index + 1;
          const date = new Date(year, monthIndex, day);
          const key = dateKey(date);
          const hasDuty = days.has(day);
          return (
            <button
              type="button"
              key={key}
              data-mini-day={day}
              data-has-duty={hasDuty}
              className="mini-duty-day"
              tabIndex={focusDay === day ? 0 : -1}
              aria-pressed={selectedDate === key}
              aria-current={todayKey === key ? 'date' : undefined}
              aria-label={`${date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, ${hasDuty ? 'có ca trực' : 'không có ca trực'}`}
              onFocus={() => setFocusDay(day)}
              onClick={() => onSelectDate(date)}
              onKeyDown={(event) => {
                const rowStart = day - ((offset + day - 1) % 7);
                const target =
                  event.key === 'ArrowLeft'
                    ? day - 1
                    : event.key === 'ArrowRight'
                      ? day + 1
                      : event.key === 'ArrowUp'
                        ? day - 7
                        : event.key === 'ArrowDown'
                          ? day + 7
                          : event.key === 'Home'
                            ? rowStart
                            : event.key === 'End'
                              ? rowStart + 6
                              : null;
                if (target === null) return;
                event.preventDefault();
                const next = Math.max(1, Math.min(dayCount, target));
                event.currentTarget.parentElement
                  ?.querySelector<HTMLButtonElement>(`[data-mini-day="${next}"]`)
                  ?.focus();
              }}
            >
              <span>{day}</span>
              <span className="mini-duty-dot" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <p className="mini-duty-legend">
        <span aria-hidden="true" />
        Có ca trực
      </p>
      {days.size === 0 && <p className="mini-duty-empty">Không có ca trực trong tháng này.</p>}
    </section>
  );
}
