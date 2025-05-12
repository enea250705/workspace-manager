import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, parseISO, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { formatHours } from "@/lib/utils";

type EmployeeScheduleViewerProps = {
  schedule: any;
  shifts: any[];
  userShifts: any[];
};

/**
 * Visualizzatore dei turni per i dipendenti
 * Mostra i propri turni pubblicati in formato tabella
 */
export function EmployeeScheduleViewer({ schedule, shifts, userShifts }: EmployeeScheduleViewerProps) {
  const [view, setView] = useState<"week" | "list">("week");
  
  if (!schedule) {
    return (
      <Card className="bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <span className="material-icons text-gray-400 text-5xl mb-4">event_busy</span>
            <h3 className="text-lg font-medium mb-2">Nessun turno disponibile</h3>
            <p className="text-gray-500">
              Non ci sono turni pubblicati al momento. Controlla più tardi.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Data inizio e fine settimana
  const startDate = new Date(schedule.startDate);
  const endDate = new Date(schedule.endDate);
  
  // Genera i giorni della settimana
  const weekDays = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    weekDays.push({
      date: new Date(currentDate),
      name: format(currentDate, "EEEE", { locale: it }),
      shortName: format(currentDate, "EEE", { locale: it }),
      formattedDate: format(currentDate, "d/M", { locale: it }),
    });
    currentDate = addDays(currentDate, 1);
  }
  
  // Organizza gli orari per giorno
  const shiftsByDay: Record<string, any[]> = {};
  
  userShifts.forEach(shift => {
    if (!shiftsByDay[shift.day]) {
      shiftsByDay[shift.day] = [];
    }
    shiftsByDay[shift.day].push(shift);
  });
  
  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
        <CardTitle className="text-lg font-medium">I Miei Turni</CardTitle>
        <div className="flex bg-gray-100 rounded-md p-0.5">
          <Button
            variant={view === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("week")}
            className="text-xs"
          >
            <span className="material-icons text-sm mr-1">view_week</span>
            Settimana
          </Button>
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("list")}
            className="text-xs"
          >
            <span className="material-icons text-sm mr-1">list</span>
            Lista
          </Button>
        </div>
      </CardHeader>
      
      {/* Dettagli pianificazione */}
      <div className="px-6 pb-2 pt-0">
        <p className="text-sm text-gray-500 mb-4">
          <span className="material-icons text-xs align-middle mr-1">calendar_today</span>
          {format(startDate, "d MMMM", { locale: it })} - {format(endDate, "d MMMM yyyy", { locale: it })}
        </p>
      </div>
      
      <CardContent className="pb-6 pt-0">
        {/* Visualizzazione a settimana */}
        {view === "week" && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {weekDays.map(day => (
                    <th 
                      key={day.formattedDate}
                      className="border px-3 py-2 text-center font-medium"
                    >
                      <div className="whitespace-nowrap">{day.shortName}</div>
                      <div className="text-xs font-normal text-gray-500">{day.formattedDate}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {weekDays.map(day => {
                    const dayShifts = shiftsByDay[day.name] || [];
                    
                    // Ordina i turni per orario di inizio
                    dayShifts.sort((a, b) => a.startTime.localeCompare(b.startTime));
                    
                    return (
                      <td key={day.formattedDate} className="border p-3 align-top h-28">
                        {dayShifts.length === 0 ? (
                          <div className="text-center py-2 text-gray-400 text-sm">
                            Non in servizio
                          </div>
                        ) : (
                          <div>
                            {/* Prima raggruppiamo i turni per tipo */}
                            {(() => {
                              // Dobbiamo rimuovere i duplicati e dare priorità ai tipi di assenza
                              // Prima organizziamo i turni per slot orario
                              const timeSlotMap = new Map();
                              
                              // Ordine di priorità: sick > leave > vacation > work
                              // Aggiungiamo ogni turno, rimpiazzando quelli a priorità inferiore
                              dayShifts.forEach(shift => {
                                const timeKey = `${shift.startTime}-${shift.endTime}`;
                                
                                if (!timeSlotMap.has(timeKey)) {
                                  // Se non esiste ancora questo slot, aggiungiamo
                                  timeSlotMap.set(timeKey, shift);
                                } else {
                                  // Se esiste già, controlliamo la priorità
                                  const existingShift = timeSlotMap.get(timeKey);
                                  const existingPriority = getPriorityValue(existingShift.type);
                                  const newPriority = getPriorityValue(shift.type);
                                  
                                  // Sostituisci solo se la nuova priorità è maggiore
                                  if (newPriority > existingPriority) {
                                    timeSlotMap.set(timeKey, shift);
                                  }
                                }
                              });
                              
                              // Prendi i turni senza duplicati dal Map
                              const uniqueShifts = Array.from(timeSlotMap.values());
                              
                              // Ora filtra per tipo
                              const workShifts = uniqueShifts.filter(s => s.type === "work");
                              const vacationShifts = uniqueShifts.filter(s => s.type === "vacation");
                              const leaveShifts = uniqueShifts.filter(s => s.type === "leave");
                              const sickShifts = uniqueShifts.filter(s => s.type === "sick");
                              
                              // Funzione helper per determinare la priorità del tipo di turno
                              function getPriorityValue(type: string): number {
                                switch (type) {
                                  case "sick": return 4;
                                  case "leave": return 3;
                                  case "vacation": return 2;
                                  case "work": return 1;
                                  default: return 0;
                                }
                              }
                              
                              // Calcola il totale delle ore di lavoro
                              const totalHours = workShifts.reduce((total, shift) => {
                                const startParts = shift.startTime.split(':').map(Number);
                                const endParts = shift.endTime.split(':').map(Number);
                                
                                const startMinutes = startParts[0] * 60 + startParts[1];
                                const endMinutes = endParts[0] * 60 + endParts[1];
                                
                                return total + (endMinutes - startMinutes) / 60;
                              }, 0);
                              
                              return (
                                <>
                                  {/* Mostra totale ore se ci sono turni di lavoro */}
                                  {workShifts.length > 0 && (
                                    <div className="font-medium text-sm mb-2">
                                      Ore di lavoro: {totalHours.toFixed(1)}h
                                    </div>
                                  )}
                                  
                                  {/* Mostra gli slot di lavoro in modo compatto */}
                                  {workShifts.length > 0 && (
                                    <div className="bg-blue-100 rounded-md p-3 mb-2">
                                      <div className="font-medium flex items-center mb-2">
                                        <span className="material-icons text-sm mr-1">schedule</span>
                                        In servizio
                                      </div>
                                      <div className="grid grid-cols-1 gap-1">
                                        {workShifts.map((shift, idx) => (
                                          <div key={idx} className="text-sm">
                                            <div className="flex items-center">
                                              <div className="w-24">{shift.startTime} - {shift.endTime}</div>
                                              {shift.notes && <div className="ml-2 text-xs text-gray-600">{shift.notes}</div>}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Mostra ferie */}
                                  {vacationShifts.length > 0 && (
                                    <div className="bg-red-100 rounded-md p-3 mb-2">
                                      <div className="font-medium flex items-center">
                                        <span className="material-icons text-sm mr-1">beach_access</span>
                                        Ferie (F)
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Mostra permessi */}
                                  {leaveShifts.length > 0 && (
                                    <div className="bg-yellow-100 rounded-md p-3 mb-2">
                                      <div className="font-medium flex items-center">
                                        <span className="material-icons text-sm mr-1">event_busy</span>
                                        Permesso (P)
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Mostra malattia */}
                                  {sickShifts.length > 0 && (
                                    <div className="bg-purple-100 rounded-md p-3 mb-2">
                                      <div className="font-medium flex items-center">
                                        <span className="material-icons text-sm mr-1">healing</span>
                                        Malattia (M)
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        
        {/* Visualizzazione a lista */}
        {view === "list" && (
          <div className="space-y-3">
            {weekDays.map(day => {
              const dayShifts = shiftsByDay[day.name] || [];
              
              // Ordina i turni per orario di inizio
              dayShifts.sort((a, b) => a.startTime.localeCompare(b.startTime));
              
              return (
                <div key={day.formattedDate} className="border rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 font-medium">
                    {day.name} {day.formattedDate}
                  </div>
                  
                  {dayShifts.length === 0 ? (
                    <div className="p-4 text-gray-500 text-sm">
                      Non in servizio oggi
                    </div>
                  ) : (
                    <div className="divide-y">
                      {dayShifts.map((shift, idx) => {
                        // Determina il tipo di turno
                        let bgColor = "bg-blue-50";
                        let icon = "schedule";
                        let label = "In servizio";
                        
                        if (shift.type === "vacation") {
                          bgColor = "bg-red-50";
                          icon = "beach_access";
                          label = "Ferie";
                        } else if (shift.type === "leave") {
                          bgColor = "bg-yellow-50";
                          icon = "event_busy";
                          label = "Permesso";
                        }
                        
                        return (
                          <div 
                            key={idx} 
                            className={`p-4 ${bgColor}`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium flex items-center mb-1">
                                  <span className="material-icons text-sm mr-1">{icon}</span>
                                  {label}
                                </div>
                                
                                {shift.type === "work" && (
                                  <>
                                    <div className="text-sm">{shift.startTime} - {shift.endTime}</div>
                                    {shift.notes && (
                                      <div className="text-xs mt-1 text-gray-600">{shift.notes}</div>
                                    )}
                                  </>
                                )}
                              </div>
                              
                              {shift.type === "work" && (
                                <div className="text-sm font-medium">
                                  {formatHours(Number(shift.hours))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}