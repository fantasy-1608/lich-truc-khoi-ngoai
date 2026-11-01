import { ScheduleCalendarDay, DepartmentAssignments, CalendarDay } from '../../types';
import { START_DATE } from '../../constants';
import { registerPDFFonts, savePDFBlob, setPDFFont, WEEK_DAYS } from './common';

type JsPDFDocument = {
  internal: {
    pageSize: {
      getWidth: () => number;
      getHeight: () => number;
    };
  };
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  setDrawColor: (r: number, g?: number, b?: number) => void;
  setFillColor: (r: number, g?: number, b?: number) => void;
  setFont: (fontName: string, fontStyle?: string) => void;
  setLineWidth: (width: number) => void;
  addFileToVFS: (filename: string, filecontent: string) => void;
  addFont: (postScriptName: string, id: string, fontStyle: string) => void;
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  text: (
    text: string | string[],
    x: number,
    y: number,
    options?: {
      align?: 'left' | 'center' | 'right';
      baseline?: 'top' | 'middle' | 'bottom' | 'alphabetic';
      maxWidth?: number;
      lineHeightFactor?: number;
    },
  ) => void;
  splitTextToSize: (text: string, maxlen: number) => string[];
  output: (type: 'blob') => Blob;
  addPage: () => void;
};

interface CalendarTableLayout {
  x: number;
  y: number;
  width: number;
  headerHeight: number;
  rowHeight: number;
}

interface TableCell {
  date?: number;
  isCurrentMonth?: boolean;
  isWeekend?: boolean;
  doctors?: string[];
  roles?: Array<{ label: string; doctors: string[] }>;
}

export interface HolidayDay {
  date: Date;
  doctors: string[];
  isWeekend: boolean;
  isModified: boolean;
}

const TABLE_X = 70;
const TABLE_Y = 122;
const TABLE_WIDTH = 702;
const HEADER_HEIGHT = 18;
const APPROVAL_TOP_GAP = 34;

const createPDF = async (): Promise<JsPDFDocument> => {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true,
  }) as JsPDFDocument;

  await registerPDFFonts(pdf);
  return pdf;
};

