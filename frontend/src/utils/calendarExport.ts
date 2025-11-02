import { CalendarEvent } from '../types';
import { format } from 'date-fns';

/**
 * Generate VTIMEZONE component for RFC 5545 compliance
 * This ensures proper timezone handling across calendar applications
 */
function generateVTimezone(timezoneId: string = 'America/New_York'): string {
  // Generate VTIMEZONE block with standard and daylight time rules
  // Using America/New_York as default (EST/EDT)
  return [
    'BEGIN:VTIMEZONE',
    `TZID:${timezoneId}`,
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0400',
    'TZNAME:EDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500',
    'TZNAME:EST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n');
}

/**
 * Generate ICS (iCalendar) file content from calendar events
 * Compatible with Google Calendar, Apple Calendar, Outlook, etc.
 * RFC 5545 compliant with VTIMEZONE blocks and TZID parameters
 */
export function generateICSFile(events: CalendarEvent[], calendarName: string = 'Heart Recovery Calendar'): string {
  const now = new Date();
  const timestamp = format(now, "yyyyMMdd'T'HHmmss'Z'");

  // Detect user's timezone (could be made configurable)
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';

  // ICS file header
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Heartbeat Health Technologies//Cardiac Recovery Pro//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    `X-WR-TIMEZONE:${userTimezone}`,
    'X-WR-CALDESC:Exported from Cardiac Recovery Pro',
  ].join('\r\n');

  // Add VTIMEZONE component for RFC 5545 compliance (EXP-002)
  icsContent += '\r\n' + generateVTimezone(userTimezone);

  // Add each event
  events.forEach(event => {
    const startDate = new Date(event.startTime);
    const endDate = new Date(event.endTime);

    // Format dates for ICS with proper timezone support (EXP-001)
    const formatICSDate = (date: Date, isAllDay: boolean) => {
      if (isAllDay) {
        return format(date, 'yyyyMMdd');
      }
      // Format as local time without 'Z' suffix for use with TZID
      return format(date, "yyyyMMdd'T'HHmmss");
    };

    const dtStart = formatICSDate(startDate, event.isAllDay || false);
    const dtEnd = formatICSDate(endDate, event.isAllDay || false);
    const uid = `event-${event.id}@cardiac-recovery-pro.com`;

    // Build DTSTART and DTEND with TZID parameter (RFC 5545 compliant)
    const dtStartFormatted = event.isAllDay
      ? `DTSTART;VALUE=DATE:${dtStart}`
      : `DTSTART;TZID=${userTimezone}:${dtStart}`;
    const dtEndFormatted = event.isAllDay
      ? `DTEND;VALUE=DATE:${dtEnd}`
      : `DTEND;TZID=${userTimezone}:${dtEnd}`;

    icsContent += '\r\n' + [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${timestamp}`,
      dtStartFormatted,
      dtEndFormatted,
      `SUMMARY:${escapeICSText(event.title)}`,
      event.description ? `DESCRIPTION:${escapeICSText(event.description)}` : '',
      event.location ? `LOCATION:${escapeICSText(event.location)}` : '',
      `STATUS:${event.status?.toUpperCase() || 'CONFIRMED'}`,
      event.reminderMinutes ? `BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:${escapeICSText(event.title)}\r\nTRIGGER:-PT${event.reminderMinutes}M\r\nEND:VALARM` : '',
      'END:VEVENT',
    ].filter(line => line).join('\r\n');
  });

  icsContent += '\r\nEND:VCALENDAR';

  return icsContent;
}

/**
 * Escape special characters in ICS text fields
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Download ICS file to user's device
 */
export function downloadICSFile(icsContent: string, filename: string = 'calendar.ics'): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Generate and download ICS file for Google Calendar import
 */
export function exportToGoogleCalendar(events: CalendarEvent[]): void {
  const icsContent = generateICSFile(events, 'Cardiac Recovery Pro - Export');
  downloadICSFile(icsContent, 'cardiac-recovery-google-calendar.ics');
}

/**
 * Generate and download ICS file for Apple Calendar import
 */
export function exportToAppleCalendar(events: CalendarEvent[]): void {
  const icsContent = generateICSFile(events, 'Cardiac Recovery Pro - Export');
  downloadICSFile(icsContent, 'cardiac-recovery-apple-calendar.ics');
}

/**
 * Generate and download ICS file for Calendly or other calendar apps
 */
export function exportToCalendly(events: CalendarEvent[]): void {
  const icsContent = generateICSFile(events, 'Cardiac Recovery Pro - Export');
  downloadICSFile(icsContent, 'cardiac-recovery-calendly.ics');
}

/**
 * Export calendar as JSON for backup/transfer
 */
export function exportAsJSON(events: CalendarEvent[], calendars: any[]): void {
  const exportData = {
    exportDate: new Date().toISOString(),
    source: 'Cardiac Recovery Pro™',
    version: '1.0',
    calendars,
    events,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `cardiac-recovery-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Calendly Webhook Configuration Helper
 * Returns the webhook URL format for Calendly integration
 */
export function getCalendlyWebhookConfig(): {
  webhookUrl: string;
  events: string[];
  instructions: string;
} {
  // This would be your actual backend webhook endpoint
  const baseUrl = window.location.origin;

  return {
    webhookUrl: `${baseUrl}/api/webhooks/calendly`,
    events: [
      'invitee.created',
      'invitee.canceled',
    ],
    instructions: `
To integrate with Calendly:
1. Go to Calendly > Account > Integrations > Webhooks
2. Create a new webhook with URL: ${baseUrl}/api/webhooks/calendly
3. Subscribe to events: invitee.created, invitee.canceled
4. Copy the signing key to your backend environment variables
5. Backend will automatically create calendar events from Calendly bookings
    `.trim(),
  };
}

/**
 * Google Calendar OAuth Integration Helper
 * Returns configuration for Google Calendar API OAuth
 */
export function getGoogleCalendarOAuthConfig(): {
  clientId: string;
  scopes: string[];
  discoveryDocs: string[];
  instructions: string;
} {
  return {
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    scopes: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
    discoveryDocs: [
      'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    ],
    instructions: `
To enable Google Calendar sync:
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID for Web application
3. Add authorized JavaScript origins: ${window.location.origin}
4. Add authorized redirect URIs: ${window.location.origin}/oauth/callback
5. Copy Client ID to frontend environment variables
6. Enable Google Calendar API in the Google Cloud Console
7. Implement OAuth flow in frontend to get access tokens
8. Store tokens securely and use for bidirectional sync
    `.trim(),
  };
}

/**
 * Print calendar view
 * Opens browser print dialog with calendar-optimized styling
 */
export function printCalendar(): void {
  // Add print-specific styles
  const printStyles = document.createElement('style');
  printStyles.id = 'calendar-print-styles';
  printStyles.textContent = `
    @media print {
      @page {
        size: landscape;
        margin: 0.5in;
      }

      body * {
        visibility: hidden;
      }

      .fc, .fc * {
        visibility: visible !important;
      }

      .fc {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }

      .fc-toolbar-chunk button,
      .fc-header-toolbar button {
        display: none !important;
      }

      .fc-event {
        page-break-inside: avoid;
        border: 1px solid #000 !important;
        padding: 2px 4px !important;
        font-size: 10pt !important;
      }

      .fc-daygrid-day-number {
        font-size: 12pt !important;
        font-weight: bold !important;
      }

      /* Hide unnecessary UI elements */
      header, footer, nav, .no-print {
        display: none !important;
      }
    }
  `;

  document.head.appendChild(printStyles);

  // Trigger print
  window.print();

  // Clean up print styles after print dialog closes
  setTimeout(() => {
    const styles = document.getElementById('calendar-print-styles');
    if (styles) {
      styles.remove();
    }
  }, 1000);
}
