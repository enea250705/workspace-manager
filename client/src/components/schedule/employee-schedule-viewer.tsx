import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { formatHours } from "@/lib/utils";

type EmployeeScheduleViewerProps = {
  schedule: any;
  shifts: any[];
  userShifts: any[];
};

/**
 * Visualizzatore dei turni per i dipendenti
 * Mostra i propri turni pubblicati in formato tabella o lista
 * Con supporto per ferie e permessi
 */
export function EmployeeScheduleViewer({ schedule, shifts, userShifts }: EmployeeScheduleViewerProps) {
  const [view, setView] = useState<"week" | "list">("week");
  
  // Messaggio quando non ci sono turni
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
  
  // Organizza i turni per giorno
  const shiftsByDay: Record<string, any[]> = {};
  
  userShifts.forEach(shift => {
    if (!shiftsByDay[shift.day]) {
      shiftsByDay[shift.day] = [];
    }
    shiftsByDay[shift.day].push(shift);
  });
  
  // Calcola ore totali per la settimana
  const calculateTotalHours = () => {
    return userShifts
      .filter(shift => shift.type === "work")
      .reduce((total, shift) => {
        const startHour = parseInt(shift.startTime.split(':')[0]);
        const startMin = parseInt(shift.startTime.split(':')[1]);
        const endHour = parseInt(shift.endTime.split(':')[0]);
        const endMin = parseInt(shift.endTime.split(':')[1]);
        
        let hours = endHour - startHour;
        let minutes = endMin - startMin;
        
        if (minutes < 0) {
          hours -= 1;
          minutes += 60;
        }
        
        return total + hours + (minutes / 60);
      }, 0);
  };
  
  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
        <CardTitle className="text-lg font-medium">I Miei Turni</CardTitle>
        <div className="flex bg-gray-100 rounded-md p-0.5">
          <Button
            variant={view === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("week")}
            className="text-xs px-3"
          >
            <span className="material-icons text-sm mr-1">view_week</span>
            Settimana
          </Button>
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("list")}
            className="text-xs px-3"
          >
            <span className="material-icons text-sm mr-1">list</span>
            Lista
          </Button>
        </div>
      </CardHeader>
      
      {/* Dettagli pianificazione */}
      <div className="px-6 pb-2 pt-0">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">
            <span className="material-icons text-xs align-middle mr-1">calendar_today</span>
            {format(startDate, "d MMMM", { locale: it })} - {format(endDate, "d MMMM yyyy", { locale: it })}
          </p>
          <p className="text-sm text-primary font-medium">
            Totale ore: {formatHours(calculateTotalHours())}
          </p>
        </div>
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
                      <div className="whitespace-nowrap capitalize">{day.name}</div>
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
                      <td key={day.formattedDate} className="border p-3 align-top h-32">
                        {dayShifts.length === 0 ? (
                          <div className="text-center py-4 text-gray-400 text-sm flex flex-col items-center justify-center h-full">
                            <span className="material-icons mb-1">event_busy</span>
                            Non in servizio
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {dayShifts.map((shift, idx) => {
                              // Determina il tipo di turno
                              let bgColor = "bg-blue-100 border-blue-200";
                              let textColor = "text-blue-800";
                              let icon = "schedule";
                              let label = "In servizio";
                              
                              if (shift.type === "vacation") {
                                bgColor = "bg-red-100 border-red-200";
                                textColor = "text-red-800";
                                icon = "beach_access";
                                label = "Ferie";
                              } else if (shift.type === "leave") {
                                bgColor = "bg-yellow-100 border-yellow-200";
                                textColor = "text-yellow-800";
                                icon = "event_busy";
                                label = "Permesso";
                              }
                              
                              return (
                                <div 
                                  key={idx} 
                                  className={`${bgColor} rounded-md p-2 text-sm border ${textColor}`}
                                >
                                  <div className="font-medium flex items-center">
                                    <span className="material-icons text-sm mr-1">{icon}</span>
                                    {label}
                                  </div>
                                  
                                  {shift.type === "work" && (
                                    <div className="mt-1">
                                      <div className="font-medium">{shift.startTime} - {shift.endTime}</div>
                                      {shift.notes && (
                                        <div className="text-xs mt-1 text-gray-600">{shift.notes}</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
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
              
              // Calcola ore totali per il giorno
              const dayTotalHours = dayShifts
                .filter(shift => shift.type === "work")
                .reduce((total, shift) => {
                  const startHour = parseInt(shift.startTime.split(':')[0]);
                  const startMin = parseInt(shift.startTime.split(':')[1]);
                  const endHour = parseInt(shift.endTime.split(':')[0]);
                  const endMin = parseInt(shift.endTime.split(':')[1]);
                  
                  let hours = endHour - startHour;
                  let minutes = endMin - startMin;
                  
                  if (minutes < 0) {
                    hours -= 1;
                    minutes += 60;
                  }
                  
                  return total + hours + (minutes / 60);
                }, 0);
              
              return (
                <div key={day.formattedDate} className="border rounded-md overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-4 py-2 flex justify-between items-center">
                    <div className="font-medium capitalize">{day.name} {day.formattedDate}</div>
                    {dayTotalHours > 0 && (
                      <div className="text-sm text-primary font-medium">
                        {formatHours(dayTotalHours)}
                      </div>
                    )}
                  </div>
                  
                  {dayShifts.length === 0 ? (
                    <div className="p-4 text-gray-500 text-sm flex items-center">
                      <span className="material-icons text-sm mr-2">event_busy</span>
                      Non in servizio
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
                        
                        // Calcola durata in ore per questo turno
                        let duration = "";
                        if (shift.type === "work") {
                          const startHour = parseInt(shift.startTime.split(':')[0]);
                          const startMin = parseInt(shift.startTime.split(':')[1]);
                          const endHour = parseInt(shift.endTime.split(':')[0]);
                          const endMin = parseInt(shift.endTime.split(':')[1]);
                          
                          let hours = endHour - startHour;
                          let minutes = endMin - startMin;
                          
                          if (minutes < 0) {
                            hours -= 1;
                            minutes += 60;
                          }
                          
                          duration = formatHours(hours + (minutes / 60));
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
                                    <div className="text-sm font-medium">{shift.startTime} - {shift.endTime}</div>
                                    {shift.notes && (
                                      <div className="text-xs mt-1 text-gray-600">{shift.notes}</div>
                                    )}
                                  </>
                                )}
                              </div>
                              
                              {shift.type === "work" && (
                                <div className="text-sm font-medium">
                                  {duration}
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