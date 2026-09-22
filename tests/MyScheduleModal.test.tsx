import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MyScheduleModal from '../components/schedule/MyScheduleModal';
import { Doctor, ScheduleCalendarDay } from '../types';

describe('MyScheduleModal', () => {
  const mockDoctors: Doctor[] = [
    { id: '1', name: 'BS An', phone: '0901', email: 'an@example.com' },
    { id: '2', name: 'BS Bình', phone: '0902', email: 'binh@example.com' },
  ];

  const mockCalendarGrid: ScheduleCalendarDay[] = [
    {
      date: new Date(2026, 8, 5),
      doctors: ['BS An', 'BS Bình'],
      postDutyWarningDoctors: [],
      fatigueWarningDoctors: [],
      isCurrentMonth: true,
      isModified: false,
      isToday: false,
      isWeekend: false,
      tourName: 'BS An',
    },
    {
      date: new Date(2026, 8, 15),
      doctors: ['BS Bình'],
      postDutyWarningDoctors: [],
      fatigueWarningDoctors: [],
      isCurrentMonth: true,
      isModified: false,
      isToday: false,
      isWeekend: false,
      tourName: 'BS Bình',
    },
    {
      date: new Date(2026, 8, 20),
      doctors: ['BS An'],
      postDutyWarningDoctors: [],
      fatigueWarningDoctors: [],
      isCurrentMonth: true,
      isModified: false,
      isToday: false,
      isWeekend: false,
      tourName: 'BS An',
    },
  ];

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <MyScheduleModal
        isOpen={false}
        onClose={vi.fn()}
        allDoctors={mockDoctors}
        calendarGrid={mockCalendarGrid}
        currentDate={new Date(2026, 8, 1)}
        myDoctorName="BS Bình"
        onSelectMyDoctor={vi.fn()}
        onSpotlightDoctor={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders doctor selection prompt when no doctor is chosen yet', () => {
    const onSelect = vi.fn();
    render(
      <MyScheduleModal
        isOpen={true}
        onClose={vi.fn()}
        allDoctors={mockDoctors}
        calendarGrid={mockCalendarGrid}
        currentDate={new Date(2026, 8, 1)}
        myDoctorName={null}
        onSelectMyDoctor={onSelect}
        onSpotlightDoctor={vi.fn()}
      />,
    );

    expect(screen.getByText(/Chọn tên của bạn để xem lịch riêng/i)).toBeInTheDocument();
    expect(screen.getByText('BS Bình')).toBeInTheDocument();

    // Click on BS Bình
    fireEvent.click(screen.getByText('BS Bình'));
    expect(onSelect).toHaveBeenCalledWith('BS Bình');
  });

  it('renders personal shifts and countdown when doctor is configured', () => {
    render(
      <MyScheduleModal
        isOpen={true}
        onClose={vi.fn()}
        allDoctors={mockDoctors}
        calendarGrid={mockCalendarGrid}
        currentDate={new Date(2026, 8, 1)}
        myDoctorName="BS Bình"
        onSelectMyDoctor={vi.fn()}
        onSpotlightDoctor={vi.fn()}
      />,
    );

    expect(screen.getByText('Lịch trực của tôi')).toBeInTheDocument();
    expect(screen.getAllByText('BS Bình').length).toBeGreaterThan(0);
    // BS Bình has 2 shifts: Sept 5 and Sept 15
    expect(screen.getByText(/2 ca trực/i)).toBeInTheDocument();
    // Verify shift items exist (may appear in countdown and timeline)
    expect(screen.getAllByText(/Tua BS An/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tua BS Bình/i).length).toBeGreaterThan(0);
  });

  it('triggers spotlight on monthly grid and closes modal', () => {
    const onSpotlight = vi.fn();
    const onClose = vi.fn();

    render(
      <MyScheduleModal
        isOpen={true}
        onClose={onClose}
        allDoctors={mockDoctors}
        calendarGrid={mockCalendarGrid}
        currentDate={new Date(2026, 8, 1)}
        myDoctorName="BS Bình"
        onSelectMyDoctor={vi.fn()}
        onSpotlightDoctor={onSpotlight}
      />,
    );

    const spotlightBtn = screen.getByRole('button', { name: /Xem trên lưới tháng/i });
    fireEvent.click(spotlightBtn);

    expect(onSpotlight).toHaveBeenCalledWith('BS Bình');
    expect(onClose).toHaveBeenCalled();
  });
});
