import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DepartmentScheduleView from '../components/department/DepartmentScheduleView';
import {
  getCurrentMonthDate,
  getInitialScheduleMonthDate,
  getNextMonthDate,
} from '../utils/date';

const originalInnerWidth = window.innerWidth;

afterEach(() => {
  cleanup();
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: originalInnerWidth,
  });
});

describe('DepartmentScheduleView', () => {
  it('keeps the storage month synchronized with the visible department month', async () => {
    const onViewDateChange = vi.fn();

    render(
      <DepartmentScheduleView
        allDoctors={[]}
        showPkdv={true}
        departmentAssignments={{}}
        onUpdateDepartmentAssignments={vi.fn()}
        onViewDateChange={onViewDateChange}
        getDoctorsForDate={() => undefined}
      />,
    );

    await waitFor(() => expect(onViewDateChange).toHaveBeenCalledTimes(1));
    const initialMonth = onViewDateChange.mock.calls[0][0] as Date;

    fireEvent.click(screen.getByRole('button', { name: 'Tháng sau' }));

    await waitFor(() => expect(onViewDateChange).toHaveBeenCalledTimes(2));
    const nextMonth = onViewDateChange.mock.calls[1][0] as Date;

    expect(nextMonth.getFullYear() * 12 + nextMonth.getMonth()).toBe(
      initialMonth.getFullYear() * 12 + initialMonth.getMonth() + 1,
    );
  });

  it('defaults to the current month on mobile viewports and next month on desktop viewports', async () => {
    const currentMonth = getCurrentMonthDate();
    const nextMonth = getNextMonthDate();

    expect(getInitialScheduleMonthDate(true).getTime()).toBe(currentMonth.getTime());
    expect(getInitialScheduleMonthDate(false).getTime()).toBe(nextMonth.getTime());

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390,
    });
    const mobileViewDateChange = vi.fn();
    render(
      <DepartmentScheduleView
        allDoctors={[]}
        showPkdv={true}
        departmentAssignments={{}}
        onUpdateDepartmentAssignments={vi.fn()}
        onViewDateChange={mobileViewDateChange}
        getDoctorsForDate={() => undefined}
      />,
    );

    await waitFor(() => expect(mobileViewDateChange).toHaveBeenCalledTimes(1));
    const mobileInitialMonth = mobileViewDateChange.mock.calls[0][0] as Date;
    expect(mobileInitialMonth.getFullYear()).toBe(currentMonth.getFullYear());
    expect(mobileInitialMonth.getMonth()).toBe(currentMonth.getMonth());
    expect(mobileInitialMonth.getDate()).toBe(1);

    cleanup();

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1024,
    });
    const desktopViewDateChange = vi.fn();
    render(
      <DepartmentScheduleView
        allDoctors={[]}
        showPkdv={true}
        departmentAssignments={{}}
        onUpdateDepartmentAssignments={vi.fn()}
        onViewDateChange={desktopViewDateChange}
        getDoctorsForDate={() => undefined}
      />,
    );

    await waitFor(() => expect(desktopViewDateChange).toHaveBeenCalledTimes(1));
    const desktopInitialMonth = desktopViewDateChange.mock.calls[0][0] as Date;
    expect(desktopInitialMonth.getFullYear()).toBe(nextMonth.getFullYear());
    expect(desktopInitialMonth.getMonth()).toBe(nextMonth.getMonth());
    expect(desktopInitialMonth.getDate()).toBe(1);
  });
});
