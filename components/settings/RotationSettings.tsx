import React, { useMemo, useRef, useState } from 'react';
import { RotationConfig, RotationRoster, RotationVersion } from '../../types';
import {
  loadBaseScheduleData,
  loadMonthScheduleData,
  ScheduleMonthStorageData,
} from '../../services/scheduleStorage';
import {
  addDays,
  canonicalJson,
  earliestRotationDate,
  nextCycleMonth,
  parseDate,
  previewRotation,
  rosterAt,
  RotationPreview,
  swapPreceding,
  tourLabel,
  validDate,
  validateRoster,
} from '../../utils/rotation';
import ReorderToursList from './ReorderToursList';
import DoctorManager from './DoctorManager';
import RotationDatePicker from './RotationDatePicker';

interface Props {
  config: RotationConfig;
  canWrite: boolean;
  onApply: (
    v: RotationVersion,
    base: string | null,
    months: Record<string, string | null>,
    data: ScheduleMonthStorageData,
  ) => Promise<void>;
}
interface Prepared {
  version: RotationVersion;
  preview: RotationPreview;
  base: string | null;
  months: Record<string, string | null>;
  data: ScheduleMonthStorageData;
  fingerprint: string;
}
const displayDate = (s: string) => parseDate(s).toLocaleDateString('vi-VN');
const errorMessage = (e: unknown) =>
  e instanceof Error
    ? e.message
    : typeof e === 'object' && e !== null && 'message' in e
      ? String(e.message)
      : 'Không đọc/lưu được dữ liệu. Hãy thử xem trước lại.';
const warningLabel = {
  consecutive: 'Trực hai ngày liên tiếp',
  recovery: 'Mới ra trực: chỉ nghỉ 1 ngày',
  saturday: 'Hai thứ 7 liên tiếp',
  sunday: 'Hai chủ nhật liên tiếp',
  weekend: 'Hai cuối tuần liền nhau',
};

