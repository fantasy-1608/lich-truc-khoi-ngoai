import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import RotationSettings from '../components/settings/RotationSettings';
import base from '../data/schedule_base.json';
import { RotationConfig } from '../types';
vi.mock('../services/scheduleStorage', () => ({
  loadBaseScheduleData: vi.fn(),
  loadMonthScheduleData: vi.fn(),
}));
import { loadBaseScheduleData, loadMonthScheduleData } from '../services/scheduleStorage';
const config = base.rotationConfig as RotationConfig;
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function chooseDate(date: string) {
  fireEvent.click(screen.getByRole('button', { name: /^Ngày áp dụng/ }));
  if (date.startsWith('2026-12'))
    fireEvent.click(screen.getByRole('button', { name: 'Tháng sau' }));
  const label = new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
  fireEvent.click(screen.getByRole('button', { name: label }));
}
async function preview(
  canWrite = true,
  date = '2026-11-07',
  onApply = vi.fn().mockResolvedValue(undefined),
) {
  vi.mocked(loadBaseScheduleData).mockResolvedValue({ data: base, updatedAt: 'base-stamp' });
  vi.mocked(loadMonthScheduleData).mockResolvedValue({ data: null, updatedAt: null });
  render(<RotationSettings config={config} canWrite={canWrite} onApply={onApply} />);
  chooseDate(date);
  fireEvent.click(screen.getByRole('button', { name: /^Xem trước$/ }));
  await screen.findByText('Đã xem trước từ dữ liệu online. Chưa ghi thay đổi.');
  return onApply;
}
describe('rotation settings safety', () => {
  it('allows restoring members on the latest effective date without changing rotation order', async () => {
    const changed = structuredClone(config);
    const roster = structuredClone(changed.baseline);
    const tour = roster.tours.find((t) => t.id === roster.tourOrder[0])!;
    const removed = tour.doctorIds.pop()!;
    changed.versions.push({
      id: 'removed-member',
      effectiveDate: '2026-11-01',
      kind: 'members',
      roster,
      cycleMonth: '2026-11',
      createdAt: '2026-10-20T00:00:00Z',
      createdBy: 'editor',
    });
    vi.mocked(loadBaseScheduleData).mockResolvedValue({
      data: { ...base, rotationConfig: changed },
      updatedAt: 'base-stamp',
    });
    vi.mocked(loadMonthScheduleData).mockResolvedValue({ data: null, updatedAt: null });
    const save = vi.fn().mockResolvedValue(undefined);
    render(<RotationSettings config={changed} canWrite onApply={save} />);
    fireEvent.change(screen.getByLabelText('Loại thay đổi'), { target: { value: 'members' } });
    chooseDate('2026-11-01');
    fireEvent.click(screen.getAllByRole('button', { name: /Sửa thành viên/ })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm bác sĩ vào tua' }));
    fireEvent.change(screen.getByRole('combobox', { name: /Bác sĩ vị trí 5/ }), {
      target: { value: removed },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Xem trước' }));
    await screen.findByText('Đã xem trước từ dữ liệu online. Chưa ghi thay đổi.');
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng từ 1/11/2026' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0].roster).toEqual(changed.baseline);
    expect(save.mock.calls[0][0].effectiveDate).toBe('2026-11-01');
    expect(save.mock.calls[0][0].cycleMonth).toBe('2026-11');
    expect(changed.versions).toHaveLength(1);
  });
  it('preserves edited members when selecting or changing the effective date and saves them', async () => {
    vi.mocked(loadBaseScheduleData).mockResolvedValue({ data: base, updatedAt: 'base-stamp' });
    vi.mocked(loadMonthScheduleData).mockResolvedValue({ data: null, updatedAt: null });
    const save = vi.fn().mockResolvedValue(undefined);
    const original = structuredClone(config);
    render(<RotationSettings config={config} canWrite onApply={save} />);
    fireEvent.change(screen.getByLabelText('Loại thay đổi'), { target: { value: 'members' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Sửa thành viên/ })[0]);
    const firstTour = config.baseline.tours.find((t) => t.id === config.baseline.tourOrder[0])!;
    fireEvent.click(screen.getAllByRole('button', { name: 'Xoá bác sĩ khỏi tua' }).at(-1)!);
    chooseDate('2026-11-06');
    fireEvent.click(screen.getByRole('button', { name: 'Xem trước' }));
    await screen.findByText('Đã xem trước từ dữ liệu online. Chưa ghi thay đổi.');
    chooseDate('2026-11-08');
    expect(screen.queryByRole('button', { name: /Áp dụng từ/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xem trước' }));
    await screen.findByText('Đã xem trước từ dữ liệu online. Chưa ghi thay đổi.');
    expect(save).not.toHaveBeenCalled();
    const exception = screen.queryByLabelText('Cho phép áp dụng dù có trực hai ngày liên tiếp');
    if (exception) {
      fireEvent.click(exception);
      fireEvent.change(screen.getByLabelText('Lý do ngoại lệ'), {
        target: { value: 'Đã thống nhất' },
      });
      fireEvent.click(screen.getByLabelText(/Tôi đã xem các ngày/));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng từ 8/11/2026' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const version = save.mock.calls[0][0];
    expect(version.kind).toBe('members');
    expect(version.effectiveDate).toBe('2026-11-08');
    expect(
      version.roster.tours.find((t: { id: string }) => t.id === firstTour.id).doctorIds,
    ).toEqual(firstTour.doctorIds.slice(0, -1));
    expect(config).toEqual(original);
    await screen.findByText('Đã lưu online và đọc lại phiên bản thành công.');
  });
  it('shows a fixed upcoming month and selecting a date never writes', () => {
    const save = vi.fn();
    render(<RotationSettings config={config} canWrite onApply={save} />);
    expect(screen.getByLabelText('Tháng sắp xoay tua')).toHaveTextContent('Tháng 11, 2026');
    expect(document.querySelector('input[type="month"]')).toBeNull();
    chooseDate('2026-12-02');
    expect(screen.getByLabelText('Tháng sắp xoay tua')).toHaveTextContent('Tháng 11, 2026');
    expect(save).not.toHaveBeenCalled();
  });
  it('keeps the planned quarter when the effective date slips into the next month', async () => {
    const save = await preview(true, '2026-12-02');
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng từ 2/12/2026' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0].cycleMonth).toBe('2026-11');
  });
  it('blocks consecutive duties until reason and separate confirmation are provided', async () => {
    const save = await preview();
    const apply = screen.getByRole('button', { name: 'Áp dụng từ 7/11/2026' });
    expect(apply).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Cho phép áp dụng dù có trực hai ngày liên tiếp'));
    expect(apply).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Lý do ngoại lệ'), {
      target: { value: 'Bất khả kháng, đã thống nhất' },
    });
    expect(apply).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Tôi đã xem các ngày/));
    expect(apply).toBeEnabled();
    fireEvent.click(apply);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0].exceptionReason).toContain('Bất khả kháng');
  });
  it('allows read-only preview but never applies', async () => {
    const save = await preview(false, '2026-11-06');
    expect(screen.getByRole('button', { name: 'Áp dụng từ 6/11/2026' })).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });
  it('invalidates preview when the effective date changes', async () => {
    await preview(true, '2026-11-06');
    chooseDate('2026-11-08');
    expect(screen.queryByRole('button', { name: /Áp dụng từ/ })).not.toBeInTheDocument();
  });
  it('requires repreview after a server conflict and never reports success', async () => {
    const save = vi.fn().mockRejectedValue(new Error('schedule_conflict'));
    await preview(true, '2026-11-06', save);
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng từ 6/11/2026' }));
    await screen.findByText(/schedule_conflict/);
    expect(screen.queryByRole('button', { name: /Áp dụng từ/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Đã lưu online và đọc lại/)).not.toBeInTheDocument();
  });
});