const drawTitle = (pdf: JsPDFDocument, title: string, y = 102): void => {
  setPDFFont(pdf, 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(0, 0, 0);
  pdf.text(title, pdf.internal.pageSize.getWidth() / 2, y, { align: 'center' });
};

const drawApprovalSection = (pdf: JsPDFDocument, y: number): void => {
  const now = new Date();
  const right = pdf.internal.pageSize.getWidth() - 98;

  setPDFFont(pdf, 'normal');
  pdf.setFontSize(12);
  pdf.text(
    `Ngày ${now.getDate()}, tháng ${now.getMonth() + 1}, năm ${now.getFullYear()}`,
    right,
    y,
    {
      align: 'right',
    },
  );

  setPDFFont(pdf, 'bold');
  pdf.setFontSize(14);
  pdf.text('DUYỆT LÃNH ĐẠO KHOA', right, y + 26, { align: 'right' });
};

const doctorRows = (doctors: string[]): Array<[string, string]> => {
  const rows: Array<[string, string]> = [];
  for (let i = 0; i < doctors.length; i += 2) {
    rows.push([doctors[i] || '', doctors[i + 1] || '']);
  }
  return rows;
};

const drawDoctorGrid = (
  pdf: JsPDFDocument,
  doctors: string[],
  x: number,
  y: number,
  width: number,
  lineHeight: number,
): void => {
  const colWidth = (width - 8) / 2;
  doctorRows(doctors).forEach(([left, right], index) => {
    const rowY = y + index * lineHeight;
    if (left) {
      pdf.text(left, x, rowY, { maxWidth: colWidth });
    }
    if (right) {
      pdf.text(right, x + colWidth + 8, rowY, { maxWidth: colWidth });
    }
  });
};

interface DepartmentCellLayout {
  height: number;
  blocks: Array<{
    lines: string[];
    x: number;
    y: number;
    fontSize: number;
    lineHeight: number;
    style: 'normal' | 'bold';
  }>;
}

const measureDepartmentCell = (
  pdf: JsPDFDocument,
  cell: TableCell,
  colWidth: number,
  doctorFontSize: number,
): DepartmentCellLayout => {
  const blocks: DepartmentCellLayout['blocks'] = [];
  if (!cell.isCurrentMonth) return { height: 24, blocks };
  const columnGap = 6;
  const doctorColumnWidth = (colWidth - 8 - columnGap) / 2;
  const doctorLineHeight = doctorFontSize * 1.18;
  let cursor = 18;

  setPDFFont(pdf, 'bold');
  pdf.setFontSize(doctorFontSize);
  for (const pair of doctorRows(cell.doctors ?? [])) {
    const columns = pair.map((name) => (name ? pdf.splitTextToSize(name, doctorColumnWidth) : []));
    columns.forEach((lines, index) => {
      if (lines.length)
        blocks.push({
          lines,
          x: 4 + index * (doctorColumnWidth + columnGap),
          y: cursor + doctorFontSize,
          fontSize: doctorFontSize,
          lineHeight: doctorLineHeight,
          style: 'bold',
        });
    });
    cursor += Math.max(1, ...columns.map((lines) => lines.length)) * doctorLineHeight;
  }

  if (cell.roles?.length) cursor += 3;
  const roleFontSize = doctorFontSize - 0.6;
  const roleLineHeight = roleFontSize * 1.18;
  setPDFFont(pdf, 'normal');
  pdf.setFontSize(roleFontSize);
  for (const role of cell.roles ?? []) {
    const lines = pdf.splitTextToSize(`${role.label}: ${role.doctors.join(', ')}`, colWidth - 8);
    blocks.push({
      lines,
      x: 4,
      y: cursor + roleFontSize,
      fontSize: roleFontSize,
      lineHeight: roleLineHeight,
      style: 'normal',
    });
    cursor += lines.length * roleLineHeight;
  }
  return { height: cursor + 5, blocks };
};

const drawDepartmentTable = (pdf: JsPDFDocument, title: string, rows: TableCell[][]): void => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const x = 28;
  const top = 56;
  const colWidth = (pageWidth - x * 2) / 7;
  // Reserve the date, approval heading, and bottom margin on every page.
  const bodyHeight = pageHeight - top - HEADER_HEIGHT - 64;
  let measured: DepartmentCellLayout[][] = [];
  let rowHeights: number[] = [];
  for (let step = 0; step <= 4; step++) {
    const fontSize = 7.8 - step * 0.2;
    measured = rows.map((row) =>
      row.map((cell) => measureDepartmentCell(pdf, cell, colWidth, fontSize)),
    );
    rowHeights = measured.map((row) => Math.max(...row.map((cell) => cell.height)));
    if (rowHeights.reduce((sum, height) => sum + height, 0) <= bodyHeight) break;
  }

  let rowIndex = 0;
  while (rowIndex < rows.length) {
    if (rowIndex > 0) pdf.addPage();
    drawTitle(pdf, title, 38);
    pdf.setLineWidth(0.75);
    pdf.setDrawColor(110, 110, 110);
    pdf.setFillColor(232, 232, 232);
    setPDFFont(pdf, 'bold');
    pdf.setFontSize(9);
    WEEK_DAYS.forEach((day, index) => {
      pdf.setFillColor(232, 232, 232);
      pdf.rect(x + index * colWidth, top, colWidth, HEADER_HEIGHT, 'FD');
      pdf.text(day, x + (index + 0.5) * colWidth, top + 12, { align: 'center' });
    });
    let y = top + HEADER_HEIGHT;
    const pageStart = rowIndex;
    while (rowIndex < rows.length && y + rowHeights[rowIndex] <= top + HEADER_HEIGHT + bodyHeight) {
      const height = rowHeights[rowIndex];
      rows[rowIndex].forEach((cell, colIndex) => {
        const cellX = x + colIndex * colWidth;
        if (cell.isWeekend) pdf.setFillColor(240, 240, 240);
        pdf.rect(cellX, y, colWidth, height, cell.isWeekend ? 'FD' : 'S');
        if (!cell.isCurrentMonth || !cell.date) return;
        setPDFFont(pdf, 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text(String(cell.date), cellX + colWidth - 4, y + 14, { align: 'right' });
        for (const block of measured[rowIndex][colIndex].blocks) {
          setPDFFont(pdf, block.style);
          pdf.setFontSize(block.fontSize);
          pdf.text(block.lines, cellX + block.x, y + block.y, {
            lineHeightFactor: block.lineHeight / block.fontSize,
          });
        }
      });
      y += height;
      rowIndex++;
    }
    // Do not clip or drop assignments even if an exceptional week cannot fit on A4.
    if (rowIndex === pageStart) throw new Error('Phân công một tuần vượt khổ giấy A4.');
    drawApprovalSection(pdf, y + 24);
  }
};

const drawCalendarTable = (
  pdf: JsPDFDocument,
  rows: TableCell[][],
  layout: CalendarTableLayout,
): number => {
  const colWidth = layout.width / 7;
  const tableHeight = layout.headerHeight + rows.length * layout.rowHeight;

  pdf.setLineWidth(0.75);
  pdf.setDrawColor(110, 110, 110);
  pdf.setFillColor(232, 232, 232);
  pdf.rect(layout.x, layout.y, layout.width, layout.headerHeight, 'FD');

  setPDFFont(pdf, 'bold');
  pdf.setFontSize(10);
  WEEK_DAYS.forEach((day, colIndex) => {
    const cellX = layout.x + colIndex * colWidth;
    if (colIndex > 0) {
      pdf.rect(cellX, layout.y, 0, tableHeight);
    }
    pdf.text(day, cellX + colWidth / 2, layout.y + layout.headerHeight / 2 + 3, {
      align: 'center',
    });
  });

  rows.forEach((row, rowIndex) => {
    const y = layout.y + layout.headerHeight + rowIndex * layout.rowHeight;
    row.forEach((cell, colIndex) => {
      const x = layout.x + colIndex * colWidth;
      const fillStyle = cell.isWeekend ? 'FD' : 'S';

      if (cell.isWeekend) {
        pdf.setFillColor(240, 240, 240);
      }
      pdf.rect(x, y, colWidth, layout.rowHeight, fillStyle);

      if (!cell.isCurrentMonth || !cell.date) {
        return;
      }

      setPDFFont(pdf, 'bold');
      pdf.setFontSize(15);
      pdf.setTextColor(0, 0, 0);
      pdf.text(String(cell.date), x + colWidth - 6, y + 18, { align: 'right' });

      if (cell.doctors?.length) {
        const doctorRowCount = Math.ceil(cell.doctors.length / 2);
        const compactDoctorGrid = doctorRowCount >= 3;
        setPDFFont(pdf, 'normal');
        pdf.setFontSize(compactDoctorGrid ? 7.8 : 8.5);
        drawDoctorGrid(
          pdf,
          cell.doctors,
          x + 4,
          compactDoctorGrid ? y + 31 : y + 37,
          colWidth - 8,
          compactDoctorGrid ? 10 : 12.5,
        );
      }
    });
  });

  pdf.setTextColor(0, 0, 0);
  return layout.y + tableHeight;
};

const chunkRows = <T>(items: T[]): T[][] => {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 7) {
    rows.push(items.slice(i, i + 7));
  }
  return rows;
};

