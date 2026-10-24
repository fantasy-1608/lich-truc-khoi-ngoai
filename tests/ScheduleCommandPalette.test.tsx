import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ScheduleCommandPalette from '../components/schedule/ScheduleCommandPalette';

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    }),
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    }),
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Schedule command palette', () => {
  it('opens with Ctrl K and finds Vietnamese names without accents', () => {
    const run = vi.fn();
    render(
      <ScheduleCommandPalette
        commands={[{ id: 'person', label: 'Bs. Đạt', detail: 'Đánh dấu các ca trong tháng', run }]}
      />,
    );
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    const input = screen.getByRole('combobox', { name: 'Tìm người hoặc công cụ' });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: 'dat' } });
    expect(screen.getByRole('option')).toHaveTextContent('Bs. Đạt');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(run).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('navigates commands with arrows and does not execute an empty result', () => {
    const first = vi.fn();
    const second = vi.fn();
    render(
      <ScheduleCommandPalette
        commands={[
          { id: 'first', label: 'Tháng trước', detail: '', run: first },
          { id: 'second', label: 'Tháng sau', detail: '', run: second },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tìm nhanh và công cụ' }));
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tìm nhanh và công cụ' }));
    fireEvent.change(input, { target: { value: 'no-such-command' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('status')).toHaveTextContent('Không tìm thấy');
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('removes the keyboard listener when the calendar unmounts', () => {
    const { unmount } = render(<ScheduleCommandPalette commands={[]} />);
    unmount();
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
