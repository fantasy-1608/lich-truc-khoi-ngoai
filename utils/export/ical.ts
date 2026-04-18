import { ScheduleCalendarDay, DepartmentAssignments, CalendarDay } from '../../types';

// =============================================================================
// ICAL EXPORT FUNCTIONS
// =============================================================================

export const exportScheduleToICal = (calendarGrid: ScheduleCalendarDay[], currentDate: Date) => {
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const calName = `Lịch trực Khối Ngoại - T${month + 1}/${year}`;
  const events: string[] = [];

  calendarGrid.forEach((day) => {
    if (day.isCurrentMonth && day.doctors && day.doctors.length > 0) {
      const startDate = day.date;
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);

      const dtstart = `${startDate.getFullYear()}${String(startDate.getMonth() + 1).padStart(2, '0')}${String(startDate.getDate()).padStart(2, '0')}`;
      const dtend = `${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2, '0')}${String(endDate.getDate()).padStart(2, '0')}`;
      const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
      const uid = `${dtstart}-${day.tourName}@lich-truc-khoi-ngoai`;
      const description = `Kíp trực: ${day.doctors.join(', ')}`;

      const event = [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${dtstart}`,
        `DTEND;VALUE=DATE:${dtend}`,
        `SUMMARY:Trực Khối Ngoại (Tua ${day.tourName})`,
        `DESCRIPTION:${description}`,
        'END:VEVENT',
      ].join('\r\n');
      events.push(event);
    }
  });

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//lich-truc-khoi-ngoai//EN',
    `X-WR-CALNAME:${calName}`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `LichTruc_KhoiNgoai_T${month + 1}_${year}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

export const exportDepartmentToICal = (
  calendarGrid: CalendarDay[],
  currentDate: Date,
  departmentAssignments: Record<string, Partial<DepartmentAssignments>>,
  getDoctorsForDate: (date: Date) => string[] | undefined,
  showPkdv: boolean,
) => {
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const calName = `Lịch Hoạt động Khoa - T${month + 1}/${year}`;
  const events: string[] = [];

  const createVEvent = (date: Date, summary: string, doctor: string) => {
    const startDate = date;
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);

    const dtstart = `${startDate.getFullYear()}${String(startDate.getMonth() + 1).padStart(2, '0')}${String(startDate.getDate()).padStart(2, '0')}`;
    const dtend = `${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2, '0')}${String(endDate.getDate()).padStart(2, '0')}`;
    const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
    const uid = `${dtstart}-${summary.replace(' ', '')}-${doctor.replace(' ', '')}@lich-truc-khoa`;

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `DTEND;VALUE=DATE:${dtend}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:Bác sĩ: ${doctor}`,
      'END:VEVENT',
    ].join('\r\n');
  };

  calendarGrid.forEach((day) => {
    if (day.isCurrentMonth) {
      const onCallDoctors = getDoctorsForDate(day.date) || [];
      onCallDoctors.forEach((doc) => events.push(createVEvent(day.date, 'Trực chính', doc)));

      if (!day.isWeekend) {
        const year = day.date.getFullYear();
        const monthStr = String(day.date.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day.date.getDate()).padStart(2, '0');
        const dateString = `${year}-${monthStr}-${dayStr}`;
        const assignments = departmentAssignments[dateString];
        if (assignments) {
          (assignments.ungTruc || []).forEach((doc) =>
            events.push(createVEvent(day.date, 'Ứng trực', doc)),
          );
          (assignments.pkdk || []).forEach((doc) =>
            events.push(createVEvent(day.date, 'PKĐK', doc)),
          );
          if (showPkdv) {
            (assignments.pkdv || []).forEach((doc) =>
              events.push(createVEvent(day.date, 'PKDV', doc)),
            );
          }
        }
      }
    }
  });

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//lich-truc-khoa//EN',
    `X-WR-CALNAME:${calName}`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `LichTruc_HoatDongKhoa_T${month + 1}_${year}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
