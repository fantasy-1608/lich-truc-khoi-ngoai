import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ScheduleHeader from '../components/schedule/ScheduleHeader';

describe('ScheduleHeader warning counters', () => {
  const defaultProps = {
    currentDate: new Date(2026, 8, 1),
    doctorNames: ['BS An', 'BS Bình'],
    doctorQuery: '',
    postDutyWarningCount: 0,
    fatigueWarningCount: 0,
    hasSelectedDoctors: false,
    selectedDoctorCount: 0,
    onDoctorQueryChange: vi.fn(),
    onPrevMonth: vi.fn(),
    onNextMonth: vi.fn(),
    onOpenStats: vi.fn(),
    onExportPDF: vi.fn(),
    onExportICS: vi.fn(),
    onClearSelectedDoctors: vi.fn(),
  };

  it('hides warning counters completely when counts are 0', () => {
    render(<ScheduleHeader {...defaultProps} />);

    expect(screen.queryByLabelText('Tổng hợp cảnh báo')).not.toBeInTheDocument();
    expect(screen.queryByText('Ra trực')).not.toBeInTheDocument();
    expect(screen.queryByText('Mới ra trực')).not.toBeInTheDocument();
  });

  it('shows only the critical "Ra trực" badge when postDutyWarningCount > 0 and fatigueWarningCount === 0', () => {
    render(<ScheduleHeader {...defaultProps} postDutyWarningCount={2} fatigueWarningCount={0} />);

    expect(screen.getByLabelText('Tổng hợp cảnh báo')).toBeInTheDocument();
    expect(screen.getByText('Ra trực')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.queryByText('Mới ra trực')).not.toBeInTheDocument();
  });

  it('shows only the warning "Mới ra trực" badge when fatigueWarningCount > 0 and postDutyWarningCount === 0', () => {
    render(<ScheduleHeader {...defaultProps} postDutyWarningCount={0} fatigueWarningCount={3} />);

    expect(screen.getByLabelText('Tổng hợp cảnh báo')).toBeInTheDocument();
    expect(screen.getByText('Mới ra trực')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByText('Ra trực')).not.toBeInTheDocument();
  });

  it('shows both badges when both counts are > 0', () => {
    render(<ScheduleHeader {...defaultProps} postDutyWarningCount={1} fatigueWarningCount={4} />);

    expect(screen.getByLabelText('Tổng hợp cảnh báo')).toBeInTheDocument();
    expect(screen.getByText('Ra trực')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Mới ra trực')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
