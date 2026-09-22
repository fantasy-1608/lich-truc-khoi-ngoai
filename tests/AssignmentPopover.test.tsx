import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import AssignmentPopover from '../components/department/AssignmentPopover';
import { DepartmentRole } from '../types';

describe('AssignmentPopover', () => {
  const baseDate = new Date(2026, 9, 2); // 2026-10-02
  const fakeTarget = document.createElement('button');

  const createProps = (overrides: Record<string, any> = {}) => ({
    editingState: {
      date: baseDate,
      role: 'pkdk' as DepartmentRole,
      target: fakeTarget,
    },
    assignmentDoctors: ['Bs. Anh', 'Bs. Hiển', 'Bs. Tân', 'Bs. Tín'],
    departmentAssignments: {
      '2026-10-02': {
        pkdk: ['Bs. Anh', 'Bs. Hiển'],
      },
    },
    getDoctorsForDate: (d: Date) => {
      // Suppose on 2026-10-02, Bs. Anh is now on-call in Khối ngoại
      if (d.getDate() === 2) {
        return ['Bs. Anh', 'Bs. Tòng'];
      }
      return [];
    },
    onSave: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  });

  it('keeps currently selected doctor visible even if they are on call today, allowing uncheck', () => {
    const onSave = vi.fn();
    const props = createProps({ onSave });
    render(<AssignmentPopover {...props} />);

    // Bs. Anh must be visible in the popover despite being on call today
    const anhCheckbox = screen.getByRole('checkbox', { name: /Bs\. Anh/i }) as HTMLInputElement;
    expect(anhCheckbox).toBeDefined();
    expect(anhCheckbox.checked).toBe(true);
    expect(anhCheckbox.disabled).toBe(false);

    // Conflict badge should be visible
    expect(screen.getByText(/Trực chính hôm nay/i)).toBeDefined();

    // User can uncheck Bs. Anh
    fireEvent.click(anhCheckbox);
    expect(anhCheckbox.checked).toBe(false);

    // Save should now only have Bs. Hiển
    const saveButton = screen.getByRole('button', { name: 'Lưu' });
    fireEvent.click(saveButton);
    expect(onSave).toHaveBeenCalledWith(['Bs. Hiển']);
  });

  it('provides "Xóa tất cả" button that clears all selections', () => {
    const onSave = vi.fn();
    const props = createProps({ onSave });
    render(<AssignmentPopover {...props} />);

    const clearAllButton = screen.getByRole('button', { name: 'Xóa tất cả' });
    expect(clearAllButton).toBeDefined();
    expect(clearAllButton.getAttribute('disabled')).toBeNull();

    fireEvent.click(clearAllButton);

    // Both checkboxes should now be unchecked
    const anhCheckbox = screen.getByRole('checkbox', { name: /Bs\. Anh/i }) as HTMLInputElement;
    const hienCheckbox = screen.getByRole('checkbox', { name: /Bs\. Hiển/i }) as HTMLInputElement;
    expect(anhCheckbox.checked).toBe(false);
    expect(hienCheckbox.checked).toBe(false);

    // Save should now send empty array
    const saveButton = screen.getByRole('button', { name: 'Lưu' });
    fireEvent.click(saveButton);
    expect(onSave).toHaveBeenCalledWith([]);
  });

  it('provides "Gỡ trùng" button to quickly remove only conflicted doctors', () => {
    const onSave = vi.fn();
    const props = createProps({ onSave });
    render(<AssignmentPopover {...props} />);

    // Conflict banner with "Gỡ trùng" button
    const removeConflictsButton = screen.getByRole('button', { name: 'Gỡ trùng' });
    expect(removeConflictsButton).toBeDefined();

    fireEvent.click(removeConflictsButton);

    // Bs. Anh should be removed, Bs. Hiển should remain checked
    const anhCheckbox = screen.getByRole('checkbox', { name: /Bs\. Anh/i }) as HTMLInputElement;
    const hienCheckbox = screen.getByRole('checkbox', { name: /Bs\. Hiển/i }) as HTMLInputElement;
    expect(anhCheckbox.checked).toBe(false);
    expect(hienCheckbox.checked).toBe(true);

    const saveButton = screen.getByRole('button', { name: 'Lưu' });
    fireEvent.click(saveButton);
    expect(onSave).toHaveBeenCalledWith(['Bs. Hiển']);
  });

  it('works identically for Ứng trực and PKDV roles', () => {
    // Test PKDV with 1 doctor limit
    const onSavePkdv = vi.fn();
    const pkdvProps = createProps({
      editingState: {
        date: baseDate,
        role: 'pkdv' as DepartmentRole,
        target: fakeTarget,
      },
      departmentAssignments: {
        '2026-10-02': {
          pkdv: ['Bs. Anh'],
        },
      },
      onSave: onSavePkdv,
    });

    const { unmount } = render(<AssignmentPopover {...pkdvProps} />);
    expect(screen.getByText('Chọn bác sĩ cho PKDV')).toBeDefined();
    expect(screen.getByText('Tối đa: 1')).toBeDefined();

    const clearButton = screen.getByRole('button', { name: 'Xóa tất cả' });
    fireEvent.click(clearButton);

    const saveButton = screen.getByRole('button', { name: 'Lưu' });
    fireEvent.click(saveButton);
    expect(onSavePkdv).toHaveBeenCalledWith([]);

    unmount();

    // Test Ứng trực
    const onSaveUngTruc = vi.fn();
    const ungTrucProps = createProps({
      editingState: {
        date: baseDate,
        role: 'ungTruc' as DepartmentRole,
        target: fakeTarget,
      },
      departmentAssignments: {
        '2026-10-02': {
          ungTruc: ['Bs. Anh'],
        },
      },
      onSave: onSaveUngTruc,
    });

    render(<AssignmentPopover {...ungTrucProps} />);
    expect(screen.getByText('Chọn bác sĩ cho Ứng trực')).toBeDefined();
    expect(screen.getByText('Tối đa: 2')).toBeDefined();
  });

  it('groups available doctors at the top and unavailable doctors at the bottom under "Đã có lịch khác"', () => {
    // Suppose Bs. Tín is on call today, but Bs. Hiển and Bs. Tân are free
    const props = createProps({
      assignmentDoctors: ['Bs. Tín', 'Bs. Hiển', 'Bs. Tân'],
      departmentAssignments: {
        '2026-10-02': {
          pkdk: [],
        },
      },
      getDoctorsForDate: (d: Date) => (d.getDate() === 2 ? ['Bs. Tín'] : []),
    });

    render(<AssignmentPopover {...props} />);

    // Section header for unavailable doctors should appear
    expect(screen.getByText(/Đã có lịch khác \(1\)/i)).toBeDefined();

    // Check all checkbox labels in DOM order
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(3);

    // Bs. Hiển and Bs. Tân should be the first two (available), Bs. Tín should be last (unavailable)
    const tinCheckbox = screen.getByRole('checkbox', { name: /Bs\. Tín/i });
    expect(tinCheckbox.getAttribute('disabled')).not.toBeNull();
    expect(checkboxes[2]).toBe(tinCheckbox);
  });
});

