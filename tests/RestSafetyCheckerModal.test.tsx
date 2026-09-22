import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RestSafetyCheckerModal from '../components/schedule/RestSafetyCheckerModal';
import { ScheduleCalendarDay } from '../types';

describe('RestSafetyCheckerModal', () => {
  const safeCalendarGrid: ScheduleCalendarDay[] = [
    {
      date: new Date(2026, 8, 1),
      doctors: ['BS An'],
      postDutyWarningDoctors: [],
      fatigueWarningDoctors: [],
      isCurrentMonth: true,
      isModified: false,
      isToday: false,
      isWeekend: false,
      tourName: 'BS An',
    },
    {
      date: new Date(2026, 8, 5),
      doctors: ['BS Bình'],
      postDutyWarningDoctors: [],
      fatigueWarningDoctors: [],
      isCurrentMonth: true,
      isModified: false,
      isToday: false,
      isWeekend: false,
      tourName: 'BS Bình',
    },
  ];

  const warnedCalendarGrid: ScheduleCalendarDay[] = [
    {
      date: new Date(2026, 8, 2),
      doctors: ['BS An'],
      postDutyWarningDoctors: ['BS An'],
      fatigueWarningDoctors: [],
      isCurrentMonth: true,
      isModified: false,
      isToday: false,
      isWeekend: false,
      tourName: 'BS An',
    },
    {
      date: new Date(2026, 8, 4),
      doctors: ['BS Bình'],
      postDutyWarningDoctors: [],
      fatigueWarningDoctors: ['BS Bình'],
      isCurrentMonth: true,
      isModified: false,
      isToday: false,
      isWeekend: false,
      tourName: 'BS Bình',
    },
  ];

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <RestSafetyCheckerModal
        isOpen={false}
        onClose={vi.fn()}
        calendarGrid={safeCalendarGrid}
        currentDate={new Date(2026, 8, 1)}
        onJumpToDate={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders 100% safe state when no violations exist', () => {
    render(
      <RestSafetyCheckerModal
        isOpen={true}
        onClose={vi.fn()}
        calendarGrid={safeCalendarGrid}
        currentDate={new Date(2026, 8, 1)}
        onJumpToDate={vi.fn()}
      />,
    );

    expect(screen.getByText('Trợ lý An toàn Nghỉ ngơi')).toBeInTheDocument();
    expect(screen.getByText(/100% Đạt chuẩn an toàn nghỉ ngơi/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Không phát hiện bác sĩ nào bị xếp trực 2 ngày liên tiếp/i),
    ).toBeInTheDocument();
  });

  it('renders violations breakdown and handles jump to calendar date', () => {
    const onJump = vi.fn();
    const onClose = vi.fn();

    render(
      <RestSafetyCheckerModal
        isOpen={true}
        onClose={onClose}
        calendarGrid={warnedCalendarGrid}
        currentDate={new Date(2026, 8, 1)}
        onJumpToDate={onJump}
      />,
    );

    // Violation counters
    expect(screen.getByText(/Phát hiện 2 ca vi phạm cần lưu ý/i)).toBeInTheDocument();
    expect(screen.getByText('BS An')).toBeInTheDocument();
    expect(screen.getByText('BS Bình')).toBeInTheDocument();
    expect(screen.getByText('Trực 2 ngày liên tiếp')).toBeInTheDocument();
    expect(screen.getByText('Nghỉ 1 ngày trực lại')).toBeInTheDocument();

    // Test Jump button
    const jumpButtons = screen.getAllByRole('button', { name: /Xem ô lịch/i });
    expect(jumpButtons.length).toBe(2);

    fireEvent.click(jumpButtons[0]);
    expect(onJump).toHaveBeenCalledWith(warnedCalendarGrid[0].date);
    expect(onClose).toHaveBeenCalled();
  });

  it('filters violations when clicking filter pills', () => {
    render(
      <RestSafetyCheckerModal
        isOpen={true}
        onClose={vi.fn()}
        calendarGrid={warnedCalendarGrid}
        currentDate={new Date(2026, 8, 1)}
        onJumpToDate={vi.fn()}
      />,
    );

    // Click Critical only
    const criticalFilterBtn = screen.getByRole('button', { name: /Trực liền ngày/i });
    fireEvent.click(criticalFilterBtn);

    expect(screen.getByText('BS An')).toBeInTheDocument();
    expect(screen.queryByText('BS Bình')).not.toBeInTheDocument();

    // Click Warning only
    const warningFilterBtn = screen.getByRole('button', { name: /Nghỉ ngắn/i });
    fireEvent.click(warningFilterBtn);

    expect(screen.queryByText('BS An')).not.toBeInTheDocument();
    expect(screen.getByText('BS Bình')).toBeInTheDocument();
  });
});
