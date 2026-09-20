import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ScheduleDayCell from '../components/schedule/ScheduleDayCell';
import { ScheduleCalendarDay } from '../types';

describe('ScheduleDayCell fatigue warning', () => {
  it('shows the warning on the doctor who has only one recovery day', () => {
    const day: ScheduleCalendarDay = {
      date: new Date(2026, 8, 12),
      doctors: ['BS An', 'BS Bình'],
      postDutyWarningDoctors: [],
      fatigueWarningDoctors: ['BS Bình'],
      isCurrentMonth: true,
      isModified: false,
      isToday: false,
      isWeekend: false,
      tourName: 'BS An',
    };
    const onDoctorClick = vi.fn();

    render(
      <ScheduleDayCell
        day={day}
        selectedDoctor={null}
        selectedTourDate={null}
        onTourClick={vi.fn()}
        onDoctorClick={onDoctorClick}
        onAddDoctorClick={vi.fn()}
        onResetIconClick={vi.fn()}
        onRequestClick={vi.fn()}
        onViewRequestsClick={vi.fn()}
      />,
    );

    const warnedDoctor = screen.getByRole('button', {
      name: /BS Bình, bác sĩ số 2, cảnh báo mới ra trực/i,
    });
    expect(screen.getByText('Mới ra trực')).toBeInTheDocument();

    fireEvent.click(warnedDoctor);
    expect(onDoctorClick).toHaveBeenCalledWith(day, 1, 'BS Bình');
  });

  it('shows the higher-priority post-duty warning', () => {
    const day: ScheduleCalendarDay = {
      date: new Date(2026, 8, 13),
      doctors: ['BS An', 'BS Bình'],
      postDutyWarningDoctors: ['BS Bình'],
      fatigueWarningDoctors: [],
      isCurrentMonth: true,
      isModified: false,
      isToday: false,
      isWeekend: false,
      tourName: 'BS An',
    };

    render(
      <ScheduleDayCell
        day={day}
        selectedDoctor={null}
        selectedTourDate={null}
        onTourClick={vi.fn()}
        onDoctorClick={vi.fn()}
        onAddDoctorClick={vi.fn()}
        onResetIconClick={vi.fn()}
        onRequestClick={vi.fn()}
        onViewRequestsClick={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', {
        name: /BS Bình, bác sĩ số 2, cảnh báo ra trực/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ra trực')).toBeInTheDocument();
  });

  it('highlights the hovered doctor and dims the other doctors', () => {
    const day: ScheduleCalendarDay = {
      date: new Date(2026, 8, 14),
      doctors: ['BS An', 'BS Bình'],
      postDutyWarningDoctors: [],
      fatigueWarningDoctors: [],
      isCurrentMonth: true,
      isModified: false,
      isToday: false,
      isWeekend: false,
      tourName: 'BS An',
    };

    render(
      <ScheduleDayCell
        day={day}
        selectedDoctor={null}
        selectedTourDate={null}
        hoveredDoctor="BS Bình"
        onTourClick={vi.fn()}
        onDoctorClick={vi.fn()}
        onAddDoctorClick={vi.fn()}
        onResetIconClick={vi.fn()}
        onRequestClick={vi.fn()}
        onViewRequestsClick={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /BS Bình, bác sĩ số 2/i })).toHaveClass(
      'bg-blue-600',
    );
    expect(screen.getByRole('button', { name: /BS An, bác sĩ số 1/i })).toHaveClass('opacity-20');
  });
});
