import { describe, expect, it } from 'vitest';
import { isScheduleDateFrozen } from '../utils/scheduleEditing';

describe('November 2026 schedule reopening', () => {
  const november = new Date('2026-11-01T00:00:00+07:00');

  it('allows every November day and future months, keeping October locked', () => {
    for (let day = 1; day <= 30; day++) {
      expect(isScheduleDateFrozen(new Date(2026, 10, day), november)).toBe(false);
    }
    expect(isScheduleDateFrozen(new Date(2026, 11, 1), november)).toBe(false);
    expect(isScheduleDateFrozen(new Date(2026, 9, 31), november)).toBe(true);
  });

  it('relocks November exactly at December 1 in Vietnam', () => {
    const date = new Date(2026, 10, 30);
    expect(isScheduleDateFrozen(date, new Date('2026-11-30T16:59:59Z'))).toBe(false);
    expect(isScheduleDateFrozen(date, new Date('2026-11-30T17:00:00Z'))).toBe(true);
  });

  it('does not reopen other current months or November in another year', () => {
    expect(isScheduleDateFrozen(new Date(2026, 9, 1), new Date('2026-10-15T00:00:00Z'))).toBe(true);
    expect(isScheduleDateFrozen(new Date(2027, 10, 1), new Date('2027-11-15T00:00:00Z'))).toBe(
      true,
    );
  });
});
