/**
 * Generates a downloadable .ics calendar invite file, entirely client-side.
 * Works with Google Calendar, Apple Calendar, Outlook, etc. — the customer
 * just opens the downloaded file and their calendar app adds the event.
 */
function generateICS({ title, description, location, startDateTime, durationMinutes }) {
  const dtStart = new Date(startDateTime);
  const dtEnd = new Date(dtStart.getTime() + durationMinutes * 60000);

  const formatDate = (d) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escapeText = (str) => (str || '').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');

  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@newmanexclusive.com`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Newman Exclusive//Trunk Show Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(dtStart)}`,
    `DTEND:${formatDate(dtEnd)}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(location)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}

/**
 * Triggers a browser download of the generated .ics file.
 */
function downloadICS(icsContent, filename) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'appointment.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
