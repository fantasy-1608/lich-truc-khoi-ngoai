import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import RotationDatePicker from '../components/settings/RotationDatePicker';
afterEach(cleanup);
it('prevents selecting dates before the allowed boundary', () => {
  const choose = vi.fn();
  render(<RotationDatePicker value="" min="2026-11-08" initialMonth="2026-11" onChange={choose} />);
  fireEvent.click(screen.getByRole('button', { name: /^Ngày áp dụng/ }));
  const locked = screen.getByRole('button', { name: 'Thứ Bảy, 7/11/2026' });
  expect(locked).toBeDisabled();
  fireEvent.click(locked);
  expect(choose).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Tháng trước' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Chủ Nhật, 8/11/2026' }));
  expect(choose).toHaveBeenCalledWith('2026-11-08');
});
it('supports keyboard movement and Escape returns focus to the date control', () => {
  render(
    <RotationDatePicker value="" min="2026-11-01" initialMonth="2026-11" onChange={vi.fn()} />,
  );
  const trigger = screen.getByRole('button', { name: /^Ngày áp dụng/ });
  fireEvent.click(trigger);
  const day = screen.getByRole('button', { name: 'Thứ Sáu, 6/11/2026' });
  day.focus();
  fireEvent.keyDown(day, { key: 'ArrowRight' });
  expect(screen.getByRole('button', { name: 'Thứ Bảy, 7/11/2026' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(trigger).toHaveFocus();
  expect(screen.queryByRole('button', { name: 'Tháng sau' })).not.toBeInTheDocument();
});
