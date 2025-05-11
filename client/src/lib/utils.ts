import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, addDays } from "date-fns";
import { it } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date to display in Italian format (day/month/year)
export function formatDate(date: Date | string): string {
  if (typeof date === "string") {
    date = new Date(date);
  }
  return format(date, "dd/MM/yyyy", { locale: it });
}

// Format time to display in 24h format (hour:minute)
export function formatTime(time: string): string {
  return time;
}

// Format shift duration in hours
export function calculateHours(startTime: string, endTime: string): number {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  
  let hours = end.getHours() - start.getHours();
  let minutes = end.getMinutes() - start.getMinutes();
  
  if (minutes < 0) {
    hours -= 1;
    minutes += 60;
  }
  
  return hours + (minutes / 60);
}

// Parse time string (HH:MM) to Date
export function parseTime(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// Generate an array of days for a week starting from a given date
export function getWeekDays(startDate: Date): Date[] {
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(startDate, i));
  }
  return days;
}

// Get Italian day name for a given date
export function getDayName(date: Date): string {
  return format(date, "EEEE", { locale: it });
}

// Get short Italian day name for a given date
export function getShortDayName(date: Date): string {
  return format(date, "EEE", { locale: it });
}

// Format period (month/year) for documents
export function formatPeriod(period: string): string {
  return period;
}

// Generate time slots for schedule in 30-minute increments
export function generateTimeSlots(startHour = 4, endHour = 24): string[] {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  return slots;
}

// Calculate total hours for a day
export function calculateTotalHours(shifts: any[]): number {
  return shifts.reduce((total, shift) => {
    if (shift.type === "work") {
      return total + calculateHours(shift.startTime, shift.endTime);
    }
    return total;
  }, 0);
}

// Format a number of hours to a string (e.g. 6.5 -> "6h 30m")
export function formatHours(hours: number): string {
  const fullHours = Math.floor(hours);
  const minutes = Math.round((hours - fullHours) * 60);
  
  if (minutes === 0) {
    return `${fullHours}h`;
  }
  
  return `${fullHours}h ${minutes}m`;
}

// Download data as a PDF file
export function downloadPDF(filename: string, data: string): void {
  const a = document.createElement("a");
  a.href = `data:application/pdf;base64,${data}`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
