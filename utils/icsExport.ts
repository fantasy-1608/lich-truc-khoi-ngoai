import { CalendarDay, DepartmentAssignments, DepartmentRole } from '../types';

export const generateDoctorICS = (
  doctorName: string,
  calendarDays: CalendarDay[],
  getDoctorsForDate: (date: Date) => string[] | undefined,
  departmentAssignments: Record<string, Partial<DepartmentAssignments>>
): string => {
  const getDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatICSDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  let icsContent = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Lich Truc Khoi Ngoai//VI\r\nCALSCALE:GREGORIAN\r\n`;

  calendarDays.forEach((day) => {
    // Only export for the current viewed month (ignore padding days from prev/next months)
    if (!day.isCurrentMonth) return;

    const dateStr = getDateString(day.date);
    const nextDay = new Date(day.date);
    nextDay.setDate(nextDay.getDate() + 1);

    const dtStart = formatICSDate(day.date);
    const dtEnd = formatICSDate(nextDay);

    const addEvent = (summary: string) => {
      // Create a unique UID for the event
      const uid = `${dateStr}-${summary.replace(/\s+/g, '')}-${doctorName.replace(/\s+/g, '')}@lichtruc`;
      icsContent += `BEGIN:VEVENT\r\n`;
      icsContent += `UID:${uid}\r\n`;
      icsContent += `DTSTAMP:${formatICSDate(new Date())}T000000Z\r\n`;
      icsContent += `DTSTART;VALUE=DATE:${dtStart}\r\n`;
      icsContent += `DTEND;VALUE=DATE:${dtEnd}\r\n`;
      icsContent += `SUMMARY:${summary}\r\n`;
      icsContent += `DESCRIPTION:Lịch trực ${summary} - Bác sĩ ${doctorName}\r\n`;
      icsContent += `END:VEVENT\r\n`;
    };

    // Check Trực chính
    const mainDoctors = getDoctorsForDate(day.date) || [];
    if (mainDoctors.includes(doctorName)) {
      addEvent('Trực chính (Khối Ngoại)');
    }

    // Check Ứng trực, PKĐK, PKDV
    const dayAssignments = departmentAssignments[dateStr];
    if (dayAssignments) {
      if (dayAssignments.ungTruc?.includes(doctorName)) {
        addEvent('Ứng trực (Khối Ngoại)');
      }
      if (dayAssignments.pkdk?.includes(doctorName)) {
        addEvent('PKĐK (Khối Ngoại)');
      }
      if (dayAssignments.pkdv?.includes(doctorName)) {
        addEvent('PKDV (Khối Ngoại)');
      }
    }
  });

  icsContent += `END:VCALENDAR\r\n`;
  return icsContent;
};

export const downloadICSFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
