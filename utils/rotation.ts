import { RotationConfig, RotationRoster, RotationVersion, ScheduleSnapshotEntry } from '../types';
import { START_DATE } from '../constants';

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return dateKey(d);
};
export const dayNumber = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};
export const validDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && dateKey(parseDate(s)) === s;
export const nextCycleMonth = (month: string) => {
  const d = parseDate(month + '-01');
  d.setMonth(d.getMonth() + 3);
  return dateKey(d).slice(0, 7);
};
export const earliestRotationDate = () => {
  const d = new Date();
  return dateKey(new Date(d.getFullYear(), d.getMonth() + 1, 1));
};
export const rosterAt = (config: RotationConfig, key: string): RotationRoster =>
  [...config.versions].reverse().find((v) => v.effectiveDate <= key)?.roster ?? config.baseline;
export const tourLabel = (roster: RotationRoster, id: string) => {
  const t = roster.tours.find((t) => t.id === id);
  return t?.name || roster.doctors.find((d) => d.id === t?.doctorIds[0])?.name || id;
};

export function swapPreceding(order: string[], pivot: string) {
  if (order.length !== 4 || new Set(order).size !== 4)
    throw Error('Xoay định kỳ yêu cầu đúng 4 tua khác nhau.');
  const i = order.indexOf(pivot);
  if (i < 0) throw Error('Không tìm thấy tua mốc.');
  const j = (i + order.length - 1) % order.length;
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return { order: next, partner: order[j] };
}

// Compute the original phase once. Versions exchange positions, never restart the cycle.
export function standardTour(key: string, roster: RotationRoster): string | undefined {
  const order = roster.tourOrder;
  if (!order.length) return undefined;
  const anchor =
    roster.rotationStartDate && key >= roster.rotationStartDate
      ? roster.rotationStartDate
      : dateKey(START_DATE);
  const n = dayNumber(key) - dayNumber(anchor);
  if (n < 0) return undefined;
  const mod = (x: number, l: number) => ((x % l) + l) % l;
  const h = roster.holidaySchedule;
  if (!h.startDate || !h.endDate || !h.holidayTourId || key < h.startDate)
    return order[mod(n, order.length)];
  const extended = [...order];
  extended.splice(
    Math.max(0, Math.min(h.holidayInsertionIndex ?? order.length, order.length)),
    0,
    h.holidayTourId,
  );
  const start = order[mod(dayNumber(h.startDate) - dayNumber(anchor), order.length)];
  const ix = extended.indexOf(start);
  if (key <= h.endDate)
    return extended[mod(ix + dayNumber(key) - dayNumber(h.startDate), extended.length)];
  const duration = dayNumber(h.endDate) - dayNumber(h.startDate) + 1;
  let next = mod(ix + duration, extended.length);
  if (extended[next] === h.holidayTourId) next = mod(next + 1, extended.length);
  return order[
    mod(order.indexOf(extended[next]) + dayNumber(key) - dayNumber(h.endDate) - 1, order.length)
  ];
}

export interface RotationMonthData {
  scheduleSnapshots?: Record<string, ScheduleSnapshotEntry>;
  doctorOverrides?: Record<string, string[]>;
  tourOverrides?: Record<string, string>;
}
export interface ResolvedDay {
  doctors: string[];
  tourId?: string;
  tourName?: string;
  pinned: boolean;
  source: 'doctor' | 'snapshot' | 'tour' | 'rotation';
}
export function resolveDay(
  key: string,
  config: RotationConfig,
  data: RotationMonthData,
): ResolvedDay {
  const roster = rosterAt(config, key);
  const doctors = data.doctorOverrides?.[key] ?? roster.holidaySchedule.doctorOverrides[key];
  if (doctors) return { doctors, tourName: doctors[0], pinned: true, source: 'doctor' };
  const snap = data.scheduleSnapshots?.[key];
  // Snapshot is a roster of names, not a reference to mutable global tour IDs.
  if (snap)
    return {
      doctors: snap.doctors,
      tourId: snap.tourId,
      tourName: snap.tourName ?? snap.doctors[0],
      pinned: true,
      source: 'snapshot',
    };
  const baselineId = standardTour(key, config.baseline);
  const slot = baselineId ? config.baseline.tourOrder.indexOf(baselineId) : -1;
  const id = data.tourOverrides?.[key] ?? (slot >= 0 ? roster.tourOrder[slot] : baselineId);
  // Legacy ID overrides predate versions; bind their names to the captured baseline.
  const assignedRoster = data.tourOverrides?.[key] ? config.baseline : roster;
  const tour = assignedRoster.tours.find((t) => t.id === id);
  const names =
    tour?.doctorIds
      .map((id) => assignedRoster.doctors.find((d) => d.id === id)?.name)
      .filter((n): n is string => !!n) ?? [];
  return {
    doctors: names,
    tourId: id,
    tourName: tour?.name ?? names[0],
    pinned: !!data.tourOverrides?.[key],
    source: data.tourOverrides?.[key] ? 'tour' : 'rotation',
  };
}
export function validateRoster(roster: RotationRoster) {
  if (roster.tourOrder.length !== 4 || new Set(roster.tourOrder).size !== 4)
    throw Error('Cần đúng 4 tua khác nhau.');
  for (const id of roster.tourOrder) {
    const t = roster.tours.find((t) => t.id === id);
    if (
      !t ||
      t.doctorIds.length < 4 ||
      t.doctorIds.some((id) => !roster.doctors.some((d) => d.id === id && d.name.trim()))
    )
      throw Error('Mỗi tua cần ít nhất 4 bác sĩ hợp lệ; hãy điền các ô trống.');
    if (new Set(t.doctorIds).size !== t.doctorIds.length)
      throw Error('Một bác sĩ đang được chọn hai lần trong cùng tua.');
  }
}
export interface RotationWarning {
  date: string;
  previousDate: string;
  kind: 'consecutive' | 'recovery' | 'saturday' | 'sunday' | 'weekend';
  doctors: string[];
}
export interface RotationPreview {
  rows: { date: string; before: ResolvedDay; after: ResolvedDay }[];
  warnings: RotationWarning[];
  gaps: { tourId: string; previousDate?: string; nextDate?: string; restDays?: number }[];
  pinnedDates: string[];
}
const normalized = (s: string) => s.trim().toLocaleLowerCase('vi-VN');
const overlap = (a: string[], b: string[]) =>
  a.filter((n) => b.some((m) => normalized(n) === normalized(m)));
