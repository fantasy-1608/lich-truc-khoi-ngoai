import { describe, it, expect } from 'vitest';
import { RotationConfig, RotationRoster, RotationVersion } from '../types';
import {
  swapPreceding,
  resolveDay,
  previewRotation,
  nextCycleMonth,
  dayNumber,
  addDays,
  validateRoster,
} from '../utils/rotation';
const baseline: RotationRoster = {
  doctors: ['Tiến', 'Tuấn', 'Thuận', 'Tòng'].map((name, i) => ({
    id: 'd' + i,
    name: 'Bs. ' + name,
    isCtch: false,
  })),
  tours: [0, 1, 2, 3].map((i) => ({ id: 't' + i, doctorIds: ['d' + i] })),
  tourOrder: ['t0', 't1', 't2', 't3'],
  rotationStartDate: '2026-10-04',
  holidaySchedule: { startDate: null, endDate: null, doctorOverrides: {} },
};
const config: RotationConfig = { baseline, versions: [] };
const version = (date = '2026-11-02'): RotationVersion => ({
  id: 'test',
  effectiveDate: date,
  kind: 'swap',
  roster: { ...baseline, tourOrder: swapPreceding(baseline.tourOrder, 't0').order },
  pivotTourId: 't0',
  partnerTourId: 't3',
  createdAt: '2026-10-08T00:00:00Z',
  createdBy: 'test',
  cycleMonth: '2026-11',
});
describe('periodic rotation', () => {
  it('matches all three cyclic swaps without restarting the phase', () => {
    let order = baseline.tourOrder;
    const actual = [];
    for (let i = 0; i < 3; i++) {
      order = swapPreceding(order, 't0').order;
      const j = order.indexOf('t0');
      actual.push([...order.slice(j), ...order.slice(0, j)]);
    }
    expect(actual).toEqual([
      ['t0', 't3', 't1', 't2'],
      ['t0', 't2', 't3', 't1'],
      ['t0', 't1', 't2', 't3'],
    ]);
  });
  it('preserves past dates and the two unaffected tour slots', () => {
    const next = { ...config, versions: [version()] };
    expect(resolveDay('2026-11-01', next, {})).toEqual(resolveDay('2026-11-01', config, {}));
    for (const key of ['2026-11-02', '2026-11-03', '2026-11-06', '2026-11-07'])
      expect(resolveDay(key, next, {}).doctors).toEqual(resolveDay(key, config, {}).doctors);
    expect(resolveDay('2026-11-04', next, {}).doctors).toEqual(['Bs. Tiến']);
  });
  it('shows 2 and 4 rest days for a suitable crossing', () => {
    const p = previewRotation(config, version(), {});
    expect(p.gaps.map((g) => g.restDays)).toEqual([2, 4]);
  });
  it('detects the dangerous boundary with consecutive duties', () => {
    const p = previewRotation(config, version('2026-11-05'), {});
    expect(
      p.warnings.some(
        (w) =>
          w.kind === 'consecutive' && w.date === '2026-11-05' && w.doctors.includes('Bs. Tòng'),
      ),
    ).toBe(true);
  });
  it('never lets a mutable tour override shadow a frozen snapshot', () => {
    const d = {
      '2026-09-01': { doctors: ['Bs. Tiến', 'Bs. Tân'], tourName: 'Bs. Tiến', tourId: 'obsolete' },
    };
    expect(
      resolveDay('2026-09-01', config, {
        scheduleSnapshots: d,
        tourOverrides: { '2026-09-01': 't3' },
      }).doctors,
    ).toEqual(d['2026-09-01'].doctors);
  });
  it('preserves a manual name correction over the snapshot', () => {
    expect(
      resolveDay('2026-09-01', config, {
        scheduleSnapshots: { '2026-09-01': { doctors: ['Bs. A'] } },
        doctorOverrides: { '2026-09-01': ['Bs. B'] },
      }).doctors,
    ).toEqual(['Bs. B']);
  });
  it('detects real doctor overlap even if tour IDs differ', () => {
    const data = { doctorOverrides: { '2026-11-03': ['Bs. Tòng'], '2026-11-04': ['Bs. Tòng'] } };
    expect(
      previewRotation(config, version(), data).warnings.some((w) => w.kind === 'consecutive'),
    ).toBe(true);
  });
  it('pins future snapshots instead of overwriting separately published days', () => {
    const data = { scheduleSnapshots: { '2026-11-04': { doctors: ['Published'] } } };
    expect(previewRotation(config, version(), data).pinnedDates).toContain('2026-11-04');
    expect(resolveDay('2026-11-04', { ...config, versions: [version()] }, data).doctors).toEqual([
      'Published',
    ]);
  });
  it('keeps member changes versioned, with old names and membership intact', () => {
    const v = version();
    v.kind = 'members';
    v.roster = {
      ...baseline,
      doctors: baseline.doctors.map((d) => (d.id === 'd1' ? { ...d, name: 'New' } : d)),
    };
    const next = { ...config, versions: [v] };
    expect(resolveDay('2026-11-02', next, {}).doctors).toEqual(['New']);
    expect(resolveDay('2026-11-01', next, {}).doctors).toEqual(['Bs. Tiến']);
  });
  it('keeps legacy tour override names pinned when roster members change', () => {
    const v = version();
    v.kind = 'members';
    v.roster = {
      ...baseline,
      doctors: baseline.doctors.map((d) => ({ ...d, name: 'Changed ' + d.name })),
    };
    const data = { tourOverrides: { '2026-11-04': baseline.tourOrder[0] } };
    expect(resolveDay('2026-11-04', { ...config, versions: [v] }, data).doctors).toEqual(
      resolveDay('2026-11-04', config, data).doctors,
    );
  });
  it('handles leap days and fixed quarterly month boundaries', () => {
    expect(dayNumber('2028-03-01') - dayNumber('2028-02-28')).toBe(2);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(nextCycleMonth('2026-11')).toBe('2027-02');
  });
  it('rejects empty or repeated roster slots', () => {
    expect(() => swapPreceding(['a', 'a', 'b', 'c'], 'a')).toThrow();
    expect(() => validateRoster(baseline)).toThrow('ít nhất 4');
  });
});
