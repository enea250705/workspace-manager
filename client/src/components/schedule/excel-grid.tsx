import { useState, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateTimeSlots } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * La griglia Excel-like per la gestione dei turni
 * Implementa esattamente la funzionalità richiesta con:
 * - Celle con cadenza di 30 minuti dalle 4:00 alle 24:00
 * - Visualizzazione per singolo giorno con tab per ogni giorno della settimana
 * - X per indicare presenza lavorativa
 * - F per indicare ferie
 * - P per indicare permessi
 * - Colonna NOTE per annotazioni
 * - Colonna TOTALE per calcolo automatico delle ore
 */

type ScheduleGridProps = {
  scheduleId: number | null;
  users: any[];
  startDate: Date;
  endDate: Date;
  shifts: any[];
  timeOffRequests: any[];
  isPublished: boolean;
  onPublish: () => void;
  forceResetGrid?: boolean; // Forza un reset completo della griglia
};

export function ExcelGrid({
  scheduleId,
  users,
  startDate,
  endDate,
  shifts,
  timeOffRequests,
  isPublished,
  onPublish,
  forceResetGrid = false
}: ScheduleGridProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState(0);
  
  // Generazione degli slot di tempo (30 minuti) dalle 4:00 alle 24:00
  const timeSlots = generateTimeSlots(4, 24);
  
  // Inizializza giorni della settimana
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return {
      date,
      name: format(date, "EEEE", { locale: it }),
      shortName: format(date, "EEE", { locale: it }),
      formattedDate: format(date, "yyyy-MM-dd")
    };
  });
  
  // State per la griglia dei dati
  const [gridData, setGridData] = useState<Record<string, Record<number, {
    cells: Array<{ type: string; shiftId: number | null; isTimeOff?: boolean }>;
    notes: string;
    total: number;
  }>>>({});
  
  // Mutazione per creare o aggiornare un turno
  const updateShiftMutation = useMutation({
    mutationFn: (data: any) => {
      if (data.id) {
        // Aggiorna un turno esistente
        return apiRequest("PATCH", `/api/shifts/${data.id}`, data);
      } else {
        // Crea un nuovo turno
        return apiRequest("POST", `/api/shifts`, { 
          ...data, 
          scheduleId 
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/schedules/${scheduleId}/shifts`] });
      toast({
        title: "Turno aggiornato",
        description: "Il turno è stato aggiornato con successo.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento del turno.",
        variant: "destructive",
      });
    }
  });
  
  // Eliminazione di un turno
  const deleteShiftMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/shifts/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/schedules/${scheduleId}/shifts`] });
      toast({
        title: "Turno eliminato",
        description: "Il turno è stato eliminato con successo.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione del turno.",
        variant: "destructive",
      });
    }
  });
  
  // Inizializzazione della griglia
  useEffect(() => {
    if (!users.length) return;
    
    // Controlla i parametri URL per vedere se dobbiamo forzare un reset
    const urlParams = new URLSearchParams(window.location.search);
    const forceEmptyFromUrl = urlParams.get('forceEmpty') === 'true';
    const scheduleIdFromUrl = urlParams.get('scheduleId');
    const resetFromUrl = urlParams.get('reset') === 'true';
    
    // Forza il reset completo della griglia se richiesto
    if (forceResetGrid || forceEmptyFromUrl || resetFromUrl || Object.keys(gridData).length === 0) {
      console.log("RESET COMPLETO GRIGLIA:", {
        forceResetGrid,
        forceEmptyFromUrl, 
        resetFromUrl, 
        scheduleIdFromUrl,
        timestamp: Date.now()
      });
      
      // Crea una nuova griglia COMPLETAMENTE VUOTA
      const newGridData: Record<string, Record<number, {
        cells: Array<{ type: string; shiftId: number | null; isTimeOff?: boolean }>;
        notes: string;
        total: number;
      }>> = {};
    
      // Inizializza la griglia vuota per tutti i giorni e utenti
      weekDays.forEach(day => {
        newGridData[day.name] = {};
        
        // Filtra solo i dipendenti attivi
        const activeUsers = users.filter(u => u.role === "employee" && u.isActive);
        
        activeUsers.forEach(user => {
          // Creiamo celle COMPLETAMENTE vuote
          newGridData[day.name][user.id] = {
            cells: timeSlots.map(() => ({ type: "", shiftId: null })),
            notes: "",
            total: 0
          };
        });
      });
      
      console.log("Pulizia completa della tabella dei turni. Tutte le celle sono state reimpostate completamente vuote.");
      
      // Popola la griglia con i turni esistenti
      if (shifts && shifts.length > 0 && scheduleId) {
        shifts.forEach(shift => {
          const userId = shift.userId;
          const day = shift.day;
          
          if (newGridData[day] && newGridData[day][userId]) {
            // Trova gli indici corrispondenti all'intervallo di tempo del turno
            const startIndex = timeSlots.indexOf(shift.startTime);
            const endIndex = timeSlots.indexOf(shift.endTime);
            
            if (startIndex >= 0 && endIndex >= 0) {
              // Imposta tutte le celle nell'intervallo
              for (let i = startIndex; i < endIndex; i++) {
                newGridData[day][userId].cells[i] = { 
                  type: shift.type, 
                  shiftId: shift.id 
                };
              }
              
              // Aggiorna le note
              newGridData[day][userId].notes = shift.notes || "";
              
              // Calcola le ore totali
              if (shift.type === 'work') {
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
                
                // Aggiungi al totale
                newGridData[day][userId].total += hours + (minutes / 60);
              }
            }
          }
        });
      }
      
      // Aggiungi le richieste di ferie/permessi approvate
      if (timeOffRequests && timeOffRequests.length > 0) {
        const approvedRequests = timeOffRequests.filter(req => req.status === "approved");
        
        approvedRequests.forEach(request => {
          const userId = request.userId;
          const startDate = new Date(request.startDate);
          const endDate = new Date(request.endDate);
          
          // Verifica ogni giorno della settimana
          weekDays.forEach(day => {
            const dayDate = new Date(day.formattedDate);
            
            // Se il giorno è compreso nel periodo della richiesta
            if (dayDate >= startDate && dayDate <= endDate) {
              if (newGridData[day.name] && newGridData[day.name][userId]) {
                // Determina tipo di permesso
                const requestType = request.type === "vacation" ? "vacation" : "leave";
                
                // Per i permessi di mezza giornata
                if (request.halfDay) {
                  // Mattina (fino alle 13:00)
                  if (request.halfDayPeriod === "morning") {
                    for (let i = 0; i < timeSlots.length; i++) {
                      const hour = parseInt(timeSlots[i].split(':')[0]);
                      if (hour < 13) {
                        newGridData[day.name][userId].cells[i] = {
                          type: requestType,
                          shiftId: null,
                          isTimeOff: true
                        };
                      }
                    }
                    newGridData[day.name][userId].notes = `${request.type === "vacation" ? "Ferie" : "Permesso"} mattina`;
                  }
                  // Pomeriggio (dalle 13:00)
                  else {
                    for (let i = 0; i < timeSlots.length; i++) {
                      const hour = parseInt(timeSlots[i].split(':')[0]);
                      if (hour >= 13) {
                        newGridData[day.name][userId].cells[i] = {
                          type: requestType,
                          shiftId: null,
                          isTimeOff: true
                        };
                      }
                    }
                    newGridData[day.name][userId].notes = `${request.type === "vacation" ? "Ferie" : "Permesso"} pomeriggio`;
                  }
                }
              }
            }
          });
        });
      }
      
      setGridData(newGridData);
    }
  }, [scheduleId, users, shifts, timeOffRequests, weekDays, timeSlots, forceResetGrid, gridData]);
  
  // Gestione del click su una cella
  const handleCellClick = (userId: number, timeIndex: number, day: string) => {
    if (!scheduleId || isPublished) return;
    
    const newGridData = { ...gridData };
    const userDayData = newGridData[day][userId];
    const currentCell = userDayData.cells[timeIndex];
    
    // Se la cella ha già un turno associato, aggiorna il tipo di turno o cancellalo
    if (currentCell.type) {
      // Rotazione del tipo di turno: work -> vacation -> leave -> (vuoto) -> ...
      let newType = "";
      
      if (currentCell.type === "work") {
        newType = "vacation";
      } else if (currentCell.type === "vacation") {
        newType = "leave";
      } else if (currentCell.type === "leave") {
        newType = "";
      }
      
      // Se la cella ha un ID di turno esistente
      if (currentCell.shiftId) {
        if (newType === "") {
          // Elimina il turno
          deleteShiftMutation.mutate(currentCell.shiftId);
          
          // Rimuovi le ore dal conteggio totale
          if (currentCell.type === "work") {
            const slotDuration = 0.5; // 30 minuti
            userDayData.total -= slotDuration;
          }
        } else {
          // Aggiorna il tipo di turno
          updateShiftMutation.mutate({
            id: currentCell.shiftId,
            scheduleId,
            userId,
            day,
            startTime: timeSlots[timeIndex],
            endTime: timeSlots[timeIndex + 1],
            type: newType,
            notes: userDayData.notes
          });
          
          // Aggiorna le ore
          if (currentCell.type === "work" && newType !== "work") {
            const slotDuration = 0.5; // 30 minuti
            userDayData.total -= slotDuration;
          } else if (currentCell.type !== "work" && newType === "work") {
            const slotDuration = 0.5; // 30 minuti
            userDayData.total += slotDuration;
          }
        }
      } else if (newType) {
        // Crea un nuovo turno se non c'è un ID di turno
        updateShiftMutation.mutate({
          scheduleId,
          userId,
          day,
          startTime: timeSlots[timeIndex],
          endTime: timeSlots[timeIndex + 1],
          type: newType,
          notes: userDayData.notes
        });
        
        // Aggiorna le ore
        if (newType === "work") {
          const slotDuration = 0.5; // 30 minuti
          userDayData.total += slotDuration;
        }
      }
      
      // Aggiorna lo stato della cella
      userDayData.cells[timeIndex] = { 
        type: newType, 
        shiftId: newType ? currentCell.shiftId : null
      };
    } else {
      // Crea un nuovo turno di tipo "work"
      updateShiftMutation.mutate({
        scheduleId,
        userId,
        day,
        startTime: timeSlots[timeIndex],
        endTime: timeSlots[timeIndex + 1],
        type: "work",
        notes: userDayData.notes
      });
      
      // Aggiorna lo stato della cella
      userDayData.cells[timeIndex] = { 
        type: "work", 
        shiftId: null // Verrà aggiornato alla risposta della mutazione
      };
      
      // Aggiorna le ore
      const slotDuration = 0.5; // 30 minuti
      userDayData.total += slotDuration;
    }
    
    // Aggiorna lo stato
    setGridData(newGridData);
  };
  
  // Gestione dell'aggiornamento delle note
  const handleNotesChange = (userId: number, day: string, value: string) => {
    const newGridData = { ...gridData };
    newGridData[day][userId].notes = value;
    setGridData(newGridData);
    
    // Trova tutti i turni del giorno per l'utente
    const userDayShifts = shifts.filter(
      (s: any) => s.userId === userId && s.day === day
    );
    
    // Aggiorna le note per ogni turno
    userDayShifts.forEach((shift: any) => {
      updateShiftMutation.mutate({
        id: shift.id,
        notes: value
      });
    });
  };
  
  // Gestione della stampa dello schedule
  const handlePrint = () => {
    if (!scheduleId) return;
    
    // Genera HTML per la stampa
    let pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Pianificazione Turni</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 24px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .working { background-color: #e1f5fe; }
          .vacation { background-color: #ffebee; }
          .leave { background-color: #fff9c4; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .legend { display: flex; gap: 20px; margin-bottom: 30px; }
          .legend-item { display: flex; align-items: center; }
          .legend-color { display: inline-block; width: 16px; height: 16px; margin-right: 5px; border: 1px solid #ccc; }
          .name-cell { width: 150px; }
          .total-cell { width: 80px; }
        </style>
      </head>
      <body>
        <h1>Pianificazione Turni: ${format(new Date(startDate), "d MMMM", { locale: it })} - ${format(new Date(endDate), "d MMMM yyyy", { locale: it })}</h1>
        
        <div class="header">
          <div>
            <p>Data: ${format(new Date(), "dd/MM/yyyy")}</p>
            <p>Stato: ${isPublished ? 'Pubblicato' : 'Bozza'}</p>
          </div>
        </div>
        
        <div class="legend">
          <div class="legend-item"><span class="legend-color working"></span> In servizio (X)</div>
          <div class="legend-item"><span class="legend-color vacation"></span> Ferie (F)</div>
          <div class="legend-item"><span class="legend-color leave"></span> Permesso (P)</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th class="name-cell">Dipendente</th>
              <th>Lunedì</th>
              <th>Martedì</th>
              <th>Mercoledì</th>
              <th>Giovedì</th>
              <th>Venerdì</th>
              <th>Sabato</th>
              <th>Domenica</th>
              <th class="total-cell">Totale Ore</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Add employee rows with shift summary
    users
      .filter((user: any) => user.role === "employee" && user.isActive)
      .forEach((user: any) => {
        let userTotalHours = 0;
        
        pdfContent += `
          <tr>
            <td class="name-cell">${user.name}</td>
        `;
        
        // Add days of week
        ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'].forEach(day => {
          const userShifts = shifts.filter((s: any) => s.userId === user.id && s.day === day);
          let daySummary = '-';
          let cellClass = '';
          
          if (userShifts.length > 0) {
            // Sort shifts by start time
            userShifts.sort((a: any, b: any) => {
              return a.startTime.localeCompare(b.startTime);
            });
            
            // Get first and last shift
            const firstShift = userShifts[0];
            const lastShift = userShifts[userShifts.length - 1];
            
            // Determine shift type for cell color
            if (firstShift.type === 'work') {
              cellClass = 'working';
              daySummary = `${firstShift.startTime} - ${lastShift.endTime}`;
              
              // Calculate hours for this day
              let dayHours = 0;
              userShifts.forEach(shift => {
                const [startHour, startMin] = shift.startTime.split(":").map(Number);
                const [endHour, endMin] = shift.endTime.split(":").map(Number);
                
                let hours = endHour - startHour;
                let minutes = endMin - startMin;
                
                if (minutes < 0) {
                  hours -= 1;
                  minutes += 60;
                }
                
                dayHours += hours + (minutes / 60);
              });
              
              // Add to total
              userTotalHours += dayHours;
            } else if (firstShift.type === 'vacation') {
              cellClass = 'vacation';
              daySummary = 'Ferie';
            } else if (firstShift.type === 'leave') {
              cellClass = 'leave';
              daySummary = 'Permesso';
            }
          }
          
          pdfContent += `<td class="${cellClass}">${daySummary}</td>`;
        });
        
        // Add total hours
        pdfContent += `<td class="total-cell">${userTotalHours.toFixed(1)}</td></tr>`;
      });
    
    pdfContent += `
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    // Create a blob and download
    const blob = new Blob([pdfContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pianificazione_${format(new Date(startDate), "yyyy-MM-dd")}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-base font-semibold">
          Pianificazione {format(startDate, "d MMMM", { locale: it })} - {format(endDate, "d MMMM yyyy", { locale: it })}
        </h3>
        <div className="flex items-center gap-2">
          {isPublished ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="material-icons text-sm mr-1">check_circle</span>
              Pubblicato
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <span className="material-icons text-sm mr-1">pending</span>
              Bozza
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-1">
            <span className="material-icons text-sm">print</span>
            Stampa
          </Button>
          {!isPublished && (
            <Button size="sm" onClick={onPublish} className="flex items-center gap-1">
              <span className="material-icons text-sm">publish</span>
              Pubblica
            </Button>
          )}
        </div>
      </div>
      
      <div className="p-4">
        <Tabs defaultValue={weekDays[selectedDay].name} onValueChange={(value) => {
          const dayIndex = weekDays.findIndex(d => d.name === value);
          if (dayIndex !== -1) {
            setSelectedDay(dayIndex);
          }
        }}>
          <TabsList className="mb-4 w-full">
            {weekDays.map((day, idx) => (
              <TabsTrigger key={day.name} value={day.name} className="flex-1">
                <span className="hidden sm:inline">{day.name}</span>
                <span className="sm:hidden">{day.shortName}</span>
                <span className="ml-1 text-xs text-muted-foreground hidden sm:inline">
                  {format(day.date, "d/M")}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          {weekDays.map((day) => (
            <TabsContent key={day.name} value={day.name} className="relative">
              <div className="overflow-auto border rounded-md">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-sm font-semibold text-muted-foreground text-left sticky left-0 bg-muted/50 z-10">
                        Dipendente
                      </th>
                      {timeSlots.map((slot, idx) => (
                        <th key={idx} className="p-1 text-xs font-medium text-muted-foreground w-12 text-center">
                          {slot}
                        </th>
                      ))}
                      <th className="p-2 text-sm font-semibold text-muted-foreground text-left min-w-[200px]">
                        Note
                      </th>
                      <th className="p-2 text-sm font-semibold text-muted-foreground text-center w-20">
                        Tot. Ore
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(user => user.role === "employee" && user.isActive)
                      .map(user => (
                        <tr key={user.id} className="border-b">
                          <td className="p-2 text-sm font-medium sticky left-0 bg-white z-10">
                            {user.name}
                          </td>
                          
                          {timeSlots.map((slot, idx) => {
                            // Get cell data
                            const cellData = gridData[day.name]?.[user.id]?.cells[idx] || { type: "", shiftId: null };
                            const cellType = cellData.type;
                            
                            // Style based on cell type
                            let cellStyle = "cursor-pointer hover:bg-gray-50 transition-colors";
                            let cellContent = "";
                            
                            if (cellType === "work") {
                              cellStyle += " bg-blue-50 text-blue-700";
                              cellContent = "X";
                            } else if (cellType === "vacation") {
                              cellStyle += " bg-red-50 text-red-700";
                              cellContent = "F";
                            } else if (cellType === "leave") {
                              cellStyle += " bg-yellow-50 text-yellow-700";
                              cellContent = "P";
                            }
                            
                            if (isPublished) {
                              cellStyle = cellStyle.replace("cursor-pointer", "");
                            }
                            
                            return (
                              <td 
                                key={idx}
                                className={`p-0 text-center ${cellStyle}`}
                                onClick={() => handleCellClick(user.id, idx, day.name)}
                              >
                                <div className="w-full h-full p-1">
                                  {cellContent}
                                </div>
                              </td>
                            );
                          })}
                          
                          <td className="p-1">
                            <Input
                              size={35}
                              placeholder="Note..."
                              value={gridData[day.name]?.[user.id]?.notes || ""}
                              onChange={(e) => handleNotesChange(user.id, day.name, e.target.value)}
                              disabled={isPublished}
                              className="text-sm"
                            />
                          </td>
                          
                          <td className="p-2 text-center font-semibold text-sm">
                            {gridData[day.name]?.[user.id]?.total.toFixed(1) || "0.0"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-3 text-sm text-muted-foreground">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 cursor-help">
                        <span className="material-icons text-sm">help_outline</span>
                        <span>Legenda</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="p-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="inline-block w-4 h-4 rounded bg-blue-50 text-blue-700 text-xs flex items-center justify-center">X</span>
                          <span>In servizio</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="inline-block w-4 h-4 rounded bg-red-50 text-red-700 text-xs flex items-center justify-center">F</span>
                          <span>Ferie</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="inline-block w-4 h-4 rounded bg-yellow-50 text-yellow-700 text-xs flex items-center justify-center">P</span>
                          <span>Permesso</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}