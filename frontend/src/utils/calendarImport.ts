import { CalendarEvent } from '../types';
import { parseISO } from 'date-fns';

/**
 * Parse ICS (iCalendar) file and extract events
 * Supports RFC 5545 format
 */
export function parseICS(icsContent: string): Partial<CalendarEvent>[] {
  const events: Partial<CalendarEvent>[] = [];
  const lines = icsContent.split(/\r?\n/);

  let currentEvent: Partial<CalendarEvent> | null = null;
  let inEvent = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
      continue;
    }

    if (line === 'END:VEVENT') {
      if (currentEvent && currentEvent.title && currentEvent.startTime && currentEvent.endTime) {
        events.push(currentEvent);
      }
      inEvent = false;
      currentEvent = null;
      continue;
    }

    if (!inEvent || !currentEvent) continue;

    // Parse event properties
    if (line.startsWith('SUMMARY:')) {
      currentEvent.title = unescapeICSText(line.substring(8));
    } else if (line.startsWith('DESCRIPTION:')) {
      currentEvent.description = unescapeICSText(line.substring(12));
    } else if (line.startsWith('LOCATION:')) {
      currentEvent.location = unescapeICSText(line.substring(9));
    } else if (line.startsWith('DTSTART')) {
      const dateStr = line.split(':')[1];
      currentEvent.startTime = parseICSDate(dateStr);
    } else if (line.startsWith('DTEND')) {
      const dateStr = line.split(':')[1];
      currentEvent.endTime = parseICSDate(dateStr);
    } else if (line.startsWith('STATUS:')) {
      const status = line.substring(7).toLowerCase();
      if (['scheduled', 'completed', 'cancelled', 'missed'].includes(status)) {
        currentEvent.status = status as any;
      }
    }
  }

  return events;
}

/**
 * Parse JSON calendar export and extract events
 */
export function parseJSON(jsonContent: string): Partial<CalendarEvent>[] {
  try {
    const data = JSON.parse(jsonContent);

    // Handle different JSON export formats
    if (data.events && Array.isArray(data.events)) {
      return data.events.map((event: any) => ({
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        isAllDay: event.isAllDay,
        location: event.location,
        status: event.status,
        reminderMinutes: event.reminderMinutes,
        notes: event.notes,
      }));
    }

    // If it's just an array of events
    if (Array.isArray(data)) {
      return data.map((event: any) => ({
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        isAllDay: event.isAllDay,
        location: event.location,
        status: event.status,
        reminderMinutes: event.reminderMinutes,
        notes: event.notes,
      }));
    }

    throw new Error('Invalid JSON format');
  } catch (error) {
    console.error('JSON parse error:', error);
    throw new Error('Failed to parse JSON file');
  }
}

/**
 * Parse CSV calendar export and extract events
 */
export function parseCSV(csvContent: string): Partial<CalendarEvent>[] {
  const lines = csvContent.split(/\r?\n/);

  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const events: Partial<CalendarEvent>[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const event: Partial<CalendarEvent> = {};

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j].toLowerCase();
      const value = values[j] || '';

      if (header === 'title') {
        event.title = value;
      } else if (header === 'description') {
        event.description = value;
      } else if (header.includes('start')) {
        event.startTime = value;
      } else if (header.includes('end')) {
        event.endTime = value;
      } else if (header.includes('all day')) {
        event.isAllDay = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
      } else if (header === 'location') {
        event.location = value;
      } else if (header === 'status') {
        if (['scheduled', 'completed', 'cancelled', 'missed'].includes(value.toLowerCase())) {
          event.status = value.toLowerCase() as any;
        }
      } else if (header.includes('reminder')) {
        event.reminderMinutes = parseInt(value) || 0;
      } else if (header === 'notes') {
        event.notes = value;
      }
    }

    if (event.title && event.startTime && event.endTime) {
      events.push(event);
    }
  }

  return events;
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      // Escaped quote
      currentField += '"';
      i++; // Skip next quote
    } else if (char === '"') {
      // Toggle quote mode
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // Field separator
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Add last field
  fields.push(currentField);

  return fields;
}

/**
 * Parse ICS date format to ISO string
 */
function parseICSDate(dateStr: string): string {
  // Remove timezone suffix if present
  dateStr = dateStr.replace(/Z$/, '');

  // Format: YYYYMMDDTHHMMSS or YYYYMMDD
  if (dateStr.length === 8) {
    // All-day event: YYYYMMDD
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}T00:00:00`;
  } else if (dateStr.length >= 15) {
    // Date with time: YYYYMMDDTHHMMSS
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(9, 11);
    const minute = dateStr.substring(11, 13);
    const second = dateStr.substring(13, 15);
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }

  // Fallback
  return new Date().toISOString();
}

/**
 * Unescape ICS text fields
 */
function unescapeICSText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Unified import function that handles all formats
 */
export function importCalendar(fileContent: string, format: 'ics' | 'json' | 'csv'): Partial<CalendarEvent>[] {
  if (format === 'ics') {
    return parseICS(fileContent);
  } else if (format === 'json') {
    return parseJSON(fileContent);
  } else if (format === 'csv') {
    return parseCSV(fileContent);
  } else {
    throw new Error(`Unsupported import format: ${format}`);
  }
}
