import { readFileSync } from 'node:fs';
import type { jsPDF } from 'jspdf';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportDepartmentToPDF, exportScheduleToPDF } from '../utils/export/pdf';
import type { CalendarDay, DepartmentAssignments, ScheduleCalendarDay } from '../types';

const capture = vi.hoisted(() => ({
  pages: 1,
  orientations: [] as string[],
  cells: [] as Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    style?: string | null;
    page: number;
  }>,
  text: [] as Array<{
    lines: string[];
    x: number;
    right: number;
    y: number;
    bottom: number;
    page: number;
  }>,
}));

vi.mock('jspdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jspdf')>();
  return {
    jsPDF: vi.fn(function (options) {
      capture.orientations.push(options?.orientation ?? 'portrait');
      const pdf = new actual.jsPDF(options);
      const rect = pdf.rect.bind(pdf),
        text = pdf.text.bind(pdf),
        addPage = pdf.addPage.bind(pdf);
      pdf.rect = ((x, y, width, height, style) => {
        capture.cells.push({ x, y, width, height, style, page: capture.pages });
        return rect(x, y, width, height, style);
      }) as typeof pdf.rect;
      pdf.text = ((value, x, y, options = {}) => {
        const lines = Array.isArray(value) ? (value as string[]) : [value as string];
        const width = Math.max(...lines.map((line) => pdf.getTextWidth(line)));
        const left =
          options.align === 'right' ? x - width : options.align === 'center' ? x - width / 2 : x;
        capture.text.push({
          lines,
          x: left,
          right: left + width,
          y,
          bottom:
            y +
            (lines.length - 1) * pdf.getFontSize() * (options.lineHeightFactor ?? 1.15) +
            pdf.getFontSize() * 0.3,
          page: capture.pages,
        });
        return text(value, x, y, options);
      }) as typeof pdf.text;
      pdf.addPage = (() => {
        capture.pages++;
        return addPage();
      }) as typeof pdf.addPage;
      return pdf;
    }),
  };
});

vi.mock('../utils/export/common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/export/common')>();
  return {
    ...actual,
    savePDFBlob: vi.fn(),
    registerPDFFonts: async (pdf: jsPDF) => {
      for (const [file, style] of [
        ['NotoSans-Regular.ttf', 'normal'],
        ['NotoSans-Bold.ttf', 'bold'],
      ]) {
        pdf.addFileToVFS(file, readFileSync(`public/fonts/${file}`).toString('base64'));
        pdf.addFont(file, 'NotoSansSchedule', style);
      }
    },
  };
});