export default function RotationSettings({ config, canWrite, onApply }: Props) {
  const [kind, setKind] = useState<'swap' | 'members'>('swap');
  const last = config.versions.at(-1);
  const minDate = last
    ? [
        earliestRotationDate(),
        kind === 'members' ? last.effectiveDate : addDays(last.effectiveDate, 1),
      ]
        .sort()
        .at(-1)!
    : earliestRotationDate();
  const lastSwap = [...config.versions].reverse().find((v) => v.kind === 'swap');
  const plannedCycle = lastSwap
    ? nextCycleMonth(lastSwap.cycleMonth)
    : config.baselineEffectiveDate?.slice(0, 7) || minDate.slice(0, 7);
  const [effectiveDate, setDate] = useState('');
  const current = rosterAt(config, effectiveDate || minDate);
  const [draft, setDraft] = useState<RotationRoster | null>(null);
  const roster = draft ?? current;
  const defaultPivot = current.tourOrder.find((id) => tourLabel(current, id) === 'Bs. Tiến') ?? '';
  const [selectedPivot, setPivot] = useState('');
  const pivot = selectedPivot || defaultPivot;
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [exception, setException] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [pinConfirmed, setPinConfirmed] = useState(false);
  const [suggestions, setSuggestions] = useState<{ date: string; risks: number }[]>([]);
  const generation = useRef(0);
  const fingerprint = JSON.stringify({ config, effectiveDate, kind, roster, pivot, plannedCycle });
  const ready = prepared?.fingerprint === fingerprint ? prepared : null;
  const swapped = useMemo(() => {
    try {
      return swapPreceding(current.tourOrder, pivot);
    } catch {
      return null;
    }
  }, [current, pivot]);
  const proposal: RotationRoster =
    kind === 'swap' && swapped ? { ...current, tourOrder: swapped.order } : roster;
  const consecutive = ready?.preview.warnings.some((w) => w.kind === 'consecutive') ?? false;
  const invalidate = () => {
    generation.current++;
    setPrepared(null);
    setStatus('');
    setConfirmed(false);
    setException(false);
    setReason('');
    setPinConfirmed(false);
    setSuggestions([]);
  };
  const changeRoster = (f: (r: RotationRoster) => RotationRoster) => {
    invalidate();
    setDraft(f(roster));
  };

  async function prepare(date = effectiveDate, suggest = false) {
    invalidate();
    const token = generation.current;
    setBusy(true);
    setStatus('Đang đọc dữ liệu online để xem trước…');
    try {
      if (!validDate(date) || date < minDate)
        throw Error(`Chọn ngày từ ${displayDate(minDate)}. Tháng đã chốt giữ nguyên.`);
      if (kind === 'swap' && !swapped) throw Error('Chọn tua mốc; cần đúng 4 tua.');
      validateRoster(proposal);
      if (kind === 'swap' && !validDate(plannedCycle + '-01'))
        throw Error('Chưa xác định được tháng đến kỳ xoay.');
      if (kind === 'members' && JSON.stringify(proposal) === JSON.stringify(current))
        throw Error('Chưa có thay đổi thành viên hoặc tên tua.');
      const base = await loadBaseScheduleData();
      if (!base.data) throw Error('Không đọc được cấu hình gốc; chưa thể xem trước.');
      const live: RotationConfig = base.data.rotationConfig ?? {
        baseline: {
          doctors: base.data.doctors ?? [],
          tours: base.data.tours ?? [],
          tourOrder: base.data.tourOrder ?? [],
          rotationStartDate: base.data.rotationStartDate ?? null,
          holidaySchedule: base.data.holidaySchedule ?? {
            startDate: null,
            endDate: null,
            doctorOverrides: {},
          },
        },
        versions: [],
      };
      if (canonicalJson(live) !== canonicalJson(config))
        throw Error('Cấu hình trên máy chủ đã thay đổi. Hãy tải lại trang trước khi xem trước.');
      const first = addDays(date, -28),
        end = addDays(date, 28);
      const files = new Set<string>();
      for (let k = first; k <= end; k = addDays(k, 1))
        files.add(`schedule_${k.slice(0, 4)}_${k.slice(5, 7)}.json`);
      const months: Record<string, string | null> = {};
      const data: ScheduleMonthStorageData = {
        scheduleSnapshots: {},
        doctorOverrides: {},
        tourOverrides: {},
      };
      const records = await Promise.all(
        [...files].map(async (f) => ({ f, record: await loadMonthScheduleData(f) })),
      );
      for (const { f, record } of records) {
        months[f.slice(9, 13) + '-' + f.slice(14, 16)] = record.updatedAt;
        for (const key of ['scheduleSnapshots', 'doctorOverrides', 'tourOverrides'] as const)
          Object.assign(data[key]!, record.data?.[key]);
      }
      const version: RotationVersion = {
        id: crypto.randomUUID(),
        effectiveDate: date,
        kind,
        roster: proposal,
        pivotTourId: kind === 'swap' ? pivot : undefined,
        partnerTourId: kind === 'swap' ? swapped?.partner : undefined,
        createdAt: new Date().toISOString(),
        createdBy: '',
        cycleMonth: kind === 'swap' ? plannedCycle : (last?.cycleMonth ?? date.slice(0, 7)),
      };
      const preview = previewRotation(config, version, data);
      if (token !== generation.current) return;
      if (suggest) {
        const candidates = [];
        for (let n = -7; n <= 7; n++) {
          const candidate = addDays(date, n);
          if (candidate < minDate) continue;
          const p = previewRotation(config, { ...version, effectiveDate: candidate }, data);
          if (!p.warnings.some((w) => w.kind === 'consecutive'))
            candidates.push({
              date: candidate,
              risks: p.warnings.filter((w) => ['saturday', 'sunday', 'weekend'].includes(w.kind))
                .length,
            });
        }
        candidates.sort(
          (a, b) =>
            a.risks - b.risks ||
            Math.abs(parseDate(a.date).getTime() - parseDate(date).getTime()) -
              Math.abs(parseDate(b.date).getTime() - parseDate(date).getTime()),
        );
        setSuggestions(candidates.slice(0, 4));
        setStatus(
          candidates.length
            ? 'Chọn một ngày gợi ý rồi xem trước lại.'
            : 'Không có ngày phù hợp trong khoảng ±7 ngày. Chọn khoảng khác.',
        );
      } else {
        setPrepared({ version, preview, base: base.updatedAt, months, data, fingerprint });
        setStatus('Đã xem trước từ dữ liệu online. Chưa ghi thay đổi.');
      }
    } catch (e) {
      if (token === generation.current) setStatus(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function apply() {
    if (!ready || !canWrite || busy) return;
    if (consecutive && (!exception || !reason.trim() || !confirmed)) {
      setStatus('Cần lý do và xác nhận ngoại lệ cho trực liên tiếp.');
      return;
    }
    if (ready.preview.pinnedDates.length && !pinConfirmed) {
      setStatus('Hãy xác nhận giữ nguyên các ngày đã phân công riêng.');
      return;
    }
    setBusy(true);
    setStatus('Đang lưu phiên bản và kiểm tra dữ liệu online…');
    try {
      await onApply(
        { ...ready.version, exceptionReason: consecutive ? reason.trim() : undefined },
        ready.base,
        ready.months,
        ready.data,
      );
      invalidate();
      setDraft(null);
      setDate('');
      setStatus('Đã lưu online và đọc lại phiên bản thành công.');
    } catch (e) {
      setPrepared(null);
      setStatus(errorMessage(e) + ' Hãy xem trước lại.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rotation-settings" aria-labelledby="rotation-title">
      <div className="rotation-heading">
        <div>
          <h3 id="rotation-title">Xoay tua định kỳ</h3>
          <p>Đổi lượt hai tua mỗi 3 tháng. Các tua còn lại giữ nhịp trực.</p>
        </div>
        <span className="rotation-status">Áp dụng từ tháng chưa chốt</span>
      </div>
      {kind === 'swap' && (
        <div className="rotation-upcoming" aria-label="Tháng sắp xoay tua">
          <span>Tháng sắp xoay tua</span>
          <strong>
            Tháng {Number(plannedCycle.slice(5))}, {plannedCycle.slice(0, 4)}
          </strong>
          <p>Đổi lượt mỗi 3 tháng. Chọn ngày áp dụng phù hợp bên dưới; hệ thống không tự xoay.</p>
        </div>
      )}
      <fieldset disabled={busy} className="rotation-fields">
        <legend className="sr-only">Bản nháp thay đổi tua</legend>
        <label>
          Loại thay đổi
          <select
            value={kind}
            onChange={(e) => {
              invalidate();
              setKind(e.target.value as 'swap' | 'members');
              setDraft(null);
            }}
          >
            <option value="swap">Xoay tua định kỳ</option>
            <option value="members">Thành viên và tên tua</option>
          </select>
        </label>
        <RotationDatePicker
          value={effectiveDate}
          min={minDate}
          initialMonth={plannedCycle}
          onChange={(date) => {
            invalidate();
            setDate(date);
          }}
        />
        {kind === 'swap' && (
          <label>
            Tua mốc
            <select
              value={pivot}
              onChange={(e) => {
                invalidate();
                setPivot(e.target.value);
              }}
            >
              <option value="">Chọn tua mốc</option>
              {current.tourOrder.map((id) => (
                <option value={id} key={id}>
                  {tourLabel(current, id)}
                </option>
              ))}
            </select>
          </label>
        )}
      </fieldset>
      {kind === 'swap' && (
        <p className="rotation-note">
          Kỳ sau là tháng {Number(nextCycleMonth(plannedCycle).slice(5))}/
          {nextCycleMonth(plannedCycle).slice(0, 4)}; dịch ngày áp dụng không làm trôi chu kỳ.
        </p>
      )}
      <p id="rotation-date-help" className="rotation-note">
        Chọn ngày từ {displayDate(minDate)}. Giữ điểm neo của lịch hiện tại, không bắt đầu lại bằng
        tua Tiến.
      </p>
      {kind === 'swap' ? (
        <div className="rotation-table-wrap">
          <table>
            <caption>
              Thứ tự trước và sau xoay{' '}
              {swapped &&
                `— đổi ${tourLabel(current, pivot)} với ${tourLabel(current, swapped.partner)}`}
            </caption>
            <thead>
              <tr>
                <th>Vị trí</th>
                <th>Hiện tại</th>
                <th>Sau xoay</th>
                <th>Tác động</th>
              </tr>
            </thead>
            <tbody>
              {current.tourOrder.map((id, i) => (
                <tr key={id} className={proposal.tourOrder[i] !== id ? 'rotation-changed' : ''}>
                  <td>{i + 1}</td>
                  <td>{tourLabel(current, id)}</td>
                  <td>{tourLabel(proposal, proposal.tourOrder[i])}</td>
                  <td>{proposal.tourOrder[i] === id ? 'Giữ lượt' : 'Đổi lượt'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <p className="rotation-note">
            Chỉ lưu khi bấm Áp dụng. Danh mục và thành viên thuộc phiên bản có ngày hiệu lực.
          </p>
          <ReorderToursList
            doctors={roster.doctors}
            tours={roster.tours}
            tourOrder={roster.tourOrder}
            onReorderTours={() => {}}
            allowReorder={false}
            onUpdateDoctorInTour={(id, index, doc) =>
              changeRoster((r) => ({
                ...r,
                tours: r.tours.map((t) =>
                  t.id === id
                    ? { ...t, doctorIds: t.doctorIds.map((d, i) => (i === index ? doc : d)) }
                    : t,
                ),
              }))
            }
            onAddDoctorToTour={(id) =>
              changeRoster((r) => ({
                ...r,
                tours: r.tours.map((t) =>
                  t.id === id ? { ...t, doctorIds: [...t.doctorIds, ''] } : t,
                ),
              }))
            }
            onRemoveDoctorFromTour={(id, index) =>
              changeRoster((r) => ({
                ...r,
                tours: r.tours.map((t) =>
                  t.id === id ? { ...t, doctorIds: t.doctorIds.filter((_, i) => i !== index) } : t,
                ),
              }))
            }
            onRenameTour={(id, name) =>
              changeRoster((r) => ({
                ...r,
                tours: r.tours.map((t) => (t.id === id ? { ...t, name } : t)),
              }))
            }
          />
          <details>
            <summary>Danh mục bác sĩ của bản nháp</summary>
            <DoctorManager
              doctors={roster.doctors}
              onAddDoctor={(name, isCtch) =>
                changeRoster((r) => ({
                  ...r,
                  doctors: [...r.doctors, { id: crypto.randomUUID(), name, isCtch }],
                }))
              }
              onRemoveDoctor={(id) => {
                if (roster.tours.some((t) => t.doctorIds.includes(id))) {
                  setStatus(
                    'Bác sĩ đang trong tua. Hãy thay thành viên trước khi bỏ khỏi bản nháp.',
                  );
                  return;
                }
                changeRoster((r) => ({ ...r, doctors: r.doctors.filter((d) => d.id !== id) }));
              }}
              onUpdateDoctor={(id, updates) =>
                changeRoster((r) => ({
                  ...r,
                  doctors: r.doctors.map((d) => (d.id === id ? { ...d, ...updates } : d)),
                }))
              }
            />
          </details>
        </>
      )}
      <div className="rotation-actions">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            invalidate();
            setDraft(null);
            setDate('');
          }}
        >
          Hủy thay đổi
        </button>
        <button type="button" disabled={busy || !effectiveDate} onClick={() => void prepare()}>
          Xem trước
        </button>
        {kind === 'swap' && (
          <button
            type="button"
            disabled={busy || !effectiveDate}
            onClick={() => void prepare(effectiveDate, true)}
          >
            Gợi ý ngày phù hợp
          </button>
        )}
      </div>
      <p role="status" aria-live="polite" className="rotation-feedback">
        {status ||
          (!canWrite
            ? 'Chỉ xem. Mở khóa để áp dụng; vẫn có thể thử xem trước.'
            : 'Chọn ngày và xem trước trước khi áp dụng.')}
      </p>
      {!!suggestions.length && (
        <div className="rotation-suggestions">
          {suggestions.map((s) => (
            <button
              key={s.date}
              onClick={() => {
                invalidate();
                setDate(s.date);
              }}
            >
              {' '}
              {displayDate(s.date)} · {s.risks} cảnh báo cuối tuần
            </button>
          ))}
        </div>
      )}
      {ready && (
        <div className="rotation-preview">
          <h4>Kiểm tra trước khi áp dụng</h4>
          <div className="rotation-gap-list">
            {ready.preview.gaps.map((g) => (
              <p key={g.tourId}>
                <strong>{tourLabel(current, g.tourId)}</strong>:{' '}
                {g.previousDate ? displayDate(g.previousDate) : 'chưa có lượt trước'} →{' '}
                {g.nextDate ? displayDate(g.nextDate) : 'chưa có lượt sau'} ·{' '}
                {g.restDays !== undefined ? `${g.restDays} ngày nghỉ` : 'chưa đủ dữ liệu'}
              </p>
            ))}
          </div>
          {!ready.preview.warnings.length ? (
            <p>Không phát sinh cảnh báo trong khoảng xem trước.</p>
          ) : (
            <ul className="rotation-warning-list">
              {ready.preview.warnings.map((w, i) => (
                <li key={i} className={w.kind === 'consecutive' ? 'rotation-critical' : ''}>
                  <strong>{warningLabel[w.kind]}</strong> · {displayDate(w.previousDate)} →{' '}
                  {displayDate(w.date)} · {w.doctors.join(', ')}
                </li>
              ))}
            </ul>
          )}
          {!!ready.preview.pinnedDates.length && (
            <label className="rotation-check">
              <input
                type="checkbox"
                checked={pinConfirmed}
                onChange={(e) => setPinConfirmed(e.target.checked)}
              />
              Giữ nguyên {ready.preview.pinnedDates.length} ngày có snapshot/đổi ca riêng; các ngày
              này không theo tua mới.
            </label>
          )}
          {consecutive && (
            <fieldset className="rotation-exception">
              <legend>Ngoại lệ bất khả kháng</legend>
              <label className="rotation-check">
                <input
                  type="checkbox"
                  checked={exception}
                  onChange={(e) => {
                    setException(e.target.checked);
                    setConfirmed(false);
                  }}
                />
                Cho phép áp dụng dù có trực hai ngày liên tiếp
              </label>
              {exception && (
                <>
                  <label>
                    Lý do ngoại lệ
                    <textarea
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value);
                        setConfirmed(false);
                      }}
                      maxLength={1000}
                      rows={3}
                    />
                  </label>
                  <label className="rotation-check">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    Tôi đã xem các ngày và bác sĩ nêu trên, xác nhận áp dụng ngoại lệ.
                  </label>
                </>
              )}
            </fieldset>
          )}
          <details open>
            <summary>Lịch 14 ngày trước và 14 ngày sau mốc</summary>
            <div className="rotation-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Trước thay đổi</th>
                    <th>Sau thay đổi</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {ready.preview.rows.map((r) => (
                    <tr key={r.date} className={r.date === effectiveDate ? 'rotation-changed' : ''}>
                      <td>
                        {parseDate(r.date).toLocaleDateString('vi-VN', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </td>
                      <td>
                        {r.before.tourName}
                        <small>{r.before.doctors.join(', ')}</small>
                      </td>
                      <td>
                        {r.after.tourName}
                        <small>{r.after.doctors.join(', ')}</small>
                      </td>
                      <td>
                        {r.after.pinned
                          ? 'Giữ phân công riêng'
                          : r.date < effectiveDate
                            ? 'Giữ lịch cũ'
                            : r.before.tourName === r.after.tourName
                              ? 'Giữ lượt'
                              : 'Đổi lượt'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <button
            className="rotation-primary"
            disabled={
              !canWrite ||
              busy ||
              (consecutive && (!exception || !reason.trim() || !confirmed)) ||
              (!!ready.preview.pinnedDates.length && !pinConfirmed)
            }
            onClick={() => void apply()}
          >
            {busy ? 'Đang lưu…' : `Áp dụng từ ${displayDate(effectiveDate)}`}
          </button>
        </div>
      )}
      <details className="rotation-history">
        <summary>Lịch sử cấu hình ({config.versions.length})</summary>
        {!config.versions.length ? (
          <p>Chưa có phiên bản mới. Lịch hiện tại được giữ làm nền.</p>
        ) : (
          <ol>
            {[...config.versions].reverse().map((v) => (
              <li key={v.id}>
                <strong>
                  {displayDate(v.effectiveDate)} ·{' '}
                  {v.kind === 'swap' ? 'Xoay tua' : 'Thành viên tua'}
                </strong>
                <p>{v.roster.tourOrder.map((id) => tourLabel(v.roster, id)).join(' → ')}</p>
                <small>
                  Lưu {new Date(v.createdAt).toLocaleString('vi-VN')} · {v.createdBy}
                </small>
                {v.exceptionReason && <p>Ngoại lệ: {v.exceptionReason}</p>}
              </li>
            ))}
          </ol>
        )}
      </details>
    </section>
  );
}