const getDateKey = (date: Date): string => date.toLocaleDateString('en-CA');

const exportPDF = async (
  title: string,
  filename: string,
  rows: TableCell[][],
  variant: 'schedule' | 'department',
): Promise<void> => {
  const pdf = await createPDF();
  if (variant === 'department') {
    drawDepartmentTable(pdf, title, rows);
    await savePDFBlob(pdf.output('blob'), filename);
    return;
  }
  const availableTableHeight = 330;
  const rowHeight = availableTableHeight / rows.length;
  const layout: CalendarTableLayout = {
    x: TABLE_X,
    y: TABLE_Y,
    width: TABLE_WIDTH,
    headerHeight: HEADER_HEIGHT,
    rowHeight,
  };

  drawTitle(pdf, title);
  const tableBottom = drawCalendarTable(pdf, rows, layout);
  drawApprovalSection(pdf, tableBottom + APPROVAL_TOP_GAP);
  await savePDFBlob(pdf.output('blob'), filename);
};

export const exportScheduleToPDF = async (
  calendarGrid: ScheduleCalendarDay[],
  currentDate: Date,
) => {
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const title = `LỊCH TRỰC KHỐI NGOẠI - THÁNG ${month}/${year}`;

  const cells: TableCell[] = calendarGrid.map((day) => {
    const isBeforeStartDate = day.date.getTime() < START_DATE.getTime();
    return {
      date: day.date.getDate(),
      isCurrentMonth: day.isCurrentMonth,
      isWeekend: day.isWeekend,
      doctors: day.isCurrentMonth && !isBeforeStartDate ? day.doctors : [],
    };
  });

  try {
    await exportPDF(
      title,
      `LichTruc_KhoiNgoai_T${month}_${year}.pdf`,
      chunkRows(cells),
      'schedule',
    );
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Không thể xuất PDF. Vui lòng thử lại.');
  }
};

