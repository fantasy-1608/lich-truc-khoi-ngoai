import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ScheduleHeader from '../components/schedule/ScheduleHeader';

const props = {
  currentDate: new Date(2026, 10, 1),
  selectedDoctor: null,
  selectedShiftDate: null,
  doctorQuery: '',
  doctorNames: [],
  postDutyWarningCount: 0,
  fatigueWarningCount: 0,
  onDoctorQueryChange: vi.fn(),
  onPrevMonth: vi.fn(),
  onNextMonth: vi.fn(),
  onCancelSelection: vi.fn(),
  onOpenStats: vi.fn(),
  onExportICS: vi.fn(),
};
afterEach(cleanup);

describe('PDF export feedback', () => {
  it('blocks duplicate exports and confirms only after the export completes', async () => {
    let finish!: () => void;
    const exportPDF = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(<ScheduleHeader {...props} onExportPDF={exportPDF} />);
    fireEvent.click(screen.getByRole('button', { name: 'Xuất PDF' }));
    const busyButton = screen.getByRole('button', { name: 'Đang tạo PDF' });
    expect(busyButton).toBeDisabled();
    fireEvent.click(busyButton);
    expect(exportPDF).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Đã tạo PDF' })).not.toBeInTheDocument();
    await act(async () => finish());
    expect(screen.getByRole('button', { name: 'Đã tạo PDF' })).toBeEnabled();
  });

  it('shows a recoverable error and lets the user retry', async () => {
    const exportPDF = vi
      .fn()
      .mockRejectedValueOnce(new Error('download failed'))
      .mockResolvedValueOnce(undefined);
    render(<ScheduleHeader {...props} onExportPDF={exportPDF} />);
    fireEvent.click(screen.getByRole('button', { name: 'Xuất PDF' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Chưa tạo được PDF'));
    fireEvent.click(screen.getByRole('button', { name: 'Thử xuất PDF lại' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đã tạo PDF' })).toBeEnabled());
    expect(exportPDF).toHaveBeenCalledTimes(2);
  });
});
