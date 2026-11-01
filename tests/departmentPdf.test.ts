import { readFileSync } from 'node:fs';
import type { jsPDF } from 'jspdf';
import { describe, expect, it, vi } from 'vitest';
import { exportDepartmentToPDF } from '../utils/export/pdf';
import type { CalendarDay, DepartmentAssignments } from '../types';

const capture = vi.hoisted(() => ({
  pages: 1,
  cells: [] as Array<{ x: number; y: number; width: number; height: number; page: number }>,
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
      const pdf = new actual.jsPDF(options);
      const rect = pdf.rect.bind(pdf),
        text = pdf.text.bind(pdf),
        addPage = pdf.addPage.bind(pdf);
      pdf.rect = ((x, y, width, height, style) => {
        capture.cells.push({ x, y, width, height, page: capture.pages });
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

describe('department PDF layout', () => {
  it('keeps a six-week November with wrapped names and all roles inside the printed cells', async () => {
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
    expect(capture.pages).toBe(1);
    for (const block of capture.text.filter((block) => block.y >= 74 && block.y < 530)) {
      const cell = capture.cells.find(
        (cell) =>
          cell.page === block.page &&
          cell.y >= 74 &&
          block.x >= cell.x - 0.1 &&
          block.x < cell.x + cell.width &&
          block.y >= cell.y &&
          block.y < cell.y + cell.height,
      );
      expect(cell, block.lines.join(' ')).toBeDefined();
      expect(block.right).toBeLessThanOrEqual(cell!.x + cell!.width - 1);
      expect(block.bottom).toBeLessThanOrEqual(cell!.y + cell!.height - 1);
    }
    const roleLines = capture.text.map((block) => block.lines.join(' '));
    expect(roleLines.filter((line) => line === 'ƯT: Bs. Tân, Bs. Minh (CTCH)')).toHaveLength(21);
    expect(roleLines.filter((line) => line === 'DV: Bs. Tôn')).toHaveLength(21);
    expect(roleLines).toContain('30');
    expect(roleLines).toContain('Bs. Minh (CTCH)');
  });
});
