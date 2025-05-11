import { format } from "date-fns";
import { it } from "date-fns/locale";

/**
 * Formatta una data nel formato richiesto in italiano
 * @param date La data da formattare
 * @param formatStr Il formato da utilizzare
 * @returns La data formattata
 */
export function formatDate(date: Date | string, formatStr: string = "d MMMM yyyy"): string {
  if (!date) return "";
  
  // Se la data è una stringa, convertila in un oggetto Date
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  // Formatta la data utilizzando la libreria date-fns con locale italiano
  return format(dateObj, formatStr, { locale: it });
}

/**
 * Formatta una data e ora nel formato richiesto in italiano
 * @param date La data da formattare
 * @returns La data e ora formattata (es. "12 maggio 2023, 14:30")
 */
export function formatDateTime(date: Date | string): string {
  if (!date) return "";
  
  // Se la data è una stringa, convertila in un oggetto Date
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  // Formatta la data utilizzando la libreria date-fns con locale italiano
  return format(dateObj, "d MMMM yyyy, HH:mm", { locale: it });
}

/**
 * Formatta un intervallo di date
 * @param startDate Data di inizio
 * @param endDate Data di fine
 * @returns Intervallo formattato (es. "12 - 18 maggio 2023")
 */
export function formatDateRange(startDate: Date | string, endDate: Date | string): string {
  if (!startDate || !endDate) return "";
  
  // Converti le date in oggetti Date se sono stringhe
  const startDateObj = typeof startDate === "string" ? new Date(startDate) : startDate;
  const endDateObj = typeof endDate === "string" ? new Date(endDate) : endDate;
  
  // Se gli anni sono diversi, mostra entrambi
  if (startDateObj.getFullYear() !== endDateObj.getFullYear()) {
    return `${format(startDateObj, "d MMMM yyyy", { locale: it })} - ${format(endDateObj, "d MMMM yyyy", { locale: it })}`;
  }
  
  // Se i mesi sono diversi ma l'anno è lo stesso
  if (startDateObj.getMonth() !== endDateObj.getMonth()) {
    return `${format(startDateObj, "d MMMM", { locale: it })} - ${format(endDateObj, "d MMMM yyyy", { locale: it })}`;
  }
  
  // Se solo i giorni sono diversi
  return `${format(startDateObj, "d", { locale: it })} - ${format(endDateObj, "d MMMM yyyy", { locale: it })}`;
}

/**
 * Controlla se una data è nel passato
 * @param date La data da controllare
 * @returns true se la data è nel passato
 */
export function isPastDate(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dateObj < today;
}

/**
 * Controlla se una data è nel futuro
 * @param date La data da controllare
 * @returns true se la data è nel futuro
 */
export function isFutureDate(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dateObj > today;
}

/**
 * Controlla se una data è oggi
 * @param date La data da controllare
 * @returns true se la data è oggi
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}