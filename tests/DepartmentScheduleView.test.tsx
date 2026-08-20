import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DepartmentScheduleView from '../components/department/DepartmentScheduleView';

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

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));

    await waitFor(() => expect(onViewDateChange).toHaveBeenCalledTimes(2));
    const nextMonth = onViewDateChange.mock.calls[1][0] as Date;

    expect(nextMonth.getFullYear() * 12 + nextMonth.getMonth()).toBe(
      initialMonth.getFullYear() * 12 + initialMonth.getMonth() + 1,
    );
  });
});
