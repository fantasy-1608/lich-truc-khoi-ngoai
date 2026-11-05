import { describe, expect, it } from 'vitest';
import { isScheduleDateFrozen } from '../utils/scheduleEditing';

describe('schedule freeze policy', () => {
  const novemberFifth = new Date('2026-11-05T23:15:00+07:00');

  it('freezes every November 2026 day and earlier months while keeping December 2026 open', () => {
    for (let day = 1; day <= 30; day++) {
      expect(isScheduleDateFrozen(new Date(2026, 10, day), novemberFifth)).toBe(true);
    }
    expect(isScheduleDateFrozen(new Date(2026, 9, 31), novemberFifth)).toBe(true);
    for (let day = 1; day <= 31; day++) {
      expect(isScheduleDateFrozen(new Date(2026, 11, day), novemberFifth)).toBe(false);
    }
  });

  it('locks December 2026 exactly at December 1, 2026 00:00 in Vietnam', () => {
    const decemberEnd = new Date(2026, 11, 31);
    expect(isScheduleDateFrozen(decemberEnd, new Date('2026-11-30T16:59:59Z'))).toBe(false);
    expect(isScheduleDateFrozen(decemberEnd, new Date('2026-11-30T17:00:00Z'))).toBe(true);
    expect(isScheduleDateFrozen(new Date(2027, 0, 1), new Date('2026-11-30T17:00:00Z'))).toBe(
      false,
    );
  });

  it('freezes the current month consistently across years', () => {
    expect(isScheduleDateFrozen(new Date(2026, 9, 1), new Date('2026-10-15T00:00:00Z'))).toBe(true);
    expect(isScheduleDateFrozen(new Date(2027, 10, 1), new Date('2027-11-15T00:00:00Z'))).toBe(
      true,
    );
  });
});
