import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MiniDutyCalendar from '../components/schedule/MiniDutyCalendar';

afterEach(cleanup);
describe('MiniDutyCalendar', () => {
  it('aligns Monday-first weeks and marks only duties in the displayed month', () => {
    const onSelectDate = vi.fn();
    const { container } = render(
      <MiniDutyCalendar
        month={new Date(2026, 10, 1)}
        doctorName="Bs. Anh"
        dutyDates={[new Date(2026, 10, 1), new Date(2026, 10, 5), new Date(2026, 9, 5)]}
        onSelectDate={onSelectDate}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(30);
    expect(container.querySelector('.mini-duty-grid')?.children[6]).toHaveAttribute(
      'data-mini-day',
      '1',
    );
    expect(container.querySelectorAll('[data-has-duty="true"]')).toHaveLength(2);
    fireEvent.click(
      screen.getByRole('button', { name: /^Thứ Năm, 5 tháng 11, 2026, có ca trực$/i }),
    );
    expect(onSelectDate).toHaveBeenCalledWith(new Date(2026, 10, 5));
  });
  it('includes leap day and supports keyboard navigation and selected-day state', () => {
    render(
      <MiniDutyCalendar
        month={new Date(2028, 1, 1)}
        doctorName="Bs. Anh"
        dutyDates={[]}
        selectedDate="2028-02-29"
        onSelectDate={vi.fn()}
      />,
    );
    const selected = screen.getByRole('button', { name: /29 tháng 2/i });
    expect(screen.getAllByRole('button')).toHaveLength(29);
    expect(selected).toHaveAttribute('aria-pressed', 'true');
    selected.focus();
    fireEvent.keyDown(selected, { key: 'ArrowUp' });
    expect(screen.getByRole('button', { name: /22 tháng 2/i })).toHaveFocus();
    expect(screen.getByText('Không có ca trực trong tháng này.')).toBeInTheDocument();
  });
});
