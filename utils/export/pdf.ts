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
  line: (x1: number, y1: number, x2: number, y2: number) => void;
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
  getTextWidth: (text: string) => number;
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

const createPDF = async (
  orientation: 'landscape' | 'portrait' = 'landscape',
): Promise<JsPDFDocument> => {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation,
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

interface DepartmentTextBlock {
  lines: string[];
  x: number;
  y: number;
  fontSize: number;
  lineHeight: number;
  style: 'normal' | 'bold';
  color?: [number, number, number];
}

interface DepartmentRoleRow {
  label: string;
  doctorsLines: string[];
  y: number;
  height: number;
  labelFontSize: number;
  fontSize: number;
  lineHeight: number;
}

interface DepartmentCellLayout {
  isRolePrimary: boolean;
  topHeight: number;
  bottomHeight: number;
  height: number;
  topBlocks: DepartmentTextBlock[];
  roleRows: DepartmentRoleRow[];
  bottomBlocks: DepartmentTextBlock[];
}

const getDepartmentColumnWidths = (tableWidth: number): number[] => {
  const weekendWidth = 68;
  const weekdayWidth = (tableWidth - weekendWidth * 2) / 5;
  return [
    weekdayWidth,
    weekdayWidth,
    weekdayWidth,
    weekdayWidth,
    weekdayWidth,
    weekendWidth,
    weekendWidth,
  ];
};

const fitRoleFontSize = (
  pdf: JsPDFDocument,
  text: string,
  maxFontSize: number,
  minFontSize: number,
  maxWidth: number,
): number | null => {
  for (let size = maxFontSize; size >= minFontSize - 0.01; size -= 0.2) {
    const rounded = Number(size.toFixed(1));
    pdf.setFontSize(rounded);
    if (pdf.getTextWidth(text) <= maxWidth) {
      return rounded;
    }
  }
  return null;
};

const splitOnCallReference = (
  pdf: JsPDFDocument,
  doctors: string[],
  maxFontSize: number,
  minFontSize: number,
  maxWidth: number,
): { fontSize: number; prefixWidth: number; line1: string; extraLines: string[] } => {
  const prefix = 'Trực: ';
  let chosenSize = maxFontSize;
  let prefixWidth = 0;
  let line1 = '';
  let extraLines: string[] = [];

  for (let size = maxFontSize; size >= minFontSize - 0.01; size -= 0.2) {
    const rounded = Number(size.toFixed(1));
    setPDFFont(pdf, 'bold');
    pdf.setFontSize(rounded);
    prefixWidth = pdf.getTextWidth(prefix);

    setPDFFont(pdf, 'normal');
    pdf.setFontSize(rounded);
    const firstMax = Math.max(20, maxWidth - prefixWidth);
    const line1Items: string[] = [];
    let splitIdx = doctors.length;

    for (let i = 0; i < doctors.length; i++) {
      const candidate = [...line1Items, doctors[i]].join(', ');
      const suffix = i < doctors.length - 1 ? ',' : '';
      if (pdf.getTextWidth(candidate + suffix) <= firstMax || line1Items.length === 0) {
        line1Items.push(doctors[i]);
      } else {
        splitIdx = i;
        break;
      }
    }

    const first = line1Items.join(', ') + (splitIdx < doctors.length ? ',' : '');
    const restText = doctors.slice(splitIdx).join(', ');
    const rest = restText ? pdf.splitTextToSize(restText, maxWidth) : [];

    chosenSize = rounded;
    line1 = first;
    extraLines = rest;
    if (1 + rest.length <= 2) break;
  }

  return { fontSize: chosenSize, prefixWidth, line1, extraLines };
};

const measureDepartmentCell = (
  pdf: JsPDFDocument,
  cell: TableCell,
  colWidth: number,
  baseFontSize: number,
): DepartmentCellLayout => {
  if (!cell.isCurrentMonth) {
    return {
      isRolePrimary: false,
      topHeight: 22,
      bottomHeight: 0,
      height: 22,
      topBlocks: [],
      roleRows: [],
      bottomBlocks: [],
    };
  }

  const roles = cell.roles ?? [];

  if (!cell.isWeekend && roles.length > 0) {
    const textPadX = 22.5;
    const rightPad = 3.5;
    const doctorMaxWidth = colWidth - textPadX - rightPad;
    const roleFontSize = baseFontSize + 0.2;
    const singleLineHeight = roleFontSize * 1.18;
    const roleRows: DepartmentRoleRow[] = [];
    let cursor = 16;

    setPDFFont(pdf, 'normal');
    for (const role of roles) {
      const doctorsText = role.doctors.join(', ');
      const fitSize = fitRoleFontSize(pdf, doctorsText, roleFontSize, 8.2, doctorMaxWidth);
      const usedFontSize = fitSize ?? roleFontSize;
      pdf.setFontSize(usedFontSize);
      const doctorsLines = fitSize
        ? [doctorsText]
        : pdf.splitTextToSize(doctorsText, doctorMaxWidth);
      const lineHeight = usedFontSize * 1.18;
      const contentHeight =
        doctorsLines.length === 1 ? singleLineHeight : doctorsLines.length * lineHeight;
      const rowHeight = Math.max(14.5, contentHeight + 3.0);

      roleRows.push({
        label: `${role.label}:`,
        doctorsLines,
        y: cursor,
        height: rowHeight,
        labelFontSize: roleFontSize,
        fontSize: usedFontSize,
        lineHeight,
      });
      cursor += rowHeight;
    }

    const topHeight = cursor + 2;
    const doctors = cell.doctors ?? [];
    if (!doctors.length) {
      return {
        isRolePrimary: true,
        topHeight,
        bottomHeight: 0,
        height: Math.max(topHeight, 22),
        topBlocks: [],
        roleRows,
        bottomBlocks: [],
      };
    }

    const onCallPadX = 4.5;
    const onCallMaxWidth = colWidth - onCallPadX * 2;
    const maxOnCallSize = Math.max(7.2, baseFontSize - 1.5);
    const {
      fontSize: onCallFontSize,
      prefixWidth,
      line1,
      extraLines,
    } = splitOnCallReference(pdf, doctors, maxOnCallSize, 6.8, onCallMaxWidth);
    const onCallLineHeight = onCallFontSize * 1.16;
    const firstLineY = 4 + onCallFontSize * 0.82;
    const bottomBlocks: DepartmentTextBlock[] = [
      {
        lines: ['Trực:'],
        x: onCallPadX,
        y: firstLineY,
        fontSize: onCallFontSize,
        lineHeight: onCallLineHeight,
        style: 'bold',
        color: [0, 0, 0],
      },
      {
        lines: [line1],
        x: onCallPadX + prefixWidth,
        y: firstLineY,
        fontSize: onCallFontSize,
        lineHeight: onCallLineHeight,
        style: 'normal',
        color: [0, 0, 0],
      },
    ];
    if (extraLines.length) {
      bottomBlocks.push({
        lines: extraLines,
        x: onCallPadX,
        y: firstLineY + onCallLineHeight,
        fontSize: onCallFontSize,
        lineHeight: onCallLineHeight,
        style: 'normal',
        color: [0, 0, 0],
      });
    }
    const bottomHeight = 4 + (1 + extraLines.length) * onCallLineHeight + 3.0;

    return {
      isRolePrimary: true,
      topHeight,
      bottomHeight,
      height: topHeight + bottomHeight,
      topBlocks: [],
      roleRows,
      bottomBlocks,
    };
  }

  // Weekend or unassigned weekday: render 1 doctor per line vertically so weekend columns stay slim
  const padX = 3.5;
  const innerWidth = colWidth - padX * 2;
  const maxDocFontSize = baseFontSize - 0.5;
  const minDocFontSize = Math.max(6.8, baseFontSize - 1.4);
  const docLineHeight = maxDocFontSize * 1.12;
  const topBlocks: DepartmentTextBlock[] = [];
  let cursor = 14.5;

  setPDFFont(pdf, 'normal');
  for (const docName of cell.doctors ?? []) {
    const fitSize = fitRoleFontSize(pdf, docName, maxDocFontSize, minDocFontSize, innerWidth);
    const docFontSize = fitSize ?? maxDocFontSize;
    pdf.setFontSize(docFontSize);
    const lines = fitSize ? [docName] : pdf.splitTextToSize(docName, innerWidth);
    topBlocks.push({
      lines,
      x: padX,
      y: cursor + docFontSize * 0.85,
      fontSize: docFontSize,
      lineHeight: docLineHeight,
      style: 'normal',
      color: [0, 0, 0],
    });
    cursor += lines.length * docLineHeight;
  }

  const topHeight = cursor + 3.5;
  return {
    isRolePrimary: false,
    topHeight,
    bottomHeight: 0,
    height: Math.max(topHeight, 22),
    topBlocks,
    roleRows: [],
    bottomBlocks: [],
  };
};

const countTrailingEmptyCells = (row: TableCell[]): number => {
  let count = 0;
  for (let i = row.length - 1; i >= 0; i--) {
    if (row[i].isCurrentMonth) break;
    count++;
  }
  return count;
};

const drawDepartmentTable = (pdf: JsPDFDocument, title: string, rows: TableCell[][]): void => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const x = 20;
  const top = 42;
  const tableWidth = pageWidth - x * 2;
  const colWidths = getDepartmentColumnWidths(tableWidth);
  const trailingEmptyCols = rows.length ? countTrailingEmptyCells(rows[rows.length - 1]) : 0;
  const embedApprovalInLastRow = rows.length >= 6 && trailingEmptyCols >= 3;
  const bodyHeight = pageHeight - top - HEADER_HEIGHT - (embedApprovalInLastRow ? 18 : 60);

  let measured: DepartmentCellLayout[][] = [];
  let rowHeights: number[] = [];
  let rowBottomHeights: number[] = [];

  for (let step = 0; step <= 8; step++) {
    const baseFontSize = 9.0 - step * 0.2;
    measured = rows.map((row) =>
      row.map((cell, colIndex) =>
        measureDepartmentCell(pdf, cell, colWidths[colIndex], baseFontSize),
      ),
    );
    rowBottomHeights = measured.map((row) => Math.max(0, ...row.map((cell) => cell.bottomHeight)));
    rowHeights = measured.map((row, rIdx) => {
      const maxTop = Math.max(22, ...row.map((cell) => cell.topHeight));
      const minCell = Math.max(22, ...row.map((cell) => cell.height));
      return Math.max(minCell, maxTop + rowBottomHeights[rIdx]);
    });
    const totalHeight = rowHeights.reduce((sum, height) => sum + height, 0);
    if (totalHeight <= bodyHeight) {
      const remaining = bodyHeight - totalHeight;
      if (remaining > 0 && rows.length > 0) {
        const weekdayRowIndices: number[] = [];
        const weekendOnlyIndices: number[] = [];
        measured.forEach((row, idx) => {
          if (row.some((cell) => cell.isRolePrimary)) weekdayRowIndices.push(idx);
          else weekendOnlyIndices.push(idx);
        });
        const weekendShare =
          weekendOnlyIndices.length > 0
            ? Math.min(remaining * 0.15, weekendOnlyIndices.length * 8)
            : 0;
        const perWeekend = weekendOnlyIndices.length ? weekendShare / weekendOnlyIndices.length : 0;
        const perWeekday = weekdayRowIndices.length
          ? (remaining - weekendShare) / weekdayRowIndices.length
          : remaining / rows.length;
        rowHeights = rowHeights.map((h, idx) => {
          const isWeekday = measured[idx].some((cell) => cell.isRolePrimary);
          return h + (isWeekday || !weekdayRowIndices.length ? perWeekday : perWeekend);
        });
      }
      break;
    }
  }

  let rowIndex = 0;
  while (rowIndex < rows.length) {
    if (rowIndex > 0) pdf.addPage();
    drawTitle(pdf, title, 28);

    pdf.setLineWidth(0.75);
    pdf.setDrawColor(110, 110, 110);
    setPDFFont(pdf, 'bold');
    pdf.setFontSize(9.5);
    let headerX = x;
    WEEK_DAYS.forEach((day, colIndex) => {
      const colWidth = colWidths[colIndex];
      pdf.setFillColor(232, 232, 232);
      pdf.rect(headerX, top, colWidth, HEADER_HEIGHT, 'FD');
      pdf.setTextColor(0, 0, 0);
      pdf.text(day, headerX + colWidth / 2, top + 12.5, { align: 'center' });
      headerX += colWidth;
    });

    let y = top + HEADER_HEIGHT;
    const pageStart = rowIndex;
    let drewEmbeddedApproval = false;

    while (
      rowIndex < rows.length &&
      y + rowHeights[rowIndex] <= top + HEADER_HEIGHT + bodyHeight + 0.5
    ) {
      const height = rowHeights[rowIndex];
      const rowBottomHeight = rowBottomHeights[rowIndex];
      const isLastRow = rowIndex === rows.length - 1;
      const visibleColLimit = isLastRow && embedApprovalInLastRow ? 7 - trailingEmptyCols : 7;

      let cellX = x;
      rows[rowIndex].forEach((cell, colIndex) => {
        const colWidth = colWidths[colIndex];
        if (colIndex >= visibleColLimit) {
          cellX += colWidth;
          return;
        }

        const cellLayout = measured[rowIndex][colIndex];
        if (cell.isWeekend) {
          pdf.setFillColor(242, 244, 247);
          pdf.rect(cellX, y, colWidth, height, 'F');
        }

        if (cell.isCurrentMonth && cell.date) {
          if (cellLayout.roleRows.length > 0) {
            const startY = y + 16;
            const availableMain = Math.max(0, height - rowBottomHeight - 16 - 2);
            const naturalHeight = Math.max(0, cellLayout.topHeight - 18);
            const extra = Math.max(0, availableMain - naturalHeight);
            const topShift = Math.min(4, extra * 0.25);
            const extraPerRow =
              cellLayout.roleRows.length > 1
                ? Math.min(6, (extra - topShift) / (cellLayout.roleRows.length - 1))
                : 0;
            let cursorY = startY + topShift;

            cellLayout.roleRows.forEach((roleRow) => {
              const capHeight = roleRow.fontSize * 0.72;
              const totalTextHeight =
                capHeight + (roleRow.doctorsLines.length - 1) * roleRow.lineHeight;
              const topPad = Math.max(2, (roleRow.height - totalTextHeight) / 2);
              const baselineY = cursorY + topPad + capHeight;
              cursorY += roleRow.height + extraPerRow;

              pdf.setTextColor(0, 0, 0);
              setPDFFont(pdf, 'bold');
              pdf.setFontSize(roleRow.labelFontSize);
              pdf.text(roleRow.label, cellX + 4.0, baselineY);

              setPDFFont(pdf, 'normal');
              pdf.setFontSize(roleRow.fontSize);
              pdf.text(roleRow.doctorsLines, cellX + 22.5, baselineY, {
                lineHeightFactor: roleRow.lineHeight / roleRow.fontSize,
              });
            });
          }

          setPDFFont(pdf, 'bold');
          pdf.setFontSize(11.5);
          pdf.setTextColor(0, 0, 0);
          pdf.text(String(cell.date), cellX + colWidth - 4, y + 13, { align: 'right' });

          for (const block of cellLayout.topBlocks) {
            pdf.setTextColor(...(block.color ?? [0, 0, 0]));
            setPDFFont(pdf, block.style);
            pdf.setFontSize(block.fontSize);
            pdf.text(block.lines, cellX + block.x, y + block.y, {
              lineHeightFactor: block.lineHeight / block.fontSize,
            });
          }

          if (cellLayout.bottomBlocks.length && rowBottomHeight > 0) {
            const bottomTop = y + height - rowBottomHeight;
            for (const block of cellLayout.bottomBlocks) {
              pdf.setTextColor(...(block.color ?? [0, 0, 0]));
              setPDFFont(pdf, block.style);
              pdf.setFontSize(block.fontSize);
              pdf.text(block.lines, cellX + block.x, bottomTop + block.y, {
                lineHeightFactor: block.lineHeight / block.fontSize,
              });
            }
          }
        }

        pdf.setDrawColor(90, 90, 90);
        pdf.setLineWidth(0.75);
        pdf.rect(cellX, y, colWidth, height, 'S');

        cellX += colWidth;
      });

      if (isLastRow && embedApprovalInLastRow) {
        drawApprovalSection(pdf, y + 20);
        drewEmbeddedApproval = true;
      }

      y += height;
      rowIndex++;
    }

    if (rowIndex === pageStart) throw new Error('Phân công một tuần vượt khổ giấy A4.');
    if (!drewEmbeddedApproval) {
      drawApprovalSection(pdf, y + 20);
    }
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

const exportPDF = async (title: string, filename: string, rows: TableCell[][]): Promise<void> => {
  const pdf = await createPDF('landscape');
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
    await exportPDF(title, `LichTruc_KhoiNgoai_T${month}_${year}.pdf`, chunkRows(cells));
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

    if (day.isCurrentMonth && !isBeforeStartDate && !day.isWeekend) {
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
    const pdf = await createPDF('landscape');
    drawDepartmentTable(pdf, title, chunkRows(cells));
    await savePDFBlob(pdf.output('blob'), `LichTruc_HoatDongKhoa_T${month}_${year}.pdf`);
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
    await exportPDF(title, filename, chunkRows(cells));
  } catch (error) {
    console.error('Error exporting holiday schedule to PDF:', error);
    throw new Error('Không thể xuất PDF. Vui lòng thử lại.');
  }
};
