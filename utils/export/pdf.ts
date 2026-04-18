import { ScheduleCalendarDay, DepartmentAssignments, CalendarDay } from '../../types';
import { START_DATE } from '../../constants';
import {
  getCommonPDFStyles,
  getTableHeader,
  getApprovalSection,
  generatePDFFromHTML,
} from './common';

// =============================================================================
// SCHEDULE PDF EXPORT
// =============================================================================

export const exportScheduleToPDF = async (
  calendarGrid: ScheduleCalendarDay[],
  currentDate: Date,
) => {
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const title = `LỊCH TRỰC KHỐI NGOẠI - THÁNG ${month}/${year}`;

  // Generate doctor grid: 2 rows, 2 doctors per row, no text wrap
  const generateDoctorGrid = (doctors: string[]) => {
    let html = '';
    for (let i = 0; i < doctors.length; i += 2) {
      const doc1 = doctors[i] || '';
      const doc2 = doctors[i + 1] || '';
      html += `<div class="doctor-row"><span class="doc">${doc1}</span><span class="doc">${doc2}</span></div>`;
    }
    return html;
  };

  const scheduleStyles = `
    ${getCommonPDFStyles('85px')}
    .print-table { table-layout: fixed; }
    .print-table th, .print-table td { padding: 5px 3px; }
    .date-number { font-size: 17px; margin-bottom: 2px; font-weight: bold; }
    .doctor-grid { font-size: 14px; line-height: 1.3; }
    .doctor-row { display: flex; gap: 4px; }
    .doc { flex: 1; }
  `;

  const tableBody = Array.from({ length: Math.ceil(calendarGrid.length / 7) })
    .map((_, rowIndex) => {
      const rowDays = calendarGrid.slice(rowIndex * 7, rowIndex * 7 + 7);
      return `
      <tr>
        ${rowDays
          .map((day) => {
            const isBeforeStartDate = day.date.getTime() < START_DATE.getTime();
            const doctorsContent =
              day.isCurrentMonth && !isBeforeStartDate && day.doctors && day.doctors.length > 0
                ? `<div class="doctor-grid">${generateDoctorGrid(day.doctors)}</div>`
                : '';

            return `
            <td class="${day.isWeekend ? 'weekend' : ''}">
              ${day.isCurrentMonth
                ? `
                <div class="date-number">${day.date.getDate()}</div>
                ${doctorsContent}
              `
                : ''
              }
            </td>
          `;
          })
          .join('')}
      </tr>
    `;
    })
    .join('');

  const calendarHTML = `
    <style>${scheduleStyles}</style>
    <h2 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px; color: black;">${title}</h2>
    <table class="print-table">
      ${getTableHeader()}
      <tbody>${tableBody}</tbody>
    </table>
    ${getApprovalSection()}
  `;

  try {
    await generatePDFFromHTML(
      calendarHTML,
      `LichTruc_KhoiNgoai_T${month}_${year}.pdf`,
    );
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Không thể xuất PDF. Vui lòng thử lại.');
  }
};

// =============================================================================
// DEPARTMENT PDF EXPORT
// =============================================================================

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

  const departmentStyles = `
    ${getCommonPDFStyles('160px')}
    .print-table { table-layout: fixed; }
    .print-table th, .print-table td { padding: 5px 3px; }
    .date-number { font-size: 17px; margin-bottom: 4px; font-weight: bold; }
    .main-duty { font-weight: bold; font-size: 13px; margin-bottom: 4px; color: #000; line-height: 1.4; }
    .main-duty-row { display: flex; gap: 4px; margin-bottom: 2px; }
    .doc-item { flex: 1; white-space: nowrap; overflow: visible; }
    .role-row { font-size: 12px; line-height: 1.3; margin-top: 2px; display: flex; }
    .role-label { font-weight: normal; color: #555; margin-right: 4px; white-space: nowrap; min-width: 25px; }
    .role-doctors { font-weight: 500; color: #000; }
  `;

  const tableBody = Array.from({ length: Math.ceil(calendarGrid.length / 7) })
    .map((_, rowIndex) => {
      const rowDays = calendarGrid.slice(rowIndex * 7, rowIndex * 7 + 7);
      return `
      <tr>
        ${rowDays
          .map((day) => {
            const isBeforeStartDate = day.date.getTime() < START_DATE.getTime();
            const dateString = day.date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
            const assignments = departmentAssignments[dateString];
            const onCallDoctors = getDoctorsForDate(day.date);

            const dayContent =
              day.isCurrentMonth && !isBeforeStartDate
                ? `
            <div class="date-number">${day.date.getDate()}</div>
            ${onCallDoctors && onCallDoctors.length > 0
                  ? `
              <div class="main-duty">
                ${Array.from({ length: Math.ceil(onCallDoctors.length / 2) })
                    .map(
                      (_, i) => `
                  <div class="main-duty-row">
                    <div class="doc-item">${onCallDoctors[i * 2] || ''}</div>
                    <div class="doc-item">${onCallDoctors[i * 2 + 1] ? `${onCallDoctors[i * 2 + 1]}` : ''}</div>
                  </div>
                `,
                    )
                    .join('')}
              </div>
            `
                  : ''
                }
            ${!day.isWeekend
                  ? `
              ${assignments?.ungTruc && assignments.ungTruc.length > 0
                    ? `
                <div class="role-row">
                  <span class="role-label">ƯT:</span>
                  <span class="role-doctors">${assignments.ungTruc.join(', ')}</span>
                </div>`
                    : ''
                  }
              ${assignments?.pkdk && assignments.pkdk.length > 0
                    ? `
                <div class="role-row">
                  <span class="role-label">PK:</span>
                  <span class="role-doctors">${assignments.pkdk.join(', ')}</span>
                </div>`
                    : ''
                  }
              ${showPkdv && assignments?.pkdv && assignments.pkdv.length > 0
                    ? `
                <div class="role-row">
                  <span class="role-label">DV:</span>
                  <span class="role-doctors">${assignments.pkdv.join(', ')}</span>
                </div>`
                    : ''
                  }
            `
                  : ''
                }
          `
                : '';

            return `
            <td class="${day.isWeekend ? 'weekend' : ''}">
              ${day.isCurrentMonth ? dayContent : ''}
            </td>
          `;
          })
          .join('')}
      </tr>
    `;
    })
    .join('');

  const calendarHTML = `
    <style>${departmentStyles}</style>
    <h2 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px; color: black;">${title}</h2>
    <table class="print-table">
      ${getTableHeader()}
      <tbody>${tableBody}</tbody>
    </table>
    ${getApprovalSection()}
  `;

  try {
    await generatePDFFromHTML(
      calendarHTML,
      `LichTruc_HoatDongKhoa_T${month}_${year}.pdf`,
    );
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Không thể xuất PDF. Vui lòng thử lại.');
  }
};