export function previewRotation(
  config: RotationConfig,
  version: RotationVersion,
  data: RotationMonthData,
): RotationPreview {
  const next = { ...config, versions: [...config.versions, version] };
  const start = addDays(version.effectiveDate, -14),
    end = addDays(version.effectiveDate, 14);
  const rows: RotationPreview['rows'] = [];
  const warnings: RotationWarning[] = [];
  for (let key = start; key <= end; key = addDays(key, 1)) {
    const before = resolveDay(key, config, data),
      after = resolveDay(key, next, data);
    rows.push({ date: key, before, after });
    if (key < version.effectiveDate) continue;
    for (const diff of [1, 2, 7]) {
      const prior = addDays(key, -diff);
      const actual = resolveDay(prior, next, data),
        old = resolveDay(prior, config, data);
      const people = overlap(after.doctors, actual.doctors);
      const oldPeople = overlap(before.doctors, old.doctors);
      const weekday = parseDate(key).getDay();
      if (people.length && (diff !== 7 || weekday === 0 || weekday === 6)) {
        // Surface new risks only; pre-existing pins are separately identified.
        const added = people.filter((n) => !oldPeople.some((m) => normalized(m) === normalized(n)));
        if (diff === 1 ? people.length > 0 : added.length > 0)
          warnings.push({
            date: key,
            previousDate: prior,
            kind:
              diff === 1
                ? 'consecutive'
                : diff === 2
                  ? 'recovery'
                  : weekday === 6
                    ? 'saturday'
                    : 'sunday',
            doctors: diff === 1 ? people : added,
          });
      }
    }
    if ([0, 6].includes(parseDate(key).getDay())) {
      const priorWeekendOffsets = parseDate(key).getDay() === 6 ? [6, 7] : [7, 8];
      for (const diff of priorWeekendOffsets.filter((d) => d !== 7)) {
        const prior = addDays(key, -diff),
          people = overlap(after.doctors, resolveDay(prior, next, data).doctors);
        const old = overlap(before.doctors, resolveDay(prior, config, data).doctors);
        const added = people.filter((n) => !old.some((m) => normalized(m) === normalized(n)));
        if (added.length)
          warnings.push({ date: key, previousDate: prior, kind: 'weekend', doctors: added });
      }
    }
  }
  const gaps = [version.pivotTourId, version.partnerTourId]
    .filter((id): id is string => !!id)
    .map((tourId) => {
      const identity = rosterAt(config, version.effectiveDate).tours.find((t) => t.id === tourId)
        ?.doctorIds[0];
      const name = rosterAt(config, version.effectiveDate).doctors.find(
        (d) => d.id === identity,
      )?.name;
      const matching = (day: ResolvedDay) =>
        day.tourId === tourId ||
        (!!name && day.doctors.some((n) => normalized(n) === normalized(name)));
      const previousDate = rows
        .filter((r) => r.date < version.effectiveDate && matching(r.after))
        .at(-1)?.date;
      const nextDate = rows.find((r) => r.date >= version.effectiveDate && matching(r.after))?.date;
      return {
        tourId,
        previousDate,
        nextDate,
        restDays:
          previousDate && nextDate ? dayNumber(nextDate) - dayNumber(previousDate) - 1 : undefined,
      };
    });
  return {
    rows,
    warnings,
    gaps,
    pinnedDates: rows
      .filter((r) => r.date >= version.effectiveDate && r.after.pinned)
      .map((r) => r.date),
  };
}

export const canonicalJson = (value: unknown): string =>
  JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
