import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, addMinutes } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Genera gli slot di tempo con intervalli di 30 minuti
 * @param startHour Ora di inizio (es. 4 per le 4:00)
 * @param endHour Ora di fine (es. 24 per le 24:00)
 * @returns Array di stringhe con formato HH:MM
 */
export function generateTimeSlots(startHour: number, endHour: number): string[] {
  const slots: string[] = [];
  const baseDate = new Date();
  baseDate.setHours(startHour, 0, 0, 0);
  
  const endDate = new Date(baseDate);
  endDate.setHours(endHour, 0, 0, 0);
  
  let currentDate = new Date(baseDate);
  
  while (currentDate < endDate) {
    slots.push(format(currentDate, "HH:mm"));
    currentDate = addMinutes(currentDate, 30);
  }
  
  return slots;
}

/**
 * Formatta le ore in formato leggibile (es. 7.5 -> 7h 30m)
 * @param hours Numero di ore (può avere decimali)
 * @returns Stringa formattata
 */
export function formatHours(hours: number): string {
  if (isNaN(hours) || hours === 0) return "0h";
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours}h`;
  } else {
    return `${wholeHours}h ${minutes}m`;
  }
}

/**
 * Controlla se una data è compresa in un intervallo
 * @param date Data da verificare
 * @param startDate Data di inizio intervallo
 * @param endDate Data di fine intervallo
 * @returns true se la data è compresa nell'intervallo
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Converte un'ora in formato HH:MM in minuti
 * @param timeString Stringa in formato HH:MM
 * @returns Numero di minuti dall'inizio della giornata
 */
export function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Calcola la differenza in ore tra due orari
 * @param startTime Orario iniziale (HH:MM)
 * @param endTime Orario finale (HH:MM)
 * @returns Differenza in ore (con decimali per i minuti)
 */
export function calculateHoursDifference(startTime: string, endTime: string): number {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  if (endMinutes < startMinutes) {
    // Se l'orario finale è prima di quello iniziale, si assume un giorno di differenza
    return (24 * 60 - startMinutes + endMinutes) / 60;
  }
  
  return (endMinutes - startMinutes) / 60;
}