// =============================================================================
// HOLIDAY SCHEDULE PDF EXPORT
// =============================================================================

export interface HolidayDay {
  date: Date;
  doctors: string[];
  isWeekend: boolean;
  isModified: boolean;
}

export const exportHolidayToPDF = async (
  calendarGrid: HolidayDay[],
  startDate: string,
  endDate: string,
) => {
  // Format dates for title
  const start = new Date(startDate);
  const end = new Date(endDate);
  const formatDate = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  const title = `LỊCH TRỰC LỄ TẾT (${formatDate(start)} - ${formatDate(end)})`;

  // Generate doctor grid: 2 rows, 2 doctors per row, no text wrap
  const generateDoctorGrid = (doctors: string[]) => {
    let html = '';
    for (let i = 0; i < doctors.length; i += 2) {
      const doc1 = doctors[i] || '';
      const doc2 = doctors[i + 1] || '';
      html += `<div class="doctor-row"><span class="doc">${doc1}</span><span class="doc">${doc2}</span></div>`;
    }
    return html;
  };

  // Styles matching the main schedule PDF - optimized for A4 landscape
  const holidayStyles = `
    ${getCommonPDFStyles('85px')}
    .print-table { table-layout: fixed; }
    .print-table th, .print-table td { padding: 5px 3px; }
    .date-number { font-size: 17px; margin-bottom: 2px; font-weight: bold; }
    .doctor-grid { font-size: 14px; line-height: 1.3; }
    .doctor-row { display: flex; gap: 4px; }
    .doc { flex: 1; }
  `;

  // Pad the calendar grid to align with weekdays
  // Find what day of week the first day is (0=Sun, 1=Mon, ..., 6=Sat)
  const firstDay = calendarGrid[0]?.date;
  const firstDayOfWeek = firstDay ? firstDay.getDay() : 1;
  // Convert to Monday-based (Mon=0, Tue=1, ..., Sun=6)
  const daysBeforeMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Create padded grid with null slots before first day
  const paddedGrid: (HolidayDay | null)[] = [];
  for (let i = 0; i < daysBeforeMonday; i++) {
    paddedGrid.push(null);
  }
  paddedGrid.push(...calendarGrid);

  // Fill remaining slots to complete the last week
  while (paddedGrid.length % 7 !== 0) {
    paddedGrid.push(null);
  }

  // Generate table rows
  const tableBody = Array.from({ length: Math.ceil(paddedGrid.length / 7) })
    .map((_, rowIndex) => {
      const rowDays = paddedGrid.slice(rowIndex * 7, rowIndex * 7 + 7);
      return `
      <tr>
        ${rowDays
          .map((day) => {
            if (!day) {
              return '<td></td>';
            }

            const doctorsContent =
              day.doctors && day.doctors.length > 0
                ? `<div class="doctor-grid">${generateDoctorGrid(day.doctors)}</div>`
                : '';

            return `
            <td class="${day.isWeekend ? 'weekend' : ''}">
              <div class="date-number">${day.date.getDate()}</div>
              ${doctorsContent}
            </td>
          `;
          })
          .join('')}
      </tr>
    `;
    })
    .join('');

  const calendarHTML = `
    <style>${holidayStyles}</style>
    <h2 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px; color: black;">${title}</h2>
    <table class="print-table">
      ${getTableHeader()}
      <tbody>${tableBody}</tbody>
    </table>
    ${getApprovalSection()}
  `;

  try {
    const filename = `LichTruc_LeTet_${start.getDate()}-${start.getMonth() + 1}_${end.getDate()}-${end.getMonth() + 1}_${end.getFullYear()}.pdf`;
    await generatePDFFromHTML(calendarHTML, filename);
  } catch (error) {
    console.error('Error exporting holiday schedule to PDF:', error);
    throw new Error('Không thể xuất PDF. Vui lòng thử lại.');
  }
};