describe('department PDF layout (A4 landscape clean white background with bold labels)', () => {
  beforeEach(() => {
    capture.pages = 1;
    capture.orientations = [];
    capture.cells = [];
    capture.text = [];
  });

  it('uses clean white weekday cells with bold ƯT:/PK:/DV:/Trực: labels, normal doctor names, and slim 68pt weekend columns', async () => {
    const days: CalendarDay[] = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(2026, 9, 26 + index);
      return {
        date,
        isCurrentMonth: date.getMonth() === 10,
        isToday: false,
        isWeekend: [0, 6].includes(date.getDay()),
      };
    });
    const assignments: Record<string, Partial<DepartmentAssignments>> = {};
    for (let day = 2; day <= 30; day++)
      assignments[`2026-11-${String(day).padStart(2, '0')}`] = {
        ungTruc: ['Bs. Tân', 'Bs. Minh (CTCH)'],
        pkdk: ['Bs. Đức'],
        pkdv: ['Bs. Tôn'],
      };
    const getDoctors = (date: Date) =>
      date.getDate() % 4 === 0
        ? ['Bs. Tòng', 'Bs. Đức', 'Bs. Tôn', 'Bs. Kiệt', 'Bs. Minh (CTCH)']
        : ['Bs. Thuận', 'Bs. Luận', 'Bs. Đạt', 'Bs. Cảnh', 'Bs. Tín'];

    await exportDepartmentToPDF(days, new Date(2026, 10, 1), assignments, getDoctors, true);

    expect(capture.orientations).toEqual(['landscape']);
    expect(capture.pages).toBe(1);

    const headerCells = capture.cells.filter((cell) => cell.y === 42 && cell.height === 18);
    expect(headerCells).toHaveLength(7);
    expect(headerCells[0].width).toBeGreaterThan(130);
    expect(headerCells[5].width).toBe(68);
    expect(headerCells[6].width).toBe(68);

    const weekendStartX = headerCells[5].x;
    // Weekday cells have zero background fill rectangles (clean white cells)
    const weekdayBgRects = capture.cells.filter(
      (cell) => cell.y >= 60 && cell.style === 'F' && cell.x < weekendStartX,
    );
    expect(weekdayBgRects).toHaveLength(0);

    const dayCells = capture.cells.filter((cell) => cell.y >= 60 && cell.style === 'S');
    const rowYValues = [...new Set(dayCells.map((cell) => Number(cell.y.toFixed(2))))].sort(
      (a, b) => a - b,
    );
    expect(rowYValues).toHaveLength(6);

    const week1Height = dayCells.find((cell) => Math.abs(cell.y - rowYValues[0]) < 0.1)!.height;
    const week2Height = dayCells.find((cell) => Math.abs(cell.y - rowYValues[1]) < 0.1)!.height;
    expect(week1Height).toBeLessThan(week2Height);

    // Every day-cell text block must stay completely inside its drawn cell frame
    const cellTextBlocks = capture.text.filter(
      (block) =>
        block.y >= 60 &&
        !block.lines.some((line) => line.startsWith('Ngày ') || line === 'DUYỆT LÃNH ĐẠO KHOA'),
    );
    for (const block of cellTextBlocks) {
      const cell = dayCells.find(
        (cell) =>
          cell.page === block.page &&
          block.x >= cell.x - 0.1 &&
          block.x < cell.x + cell.width &&
          block.y >= cell.y &&
          block.y < cell.y + cell.height,
      );
      expect(cell, block.lines.join(' ')).toBeDefined();
      expect(block.right).toBeLessThanOrEqual(cell!.x + cell!.width - 1);
      expect(block.bottom).toBeLessThanOrEqual(cell!.y + cell!.height - 1);
    }

    const utLabels = capture.text.filter((block) => block.lines.join(' ') === 'ƯT:');
    const pkLabels = capture.text.filter((block) => block.lines.join(' ') === 'PK:');
    const dvLabels = capture.text.filter((block) => block.lines.join(' ') === 'DV:');
    const onCallLabels = capture.text.filter((block) => block.lines.join(' ') === 'Trực:');
    const utNames = capture.text.filter(
      (block) => block.x < weekendStartX && block.lines.join(' ') === 'Bs. Tân, Bs. Minh (CTCH)',
    );
    const pkNames = capture.text.filter(
      (block) => block.x < weekendStartX && block.lines.join(' ') === 'Bs. Đức',
    );
    const dvNames = capture.text.filter(
      (block) => block.x < weekendStartX && block.lines.join(' ') === 'Bs. Tôn',
    );

    expect(utLabels).toHaveLength(21);
    expect(pkLabels).toHaveLength(21);
    expect(dvLabels).toHaveLength(21);
    expect(onCallLabels).toHaveLength(21);
    expect(utNames).toHaveLength(21);
    expect(pkNames).toHaveLength(21);
    expect(dvNames).toHaveLength(21);

    // Role labels and doctor names do not overlap horizontally and stay ordered above Trực:
    utNames.forEach((ut, idx) => {
      const pk = pkNames[idx];
      const dv = dvNames[idx];
      const refLabel = onCallLabels[idx];
      expect(ut.lines).toHaveLength(1);
      expect(pk.lines).toHaveLength(1);
      expect(dv.lines).toHaveLength(1);
      expect(ut.x).toBeGreaterThan(utLabels[idx].right);
      expect(pk.x).toBeGreaterThan(pkLabels[idx].right);
      expect(dv.x).toBeGreaterThan(dvLabels[idx].right);
      expect(ut.y).toBeLessThan(pk.y);
      expect(pk.y).toBeLessThan(dv.y);
      expect(dv.y).toBeLessThan(refLabel.y);
    });

    // All weekdays in week 2 align horizontally across every label and doctor row
    const week2MinY = rowYValues[1];
    const week2MaxY = rowYValues[2];
    for (const blocks of [utLabels, pkLabels, dvLabels, utNames, pkNames, dvNames]) {
      const ys = blocks
        .filter((b) => b.y > week2MinY && b.y < week2MaxY)
        .map((b) => Number(b.y.toFixed(2)));
      expect(new Set(ys).size).toBe(1);
    }

    // Weekend cells place 1 doctor per line including Bs. Minh (CTCH) inside 68pt column
    const weekendDoctorBlocks = capture.text.filter(
      (block) => block.y >= 60 && block.x >= weekendStartX && block.lines[0]?.startsWith('Bs. '),
    );
    expect(weekendDoctorBlocks.length).toBeGreaterThan(0);
    for (const block of weekendDoctorBlocks) {
      expect(block.lines).toHaveLength(1);
    }
    const weekendMinhBlocks = weekendDoctorBlocks.filter(
      (block) => block.lines[0] === 'Bs. Minh (CTCH)',
    );
    expect(weekendMinhBlocks.length).toBeGreaterThan(0);

    // Approval section is embedded in the trailing empty space of row 6
    const approvalBlock = capture.text.find(
      (block) => block.lines.join(' ') === 'DUYỆT LÃNH ĐẠO KHOA',
    );
    expect(approvalBlock).toBeDefined();
    expect(approvalBlock!.y).toBeGreaterThan(rowYValues[5]);
    expect(approvalBlock!.bottom).toBeLessThan(595);
  });

  it('keeps Khối Ngoại PDF export unchanged in landscape 7-column calendar format', async () => {
    const days: ScheduleCalendarDay[] = Array.from({ length: 35 }, (_, index) => {
      const date = new Date(2026, 10, 2 + index);
      return {
        date,
        isCurrentMonth: date.getMonth() === 10,
        isToday: false,
        isWeekend: [0, 6].includes(date.getDay()),
        doctors: ['Bs. Thuận', 'Bs. Luận'],
        tourName: 'Tua 1',
        isModified: false,
        postDutyWarningDoctors: [],
        fatigueWarningDoctors: [],
      };
    });

    await exportScheduleToPDF(days, new Date(2026, 10, 1));
    expect(capture.orientations).toEqual(['landscape']);
    expect(capture.pages).toBe(1);
  });
});
