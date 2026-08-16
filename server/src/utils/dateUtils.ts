import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Returns UTC boundaries for a given start/end date string, assuming the 
 * input strings represent dates in the target timezone (e.g., Asia/Kolkata).
 * 
 * If no dates are provided, defaults to the current day in that timezone.
 */
export function getLocalBounds(
  startDateStr?: string,
  endDateStr?: string,
  timeZone: string = "Asia/Kolkata"
): { start: Date; end: Date } {
  const now = new Date();
  
  // Use explicit dates or current date
  const startObj = startDateStr ? new Date(startDateStr) : now;
  const endObj = endDateStr ? new Date(endDateStr) : now;
  
  const start = isNaN(startObj.getTime()) ? now : startObj;
  const end = isNaN(endObj.getTime()) ? now : endObj;

  // Format exactly to start and end of day strings in the target timezone
  const startStr = formatInTimeZone(start, timeZone, "yyyy-MM-dd'T'00:00:00");
  const endStr = formatInTimeZone(end, timeZone, "yyyy-MM-dd'T'23:59:59.999");

  // Convert those exact localized strings back to UTC Date objects
  return {
    start: fromZonedTime(startStr, timeZone),
    end: fromZonedTime(endStr, timeZone),
  };
}