export const exportDepartmentToPDF = async (
  calendarGrid: CalendarDay[],
  currentDate: Date,
  departmentAssignments: Record<string, Partial<DepartmentAssignments>>,
  getDoctorsForDate: (date: Date) => string[] | undefined,
  showPkdv: boolean,
) => {
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const title = `LỊCH HOẠT ĐỘNG KHOA - THÁNG ${month}/${year}`;

  const cells: TableCell[] = calendarGrid.map((day) => {
    const isBeforeStartDate = day.date.getTime() < START_DATE.getTime();
    const assignments = departmentAssignments[getDateKey(day.date)];
    const roles: TableCell['roles'] = [];

    if (!day.isWeekend) {
      if (assignments?.ungTruc?.length) {
        roles.push({ label: 'ƯT', doctors: assignments.ungTruc });
      }
      if (assignments?.pkdk?.length) {
        roles.push({ label: 'PK', doctors: assignments.pkdk });
      }
      if (showPkdv && assignments?.pkdv?.length) {
        roles.push({ label: 'DV', doctors: assignments.pkdv });
      }
    }

    return {
      date: day.date.getDate(),
      isCurrentMonth: day.isCurrentMonth,
      isWeekend: day.isWeekend,
      doctors: day.isCurrentMonth && !isBeforeStartDate ? getDoctorsForDate(day.date) : [],
      roles,
    };
  });

  try {
    await exportPDF(
      title,
      `LichTruc_HoatDongKhoa_T${month}_${year}.pdf`,
      chunkRows(cells),
      'department',
    );
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Không thể xuất PDF. Vui lòng thử lại.');
  }
};

export const exportHolidayToPDF = async (
  calendarGrid: HolidayDay[],
  startDate: string,
  endDate: string,
) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const formatDate = (date: Date) =>
    `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  const title = `LỊCH TRỰC LỄ TẾT (${formatDate(start)} - ${formatDate(end)})`;

  const firstDay = calendarGrid[0]?.date;
  const firstDayOfWeek = firstDay ? firstDay.getDay() : 1;
  const daysBeforeMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const paddedGrid: (HolidayDay | null)[] = [];

  for (let i = 0; i < daysBeforeMonday; i += 1) {
    paddedGrid.push(null);
  }
  paddedGrid.push(...calendarGrid);
  while (paddedGrid.length % 7 !== 0) {
    paddedGrid.push(null);
  }

  const cells: TableCell[] = paddedGrid.map((day) => ({
    date: day?.date.getDate(),
    isCurrentMonth: Boolean(day),
    isWeekend: Boolean(day?.isWeekend),
    doctors: day?.doctors ?? [],
  }));

  try {
    const filename = `LichTruc_LeTet_${start.getDate()}-${start.getMonth() + 1}_${end.getDate()}-${end.getMonth() + 1}_${end.getFullYear()}.pdf`;
    await exportPDF(title, filename, chunkRows(cells), 'schedule');
  } catch (error) {
    console.error('Error exporting holiday schedule to PDF:', error);
    throw new Error('Không thể xuất PDF. Vui lòng thử lại.');
  }
};
