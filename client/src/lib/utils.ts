import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, subDays, format, parse } from "date-fns";
import { it } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: Date | string) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(dateObj, {
    addSuffix: true,
    locale: it,
  });
}

export function relativeDateFromNow(days: number) {
  return subDays(new Date(), days);
}

export function formatDate(date: Date | string, formatStr: string = "dd/MM/yyyy") {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: it });
}

export function parseLocalDate(date: string, formatStr: string = "yyyy-MM-dd") {
  return parse(date, formatStr, new Date());
}

export function generateTimeSlots(startHour: number, endHour: number, interval: number = 30) {
  const timeSlots = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let min = 0; min < 60; min += interval) {
      const formattedHour = hour.toString().padStart(2, '0');
      const formattedMin = min.toString().padStart(2, '0');
      timeSlots.push(`${formattedHour}:${formattedMin}`);
    }
  }
  return timeSlots;
}

export function formatHours(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours}h`;
  } else {
    return `${wholeHours}h ${minutes}m`;
  }
}

export function convertToHours(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + (minutes / 60);
}

export function calculateWorkHours(startTime: string, endTime: string): number {
  const startHours = convertToHours(startTime);
  const endHours = convertToHours(endTime);
  return endHours - startHours;
}