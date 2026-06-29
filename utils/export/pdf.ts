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

const drawWrappedText = (
  pdf: JsPDFDocument,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2,
): void => {
  const lines = pdf.splitTextToSize(text, maxWidth).slice(0, maxLines);
  pdf.text(lines, x, y, { lineHeightFactor: lineHeight / 10 });
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

const drawDepartmentCellContent = (
  pdf: JsPDFDocument,
  cell: TableCell,
  x: number,
  y: number,
  colWidth: number,
): void => {
  setPDFFont(pdf, 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(0, 0, 0);
  pdf.text(String(cell.date), x + colWidth - 5, y + 15, { align: 'right' });

  if (cell.doctors?.length) {
    setPDFFont(pdf, 'bold');
    pdf.setFontSize(7.8);
    drawDoctorGrid(pdf, cell.doctors, x + 4, y + 28, colWidth - 8, 10.4);
  }

  if (!cell.roles?.length) {
    return;
  }

  setPDFFont(pdf, 'normal');
  pdf.setFontSize(7);
  let roleY = y + (cell.doctors && cell.doctors.length > 4 ? 60 : 56);

  cell.roles.forEach((role) => {
    pdf.setTextColor(85, 85, 85);
    pdf.text(`${role.label}:`, x + 4, roleY);
    pdf.setTextColor(0, 0, 0);
    drawWrappedText(pdf, role.doctors.join(', '), x + 19, roleY, colWidth - 23, 9, 1);
    roleY += 9.2;
  });
};

const drawCalendarTable = (
  pdf: JsPDFDocument,
  rows: TableCell[][],
  layout: CalendarTableLayout,
  variant: 'schedule' | 'department' = 'schedule',
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

      if (variant === 'department') {
        drawDepartmentCellContent(pdf, cell, x, y, colWidth);
        return;
      }

      setPDFFont(pdf, 'bold');
      pdf.setFontSize(15);
      pdf.setTextColor(0, 0, 0);
      pdf.text(String(cell.date), x + colWidth - 6, y + 18, { align: 'right' });

      setPDFFont(pdf, 'normal');
      pdf.setFontSize(8.5);

      if (cell.doctors?.length) {
        drawDoctorGrid(pdf, cell.doctors, x + 4, y + 37, colWidth - 8, 12.5);
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
  const availableTableHeight = variant === 'department' ? 405 : 330;
  const rowHeight = availableTableHeight / rows.length;
  const layout: CalendarTableLayout = {
    x: variant === 'department' ? 45 : TABLE_X,
    y: variant === 'department' ? 100 : TABLE_Y,
    width: variant === 'department' ? 752 : TABLE_WIDTH,
    headerHeight: HEADER_HEIGHT,
    rowHeight,
  };

  drawTitle(pdf, title, variant === 'department' ? 82 : 102);
  const tableBottom = drawCalendarTable(pdf, rows, layout, variant);
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
